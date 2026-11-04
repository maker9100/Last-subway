import * as THREE from 'three';
import { STATIONS, stationById } from '../../shared/constants.js';
import { trainState, stationBoard, countdown, clockText } from '../../shared/schedule.js';
import { Builder, seeded } from './primitives.js';
import { buildStation } from './station.js';
import { createTrain, buildCabin } from './train.js';
import { Environment } from '../seasons/environment.js';
import { disposeTree } from '../engine/renderer.js';
import * as central from './central.js';
import * as meadow from './meadow.js';
import * as snow from './snow.js';
import * as beach from './beach.js';
import * as deepsea from './deepsea.js';
import * as jungle from './jungle.js';
import * as mountain from './mountain.js';
import * as desert from './desert.js';
const GENERATORS = { central, meadow, snow, beach, deepsea, jungle, mountain, desert };
function scenery(b, id, indoors) {
  const station = stationById(id), random = seeded(STATIONS.indexOf(station) + 41);
  const trunks = [], crowns = [];
  const count = id === 'desert' ? 20 : id === 'jungle' ? 160 : 50;
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2, r = indoors ? 14 + random() * 55 : 38 + random() * 48;
    let x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (indoors && Math.abs(x) < 9) x += x < 0 ? -13 : 13;
    const h = 3 + random() * (id === 'jungle' ? 7 : 4);
    trunks.push({ x, y: h / 2, z, w: 0.3, h, d: 0.3 }); crowns.push({ x, y: h, z, w: 1.5 + random(), h: 3 + random() * 2, d: 1.5 + random() });
  }
  if (id === 'desert') { b.instances('box', trunks, 0x6b804d); b.instances('sphere', crowns.map(v => ({ ...v, w: 0.5, h: 0.3, d: 0.5 })), 0xb2774c); }
  else if (id === 'deepsea') { b.instances('sphere', crowns.map(v => ({ ...v, y: v.h / 3, w: 1.3, h: 0.6 })), 0x568c8e); }
  else { b.instances('box', trunks, 0x66553d, 'wood'); b.instances(id === 'snow' || id === 'mountain' ? 'cone' : 'sphere', crowns, id === 'snow' ? 0xc5d2cf : id === 'jungle' ? 0x47653e : 0x748650); }
  if (indoors) {
    b.box(0, -0.6, 0, 180, 0.2, 180, station.ground, 'stone');
    if (id === 'beach') b.box(45, -0.35, 0, 60, 0.1, 180, 0x548e9a);
    if (id === 'meadow') { b.cylinder(23, 4, -20, 1.5, 8, 0xd0c7a6); for (let i = 0; i < 4; i++) { const blade = b.box(23, 6, -21.6, 0.4, 10, 0.15, 0xc4c8b2); blade.rotation.z = i * Math.PI / 2 + 0.4; } }
    if (id === 'mountain') for (let i = 0; i < 8; i++) b.cone(i % 2 ? -45 : 45, 7, -50 + i * 14, 14, 25 + i * 3, 0x768384);
    if (id === 'central') for (let i = 0; i < 7; i++) b.box(25, 3 + i % 3, -40 + i * 13, 10, 6 + i % 3 * 2, 8, 0x8c8b79, 'brick');
    b.label(`${station.name} 풍경`, -14, 3, -20, 6, 0.8).mesh.rotation.y = Math.PI / 2;
  }
}
export class World {
  constructor(location, calendar, overrides) {
    this.location = location; this.scene = new THREE.Scene(); this.effects = [];
    this.b = new Builder(this.scene);
    const indoor = location.kind !== 'station';
    this.environment = new Environment(this.scene, indoor, overrides);
    this.environment.stationId = location.stationId || (location.kind === 'submarine' ? 'deepsea' : 'central');
    this.environment.setCalendar(calendar);
    if (location.kind === 'station') {
      const station = stationById(location.stationId);
      this.signs = buildStation(this.b, station);
      this.animate = GENERATORS[location.stationId].build(this.b);
      scenery(this.b, location.stationId, false);
      this.train = createTrain(this.scene); this.train.group.position.z = -10.85;
    } else {
      buildCabin(this.b, location.kind === 'submarine');
      if (location.kind === 'submarine') { this.setScenery('deepsea'); this.b.label('수심 120m · 자동 운항 중', 0, 1.9, -4.35, 3.4, 0.7); }
    }
  }
  setScenery(id) {
    if (this.sceneryId === id) return;
    if (this.scenic) { this.scene.remove(this.scenic); disposeTree(this.scenic); }
    this.sceneryId = id; this.scenic = new THREE.Group(); this.scene.add(this.scenic);
    scenery(new Builder(this.scenic), id, true);
  }
  effect(message, t) {
    if (message.id === 'bell') return;
    const group = new THREE.Group(), b = new Builder(group); this.scene.add(group);
    group.position.set(message.x, 0, message.z);
    if (message.id === 'footprint' || message.id === 'footprints') {
      for (const x of [-0.12, 0.12]) b.box(x, 0.026, 0, 0.13, 0.02, 0.3, 0x859995);
    } else if (message.id === 'snowman') snow.snowman(b, 0, 0);
    else if (message.id === 'snowball') b.sphere(0, 1.5, 0, 0.14, 0.14, 0.14, 0xe3eeea);
    else if (message.id === 'kite') { const kite = b.box(0, 7, -3, 1, 1, 0.05, 0xc2985c); kite.rotation.z = 0.7; }
    else if (['wave', 'bow', 'clap', 'dance', 'greet', 'parrot'].includes(message.id)) b.label({ wave: '반가워요!', bow: '안녕하세요', clap: '짝짝짝', dance: '♪', greet: '좋은 여행 되세요', parrot: '앵무새: 반가워요!' }[message.id], 0, 2.8, 0, 2.8, 0.45);
    else { b.sphere(0, 0.7, 0, 0.08, 0.08, 0.08, 0xe7c488); }
    this.effects.push({ group, id: message.id, start: t, end: t + (message.id === 'snowman' ? 60 : message.id === 'footprint' ? 25 : 4) });
    while (this.effects.length > 48) { const old = this.effects.shift(); this.scene.remove(old.group); disposeTree(old.group); }
  }
  update(t, now) {
    let running = false;
    if (this.location.kind === 'station') {
      const board = stationBoard(this.location.stationId, now), phase = (now - board.arrival) / 1000;
      const ease = v => v * v * (3 - 2 * v);
      this.train.group.visible = phase < 88 || phase >= 275;
      this.train.group.position.x = phase < 60 ? 4.5 : phase < 88 ? 4.5 + ease((phase - 60) / 28) * 100 : -100 + ease(Math.max(0, (phase - 275) / 25)) * 104.5;
      this.train.setDoors(board.docked);
      const text = board.docked ? `${board.status} · 출발 ${countdown(board.remaining)}` : `도착까지 ${countdown(board.remaining)}`;
      this.signs.board.update(text); this.signs.clock.update(`KST ${clockText(now)}`);
      this.signs.tv.update(['오늘도 좋은 여행 되세요', '다음 열차는 5분 간격입니다', '목적지를 지나쳐도 괜찮아요'][Math.floor(now / 10_000) % 3]);
      this.environment.update(t, now, this.location.stationId);
      this.animate?.(t);
    } else if (this.location.kind === 'train') {
      const state = trainState(this.location.trainId, now);
      this.setScenery(state.progress > 0.65 ? state.nextStationId : state.stationId);
      this.scenic.position.z = state.stopped ? 0 : (state.progress * 1800) % 40;
      this.environment.update(t, now, state.stationId, state.nextStationId, state.progress);
      running = !state.stopped;
    } else {
      this.environment.update(t, now, 'deepsea');
      this.scenic.position.z = (t * 2) % 35; running = true;
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      if (t >= e.end) { this.scene.remove(e.group); disposeTree(e.group); this.effects.splice(i, 1); }
      else if (e.id === 'snowball') { const d = t - e.start; e.group.position.z -= 0.09; e.group.position.y = d * 2 - d * d; }
    }
    return running;
  }
  dispose() {
    this.environment.dispose();
    disposeTree(this.scene);
    this.effects = [];
  }
}
