import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, type Pulse } from '../src/engine';
import { LEVELS, type Level } from '../src/levels';
import { History } from '../src/history';
import { validSnapshot, defaults, parseSave } from '../src/storage';
import { Controller } from '../src/controller';
const advance = (s: Simulation, seconds: number) => { for (let t = 0; t < seconds; t += 1 / 120) s.step(1 / 120, false); };
const pulse = (x: number, y: number, dx = 1, dy = 0): Pulse => ({ id: 72, x, y, dx, dy, age: 0, wait: 0, last: '', phase: 'cool' });
const make = (level: Level) => { const s = new Simulation(level); s.sourceOn = false; s.player = { x: 1, y: 1 }; return s; };

test('光闸只放行被人或放下的镜子压住的压板；抬起后立即失效', () => {
  const s = make(LEVELS[7]);
  assert.equal(s.plateActive('I'), false); assert.equal(s.collides(3, 5), false, '光闸不拦维修员');
  s.pulses = [pulse(2, 5)]; advance(s, .3); assert.equal(s.pulses.length, 0);
  s.player = { x: 4, y: 3 }; assert.equal(s.plateActive('I'), true);
  s.pulses = [pulse(2, 5)]; advance(s, .3); assert.equal(s.pulses.length, 1);
  s.player = { x: 1, y: 1 }; s.mirrors[1] = { ...s.mirrors[1], x: 4, y: 3 };
  assert.equal(s.plateActive('I'), true);
  const snapshot = s.snapshot(); const other = make(LEVELS[7]); other.restore(snapshot);
  assert.equal(other.plateActive('I'), true, '读档恢复占据关系');
  s.carried = s.mirrors.pop()!; assert.equal(s.plateActive('I'), false, '手持物不再压住原位置');
});

test('导光井在四个方向保持脉冲方向、身份和相位，不在井口反复传送', () => {
  const level = { ...LEVELS[8], walls: [], mirrors: [], solution: [] };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const s = make(level); s.pulses = [pulse(10 - dx * .4, 4 - dy * .4, dx, dy)];
    advance(s, .15); const p = s.pulses[0];
    assert.ok(p); assert.equal(p.id, 72); assert.equal(p.phase, 'cool');
    assert.equal(p.dx, dx); assert.equal(p.dy, dy);
    assert.ok(Math.hypot(p.x - 6, p.y - 2) < .35);
    assert.equal(s.drainEvents().filter(e => e.type === 'teleport').length, 1);
  }
});

test('换相器跨多子步只切换一次；错误颜色穿过但不供电', () => {
  const level: Level = { ...LEVELS[0], walls: [], mirrors: [], solution: [], inverters: [{ x: 5, y: 4 }], receivers: [{ id: 'c', name: '冷环', x: 6, y: 4, phase: 'cool', ttl: 8 }] };
  const s = make(level); s.pulses = [{ ...pulse(4, 4), phase: 'warm' }];
  advance(s, .6); assert.equal(s.pulses[0].phase, 'cool'); assert.equal(s.receivers.c.hits, 1);
  assert.equal(s.drainEvents().filter(e => e.type === 'phase').length, 1);
  const wrong = make({ ...level, inverters: [] }); wrong.pulses = [{ ...pulse(5, 4), phase: 'warm' }];
  advance(wrong, .4); assert.equal(wrong.receivers.c.charge, 0); assert.equal(wrong.pulses.length, 1);
});

test('新装置存档包含冷暖脉冲，拒绝未知相位，旧快照仍可读取', () => {
  const s = make(LEVELS[11]); s.mirrors = structuredClone(s.level.solution); s.sourceOn = true; advance(s, 3);
  const snapshot = s.snapshot(); assert.equal(validSnapshot(snapshot), true);
  const other = make(s.level); other.restore(snapshot); advance(s, 4); advance(other, 4);
  assert.deepEqual(s.snapshot(), other.snapshot());
  const legacy = new Simulation(LEVELS[0]).snapshot(); legacy.pulses = [pulse(4, 4)]; delete legacy.pulses[0].phase;
  assert.equal(validSnapshot(legacy), true);
  assert.equal(validSnapshot({ ...legacy, pulses: [{ ...legacy.pulses[0], phase: 'invalid' }] }), false);
  const data = defaults(); data.checkpoint = snapshot;
  assert.equal(parseSave(JSON.stringify(data)).checkpoint?.level, 11);
  assert.equal(parseSave(JSON.stringify(data)).unlocked, 0, '支线断点不把基础进度设成不存在的机房');
});

