import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';
import { echoPosition, validEcho } from '../src/echo';
import { History } from '../src/history';
import { challengesFor, achievedChallenges } from '../src/mastery';
import { defaults, parseSave, validSnapshot, importSave, exportSave } from '../src/storage';
import { occupancy, routeMap } from '../src/echo-editor';
import { batchStaticBoxes } from '../src/batching';
import { PulseRibbon } from '../src/pulse-ribbon';
import { EnvironmentArt } from '../src/environment';
import { auditRectangles } from '../scripts/audit-levels';

const advance = (s: Simulation, seconds: number) => { for (let t = 0; t < seconds - 1e-8; t += 1 / 120) s.step(Math.min(1 / 120, seconds - t), false); };
function clockRoom() {
  const s = new Simulation(LEVELS[17]); s.mirrors = structuredClone(s.level.solution); s.player = { x: 1, y: 1 }; s.spawnTimer = 0;
  s.echoes = [{ duration: 24 / 4.2, time: 0, points: [{ x: 4, y: 4, t: 0 }, { x: 4, y: 4, t: .23 }, { x: 7, y: 4, t: 1.1675 }, { x: 7, y: 4, t: 1.7675 }, { x: 4, y: 4, t: 2.705 }, { x: 4, y: 4, t: 24 / 4.2 }] }];
  return s;
}
test('时序末关一段巡逻持续供电；失去任一检查点都破坏线路', () => {
  const s = clockRoom(); advance(s, 12); assert.equal(s.stable, true); assert.equal(s.stats.emitted, 1);
  s.sourceOn = false; advance(s, 90); assert.equal(s.stable, true); assert.equal(s.stats.lost, 0);
  for (const plate of s.level.plates!) {
    const broken = clockRoom(); broken.echoes[0].points.forEach(p => { p.x = plate.x; p.y = plate.y; });
    advance(broken, 25); assert.equal(broken.stable, false);
  }
});
test('周期错误会逐圈失约，相位调整不会替代周期匹配', () => {
  const s = clockRoom(); s.retimeEcho(0, 5.4); advance(s, 40); assert.ok(s.stats.lost > 0); assert.equal(s.stable, false);
});
test('回声相位只调整选中轨迹，负向越界循环；调周期保留路径和归一化进度', () => {
  const s = clockRoom(); s.echoes.push(structuredClone(s.echoes[0])); const other = structuredClone(s.echoes[1]);
  const duration = s.echoes[0].duration; s.shiftEcho(0, -.05); assert.ok(Math.abs(s.echoes[0].time - (duration - .05)) < 1e-8); assert.deepEqual(s.echoes[1], other);
  const before = echoPosition(s.echoes[0]), phase = s.echoes[0].time / duration;
  s.retimeEcho(0, 6); assert.deepEqual(echoPosition(s.echoes[0]), before); assert.ok(Math.abs(s.echoes[0].time / 6 - phase) < 1e-8); assert.ok(validEcho(s.echoes[0]));
  const snapshot = s.snapshot(); for (const invalid of [NaN, Infinity, 0, 7]) s.retimeEcho(0, invalid); s.shiftEcho(0, NaN); s.eraseEcho(-1);
  assert.deepEqual(s.snapshot(), snapshot);
});
test('相位、周期、选定删除与同步均可完整撤销；示教期间禁止编辑已有轨迹', () => {
  const s = clockRoom(), h = new History(), before = s.snapshot();
  for (const action of [() => s.shiftEcho(0, .5), () => s.retimeEcho(0, 4), () => s.eraseEcho(0), () => s.synchronizeEchoes()]) {
    h.perform(s, action); assert.equal(h.size, 1); h.undo(s); assert.deepEqual(s.snapshot(), before);
  }
  s.level = { ...s.level, echoLimit: 2 }; s.toggleRecording(); const recording = s.snapshot();
  s.shiftEcho(0, .5); s.retimeEcho(0, 4); s.eraseEcho(0); s.synchronizeEchoes(); assert.deepEqual(s.snapshot(), recording);
});
test('同步在没有脉冲且来源在线时立即发射，已有脉冲不清除，离线来源不重启', () => {
  const s = clockRoom(); s.spawnTimer = 4; s.synchronizeEchoes(); s.step(.01, false); assert.equal(s.pulses.length, 1);
  const pulse = structuredClone(s.pulses[0]); s.synchronizeEchoes(); assert.deepEqual(s.pulses[0], pulse);
  s.sourceOn = false; s.pulses = []; s.synchronizeEchoes(); s.step(.01, false); assert.equal(s.pulses.length, 0); assert.equal(s.sourceOn, false);
});
test('调度器占板时间条与真实板状态一致，地图包含全部轨迹且不改写数据', () => {
  const s = clockRoom(), before = s.snapshot(), plate = s.level.plates![0], samples = occupancy(s.echoes[0], plate);
  samples.forEach((on, i) => { s.echoes[0].time = i / samples.length * s.echoes[0].duration; assert.equal(s.plateActive(plate.id), on); });
  s.restore(before); const svg = routeMap(s.level, s.echoes, 0); assert.ok(svg.includes('<polyline')); assert.deepEqual(s.snapshot(), before);
});
test('可选挑战仅在通关后结算；持续供电计时失电后清零，旧记录和挑战分别保存', () => {
  const s = clockRoom(); assert.deepEqual(achievedChallenges(s), []); advance(s, 25);
  assert.ok(challengesFor(s.level).every(c => c.achieved(s))); s.won = true; assert.deepEqual(achievedChallenges(s), ['economy', 'endurance']);
  const save = defaults(); save.mastery[17] = achievedChallenges(s); save.records[17] = { stars: 1, seconds: 25, hits: 1, moves: 4 };
  assert.deepEqual(importSave(exportSave(save)), save);
  const filtered = parseSave(JSON.stringify({ ...save, mastery: { 17: ['economy', 'economy', 'injected'], 100: ['economy'] } })); assert.deepEqual(filtered.mastery, { 17: ['economy'] });
  s.won = false; s.echoes = []; advance(s, 12); assert.equal(s.stats.stableSeconds, 0);
});
test('亲手启动挑战接受人完成接管，压板上留有备用镜时不成立', () => {
  const s = new Simulation(LEVELS[7]); s.mirrors = [{ ...s.level.solution[0] }, { ...s.level.mirrors[1] }]; s.player = { x: 4, y: 3 };
  advance(s, 4); const handoff = challengesFor(s.level).find(c => c.id === 'handoff')!; assert.equal(handoff.achieved(s), true);
  s.mirrors[1] = { ...s.mirrors[1], x: 4, y: 3 }; assert.equal(handoff.achieved(s), false);
});
test('旧缓冲关冲突存档只重放置受影响设备，保留操作数与其他关卡成绩', () => {
  const s = new Simulation(LEVELS[4]); const snapshot = s.snapshot(); snapshot.mirrors[0] = { ...snapshot.mirrors[0], x: 4, y: 4 }; snapshot.player = { x: 1, y: 4 }; snapshot.moves = 19;
  assert.equal(validSnapshot(snapshot), true); assert.equal(s.restore(snapshot), true); assert.equal(s.collides(s.player.x, s.player.y), false);
  assert.equal(s.moves, 19); for (const m of s.mirrors) assert.equal(s.level.walls.some(w => w.x === m.x && w.y === m.y), false);
  assert.equal(s.restore(s.snapshot()), false);
});
test('统计随旧快照迁移和撤销，损坏字段不能进入存档', () => {
  const s = clockRoom(); const old = s.snapshot(); delete old.stats; s.restore(old); assert.equal(s.stats.emitted, 0); assert.equal(validSnapshot(old), true);
  const valid = s.snapshot(); assert.equal(validSnapshot(valid), true);
  const extra = Object.assign(structuredClone(valid), { step: 'ignored', won: true });
  s.restore(extra); assert.equal(typeof s.step, 'function'); assert.equal(s.won, false);
  for (const stats of [{ ...s.stats, emitted: -1 }, { ...s.stats, stableSeconds: Infinity }, { ...s.stats, reflected: ['unknown'] }]) assert.equal(validSnapshot({ ...valid, stats }), false);
});
test('静态合批保留矩阵、材质与投影属性；动画子组和独立材质不被吞并', () => {
  const root = new THREE.Group(), box = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial(), animated = new THREE.Group(); root.add(animated);
  for (let i = 0; i < 40; i++) { const mesh = new THREE.Mesh(box, material); mesh.position.set(i, 2, 3); mesh.scale.set(2, 1, 1); root.add(mesh); }
  animated.add(new THREE.Mesh(box, material)); const stats = batchStaticBoxes(root, box); assert.deepEqual(stats, { instances: 40, batches: 1, saved: 39 });
  const batch = root.children.find(c => c instanceof THREE.InstancedMesh) as THREE.InstancedMesh, matrix = new THREE.Matrix4(); batch.getMatrixAt(12, matrix);
  assert.deepEqual(new THREE.Vector3().setFromMatrixPosition(matrix).toArray(), [12, 2, 3]); assert.equal(animated.children.length, 1);
  batch.dispose(); box.dispose(); material.dispose();
});
test('光尾固定容量、暂停不增长，传送和倒放不会画出跨场景假连线', () => {
  const trail = new PulseRibbon(), pulse = { id: 1, x: 2, y: 4, dx: 1, dy: 0, wait: 0, last: '', age: 0 };
  for (let i = 0; i < 500; i++) { pulse.x = 2 + i * .035; trail.update(pulse, i / 120); }
  assert.ok(trail.geometry.drawRange.count <= 96 * 6); const count = trail.geometry.drawRange.count; trail.update(pulse, 499 / 120); assert.equal(trail.geometry.drawRange.count, count);
  trail.reset(); pulse.x = 2; trail.update(pulse, 0); pulse.x = 10; trail.update(pulse, .01); assert.equal(trail.geometry.drawRange.count, 0);
  pulse.x += .04; trail.update(pulse, .02); assert.equal(trail.geometry.drawRange.count, 6); trail.update(pulse, .001); assert.equal(trail.geometry.drawRange.count, 0);
  trail.update(undefined, 1); assert.equal(trail.geometry.drawRange.count, 0); trail.dispose();
});
test('缓冲关的静态矩形替代解不能绕开缓冲器，保留可持续参考回路', () => {
  const result = auditRectangles(LEVELS[4]); assert.equal(result.solves, 1); assert.equal(result.skipDelay, 0);
});
test('三个主题分别合批远景，同时保留雨幕、植物响应和可释放资源', () => {
  const canvas = () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) as unknown as HTMLCanvasElement;
  for (const id of [7, 8, 9]) {
    const art = new EnvironmentArt(canvas); art.build(LEVELS[id]); assert.ok(art.batching.saved >= 180);
    const geometry = new Set<THREE.BufferGeometry>(), material = new Set<THREE.Material>();
    art.group.traverse(o => { if (o instanceof THREE.Mesh && o.geometry.type !== 'BoxGeometry') geometry.add(o.geometry); if (o instanceof THREE.Mesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => material.add(m)); });
    let disposed = 0; [...geometry, ...material].forEach(resource => resource.addEventListener('dispose', () => disposed++));
    art.update(2, true, true, .5); art.update(3, false, false, 1); art.clear();
    assert.equal(art.group.children.length, 0); assert.equal(disposed, geometry.size + material.size);
  }
});
