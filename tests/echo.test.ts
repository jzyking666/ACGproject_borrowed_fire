import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';
import { echoPosition, validEcho } from '../src/echo';
import { validSnapshot, parseSave } from '../src/storage';
import { History } from '../src/history';
import { Controller } from '../src/controller';
const advance = (s: Simulation, seconds: number) => { for (let t = 0; t < seconds - 1e-8; t += 1 / 120) s.step(Math.min(1 / 120, seconds - t), false); };
const make = (id = 13) => { const s = new Simulation(LEVELS[id]); s.sourceOn = false; return s; };
const stay = (s: Simulation, x: number, y: number) => { s.player = { x, y }; s.toggleRecording(); advance(s, .8); s.toggleRecording(); };

test('回声按时间插值并循环，静止轨迹也有有效持续时间', () => {
  const e = { points: [{ x: 2, y: 3, t: 0 }, { x: 4, y: 3, t: 1 }], duration: 1, time: .25 };
  assert.deepEqual(echoPosition(e), { x: 2.5, y: 3 });
  assert.deepEqual(echoPosition({ ...e, time: 1.25 }), { x: 2.5, y: 3 });
  const s = make(); s.toggleRecording(); s.toggleRecording(); assert.ok(validEcho(s.echoes[0]));
});
test('六秒自动结束录制一次，采样有界且可序列化', () => {
  const s = make(); s.toggleRecording(); advance(s, 6.2);
  assert.equal(s.recording, null); assert.equal(s.echoes.length, 1);
  assert.ok(s.echoes[0].points.length <= 200); assert.ok(validSnapshot(s.snapshot()));
  assert.equal(s.drainEvents().filter(e => e.type === 'echo').length, 1);
});
test('双锁同时需要两个投影；人和反射器不能代替示教板', () => {
  const s = make(); s.player = { x: 4, y: 4 }; s.mirrors[0] = { ...s.mirrors[0], x: 8, y: 4 };
  assert.equal(s.plateActive('I'), false); assert.equal(s.plateActive('II'), false);
  stay(s, 4, 4); assert.equal(s.plateActive('I'), true); assert.equal(s.gateOpen(s.level.gates![0]), false);
  stay(s, 8, 4); assert.equal(s.gateOpen(s.level.gates![0]), true);
  s.removeEcho(); assert.equal(s.gateOpen(s.level.gates![0]), false);
});
test('互锁光闸不能用静止回声通关，巡逻可以依次放行', () => {
  const s = make(14); s.mirrors = structuredClone(s.level.solution); stay(s, 4, 3); s.player = { x: 1, y: 1 }; s.sourceOn = true;
  advance(s, 20); assert.equal(s.powered, false);
  s.echoes[0] = { duration: 1.8, time: 0, points: [{ x: 4, y: 3, t: 0 }, { x: 4, y: 3, t: .55 }, { x: 4, y: 4, t: .85 }, { x: 4, y: 4, t: 1.5 }, { x: 4, y: 3, t: 1.8 }] };
  let powered = false; for (let i = 0; i < 120 * 30; i++) { s.step(1 / 120, false); powered ||= s.powered; }
  assert.equal(powered, true);
});
test('示教、取消与移除都可撤销，恢复完整轨迹和播放位置', () => {
  const s = make(), h = new History(); stay(s, 4, 4); const before = s.snapshot();
  h.perform(s, () => s.removeEcho()); assert.equal(s.echoes.length, 0); h.undo(s); assert.deepEqual(s.snapshot(), before);
  h.perform(s, () => s.toggleRecording()); advance(s, .3); h.undo(s); assert.deepEqual(s.snapshot(), before);
});
test('播放与正在录制的轨迹可读档；旧快照缺字段时安全恢复', () => {
  const s = make(); stay(s, 4, 4); s.player = { x: 8, y: 4 }; s.toggleRecording(); advance(s, .3);
  const snapshot = s.snapshot(); assert.equal(validSnapshot(snapshot), true);
  const other = make(); other.restore(snapshot); advance(s, .6); advance(other, .6); assert.deepEqual(other.snapshot(), s.snapshot());
  const old = { ...snapshot }; delete old.echoes; delete old.recording;
  other.restore(old); assert.equal(other.echoes.length, 0); assert.equal(other.recording, null);
  assert.equal(parseSave(JSON.stringify({ version: 1, checkpoint: snapshot })).checkpoint?.level, 13);
});
test('损坏、超长、倒序和超容量示教不能成为有效存档', () => {
  const s = make(); stay(s, 4, 4); const snap = s.snapshot(), track = s.echoes[0];
  for (const bad of [{ ...track, duration: 0 }, { ...track, time: Infinity }, { ...track, points: [] }, { ...track, points: [{ x: 4, y: 4, t: .5 }, { x: 4, y: 4, t: 0 }] }]) assert.equal(validSnapshot({ ...snap, echoes: [bad] }), false);
  assert.equal(validSnapshot({ ...snap, echoes: [track, track, track] }), false);
  assert.equal(validSnapshot({ ...snap, recording: { points: [], elapsed: 30 } }), false);
});
test('投影不成为碰撞体，也不反射脉冲；容量满时不会覆盖旧轨迹', () => {
  const s = make(); stay(s, 6, 5); stay(s, 8, 4); const count = s.moves;
  s.toggleRecording(); assert.equal(s.recording, null); assert.equal(s.moves, count); assert.equal(s.echoes.length, 2);
  s.player = { x: 1, y: 1 }; assert.equal(s.collides(6, 5), false);
  s.pulses = [{ id: 1, x: 5.7, y: 5, dx: 1, dy: 0, last: '', wait: 0, age: 0 }];
  advance(s, .2); assert.equal(s.pulses[0].dx, 1); assert.ok(s.pulses[0].x > 6);
});
test('手柄 LT 示教、RB 移除按边沿触发', () => {
  const pad = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 5 || i === 6, value: Number(i === 5 || i === 6), touched: false })) };
  const controller = new Controller(); const first = controller.read(pad, .016), held = controller.read(pad, .016);
  assert.equal(first.record, true); assert.equal(first.erase, true); assert.equal(held.record, false); assert.equal(held.erase, false);
});
