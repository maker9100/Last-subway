export const KST_OFFSET = 9 * 3600_000;
export const DAY = 86400_000;
export const HEADWAY = 300_000;
export const SEGMENT = 450_000;
export const DWELL = 60_000;
export const LOOP = 3600_000;
export const FLEET = LOOP / HEADWAY;
export const LIMITS = Object.freeze({
  channel: 24, nickname: 12, chat: 100, speed: 6.2, payload: 4096,
  resume: 15 * 60_000, ipConnections: 8, invalid: 8, maxConnections: 512
});
export const STATIONS = Object.freeze([
  { id: 'central', name: '중앙역', color: 0xd8a55a, ground: 0x77715f, sky: 0xa2b2bf },
  { id: 'meadow', name: '초원역', color: 0x9ac75f, ground: 0x688b46, sky: 0xa5cbd0 },
  { id: 'snow', name: '설원역', color: 0xc6e3ed, ground: 0xc6d7da, sky: 0x9aaebc },
  { id: 'beach', name: '해변역', color: 0xe8c77c, ground: 0xc9b47e, sky: 0x7fb8c5 },
  { id: 'deepsea', name: '심해역', color: 0x66bec5, ground: 0x385c65, sky: 0x12394a },
  { id: 'jungle', name: '정글역', color: 0x8caf54, ground: 0x4d6338, sky: 0x6f927e },
  { id: 'mountain', name: '산맥역', color: 0xb0b6bf, ground: 0x777c75, sky: 0x9caebb },
  { id: 'desert', name: '사막역', color: 0xe5b26e, ground: 0xc7a367, sky: 0xcab99b }
]);
export const stationById = id => STATIONS.find(s => s.id === id);
export const SPAWN = Object.freeze({ x: 0, y: 0, z: 9 });
export const BOUNDS = Object.freeze({
  station: { minX: -31, maxX: 31, minZ: -6, maxZ: 28 },
  train: { minX: -3, maxX: 3, minZ: -12, maxZ: 12 },
  submarine: { minX: -2, maxX: 2, minZ: -3, maxZ: 3 }
});
// 위치는 접근 지점이며, 장식의 충돌 상자는 별도로 둔다.
const point = (id, x, z, prompt, pose = null, collect = null, duration = 0) =>
  ({ id, x, y: 0, z, radius: 2.5, prompt, pose, collect, duration });
