import * as THREE from 'three';
import { Builder } from './primitives.js';
export function createTrain(parent) {
  const group = new THREE.Group(); parent.add(group); const b = new Builder(group); const doors = [];
  for (let car = 0; car < 4; car++) {
    const x = (car - 1.5) * 9;
    b.box(x, 1.65, 0, 8.5, 2.7, 2.9, 0xc8c8ba, 'stone');
    b.box(x, 1.12, 0, 8.6, 0.25, 2.98, 0x993f37);
    b.box(x, 2.97, 0, 8.8, 0.25, 3.05, 0x4c5557);
    b.box(x, 0.4, 0, 7.5, 0.45, 2, 0x363b3a);
    for (const z of [-1.47, 1.47]) {
      for (let w = 0; w < 5; w++) b.box(x - 3.2 + w * 1.5, 2.13, z, 1.1, 0.82, 0.04, 0x32555d);
      for (const d of [-1, 1]) {
        const panel = b.box(x + d * 0.3, 1.55, z + Math.sign(z) * 0.03, 0.57, 2.25, 0.05, 0xb1b7a8);
        doors.push({ mesh: panel, origin: panel.position.x, direction: d });
      }
    }
    for (const wx of [-2.9, 2.9]) for (const wz of [-1.3, 1.3]) { const wheel = b.cylinder(x + wx, 0.35, wz, 0.5, 0.22, 0x252e30); wheel.rotation.x = Math.PI / 2; }
    b.label(`LAST TRAIN 0${car + 1}`, x, 1.25, 1.515, 2.9, 0.25);
  }
  b.box(-23, 1.4, 0, 8, 2.4, 2.8, 0x29474c);
  b.box(-25, 2.6, 0, 3.5, 1, 2.8, 0xc0c4b9);
  b.box(-25, 2.65, 1.42, 2, 0.6, 0.06, 0x314c53);
  b.sphere(-27.05, 1.3, 0.7, 0.12, 0.12, 0.12, 0xffd889);
  b.sphere(-27.05, 1.3, -0.7, 0.12, 0.12, 0.12, 0xffd889);
  return { group, setDoors(open) { for (const d of doors) d.mesh.position.x = d.origin + (open ? d.direction * 0.52 : 0); } };
}
export function buildCabin(b, submarine = false) {
  const width = submarine ? 5 : 7.5, length = submarine ? 9 : 28;
  b.box(0, -0.18, 0, width, 0.35, length, 0x696253, 'wood');
  b.box(0, 3.25, 0, width, 0.18, length, 0xb6b6a1, 'stone');
  for (const x of [-width / 2, width / 2]) {
    b.box(x, 0.45, 0, 0.2, 0.9, length, 0x71817a, 'stone');
    b.box(x, 2.95, 0, 0.2, 0.6, length, 0xc0b99d);
    for (let z = -length / 2; z <= length / 2; z += 3) b.box(x, 1.8, z, 0.23, 2.2, 0.25, 0xc1bba4);
  }
  for (const z of [-length / 2, length / 2]) {
    b.box(0, 1.6, z, width, 3.2, 0.18, 0x9ba89f, 'stone');
    b.box(0, 1.45, z + (z < 0 ? 0.12 : -0.12), 1.8, 2.7, 0.12, 0x40555a);
  }
  for (let z = -9; z <= 9 && !submarine; z += 3) for (const x of [-2.6, 2.6]) {
    b.box(x, 0.6, z, 1.5, 0.24, 1.4, 0x4d6a61, 'stone');
    b.box(x, 1.06, z + 0.55, 1.5, 0.95, 0.22, 0x45615a);
    b.box(x, 0.25, z, 0.9, 0.5, 0.8, 0x464c46);
  }
  for (const z of [-7, 0, 7]) b.box(0, 3.12, z, 0.4, 0.08, 2.6, 0xffe9b0);
  b.label(submarine ? '잠수함 · 수면 아래의 작은 여행' : '문이 열리면 E키로 하차 · 목적지를 지나쳐도 괜찮아요', 0, 2.7, -length / 2 + 0.2, width - 1, 0.38);
}
