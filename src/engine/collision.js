import { canStand } from '../../shared/constants.js';
export function moveWithCollision(position, dx, dz, location) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
  for (let n = 0; n < steps; n++) {
    if (canStand(location, position.x + dx / steps, position.z)) position.x += dx / steps;
    if (canStand(location, position.x, position.z + dz / steps)) position.z += dz / steps;
  }
}