export const COMMON = Object.freeze([
  point('ticket', -6, 5, '티켓 발권'), point('coffee', -10, 5, '커피 뽑기', 'cup'),
  point('bench', -12, 11, '벤치에 앉기', 'sit'),
  point('books', -16, 9, '책 읽기', 'book'), point('tv', -16, 5, 'TV 보기', 'watch'),
  point('greet', 0, 17, '광장에서 인사', 'wave'), point('route', 5, 5, '노선도 보기'),
  point('board', 0, -5, '열차 탑승')
]);
export const SPECIAL = Object.freeze({
  central: [point('fountain', 8, 17, '분수 옆에서 쉬기', 'sit')],
  meadow: [point('flower', 12, 10, '꽃 따기', null, 'flower'), point('cloud', 19, 18, '누워서 구름 보기', 'lie'), point('picnic', 9, 21, '피크닉 매트에 앉기', 'sit'), point('kite', 23, 10, '연 날리기', 'kite')],
  snow: [point('snowman', 12, 10, '눈사람 만들기', 'build', null, 4000), point('snowball', 20, 10, '눈 뭉치 던지기', 'throw', null, 1600), point('stove', 9, 21, '난로 앞에 앉기', 'sit'), point('footprints', 22, 21, '눈 위에 발자국 남기기', 'walk', null, 1500)],
  beach: [point('fish', 21, 21, '낚시하기', 'fish', 'fish', 4000), point('shell', 13, 19, '조개 줍기', null, 'shell'), point('parasol', 11, 10, '파라솔 아래 휴식', 'sit'), point('submarine', 25, 8, '잠수함 탑승 · 심해역')],
  deepsea: [point('suit', 9, 8, '잠수복 입기 / 벗기'), point('deepfish', 19, 20, '잠수복으로 물고기 잡기', 'fish', 'deepfish', 3000), point('submarine', 25, 8, '잠수함 탑승 · 해변역'), point('observe', 9, 21, '해저 생물 관찰', 'watch')],
  jungle: [point('fruit', 12, 10, '과일 따기', null, 'fruit'), point('hammock', 19, 19, '해먹에 눕기', 'lie'), point('parrot', 9, 22, '앵무새에게 인사', 'wave'), point('swing', 24, 10, '덩굴 그네 타기', 'swing')],
  mountain: [point('telescope', 22, 20, '전망대 망원경 보기', 'scope'), point('rock', 11, 11, '바위에 앉기', 'sit'), point('bell', 24, 9, '산 정상 종 치기', 'bow', null, 2500), point('campfire', 10, 22, '캠프파이어에 앉기', 'sit')],
  desert: [point('cactus', 12, 10, '선인장 열매 따기', null, 'cactus'), point('water', 20, 20, '오아시스 물 마시기', 'cup', null, 3000), point('sled', 25, 9, '모래 썰매 타기', 'sled', null, 6500), point('fire', 10, 22, '모닥불 옆에 앉기', 'sit')]
});
export const CABIN = Object.freeze([
  point('exit', 0, -11, '정차역에서 하차'), point('seat1', -2, -5, '좌석에 앉기', 'sit'),
  point('seat2', 2, 1, '좌석에 앉기', 'sit'), point('window', -2, 7, '창밖 보기', 'watch')
]);
export function interactionsFor(location) {
  if (location.kind === 'train') return CABIN;
  if (location.kind !== 'station') return [];
  return [...COMMON, ...(SPECIAL[location.stationId] || [])];
}
export const COLLECTIONS = Object.freeze({
  flower: ['들국화', '민들레', '수레국화', '클로버'], fish: ['고등어', '전갱이', '도미', '은빛 멸치'],
  shell: ['소라', '가리비', '분홍 조개'], deepfish: ['심해 아귀', '발광 해파리', '투명 물고기'],
  fruit: ['바나나', '망고', '구아바'], cactus: ['붉은 선인장 열매', '황금 선인장 열매']
});
export const EMOTES = Object.freeze(['wave', 'bow', 'clap', 'dance', 'sit']);
export const POSES = Object.freeze(['idle', 'walk', 'run', 'sit', 'cup', 'book', 'watch', 'lie', 'kite', 'build', 'throw', 'fish', 'wave', 'swing', 'scope', 'bow', 'sled', 'clap', 'dance']);
export const SEASONS = Object.freeze(['spring', 'summer', 'autumn', 'winter']);
export const EVENTS = Object.freeze(['newyear', 'seollal', 'fullmoon', 'children', 'chuseok', 'halloween', 'christmas']);
// 사막과 해저의 고유 환경에는 계절 강수와 낙엽을 적용하지 않는다.
export const SEASON_POLICY = Object.freeze({
  central: { particles: true, light: true }, meadow: { particles: true, light: true },
  snow: { particles: true, light: true }, beach: { particles: true, light: true },
  deepsea: { particles: false, light: false }, jungle: { particles: true, light: true },
  mountain: { particles: true, light: true }, desert: { particles: false, light: true }
});
export const OBSTACLES = Object.freeze([
  { minX: -7, maxX: -5, minZ: 2.8, maxZ: 4.1 },
  { minX: -10.7, maxX: -9.3, minZ: 2.8, maxZ: 4.1 },
  { minX: -17.8, maxX: -17.2, minZ: 7.4, maxZ: 10.5 },
  { minX: -18.5, maxX: -3.5, minZ: 1.6, maxZ: 2.1 },
  { minX: -18.5, maxX: -18, minZ: 2, maxZ: 14 },
  { minX: -4, maxX: -3.5, minZ: 2, maxZ: 14 }
]);
export function canStand(location, x, z, radius = 0.28) {
  const b = BOUNDS[location.kind];
  if (!b || !Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
  return location.kind !== 'station' || !OBSTACLES.some(o => x > o.minX - radius && x < o.maxX + radius && z > o.minZ - radius && z < o.maxZ + radius);
}
export function canTravel(location, from, to) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.12));
  for (let i = 1; i <= steps; i++) {
    if (!canStand(location, from.x + (to.x - from.x) * i / steps, from.z + (to.z - from.z) * i / steps)) return false;
  }
  return true;
}
