import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORY, CAST, sceneFor, validSceneId, normalizeSeen, availableScenes, StoryPlayer } from '../src/story';
import { LEVELS } from '../src/levels';
import { defaults, parseSave, exportSave, importSave } from '../src/storage';

test('十二关都有完整的入场、完工通讯和交接记录，角色引用有效', () => {
  assert.equal(STORY.length, LEVELS.length);
  const ids = new Set<string>();
  for (const level of LEVELS) {
    assert.ok(STORY[level.id].record.length > 0);
    for (const kind of ['before', 'after'] as const) {
      const scene = sceneFor(level.id, kind); assert.equal(validSceneId(scene.id), true);
      assert.ok(!ids.has(scene.id)); ids.add(scene.id);
      assert.ok(scene.lines.length >= 2 && scene.lines.length <= 5);
      for (const line of scene.lines) { assert.ok(Object.hasOwn(CAST, line.speaker)); assert.ok(line.text.trim()); }
    }
  }
  assert.equal(ids.size, 24);
});
test('通讯编号拒绝越界、注入、非标准整数及错误阶段', () => {
  for (const id of ['12:before', '-1:after', '01:before', '0:ending', '0:before<script>', {}, 0, null]) assert.equal(validSceneId(id), false);
  assert.throws(() => sceneFor(99, 'before'));
});
test('收录通讯过滤无效条目，去重并保持顺序', () => {
  assert.deepEqual(normalizeSeen(['0:before', '0:before', '11:after', '99:after', {}, '1:after']), ['0:before', '11:after', '1:after']);
  assert.deepEqual(normalizeSeen(null), []);
});
test('通讯回看仅开放遇到的场景或已完成关卡，不泄漏未来剧情', () => {
  assert.deepEqual(availableScenes([], {}), []);
  assert.deepEqual(availableScenes(['7:before'], {}).map(s => s.id), ['7:before']);
  assert.deepEqual(availableScenes(['7:before'], { 0: { stars: 1 } }).map(s => s.id), ['0:before', '0:after', '7:before']);
});
test('对话推进有边界，可回上一句，末句不会越界或隐式推进其他场景', () => {
  const player = new StoryPlayer(sceneFor(0, 'before'));
  player.previous(); assert.equal(player.index, 0);
  while (player.next()) { assert.ok(player.line); }
  assert.equal(player.last, true); const index = player.index;
  assert.equal(player.next(), false); assert.equal(player.index, index);
  player.previous(); assert.equal(player.last, false);
});
test('旧存档升级开启剧情，保留进度，并允许回看过去的已完成关卡', () => {
  const save = parseSave(JSON.stringify({ version: 1, unlocked: 2, records: { 0: { stars: 3, seconds: 20, hits: 0, moves: 2 } } }));
  assert.equal(save.unlocked, 2); assert.equal(save.settings.dialogue, true); assert.deepEqual(save.story.seen, []);
  assert.deepEqual(availableScenes(save.story.seen, save.records).map(s => s.id), ['0:before', '0:after']);
});
test('剧情开关和回看收藏随文件迁移，损坏字段安全降级', () => {
  const save = defaults(); save.settings.dialogue = false; save.story.seen = ['0:before', '6:after'];
  assert.deepEqual(importSave(exportSave(save)), save);
  const damaged = parseSave(JSON.stringify({ version: 1, story: { seen: ['0:before', 'x', '0:before'] }, settings: { dialogue: 'yes' } }));
  assert.deepEqual(damaged.story.seen, ['0:before']); assert.equal(damaged.settings.dialogue, true);
});
