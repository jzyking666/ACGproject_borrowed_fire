import type { Cell, Level, Mirror, Phase } from './levels';
export interface Pulse { id: number; x: number; y: number; dx: number; dy: number; wait: number; last: string; age: number; phase?: Phase }
export interface ReceiverState { charge: number; hits: number; lastPulse: number }
export interface Snapshot {
  version: 1; level: number; player: Cell; facing: Cell; mirrors: Mirror[]; carried: Mirror | null;
  pulses: Pulse[]; receivers: Record<string, ReceiverState>; sourceOn: boolean;
  elapsed: number; hits: number; moves: number; nextPulse: number; spawnTimer: number;
}
export type GameEvent = { type: 'emit' | 'reflect' | 'charge' | 'hit' | 'pickup' | 'drop' | 'rotate' | 'switch' | 'win' | 'lost' | 'teleport' | 'phase'; x?: number; y?: number };
export const SPEED = 4.2;
const dist = (a: Cell, b: Cell) => Math.hypot(a.x - b.x, a.y - b.y);
export type TracePoint = Cell & { jump?: boolean };
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export class Simulation {
  player: Cell; facing: Cell = { x: 0, y: -1 }; mirrors: Mirror[]; carried: Mirror | null = null;
  pulses: Pulse[] = []; receivers: Record<string, ReceiverState> = {};
  sourceOn = true; elapsed = 0; hits = 0; moves = 0; won = false;
  nextPulse = 1; spawnTimer = 1.4; invulnerable = 0; events: GameEvent[] = [];
  constructor(public level: Level) {
    this.player = { ...level.spawn }; this.mirrors = structuredClone(level.mirrors);
    for (const r of level.receivers) this.receivers[r.id] = { charge: 0, hits: 0, lastPulse: -1 };
  }
  drainEvents() { const e = this.events; this.events = []; return e; }
  plateActive(id: string) {
    const plate = this.level.plates?.find(p => p.id === id);
    return !!plate && (dist(this.player, plate) < .42 || this.mirrors.some(m => same(m, plate)));
  }
  private blockedPulse(x: number, y: number) {
    return this.level.walls.some(w => Math.abs(x - w.x) < .48 && Math.abs(y - w.y) < .48)
      || !!this.level.gates?.some(g => !this.plateActive(g.plate) && Math.abs(x - g.x) < .43 && Math.abs(y - g.y) < .43);
  }
  private destination(c: Cell) {
    for (const pair of this.level.portals ?? []) {
      if (same(c, pair.a)) return pair.b;
      if (same(c, pair.b)) return pair.a;
    }
  }
  get powered() { return this.level.receivers.every(r => this.receivers[r.id].charge > 0); }
  get stable() { return this.level.receivers.every(r => this.receivers[r.id].charge > 0 && this.receivers[r.id].hits >= this.level.repeats); }
  get exitOpen() { return this.stable && (!this.level.offGrid || !this.sourceOn); }
  get targetCell(): Cell { return { x: Math.round(this.player.x + this.facing.x * 1.05), y: Math.round(this.player.y + this.facing.y * 1.05) }; }
  get nearest(): Mirror | 'source' | undefined {
    const facing = (m: Mirror) => (m.x - this.player.x) * this.facing.x + (m.y - this.player.y) * this.facing.y;
    const near = this.mirrors.filter(m => !m.fixed && dist(this.player, m) < 1.65).sort((a, b) =>
      Math.round((dist(this.player, a) - dist(this.player, b)) * 1000)
      || Math.round((facing(b) - facing(a)) * 1000) || a.id.localeCompare(b.id))[0];
    if (near) return near;
    if (dist(this.player, this.level.source) < 1.5) return 'source';
    return undefined;
  }
  validCell(c: Cell) {
    return c.x >= 1 && c.x < this.level.width - 1 && c.y >= 1 && c.y < this.level.height - 1
      && !this.level.walls.some(w => w.x === c.x && w.y === c.y)
      && !this.mirrors.some(m => m.x === c.x && m.y === c.y)
      && !this.level.receivers.some(r => r.x === c.x && r.y === c.y)
      && !(this.level.source.x === c.x && this.level.source.y === c.y)
      && !(this.level.exit.x === c.x && this.level.exit.y === c.y)
      && !(this.level.delay?.x === c.x && this.level.delay?.y === c.y)
      && !this.level.portals?.some(p => same(c, p.a) || same(c, p.b))
      && !this.level.inverters?.some(p => same(c, p))
      && !this.level.gates?.some(p => same(c, p))
      && Math.hypot(Math.max(Math.abs(this.player.x - c.x) - .32, 0), Math.max(Math.abs(this.player.y - c.y) - .32, 0)) >= .25;
  }
  interact() {
    if (this.won) return;
    if (this.carried) {
      const c = this.targetCell;
      if (!this.validCell(c)) return;
      this.mirrors.push({ ...this.carried, ...c }); this.carried = null; this.moves++;
      this.events.push({ type: 'drop', ...c }); return;
    }
    const near = this.nearest;
    if (near === 'source') {
      this.sourceOn = !this.sourceOn; this.spawnTimer = .25;
      this.events.push({ type: 'switch', ...this.level.source });
    } else if (near) {
      this.carried = { ...near }; this.mirrors = this.mirrors.filter(m => m.id !== near.id);
      this.moves++; this.events.push({ type: 'pickup', ...near });
    }
  }
  rotate() {
    if (this.won) return;
    const mirror = this.carried ?? (typeof this.nearest === 'object' ? this.nearest : undefined);
    if (mirror) { mirror.slash = !mirror.slash; this.moves++; this.events.push({ type: 'rotate', ...mirror }); }
  }
  collides(x: number, y: number) {
    const rad = .24;
    if (x < .65 || y < .65 || x > this.level.width - 1.65 || y > this.level.height - 1.65) return true;
    const solids = [...this.level.walls.map(w => ({ ...w, half: .47 })), ...this.mirrors.map(m => ({ ...m, half: .32 }))];
    return solids.some(b => {
      const dx = Math.max(Math.abs(x - b.x) - b.half, 0), dy = Math.max(Math.abs(y - b.y) - b.half, 0);
      return dx * dx + dy * dy < rad * rad;
    });
  }
  move(dx: number, dy: number, dt: number, precision = false) {
    const length = Math.hypot(dx, dy); if (!length || this.won) return;
    dx /= Math.max(1, length); dy /= Math.max(1, length);
    if (Math.abs(dx) > Math.abs(dy)) this.facing = { x: Math.sign(dx), y: 0 };
    else this.facing = { x: 0, y: Math.sign(dy) };
    const speed = (precision ? 1.5 : this.carried ? 2.5 : 3.2) * dt;
    const steps = Math.max(1, Math.ceil(speed / .08));
    for (let i = 0; i < steps; i++) {
      const x = this.player.x + dx * speed / steps, y = this.player.y + dy * speed / steps;
      if (!this.collides(x, this.player.y)) this.player.x = x;
      if (!this.collides(this.player.x, y)) this.player.y = y;
    }
  }
  step(dt: number, hurt = true) {
    if (this.won) return;
    // Fixed small substeps prevent fast pulses from tunnelling through mirror cells.
    let remaining = Math.min(dt, .2);
    while (remaining > 1e-8 && !this.won) { const h = Math.min(remaining, 1 / 120); this.tick(h, hurt); remaining -= h; }
  }
  private tick(dt: number, hurt: boolean) {
    this.elapsed += dt; this.invulnerable = Math.max(0, this.invulnerable - dt);
    for (const s of Object.values(this.receivers)) {
      s.charge = Math.max(0, s.charge - dt);
      if (s.charge === 0) { s.hits = 0; s.lastPulse = -1; }
    }
    this.spawnTimer -= dt;
    if (this.sourceOn && this.spawnTimer <= 0 && this.pulses.length === 0) {
      this.pulses.push({ id: this.nextPulse++, x: this.level.source.x, y: this.level.source.y, dx: this.level.source.dx, dy: this.level.source.dy, wait: 0, last: '', age: 0, phase: 'warm' });
      this.spawnTimer = 2; this.events.push({ type: 'emit', ...this.level.source });
    }
    const dead = new Set<number>();
    for (const p of this.pulses) {
      p.age += dt;
      if (p.wait > 0) { p.wait -= dt; continue; }
      p.x += p.dx * SPEED * dt; p.y += p.dy * SPEED * dt;
      if (p.x < .35 || p.y < .35 || p.x > this.level.width - 1.35 || p.y > this.level.height - 1.35
        || this.blockedPulse(p.x, p.y)) {
        dead.add(p.id); this.events.push({ type: 'lost', x: p.x, y: p.y }); continue;
      }
      const cx = Math.round(p.x), cy = Math.round(p.y), key = `${cx},${cy}`;
      // Trigger exactly at a tile centre, preserving distance across reflection.
      const along = p.dx ? p.x - cx : p.y - cy;
      if (Math.abs(along) < SPEED * dt * .55 && p.last !== key) {
        p.last = key;
        const destination = this.destination({ x: cx, y: cy });
        if (destination) {
          const overshoot = (p.x - cx) * p.dx + (p.y - cy) * p.dy;
          p.x = destination.x + p.dx * overshoot; p.y = destination.y + p.dy * overshoot;
          p.last = `${destination.x},${destination.y}`;
          this.events.push({ type: 'teleport', ...destination });
        } else {
          if (this.level.inverters?.some(c => c.x === cx && c.y === cy)) {
            p.phase = (p.phase ?? 'warm') === 'warm' ? 'cool' : 'warm';
            this.events.push({ type: 'phase', x: cx, y: cy });
          }
          const mirror = this.mirrors.find(m => m.x === cx && m.y === cy);
          if (mirror) {
            const overshoot = (p.x - cx) * p.dx + (p.y - cy) * p.dy;
            const dx = mirror.slash ? -p.dy : p.dy, dy = mirror.slash ? -p.dx : p.dx;
            p.dx = dx; p.dy = dy; p.x = cx + dx * overshoot; p.y = cy + dy * overshoot;
            this.events.push({ type: 'reflect', x: cx, y: cy });
          }
          for (const r of this.level.receivers) if (r.x === cx && r.y === cy && (!r.phase || r.phase === (p.phase ?? 'warm'))) {
            const s = this.receivers[r.id];
            s.hits = s.lastPulse === p.id ? Math.min(s.hits + 1, 99) : 1;
            s.lastPulse = p.id; s.charge = r.ttl;
            this.events.push({ type: 'charge', x: cx, y: cy });
          }
          if (this.level.delay?.x === cx && this.level.delay.y === cy) {
            p.x = cx; p.y = cy; p.wait = 1.2;
          }
        }
      }
      if (hurt && this.invulnerable === 0 && dist(this.player, p) < .38) {
        this.hits++; this.invulnerable = 2.2; this.player = { ...this.level.spawn };
        // Mirrors survive a hit, so a failure preserves the player's construction.
        dead.add(p.id); this.events.push({ type: 'hit' });
      }
    }
    this.pulses = this.pulses.filter(p => !dead.has(p.id));
    if (this.exitOpen && dist(this.player, this.level.exit) < .6 && !this.carried) {
      this.won = true; this.events.push({ type: 'win' });
    }
  }
  trace(maxSteps = 140): TracePoint[] {
    let x = this.level.source.x, y = this.level.source.y, dx = this.level.source.dx, dy = this.level.source.dy;
    const points: TracePoint[] = [{ x, y }], visited = new Set<string>();
    for (let i = 0; i < maxSteps; i++) {
      x += dx; y += dy; points.push({ x, y });
      if (x <= 0 || y <= 0 || x >= this.level.width - 1 || y >= this.level.height - 1 || this.blockedPulse(x, y)) break;
      const key = `${x},${y},${dx},${dy}`; if (visited.has(key)) break; visited.add(key);
      const destination = this.destination({ x, y });
      if (destination) { x = destination.x; y = destination.y; points.push({ x, y, jump: true }); continue; }
      const mirror = this.mirrors.find(m => m.x === x && m.y === y);
      if (mirror) [dx, dy] = mirror.slash ? [-dy, -dx] : [dy, dx];
    }
    return points;
  }
  snapshot(): Snapshot {
    return structuredClone({ version: 1, level: this.level.id, player: this.player, facing: this.facing, mirrors: this.mirrors, carried: this.carried,
      pulses: this.pulses, receivers: this.receivers, sourceOn: this.sourceOn, elapsed: this.elapsed, hits: this.hits, moves: this.moves,
      nextPulse: this.nextPulse, spawnTimer: this.spawnTimer });
  }
  restore(s: Snapshot) {
    if (s.version !== 1 || s.level !== this.level.id) throw new Error('存档版本或关卡不匹配');
    const { level: _level, version: _version, ...state } = structuredClone(s);
    Object.assign(this, state); this.won = false; this.invulnerable = 1.5;
  }
}
