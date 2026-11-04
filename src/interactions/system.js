import * as THREE from 'three';
import { createInteractions } from './actions.js';
export class InteractionSystem {
  constructor(location, context) { this.items = createInteractions(location, context); this.ui = context.ui; this.direction = new THREE.Vector3(); this.delta = new THREE.Vector3(); }
  update(player, camera, blocked) {
    if (blocked || !player) { this.current = null; this.ui.prompt(''); return; }
    camera.getWorldDirection(this.direction);
    let chosen = null, score = -Infinity;
    for (const item of this.items) {
      const distance = Math.hypot(item.x - player.x, item.z - player.z);
      if (distance > item.radius) continue;
      this.delta.set(item.x - camera.position.x, 1.15 - camera.position.y, item.z - camera.position.z).normalize();
      const alignment = this.direction.dot(this.delta);
      if (alignment < 0.2 && distance > 0.85) continue;
      const value = alignment * 4 - distance;
      if (value > score) { chosen = item; score = value; }
    }
    this.current = chosen;
    this.ui.prompt(chosen ? `[E] ${chosen.canInteract(player) ? chosen.prompt : '잠수복이 필요해요'}${player.activity === chosen.id ? ' · 다시 눌러 마치기' : ''}` : player.activity ? '[E] 활동 마치기' : '');
  }
  execute(player) {
    if (this.current) {
      if (player.activity === this.current.id) this.current.onEnd(player);
      else if (this.current.canInteract(player)) this.current.onInteract(player);
      else this.ui.toast('잠수복을 먼저 입어 주세요.');
    } else if (player.activity) this.items[0]?.onEnd(player);
  }
}
