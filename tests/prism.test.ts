import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';
import { reflectiveSlash } from '../src/optics';
import { validSnapshot, defaults, exportSave, importSave } from '../src/storage';
import { forecast } from '../src/forecast';
import { History } from '../src/history';
import { CHAPTERS, chapterFor, roomPlan } from '../src/chapters';
import { EnvironmentArt } from '../src/environment';

const advance = (s: Simulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.step(1 / 120, false); };
/** Long-run fixture. Separate engine tests construct every room through actual
 * walking, carrying, rotation and recording actions instead of this fixture. */
function circuit(id: number) {
  const s = new Simulation(LEVELS[id]); s.mirrors = structuredClone(s.level.solution); s.player = { x: 1, y: 1 }; s.spawnTimer = 0;
  for (const recipe of s.level.echoSolution ?? []) {
    let time = 0, current = recipe.start; const points = [{ ...current, t: 0 }];
    for (const step of recipe.steps) {
      time += Math.hypot(step.target.x - current.x, step.target.y - current.y) / 3.2;
      points.push({ ...step.target, t: time }); time += step.wait; points.push({ ...step.target, t: time }); current = step.target;
    }
    const duration = recipe.period ?? Math.max(.5, time), ratio = duration / Math.max(time, .5);
    if (time < .5) points.push({ ...current, t: .5 });
    s.echoes.push({ points: points.map(p => ({ ...p, t: p.t * ratio })), duration, time: 0 });
  }
  return s;
}

