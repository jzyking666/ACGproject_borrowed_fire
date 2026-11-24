import type { Mirror, Phase, Cell } from './levels';

/** A prism reads the pulse's phase. Rotation swaps the two color routes. */
export function reflectiveSlash(mirror: Mirror, phase: Phase = 'warm'): boolean {
  return mirror.kind === 'prism' && phase === 'cool' ? !mirror.slash : mirror.slash;
}
export function reflectedDirection(mirror: Mirror, direction: Cell, phase: Phase = 'warm'): Cell {
  return reflectiveSlash(mirror, phase) ? { x: -direction.y, y: -direction.x } : { x: direction.y, y: direction.x };
}
export const flipPhase = (phase: Phase): Phase => phase === 'warm' ? 'cool' : 'warm';
