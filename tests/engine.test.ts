import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';
import { parseSave, validSnapshot } from '../src/storage';
import type { Cell } from '../src/levels';

function advance(sim: Simulation, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) sim.step(1 / 60, false);
}

function pathTo(sim: Simulation, target: Cell): Cell[] | undefined {
  const queue: Cell[][] = [[{ x: Math.round(sim.player.x), y: Math.round(sim.player.y) }]], seen = new Set<string>();
  while (queue.length) {
    const path = queue.shift()!, cell = path[path.length - 1], key = `${cell.x},${cell.y}`;
    if (seen.has(key)) continue; seen.add(key);
    if (cell.x === target.x && cell.y === target.y) return path;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const next = { x: cell.x + dx, y: cell.y + dy };
      if (!sim.collides(next.x, next.y)) queue.push([...path, next]);
    }
  }
}
function walk(sim: Simulation, path: Cell[]) {
  for (const tile of path.slice(1)) {
    sim.move(Math.round(tile.x - sim.player.x), Math.round(tile.y - sim.player.y), 1 / (sim.carried ? 2.5 : 3.2));
    assert.ok(Math.hypot(sim.player.x - tile.x, sim.player.y - tile.y) < .001, '必须实际走到目标，不能穿过碰撞体');
  }
}
function approach(sim: Simulation, target: Cell, predicate: () => boolean) {
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const tile = { x: target.x + dx, y: target.y + dy };
    if (sim.collides(tile.x, tile.y)) continue;
    const path = pathTo(sim, tile); if (!path) continue;
    const previous = sim.player, previousFacing = sim.facing;
    sim.player = tile; sim.facing = { x: -dx, y: -dy }; const valid = predicate();
    sim.player = previous; sim.facing = previousFacing;
    if (!valid) continue;
    walk(sim, path); sim.facing = { x: -dx, y: -dy }; return;
  }
  assert.fail(`不能接近 ${target.x},${target.y}`);
}

for (const level of LEVELS) {
  test(`机房 ${level.id + 1}：参考布局确实可以供电并通关`, () => {
    const sim = new Simulation(level); sim.mirrors = structuredClone(level.solution);
    sim.player = { x: 1, y: 1 };
    let achieved = false;
    for (let i = 0; i < 60 * 35; i++) {
      sim.step(1 / 60, false);
      if (sim.stable) { achieved = true; break; }
    }
    assert.equal(achieved, true, `接收环状态：${JSON.stringify(sim.receivers)}`);
    if (level.offGrid) {
      assert.equal(sim.exitOpen, false);
      sim.sourceOn = false;
      advance(sim, 15);
      assert.equal(sim.stable, true, '关闭发射器后必须可持续运行');
    }
    sim.player = { ...level.exit }; sim.step(1 / 60, false);
    assert.equal(sim.won, true);
    assert.equal(sim.drainEvents().filter(e => e.type === 'win').length, 1);
    sim.step(.1, false); assert.equal(sim.drainEvents().length, 0, '通关事件只能触发一次');
  });

  test(`机房 ${level.id + 1}：参考镜面数量、编号、固定件与可放置空间一致`, () => {
    assert.deepEqual(level.solution.map(m => m.id).sort(), level.mirrors.map(m => m.id).sort());
    const occupied = new Set<string>();
    for (const mirror of level.solution) {
      const key = `${mirror.x},${mirror.y}`; assert.equal(occupied.has(key), false); occupied.add(key);
      assert.equal(level.walls.some(w => w.x === mirror.x && w.y === mirror.y), false);
      assert.equal(level.receivers.some(r => r.x === mirror.x && r.y === mirror.y), false);
      assert.equal(mirror.x > 0 && mirror.x < level.width - 1 && mirror.y > 0 && mirror.y < level.height - 1, true);
      const original = level.mirrors.find(m => m.id === mirror.id)!;
      assert.equal(level.walls.some(w => w.x === original.x && w.y === original.y), false, '初始设备不能与墙重叠');
      if (original.fixed) assert.deepEqual(mirror, original);
    }
  });

  test(`机房 ${level.id + 1}：玩家可通过正常走动、搬运和旋转搭出参考布局`, () => {
    const sim = new Simulation(level); sim.sourceOn = false;
    for (const target of level.solution) {
      if (target.fixed) continue;
      const original = sim.mirrors.find(m => m.id === target.id)!;
      approach(sim, original, () => typeof sim.nearest === 'object' && sim.nearest.id === target.id);
      sim.interact(); assert.equal(sim.carried?.id, target.id);
      if (sim.carried!.slash !== target.slash) sim.rotate();
      approach(sim, target, () => true); sim.interact(); assert.equal(sim.carried, null);
      assert.deepEqual(sim.mirrors.find(m => m.id === target.id), target);
    }
    const exitPath = pathTo(sim, level.exit); assert.ok(exitPath, '搭好设备后出口必须仍可到达');
    approach(sim, level.source, () => sim.nearest === 'source'); sim.interact(); assert.equal(sim.sourceOn, true);
    advance(sim, 25); assert.equal(sim.stable, true);
    if (level.offGrid) { sim.interact(); assert.equal(sim.sourceOn, false); }
    walk(sim, pathTo(sim, level.exit)!); sim.step(.01, false); assert.equal(sim.won, true);
  });
}

