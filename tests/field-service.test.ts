import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/engine';
import { FIELD_BASE, FIELD_LEVELS } from '../src/field-service';
import type { Cell, Level } from '../src/levels';

// Walk half a tile in 25 ordinary frames. Including 'wait' lets the operator
// choose when to cross an active beam; operating the field never stops time.
const DT = 1 / 160;
const FRAMES = 25;
const choices: Cell[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 0 }];
type Step = Cell & { turn: number; parent: number; input: Cell };

/** Plan from the current instant, using only public movement, collision and targeting rules.
 * The projection is an isolated copy: only the final input sequence advances the tested run. */
function go(sim: Simulation, goal: (probe: Simulation) => boolean): void {
  if (sim.won || goal(sim)) return;
  const projection = new Simulation(sim.level);
  projection.restore(sim.snapshot());
  projection.player = { ...sim.level.spawn };
  const probe = new Simulation(sim.level);
  const pulseAt: (Cell | undefined)[] = [];
  const extendPrediction = (frames: number) => {
    while (pulseAt.length < frames) {
      projection.step(DT, false);
      const pulse = projection.pulses[0];
      pulseAt.push(pulse && { x: pulse.x, y: pulse.y });
    }
  };
  const states: Step[] = [{ ...sim.player, turn: 0, parent: -1, input: { ...sim.facing } }];
  const reachable = new Set<string>();
  const goals = new Set<string>();
  // Only choose approach positions where the target is unambiguous, regardless of facing.
  for (let x = 1; x < sim.level.width - 1; x += .5) for (let y = 1; y < sim.level.height - 1; y += .5) {
    if (sim.collides(x, y)) continue;
    reachable.add(`${x},${y}`); probe.player = { x, y };
    if (choices.slice(0, 4).every(dir => { probe.facing = dir; return goal(probe); })) goals.add(`${x},${y}`);
  }
  const seen = new Set<string>();
  for (let i = 0; i < states.length; i++) {
    const point = states[i];
    if (goals.has(`${point.x},${point.y}`)) {
      const steps: Cell[] = [];
      for (let n = i; n > 0; n = states[n].parent) steps.push(states[n].input);
      for (const dir of steps.reverse()) for (let f = 0; f < FRAMES && !sim.won; f++) {
        sim.move(dir.x, dir.y, DT);
        sim.step(DT); // All executed frames include damage and real receiver activation.
      }
      assert.ok(sim.won || goal(sim), `走位后未选中目标，位置 ${JSON.stringify(sim.player)}`);
      assert.equal(sim.hits, 0, '行走过程中受到冲击');
      return;
    }
    if (point.turn >= 65) continue;
    extendPrediction((point.turn + 1) * FRAMES);
    for (const dir of choices) {
      const x = Math.round(point.x * 2 + dir.x) / 2, y = Math.round(point.y * 2 + dir.y) / 2;
      const cell = `${x},${y}`, key = `${cell}/${point.turn + 1}`;
      if (seen.has(key) || !reachable.has(cell)) continue;
      let safe = true;
      for (let f = 0; f < FRAMES; f++) {
        const light = pulseAt[point.turn * FRAMES + f];
        if (!light) continue;
        const distance = .5 * (f + 1) / FRAMES;
        if (Math.hypot(point.x + dir.x * distance - light.x, point.y + dir.y * distance - light.y) < .39) { safe = false; break; }
      }
      if (safe) { seen.add(key); states.push({ x, y, turn: point.turn + 1, parent: i, input: dir }); }
    }
  }
  assert.fail(`从 ${JSON.stringify(sim.player)} 出发未能安全到达目标，可站立目标格 ${[...goals].join(' ')}`);
}

