import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { HEADWAY, LOOP, SEGMENT, STATIONS, KST_OFFSET } from '../shared/constants.js';
import { latestTrainId, departureTime, trainState, canonicalTrainId, stationBoard, activeTrains, kstDateKey, clockText } from '../shared/schedule.js';
import { calendarAt, seasonAt, lunarParts } from '../shared/calendar.js';
const time = text => Date.parse(text);
const midnight = time('2026-11-04T00:00:00+09:00');
const first = latestTrainId(midnight);
test('KST 자정: 기준 열차 정차 시작, 직전 열차는 사막→중앙', () => {
  assert.equal(departureTime(first), midnight);
  assert.equal(first, Math.floor((midnight + KST_OFFSET) / HEADWAY));
  const s = trainState(first, midnight);
  assert.equal(s.segment, 0); assert.equal(s.phase, 0); assert.equal(s.doorsOpen, true);
  assert.equal(trainState(first - 12, midnight - 1).segment, 7);
  assert.equal(activeTrains(midnight).length, 12);
  assert.equal(stationBoard('central', midnight).remaining, 60_000);
});
test('00:07:30: 초원역 도착, 00:08:30 정확히 문 닫힘', () => {
  const at = midnight + SEGMENT;
  assert.equal(trainState(first, at - 1).segment, 0);
  const s = trainState(first, at); assert.equal(s.segment, 1); assert.equal(s.phase, 0); assert.equal(s.doorsOpen, true);
  assert.equal(stationBoard('meadow', at).trainId, first);
  assert.equal(stationBoard('meadow', at + 59_999).docked, true);
  assert.equal(stationBoard('meadow', at + 60_000).docked, false);
  assert.equal(stationBoard('meadow', at + 60_000).remaining, 240_000);
});
test('00:59:59와 01:00:00 wrap: 정차역과 운행 ID', () => {
  const before = trainState(first, midnight + LOOP - 1000);
  assert.equal(before.stationId, 'desert'); assert.equal(before.nextStationId, 'central'); assert.equal(before.remaining, 1000);
  const after = trainState(first, midnight + LOOP); assert.equal(after.segment, 0); assert.equal(after.doorsOpen, true);
  assert.equal(canonicalTrainId(first, midnight + LOOP), first + 12);
  assert.equal(stationBoard('central', midnight + LOOP).trainId, first + 12);
});
test('23:55 출발 열차는 자정을 넘어 00:55까지 이어짐', () => {
  const depart = time('2026-11-04T23:55:00+09:00'), id = latestTrainId(depart);
  const zero = time('2026-11-05T00:00:00+09:00');
  assert.equal(trainState(id, zero).elapsed, 300_000); assert.equal(trainState(id, zero).segment, 0);
  assert.equal(trainState(id, zero + 150_000).stationId, 'meadow');
  assert.equal(trainState(id, depart + LOOP - 1).stationId, 'desert');
  assert.equal(trainState(id, depart + LOOP).stationId, 'central');
  assert.equal(latestTrainId(zero), id + 1);
});
test('모든 역의 도착 간격과 경계: 5분, 1분 정차', () => {
  for (const [i, station] of STATIONS.entries()) {
    const arrival = midnight + i * SEGMENT;
    for (const delta of [0, 1, 49_999, 50_000, 59_999, 60_000, 299_999, 300_000]) {
      const at = arrival + delta, board = stationBoard(station.id, at);
      assert.equal(board.docked, delta < 60_000 || delta === 300_000);
      if (board.docked) assert.equal(trainState(board.trainId, at).stationId, station.id);
      assert.ok(board.remaining > 0 && board.remaining <= HEADWAY);
    }
  }
});
test('PC 시간대와 DST에 관계없이 결과가 동일', () => {
  const script = "import {stationBoard,activeTrains,kstDateKey} from './shared/schedule.js';console.log(JSON.stringify([stationBoard('meadow',1793718450000),activeTrains(1793718450000),kstDateKey(1793718450000)]));";
  const values = ['UTC', 'Asia/Seoul', 'America/New_York', 'Pacific/Honolulu'].map(TZ => {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: new URL('..', import.meta.url), env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); return r.stdout;
  });
  assert.ok(values.every(v => v === values[0]));
});
test('계절 경계, 윤년과 KST 날짜 경계', () => {
  assert.equal(seasonAt(time('2026-02-28T23:59:59+09:00')), 'winter');
  assert.equal(seasonAt(time('2026-03-01T00:00:00+09:00')), 'spring');
  assert.equal(seasonAt(time('2026-11-30T23:59:59+09:00')), 'autumn');
  assert.equal(seasonAt(time('2026-12-01T00:00:00+09:00')), 'winter');
  assert.equal(kstDateKey(time('2028-02-29T23:59:59+09:00')), '2028-02-29');
  assert.equal(kstDateKey(time('2028-02-29T15:00:00Z')), '2028-03-01');
  assert.equal(clockText(midnight), '00:00:00');
  assert.equal(calendarAt(time('2026-12-31T23:59:59+09:00')).event, null);
  assert.equal(calendarAt(time('2027-01-01T00:00:00+09:00')).event, 'newyear');
});
test('2026 음력 기념일, 연휴 전날과 다음날, Intl 미지원 폴백', () => {
  const unsupported = { DateTimeFormat() { throw new Error('미지원'); } };
  for (const intl of [Intl, unsupported]) {
    for (const date of ['2026-02-16', '2026-02-17', '2026-02-18']) assert.equal(calendarAt(time(`${date}T12:00:00+09:00`), intl).event, 'seollal');
    assert.equal(calendarAt(time('2026-02-15T23:59:59+09:00'), intl).event, null);
    assert.equal(calendarAt(time('2026-02-19T00:00:00+09:00'), intl).event, null);
    assert.equal(calendarAt(time('2026-03-03T00:00:00+09:00'), intl).event, 'fullmoon');
    for (const date of ['2026-09-24', '2026-09-25', '2026-09-26']) assert.equal(calendarAt(time(`${date}T12:00:00+09:00`), intl).event, 'chuseok');
  }
});
test('Intl: 2026~2040 기념일 판정과 음력 12월→1월 경계', () => {
  for (let year = 2026; year <= 2040; year++) {
    let found = false;
    for (let day = 0; day < 65; day++) {
      const at = Date.UTC(year, 0, 1) - KST_OFFSET + day * 86400_000;
      const lunar = lunarParts(at);
      assert.ok(lunar, '테스트 런타임에 ICU 중국력이 필요합니다');
      if (lunar.month === 1 && lunar.day === 1 && !lunar.leap) {
        assert.equal(calendarAt(at).event, 'seollal');
        assert.equal(calendarAt(at - 1).event, 'seollal');
        assert.equal(calendarAt(at + 86400_000).event, 'seollal');
        assert.equal(lunarParts(at - 86400_000).month, 12);
        found = true; break;
      }
    }
    assert.equal(found, true);
  }
});
test('할로윈 전후 3일과 크리스마스, 기념일 우선', () => {
  for (const date of ['2026-10-28', '2026-10-31', '2026-11-03']) assert.equal(calendarAt(time(`${date}T12:00:00+09:00`)).event, 'halloween');
  assert.equal(calendarAt(time('2026-11-04T00:00:00+09:00')).event, null);
  assert.equal(calendarAt(time('2026-12-24T00:00:00+09:00')).event, 'christmas');
  assert.equal(calendarAt(time('2026-12-25T23:59:59+09:00')).event, 'christmas');
  assert.equal(calendarAt(time('2026-12-26T00:00:00+09:00')).event, null);
});
