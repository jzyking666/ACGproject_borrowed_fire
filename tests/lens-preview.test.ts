import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/engine';
import { LEVELS, type Level, type Mirror } from '../src/levels';
import { LensPreview, opticalStrokes } from '../src/lens-preview';

const mirror = (id: string, x: number, y: number, slash = false): Mirror => ({ id, x, y, slash });
function room(extra: Partial<Level> = {}) {
  const level: Level = { ...LEVELS[0], source: { x: 2, y: 4, dx: 1, dy: 0 }, spawn: { x: 6, y: 4 }, walls: [], mirrors: [mirror('a', 5, 4)],
    receivers: [{ id: 'north', name: '北线', x: 5, y: 2, ttl: 9, phase: 'warm' }, { id: 'south', name: '南线', x: 5, y: 6, ttl: 9, phase: 'cool' }], ...extra };
  Object.defineProperty(level, 'solution', { get() { throw new Error('试镜不能读取解答'); } });
  return new Simulation(level);
}

test('在图纸上试转与游戏中单独转动目标的光路相同，实况不消耗任何动作或事件', () => {
  const s = room(); s.step(.05); s.events.push({ type: 'pickup' });
  const before = s.snapshot(), waiting = structuredClone(s.events), lens = new LensPreview(s);
  const trial = lens.turn(0)!;
  assert.deepEqual(trial.turn, { at: { x: 5, y: 4 }, before: { x: 0, y: 1 }, after: { x: 0, y: -1 } });
  assert.deepEqual(lens.original.arrivals, { north: [], south: ['warm'] });
  assert.deepEqual(trial.reading.arrivals, { north: ['warm'], south: [] });
  assert.equal(lens.turn(0), trial);
  assert.deepEqual(s.snapshot(), before); assert.deepEqual(s.events, waiting);
  s.rotate(); assert.equal(s.moves, 1); assert.deepEqual(trial.reading.route, s.opticalRoute());
});

test('切换试转对象总是从开台时的同一布局开始，固定镜、手中镜和不存在的目标均不可试转', () => {
  const s = room({ mirrors: [mirror('at-beam', 5, 4), mirror('off-beam', 6, 6), { ...mirror('fixed', 1, 2), fixed: true }] });
  const lens = new LensPreview(s);
  assert.deepEqual(lens.choices.map(m => m.id), ['at-beam', 'off-beam']);
  const a = lens.turn(0)!;
  const b = lens.turn(1)!;
  assert.deepEqual(b.reading, lens.original); assert.equal(b.turn, undefined);
  assert.ok(a.turn); assert.equal(lens.turn(0), a);
  for (const index of [2, -1, Infinity, .5]) assert.equal(lens.turn(index), undefined);
  s.interact(); assert.equal(s.carried?.id, 'at-beam');
  const held = new LensPreview(s); assert.deepEqual(held.choices.map(m => m.id), ['off-beam']); assert.ok(held.carrying);
  assert.deepEqual(lens.original.route, b.reading.route);
});

test('闭闸会遮断两张图；暂停时脚下的开关状态保留，换镜过程中不会推进回声', () => {
  const s = room({ plates: [{ id: 'p', x: 9, y: 5, echoOnly: true }], gates: [{ x: 4, y: 4, plate: 'p' }] });
  const closed = new LensPreview(s);
  assert.deepEqual(closed.gates, [false]); assert.equal(closed.original.route.end, 'gate'); assert.deepEqual(closed.turn(0)?.reading, closed.original);
  s.echoes = [{ points: [{ x: 9, y: 5, t: 0 }, { x: 8, y: 5, t: 1 }], duration: 1, time: 0 }];
  const opened = new LensPreview(s);
  s.echoes = []; s.mirrors[0].slash = true;
  assert.deepEqual(opened.gates, [true]); assert.deepEqual(opened.original.arrivals.south, ['warm']);
  assert.deepEqual(opened.turn(0)?.reading.arrivals.north, ['warm']);
  assert.equal(new LensPreview(s).original.route.end, 'gate');
});

test('换相后的冷光使用棱镜另一斜面；图纸分段在换相格分色，进出导光井之间不连线', () => {
  const s = room({ portals: [{ id: 'W', a: { x: 4, y: 4 }, b: { x: 7, y: 4 } }], inverters: [{ x: 3, y: 4 }],
    mirrors: [{ ...mirror('prism', 9, 4), kind: 'prism' }],
    receivers: [{ id: 'cold', x: 9, y: 2, ttl: 9, name: '北环', phase: 'cool' }, { id: 'warm', x: 9, y: 6, ttl: 8, name: '南环', phase: 'warm' }] });
  const lens = new LensPreview(s), trial = lens.turn(0)!;
  assert.deepEqual(lens.original.arrivals, { cold: ['cool'], warm: [] });
  assert.deepEqual(trial.reading.arrivals, { cold: [], warm: ['cool'] });
  assert.deepEqual(trial.turn, { at: { x: 9, y: 4 }, before: { x: 0, y: -1 }, after: { x: 0, y: 1 } });
  for (const reading of [lens.original, trial.reading]) {
    const runs = opticalStrokes(reading.route);
    assert.deepEqual(runs.map(run => [run.phase, run.points[0].x, run.points.at(-1)!.x]), [['warm', 2, 3], ['cool', 3, 4], ['cool', 7, 9]]);
    for (const run of runs) for (let i = 1; i < run.points.length; i++) {
      const a = run.points[i - 1], b = run.points[i]; assert.equal(Math.abs(b.x - a.x) + Math.abs(b.y - a.y), 1);
    }
  }
});

test('无活动镜时仍可读出停在墙上的源光路；关源也能做纸面试验', () => {
  const s = room({ mirrors: [{ ...mirror('fixed', 5, 4), fixed: true }], walls: [{ x: 5, y: 5 }] });
  s.sourceOn = false;
  const lens = new LensPreview(s); assert.deepEqual(lens.choices, []); assert.equal(lens.turn(0), undefined);
  assert.equal(lens.original.route.end, 'wall'); assert.deepEqual(lens.original.arrivals, { north: [], south: [] });
  assert.deepEqual(s.pulses, []); assert.equal(s.elapsed, 0);
});

test('温室的一张图同时保留曾经到达的两种相位，试转能改变同一回路的分支次序', () => {
  const s = new Simulation(LEVELS[19]); s.mirrors = structuredClone(s.level.solution);
  const lens = new LensPreview(s), index = lens.choices.findIndex(m => m.kind === 'prism');
  assert.equal(lens.original.route.end, 'loop');
  const arrivals = Object.values(lens.original.arrivals);
  assert.ok(arrivals.every(p => p.includes('cool') && p.includes('warm')));
  const trial = lens.turn(index)!; assert.ok(trial.turn); assert.notDeepEqual(trial.reading.route, lens.original.route);
});
