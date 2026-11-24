import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/engine';
import { forecast, forecastFindings, forecastMessage } from '../src/forecast';
import { LEVELS } from '../src/levels';
import { REPAIRS, createRepair } from '../src/repairs';

function send(sim: Simulation, x: number, y: number, dx: number, dy: number) {
  sim.sourceOn = false;
  sim.pulses = [{ id: 1, x, y, dx, dy, age: 0, wait: 0, last: '', phase: 'warm' }];
}
const repair = (id: string) => createRepair(REPAIRS.find(r => r.id === id)!);

test('撞墙与撞闸原因来自真实碰撞，故障索引落在事件发生后的首个采样帧', () => {
  for (const [sim, x, y, dx, dy, reason, label] of [
    [new Simulation(LEVELS[0]), 9, 4, 1, 0, 'wall', '墙面'],
    [repair('carbon'), 4, 6, 1, 0, 'gate', 'I＋II 号光闸'],
    [repair('bell'), 11, 2, 1, 0, 'edge', '右侧边界'],
  ] as const) {
    send(sim, x, y, dx, dy);
    const future = forecast(sim, 1);
    const loss = future.events.find(e => e.event.type === 'lost')!;
    assert.equal(loss.event.reason, reason);
    const faults = forecastFindings(future, sim.level);
    assert.equal(faults.length, 1); assert.ok(faults[0].label.includes(label));
    const f = faults[0];
    assert.equal(f.time, loss.time);
    assert.ok(future.frames[f.frame].time >= f.time && future.frames[f.frame - 1].time < f.time);
    assert.deepEqual(f.cell, { x: Math.round(loss.event.x!), y: Math.round(loss.event.y!) });
    sim.step(.2);
    assert.equal(sim.drainEvents().find(e => e.type === 'lost')?.reason, reason);
  }
});

test('推演保留受伤前的值守位置，画面采样中的维修员已重生', () => {
  const sim = new Simulation(LEVELS[0]); sim.player = { x: 7.1, y: 4 };
  send(sim, 6.9, 4, 1, 0);
  const future = forecast(sim, .5);
  const hit = future.events.find(e => e.event.type === 'hit')!;
  assert.deepEqual({ x: hit.event.x, y: hit.event.y }, sim.player);
  const [f] = forecastFindings(future, sim.level);
  assert.deepEqual(f.cell, { x: 7, y: 4 });
  assert.deepEqual(future.frames[f.frame].state.player, sim.level.spawn);
});

test('同一部件重复拒收只报告第一次，含来光颜色、部件名与位置', () => {
  const sim = repair('seasons'), future = forecast(sim);
  const rejected = future.events.filter(e => e.event.type === 'reject');
  assert.ok(rejected.length > 1);
  assert.equal(rejected[0].event.phase, 'warm'); assert.equal(rejected[0].event.receiverId, 'lower');
  const findings = forecastFindings(future, sim.level).filter(f => f.label.includes('拒收'));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].time, rejected[0].time);
  assert.deepEqual(findings[0].cell, { x: 4, y: 6 }); assert.match(findings[0].label, /夜间苗床拒收暖光/);
});

test('供电到期绑定到具体接收环，起点稳定的工单没有漏接诊断', () => {
  const sim = repair('freight'); sim.sourceOn = false;
  for (const s of Object.values(sim.receivers)) { s.hits = 2; s.charge = .02; s.lastPulse = 12; }
  const future = forecast(sim);
  assert.equal(future.firstStable, 0);
  assert.match(forecastMessage(future), /将中断/);
  assert.deepEqual(future.events.filter(e => e.event.type === 'expire').map(e => e.event.receiverId), ['gate', 'lift']);
  const findings = forecastFindings(future, sim.level);
  assert.deepEqual(findings.map(f => f.label), ['独立供电 · 供电到期', '中继模块 · 供电到期']);
});

test('回路一直运行却漏过货梯，要到观察窗末尾才报告漏接事实', () => {
  const sim = repair('freight'), future = forecast(sim);
  assert.equal(future.lost, 0);
  assert.ok(future.events.filter(e => e.event.receiverId === 'gate' && e.event.type === 'charge').length >= 2);
  const [f] = forecastFindings(future, sim.level);
  assert.equal(f.frame, future.frames.length - 1); assert.equal(f.time, 12);
  assert.deepEqual(f.cell, { x: 10, y: 4 }); assert.match(f.label, /观察窗内，光未到达中继模块/);
});

test('短窗、无光和已经通过验证的持续回路不会误报漏接', () => {
  const sim = repair('freight');
  assert.deepEqual(forecastFindings(forecast(sim, 10), sim.level), []);
  sim.sourceOn = false;
  assert.deepEqual(forecastFindings(forecast(sim), sim.level), []);
  sim.sourceOn = true; sim.mirrors = structuredClone(sim.level.solution);
  for (let t = 0; t < 120 * 20; t++) sim.step(1 / 120);
  const future = forecast(sim);
  assert.equal(future.firstStable, 0); assert.deepEqual(forecastFindings(future, sim.level), []);
  assert.match(forecastMessage(future), /当前回路已通过/);
});
