import type { Simulation, Snapshot } from './engine';

/** Restore the entire running circuit, not just mirror positions. */
export class History {
  private states: Snapshot[] = [];
  get size() { return this.states.length; }
  clear() { this.states = []; }
  perform(sim: Simulation, action: () => void) {
    const before = sim.snapshot(); action();
    if (before.moves !== sim.moves || before.sourceOn !== sim.sourceOn) {
      this.states.push(before); if (this.states.length > 64) this.states.shift();
    }
  }
  undo(sim: Simulation) {
    const state = this.states.pop(); if (!state) return false;
    sim.restore(state); sim.events = []; return true;
  }
}
