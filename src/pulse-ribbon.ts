import * as THREE from 'three';
import type { Pulse } from './engine';

interface Sample { x: number; y: number; time: number; cool: boolean; jump: boolean }
/** Fixed capacity streaming ribbon; discontinuities never draw a beam through a portal. */
export class PulseRibbon {
  readonly geometry = new THREE.BufferGeometry();
  readonly material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .65, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  readonly mesh = new THREE.Mesh(this.geometry, this.material);
  private positions = new Float32Array(96 * 6 * 3);
  private colors = new Float32Array(96 * 6 * 4);
  private samples: Sample[] = [];
  private pulseId = -1; private lastTime = -1;
  private warm = new THREE.Color(0xf3bc77); private cool = new THREE.Color(0x9ad7ef);
  constructor() {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setDrawRange(0, 0); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
  }
  reset() { this.samples = []; this.pulseId = -1; this.lastTime = -1; this.geometry.setDrawRange(0, 0); }
  update(pulse: Pulse | undefined, elapsed: number, enabled = true) {
    this.mesh.visible = enabled;
    if (!enabled || !pulse) { this.reset(); return; }
    if (pulse.id !== this.pulseId || elapsed < this.lastTime - 1e-8 || elapsed - this.lastTime > .25) this.reset();
    this.pulseId = pulse.id; this.lastTime = elapsed;
    const previous = this.samples.at(-1);
    if (!previous || Math.hypot(previous.x - pulse.x, previous.y - pulse.y) > .015) {
      this.samples.push({ x: pulse.x, y: pulse.y, time: elapsed, cool: pulse.phase === 'cool', jump: !!previous && Math.hypot(previous.x - pulse.x, previous.y - pulse.y) > 1.1 });
    }
    this.samples = this.samples.filter(s => elapsed - s.time <= .65).slice(-97);
    let vertices = 0;
    for (let i = 1; i < this.samples.length; i++) {
      const a = this.samples[i - 1], b = this.samples[i]; if (b.jump) continue;
      const length = Math.hypot(b.x - a.x, b.y - a.y); if (length < 1e-6) continue;
      const alphaA = Math.max(0, 1 - (elapsed - a.time) / .65), alphaB = Math.max(0, 1 - (elapsed - b.time) / .65);
      const nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length;
      for (const [end, side] of [[0, -1], [0, 1], [1, -1], [1, -1], [0, 1], [1, 1]]) {
        const point = end ? b : a, alpha = end ? alphaB : alphaA, width = .012 + .035 * alpha;
        this.positions.set([point.x - 6 + nx * width * side, .39, point.y - 4 + ny * width * side], vertices * 3);
        const color = point.cool ? this.cool : this.warm;
        this.colors.set([color.r, color.g, color.b, alpha * alpha], vertices * 4); vertices++;
      }
    }
    this.geometry.setDrawRange(0, vertices);
    this.geometry.attributes.position.needsUpdate = this.geometry.attributes.color.needsUpdate = true;
  }
  dispose() { this.geometry.dispose(); this.material.dispose(); }
}
