import { fire } from './station.js';
export function build(b) {
  for (const [x, z] of [[13, 10], [30, 26], [-28, 20], [34, 4]]) {
    b.box(x, 1.6, z, 0.6, 3.2, 0.6, 0x657644); b.box(x + 0.7, 1.7, z, 1.2, 0.4, 0.4, 0x657644); b.box(x + 1.2, 2, z, 0.35, 1, 0.4, 0x657644);
    b.sphere(x, 3.25, z, 0.23, 0.2, 0.23, 0xaa6348);
  }
  b.sphere(21, -0.05, 21, 4.7, 0.13, 3.7, 0x4e9594);
  b.cylinder(25, 2, 24, 0.25, 4, 0x7c6b45); for (let i = 0; i < 5; i++) { const leaf = b.box(25, 4.1, 24, 5, 0.15, 0.7, 0x6c854a); leaf.rotation.y = i * Math.PI / 5; }
  b.box(25, 0.25, 9, 1.1, 0.18, 2.2, 0x91623c, 'wood');
  for (let i = 0; i < 8; i++) b.sphere(-55 + i * 16, 0, 45 + (i % 3) * 10, 17, 3 + i % 4, 15, 0xc8aa70);
  const flame = fire(b, 10, 23); return t => { flame.scale.y = 0.8 + Math.sin(t * 5) * 0.12; };
}
