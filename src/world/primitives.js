import * as THREE from 'three';
export function seeded(seed = 17) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function pixelTexture(color, pattern = 'stone') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(color); const random = seeded(color + pattern.length);
  ctx.fillStyle = `#${base.getHexString()}`; ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 600; i++) { const c = base.clone().multiplyScalar(0.72 + random() * 0.55); ctx.fillStyle = `#${c.getHexString()}`; ctx.fillRect(Math.floor(random() * 32) * 2, Math.floor(random() * 32) * 2, 2, 2); }
  if (pattern === 'brick') {
    ctx.strokeStyle = '#454139'; ctx.lineWidth = 2;
    for (let y = 0; y <= 64; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke(); for (let x = (y % 32 ? 16 : 0); x < 64; x += 32) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); } }
  } else if (pattern === 'wood') { ctx.fillStyle = '#453d2d55'; for (let y = 0; y < 64; y += 8) ctx.fillRect(0, y, 64, 1); }
  const texture = new THREE.CanvasTexture(canvas); texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false; texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export class Builder {
  constructor(root) { this.root = root; this.materials = new Map(); this.geometries = new Map(); }
  geometry(type) {
    if (!this.geometries.has(type)) this.geometries.set(type, type === 'box' ? new THREE.BoxGeometry(1, 1, 1) : type === 'sphere' ? new THREE.SphereGeometry(1, 8, 5) : type === 'cone' ? new THREE.ConeGeometry(1, 1, 7) : new THREE.CylinderGeometry(1, 1, 1, 8));
    return this.geometries.get(type);
  }
  material(color, pattern = '') {
    const key = `${color}:${pattern}`;
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshLambertMaterial(pattern ? { map: pixelTexture(color, pattern) } : { color, flatShading: true }));
    return this.materials.get(key);
  }
  mesh(type, x, y, z, w, h, d, color, pattern = '', parent = this.root) {
    const m = new THREE.Mesh(this.geometry(type), this.material(color, pattern)); m.position.set(x, y, z); m.scale.set(w, h, d); parent.add(m); return m;
  }
  box(x, y, z, w, h, d, color, pattern = '', parent = this.root) { return this.mesh('box', x, y, z, w, h, d, color, pattern, parent); }
  sphere(x, y, z, w, h, d, color, parent = this.root) { return this.mesh('sphere', x, y, z, w, h, d, color, '', parent); }
  cone(x, y, z, radius, h, color, parent = this.root) { return this.mesh('cone', x, y, z, radius, h, radius, color, '', parent); }
  cylinder(x, y, z, radius, h, color, parent = this.root) { return this.mesh('cylinder', x, y, z, radius, h, radius, color, '', parent); }
  label(text, x, y, z, width = 4, height = 0.6, parent = this.root, color = '#f1ddae', background = '#172526') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 80;
    const ctx = canvas.getContext('2d'); const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false; texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); mesh.position.set(x, y, z); parent.add(mesh);
    let previous;
    const update = value => { if (previous === value) return; previous = value; ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 80); ctx.fillStyle = color; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(value, 256, 40, 490); texture.needsUpdate = true; };
    update(text); return { mesh, update };
  }
  instances(type, transforms, color, pattern = '') {
    const mesh = new THREE.InstancedMesh(this.geometry(type), this.material(color, pattern), transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach((v, i) => { dummy.position.set(v.x, v.y, v.z); dummy.rotation.set(0, v.rotation || 0, 0); dummy.scale.set(v.w, v.h, v.d); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
    mesh.instanceMatrix.needsUpdate = true; this.root.add(mesh); return mesh;
  }
}
