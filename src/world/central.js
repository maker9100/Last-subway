import { bench } from './station.js';
export function build(b) {
  b.box(-11, 4.25, 8, 17, 1.1, 14.5, 0x706651, 'brick');
  b.label('중앙역 · 순환선 출발역', -11, 4.35, 15.28, 11, 0.7);
  b.cylinder(8, 0.3, 17, 2.2, 0.65, 0x8f9481); b.cylinder(8, 0.66, 17, 1.9, 0.08, 0x4d9299);
  b.cylinder(8, 1.2, 17, 0.25, 1.3, 0xb7b49a); b.sphere(8, 1.9, 17, 0.65, 0.3, 0.65, 0x76c2c6);
  for (const x of [-25, 23]) for (const z of [12, 24]) { b.box(x, 0.25, z, 3, 0.5, 3, 0x7d8170, 'brick'); b.sphere(x, 1, z, 1.8, 0.9, 1.8, 0x6d8c4a); }
  bench(b, 3, 24); bench(b, -5, 22);
  for (let i = 0; i < 7; i++) { b.box(12 + i * 1.8, 2.4, 3, 0.09, 4.8, 0.09, 0x797b69); b.box(12 + i * 1.8, 4.2, 3, 1, 1, 0.04, [0xa36b51, 0x647f6c, 0xc0a16c][i % 3]); }
}
