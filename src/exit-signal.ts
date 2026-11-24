import type { Simulation } from './engine';

export type ExitSignal = 'waiting' | 'receiving' | 'isolate' | 'clear';

export function exitSignal(sim: Simulation): ExitSignal {
  if (sim.exitOpen) return 'clear';
  if (sim.stable && sim.level.offGrid && sim.sourceOn) return 'isolate';
  return sim.level.receivers.some(r => sim.receivers[r.id].charge > 0) ? 'receiving' : 'waiting';
}

/** Mechanical arm angles can be read even with bloom disabled or colours indistinguishable. */
export const SIGNALS: Record<ExitSignal, { angle: number; color: number; light: number }> = {
  waiting: { angle: 0, color: 0x89736a, light: .06 },
  receiving: { angle: Math.PI / 6, color: 0xc2a176, light: .24 },
  isolate: { angle: Math.PI / 3, color: 0xf0ba72, light: .8 },
  clear: { angle: Math.PI / 2, color: 0x8fdfb5, light: 1.15 },
};

/** View uses a unit sphere. Keep indicator radii in board units at every update. */
export const visitLampRadius = (charged: boolean, hits: number, index: number) =>
  charged && hits > index ? .05 : .021;
