import assert from 'node:assert/strict';
import test from 'node:test';
import { Simulation } from '../src/engine';
import { TRAM_BASE, TRAM_EN, TRAM_STOPS, tramStopById } from '../src/last-tram';

// Follow the same cardinal movement and elapsed time as a held key. Pulse damage stays enabled.
function walk(s: Simulation, x: number, y: number) {
  for (let i = 0; i < 1800 && !s.won; i++) {
    const dx = x - s.player.x, dy = y - s.player.y;
    if (Math.hypot(dx, dy) < .00001) return;
    const horizontal = Math.abs(dx) > .00001;
    const dt = Math.min(1 / 120, Math.abs(horizontal ? dx : dy) / (s.carried ? 2.5 : 3.2));
    s.move(horizontal ? Math.sign(dx) : 0, horizontal ? 0 : Math.sign(dy), dt);
    s.step(dt);
  }
  assert.ok(s.won, `Blocked at (${s.player.x}, ${s.player.y}) en route to (${x}, ${y})`);
}
function wait(s: Simulation, seconds: number) {
  for (let i = 0; i < seconds * 120; i++) s.step(1 / 120);
}
function until(s: Simulation, ready: () => boolean) {
  for (let i = 0; i < 3600 && !ready(); i++) s.step(1 / 120);
  assert.ok(ready(), 'The requested circuit condition must be reachable');
}
function resume(s: Simulation) {
  const restored = new Simulation(s.level);
  assert.equal(restored.restore(s.snapshot()), false, 'Valid progress restores without relocating anything');
  return restored;
}

test('the shelter starts half-lit; move a mirror and route the same pulse through both lamps', () => {
  const s = new Simulation(TRAM_STOPS[0].level);
  wait(s, 12);
  assert.ok(s.receivers.amber.charge > 0);
  assert.equal(s.receivers.blue.charge, 0);
  s.interact();
  assert.equal(s.carried?.id, 'A');
  s.rotate();
  walk(s, 7, 6); walk(s, 7, 7); walk(s, 7, 6);
  s.interact();
  assert.deepEqual(s.carried, null);
  until(s, () => s.stable);
  assert.equal(s.receivers.amber.lastPulse, s.receivers.blue.lastPulse);
  walk(s, 7, 7); walk(s, 3, 7);
  assert.ok(s.won);
  assert.equal(s.hits, 0);
});

test('front and rear relays each need a first handoff; the first stays powered while the driver walks to the second', () => {
  let s = new Simulation(TRAM_STOPS[1].level);
  walk(s, 3, 4); walk(s, 7, 4);
  wait(s, 6);
  assert.equal(s.receivers.latch.charge, 0);
  assert.equal(s.receivers.door.charge, 0);
  walk(s, 3, 4);
  until(s, () => s.receivers.latch.charge > 0);
  walk(s, 8, 4); walk(s, 8, 5);
  assert.equal(s.plateActive('A'), false);
  assert.equal(s.gateOpen(s.level.gates![0]), true);
  assert.equal(s.receivers.door.charge, 0);
  s = resume(s);
  s.rotate();
  walk(s, 7, 5); walk(s, 7, 4);
  until(s, () => s.exitOpen);
  walk(s, 11, 4); walk(s, 11, 2);
  assert.ok(s.won);
  assert.equal(s.hits, 0);
});

test('the departure pedal starts a two-colour loop through the wells; both lamps live on one pulse after disconnect', () => {
  let s = new Simulation(TRAM_STOPS[2].level);
  assert.equal(s.nearest, 'source'); s.interact();
  walk(s, 3, 5); s.rotate();
  walk(s, 8, 5); s.interact(); s.rotate();
  walk(s, 8, 4); walk(s, 8, 5); s.interact();
  assert.deepEqual([...s.mirrors].sort((a,b) => a.id.localeCompare(b.id)), s.level.solution);
  walk(s, 5, 5); s.interact();
  wait(s, 5);
  assert.equal(s.receivers.tail.charge, 0);
  walk(s, 6, 5);
  until(s, () => s.stable);
  assert.equal(s.exitOpen, false);
  walk(s, 5, 5); s.interact();
  assert.ok(s.exitOpen); assert.equal(s.plateActive('C'), false);
  s = resume(s);
  const pulse = s.pulses[0].id, emitted = s.stats.emitted;
  wait(s, 35);
  assert.ok(s.stable);
  assert.equal(s.receivers.roof.lastPulse, pulse);
  assert.equal(s.receivers.tail.lastPulse, pulse);
  assert.equal(s.stats.emitted, emitted);
  walk(s, 5, 4); walk(s, 6, 4);
  assert.ok(s.won);
  assert.equal(s.hits, 0);
});

test('stop IDs and original bilingual letters stay independent of classic room order', () => {
  for (const [index, stop] of TRAM_STOPS.entries()) {
    assert.equal(tramStopById(TRAM_BASE + index), stop);
    for (const text of [stop.place, stop.caller, stop.request, stop.receipt, stop.level.name,
      stop.level.briefing, stop.level.lesson, ...stop.level.hints, ...stop.level.receivers.map(r => r.name)]) {
      assert.ok(TRAM_EN[text] && !/\p{Script=Han}/u.test(TRAM_EN[text]), text);
    }
  }
  for (const id of [22, 1000, TRAM_BASE - 1, TRAM_BASE + 3, TRAM_BASE + .5, NaN]) assert.equal(tramStopById(id), undefined);
});
