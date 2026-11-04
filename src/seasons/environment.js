import * as THREE from 'three';
import { SEASON_POLICY, SEASONS, EVENTS, stationById } from '../../shared/constants.js';
import { calendarAt } from '../../shared/calendar.js';
import { kstParts } from '../../shared/schedule.js';
import { Builder, seeded } from '../world/primitives.js';
import { disposeTree } from '../engine/renderer.js';
const LIGHT = { spring: 0xffded8, summer: 0xfff1cf, autumn: 0xffd2a0, winter: 0xc5def3 };
const EVENT_NAMES = { newyear: '새해', seollal: '설날', fullmoon: '정월대보름', children: '어린이날', chuseok: '추석', halloween: '할로윈', christmas: '크리스마스' };
export const eventName = id => EVENT_NAMES[id] || '';
export function visualOverrides(search) {
  const params = new URLSearchParams(search);
  const season = SEASONS.includes(params.get('season')) ? params.get('season') : null;
  const event = EVENTS.includes(params.get('event')) || params.get('event') === 'none' ? params.get('event') : null;
  const raw = params.get('time')?.replace(/ (\d\d:\d\d)$/, '+$1');
  const time = raw && Number.isFinite(Date.parse(raw)) ? Date.parse(raw) : null;
  return { season, event, time };
}
export class Environment {
  constructor(scene, indoor, overrides = {}) {
    this.scene = scene; this.indoor = indoor; this.overrides = overrides; this.start = performance.now();
    this.ambient = new THREE.AmbientLight(0xb4c3c2, 1.25); scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffd6ac, 1.8); this.sun.position.set(-30, 50, 20); scene.add(this.sun);
    this.calendar = { season: 'autumn', event: null };
    this.stationId = 'central';
    scene.background = new THREE.Color(0xadb9b4); scene.fog = new THREE.Fog(0xadb9b4, 22, 105);
  }
  setCalendar(serverCalendar) {
    this.serverCalendar = serverCalendar;
    const debug = this.overrides.time === null || this.overrides.time === undefined ? serverCalendar : calendarAt(this.overrides.time);
    this.calendar = { ...debug, season: this.overrides.season || debug.season, event: this.overrides.event === 'none' ? null : this.overrides.event || debug.event };
    this.configure();
  }
  setStation(id) { if (this.stationId !== id) { this.stationId = id; this.configure(); } }
  configure() {
    const key = `${this.stationId}:${this.calendar.season}:${this.calendar.event}`;
    if (key === this.key) return;
    this.key = key;
    if (this.group) { this.scene.remove(this.group); disposeTree(this.group); }
    this.group = new THREE.Group(); this.scene.add(this.group);
    const b = new Builder(this.group), random = seeded(311);
    const { season, event } = this.calendar;
    const policy = SEASON_POLICY[this.stationId] || SEASON_POLICY.central;
    this.particleKind = this.stationId === 'deepsea' ? 'bubble' : policy.particles ? event === 'halloween' ? 'bat' : event === 'newyear' ? 'firework' : event === 'fullmoon' ? 'spark' : event === 'christmas' ? 'snow' : season === 'spring' ? 'petal' : season === 'autumn' ? 'leaf' : season === 'winter' ? 'snow' : null : null;
    if (this.particleKind) {
      const count = this.particleKind === 'firework' ? 200 : 150;
      const positions = new Float32Array(count * 3); this.seeds = [];
      for (let i = 0; i < count; i++) { const seed = { x: (random() - 0.5) * 90, y: random() * 28, z: (random() - 0.5) * 90, speed: 0.3 + random() * 0.7 }; this.seeds.push(seed); positions.set([seed.x, seed.y, seed.z], i * 3); }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const color = { bubble: 0x85d2d8, bat: 0x272a32, firework: 0xffbd6e, spark: 0xffbd6e, petal: 0xf1b4bf, leaf: 0xcf9856, snow: 0xdfeced }[this.particleKind];
      this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: this.particleKind === 'bat' ? 0.4 : 0.15, transparent: true, opacity: 0.8, depthWrite: false })); this.group.add(this.particles);
    } else this.particles = null;
    const x = this.indoor ? 14 : 7, z = this.indoor ? 1 : 24;
    if (event === 'christmas') {
      b.cylinder(x, 1, z, 0.3, 2, 0x76563b);
      for (let i = 0; i < 3; i++) b.cone(x, 1.7 + i * 1.2, z, 2.2 - i * 0.5, 2.5, 0x3e6748);
      b.sphere(x, 4.7, z, 0.3, 0.4, 0.3, 0xffd477);
      for (let i = 0; i < 20; i++) b.sphere(x + Math.cos(i * 2) * (1.7 - i * 0.05), 1 + i * 0.17, z + Math.sin(i * 2) * (1.7 - i * 0.05), 0.12, 0.12, 0.12, i % 2 ? 0xe8b85c : 0xad5346);
    } else if (event === 'halloween') {
      for (let i = 0; i < 4; i++) { const px = x + i * 1.5; b.sphere(px, 0.45, z, 0.5, 0.42, 0.45, 0xb96f35); b.box(px, 0.93, z, 0.1, 0.2, 0.1, 0x647045); for (const dx of [-0.16, 0.16]) b.box(px + dx, 0.53, z + 0.4, 0.12, 0.12, 0.08, 0xffd27d); }
    } else if (event === 'seollal') {
      b.box(x, 0.04, z, 3, 0.08, 3, 0xc2ad7e, 'wood');
      for (let i = 0; i < 4; i++) b.box(x - 0.6 + i * 0.4, 0.14, z, 0.18, 0.1, 1.1, 0x694d36);
      b.label('새해 복 많이 받으세요', x, 2.3, z, 6, 0.6);
    } else if (event === 'fullmoon' || event === 'chuseok') {
      b.sphere(15, 27, -52, 5, 5, 2, 0xe8d8a5);
      if (event === 'fullmoon' && this.stationId !== 'deepsea') {
        for (let i = 0; i < 5; i++) b.cone(x + Math.sin(i) * 0.3, 0.7, z + Math.cos(i) * 0.3, 0.3, 1.4, 0xb17a3e);
        b.cone(x, 1.1, z, 0.6, 2, 0xe7a34c);
      }
      b.label(event === 'chuseok' ? '풍성한 한가위 · 자판기에서 송편을!' : '정월대보름 · 소원을 빌어 보세요', x, 3.3, z, 7, 0.5);
    } else if (event === 'children') {
      for (let i = 0; i < 7; i++) { b.sphere(x + i * 0.6, 3 + Math.sin(i) * 0.5, z, 0.3, 0.4, 0.3, [0xbc654e, 0xc4b865, 0x69a6a6][i % 3]); b.box(x + i * 0.6, 1.9, z, 0.015, 2, 0.015, 0xbfb897); }
    }
  }
  update(t, now, fromId = this.stationId, toId = fromId, mix = 0) {
    this.setStation(fromId);
    const visualNow = this.overrides.time === null || this.overrides.time === undefined ? now : this.overrides.time + performance.now() - this.start;
    const p = kstParts(visualNow), hour = p.hour + p.minute / 60;
    const daylight = fromId === 'deepsea' ? 0.5 : Math.max(0.12, Math.sin((hour - 6) / 12 * Math.PI));
    const from = stationById(fromId), to = stationById(toId) || from;
    const color = new THREE.Color(from.sky).lerp(new THREE.Color(to.sky), mix).multiplyScalar(0.25 + daylight * 0.75);
    if (this.calendar.event === 'halloween') color.multiplyScalar(0.55);
    this.scene.background.copy(color); this.scene.fog.color.copy(color);
    this.scene.fog.near = fromId === 'deepsea' ? 14 : 24; this.scene.fog.far = fromId === 'deepsea' ? 65 : 115;
    this.ambient.intensity = this.indoor ? 1.15 : 0.45 + daylight * 0.8;
    this.sun.intensity = this.indoor ? 0.7 : 0.35 + daylight * 1.4;
    const eventLight = { halloween: 0xdc9b6a, christmas: 0xcbdbe3, seollal: 0xffd6b6, fullmoon: 0xe8d6a6, chuseok: 0xe8d6a6, children: 0xffedc0, newyear: 0xffdab8 }[this.calendar.event];
    this.sun.color.set(SEASON_POLICY[fromId]?.light ? eventLight || LIGHT[this.calendar.season] : 0x8ed0d6);
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position;
      for (let i = 0; i < this.seeds.length; i++) {
        const s = this.seeds[i]; let x = s.x, y, z = s.z;
        if (this.particleKind === 'firework') { const a = (t + s.speed * 3) % 3, r = a * 4; x = 12 + Math.cos(i * 4.3) * r; y = 17 + Math.sin(i * 2.1) * r - a * a; z = -20 + Math.sin(i * 4.3) * r; }
        else if (this.particleKind === 'spark') { x = (this.indoor ? 14 : 7) + Math.sin(t * 3 + i) * 1.8; y = 0.5 + ((t * s.speed + i) % 2.5); z = 24 + Math.cos(t * 3 + i) * 1.8; }
        else { const up = this.particleKind === 'bubble'; y = ((s.y + (up ? t : -t) * s.speed) % 28 + 28) % 28; x += Math.sin(t * s.speed + i) * (this.particleKind === 'bat' ? 5 : 2); }
        if (this.indoor && Math.abs(x) < 5) x += x < 0 ? -8 : 8;
        positions.setXYZ(i, x, y, z);
      }
      positions.needsUpdate = true;
    }
  }
  dispose() { if (this.group) { this.scene.remove(this.group); disposeTree(this.group); } this.scene.remove(this.sun, this.ambient); }
}
