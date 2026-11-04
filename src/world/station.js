import * as THREE from 'three';
import { COMMON, SPECIAL, OBSTACLES } from '../../shared/constants.js';
export function bench(b, x, z, color = 0x785a39) {
  b.box(x, 0.52, z, 2.8, 0.18, 0.7, color, 'wood');
  b.box(x, 0.92, z + 0.32, 2.8, 0.8, 0.14, color, 'wood');
  for (const dx of [-1, 1]) b.box(x + dx, 0.25, z, 0.16, 0.5, 0.6, 0x353c39);
}
export function fire(b, x, z) {
  const group = new THREE.Group(); b.root.add(group); group.position.set(x, 0, z);
  b.box(0, 0.12, 0, 1.2, 0.22, 0.28, 0x66503a, 'wood', group);
  b.box(0, 0.14, 0, 0.28, 0.22, 1.2, 0x66503a, 'wood', group);
  b.cone(0, 0.62, 0, 0.45, 0.9, 0xe38638, group); b.cone(0, 0.46, 0.1, 0.25, 0.6, 0xffd874, group);
  return group;
}
export function buildStation(b, station) {
  const central = station.id === 'central';
  b.box(0, station.id === 'mountain' ? -12 : -0.27, 0, 220, 0.5, 220, station.ground, 'stone');
  if (station.id === 'mountain') b.box(0, -6, 11, 64, 12, 34, station.ground, 'stone');
  b.box(0, -0.13, 1, 64, 0.24, 14, 0x989481, 'stone');
  b.box(0, 0.015, -5.5, 64, 0.035, 0.38, 0xd3ad56);
  for (const z of [-9.6, -12.1]) b.box(0, -0.33, z, 220, 0.18, 0.13, 0x8b9898);
  b.instances('box', Array.from({ length: 100 }, (_, i) => ({ x: i * 2.2 - 110, y: -0.48, z: -10.85, w: 0.35, h: 0.2, d: 4 })), 0x544e40, 'wood');
  for (const o of OBSTACLES.slice(3)) b.box((o.minX + o.maxX) / 2, 1.65, (o.minZ + o.maxZ) / 2, o.maxX - o.minX, 3.3, o.maxZ - o.minZ, 0x9a927a, 'brick');
  b.box(-11, 3.5, 8, 16, 0.45, 13.5, 0x4f5b58, 'stone');
  for (const x of [-18, -4]) for (const z of [2.5, 13.5]) b.box(x, 1.7, z, 0.25, 3.4, 0.25, 0x666b5d);
  b.box(-11, 0.02, 8, 14, 0.05, 12, 0x8c8270, 'stone');
  b.box(-6, 1.1, 3.4, 2, 2.2, 1.3, 0x587067, 'stone');
  b.label('티켓 발권', -6, 1.85, 4.07, 1.65, 0.35); b.box(-6, 1.22, 4.1, 0.8, 0.55, 0.04, 0xd9be7f);
  b.box(-10, 1.1, 3.4, 1.4, 2.2, 1.3, 0x7b5038, 'stone');
  b.label('커피  /  무료', -10, 1.8, 4.08, 1.2, 0.3); b.box(-10, 1.15, 4.1, 0.75, 0.55, 0.05, 0x283c3d);
  bench(b, -12, 11.8); bench(b, -7, 11.8);
  b.box(-17.5, 1.2, 9, 0.6, 2.4, 3, 0x71543c, 'wood');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 9; j++) b.box(-17.12, 0.45 + i * 0.67, 7.7 + j * 0.3, 0.1, 0.5, 0.18, [0xa47a4d, 0x637f74, 0x9d6253][j % 3]);
  b.box(-17.4, 1.9, 4.8, 0.6, 1.4, 2, 0x303c3d);
  const tv = b.label('LAST TRAIN  ·  오늘도 좋은 여행', -17.05, 1.95, 4.8, 1.8, 1); tv.mesh.rotation.y = Math.PI / 2;
  for (const x of [-26, -2, 27]) {
    b.box(x, 2, -3, 0.15, 4, 0.15, 0x4a5752); b.box(x, 4.05, -3, 1.2, 0.15, 0.5, 0xffd997);
  }
  b.box(0, 3.9, -3.5, central ? 14 : 10, 0.25, 4.3, 0x535b51, 'stone');
  for (const x of [-4, 4]) b.box(x, 1.9, -4.6, 0.18, 3.8, 0.18, 0x71745f);
  b.label(`${station.name}  /  LAST TRAIN`, 0, 3.15, -2.5, 7, 0.7);
  const board = b.label('열차 시간표', 0, 2.47, -2.49, 6.5, 0.42, b.root, '#b8dc80');
  b.box(5, 1.3, 4.3, 2.8, 2.6, 0.18, 0x3c504b);
  b.label('순환선 안내 · M', 5, 1.5, 4.41, 2.5, 0.6);
  const clock = b.label('KST 00:00:00', -11, 2.8, 13.65, 3.2, 0.42);
  clock.mesh.rotation.y = Math.PI;
  for (const def of [...COMMON, ...(SPECIAL[station.id] || [])]) {
    if (['board', 'books', 'tv', 'bench', 'coffee', 'ticket', 'route'].includes(def.id)) continue;
    b.cylinder(def.x, 0.01, def.z, 0.4, 0.03, station.color);
    const sign = b.label(def.prompt, def.x, 1.4, def.z + 0.3, 2.7, 0.3);
    sign.mesh.userData.interaction = true;
  }
  const plaza = b.cylinder(0, -0.005, 17, central ? 4 : 2.3, 0.04, 0x9a947c);
  plaza.rotation.y = 0.2;
  return { board, clock, tv };
}
