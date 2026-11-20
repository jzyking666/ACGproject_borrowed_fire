import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Controller } from '../src/controller';
import { CameraImpulse } from '../src/feedback';
import { COATS, HELMETS, BADGES, normalizeAppearance } from '../src/appearance';
import { defaults, parseSave, exportSave, importSave } from '../src/storage';
import { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';

const pad = (pressed: number[] = [], axes = [0, 0, 0, 0]) => ({ buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i), touched: pressed.includes(i), value: Number(pressed.includes(i)) })), axes });

test('手柄按住交互不会每帧重复拿起放下，松开后可再次触发', () => {
  const controller = new Controller();
  assert.equal(controller.read(pad([0]), .016).interact, true);
  assert.equal(controller.read(pad([0]), .016).interact, false);
  controller.read(pad(), .016);
  assert.equal(controller.read(pad([0]), .016).interact, true);
});
test('手柄支持动作、观察、提示、暂停、方向键和双摇杆', () => {
  const frame = new Controller().read(pad([0, 1, 2, 3, 9, 15], [0, -1, .6, -.6]), .016);
  assert.ok(frame.interact && frame.rotate && frame.observe && frame.hint && frame.pause);
  assert.deepEqual(frame.move, { x: 1, y: -1 }); assert.ok(frame.camera.x > 0 && frame.camera.y < 0);
});
test('手柄漂移死区、菜单首次方向和按住重复间隔', () => {
  const controller = new Controller();
  assert.deepEqual(controller.read(pad([], [.1, -.19, 0, 0]), .016).move, { x: 0, y: 0 });
  assert.equal(controller.read(pad([13]), .016).navigation, 1);
  assert.equal(controller.read(pad([13]), .1).navigation, 0);
  assert.equal(controller.read(pad([13]), .25).navigation, 1);
  assert.equal(controller.read(pad([12]), .016).navigation, -1);
});
test('手柄断开不会保留移动或按钮状态', () => {
  const controller = new Controller(); controller.read(pad([0, 15]), .016);
  const disconnected = controller.read(undefined, .016);
  assert.deepEqual(disconnected.move, { x: 0, y: 0 }); assert.equal(disconnected.interact, false);
  assert.equal(controller.read(pad([0]), .016).interact, true);
});
test('外观组合边界校验和所有可选值', () => {
  assert.deepEqual(normalizeAppearance({ coat: -1, helmet: 3, badge: '2' }), { coat: 0, helmet: 0, badge: 0 });
  assert.deepEqual(normalizeAppearance(null), { coat: 0, helmet: 0, badge: 0 });
  for (let coat = 0; coat < COATS.length; coat++) for (let helmet = 0; helmet < HELMETS.length; helmet++) for (let badge = 0; badge < BADGES.length; badge++) assert.deepEqual(normalizeAppearance({ coat, helmet, badge }), { coat, helmet, badge });
});
test('三个独立手动存档、外观、音量与渲染选项可导出并恢复', () => {
  const save = defaults(); save.appearance = { coat: 3, helmet: 2, badge: 1 };
  save.settings.depthOfField = true; save.settings.environment = false; save.settings.volume = .4; save.settings.textScale = 1.2;
  save.checkpoint = new Simulation(LEVELS[0]).snapshot();
  for (let i = 0; i < 3; i++) save.slots[i] = { snapshot: new Simulation(LEVELS[i]).snapshot(), hintCount: i, appearance: { coat: i, helmet: 0, badge: 0 }, savedAt: '2026-11-20T18:00:00.000Z' };
  const restored = importSave(exportSave(save)); assert.deepEqual(restored, save);
  restored.slots[0]!.snapshot.player.x = 1;
  assert.notEqual(restored.slots[1]!.snapshot.player.x, 1, '存档槽不共享状态对象');
});
test('旧存档升级保留进度，补全新字段，不要求清除 localStorage', () => {
  const save = parseSave(JSON.stringify({ version: 1, unlocked: 2, settings: { muted: true }, checkpoint: new Simulation(LEVELS[2]).snapshot() }));
  assert.equal(save.unlocked, 2); assert.equal(save.settings.muted, true);
  assert.equal(save.settings.environment, true); assert.equal(save.slots.length, 3);
  assert.equal(save.checkpoint?.level, 2); assert.deepEqual(save.appearance, { coat: 0, helmet: 0, badge: 0 });
});
test('导入拒绝错误格式和损坏快照，数值设置与外观安全归一化', () => {
  assert.throws(() => importSave('{}')); assert.throws(() => importSave('{broken'));
  assert.throws(() => importSave(JSON.stringify({ format: 'borrowed-fire', version: 1, data: { version: 1, checkpoint: {} } })));
  assert.throws(() => importSave(JSON.stringify({ format: 'borrowed-fire', version: 1, data: { version: 1, slots: [{}] } })));
  const save = parseSave(JSON.stringify({ version: 1, settings: { volume: 500, textScale: -10 }, appearance: { coat: 500 } }));
  assert.equal(save.settings.volume, 1); assert.equal(save.settings.textScale, 1); assert.equal(save.appearance.coat, 0);
});
test('相机冲击有界、随时间衰减，减少动态效果会立即停止', () => {
  const feedback = new CameraImpulse(); feedback.add(100); assert.equal(feedback.trauma, 1);
  const sample = feedback.sample(.016); assert.ok(Math.abs(sample.x) <= 11 && Math.abs(sample.y) <= 7.15);
  feedback.sample(1); assert.equal(feedback.trauma, 0);
  feedback.add(.8); assert.deepEqual(feedback.sample(.016, true), { x: 0, y: 0 });
});
