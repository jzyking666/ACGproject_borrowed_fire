import { Simulation, type Snapshot, type GameEvent } from './engine';
import type { Cell, Level } from './levels';
export interface ForecastFrame { time: number; state: Snapshot; powered: boolean; stable: boolean; gates: boolean[] }
export interface ForecastEvent { time: number; event: GameEvent }
export interface Forecast { frames: ForecastFrame[]; events: ForecastEvent[]; firstStable?: number; lost: number; hits: number }
export interface ForecastFinding { time: number; frame: number; cell: Cell; label: string }

/** A deterministic, isolated run: the operator stays still; all pulses, echoes and timers continue. */
export function forecast(live: Simulation, seconds = 12): Forecast {
  const duration = Number.isFinite(seconds) ? Math.max(.25, Math.min(20, seconds)) : 12;
  const copy = new Simulation(live.level); copy.restore(live.snapshot()); copy.invulnerable = live.invulnerable;
  const result: Forecast = { frames: [], events: [], lost: 0, hits: 0 };
  if (copy.stable) result.firstStable = 0;
  let time = 0;
  const sample = () => result.frames.push({ time, state: copy.snapshot(), powered: copy.powered, stable: copy.stable, gates: (copy.level.gates ?? []).map(g => copy.gateOpen(g)) });
  sample();
  for (let step = 1; step <= Math.ceil(duration * 120); step++) {
    copy.step(1 / 120); time = step / 120;
    for (const event of copy.drainEvents()) {
      result.events.push({ time, event });
      if (event.type === 'lost') result.lost++;
      if (event.type === 'hit') result.hits++;
    }
    if (copy.stable && result.firstStable === undefined) result.firstStable = time;
    if (step % 15 === 0 || copy.won || step === Math.ceil(duration * 120)) sample();
    if (copy.won) break;
  }
  return result;
}

export function circuitReading(event: GameEvent, level: Level): { cell: Cell; label: string } | undefined {
  if (event.x === undefined || event.y === undefined) return;
  const cell = { x: Math.round(event.x), y: Math.round(event.y) };
  const receiver = level.receivers.find(r => r.id === event.receiverId);
  let label: string;
  if (event.type === 'reject' && receiver) {
    label = `${receiver.name}拒收${event.phase === 'cool' ? '冷' : '暖'}光`;
  } else if (event.type === 'expire' && receiver) {
    label = `${receiver.name} · 供电到期`;
  } else if (event.type === 'hit') {
    label = `值守位置 (${cell.x},${cell.y}) 受到冲击`;
  } else if (event.type === 'lost' && event.reason === 'gate') {
    const gate = level.gates?.find(g => g.x === cell.x && g.y === cell.y);
    label = `光在${gate ? (gate.requires ?? [gate.plate]).join('＋') + ' 号' : ''}光闸前熄灭`;
  } else if (event.type === 'lost' && event.reason === 'wall') {
    label = `光撞上 (${cell.x},${cell.y}) 的墙面`;
  } else if (event.type === 'lost' && event.reason === 'edge') {
    const side = cell.x === 0 ? '左' : cell.x >= level.width - 1 ? '右' : cell.y === 0 ? '上' : '下';
    label = `光逸出${side}侧边界 (${cell.x},${cell.y})`;
  } else return;
  return { cell, label };
}

/** Locate events observed in the simulated future, retaining the first occurrence at each site. */
export function forecastFindings(result: Forecast, level: Level): ForecastFinding[] {
  const findings: ForecastFinding[] = [], seen = new Set<string>();
  const arrivals = new Map<string, number>();
  const last = result.frames.at(-1);
  if (!last) return findings;
  for (const { time, event } of result.events) {
    if (event.type === 'charge' && event.receiverId) {
      arrivals.set(event.receiverId, (arrivals.get(event.receiverId) ?? 0) + 1);
      continue;
    }
    const reading = circuitReading(event, level);
    if (!reading) continue;
    const { cell, label } = reading;
    const key = `${event.type}/${event.reason ?? ''}/${cell.x}/${cell.y}`;
    if (seen.has(key)) continue;
    const frame = result.frames.findIndex(f => f.time >= time);
    if (frame < 0) continue;
    seen.add(key);
    findings.push({ time, frame, cell, label });
    if (findings.length === 4) return findings;
  }
  // A healthy-looking loop can miss a receiver completely. Require a full observation window
  // with repeated delivery elsewhere and no interruption before reporting the missing visit.
  if (findings.length || last.time < 12 || result.firstStable !== undefined
    || ![...arrivals.values()].some(count => count >= 2)) return findings;
  for (const r of level.receivers) {
    if (!arrivals.has(r.id) && last.state.receivers[r.id].charge === 0) {
      findings.push({ time: last.time, frame: result.frames.length - 1, cell: { x: r.x, y: r.y }, label: `观察窗内，光未到达${r.name}` });
      if (findings.length === 4) break;
    }
  }
  return findings;
}
export function forecastMessage(f: Forecast): string {
  if (f.hits) return `站在原地将受到 ${f.hits} 次冲击。试着换一个安全的值守位置。`;
  if (f.firstStable === 0) {
    const failure = f.frames.find(frame => !frame.stable);
    return failure ? `起点已通过循环验证，约 ${failure.time.toFixed(1)} 秒后将中断。` : '当前回路已通过循环验证，观察窗内供电持续。';
  }
  if (!f.frames[0].state.sourceOn && !f.frames[0].state.pulses.length) return '来源已关闭，场内也没有脉冲。先开启来源，再检查当前布局。';
  if (f.firstStable !== undefined) return `约 ${f.firstStable.toFixed(1)} 秒后完成循环验证。继续拖动时间轴检查能否持续。`;
  if (f.lost) return `观察窗口内有 ${f.lost} 次脉冲丢失。检查墙体、关闭的光闸与回路末端。`;
  return '尚未完成所有循环验证。检查冷暖属性、接收环经过次数和供电期限。';
}
export class TrialAnchor {
  private state?: Snapshot;
  get exists() { return !!this.state; }
  set(sim: Simulation) { if (!sim.won) this.state = sim.snapshot(); }
  clear() { this.state = undefined; }
  restore(sim: Simulation) {
    if (!this.state || this.state.level !== sim.level.id || sim.won) return false;
    sim.restore(this.state); sim.events = []; return true;
  }
}
