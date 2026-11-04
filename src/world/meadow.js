export function build(b) {
  for (const [x, z] of [[-10, 10], [19, 18], [27, -18], [-24, -30]]) {
    b.sphere(x, 19, z, 5, 1.2, 2.8, 0xd9dfd5);
    b.sphere(x + 2, 19.7, z, 3.5, 1.7, 2.2, 0xe3e6db);
  }
  b.box(9, 0.035, 21, 4, 0.04, 3, 0x9c6259, 'wood');
  const stalks = [], flowers = [];
  for (let i = 0; i < 75; i++) { const x = 7 + (i % 15) * 1.1, z = 7 + Math.floor(i / 15) * 0.8; stalks.push({ x, y: 0.2, z, w: 0.04, h: 0.4, d: 0.04 }); flowers.push({ x, y: 0.45, z, w: 0.13, h: 0.08, d: 0.13 }); }
  b.instances('box', stalks, 0x4b743e); b.instances('sphere', flowers, 0xd9c4a4);
  b.cylinder(32, 3, 30, 1.5, 6, 0xc4bca0); b.cone(32, 6.7, 30, 2, 1.5, 0x8b6b50);
  const blades = [];
  for (let i = 0; i < 4; i++) { const m = b.box(32, 4.5, 28.4, 0.35, 8, 0.12, 0xc5c7ad); m.rotation.z = i * Math.PI / 2; blades.push(m); }
  const kite = b.box(23, 10, 7, 1.3, 1.3, 0.08, 0xb65d48); kite.rotation.z = Math.PI / 4;
  b.box(23, 5, 7, 0.015, 9, 0.015, 0xddd9bd);
  return t => { for (let i = 0; i < blades.length; i++) blades[i].rotation.z = i * Math.PI / 2 + t * 0.25; kite.rotation.y = Math.sin(t) * 0.25; };
}
