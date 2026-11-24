import { Simulation, type OpticalRoute } from './engine';
import type { Cell, Level, Mirror, Phase } from './levels';

export interface LensReading {
  route: OpticalRoute;
  /** Colors arriving at each receiver, whether or not its filter accepts them. */
  arrivals: Record<string, Phase[]>;
}
export interface LensTrial {
  reading: LensReading;
  turn?: { at: Cell; before: Cell; after: Cell };
}
export interface OpticalStroke { phase: Phase; points: Cell[] }

/** The outgoing phase at one point colors the edge to the next. Each jump lifts the pen. */
export function opticalStrokes(route: OpticalRoute): OpticalStroke[] {
  const strokes: OpticalStroke[] = [];
  let run: OpticalStroke | undefined;
  for (let i = 1; i < route.points.length; i++) {
    const from = route.points[i - 1], to = route.points[i];
    if (to.jump) { run = undefined; continue; }
    if (!run || run.phase !== from.phase) {
      run = { phase: from.phase, points: [from] };
      strokes.push(run);
    }
    run.points.push(to);
  }
  return strokes;
}

function read(sim: Simulation): LensReading {
  // A repeated in-bounds cell, incident direction and phase closes the trace.
  const route = sim.opticalRoute('warm', 8 * (sim.level.width - 2) * (sim.level.height - 2) + 1);
  const arrivals: Record<string, Phase[]> = {};
  for (const r of sim.level.receivers) {
    const colors = new Set<Phase>();
    for (const point of route.points.slice(1)) {
      if (!point.jump && point.x === r.x && point.y === r.y) colors.add(point.phase);
    }
    arrivals[r.id] = [...colors];
  }
  return { route, arrivals };
}

/** One frozen workbench. Every alternative starts at the same layout and gate states. */
export class LensPreview {
  readonly level: Level;
  readonly mirrors: Mirror[];
  readonly choices: Mirror[];
  readonly gates: boolean[];
  readonly plates: boolean[];
  readonly original: LensReading;
  readonly carrying: boolean;
  readonly nearestIndex: number;
  private readonly copy: Simulation;
  private readonly cache = new Map<number, LensTrial>();

  constructor(sim: Simulation) {
    this.level = sim.level;
    this.copy = new Simulation(sim.level);
    this.copy.restore(sim.snapshot());
    this.mirrors = structuredClone(this.copy.mirrors);
    this.choices = this.mirrors.filter(m => !m.fixed).sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
    this.plates = (this.level.plates ?? []).map(p => this.copy.plateActive(p.id));
    this.gates = (this.level.gates ?? []).map(g => this.copy.gateOpen(g));
    this.original = read(this.copy);
    this.carrying = sim.carried !== null;
    const nearest = sim.nearest;
    this.nearestIndex = Math.max(0, this.choices.findIndex(m => typeof nearest === 'object' && m.id === nearest.id));
  }

  turn(index: number): LensTrial | undefined {
    const target = this.choices[index];
    if (!target) return;
    const cached = this.cache.get(index);
    if (cached) return cached;
    const mirror = this.copy.mirrors.find(m => m.id === target.id)!;
    mirror.slash = !target.slash;
    let reading: LensReading;
    try { reading = read(this.copy); } finally { mirror.slash = target.slash; }
    const trial: LensTrial = { reading };
    const a = this.original.route.points, b = reading.route.points;
    for (let i = 1; i < Math.min(a.length, b.length); i++) {
      if (a[i].x === b[i].x && a[i].y === b[i].y) continue;
      const at = a[i - 1];
      trial.turn = { at: { x: at.x, y: at.y }, before: { x: a[i].x - at.x, y: a[i].y - at.y }, after: { x: b[i].x - at.x, y: b[i].y - at.y } };
      break;
    }
    this.cache.set(index, trial);
    return trial;
  }
}
