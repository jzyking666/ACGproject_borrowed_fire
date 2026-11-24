import type { Cell } from './levels';
export interface TimedCell extends Cell { t: number }
export interface EchoTrack { points: TimedCell[]; duration: number; time: number }
export interface EchoCapture { points: TimedCell[]; elapsed: number }
export const ECHO_SECONDS = 6;
export function echoPosition(track: EchoTrack): Cell {
  const time = ((track.time % track.duration) + track.duration) % track.duration;
  let low = 1, high = track.points.length - 1;
  while (low < high) { const mid = (low + high) >>> 1; if (track.points[mid].t < time) low = mid + 1; else high = mid; }
  const i = low;
  const a = track.points[Math.max(0, i - 1)], b = track.points[Math.min(i, track.points.length - 1)];
  const alpha = b.t > a.t ? Math.max(0, Math.min(1, (time - a.t) / (b.t - a.t))) : 0;
  return { x: a.x + (b.x - a.x) * alpha, y: a.y + (b.y - a.y) * alpha };
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
function validPoints(value: unknown, duration: number) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 200) return false;
  let previous = -1;
  for (const p of value) {
    if (!object(p) || !finite(p.x) || !finite(p.y) || !finite(p.t) || p.x < 0 || p.x > 12 || p.y < 0 || p.y > 8 || p.t < 0 || p.t < previous || p.t > duration + 1e-7) return false;
    previous = p.t;
  }
  return value[0].t === 0;
}
export function validEcho(value: unknown): value is EchoTrack {
  return object(value) && finite(value.duration) && value.duration >= .5 && value.duration <= ECHO_SECONDS + 1e-7
    && finite(value.time) && value.time >= 0 && value.time <= value.duration
    && validPoints(value.points, value.duration) && Math.abs((value.points as TimedCell[]).at(-1)!.t - value.duration) < 1e-7;
}
export function validCapture(value: unknown): value is EchoCapture {
  return object(value) && finite(value.elapsed) && value.elapsed >= 0 && value.elapsed <= ECHO_SECONDS + 1e-7 && validPoints(value.points, value.elapsed);
}
