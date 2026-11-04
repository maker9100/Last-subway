import { DAY, KST_OFFSET } from './constants.js';
import { kstParts, kstDateKey } from './schedule.js';
// 한국천문연구원 2026년 월력요항: https://www.kasi.re.kr/kor/post/newsMaterial/32031
// 검증되지 않은 2027~2040년은 추정 테이블을 넣지 않고 Intl만 사용한다.
export const LUNAR_FALLBACK = Object.freeze({
  2026: { seollal: '2026-02-17', fullmoon: '2026-03-03', chuseok: '2026-09-25' }
});
export function seasonAt(now) {
  const m = kstParts(now).month;
  return m >= 3 && m <= 5 ? 'spring' : m <= 8 && m >= 6 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}
export function lunarParts(now, intl = Intl) {
  try {
    const f = new intl.DateTimeFormat('en-u-ca-chinese', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' });
    if (f.resolvedOptions().calendar !== 'chinese') return null;
    const parts = f.formatToParts(new Date(now));
    const month = parts.find(p => p.type === 'month')?.value || '';
    return { month: parseInt(month, 10), day: Number(parts.find(p => p.type === 'day')?.value), leap: /bis|leap/i.test(month) };
  } catch { return null; }
}
function lunarEvent(now, intl) {
  const candidates = [{ id: 'seollal', month: 1, day: 1, range: 1 }, { id: 'fullmoon', month: 1, day: 15, range: 0 }, { id: 'chuseok', month: 8, day: 15, range: 1 }];
  for (const c of candidates) {
    for (let shift = -c.range; shift <= c.range; shift++) {
      const t = now + shift * DAY;
      const fallback = LUNAR_FALLBACK[kstParts(t).year]?.[c.id];
      // 하루를 앞뒤로 검사하므로 음력 12월 말일과 1월 1일 경계를 놓치지 않는다.
      if (fallback ? kstDateKey(t) === fallback : (() => {
        const l = lunarParts(t, intl);
        return l && !l.leap && l.month === c.month && l.day === c.day;
      })()) return c.id;
    }
  }
  return null;
}
export function calendarAt(now, intl = Intl) {
  if (!Number.isFinite(now)) throw new RangeError('잘못된 시각');
  const { month, day, year } = kstParts(now);
  let event = null;
  if (month === 1 && day === 1) event = 'newyear';
  else if (month === 5 && day === 5) event = 'children';
  else if (Math.abs(Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 9, 31)) / DAY)) <= 3) event = 'halloween';
  else if (month === 12 && (day === 24 || day === 25)) event = 'christmas';
  else event = lunarEvent(now, intl);
  return { date: kstDateKey(now), season: seasonAt(now), event, lunarAvailable: !!lunarParts(now, intl) || !!LUNAR_FALLBACK[year], nextMidnight: Math.floor((now + KST_OFFSET) / DAY) * DAY + DAY - KST_OFFSET };
}
