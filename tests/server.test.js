import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createGameServer } from '../server/index.js';
import { RoomManager } from '../server/rooms.js';
import { cleanNickname } from '../server/players.js';
import { validClient } from '../shared/protocol.js';
import { canStand, canTravel, interactionsFor, STATIONS } from '../shared/constants.js';
import { latestTrainId } from '../shared/schedule.js';
class Client {
  constructor(socket) {
    this.socket = socket; this.queue = []; this.waiters = [];
    socket.on('message', data => { const m = JSON.parse(data.toString()); const index = this.waiters.findIndex(w => w.type === m.type); if (index < 0) this.queue.push(m); else { const [w] = this.waiters.splice(index, 1); clearTimeout(w.timeout); w.resolve(m); } });
  }
  send(m) { this.socket.send(JSON.stringify(m)); }
  take(type) {
    const i = this.queue.findIndex(m => m.type === type); if (i >= 0) return Promise.resolve(this.queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => { const waiter = { type, resolve, timeout: setTimeout(() => reject(new Error(`수신 시간 초과: ${type}`)), 3000) }; this.waiters.push(waiter); });
  }
  async close() { const closed = once(this.socket, 'close'); this.socket.close(); await closed; }
}
async function connect(url, nickname, token) { const c = new Client(new WebSocket(url)); await once(c.socket, 'open'); c.send({ type: 'hello', nickname, ...(token ? { token } : {}) }); c.welcome = await c.take('welcome'); c.room = await c.take('room'); return c; }
const member = i => ({ id: String(i), baseName: '여행자', nickname: '여행자', x: 0, z: 9, yaw: 0, suit: false, ticket: null, ws: null });
function invariant(game) {
  const seen = new Set();
  for (const room of game.rooms.rooms.values()) for (const p of room.members.values()) { assert.equal(p.roomId, room.id); assert.equal(seen.has(p.id), false); seen.add(p.id); }
  for (const p of game.players.sessions.values()) if (p.ws) assert.equal(seen.has(p.id), true);
}
test('닉네임과 메시지 검증은 빈 값·과대 값·타입 오류를 거부', () => {
  for (const name of [null, 1, '', '가', '가'.repeat(13), '<img>', '시발놈', 'fUcK']) assert.throws(() => cleanNickname(name));
  assert.equal(cleanNickname('  여행자_A  '), '여행자_A');
  for (const m of [null, [], {}, { type: 'move', x: NaN }, { type: 'chat', text: '' }, { type: 'chat', text: 'a'.repeat(101) }, { type: 'interact', id: 'ticket', option: 2 }]) assert.equal(validClient(m), false);
});
test('24명 제한과 중복 이름, 같은 룸 재입장 시 멤버십 유지', () => {
  const rooms = new RoomManager(), list = Array.from({ length: 25 }, (_, i) => member(i));
  for (const p of list) rooms.join(p, { kind: 'station', stationId: 'central' });
  assert.equal(rooms.rooms.size, 2); assert.equal(rooms.rooms.get('station:central:1').members.size, 24);
  assert.equal(list[24].location.channel, 2); assert.equal(new Set(list.slice(0, 24).map(p => p.nickname)).size, 24);
  const single = new RoomManager(), p = member('single'); single.join(p, { kind: 'train', trainId: 12 }); single.join(p, p.location, true);
  assert.equal(single.rooms.size, 1); assert.equal(single.rooms.get(p.roomId).members.get(p.id), p);
});
test('모든 상호작용 접근 지점은 이동 가능한 위치', () => {
  for (const station of STATIONS) for (const d of interactionsFor({ kind: 'station', stationId: station.id })) assert.ok(canStand({ kind: 'station' }, d.x, d.z), `${station.id}:${d.id}`);
});
test('이동 경로가 자판기나 역사 벽을 관통할 수 없음', () => {
  const l = { kind: 'station' };
  assert.equal(canTravel(l, { x: -6, z: 2.5 }, { x: -6, z: 5 }), false);
  assert.equal(canTravel(l, { x: 0, z: 5 }, { x: 0, z: -5 }), true);
  assert.equal(canTravel(l, { x: 0, z: 5 }, { x: 100, z: 5 }), false);
});
test('실제 HTTP/WS: 채팅·발권·승하차·ID 갱신·재접속·잠수함·오류 격리', async t => {
  let clock = Date.parse('2026-11-04T00:00:00+09:00');
  const game = await createGameServer({ now: () => clock, ipLimit: 50 });
  const address = await game.listen(0), url = `ws://127.0.0.1:${address.port}/ws`;
  t.after(() => game.close());
  assert.equal(await (await fetch(`http://127.0.0.1:${address.port}/healthz`)).text(), 'ok');
  const a = await connect(url, '테스트'), b = await connect(url, '테스트');
  assert.equal(b.room.self.nickname, '테스트2'); invariant(game);
  const cloned = await connect(url, '다른여행자', a.welcome.token);
  assert.equal(cloned.welcome.resumed, false); assert.notEqual(cloned.welcome.id, a.welcome.id);
  await cloned.close(); invariant(game);
  a.send({ type: 'time_sync', nonce: '123', clientTime: 0 }); assert.equal((await a.take('time_sync')).serverTime, clock);
  a.send({ type: 'chat', text: '<img src=x onerror=alert(1)>' }); assert.equal((await b.take('chat')).text, '<img src=x onerror=alert(1)>');
  const p = game.players.sessions.get(a.welcome.token);
  p.x = 0; p.z = -5;
  a.send({ type: 'interact', id: 'board', ticket: { destination: 'beach' } }); assert.match((await a.take('notice')).text, /티켓/);
  p.x = -6; p.z = 5;
  a.send({ type: 'interact', id: 'ticket', option: 'meadow' }); assert.equal((await a.take('ticket')).ticket.destination, 'meadow');
  p.x = 0; p.z = -5;
  clock += 60_000;
  a.send({ type: 'interact', id: 'board' }); assert.match((await a.take('notice')).text, /정차/);
  clock += 240_000;
  a.send({ type: 'interact', id: 'board' }); const cabin = await a.take('room'); assert.equal(cabin.location.kind, 'train'); invariant(game);
  const id = cabin.location.trainId;
  p.x = 0; p.z = -11; clock += 60_000;
  a.send({ type: 'interact', id: 'exit' }); assert.match((await a.take('notice')).text, /주행/);
  clock = Date.parse('2026-11-04T01:05:00+09:00');
  a.send({ type: 'end' }); const rotated = await a.take('room'); assert.equal(rotated.location.trainId, id + 12); invariant(game);
  const token = a.welcome.token;
  await a.close(); assert.equal(p.roomId, null);
  const resumed = await connect(url, '테스트', token); assert.equal(resumed.welcome.resumed, true); assert.equal(resumed.room.location.kind, 'train'); invariant(game);
  p.x = 0; p.z = -11;
  resumed.send({ type: 'interact', id: 'exit' }); assert.equal((await resumed.take('room')).location.kind, 'station'); invariant(game);
  game.rooms.join(p, { kind: 'station', stationId: 'beach' }); await resumed.take('room'); p.x = 25; p.z = 8;
  resumed.send({ type: 'interact', id: 'submarine' }); assert.equal((await resumed.take('room')).location.kind, 'submarine'); invariant(game);
  await resumed.close(); clock += 20_000;
  const undersea = await connect(url, '테스트', token); assert.equal(undersea.room.location.stationId, 'deepsea'); invariant(game);
  p.x = 19; p.z = 20; clock += 2000;
  undersea.send({ type: 'interact', id: 'deepfish' }); assert.match((await undersea.take('notice')).text, /잠수복/);
  p.x = 9; p.z = 8; clock += 2000;
  undersea.send({ type: 'interact', id: 'suit' }); await undersea.take('notice'); assert.equal(p.suit, true);
  p.x = 19; p.z = 20; clock += 2000;
  undersea.send({ type: 'interact', id: 'deepfish' });
  await undersea.take('effect'); clock += 3001;
  assert.equal((await undersea.take('collect')).category, 'deepfish');
  const previous = { x: p.x, z: p.z };
  undersea.send({ type: 'move', x: -25, y: 0, z: -5, yaw: 0, animation: 'run' }); await undersea.take('correction'); assert.equal(p.x, previous.x);
  const bad = new Client(new WebSocket(url)); await once(bad.socket, 'open');
  const ended = once(bad.socket, 'close'); for (let i = 0; i < 8; i++) bad.socket.send('{invalid'); await ended;
  assert.equal((await fetch(`http://127.0.0.1:${address.port}/healthz`)).status, 200);
  assert.equal(latestTrainId(clock) >= id, true);
  await undersea.close(); await b.close(); invariant(game);
});