test('四个方向的反射不改变脉冲速度，也不会穿过镜面', () => {
  for (const slash of [true, false]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const sim = new Simulation(LEVELS[0]); sim.sourceOn = false;
    sim.mirrors = [{ id: 'test', x: 6, y: 4, slash }];
    sim.pulses = [{ id: 1, x: 6 - dx, y: 4 - dy, dx, dy, wait: 0, last: '', age: 0 }];
    advance(sim, .3);
    assert.equal(sim.pulses.length, 1);
    assert.equal(sim.pulses[0].dx, slash ? -dy : dy);
    assert.equal(sim.pulses[0].dy, slash ? -dx : dx);
    assert.ok(Math.abs(Math.hypot(sim.pulses[0].dx, sim.pulses[0].dy) - 1) < 1e-9);
  }
});

test('循环验证要求同一颗脉冲，不会把两次独立发射当作闭环', () => {
  const sim = new Simulation(LEVELS[2]); sim.sourceOn = false; sim.mirrors = [];
  for (const id of [1, 2]) {
    sim.pulses = [{ id, x: 5, y: 2, dx: 1, dy: 0, wait: 0, last: '', age: 0 }];
    advance(sim, .3);
  }
  assert.equal(sim.receivers.gate.hits, 1); assert.equal(sim.stable, false);
});

test('供电过期会清除循环验证', () => {
  const sim = new Simulation(LEVELS[2]); sim.sourceOn = false;
  sim.receivers.gate = { charge: .1, hits: 2, lastPulse: 1 };
  advance(sim, .2); assert.deepEqual(sim.receivers.gate, { charge: 0, hits: 0, lastPulse: -1 });
});

test('存档保留手持物、脉冲、接收环、计时与开关，恢复后结果一致', () => {
  const sim = new Simulation(LEVELS[4]); sim.mirrors = structuredClone(sim.level.solution); sim.player = { x: 1, y: 1 };
  advance(sim, 11); const saved = sim.snapshot();
  assert.equal(validSnapshot(saved), true);
  const other = new Simulation(LEVELS[4]); other.restore(saved);
  assert.equal(typeof other.level, 'object'); assert.deepEqual(other.snapshot(), saved);
  advance(sim, 10); advance(other, 10); assert.deepEqual(other.snapshot(), sim.snapshot());
});

test('恢复后的手持反射器不会丢失或复制', () => {
  const sim = new Simulation(LEVELS[0]); sim.player = { x: 4, y: 6 }; sim.interact();
  assert.ok(sim.carried); assert.equal(sim.mirrors.length, 0);
  const saved = sim.snapshot(); assert.equal(validSnapshot(saved), true);
  const other = new Simulation(LEVELS[0]); other.restore(saved); other.facing = { x: 0, y: -1 }; other.interact();
  assert.equal(other.carried, null); assert.equal(other.mirrors.length, 1);
});

test('墙体碰撞支持沿墙滑动，大步移动不会穿墙', () => {
  const sim = new Simulation(LEVELS[0]); sim.player = { x: 9, y: 5 };
  sim.move(1, 0, 2); assert.ok(sim.player.x < 9.4);
  const previousY = sim.player.y; sim.move(1, -1, .2); assert.ok(sim.player.y < previousY);
});

test('受击返回起点，保留布局并暂时免伤', () => {
  const sim = new Simulation(LEVELS[0]); sim.player = { x: 7, y: 4 }; sim.sourceOn = false;
  const layout = structuredClone(sim.mirrors);
  sim.pulses = [{ id: 7, x: 6.9, y: 4, dx: 1, dy: 0, wait: 0, last: '', age: 0 }];
  sim.step(.02); assert.equal(sim.hits, 1); assert.deepEqual(sim.player, sim.level.spawn);
  assert.deepEqual(sim.mirrors, layout); assert.ok(sim.invulnerable > 0);
});

test('损坏、越界、错误版本及未知形状的存档安全降级', () => {
  assert.equal(parseSave('{broken').unlocked, 0);
  assert.equal(parseSave('{"version":99}').unlocked, 0);
  assert.equal(parseSave('{"version":1,"unlocked":1000}').unlocked, LEVELS.length - 1);
  const saved = new Simulation(LEVELS[0]).snapshot();
  assert.equal(validSnapshot({ ...saved, player: { x: Infinity, y: 2 } }), false);
  assert.equal(validSnapshot({ ...saved, mirrors: [] }), false);
  assert.equal(validSnapshot({ ...saved, carried: {} }), false);
  assert.equal(validSnapshot({ ...saved, receivers: {} }), false);
  const parsed = parseSave(JSON.stringify({ version: 1, checkpoint: saved }));
  assert.deepEqual(parsed.checkpoint, saved);
});

test('缓冲器确实暂停脉冲，然后沿原方向释放', () => {
  const sim = new Simulation(LEVELS[4]); sim.sourceOn = false;
  sim.pulses = [{ id: 1, x: 3, y: 5, dx: 0, dy: -1, wait: 0, last: '', age: 0 }];
  advance(sim, .3); assert.ok(sim.pulses[0].wait > .9);
  advance(sim, .5); assert.equal(sim.pulses[0].y, 4);
  advance(sim, .9); assert.ok(sim.pulses[0].y < 4);
});
