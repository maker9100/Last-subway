import { fire } from './station.js';
export function snowman(b, x, z, parent = b.root) {
  b.sphere(x, 0.65, z, 0.65, 0.65, 0.65, 0xe2e7df, parent); b.sphere(x, 1.45, z, 0.45, 0.45, 0.45, 0xe2e7df, parent);
  b.box(x, 1.3, z, 1.05, 0.1, 0.96, 0xb45d44, '', parent);
  b.box(x, 1.55, z + 0.43, 0.1, 0.1, 0.15, 0xdc9b4e, '', parent);
  for (const dx of [-0.17, 0.17]) b.sphere(x + dx, 1.66, z + 0.39, 0.04, 0.04, 0.04, 0x354546, parent);
}
export function build(b) {
  snowman(b, 12, 11.5); snowman(b, 24, 25);
  b.box(9, 0.8, 22, 1.8, 1.6, 1.2, 0x505a54, 'stone'); const flame = fire(b, 9, 21.4);
  b.label('장작 난로', 9, 2, 22.7, 2.4, 0.4);
  return t => { flame.scale.y = 0.8 + Math.sin(t * 5) * 0.12; };
}
