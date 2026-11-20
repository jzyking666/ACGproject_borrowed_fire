/** Decaying camera trauma; bounded deterministic motion avoids frame-rate-dependent random jitter. */
export class CameraImpulse {
  trauma = 0;
  time = 0;
  add(strength: number) { this.trauma = Math.min(1, this.trauma + strength); }
  sample(dt: number, reduced = false) {
    this.time += dt;
    this.trauma = reduced ? 0 : Math.max(0, this.trauma - dt * 1.8);
    if (this.trauma === 0) return { x: 0, y: 0 };
    const amplitude = this.trauma * this.trauma * 11;
    return { x: Math.sin(this.time * 71) * amplitude, y: Math.cos(this.time * 53 + .4) * amplitude * .65 };
  }
}
