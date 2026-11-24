import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';
import { forecast, forecastMessage, TrialAnchor } from '../src/forecast';
const advance = (sim: Simulation, t: number) => { for (let n = 0; n < t * 120; n++) sim.step(1 / 120, false); };

test('未来推演隔离快照和事件，不消耗实际时间、生命、录制或布局', () => {
  const live = new Simulation(LEVELS[13]); live.toggleRecording(); advance(live, .3);
  const before = live.snapshot(), events = structuredClone(live.events);
  const result = forecast(live);
  assert.deepEqual(live.snapshot(), before); assert.deepEqual(live.events, events);
  assert.equal(result.frames[0].time, 0); assert.equal(result.frames.at(-1)!.time, 12);
  assert.equal(result.frames.at(-1)!.state.recording, null);
  result.frames[0].state.player.x = 9; assert.deepEqual(live.snapshot(), before);
});
test('推演与实际运行相同条件下逐帧一致，包含真实受击', () => {
  const live = new Simulation(LEVELS[0]); live.sourceOn = false; live.player = { x: 7, y: 4 };
  live.pulses = [{ id: 1, x: 6.9, y: 4, dx: 1, dy: 0, last: '', age: 0, wait: 0 }];
  const prediction = forecast(live, .5);
  const copy = new Simulation(live.level); copy.restore(live.snapshot()); copy.invulnerable = live.invulnerable;
  for (let i = 0; i < 60; i++) copy.step(1 / 120);
  assert.deepEqual(prediction.frames.at(-1)!.state, copy.snapshot()); assert.equal(prediction.hits, 1);
  assert.match(forecastMessage(prediction), /冲击/);
});
test('稳定回路的推演确认供电与重复编号，事件对应接收环', () => {
  const live = new Simulation(LEVELS[2]); live.player = { x: 1, y: 1 }; live.mirrors = structuredClone(live.level.solution);
  const result = forecast(live); assert.ok(result.firstStable !== undefined);
  assert.equal(result.frames.at(-1)!.stable, true); assert.equal(result.lost, 0);
  assert.ok(result.events.some(e => e.event.type === 'charge'));
});
test('人先启动，接收环接管；离开压板仍放行，失电后重新关闭', () => {
  const sim = new Simulation(LEVELS[7]); sim.mirrors = [structuredClone(sim.level.solution[0]), { ...sim.level.mirrors[1] }];
  sim.player = { x: 4, y: 3 }; advance(sim, 5);
  assert.equal(sim.powered, true); sim.player = { x: 5, y: 3 };
  assert.equal(sim.plateActive('I'), false); assert.equal(sim.gateOpen(sim.level.gates![0]), true);
  advance(sim, 20); assert.equal(sim.powered, true, '一面工作镜无需额外压舱物即可自持');
  sim.sourceOn = false; sim.pulses = []; advance(sim, 12);
  assert.equal(sim.gateOpen(sim.level.gates![0]), false);
});
test('推演显示接收环接管和原地等待的假设，关源副本不会改变实际来源', () => {
  const sim = new Simulation(LEVELS[7]); sim.mirrors = structuredClone(sim.level.solution); sim.player = { x: 1, y: 1 };
  const f = forecast(sim); assert.ok(f.frames.some(frame => frame.powered));
  assert.ok(f.frames.some(frame => frame.gates[0])); assert.equal(sim.elapsed, 0);
});
test('试验点可重复恢复完整脉冲与回声，清空或跨关不会回写', () => {
  const sim = new Simulation(LEVELS[13]), trial = new TrialAnchor(); sim.sourceOn = false;
  sim.toggleRecording(); advance(sim, .8); sim.toggleRecording(); const before = sim.snapshot();
  trial.set(sim); advance(sim, 2); sim.removeEcho();
  assert.equal(trial.restore(sim), true); assert.deepEqual(sim.snapshot(), before);
  sim.player.x = 9; trial.restore(sim); assert.deepEqual(sim.snapshot(), before);
  assert.equal(trial.restore(new Simulation(LEVELS[0])), false);
  trial.clear(); assert.equal(trial.exists, false); assert.equal(trial.restore(sim), false);
});
test('错误相位和供电超时产生可定位事件，拒绝不会刷新设备', () => {
  const sim = new Simulation(LEVELS[9]); sim.sourceOn = false; sim.mirrors = [];
  sim.pulses = [{ id: 1, x: 10, y: 4.4, dx: 0, dy: -1, last: '', wait: 0, age: 0, phase: 'warm' }];
  sim.receivers.warm.charge = .1; advance(sim, .3);
  const events = sim.drainEvents(); assert.ok(events.some(e => e.type === 'reject' && e.x === 10 && e.y === 4));
  assert.ok(events.some(e => e.type === 'expire' && e.x === 4 && e.y === 2));
  assert.equal(sim.receivers.cold.charge, 0);
});