test('撤销恢复完整脉冲与布局；无效操作不占用历史，重入可以清空', () => {
  const s = new Simulation(LEVELS[0]), history = new History();
  s.player = { x: 4, y: 6 }; const before = s.snapshot();
  history.perform(s, () => s.interact()); assert.equal(history.size, 1); assert.ok(s.carried);
  advance(s, .5); assert.equal(history.undo(s), true); assert.deepEqual(s.snapshot(), before);
  assert.equal(s.drainEvents().length, 0); assert.equal(history.undo(s), false);
  s.player = { x: 1, y: 1 }; history.perform(s, () => s.interact()); assert.equal(history.size, 0);
  s.player = { x: 4, y: 6 }; history.perform(s, () => s.interact()); history.clear(); assert.equal(history.size, 0);
});

test('观察路径将传送作为断开的线段，不画穿墙假光线；关闭光闸会终止预览', () => {
  const s = make(LEVELS[8]); s.mirrors = structuredClone(s.level.solution);
  assert.ok(s.trace().some(p => p.jump && p.x === 6 && p.y === 2));
  const gate = make(LEVELS[7]); gate.mirrors = structuredClone(gate.level.solution).slice(0, 1);
  const blocked = gate.trace(); assert.deepEqual(blocked.at(-1), { x: 3, y: 5 });
  gate.player = { x: 4, y: 3 }; assert.ok(gate.trace().some(p => p.x === 8 && p.y === 2));
});

test('手柄肩键以边沿触发撤销', () => {
  const pad = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 4, value: Number(i === 4), touched: false })) };
  const c = new Controller(); assert.equal(c.read(pad, .016).undo, true); assert.equal(c.read(pad, .016).undo, false);
});

test('移除新装置会破坏对应参考解，光闸和导光井确实参与通关', () => {
  const gate = make(LEVELS[7]); gate.sourceOn = true; gate.mirrors = structuredClone(gate.level.solution).slice(0, 1);
  advance(gate, 20); assert.equal(gate.powered, false);
  const well = make({ ...LEVELS[8], portals: [] }); well.sourceOn = true; well.mirrors = structuredClone(well.level.solution);
  advance(well, 20); assert.equal(well.receivers.top.charge, 0);
});

test('导光井出口仍然危险，传送时不能跳过角色碰撞', () => {
  const s = make(LEVELS[8]); s.player = { x: 6, y: 2 }; s.pulses = [pulse(10, 4.2, 0, -1)];
  for (let i = 0; i < 10; i++) s.step(1 / 120);
  assert.equal(s.hits, 1); assert.equal(s.pulses.length, 0); assert.deepEqual(s.player, s.level.spawn);
});

test('新机关没有与墙、接收环或彼此重叠，所有光闸都有对应压板', () => {
  for (const level of LEVELS.slice(7)) {
    const cells = [...(level.plates ?? []), ...(level.gates ?? []), ...(level.inverters ?? []), ...(level.portals ?? []).flatMap(p => [p.a, p.b])];
    assert.equal(new Set(cells.map(c => `${c.x},${c.y}`)).size, cells.length);
    for (const c of cells) {
      assert.ok(c.x > 0 && c.x < 12 && c.y > 0 && c.y < 8);
      assert.ok(!level.walls.some(w => w.x === c.x && w.y === c.y));
      assert.ok(!level.receivers.some(r => r.x === c.x && r.y === c.y));
    }
    for (const g of level.gates ?? []) assert.ok(level.plates?.some(p => p.id === g.plate));
  }
});
