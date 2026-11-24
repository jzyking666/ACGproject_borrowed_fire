import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';
import { REPAIRS, createRepair, repairResult } from '../src/repairs';
import { validSnapshot } from '../src/storage';

function wait(sim: Simulation, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 120) && !sim.won; i++) sim.step(1 / 120);
}

function until(sim: Simulation, ready: () => boolean) {
  for (let i = 0; i < 40 * 120 && !ready(); i++) sim.step(1 / 120);
  assert.ok(ready(), `未能接通机房 ${sim.level.id + 1} (${JSON.stringify(sim.receivers)})`);
}

// Real cardinal walks, one fixed simulation tick per input. Every step includes pulse collisions.
function walk(sim: Simulation, x: number, y: number) {
  for (let i = 0; i < 1200 && !sim.won; i++) {
    const dx = x - sim.player.x, dy = y - sim.player.y;
    if (Math.hypot(dx, dy) < 1e-6) return;
    const horizontal = Math.abs(dx) > 1e-6;
    const h = Math.min(1 / 120, Math.abs(horizontal ? dx : dy) / (sim.carried ? 2.5 : 3.2));
    sim.move(horizontal ? Math.sign(dx) : 0, horizontal ? 0 : Math.sign(dy), h);
    sim.step(h);
  }
  assert.ok(sim.won, `走不到 (${x},${y})，人在 (${sim.player.x},${sim.player.y})`);
}

const fix: Record<string, (sim: Simulation) => void> = {
  bell(sim) {
    walk(sim, 4, 2); walk(sim, 7, 2);
    sim.rotate(); walk(sim, 7, 1);
    until(sim, () => sim.stable);
    walk(sim, 2, 1); walk(sim, 2, 2);
  },
  freight(sim) {
    walk(sim, 4, 5); assert.equal(sim.nearest, 'source'); sim.interact();
    walk(sim, 8, 5); walk(sim, 8, 6); sim.interact();
    walk(sim, 9, 6); assert.deepEqual(sim.targetCell, { x: 10, y: 6 }); sim.interact();
    walk(sim, 9, 3); sim.interact();
    walk(sim, 8, 3); walk(sim, 8, 2); walk(sim, 9, 2); sim.interact();
    walk(sim, 8, 2); walk(sim, 8, 5); walk(sim, 4, 5);
    assert.equal(sim.nearest, 'source'); sim.interact();
    until(sim, () => sim.stable);
    assert.equal(sim.exitOpen, false);
    sim.interact();
    assert.equal(sim.sourceOn, false);
    walk(sim, 11, 5); walk(sim, 11, 4);
  },
  handprint(sim) {
    walk(sim, 8, 5); walk(sim, 8, 4);
    until(sim, () => sim.stable);
    walk(sim, 8, 5); walk(sim, 2, 5); walk(sim, 2, 2);
    walk(sim, 11, 2); walk(sim, 11, 1);
  },
  carbon(sim) {
    sim.removeEcho();
    walk(sim, 8, 5); walk(sim, 8, 4);
    sim.toggleRecording(); wait(sim, .5); sim.toggleRecording();
    until(sim, () => sim.stable);
    walk(sim, 8, 3); walk(sim, 11, 3); walk(sim, 11, 2);
  },
  seasons(sim) {
    walk(sim, 7, 5); walk(sim, 7, 4); sim.rotate();
    walk(sim, 10, 4);
    until(sim, () => sim.stable);
    walk(sim, 10, 2);
  },
};

for (const order of REPAIRS) {
  test(`返修「${order.title}」故障持续存在，重开时恢复全部原始安装`, () => {
    const base = structuredClone(LEVELS[order.level]), sim = createRepair(order), initial = sim.snapshot();
    assert.ok(validSnapshot(initial));
    assert.equal(sim.collides(sim.player.x, sim.player.y), false);
    assert.equal(sim.moves, 0);
    assert.equal(repairResult(order, sim), undefined);
    for (let i = 0; i < 60 * 120; i++) {
      sim.step(1 / 120);
      assert.equal(sim.stable, false);
    }
    assert.equal(sim.hits, 0, '报修人能在起点安全看完一个故障周期');
    if (order.id === 'freight') {
      assert.equal(sim.stats.lost, 0);
      assert.equal(sim.stats.emitted, 1);
      assert.ok(sim.receivers.gate.hits >= 2);
      assert.equal(sim.receivers.lift.hits, 0);
    }
    if (order.id === 'seasons') assert.ok(sim.stats.rejected > 0);
    if (order.id === 'carbon') {
      assert.ok(sim.plateActive('I')); assert.equal(sim.plateActive('II'), false);
    }
    assert.deepEqual(createRepair(order).snapshot(), initial);
    assert.deepEqual(LEVELS[order.level], base);
  });
  test(`返修「${order.title}」可实走、无伤、按预算交付`, () => {
    const sim = createRepair(order);
    fix[order.id](sim);
    assert.equal(sim.won, true);
    assert.equal(sim.hits, 0);
    assert.deepEqual(repairResult(order, sim), { moves: order.budget, withinBudget: true });
  });
}

test('返修允许多花操作完成，结果按实际动作结算', () => {
  const order = REPAIRS[0], sim = createRepair(order);
  walk(sim, 4, 2); walk(sim, 7, 2);
  sim.rotate(); sim.rotate(); sim.rotate();
  walk(sim, 7, 1); until(sim, () => sim.stable);
  walk(sim, 2, 1); walk(sim, 2, 2);
  assert.deepEqual(repairResult(order, sim), { moves: 3, withinBudget: false });
  assert.equal(repairResult(REPAIRS[1], sim), undefined);
});

test('档案库也接受用备用镜压板的交接方案', () => {
  const order = REPAIRS.find(r => r.id === 'handprint')!;
  const sim = createRepair(order);
  walk(sim, 9, 5); sim.interact();
  assert.equal(sim.carried?.id, 'e');
  walk(sim, 10, 5); walk(sim, 10, 4); walk(sim, 9, 4);
  assert.deepEqual(sim.targetCell, { x: 8, y: 4 });
  sim.interact();
  assert.ok(sim.plateActive('I'));
  walk(sim, 9, 5);
  until(sim, () => sim.stable);
  walk(sim, 2, 5); walk(sim, 2, 2);
  walk(sim, 11, 2); walk(sim, 11, 1);
  assert.deepEqual(repairResult(order, sim), { moves: 2, withinBudget: false });
});
