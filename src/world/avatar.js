import * as THREE from 'three';
import { Builder } from './primitives.js';
import { disposeTree } from '../engine/renderer.js';
function colorFor(name) { let hash = 0; for (const ch of name) hash = Math.imul(31, hash) + ch.charCodeAt(0); return new THREE.Color().setHSL((hash >>> 0) % 360 / 360, 0.26, 0.43).getHex(); }
export class Avatar {
  constructor(scene, data) {
    this.group = new THREE.Group(); scene.add(this.group); const b = new Builder(this.group);
    this.body = new THREE.Group(); this.group.add(this.body);
    const color = colorFor(data.nickname);
    b.box(0, 1.1, 0, 0.56, 0.65, 0.33, color, '', this.body);
    b.box(0, 1.62, 0, 0.35, 0.38, 0.34, 0xc1a081, '', this.body);
    b.box(0, 1.82, 0, 0.36, 0.12, 0.35, 0x4f453c, '', this.body);
    for (const x of [-0.09, 0.09]) b.box(x, 1.65, -0.176, 0.045, 0.04, 0.02, 0x333e3a, '', this.body);
    this.arms = [-1, 1].map(sign => {
      const pivot = new THREE.Group(); pivot.position.set(sign * 0.38, 1.36, 0); this.body.add(pivot);
      b.box(0, -0.27, 0, 0.18, 0.53, 0.22, color, '', pivot); b.box(0, -0.57, 0, 0.16, 0.18, 0.18, 0xc1a081, '', pivot); return pivot;
    });
    this.legs = [-1, 1].map(sign => { const pivot = new THREE.Group(); pivot.position.set(sign * 0.16, 0.79, 0); this.body.add(pivot); b.box(0, -0.33, 0, 0.23, 0.66, 0.27, 0x3c4d50, '', pivot); b.box(0, -0.7, -0.04, 0.25, 0.16, 0.38, 0x303b3a, '', pivot); return pivot; });
    this.cup = b.cylinder(0.1, -0.58, -0.18, 0.1, 0.2, 0xddd2ad, this.arms[1]);
    this.book = b.box(0, -0.42, -0.3, 0.35, 0.07, 0.3, 0xb38c5f, '', this.arms[0]);
    this.rod = b.box(0, -0.58, -0.8, 0.025, 0.025, 1.6, 0x785b3f, '', this.arms[1]);
    this.helmet = new THREE.Group(); this.helmet.position.y = 1.63; this.body.add(this.helmet);
    b.sphere(0, 0, 0, 0.28, 0.28, 0.28, 0x9eab8b, this.helmet);
    b.box(0, 0.02, -0.275, 0.3, 0.23, 0.07, 0x365b66, '', this.helmet);
    this.hat = b.cone(0, 2.03, 0, 0.26, 0.46, 0xb05142, this.body);
    this.name = b.label(data.nickname, 0, 2.28, 0, 2.2, 0.33, this.group);
    this.bubble = b.label('', 0, 2.75, 0, 3.5, 0.55, this.group, '#eee4ca', '#35453e');
    this.bubble.mesh.visible = false;
    this.target = { ...data }; this.group.position.set(data.x, 0, data.z); this.group.rotation.y = data.yaw;
    this.scene = scene;
  }
  set(data) { if (this.target.nickname !== data.nickname) this.name.update(data.nickname); this.target = { ...data }; }
  say(text, until) { this.bubble.update(text); this.bubbleUntil = until; }
  update(dt, t, camera, event) {
    const d = this.target, pose = d.pose;
    const weight = 1 - Math.exp(-dt * 13);
    this.group.position.x += (d.x - this.group.position.x) * weight; this.group.position.z += (d.z - this.group.position.z) * weight;
    const angle = Math.atan2(Math.sin(d.yaw - this.group.rotation.y), Math.cos(d.yaw - this.group.rotation.y)); this.group.rotation.y += angle * weight;
    this.body.rotation.set(0, 0, 0); this.body.position.y = 0;
    for (const limb of [...this.arms, ...this.legs]) limb.rotation.set(0, 0, 0);
    if (pose === 'walk' || pose === 'run') { const a = Math.sin(t * (pose === 'run' ? 12 : 8)) * 0.6; this.arms[0].rotation.x = a; this.arms[1].rotation.x = -a; this.legs[0].rotation.x = -a; this.legs[1].rotation.x = a; }
    if (['sit', 'fish', 'sled'].includes(pose)) { this.body.position.y = -0.4; for (const l of this.legs) l.rotation.x = -1.3; }
    if (pose === 'wave' || pose === 'kite') { this.arms[1].rotation.z = -2.2 + Math.sin(t * 7) * 0.3; }
    if (pose === 'bow' || pose === 'build') this.body.rotation.x = Math.sin(t * 2) * 0.25 + 0.45;
    if (pose === 'cup' || pose === 'book' || pose === 'fish' || pose === 'scope') for (const a of this.arms) a.rotation.x = -1.1;
    if (pose === 'clap') { this.arms[0].rotation.set(-1.1, 0, -0.6 + Math.sin(t * 9) * 0.25); this.arms[1].rotation.set(-1.1, 0, 0.6 - Math.sin(t * 9) * 0.25); }
    if (pose === 'dance') { this.body.position.y = Math.abs(Math.sin(t * 5)) * 0.15; this.body.rotation.z = Math.sin(t * 3) * 0.18; this.arms[0].rotation.z = 1.5; this.arms[1].rotation.z = -1.5; }
    if (pose === 'lie') { this.body.rotation.x = -Math.PI / 2; this.body.position.y = 0.15; }
    if (pose === 'throw') this.arms[1].rotation.x = -2.4 + Math.sin(t * 7) * 0.6;
    if (pose === 'swing') this.body.rotation.x = Math.sin(t * 1.7) * 0.25;
    this.body.position.z = pose === 'sled' ? (1 - Math.cos(t * 1.3)) * 1.1 : 0;
    this.cup.visible = pose === 'cup'; this.book.visible = pose === 'book'; this.rod.visible = pose === 'fish'; this.helmet.visible = d.suit; this.hat.visible = event === 'christmas';
    this.name.mesh.quaternion.copy(camera.quaternion).premultiply(this.group.quaternion.clone().invert());
    this.bubble.mesh.quaternion.copy(this.name.mesh.quaternion); this.bubble.mesh.visible = t < (this.bubbleUntil || 0);
  }
  dispose() { this.scene.remove(this.group); disposeTree(this.group); }
}
export class Avatars {
  constructor(scene, selfId) { this.scene = scene; this.selfId = selfId; this.items = new Map(); }
  snapshot(players) {
    const ids = new Set();
    for (const data of players) {
      if (data.id === this.selfId) continue;
      ids.add(data.id);
      if (!this.items.has(data.id)) this.items.set(data.id, new Avatar(this.scene, data)); else this.items.get(data.id).set(data);
    }
    for (const [id, avatar] of this.items) if (!ids.has(id)) { avatar.dispose(); this.items.delete(id); }
  }
  dispose() { for (const a of this.items.values()) a.dispose(); this.items.clear(); }
}
