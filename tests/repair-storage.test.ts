import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';
import { createRepair, REPAIRS } from '../src/repairs';
import { defaults, exportSave, importSave, parseSave, saveShiftDraft, signRepair } from '../src/storage';
import { repairLetter, repairList } from '../src/repair-desk';

test('同一机房的主线、返修草稿和另一封信可以同时导出，精修零次也能留档', () => {
  const bell = REPAIRS[0], handprint = REPAIRS.find(o => o.id === 'handprint')!;
  const main = { snapshot: new Simulation(LEVELS[bell.level]).snapshot(), hintCount: 2 };
  const first = { snapshot: createRepair(bell).snapshot(), hintCount: 1 };
  const second = { snapshot: createRepair(handprint).snapshot(), hintCount: 0 };
  const data = defaults(); saveShiftDraft(data, main); saveShiftDraft(data, first, bell.id); saveShiftDraft(data, second, handprint.id);
  assert.deepEqual(data.checkpoint, main.snapshot); assert.notDeepEqual(main.snapshot.mirrors, first.snapshot.mirrors);
  data.slots[0] = { ...first, repairId: bell.id, appearance: data.appearance, savedAt: '2026-11-23T20:00:00Z' };
  assert.deepEqual(signRepair(data, handprint.id, 0), 0);
  assert.deepEqual(signRepair(data, handprint.id, 2), 0);
  const read = importSave(exportSave(data));
  assert.deepEqual(read.repairBest, { handprint: 0 }); assert.deepEqual(read.repairDrafts, { bell: first });
  assert.deepEqual(read.checkpoint, main.snapshot); assert.equal(read.hintCount, 2);
  assert.deepEqual(read.slots[0], data.slots[0]); assert.deepEqual(read.records, {}); assert.deepEqual(read.story.seen, []);
  assert.match(repairLetter(handprint, read), /最佳 0 次/); assert.match(repairLetter(handprint, read), new RegExp(handprint.reply));
  assert.match(repairList(read), /精修签收/); assert.doesNotMatch(repairLetter(bell, read), new RegExp(bell.reply));
});

test('返修断点和手动槽必须与委托所属房间一致，导入不会把返修当作主线', () => {
  const data = defaults(), bell = REPAIRS[0], snapshot = createRepair(bell).snapshot();
  const invalid = { snapshot, hintCount: 1 };
  data.repairDrafts.carbon = invalid;
  assert.throws(() => importSave(exportSave(data)), /返修/);
  assert.deepEqual(parseSave(JSON.stringify(data)).repairDrafts, {});
  data.repairDrafts = {};
  data.slots[2] = { ...invalid, repairId: 'unknown-order', appearance: data.appearance, savedAt: new Date(0).toISOString() };
  assert.throws(() => importSave(exportSave(data)), /手动存档/);
  assert.equal(parseSave(JSON.stringify(data)).slots[2], null);
});

test('旧夜班存档保持原有断点与手动槽，初次进入返修值班台没有签收记录', () => {
  const old = defaults(), snapshot = new Simulation(LEVELS[0]).snapshot();
  old.checkpoint = snapshot; old.slots[1] = { snapshot, hintCount: 1, savedAt: new Date(0).toISOString(), appearance: old.appearance };
  const { repairBest, repairDrafts, ...legacy } = old;
  const read = parseSave(JSON.stringify(legacy));
  assert.deepEqual(read.repairBest, {}); assert.deepEqual(read.repairDrafts, {});
  assert.deepEqual(read.slots[1], old.slots[1]); assert.deepEqual(read.checkpoint, snapshot);
});
