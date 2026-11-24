import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, SPEED, type GameEvent } from '../src/engine';
import { LEVELS } from '../src/levels';
import { forecast } from '../src/forecast';

const cadences = {
  '60 Hz': [1 / 60], '90 Hz': [1 / 90], '144 Hz': [1 / 144],
  '交替长短帧': [.003, .019, .031, .007, .013], '帧尾余数': [.024, .009, .012, .018, .011],
};
function circuit(levelId: number) {
  const sim = new Simulation(LEVELS[levelId]);
  sim.mirrors = structuredClone(sim.level.solution);
  sim.player = { x: 1, y: 1 }; sim.spawnTimer = 0;
  if (levelId === 21) {
    const period = 24 / SPEED;
    sim.echoes = [{ duration: period, time: 0, points: [
      { x: 9, y: 3, t: 0 }, { x: 9, y: 3, t: 1.45 }, { x: 9, y: 5, t: 2.1 },
      { x: 9, y: 5, t: 4.1 }, { x: 9, y: 3, t: 4.725 }, { x: 9, y: 3, t: period },
    ] }];
  }
  return sim;
}
function run(sim: Simulation, cadence: number[], seconds: number) {
  const events: GameEvent[] = [];
  let time = 0, i = 0;
  while (time < seconds - 1e-10) {
    const dt = Math.min(seconds - time, cadence[i++ % cadence.length]);
    sim.step(dt); time += dt;
    events.push(...sim.drainEvents());
    if (time > 24) assert.ok(sim.stable, `第 ${time.toFixed(3)} 秒断电`);
  }
  return events;
}

for (const levelId of [2, 4, 8, 9, 18, 19, 21]) {
  test(`机房 ${levelId + 1} 的镜面、缓冲、换相与接收事件在不同真实帧节奏下保持顺序`, () => {
    const seconds = 77.543, reference = circuit(levelId);
    const referenceEvents = run(reference, [1 / 120], seconds);
    for (const [name, cadence] of Object.entries(cadences)) {
      const sim = circuit(levelId), events = run(sim, cadence, seconds);
      assert.deepEqual(events, referenceEvents, name);
      assert.deepEqual([sim.stats.emitted, sim.stats.lost, sim.stats.rejected, sim.hits], [1, 0, 0, 0], name);
      const p = sim.pulses[0], expected = reference.pulses[0];
      assert.equal(p.id, expected.id); assert.equal(p.phase, expected.phase);
      assert.ok(Math.hypot(p.x - expected.x, p.y - expected.y) < 1e-7, name);
      assert.ok(Math.abs(p.wait - expected.wait) < 1e-7, name);
    }
  });
}

test('12 秒推演所示回声闸、棱镜及接收事件与实际 90 Hz 时间线相符', () => {
  const sim = circuit(21), preview = forecast(sim);
  const actual = run(sim, [1 / 90], 12);
  assert.deepEqual(actual, preview.events.map(({ event }) => event));
  assert.equal(sim.stable, preview.frames.at(-1)!.stable);
});

test('兼容已提前折向但尚未走过镜心的旧快照与缓冲剩余等待', () => {
  const sim = circuit(2), save = sim.snapshot(); save.sourceOn = false;
  // An old nearest-sample reflection could turn just before the centre. The last-cell key
  // means that this mirror has already fired, even though the new outgoing axis is upstream.
  save.pulses = [{ id: 7, x: 10, y: 6.007, dx: 0, dy: -1, last: '10,6', age: 12, wait: 0 }];
  sim.restore(save); sim.step(.01);
  assert.deepEqual(sim.drainEvents(), []);
  assert.equal(sim.pulses[0].dy, -1);
  assert.ok(Math.abs(sim.pulses[0].y - (6.007 - .01 * SPEED)) < 1e-10);
  const buffer = circuit(4), waiting = buffer.snapshot(); waiting.sourceOn = false;
  waiting.pulses = [{ id: 8, x: 3, y: 4, dx: 0, dy: 1, last: '3,4', age: 3, wait: .002 }];
  buffer.restore(waiting); buffer.step(.008);
  assert.equal(buffer.pulses[0].wait, 0);
  assert.ok(Math.abs(buffer.pulses[0].y - (4 + .006 * SPEED)) < 1e-10);
});

test('导光井保留一个子步内穿过井心后的路程，跨帧不会立即传回', () => {
  const sim = circuit(8); sim.sourceOn = false;
  sim.pulses = [{ id: 9, x: 10, y: 4.004, dx: 0, dy: -1, last: '10,5', age: 2, wait: 0, phase: 'cool' }];
  sim.step(.006); sim.step(.003);
  assert.equal(sim.drainEvents().filter(e => e.type === 'teleport').length, 1);
  assert.equal(sim.pulses[0].x, 6);
  assert.ok(Math.abs(sim.pulses[0].y - (2.004 - .009 * SPEED)) < 1e-10);
});
