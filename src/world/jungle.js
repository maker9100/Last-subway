export function build(b) {
  for (const x of [17, 21]) b.cylinder(x, 1.6, 19, 0.16, 3.2, 0x5d4936);
  b.box(19, 0.8, 19, 4, 0.08, 1.3, 0xa58b65);
  for (const x of [23, 25]) b.box(x, 3, 10, 0.06, 6, 0.06, 0x647249);
  const swing = b.box(24, 0.7, 10, 1.8, 0.12, 0.7, 0x876444, 'wood');
  b.cylinder(9, 1.3, 23, 0.1, 2.6, 0x685440); b.sphere(9, 2.7, 23, 0.25, 0.4, 0.25, 0xaf5b40);
  b.box(9.2, 2.9, 23.2, 0.16, 0.12, 0.22, 0xd6bb63);
  for (let i = 0; i < 8; i++) b.sphere(11 + i % 3, 2 + i * 0.15, 10 + i % 2, 0.18, 0.22, 0.18, 0xd3a54c);
  return t => { swing.position.z = 10 + Math.sin(t * 1.7) * 0.6; };
}
