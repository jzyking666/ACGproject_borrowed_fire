import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIELD_LEVELS } from '../src/field-service';
import { Simulation } from '../src/engine';
import { calibrationReadings, commissionDiagram } from '../src/commission-diagram';

test('配线样板只在授权后显示活动轴座，选中的线路仍绘现场路径，对照列包含所有联检线', () => {
  const sim = new Simulation(FIELD_LEVELS.find(b => b.commission!.length >= 4 && b.mirrors.some(m => m.fixed))!);
  const chosen = sim.mirrors.find(m => !m.fixed)!, fixed = sim.mirrors.find(m => m.fixed)!;
  const locked = commissionDiagram(sim,2,false,chosen.id);
  assert.match(locked,/丙路联检图/); assert.doesNotMatch(locked,/calibrate-|校样读数/);
  const open = commissionDiagram(sim,2,true,chosen.id);
  assert.match(open,/校样读数/); assert.match(open,/calibrate-off/);
  assert.ok(open.includes('data-action="calibrate-'+chosen.id+'"'));
  assert.ok(!open.includes('data-action="calibrate-'+fixed.id+'"'));
  assert.equal((open.match(/<th scope="row">/g) ?? []).length,sim.level.commission!.length);
  const strokes = (html: string) => html.match(/<polyline [^>]+>/g);
  assert.deepEqual(strokes(open),strokes(locked));
  assert.equal(calibrationReadings(sim,'nonexistent'),undefined);
  assert.equal(calibrationReadings(sim,fixed.id),undefined);
});

test('全部现场的单轴校样与独立实装读数一致，反复切换不会把假设状态写入实物或缓存', () => {
  for (const level of FIELD_LEVELS) {
    const sim = new Simulation(level), saved = sim.snapshot(), live=sim.commissionReadings();
    for (const mirror of sim.mirrors.filter(m => !m.fixed)) {
      const copy = new Simulation(level);
      const actual = copy.mirrors.find(m => m.id === mirror.id)!;
      actual.slash = !actual.slash;
      assert.deepEqual(calibrationReadings(sim,mirror.id),copy.commissionReadings());
    }
    assert.deepEqual(sim.snapshot(),saved); assert.equal(sim.commissionReadings(),live);
    assert.equal(sim.events.length,0);
  }
});
