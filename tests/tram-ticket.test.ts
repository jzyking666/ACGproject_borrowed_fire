import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, exportSave, importSave, parseSave, saveShiftDraft } from '../src/storage';
import { menuMarkup } from '../src/ui';
import { nextNightRoom } from '../src/tram-ticket';
import { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';
import { TRAM_STOPS } from '../src/last-tram';

const draft = (sim:Simulation) => ({snapshot:sim.snapshot(),hintCount:1});

test('a tram ticket, a manual slot and a classic checkpoint can travel in the same save', () => {
  const data = defaults(), main = draft(new Simulation(LEVELS[1])), first = draft(new Simulation(TRAM_STOPS[0].level));
  saveShiftDraft(data, main);
  saveShiftDraft(data, first);
  data.slots[1] = {...first, savedAt:new Date().toISOString(), appearance:data.appearance};
  const restored = importSave(exportSave(data));
  assert.deepEqual(restored.tram.draft, first);
  assert.deepEqual(restored.checkpoint, main.snapshot);
  assert.deepEqual(restored.slots[1]?.snapshot, first.snapshot);
  assert.equal(nextNightRoom(restored), 1);
});

test('revisiting a signed stop keeps the active downstream draft; late tickets cannot skip a stop', () => {
  const data = defaults(), second = draft(new Simulation(TRAM_STOPS[1].level));
  data.tram.completed = 1;
  saveShiftDraft(data,second);
  saveShiftDraft(data,draft(new Simulation(TRAM_STOPS[0].level)));
  assert.deepEqual(data.tram.draft,second);
  const damaged = {...data, tram:{completed:0,draft:second}};
  assert.throws(()=>importSave(exportSave(damaged)));
  assert.deepEqual(parseSave(JSON.stringify(damaged)).tram, {completed:0});
  data.slots[0] = {...draft(new Simulation(TRAM_STOPS[2].level)),savedAt:new Date().toISOString(),appearance:data.appearance};
  assert.throws(()=>importSave(exportSave(data)));
});

test('a legacy save can continue immediately after a handover, including between the two shifts', () => {
  const legacy = { ...defaults(), tram:undefined, unlocked:6 };
  for (let id=0;id<7;id++) legacy.records[id] = {stars:3,seconds:72,hits:0,moves:3};
  const migrated = parseSave(JSON.stringify(legacy));
  assert.deepEqual(migrated.tram,{completed:0});
  assert.equal(nextNightRoom(migrated),7);
  for (let id=7;id<12;id++) migrated.records[id] = legacy.records[0];
  assert.equal(nextNightRoom(migrated),undefined);
  assert.match(menuMarkup(migrated), /class="cover-campaign" data-action="tram"/);
  migrated.tram.completed = 3;
  assert.match(menuMarkup(migrated), /class="cover-campaign" data-action="street-relay"/);
});
