import { randomUUID, randomBytes } from 'node:crypto';
import { LIMITS, SPAWN } from '../shared/constants.js';
const BAD_WORDS = ['씨발', '시발', '병신', '개새끼', 'fuck', 'shit'];
export function cleanNickname(raw) {
  if (typeof raw !== 'string') throw new Error('닉네임을 입력해 주세요.');
  const name = raw.trim().normalize('NFC');
  if (name.length < 2 || name.length > LIMITS.nickname || !/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 _]+$/u.test(name)) throw new Error('닉네임은 한글·영문·숫자·공백·밑줄 2~12자로 입력해 주세요.');
  if (BAD_WORDS.some(w => name.toLowerCase().replace(/\s/g, '').includes(w))) throw new Error('다른 닉네임을 사용해 주세요.');
  return name;
}
export function filterChat(raw) {
  let result = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  for (const w of BAD_WORDS) result = result.replace(new RegExp(w, 'gi'), '＊'.repeat(w.length));
  return result;
}
export function uniqueNickname(base, members, selfId) {
  const used = new Set([...members.values()].filter(p => p.id !== selfId).map(p => p.nickname.toLowerCase()));
  let result = base;
  for (let n = 2; used.has(result.toLowerCase()); n++) result = base.slice(0, LIMITS.nickname - String(n).length) + n;
  return result;
}
export function publicPlayer(p) {
  return { id: p.id, nickname: p.nickname, x: p.x, y: 0, z: p.z, yaw: p.yaw, pose: p.pose, suit: p.suit, activity: p.activity?.id || null };
}
export class PlayerStore {
  constructor() { this.sessions = new Map(); }
  connect(ws, message, now) {
    const baseName = cleanNickname(message.nickname);
    let p = this.sessions.get(message.token);
    // 복제한 탭이 sessionStorage를 물려받으면 기존 접속을 빼앗지 않고 새 여행자로 만든다.
    if (p?.ws) p = null;
    if (p && now - p.disconnectedAt > LIMITS.resume) { this.sessions.delete(p.token); p = null; }
    const resumed = !!p;
    if (!p) {
      p = { id: randomUUID(), token: randomBytes(32).toString('hex'), baseName, nickname: baseName,
        ...SPAWN, yaw: 0, pose: 'idle', suit: false, ticket: null, location: { kind: 'station', stationId: 'central' },
        roomId: null, activity: null, cooldowns: new Map(), lastFootprint: 0 };
      this.sessions.set(p.token, p);
    }
    p.ws = ws;
    p.credit = LIMITS.speed;
    p.lastMove = now;
    p.activity = null;
    p.pose = 'idle';
    return { player: p, resumed };
  }
  disconnect(p, ws, now) {
    if (p.ws !== ws) return;
    p.ws = null;
    p.disconnectedAt = now;
    p.activity = null;
    p.pose = 'idle';
  }
  sweep(now) {
    for (const [token, p] of this.sessions) if (!p.ws && now - p.disconnectedAt > LIMITS.resume) this.sessions.delete(token);
  }
}
