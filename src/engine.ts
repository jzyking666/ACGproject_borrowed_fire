import { echoPosition, ECHO_SECONDS, type EchoTrack, type EchoCapture } from './echo';
import type { Cell, Level, Mirror, Phase, OpticalPort } from './levels';
import { reflectedDirection, flipPhase } from './optics';
export interface Pulse { id: number; x: number; y: number; dx: number; dy: number; wait: number; last: string; age: number; phase?: Phase }
export interface ReceiverState { charge: number; hits: number; lastPulse: number }
export interface RunStats { emitted: number; reflected: string[]; rejected: number; lost: number; peakEchoes: number; stableSeconds: number }
export const freshStats = (): RunStats => ({ emitted: 0, reflected: [], rejected: 0, lost: 0, peakEchoes: 0, stableSeconds: 0 });
export interface Snapshot {
  version: 1; level: number; player: Cell; facing: Cell; mirrors: Mirror[]; carried: Mirror | null;
  pulses: Pulse[]; receivers: Record<string, ReceiverState>; sourceOn: boolean;
  echoes?: EchoTrack[]; recording?: EchoCapture | null;
  stats?: RunStats;
  elapsed: number; hits: number; moves: number; nextPulse: number; spawnTimer: number;
}
type LossReason = 'edge' | 'wall' | 'gate';
export type GameEvent = { type: 'emit' | 'reflect' | 'charge' | 'hit' | 'pickup' | 'drop' | 'rotate' | 'switch' | 'win' | 'lost' | 'teleport' | 'phase' | 'record' | 'echo' | 'reject' | 'expire'; x?: number; y?: number; phase?: Phase; prism?: boolean; reason?: LossReason; receiverId?: string };
export const SPEED = 4.2;
const dist = (a: Cell, b: Cell) => Math.hypot(a.x - b.x, a.y - b.y);
export type TracePoint = Cell & { jump?: boolean };
export interface OpticalRoute { points: (TracePoint & { phase: Phase })[]; end: 'loop' | 'wall' | 'gate' | 'edge' | 'limit' }
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export class Simulation {
  private testMask = -1;
  private readings: { route: OpticalRoute; passes: boolean }[] = [];
  commissionReadings() {
    if (!this.level.commission) return [];
    // Bench-mounted mirrors keep their positions and array order throughout a shift.
    const mask = this.mirrors.reduce((bits, m, i) => bits | (Number(m.slash) << i), 0);
    if (this.testMask !== mask) {
      this.readings = this.level.commission.map(run => {
        const route = this.opticalRoute(run.phase, 800, run.inlet), end = route.points.at(-1)!;
        return { route, passes: route.end === 'edge' && same(end, run.outlet) && end.phase === run.delivery };
      });
      this.testMask = mask;
    }
    return this.readings;
  }
  player: Cell; facing: Cell = { x: 0, y: -1 }; mirrors: Mirror[]; carried: Mirror | null = null;
  pulses: Pulse[] = []; receivers: Record<string, ReceiverState> = {};
  echoes: EchoTrack[] = []; recording: EchoCapture | null = null;
  get echoPositions() { return this.echoes.map(echoPosition); }
  get echoLimit() { return this.level.echoLimit ?? 2; }
  stats = freshStats();
  /** Offset one playback without altering the recorded path or other tracks. */
  shiftEcho(index: number, seconds: number) {
    const echo = this.echoes[index];
    if (this.won || this.recording || !echo || !Number.isFinite(seconds) || seconds === 0) return;
    echo.time = ((echo.time + seconds) % echo.duration + echo.duration) % echo.duration;
    this.moves++;
  }
  synchronizeEchoes() {
    if (this.won || this.recording || !this.echoes.length) return;
    this.echoes.forEach(e => e.time = 0);
    if (this.sourceOn && !this.pulses.length) this.spawnTimer = 0;
    this.moves++;
  }
  retimeEcho(index: number, duration: number) {
    const echo = this.echoes[index];
    if (this.won || this.recording || !echo || !Number.isFinite(duration) || duration < .5 || duration > ECHO_SECONDS || Math.abs(duration - echo.duration) < 1e-9) return;
    const ratio = duration / echo.duration;
    echo.points.forEach(p => p.t *= ratio); echo.time *= ratio; echo.duration = duration;
    this.moves++;
  }
  eraseEcho(index: number) {
    if (this.won || this.recording || !Number.isInteger(index) || index < 0 || index >= this.echoes.length) return;
    this.echoes.splice(index, 1); this.moves++;
  }
  toggleRecording() {
    if (this.won || !this.level.echoLimit) return;
    if (this.recording) {
      const capture = this.recording, duration = Math.max(.5, capture.elapsed);
      capture.points.push({ ...this.player, t: duration });
      this.echoes.push({ points: capture.points, duration, time: 0 });
      this.stats.peakEchoes = Math.max(this.stats.peakEchoes, this.echoes.length);
      this.recording = null; this.moves++; this.events.push({ type: 'echo' });
    } else if (this.echoes.length < this.echoLimit) {
      this.recording = { points: [{ ...this.player, t: 0 }], elapsed: 0 };
      this.moves++; this.events.push({ type: 'record' });
    }
  }
  removeEcho() {
    if (this.won) return;
    if (this.recording) { this.recording = null; this.moves++; }
    else if (this.echoes.pop()) this.moves++;
  }
  sourceOn = true; elapsed = 0; hits = 0; moves = 0; won = false;
  nextPulse = 1; spawnTimer = 1.4; invulnerable = 0; events: GameEvent[] = [];
  constructor(public level: Level) {
    this.player = { ...level.spawn }; this.mirrors = structuredClone(level.mirrors);
    for (const r of level.receivers) this.receivers[r.id] = { charge: 0, hits: 0, lastPulse: -1 };
  }
  drainEvents() { const e = this.events; this.events = []; return e; }
  plateActive(id: string) {
    const plate = this.level.plates?.find(p => p.id === id);
    return !!plate && (this.echoPositions.some(e => dist(e, plate) < .42) || !plate.echoOnly && (dist(this.player, plate) < .42 || this.mirrors.some(m => same(m, plate))));
  }
  gateOpen(gate: NonNullable<Level['gates']>[number]) {
    const active = (gate.requires ?? [gate.plate]).every(id => this.plateActive(id));
    const mechanical = gate.inverted ? !active : active;
    return mechanical || !!(gate.poweredBy && this.receivers[gate.poweredBy]?.charge > 0);
  }
  private pulseObstacle(x: number, y: number): LossReason | undefined {
    if (x < .35 || y < .35 || x > this.level.width - 1.35 || y > this.level.height - 1.35) return 'edge';
    if (this.level.walls.some(w => Math.abs(x - w.x) < .48 && Math.abs(y - w.y) < .48)) return 'wall';
    if (this.level.gates?.some(g => Math.abs(x - g.x) < .43 && Math.abs(y - g.y) < .43 && !this.gateOpen(g))) return 'gate';
  }
  private destination(c: Cell) {
    for (const pair of this.level.portals ?? []) {
      if (same(c, pair.a)) return pair.b;
      if (same(c, pair.b)) return pair.a;
    }
  }
  get powered() { return this.level.receivers.every(r => this.receivers[r.id].charge > 0); }
  get stable() { return this.level.receivers.every(r => this.receivers[r.id].charge > 0 && this.receivers[r.id].hits >= this.level.repeats); }
  get exitOpen() { return this.stable && (!this.level.offGrid || !this.sourceOn) && (!this.level.commission || this.commissionReadings().every(t => t.passes)); }
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
    } else if (near && this.level.commission) {
      this.rotate();
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
    for (const echo of this.echoes) echo.time = (echo.time + dt) % echo.duration;
    if (this.recording) {
      this.recording.elapsed = Math.min(ECHO_SECONDS, this.recording.elapsed + dt);
      const points = this.recording.points;
      if (this.recording.elapsed - points[points.length - 1].t >= 1 / 30 - 1e-8) points.push({ ...this.player, t: this.recording.elapsed });
      if (this.recording.elapsed >= ECHO_SECONDS - 1e-8) this.toggleRecording();
    }
    this.elapsed += dt; this.invulnerable = Math.max(0, this.invulnerable - dt);
    for (const [id, s] of Object.entries(this.receivers)) {
      const previous = s.charge;
      s.charge = Math.max(0, s.charge - dt);
      if (previous > 0 && s.charge === 0) this.events.push({ type: 'expire', ...this.level.receivers.find(r => r.id === id)!, receiverId: id });
      if (s.charge === 0) { s.hits = 0; s.lastPulse = -1; }
    }
    this.spawnTimer -= dt;
    if (this.sourceOn && this.spawnTimer <= 0 && this.pulses.length === 0) {
      this.pulses.push({ id: this.nextPulse++, x: this.level.source.x, y: this.level.source.y, dx: this.level.source.dx, dy: this.level.source.dy, wait: 0, last: '', age: 0, phase: 'warm' });
      this.spawnTimer = 2; this.events.push({ type: 'emit', ...this.level.source });
      this.stats.emitted++;
    }
    const dead = new Set<number>();
    for (const p of this.pulses) {
      p.age += dt;
      const held = Math.min(Math.max(p.wait, 0), dt);
      p.wait = Math.max(0, p.wait - held);
      const travel = SPEED * (dt - held);
      if (!travel) continue;
      p.x += p.dx * travel; p.y += p.dy * travel;
      const obstacle = this.pulseObstacle(p.x, p.y);
      if (obstacle) {
        dead.add(p.id); this.stats.lost++; this.events.push({ type: 'lost', x: p.x, y: p.y, reason: obstacle }); continue;
      }
      const cx = Math.round(p.x), cy = Math.round(p.y), key = `${cx},${cy}`;
      // A substep is shorter than a cell. Its signed distance beyond the nearest centre
      // lies in [0, travel] exactly when the segment crosses that centre in this direction.
      const overshoot = (p.x - cx) * p.dx + (p.y - cy) * p.dy;
      if (overshoot >= 0 && overshoot <= travel + 1e-10 && p.last !== key) {
        p.last = key;
        const destination = this.destination({ x: cx, y: cy });
        if (destination) {
          p.x = destination.x + p.dx * overshoot; p.y = destination.y + p.dy * overshoot;
          p.last = `${destination.x},${destination.y}`;
          this.events.push({ type: 'teleport', ...destination });
        } else {
          if (this.level.inverters?.some(c => c.x === cx && c.y === cy)) {
            p.phase = flipPhase(p.phase ?? 'warm');
            this.events.push({ type: 'phase', x: cx, y: cy });
          }
          const mirror = this.mirrors.find(m => m.x === cx && m.y === cy);
          if (mirror) {
            if (!this.stats.reflected.includes(mirror.id)) this.stats.reflected.push(mirror.id);
            const { x: dx, y: dy } = reflectedDirection(mirror, { x: p.dx, y: p.dy }, p.phase ?? 'warm');
            p.dx = dx; p.dy = dy; p.x = cx + dx * overshoot; p.y = cy + dy * overshoot;
            this.events.push({ type: 'reflect', x: cx, y: cy, phase: p.phase ?? 'warm', prism: mirror.kind === 'prism' });
          }
          for (const r of this.level.receivers) {
            if (r.x !== cx || r.y !== cy) continue;
            if (r.phase && r.phase !== (p.phase ?? 'warm')) {
              this.stats.rejected++; this.events.push({ type: 'reject', x: cx, y: cy, receiverId: r.id, phase: p.phase ?? 'warm' });
              continue;
            }
            const s = this.receivers[r.id];
            s.hits = s.lastPulse === p.id ? Math.min(s.hits + 1, 99) : 1;
            s.lastPulse = p.id; s.charge = r.ttl;
            this.events.push({ type: 'charge', x: cx, y: cy, receiverId: r.id });
          }
          if (this.level.delay?.x === cx && this.level.delay.y === cy) {
            p.x = cx; p.y = cy; p.wait = 1.2 - overshoot / SPEED;
          }
        }
      }
      if (hurt && this.invulnerable === 0 && dist(this.player, p) < .38) {
        this.hits++; this.invulnerable = 2.2; this.events.push({ type: 'hit', ...this.player }); this.player = { ...this.level.spawn };
        // Mirrors survive a hit, so a failure preserves the player's construction.
        dead.add(p.id);
      }
    }
    this.pulses = this.pulses.filter(p => !dead.has(p.id));
    this.stats.stableSeconds = this.stable ? this.stats.stableSeconds + dt : 0;
    if (this.exitOpen && dist(this.player, this.level.exit) < .6 && !this.carried) {
      this.won = true; this.events.push({ type: 'win' });
    }
  }
  trace(maxSteps = 140): TracePoint[] {
    return this.opticalRoute('warm', maxSteps).points.map(({ phase: _phase, ...point }) => point);
  }
  opticalRoute(initialPhase: Phase = 'warm', maxSteps = 140, inlet: OpticalPort = this.level.source): OpticalRoute {
    let { x, y, dx, dy } = inlet;
    let phase = initialPhase;
    const points: OpticalRoute['points'] = [{ x, y, phase }], visited = new Set<string>();
    for (let i = 0; i < maxSteps; i++) {
      x += dx; y += dy; points.push({ x, y, phase });
      if (x <= 0 || y <= 0 || x >= this.level.width - 1 || y >= this.level.height - 1) return { points, end: 'edge' };
      if (this.level.walls.some(w => same(w, { x, y }))) return { points, end: 'wall' };
      if (this.level.gates?.some(g => same(g, { x, y }) && !this.gateOpen(g))) return { points, end: 'gate' };
      const key = `${x},${y},${dx},${dy},${phase}`; if (visited.has(key)) return { points, end: 'loop' }; visited.add(key);
      const destination = this.destination({ x, y });
      if (destination) { x = destination.x; y = destination.y; points.push({ x, y, phase, jump: true }); continue; }
      if (this.level.inverters?.some(c => same(c, { x, y }))) { phase = flipPhase(phase); points[points.length - 1].phase = phase; }
      const mirror = this.mirrors.find(m => m.x === x && m.y === y);
      if (mirror) { const direction = reflectedDirection(mirror, { x: dx, y: dy }, phase); dx = direction.x; dy = direction.y; }
    }
    return { points, end: 'limit' };
  }
  snapshot(): Snapshot {
    return structuredClone({ version: 1, level: this.level.id, player: this.player, facing: this.facing, mirrors: this.mirrors, carried: this.carried,
      pulses: this.pulses, receivers: this.receivers, sourceOn: this.sourceOn, elapsed: this.elapsed, hits: this.hits, moves: this.moves,
      echoes: this.echoes, recording: this.recording, stats: this.stats, nextPulse: this.nextPulse, spawnTimer: this.spawnTimer });
  }
  restore(s: Snapshot) {
    this.testMask = -1;
    if (s.version !== 1 || s.level !== this.level.id) throw new Error('存档版本或关卡不匹配');
    const state = structuredClone(s);
    this.player = state.player; this.facing = state.facing; this.mirrors = state.mirrors; this.carried = state.carried;
    this.pulses = state.pulses; this.receivers = state.receivers; this.sourceOn = state.sourceOn;
    this.elapsed = state.elapsed; this.hits = state.hits; this.moves = state.moves;
    this.nextPulse = state.nextPulse; this.spawnTimer = state.spawnTimer;
    this.echoes = state.echoes ?? []; this.recording = state.recording ?? null;
    this.stats = state.stats ?? { ...freshStats(), emitted: Math.max(0, s.nextPulse - 1) };
    this.won = false; this.invulnerable = 1.5;
    // Room 05 gained two maintenance columns. Preserve old progress and relocate
    // only equipment that now intersects one of those new columns.
    let repaired = false;
    if (this.level.id === 4) {
      for (const mirror of this.mirrors) {
        if (!this.level.walls.some(w => same(w, mirror))) continue;
        const candidates: Cell[] = [];
        for (let y = 1; y < this.level.height - 1; y++) for (let x = 1; x < this.level.width - 1; x++) if (this.validCell({ x, y })) candidates.push({ x, y });
        candidates.sort((a, b) => dist(a, mirror) - dist(b, mirror) || a.y - b.y || a.x - b.x);
        if (candidates[0]) { Object.assign(mirror, candidates[0]); repaired = true; }
      }
      if (this.collides(this.player.x, this.player.y)) { this.player = { ...this.level.spawn }; repaired = true; }
      if (repaired) { this.pulses = []; this.spawnTimer = 1.4; for (const r of Object.values(this.receivers)) { r.charge = 0; r.hits = 0; r.lastPulse = -1; } this.stats.stableSeconds = 0; }
    }
    return repaired;
  }
}
