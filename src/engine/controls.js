import { moveWithCollision } from './collision.js';
export class Controls extends EventTarget {
  constructor(canvas, camera) {
    super();
    this.canvas = canvas; this.camera = camera; this.keys = new Set(); this.yaw = 0; this.pitch = 0;
    this.position = { x: 0, y: 0, z: 9 }; this.blocked = true; this.frozen = false;
    this.joy = { x: 0, y: 0 }; this.touch = matchMedia('(pointer: coarse)').matches;
    this.abort = new AbortController();
    const listen = (el, type, fn, options = {}) => el.addEventListener(type, fn, { ...options, signal: this.abort.signal });
    listen(document, 'keydown', e => {
      if (this.blocked || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
      if (!this.touch && document.pointerLockElement !== canvas) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space'].includes(e.code)) { e.preventDefault(); this.keys.add(e.code); }
    });
    listen(document, 'keyup', e => this.keys.delete(e.code));
    listen(window, 'blur', () => this.clear());
    listen(document, 'pointerlockchange', () => { this.clear(); this.dispatchEvent(new Event('lock')); });
    listen(document, 'mousemove', e => { if (!this.blocked && document.pointerLockElement === canvas) this.look(e.movementX, e.movementY); });
    listen(canvas, 'click', () => { if (!this.blocked && !this.touch) this.lock(); });
    let viewPointer = null;
    let previous;
    listen(canvas, 'pointerdown', e => {
      if (!this.touch || this.blocked) return;
      viewPointer = e.pointerId; previous = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
    });
    listen(canvas, 'pointermove', e => {
      if (e.pointerId !== viewPointer || this.blocked) return;
      this.look((e.clientX - previous.x) * 1.8, (e.clientY - previous.y) * 1.8);
      previous = { x: e.clientX, y: e.clientY };
    });
    for (const type of ['pointerup', 'pointercancel']) listen(canvas, type, e => { if (e.pointerId === viewPointer) viewPointer = null; });
    const joystick = document.getElementById('joystick');
    const stick = document.getElementById('stick');
    let joyPointer = null;
    const updateJoy = e => {
      const r = joystick.getBoundingClientRect();
      let x = (e.clientX - r.x - r.width / 2) / 42;
      let y = (e.clientY - r.y - r.height / 2) / 42;
      const len = Math.max(1, Math.hypot(x, y)); x /= len; y /= len;
      this.joy = { x, y }; stick.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
    };
    listen(joystick, 'pointerdown', e => { joyPointer = e.pointerId; joystick.setPointerCapture(e.pointerId); updateJoy(e); });
    listen(joystick, 'pointermove', e => { if (joyPointer === e.pointerId) updateJoy(e); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(joystick, type, e => {
      if (joyPointer === e.pointerId) { joyPointer = null; this.joy = { x: 0, y: 0 }; stick.style.transform = 'translate(0,0)'; }
    });
  }
  look(x, y) { this.yaw = ((this.yaw - x * 0.0025 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch - y * 0.0025)); }
  clear() { this.keys.clear(); this.joy = { x: 0, y: 0 }; }
  setBlocked(value) { this.blocked = value; this.clear(); if (value && document.pointerLockElement) document.exitPointerLock(); }
  lock() { if (!this.touch && !this.blocked) { try { const result = this.canvas.requestPointerLock(); result?.catch(() => {}); } catch {} } }
  update(dt, location, pose = 'idle', t = 0) {
    const unlocked = !this.touch && document.pointerLockElement !== this.canvas;
    let moving = false;
    if (!this.blocked && !unlocked && !this.frozen && location && location.kind !== 'submarine') {
      let x = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0) + this.joy.x;
      let z = (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0) + this.joy.y;
      const length = Math.hypot(x, z); moving = length > 0.1;
      if (moving) {
        x /= Math.max(1, length); z /= Math.max(1, length);
        const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 5.8 : 3.7;
        moveWithCollision(this.position, (x * Math.cos(this.yaw) + z * Math.sin(this.yaw)) * dt * speed, (-x * Math.sin(this.yaw) + z * Math.cos(this.yaw)) * dt * speed, location);
      }
    }
    const eye = ['sit', 'fish', 'sled'].includes(pose) ? 1.05 : pose === 'lie' ? 0.42 : 1.65;
    this.camera.position.set(this.position.x, eye + (pose === 'swing' ? Math.sin(t * 1.7) * 0.25 : 0), this.position.z);
    if (pose === 'sled') { const glide = (1 - Math.cos(t * 1.3)) * 1.1; this.camera.position.x += Math.sin(this.yaw) * glide; this.camera.position.z += Math.cos(this.yaw) * glide; }
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(pose === 'lie' ? 0.9 + this.pitch * 0.2 : this.pitch, this.yaw, pose === 'sled' ? Math.sin(t * 4) * 0.08 : 0);
    this.camera.fov += ((pose === 'scope' ? 27 : 73) - this.camera.fov) * Math.min(1, dt * 8);
    this.camera.updateProjectionMatrix();
    return moving ? (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 'run' : 'walk') : 'idle';
  }
  dispose() { this.abort.abort(); this.clear(); }
}
