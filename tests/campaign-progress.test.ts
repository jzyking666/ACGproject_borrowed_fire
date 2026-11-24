import test from 'node:test';
import assert from 'node:assert/strict';
import { freshCampaign, TRADES, canWork, signJob, jobKey, jobOf, districtOpen, countPlay, readJob, signedCount, playReport } from '../src/campaign-progress';
import { defaults, parseSave, exportSave, importSave } from '../src/storage';
import { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';
import { FIELD_LEVELS } from '../src/field-service';
import { loomCatalog } from '../src/loom-catalog';
import { TIDES } from '../src/tide-dispatch';

test('首区允许三种工序自由交错，下游要真实接通三段，双源街区等待两个上游', () => {
  const p=freshCampaign();
  assert.equal(districtOpen(p,1),false);
  for (const i of [0,1,2]) for (const t of ['tide','field'] as const) assert.ok(signJob(p,t,i));
  assert.equal(districtOpen(p,1),false);
  for (const i of [0,1,2]) assert.ok(signJob(p,'loom',i));
  assert.ok(districtOpen(p,1)); assert.ok(districtOpen(p,2));
  for (const i of [6,7,8]) for(const t of TRADES) assert.ok(signJob(p,t,i));
  assert.equal(districtOpen(p,3),false);
  for (const i of [12,13,14]) for(const t of TRADES) assert.ok(signJob(p,t,i));
  assert.ok(districtOpen(p,3)); assert.equal(signedCount(p),27);
});

test('全战役只在其余143项完工后放行总闸，首通计数幂等且无强制计时', () => {
  const p=freshCampaign();
  for(let i=0;i<48;i++) for(const t of TRADES) {
    if (t==='field' && i===47) continue;
    assert.ok(!canWork(p,'field',47)); assert.ok(signJob(p,t,i));
  }
  assert.equal(signedCount(p),143); assert.ok(signJob(p,'field',47)); assert.equal(signJob(p,'field',47),false);
  assert.equal(signedCount(p),144); assert.equal(playReport(p).split('\n').length,145);
});

test('首通时钟隔离后台、长帧、长时间无输入与重玩，并保留思考时间', () => {
  const p=freshCampaign(), k=jobKey('field',0); const record=jobOf(p,k);
  countPlay(p,k,.2,80,true); countPlay(p,k,.1,108,true);
  for(const [dt,idle,focus] of [[.8,130,true],[1,0,false],[60,0,true],[-2,0,true]] as const) countPlay(p,k,dt,idle,focus);
  assert.ok(Math.abs(record.seconds-.3)<1e-9); signJob(p,'field',0); countPlay(p,k,.5,1,true); assert.ok(Math.abs(record.seconds-.3)<1e-9);
  assert.equal(readJob('loom-01'),undefined); assert.equal(readJob('field-48'),undefined);
});

test('旧断点、战役三工种草稿和现场手动槽一并迁移；错房、非法档位及被搬走的固定轴座均拒绝导入', () => {
  const data=defaults(); data.checkpoint=new Simulation(LEVELS[0]).snapshot();
  const snap=new Simulation(FIELD_LEVELS[0]).snapshot(), draft={ snapshot:snap, hintCount:2 };
  data.campaign.sites[0]=draft; data.slots[1]={ ...draft, savedAt:new Date(0).toISOString(), appearance:data.appearance };
  jobOf(data.campaign,'loom-0').values=[...loomCatalog[0].opening]; jobOf(data.campaign,'tide-1').values=[...TIDES[1].start];
  assert.deepEqual(importSave(exportSave(data)),data);
  data.campaign.sites[1]=draft; assert.throws(()=>importSave(exportSave(data)),/战役/); delete data.campaign.sites[1];
  data.campaign.jobs['loom-0']!.values=[999]; assert.throws(()=>importSave(exportSave(data)),/战役/);
  assert.equal(parseSave(JSON.stringify(data)).campaign.jobs['loom-0']!.values,undefined);
  delete data.campaign.jobs['loom-0']; snap.mirrors[0].x++; assert.throws(()=>importSave(exportSave(data)),/存档|战役/);
  const legacy=JSON.parse(JSON.stringify(defaults())); delete legacy.campaign;
  assert.deepEqual(parseSave(JSON.stringify(legacy)).campaign,freshCampaign());
});

test('退信独立计时，旧战役可直接续用，重复邮戳归并，越界邮戳拒绝导入', () => {
  const save = defaults();
  const job = jobOf(save.campaign, 'tide-0');
  countPlay(save.campaign, 'mail', .25, 50, true);
  countPlay(save.campaign, 'mail', 1, 121, true);
  countPlay(save.campaign, 'mail', 1, 0, false);
  assert.equal(save.campaign.mailSeconds, .25);
  assert.equal(job.seconds, 0);
  const legacy = JSON.parse(exportSave(save));
  delete legacy.data.campaign.returned; delete legacy.data.campaign.mailSeconds;
  assert.deepEqual(importSave(JSON.stringify(legacy)).campaign, {...save.campaign, mailSeconds: 0});
  save.campaign.returned = [0, 0];
  assert.throws(() => importSave(exportSave(save)), /战役退信/);
  for (const i of [0,1,2]) for (const t of TRADES) signJob(save.campaign,t,i);
  assert.deepEqual(importSave(exportSave(save)).campaign.returned, [0]);
  save.campaign.returned.push(9);
  assert.throws(() => importSave(exportSave(save)), /战役/);
});
