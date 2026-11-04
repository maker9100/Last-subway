import { LIMITS, POSES, EMOTES, stationById } from './constants.js';
export const C = Object.freeze({ HELLO: 'hello', SYNC: 'time_sync', MOVE: 'move', CHAT: 'chat', INTERACT: 'interact', END: 'end', EMOTE: 'emote', GREET: 'greet' });
export const S = Object.freeze({ WELCOME: 'welcome', ROOM: 'room', SNAPSHOT: 'snapshot', TIME: 'time_sync', TRAINS: 'trains', CALENDAR: 'calendar', CHAT: 'chat', NOTICE: 'notice', TICKET: 'ticket', COLLECT: 'collect', EFFECT: 'effect', CORRECTION: 'correction', ERROR: 'error' });
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const text = (s, max, min = 0) => typeof s === 'string' && s.length >= min && s.length <= max;
export function validClient(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return false;
  switch (m.type) {
    case C.HELLO: return text(m.nickname, 64, 1) && (m.token === undefined || text(m.token, 128));
    case C.SYNC: return text(m.nonce, 64, 1) && finite(m.clientTime, -8e15, 8e15);
    case C.MOVE: return finite(m.x, -64, 64) && finite(m.z, -64, 64) && finite(m.y, 0, 0) && finite(m.yaw, -Math.PI * 2, Math.PI * 2) && ['idle', 'walk', 'run'].includes(m.animation);
    case C.CHAT: return text(m.text, LIMITS.chat, 1) && m.text.trim().length > 0;
    case C.INTERACT: return text(m.id, 32, 1) && (m.option === undefined || stationById(m.option) !== undefined || m.option === 'songpyeon');
    case C.END: return true;
    case C.EMOTE: return EMOTES.includes(m.emote);
    case C.GREET: return text(m.targetId, 64, 1);
    default: return false;
  }
}
export function validServer(m) {
  if (!m || typeof m !== 'object' || !Object.values(S).includes(m.type)) return false;
  if (m.type === S.TIME) return Number.isFinite(m.serverTime) && typeof m.nonce === 'string';
  if (m.type === S.SNAPSHOT) return Array.isArray(m.players) && m.players.every(p => typeof p.id === 'string' && Number.isFinite(p.x) && Number.isFinite(p.z) && POSES.includes(p.pose));
  if (m.type === S.ROOM) return !!m.location && Array.isArray(m.players);
  return true;
}
export function safeSend(ws, data) {
  if (!ws || ws.readyState !== 1) return;
  try { if (ws.bufferedAmount > 256 * 1024) ws.close(1013, '연결이 지연됩니다'); else ws.send(JSON.stringify(data)); } catch { ws.terminate(); }
}
