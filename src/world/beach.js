export function submarine(b, x, z) {
  b.sphere(x, 0.9, z, 1.4, 1.2, 3, 0xc9ac4c);
  b.box(x, 1.9, z, 1.4, 0.8, 1.5, 0xa58e43);
  for (const dz of [-1.4, 0, 1.4]) b.sphere(x + 1.25, 1, z + dz, 0.1, 0.38, 0.38, 0x365a65);
  b.cylinder(x, 2.6, z, 0.13, 1, 0x62726d); b.label('잠수함 · E', x, 3.3, z + 1.4, 2.6, 0.4);
}
export function build(b) {
  const sea = b.box(65, -0.15, 6, 72, 0.06, 200, 0x548e9a);
  b.box(24, 0.05, 16, 7, 0.18, 21, 0x9b845e, 'wood');
  for (const z of [7, 13, 20, 25]) for (const x of [20.5, 27.5]) b.box(x, 0.4, z, 0.15, 0.8, 0.15, 0x756c52);
  b.cylinder(11, 1.4, 10, 0.08, 2.8, 0x806a4a); b.cone(11, 3, 10, 2.8, 0.9, 0xb76c51);
  b.box(11, 0.3, 11, 1.5, 0.4, 2, 0xc3be9a);
  submarine(b, 29, 8);
  for (let i = 0; i < 14; i++) b.sphere(10 + (i * 3.7) % 17, 0.05, 16 + (i * 1.3) % 10, 0.15, 0.08, 0.2, 0xe4c8a2);
  return t => { sea.position.y = -0.16 + Math.sin(t * 0.7) * 0.045; };
}
