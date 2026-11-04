import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three';
import { World } from '../src/world/index.js';
import { Avatars } from '../src/world/avatar.js';
import { visualOverrides } from '../src/seasons/environment.js';
import { STATIONS, EVENTS } from '../shared/constants.js';
import { latestTrainId } from '../shared/schedule.js';
// GPU 없이 절차 모델 생성과 해제를 검사하기 위한 최소 Canvas 2D 대역이다.
function installCanvas() {
  const previous = globalThis.document;
  const context = new Proxy({}, { get: (target, name) => name in target ? target[name] : () => {}, set: (target, name, value) => { target[name] = value; return true; } });
  globalThis.document = { createElement: tag => { assert.equal(tag, 'canvas'); return { width: 0, height: 0, getContext: () => context }; } };
  return () => { if (previous) globalThis.document = previous; else delete globalThis.document; };
}
function resources(root) {
  const set = new Set(); root.traverse(o => { if (o.geometry) set.add(o.geometry); for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) { set.add(m); for (const value of Object.values(m)) if (value?.isTexture) set.add(value); } }); return set;
}
test('모든 역·기념일·객실·잠수함 모델 생성/갱신과 리소스 해제', () => {
  const restore = installCanvas();
  try {
    const now = Date.parse('2026-11-04T12:00:00+09:00'), camera = new PerspectiveCamera();
    const locations = [...STATIONS.map(s => ({ kind: 'station', stationId: s.id })), { kind: 'train', trainId: latestTrainId(now) }, { kind: 'submarine', from: 'beach', to: 'deepsea', endsAt: now + 20_000 }];
    for (const location of locations) {
      const world = new World(location, { season: 'autumn', event: null }, {});
      for (const event of [null, ...EVENTS]) { world.environment.setCalendar({ season: 'winter', event }); world.update(4, now); }
      const avatars = new Avatars(world.scene, 'self');
      avatars.snapshot([{ id: 'other', nickname: '<script>', x: 1, z: 8, yaw: 0, pose: 'wave', suit: true }]);
      avatars.items.get('other').update(0.016, 2, camera, 'christmas');
      avatars.items.get('other').say('안녕하세요', 4);
      avatars.snapshot([]); avatars.dispose();
      world.effect({ id: 'snowman', x: 1, z: 2 }, 1); world.update(2, now + 70_000);
      const all = resources(world.scene), disposed = new Set();
      for (const resource of all) resource.addEventListener('dispose', () => disposed.add(resource));
      world.dispose(); assert.equal(disposed.size, all.size, `해제 누락: ${location.kind}:${location.stationId}`);
      assert.equal(world.scene.children.length, 0);
    }
  } finally { restore(); }
});
test('디버그 time의 인코딩하지 않은 +09:00과 허용 값 검사', () => {
  const debug = visualOverrides('?season=winter&event=halloween&time=2026-10-31T12:00:00+09:00');
  assert.equal(debug.time, Date.parse('2026-10-31T12:00:00+09:00')); assert.equal(debug.season, 'winter');
  assert.equal(visualOverrides('?season=bad&event=bad&time=bad').time, null);
});
