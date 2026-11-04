import { LIMITS, SPAWN } from '../shared/constants.js';
import { S, safeSend } from '../shared/protocol.js';
import { publicPlayer, uniqueNickname } from './players.js';
export class RoomManager {
  constructor() { this.rooms = new Map(); }
  choose(target) {
    if (target.kind === 'station') {
      for (let channel = 1; ; channel++) {
        const id = `station:${target.stationId}:${channel}`;
        const room = this.rooms.get(id);
        if (!room || room.members.size < LIMITS.channel) return { id, channel, kind: 'station', stationId: target.stationId };
      }
    }
    if (target.kind === 'train') return { id: `train:${target.trainId}`, channel: 1, kind: 'train', trainId: target.trainId };
    return { id: `submarine:${target.tripId}`, channel: 1, kind: 'submarine', tripId: target.tripId, from: target.from, to: target.to, endsAt: target.endsAt };
  }
  join(p, target, preservePosition = false) {
    const next = this.choose(target);
    let room = this.rooms.get(next.id);
    if (!room) { room = { ...next, members: new Map() }; this.rooms.set(room.id, room); }
    // 룸 변경은 await 없는 단일 동기 구간에서 처리한다.
    this.remove(p);
    this.rooms.set(room.id, room);
    p.location = { ...next };
    p.roomId = room.id;
    p.nickname = uniqueNickname(p.baseName, room.members, p.id);
    if (!preservePosition) Object.assign(p, target.kind === 'station' ? SPAWN : { x: 0, y: 0, z: target.kind === 'train' ? -8 : 0 });
    p.pose = 'idle';
    p.activity = null;
    p.credit = LIMITS.speed;
    p.lastMove = Date.now();
    room.members.set(p.id, p);
    this.sendRoom(p);
    return room;
  }
  sendRoom(p) {
    const room = this.rooms.get(p.roomId);
    if (room) safeSend(p.ws, { type: S.ROOM, location: p.location, players: [...room.members.values()].map(publicPlayer), ticket: p.ticket, self: publicPlayer(p) });
  }
  remove(p) {
    const old = this.rooms.get(p.roomId);
    if (old) {
      old.members.delete(p.id);
      if (old.members.size === 0) this.rooms.delete(old.id);
    }
    p.roomId = null;
  }
  broadcast(roomId, message) {
    const room = this.rooms.get(roomId);
    if (room) for (const p of room.members.values()) safeSend(p.ws, message);
  }
  snapshots(now) {
    for (const room of this.rooms.values()) this.broadcast(room.id, { type: S.SNAPSHOT, now, players: [...room.members.values()].map(publicPlayer) });
  }
  count() { let n = 0; for (const r of this.rooms.values()) n += r.members.size; return n; }
}
