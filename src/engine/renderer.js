import * as THREE from 'three';
export class Engine {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.camera = new THREE.PerspectiveCamera(73, 1, 0.08, 240);
    this.scale = 2;
    this.resize = () => {
      this.renderer.setSize(Math.max(1, Math.floor(innerWidth / this.scale)), Math.max(1, Math.floor(innerHeight / this.scale)), false);
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.resize);
    this.resize();
  }
  setScale(scale) { if ([1, 2, 3].includes(scale)) { this.scale = scale; this.resize(); } }
  render(scene) { this.renderer.render(scene, this.camera); }
  dispose() { window.removeEventListener('resize', this.resize); this.renderer.dispose(); }
}
export function disposeTree(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) { materials.add(m); for (const value of Object.values(m)) if (value?.isTexture) textures.add(value); }
  });
  for (const t of textures) t.dispose();
  for (const m of materials) m.dispose();
  for (const g of geometries) g.dispose();
  root.clear();
}
