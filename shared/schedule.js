import { KST_OFFSET, HEADWAY, SEGMENT, DWELL, LOOP, FLEET, STATIONS } from './constants.js';
export const mod = (n, d) => ((n % d) + d) % d;
export const latestTrainId = now => Math.floor((now + KST_OFFSET) / HEADWAY);
export const departureTime = id => id * HEADWAY - KST_OFFSET;
export function canonicalTrainId(id, now) {
  return id + Math.floor((latestTrainId(now) - id) / FLEET) * FLEET;
}
export function trainState(id, now) {
  const elapsed = mod(now - departureTime(id), LOOP);
  const segment = Math.floor(elapsed / SEGMENT);
  const phase = elapsed - segment * SEGMENT;
  const stopped = phase < DWELL;
  return {
    id, departure: departureTime(id), elapsed, segment, phase,
    stationId: STATIONS[segment].id, nextStationId: STATIONS[(segment + 1) % STATIONS.length].id,
    stopped, doorsOpen: stopped, remaining: stopped ? DWELL - phase : SEGMENT - phase,
    progress: stopped ? 0 : (phase - DWELL) / (SEGMENT - DWELL),
    status: stopped ? (DWELL - phase <= 10_000 ? 'warning' : 'stopped') : 'running'
  };
}
export function activeTrains(now) {
  const latest = latestTrainId(now);
  return Array.from({ length: FLEET }, (_, i) => trainState(latest - i, now));
}
export function stationBoard(stationId, now) {
  const index = STATIONS.findIndex(s => s.id === stationId);
  if (index < 0 || !Number.isFinite(now)) throw new RangeError('잘못된 역 또는 시각');
  const id = Math.floor((now + KST_OFFSET - index * SEGMENT) / HEADWAY);
  const arrival = departureTime(id) + index * SEGMENT;
  const docked = now >= arrival && now < arrival + DWELL;
  return {
    trainId: canonicalTrainId(id, now), arrival, docked,
    remaining: docked ? arrival + DWELL - now : arrival + HEADWAY - now,
    nextArrival: arrival + HEADWAY, nextTrainId: id + 1,
    status: docked ? (arrival + DWELL - now <= 10_000 ? '곧 출발' : '정차 중') : '다음 열차'
  };
}
export function kstParts(now) {
  const d = new Date(now + KST_OFFSET);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() };
}
export function kstDateKey(now) {
  const p = kstParts(now);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
export function clockText(now, seconds = true) {
  const p = kstParts(now);
  return [p.hour, p.minute, ...(seconds ? [p.second] : [])].map(n => String(n).padStart(2, '0')).join(':');
}
export function countdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
