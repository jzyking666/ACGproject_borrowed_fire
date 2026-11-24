import assert from 'node:assert/strict';
import test from 'node:test';
import { Controller } from '../src/controller';
import { bindMovement, defaultPreferences, movementLabel, readPreferences } from '../src/preferences';
import { defaults, exportSave, importSave, parseSave } from '../src/storage';

test('old saves keep the previous master volume and acquire the independent mixer channels', () => {
  const legacy = parseSave(JSON.stringify({version:1, unlocked:2, settings:{volume:0, music:false, textScale:1.2}}));
  assert.equal(legacy.unlocked, 2);
  assert.deepEqual(legacy.settings, {...defaultPreferences(), volume:0, music:false, textScale:1.2});
});

test('import and export preserve independent channels, language and control preferences', () => {
  const save = defaults();
  Object.assign(save.settings, {language:'en', muted:true, volume:.91, musicVolume:0, effectsVolume:.34, uiVolume:.62, audioCaptions:true, deadZone:.35});
  assert.ok(bindMovement(save.settings.movement, 'left', 'Numpad4'));
  assert.deepEqual(importSave(exportSave(save)).settings, save.settings);
});

test('damaged settings are normalized and leave other saved choices usable', () => {
  const pref = readPreferences({language:42, volume:-1, uiVolume:9, effectsVolume:NaN, deadZone:'0', cameraSensitivity:Infinity, audioCaptions:true,
    movement:{up:'KeyU', left:'KeyU', right:'KeyD', down:'KeyS'}});
  assert.deepEqual(pref, {...defaultPreferences(), volume:0, uiVolume:1, audioCaptions:true});
});

test('rebinding swaps colliding movement keys, keeps shortcuts reserved and displays physical keys', () => {
  const keys = defaultPreferences().movement;
  assert.equal(bindMovement(keys,'up','KeyS'),true);
  assert.equal(movementLabel(keys), 'SAWD');
  assert.equal(bindMovement(keys,'left','KeyE'),false);
  assert.equal(bindMovement(keys,'left','Escape'),false);
  assert.equal(bindMovement(keys,'left','Numpad4'),true);
  assert.equal(movementLabel(keys), 'S Num 4 W D');
  assert.deepEqual(defaultPreferences().movement, {up:'KeyW', left:'KeyA', down:'KeyS', right:'KeyD'});
});

test('the selected dead zone applies to movement and orbit while preserving full travel', () => {
  const controller = new Controller();
  const pad = {buttons:[], axes:[.29,1,-.28,-1]};
  const soft = controller.read(pad,.1,.1), firm = controller.read(pad,.1,.35);
  assert.ok(soft.move.x > 0 && soft.camera.x < 0);
  assert.deepEqual(firm.move, {x:0, y:1});
  assert.deepEqual(firm.camera, {x:0, y:-1});
});
