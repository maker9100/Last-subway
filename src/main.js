import { EMOTES } from '../shared/constants.js';
import { C, S } from '../shared/protocol.js';
import { calendarAt } from '../shared/calendar.js';
import { trainState } from '../shared/schedule.js';
import { Network, safeStorage } from './net.js';
import { Engine } from './engine/renderer.js';
import { Controls } from './engine/controls.js';
import { AudioEngine } from './engine/audio.js';
import { UI } from './engine/ui.js';
import { World } from './world/index.js';
import { Avatars } from './world/avatar.js';
import { InteractionSystem } from './interactions/system.js';
import { saveCollection } from './interactions/actions.js';
import { visualOverrides } from './seasons/environment.js';
import './styles.css';
function boot() {
  const ui = new UI(safeStorage), canvas = document.getElementById('game');
  let engine;
  try { engine = new Engine(canvas); } catch { ui.connection('WebGL을 사용할 수 없어요. 하드웨어 가속을 켜고 최신 브라우저로 열어 주세요.'); return; }
  const net = new Network(), controls = new Controls(canvas, engine.camera), audio = new AudioEngine();
  const overrides = visualOverrides(location.search);
  let serverCalendar = calendarAt(Date.now()), self = null, locationState = null, world = null, avatars = null, interactions = null;
  let roomCount = 1, totalCount = 1, frameId, last = performance.now(), nextSend = 0, nextUI = 0, destinationNotice = '', disposed = false;
  const scale = Number(safeStorage.get('lt-scale')); engine.setScale([1, 2, 3].includes(scale) ? scale : 2);
  const volume = Number(safeStorage.get('lt-volume') ?? '0.3'); audio.setVolume(Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.3);
  function blocking() { controls.setBlocked(ui.blocking() || !net.ready); document.getElementById('resume').hidden = controls.touch || ui.blocking() || document.pointerLockElement === canvas || !net.ready; }
  const on = (type, fn) => net.addEventListener(type, e => fn(e.detail));
  ui.addEventListener('blocking', blocking);
  ui.addEventListener('sendchat', e => net.send({ type: C.CHAT, text: e.detail }));
  ui.addEventListener('activityend', () => net.send({ type: C.END }));
  ui.addEventListener('emote', e => net.send({ type: C.EMOTE, emote: e.detail }));
  ui.addEventListener('scale', e => engine.setScale(e.detail));
  ui.addEventListener('volume', e => audio.setVolume(e.detail));
  controls.addEventListener('lock', blocking);
  on('status', text => ui.connection(text));
  on('sync', latency => ui.connection(`온라인 · ${latency}ms`));
  on('offline', () => { controls.frozen = true; blocking(); });
  on(S.ERROR, m => { document.getElementById('start').disabled = false; ui.toast(m.text); blocking(); });
  on(S.WELCOME, m => {
    serverCalendar = m.calendar;
    if (m.resumed) ui.toast('이전 여행에 다시 연결했어요.');
  });
  on(S.ROOM, m => {
    avatars?.dispose(); world?.dispose();
    locationState = m.location; self = { ...m.self, ticket: m.ticket };
    world = new World(locationState, serverCalendar, overrides);
    avatars = new Avatars(world.scene, net.id); avatars.snapshot(m.players); roomCount = m.players.length;
    interactions = new InteractionSystem(locationState, { net, ui, calendar: () => serverCalendar });
    Object.assign(controls.position, { x: self.x, y: 0, z: self.z }); controls.yaw = self.yaw; controls.pitch = 0; controls.clear();
    controls.frozen = false; ui.start(); ui.setLocation(locationState, self.nickname); ui.ticket(m.ticket);
    audio.setRoom(locationState.stationId || locationState.kind, world.environment.calendar.season); audio.chime();
    destinationNotice = ''; blocking();
  });
  on(S.SNAPSHOT, m => {
    if (!avatars) return;
    avatars.snapshot(m.players); roomCount = m.players.length;
    const state = m.players.find(p => p.id === net.id);
    if (state) { const previousActivity = self.activity; self = { ...self, ...state }; controls.frozen = !!state.activity; if (state.activity === 'books' && previousActivity !== 'books') ui.reading(); }
  });
  on(S.CORRECTION, m => Object.assign(controls.position, { x: m.x, y: 0, z: m.z }));
  on(S.TICKET, m => { if (self) self.ticket = m.ticket; ui.ticket(m.ticket); ui.toast('티켓을 발권했어요. 플랫폼에서 열차를 기다려 주세요.'); ui.dialog.close(); });
  on(S.NOTICE, m => ui.toast(m.text));
  on(S.CHAT, m => { ui.chat(m); avatars?.items.get(m.id)?.say(m.text, performance.now() / 1000 + 6); });
  on(S.CALENDAR, m => { serverCalendar = m.calendar; world?.environment.setCalendar(serverCalendar); audio.setRoom(locationState?.stationId || locationState?.kind, world?.environment.calendar.season); });
  on(S.TRAINS, m => { totalCount = m.count; });
  on(S.COLLECT, m => saveCollection(m, ui, safeStorage));
  on(S.EFFECT, m => {
    world?.effect(m, performance.now() / 1000);
    if (Math.hypot(controls.position.x - m.x, controls.position.z - m.z) < 18) audio.effect(m.id);
  });
  const login = document.getElementById('login-form');
  login.addEventListener('submit', e => {
    e.preventDefault(); const nickname = document.getElementById('nickname').value.trim();
    safeStorage.set('lt-nickname', nickname); document.getElementById('start').disabled = true; audio.unlock(); net.start(nickname);
  });
  document.getElementById('resume-button').addEventListener('click', () => { audio.unlock(); controls.lock(); });
  function interact() { if (self && !ui.blocking() && net.ready) interactions?.execute({ ...self, ...controls.position }); }
  document.getElementById('touch-action').addEventListener('click', interact);
  function keydown(e) {
    if (e.code === 'Enter' && document.getElementById('login').hidden && document.activeElement !== ui.chatInput) { e.preventDefault(); ui.openChat(); return; }
    if (e.code === 'Escape' && !ui.chatForm.hidden) { e.preventDefault(); ui.closeChat(); return; }
    if (ui.blocking() || !net.ready || e.repeat || (!controls.touch && document.pointerLockElement !== canvas)) return;
    if (e.code === 'KeyE') interact();
    else if (e.code === 'KeyM') ui.route();
    else if (e.code === 'KeyF') {
      let nearest = null, best = 3.5;
      for (const [id, avatar] of avatars.items) { const distance = Math.hypot(avatar.target.x - controls.position.x, avatar.target.z - controls.position.z); if (distance < best) { best = distance; nearest = id; } }
      if (nearest) { net.send({ type: C.GREET, targetId: nearest }); ui.toast('반갑게 인사했어요.'); } else ui.toast('인사할 사람에게 조금 더 가까이 가 주세요.');
    } else if (/^Digit[1-5]$/.test(e.code)) net.send({ type: C.EMOTE, emote: EMOTES[Number(e.code.slice(-1)) - 1] });
  }
  document.addEventListener('keydown', keydown);
  function frame(stamp) {
    if (disposed) return;
    frameId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (stamp - last) / 1000); last = stamp;
    const t = stamp / 1000, now = net.now();
    if (!world || !self) return;
    const animation = controls.update(dt, locationState, self.pose, t);
    interactions.update({ ...self, ...controls.position }, engine.camera, ui.blocking() || !net.ready || (!controls.touch && document.pointerLockElement !== canvas));
    const running = world.update(t, now);
    for (const avatar of avatars.items.values()) avatar.update(dt, t, engine.camera, world.environment.calendar.event);
    audio.update(t, running);
    if (stamp >= nextSend && net.ready && !self.activity && locationState.kind !== 'submarine') {
      nextSend = stamp + 100;
      net.send({ type: C.MOVE, ...controls.position, yaw: controls.yaw, animation });
    }
    if (stamp >= nextUI) {
      nextUI = stamp + 200;
      ui.update(now, world.environment.calendar, self, totalCount, roomCount);
      if (locationState.kind === 'train') {
        const train = trainState(locationState.trainId, now);
        const noticeKey = `${locationState.trainId}:${train.segment}`;
        if (train.stopped && self.ticket?.destination === train.stationId && destinationNotice !== noticeKey) { destinationNotice = noticeKey; ui.toast('목적지에 도착했어요. 문 앞에서 E키로 내릴 수 있어요.'); audio.chime(); }
      }
    }
    engine.render(world.scene);
  }
  frameId = requestAnimationFrame(frame);
  window.addEventListener('pagehide', e => {
    if (e.persisted) { net.socket?.close(); return; }
    disposed = true; cancelAnimationFrame(frameId); document.removeEventListener('keydown', keydown);
    avatars?.dispose(); world?.dispose(); controls.dispose(); engine.dispose(); audio.dispose(); net.dispose();
  });
}
boot();
