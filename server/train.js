import { canonicalTrainId, activeTrains } from '../shared/schedule.js';
import { calendarAt } from '../shared/calendar.js';
import { S, safeSend } from '../shared/protocol.js';
export function refreshJourney(p, rooms, now) {
  const l = p.location;
  if (l.kind === 'train') {
    const id = canonicalTrainId(l.trainId, now);
    if (id !== l.trainId) rooms.join(p, { kind: 'train', trainId: id }, true);
  } else if (l.kind === 'submarine' && now >= l.endsAt) {
    rooms.join(p, { kind: 'station', stationId: l.to });
    safeSend(p.ws, { type: S.NOTICE, text: '잠수함이 도착했어요.' });
  }
}
export class TrainService {
  constructor(rooms) { this.rooms = rooms; this.calendar = null; this.lastSecond = -1; }
  tick(now) {
    const players = [...this.rooms.rooms.values()].flatMap(r => [...r.members.values()]);
    for (const p of players) refreshJourney(p, this.rooms, now);
    if (Math.floor(now / 1000) === this.lastSecond) return;
    this.lastSecond = Math.floor(now / 1000);
    if (!this.calendar || now >= this.calendar.nextMidnight) {
      this.calendar = calendarAt(now);
      for (const p of players) safeSend(p.ws, { type: S.CALENDAR, calendar: this.calendar });
    }
    const packet = { type: S.TRAINS, serverNow: now, trains: activeTrains(now), count: this.rooms.count() };
    for (const p of players) safeSend(p.ws, packet);
  }
}