function deliver(level: Level) {
  const sim = new Simulation(level);
  assert.ok(!sim.collides(sim.player.x, sim.player.y));
  assert.ok(sim.commissionReadings().some(r => !r.passes));
  for (let i = 0; i < 60 * 5; i++) {
    sim.step(1 / 60); assert.equal(sim.exitOpen, false);
  }
  assert.equal(sim.hits, 0, '出生点应允许安全读图');
  for (const [index, target] of level.solution.entries()) {
    const mirror = sim.mirrors.find(m => m.id === target.id)!;
    if (mirror.slash === target.slash) continue;
    assert.ok(!target.fixed);
    go(sim, s => typeof s.nearest === 'object' && s.nearest.id === target.id);
    if (index % 2) sim.interact(); else sim.rotate();
    assert.equal(sim.carried, null); assert.equal(mirror.slash, target.slash);
    assert.deepEqual([mirror.x, mirror.y], [target.x, target.y]);
  }
  assert.ok(sim.commissionReadings().every(r => r.passes));
  go(sim, s => Math.hypot(s.player.x - level.exit.x, s.player.y - level.exit.y) < .01);
  for (let i = 0; i < 60 * 35 && !sim.won; i++) sim.step(1 / 60);
  assert.equal(sim.won, true);
  assert.equal(sim.hits, 0);
  assert.ok(Object.values(sim.receivers).every(r => r.hits >= 1 && r.charge > 0));
  assert.ok(sim.drainEvents().some(e => e.type === 'charge'));
}

test('现场关使用独立编号，开工图均有区别，八区各有六单', () => {
  assert.deepEqual(FIELD_LEVELS.map(level => level.id), Array.from({ length: 48 }, (_, i) => FIELD_BASE + i));
  assert.equal(new Set(FIELD_LEVELS.map(l => JSON.stringify([l.mirrors, l.commission]))).size, FIELD_LEVELS.length);
});
for (const level of FIELD_LEVELS) {
  test(`现场 ${level.id} · ${level.name} 可实走无伤对齐轴座、验收并抵达出口`, () => deliver(level));
}

test('所有多路房间中，即使第一路真实送电，人站在出口也必须等其他联检通过', () => {
  for (const level of FIELD_LEVELS.filter(l => l.commission!.length > 1)) {
    const sim = new Simulation(level), axes = sim.mirrors.filter(m => !m.fixed);
    let partial = false;
    for (let mask = 0; mask < 2 ** axes.length && !partial; mask++) {
      axes.forEach((m, i) => { m.slash = Boolean(mask & (1 << i)); });
      const tests = sim.commissionReadings();
      partial = tests[0].passes && tests.some(t => !t.passes);
    }
    assert.ok(partial, `现场 ${level.id} 需要能区分主线路和副路`);
    sim.player = { ...level.exit }; // Isolate exit acceptance from the independent walking test above.
    for (let i = 0; i < 60 * 30 && !sim.powered; i++) sim.step(1 / 60);
    assert.ok(sim.powered, `现场 ${level.id} 的第一路应能真实送电`);
    assert.equal(sim.exitOpen, false); assert.equal(sim.won, false);
  }
});

test('联检接纳具有相同输出的其他物理配置，允许梳理出不同于工单提示的布线', () => {
  const level = FIELD_LEVELS.find(l => l.id === 129)!;
  const sim = new Simulation(level), axes = sim.mirrors.filter(m => !m.fixed);
  const solutions: boolean[][] = [];
  for (let mask = 0; mask < 2 ** axes.length; mask++) {
    axes.forEach((m, i) => { m.slash = Boolean(mask & (1 << i)); });
    if (sim.commissionReadings().every(r => r.passes)) solutions.push(axes.map(m => m.slash));
  }
  const reference = level.solution.filter(m => !m.fixed).map(m => m.slash);
  const alternate = solutions.find(layout => layout.some((v, i) => v !== reference[i]));
  assert.ok(alternate);
  axes.forEach((m, i) => { m.slash = alternate[i]; });
  sim.player = { ...level.exit };
  for (let i = 0; i < 60 * 30 && !sim.won; i++) sim.step(1 / 60);
  assert.ok(sim.won);
});
