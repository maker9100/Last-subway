import * as THREE from 'three';
import { submarine } from './beach.js';
export function build(b) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(45, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x62adb7, wireframe: true, transparent: true, opacity: 0.16 })); b.root.add(dome);
  b.box(20, 0.01, 21, 13, 0.05, 11, 0x285765);
  b.label('수중 채집 구역 · 잠수복 필요', 19, 2.7, 25, 7, 0.5);
  b.box(9, 1.25, 6.6, 1.4, 2.5, 0.8, 0xa39547); b.sphere(9, 1.95, 7.05, 0.4, 0.4, 0.4, 0x3c6771);
  submarine(b, 29, 8);
  const fish = [];
  for (let i = 0; i < 20; i++) { const group = new THREE.Group(); b.root.add(group); b.sphere(0, 0, 0, 0.55, 0.21, 0.17, i % 2 ? 0x87b8aa : 0xb6b78e, group); const tail = b.cone(-0.6, 0, 0, 0.25, 0.5, 0x719e9d, group); tail.rotation.z = Math.PI / 2; fish.push(group); }
  return t => fish.forEach((f, i) => { const a = t * 0.12 + i * 1.8; f.position.set(Math.sin(a) * 35, 4 + (i % 5) * 2, Math.cos(a) * 35); f.rotation.y = a; });
}