test('双色棱镜对四种来向分别按暖／冷斜面反射，普通镜不依赖颜色', () => {
  const directions = [
    { dx: 1, dy: 0, warm: [0, -1], cool: [0, 1] }, { dx: -1, dy: 0, warm: [0, 1], cool: [0, -1] },
    { dx: 0, dy: 1, warm: [-1, 0], cool: [1, 0] }, { dx: 0, dy: -1, warm: [1, 0], cool: [-1, 0] },
  ];
  for (const { dx, dy, warm, cool } of directions) for (const phase of ['warm', 'cool'] as const) {
    const s = new Simulation(LEVELS[0]); s.sourceOn = false; s.player = { x: 1, y: 1 };
    s.mirrors = [{ id: 'p', kind: 'prism', x: 6, y: 4, slash: true }];
    s.pulses = [{ id: 37, x: 6 - dx * .5, y: 4 - dy * .5, dx, dy, phase, wait: 0, last: '', age: 0 }]; advance(s, .2);
    const p = s.pulses[0]; assert.ok(p); assert.deepEqual([p.dx || 0, p.dy || 0], phase === 'warm' ? warm : cool);
    assert.equal(p.id, 37); assert.equal(p.phase, phase); assert.equal(Math.hypot(p.dx, p.dy), 1);
    assert.equal(s.drainEvents().filter(e => e.type === 'reflect' && e.prism && e.phase === phase).length, 1);
    assert.equal(reflectiveSlash({ ...s.mirrors[0], kind: undefined }, phase), true);
  }
});
test('旋转双色棱镜交换冷暖方向；携带、放置、读档与撤销均保留器件类型', () => {
  const s = new Simulation(LEVELS[18]), history = new History(); s.sourceOn = false; s.player = { x: 8, y: 5 }; s.facing = { x: 0, y: -1 };
  const initial = s.snapshot(); history.perform(s, () => s.interact()); assert.equal(s.carried?.kind, 'prism');
  const before = reflectiveSlash(s.carried!, 'warm'); s.rotate(); assert.equal(reflectiveSlash(s.carried!, 'warm'), !before); assert.equal(reflectiveSlash(s.carried!, 'cool'), before);
  const save = defaults(); save.checkpoint = s.snapshot(); const transferred = importSave(exportSave(save));
  const other = new Simulation(s.level); other.restore(transferred.checkpoint!); assert.equal(other.carried?.kind, 'prism');
  other.facing = { x: 1, y: 0 }; other.interact(); assert.equal(other.carried, null); assert.equal(other.mirrors.find(m => m.id === 'switch')?.kind, 'prism');
  history.undo(s); assert.deepEqual(s.snapshot(), initial);
});
test('棱镜存档拒绝伪造或丢失的类型，原版普通镜快照仍然兼容', () => {
  const s = circuit(18), snapshot = s.snapshot(); assert.equal(validSnapshot(snapshot), true);
  const changed = structuredClone(snapshot); delete changed.mirrors.find(m => m.kind === 'prism')!.kind; assert.equal(validSnapshot(changed), false);
  const legacy = new Simulation(LEVELS[0]).snapshot(); assert.equal(validSnapshot(legacy), true);
  legacy.mirrors[0].kind = 'prism'; assert.equal(validSnapshot(legacy), false);
});
for (const id of [18, 19, 20, 21]) {
  test(`分光工单 ${id + 1}：关源后两分钟保持同一颗光，不丢失、不增发、不断电`, () => {
    const s = circuit(id); advance(s, 24); assert.equal(s.stable, true); assert.equal(s.pulses.length, 1); const idBefore = s.pulses[0].id;
    s.sourceOn = false;
    for (let i = 0; i < 120 * 120; i++) { s.step(1 / 120, false); assert.equal(s.stable, true); }
    assert.equal(s.pulses[0].id, idBefore); assert.equal(s.stats.emitted, 1); assert.equal(s.stats.lost, 0);
  });
}
test('去掉中心棱镜或换相器后，参考支路不再全部循环供电', () => {
  for (const remove of ['prism', 'inverter']) {
    const s = circuit(18);
    if (remove === 'prism') delete s.mirrors.find(m => m.id === 'switch')!.kind;
    else s.level = { ...s.level, inverters: [] };
    advance(s, 30); assert.equal(s.stable, false);
  }
});
test('双色静态光路以相位作为循环状态，交叉光路完整遍历四次棱镜回应', () => {
  const s = circuit(19), before = s.snapshot(), route = s.opticalRoute(); assert.equal(route.end, 'loop');
  const atCenter = route.points.filter(p => p.x === 6 && p.y === 4);
  assert.ok(atCenter.filter(p => p.phase === 'warm').length >= 2); assert.ok(atCenter.filter(p => p.phase === 'cool').length >= 2);
  assert.ok(route.points.some(p => p.x === 4 && p.y === 2)); assert.ok(route.points.some(p => p.x === 8 && p.y === 6));
  const expected = route.points.filter(p => s.mirrors.some(m => m.x === p.x && m.y === p.y)).map(p => [p.x, p.y, p.phase]);
  const events: unknown[][] = [];
  for (let i = 0; i < 1800 && events.length < expected.length; i++) { s.step(1 / 120, false); for (const e of s.drainEvents()) if (e.type === 'reflect') events.push([e.x, e.y, e.phase]); }
  assert.deepEqual(events.slice(0, expected.length - 1), expected.slice(0, -1));
  s.restore(before); assert.deepEqual(s.snapshot(), before);
});
test('静态路线明确区分关闭光闸、墙体、边界与传送断开，且不改写当前状态', () => {
  const s = circuit(20); s.echoes = []; const before = s.snapshot(), blocked = s.opticalRoute(); assert.equal(blocked.end, 'gate'); assert.ok(blocked.points.some(p => p.jump)); assert.deepEqual(s.snapshot(), before);
  s.level = { ...s.level, gates: [], walls: [{ x: 7, y: 2 }] }; assert.equal(s.opticalRoute().end, 'wall');
  const empty = new Simulation({ ...LEVELS[0], walls: [] }); empty.mirrors = []; assert.equal(empty.opticalRoute().end, 'edge');
});
test('推演包含双色路由和回声闸时序，与相同步长的实际运行逐帧一致', () => {
  const s = circuit(21); s.invulnerable = 0; const before = s.snapshot(), result = forecast(s);
  assert.deepEqual(s.snapshot(), before);
  for (const frame of result.frames.slice(1)) { for (let i = 0; i < 15; i++) s.step(1 / 120); assert.deepEqual(s.snapshot(), frame.state); }
  assert.ok(result.firstStable !== undefined);
});
test('章节覆盖全部工单且编号连续；缩略图只展示开工布局，保持原关卡数据', () => {
  assert.equal(CHAPTERS[0].start, 0); assert.equal(CHAPTERS.at(-1)!.end, LEVELS.length);
  for (let i = 1; i < CHAPTERS.length; i++) assert.equal(CHAPTERS[i].start, CHAPTERS[i - 1].end);
  for (const level of LEVELS) assert.ok(chapterFor(level.id).start <= level.id && chapterFor(level.id).end > level.id);
  const level = LEVELS[18], before = structuredClone(level), plan = roomPlan(level); assert.ok(plan.includes('viewBox')); assert.deepEqual(level, before);
  assert.ok(plan.includes('M77 43')); // Starting prism (8,4), not solution (6,4).
});
test('分光温室玻璃装饰在减少动态模式归位，共用几何与线框全部释放', () => {
  const canvas = () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) as unknown as HTMLCanvasElement;
  const art = new EnvironmentArt(canvas); art.build(LEVELS[18]);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  art.group.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Line) { if (o.geometry.type !== 'BoxGeometry') geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
  let disposed = 0; [...geometries, ...materials].forEach(resource => resource.addEventListener('dispose', () => disposed++));
  art.update(10, true, true, 1); art.update(10, false, false, 0); art.clear(); assert.equal(disposed, geometries.size + materials.size); assert.equal(art.group.children.length, 0);
});
