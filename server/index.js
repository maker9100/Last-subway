import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { randomUUID, randomInt } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { LIMITS, EMOTES, COLLECTIONS, interactionsFor, canTravel } from '../shared/constants.js';
import { C, S, validClient, safeSend } from '../shared/protocol.js';
import { stationBoard, trainState } from '../shared/schedule.js';
import { calendarAt } from '../shared/calendar.js';
import { PlayerStore, filterChat } from './players.js';
import { RoomManager } from './rooms.js';
import { RateLimiter } from './ratelimit.js';
import { TrainService, refreshJourney } from './train.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export async function createGameServer({ dev = false, now = () => Date.now(), ipLimit = LIMITS.ipConnections } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  app.get('/healthz', (req, res) => res.type('text/plain').send('ok'));
  const http = createServer(app);
  const wss = new WebSocketServer({ noServer: true, maxPayload: LIMITS.payload, perMessageDeflate: false });
  const rooms = new RoomManager();
  const players = new PlayerStore();
  const trains = new TrainService(rooms);
  const ips = new Map();
  const messages = new RateLimiter(60, 30);
  const chats = new RateLimiter(3, 0.8);
  const actions = new RateLimiter(6, 2);
  const connections = new RateLimiter(10, 0.15);
  const ipActivity = new Map();
  let vite;
  if (dev) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({ root, server: { middlewareMode: true, hmr: { server: http } }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = resolve(root, 'dist');
    app.use(express.static(dist, { index: false }));
    app.get('*', (req, res) => {
      if (/\.[a-z0-9]+$/i.test(req.path)) return res.status(404).type('text/plain').send('파일을 찾을 수 없습니다');
      const index = resolve(dist, 'index.html');
      if (!existsSync(index)) return res.status(503).type('text/plain').send('먼저 npm run build를 실행해 주세요');
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(index);
    });
  }
  app.use((err, req, res, next) => { console.error(err); if (!res.headersSent) res.status(500).type('text/plain').send('서버 오류'); else next(err); });
  http.on('upgrade', (req, socket, head) => {
    try {
      if (req.url?.split('?')[0] !== '/ws') { if (!dev) socket.destroy(); return; }
      // Express와 동일하게 프록시 한 홉만 신뢰한다. 사용자 지정 앞쪽 XFF는 사용하지 않는다.
      const ip = app.get('trust proxy fn')(req.socket.remoteAddress, 0)
        ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',').at(-1).trim()
        : req.socket.remoteAddress;
      ipActivity.set(ip, now());
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
      if ((ips.get(ip) || 0) >= ipLimit || wss.clients.size >= LIMITS.maxConnections || !connections.allow(ip, now())) { socket.end('HTTP/1.1 429 Too Many Requests\r\n\r\n'); return; }
      wss.handleUpgrade(req, socket, head, ws => {
        ips.set(ip, (ips.get(ip) || 0) + 1);
        wss.emit('connection', ws, req, ip);
      });
    } catch (error) { console.error('upgrade', error.message); socket.destroy(); }
  });
  const notice = (p, text) => safeSend(p.ws, { type: S.NOTICE, text });
  const effect = (p, effectId) => rooms.broadcast(p.roomId, { type: S.EFFECT, id: effectId, playerId: p.id, x: p.x, z: p.z, at: now() });
  function finishActivity(p, at) {
    const a = p.activity;
    if (!a || !a.until || at < a.until) return;
    if (a.collect && a.roomId === p.roomId && distance(p, a) <= 2.8) {
      const list = COLLECTIONS[a.collect];
      const item = list[randomInt(list.length)];
      safeSend(p.ws, { type: S.COLLECT, category: a.collect, item });
    }
    p.activity = null;
    p.pose = 'idle';
    if (!a.collect) notice(p, a.id === 'snowman' ? '눈사람을 완성했어요.' : '느긋한 시간을 보냈어요.');
  }
  function interact(p, message, at) {
    const l = p.location;
    const def = interactionsFor(l).find(d => d.id === message.id);
    if (!def || distance(p, def) > def.radius + 0.3) return notice(p, '조금 더 가까이 다가가 주세요.');
    if (p.activity?.id === def.id) { p.activity = null; p.pose = 'idle'; return; }
    if ((p.cooldowns.get(def.id) || 0) > at) return notice(p, '잠시 쉬었다가 다시 해 주세요.');
    if (def.id === 'ticket') {
      if (!message.option || message.option === 'songpyeon' || message.option === l.stationId) return notice(p, '다른 목적지 역을 선택해 주세요.');
      p.ticket = { id: randomUUID(), destination: message.option, issuedAt: at };
      safeSend(p.ws, { type: S.TICKET, ticket: p.ticket });
      return;
    }
    if (def.id === 'board') {
      const board = stationBoard(l.stationId, at);
      if (!board.docked) return notice(p, '열차가 정차하고 문이 열릴 때 탑승할 수 있어요.');
      if (!p.ticket) return notice(p, '티켓 부스에서 먼저 티켓을 발권해 주세요.');
      rooms.join(p, { kind: 'train', trainId: board.trainId });
      return;
    }
    if (def.id === 'exit') {
      const train = trainState(l.trainId, at);
      if (!train.doorsOpen) return notice(p, '주행 중이에요. 다음 역에서 내려 주세요.');
      p.ticket = null;
      rooms.join(p, { kind: 'station', stationId: train.stationId });
      return;
    }
    if (def.id === 'submarine') {
      rooms.join(p, { kind: 'submarine', tripId: randomUUID(), from: l.stationId, to: l.stationId === 'beach' ? 'deepsea' : 'beach', endsAt: at + 20_000 });
      return;
    }
    if (def.id === 'suit') { p.suit = !p.suit; notice(p, p.suit ? '잠수복을 입었어요. 수중 구역에서 채집할 수 있어요.' : '잠수복을 벗었어요.'); return; }
    if (def.id === 'deepfish' && (!p.suit || p.x < 12 || p.z < 15)) return notice(p, '잠수복을 입고 수중 구역으로 들어가 주세요.');
    if (def.id === 'route') return notice(p, 'M 키 또는 노선도 버튼으로 현재 열차 위치를 확인하세요.');
    if (message.option === 'songpyeon' && (def.id !== 'coffee' || calendarAt(at).event !== 'chuseok')) return notice(p, '송편은 추석 기간에만 제공해요.');
    p.cooldowns.set(def.id, at + (def.collect ? 5000 : 1500));
    p.pose = def.pose || 'idle';
    p.activity = { id: def.id, pose: p.pose, x: p.x, z: p.z, roomId: p.roomId, collect: def.collect, until: def.duration ? at + def.duration : 0 };
    effect(p, def.id);
    if (!def.pose) p.activity = null;
    if (def.collect && !def.duration) {
      const list = COLLECTIONS[def.collect];
      safeSend(p.ws, { type: S.COLLECT, category: def.collect, item: list[randomInt(list.length)] });
    }
    if (def.id === 'coffee') notice(p, message.option === 'songpyeon' ? '따뜻한 송편과 차가 나왔어요.' : '따뜻한 커피가 나왔어요.');
    if (def.id === 'parrot') notice(p, '앵무새: 반가워요! 좋은 여행 되세요!');
    if (def.id === 'observe') notice(p, '돔 너머로 발광 해파리와 작은 물고기가 지나가요.');
  }
  wss.on('connection', (ws, req, ip) => {
    let p = null;
    let invalid = 0;
    const key = randomUUID();
    ws.alive = true;
    const helloTimeout = setTimeout(() => { if (!p) ws.close(1008, '접속 정보가 필요합니다'); }, 10_000);
    ws.on('pong', () => { ws.alive = true; });
    ws.on('error', error => console.error('WebSocket', error.message));
    ws.on('message', (data, binary) => {
      try {
        const at = now();
        if (!messages.allow(key, at)) { if (++invalid >= LIMITS.invalid) ws.close(1008, '전송 횟수 초과'); return; }
        let m;
        try { m = binary ? null : JSON.parse(data.toString()); } catch { m = null; }
        if (!validClient(m)) { if (++invalid >= LIMITS.invalid) ws.close(1008, '잘못된 메시지'); return; }
        if (m.type === C.SYNC) { safeSend(ws, { type: S.TIME, nonce: m.nonce, clientTime: m.clientTime, serverTime: at }); return; }
        if (!p) {
          if (m.type !== C.HELLO) return;
          try {
            const result = players.connect(ws, m, at);
            p = result.player;
            clearTimeout(helloTimeout);
            safeSend(ws, { type: S.WELCOME, id: p.id, token: p.token, resumed: result.resumed, serverTime: at, calendar: calendarAt(at) });
            const target = p.location;
            if (target.kind === 'train') {
              refreshJourney(p, rooms, at);
              if (!p.roomId) rooms.join(p, p.location, true);
            } else if (target.kind === 'submarine' && at >= target.endsAt) rooms.join(p, { kind: 'station', stationId: target.to });
            else rooms.join(p, target, result.resumed);
          } catch (error) { safeSend(ws, { type: S.ERROR, text: error.message }); ws.close(1008, '닉네임 또는 세션 오류'); }
          return;
        }
        if (m.type === C.HELLO) return;
        refreshJourney(p, rooms, at);
        finishActivity(p, at);
        if (m.type === C.MOVE) {
          const dt = Math.min(1, Math.max(0, (at - p.lastMove) / 1000));
          p.lastMove = at;
          p.credit = Math.min(LIMITS.speed, p.credit + dt * LIMITS.speed);
          const d = distance(p, m);
          if (p.location.kind === 'submarine' || p.activity || !canTravel(p.location, p, m) || d > p.credit + 0.000001) {
            safeSend(ws, { type: S.CORRECTION, x: p.x, y: 0, z: p.z });
            return;
          }
          p.credit = Math.max(0, p.credit - d);
          p.x = m.x; p.z = m.z; p.yaw = m.yaw; p.pose = m.animation;
          if (p.location.stationId === 'snow' && d > 0.05 && at - p.lastFootprint > 450) { p.lastFootprint = at; effect(p, 'footprint'); }
        } else if (m.type === C.CHAT) {
          if (!chats.allow(key, at)) return notice(p, '채팅은 잠시 간격을 두고 보내 주세요.');
          const text = filterChat(m.text);
          if (text) rooms.broadcast(p.roomId, { type: S.CHAT, id: p.id, nickname: p.nickname, text, at });
        } else if (m.type === C.END) { p.activity = null; p.pose = 'idle'; }
        else if (!actions.allow(key, at)) notice(p, '천천히 상호작용해 주세요.');
        else if (m.type === C.INTERACT) interact(p, m, at);
        else if (m.type === C.EMOTE && p.location.kind !== 'submarine' && EMOTES.includes(m.emote)) {
          p.pose = m.emote;
          p.activity = { id: 'emote', pose: m.emote, until: at + (m.emote === 'sit' ? 0 : 4000) };
          effect(p, m.emote);
        } else if (m.type === C.GREET) {
          const target = rooms.rooms.get(p.roomId)?.members.get(m.targetId);
          if (target && target.id !== p.id && distance(p, target) <= 3.5) { notice(target, `${p.nickname}님이 인사했어요.`); effect(p, 'wave'); }
        }
      } catch (error) { console.error('message', error); if (p) notice(p, '요청을 처리하지 못했어요. 다시 시도해 주세요.'); }
    });
    ws.on('close', () => {
      try {
        clearTimeout(helloTimeout);
        const count = (ips.get(ip) || 1) - 1;
        if (count) ips.set(ip, count); else ips.delete(ip);
        messages.delete(key); chats.delete(key); actions.delete(key);
        if (p?.ws === ws) { rooms.remove(p); players.disconnect(p, ws, now()); }
      } catch (error) { console.error('close', error); }
    });
  });
  const simulation = setInterval(() => {
    try {
      const at = now();
      trains.tick(at);
      for (const room of rooms.rooms.values()) for (const p of room.members.values()) finishActivity(p, at);
      rooms.snapshots(at);
    } catch (error) { console.error('simulation', error); }
  }, 100);
  const heartbeat = setInterval(() => {
    try {
      for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } }
      players.sweep(now());
      for (const [ip, at] of ipActivity) if (!ips.has(ip) && now() - at > 600_000) { ipActivity.delete(ip); connections.delete(ip); }
    } catch (error) { console.error('heartbeat', error); }
  }, 30_000);
  return {
    app, http, wss, rooms, players,
    listen: (port = Number(process.env.PORT) || 3000) => new Promise(resolveListen => http.listen(port, '0.0.0.0', () => resolveListen(http.address()))),
    close: async () => {
      clearInterval(simulation); clearInterval(heartbeat);
      for (const ws of wss.clients) ws.terminate();
      await new Promise(done => wss.close(done));
      if (vite) await vite.close();
      await new Promise(done => http.close(done));
    }
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.on('uncaughtException', error => console.error('uncaughtException', error));
  process.on('unhandledRejection', error => console.error('unhandledRejection', error));
  const game = await createGameServer({ dev: process.argv.includes('--dev') });
  const portIndex = process.argv.indexOf('--port');
  const previewPort = process.argv.includes('--dev') && portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 0;
  const address = await game.listen(Number(process.env.PORT) || previewPort || 3000);
  console.log(`Last Train: http://0.0.0.0:${address.port}`);
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { game.close().finally(() => process.exit(0)); });
}
