import { fire } from './station.js';
export function build(b) {
  b.box(33, 8, 35, 45, 0.04, 0.04, 0x697270);
  b.box(30, 5.5, 35, 2.5, 2.5, 2, 0x9b7760);
  b.box(30, 5.9, 36.02, 2, 0.8, 0.05, 0x425f66);
  b.box(30, 7.4, 35, 0.07, 1.1, 0.07, 0x697270);
  b.box(22, 0.06, 20, 7, 0.15, 7, 0x858579, 'stone');
  for (const x of [18.5, 25.5]) b.box(x, 0.6, 21.5, 0.12, 1.2, 4, 0x535d56);
  b.cylinder(22, 0.8, 21, 0.1, 1.6, 0x5d685f);
  const scope = b.cylinder(22, 1.7, 21, 0.19, 1.3, 0x536c69); scope.rotation.x = Math.PI / 3;
  b.sphere(11, 0.25, 12, 1.7, 0.6, 1.1, 0x8b8e82);
  b.box(24, 2.5, 9, 3, 0.22, 0.4, 0x6f5238); for (const x of [22.5, 25.5]) b.box(x, 1.3, 9, 0.2, 2.6, 0.3, 0x6f5238);
  b.cone(24, 1.9, 9, 0.6, 0.9, 0xc0a15f);
  const flame = fire(b, 10, 23);
  for (let i = 0; i < 9; i++) b.cone(-65 + i * 18, 15, -70, 15 + i % 3 * 4, 36 + i % 4 * 9, 0x6d7c7e);
  return t => { flame.scale.y = 0.8 + Math.sin(t * 6) * 0.15; };
}
