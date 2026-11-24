import {test} from 'node:test';
import assert from 'node:assert/strict';
import { CampaignDesk } from '../src/campaign-ui';
import { canWork, districtOpen, jobKey, restoredSectors, signedCount, TRADES, type Trade } from '../src/campaign-progress';
import { defaults, exportSave, importSave } from '../src/storage';
import { FIELD_LEVELS } from '../src/field-service';
import { Simulation } from '../src/engine';
import { looms, packLoom, searchLoom, turnLoom } from '../src/grid-loom';
import { TIDES, adjustTide, solveTide, wrap } from '../src/tide-dispatch';

// Route a first-time profile through the public campaign actions without advancing a human playtime clock.
// Detailed collision/walking tests cover the field operator; this test drives the live commissioning gate.
test('空档完整战役：144 单经正常调盘、实载签收、分区断点与两岸汇合才开启终章', () => {
  let data = defaults(), page = {title:'', html:'', screen:''};
  let seals = 0, enteredSites = 0;
  const openDesk = () => new CampaignDesk(
    () => data.campaign,
    (title, body, footer, screen) => {page = {title, html:body+footer, screen};},
    () => {},
    index => {
      const level=FIELD_LEVELS[index], sim=new Simulation(level);
      const signed=signedCount(data.campaign), draft=data.campaign.sites[index];
      if(draft) sim.restore(draft.snapshot);
      assert.equal(sim.exitOpen,false);
      assert.equal(canWork(data.campaign,'field',index),true);
      // Rotate the published configuration into place via the same nearby-mirror controls.
      // The avatar is positioned beside each mirror here so timing and routing stay independent of input latency.
      for (const desired of level.solution) {
        const actual=sim.mirrors.find(m=>m.id===desired.id)!;
        if(actual.slash===desired.slash) continue;
        assert.equal(actual.fixed,false);
        const before=sim.moves;
        for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
          const x=actual.x+dx*.8, y=actual.y+dy*.8;
          if(sim.collides(x,y)) continue;
          sim.player={x,y}; sim.facing={x:-dx,y:-dy};
          if(typeof sim.nearest==='object' && sim.nearest.id===actual.id) { sim.rotate(); break; }
        }
        assert.equal(sim.moves,before+1);
      }
      assert.ok(sim.commissionReadings().every(r=>r.passes));
      sim.player={...level.exit};
      for(let tick=0;tick<120*40&&!sim.won;tick++)sim.step(1/120);
      assert.equal(sim.won,true); assert.equal(signedCount(data.campaign),signed);
      enteredSites++; desk.finish('field',index);
    },
    () => {}, () => {seals++;},
  );
  let desk=openDesk();
  const click=(action:string) => {
    const tag=page.html.match(new RegExp('<button[^>]*data-action="'+action+'"[^>]*>'))?.[0];
    assert.ok(tag,`${page.screen} 缺少 ${action}`); assert.doesNotMatch(tag,/\sdisabled\b/);
    assert.equal(desk.handle(action,page.screen),true);
  };
  const reload=() => {
    const before=data; data=importSave(exportSave(data)); assert.deepEqual(data,before);
    desk=openDesk(); desk.map(); assert.equal(page.screen,'camp-map');
  };
  const board=(t:'loom'|'tide',index:number,replay=false) => {
    click('job-'+t+'-'+index); assert.equal(page.screen,'camp-board');
    const k=jobKey(t,index);
    assert.equal(desk.clockKey(page.screen),k);
    const record=data.campaign.jobs[k]!, startActions=record.actions;
    let edits=0;
    const step=(verb:string,v:number[]) => {
      click('board-'+verb); edits++;
      if(replay) return;
      assert.deepEqual(data.campaign.jobs[k]!.values,v);
      // Resume in a new desk instance from an actual serialized partial board.
      if(index===0 && edits===1) {
        reload(); click('camp-resume');
        assert.equal(page.screen,'camp-board');
        assert.deepEqual(data.campaign.jobs[k]!.values,v);
      }
    };
    if(t==='loom'){
      const b=looms[index], search=searchLoom(b); let v=[...b.opening];
      const cost=search.distance[packLoom(v)];
      for(let n=0;n<cost;n++) {
        const wheel=search.next[packLoom(v)]; v=turnLoom(b,v,wheel); step('turn-'+wheel,v);
      }
    } else {
      const b=TIDES[index], solved=solveTide(b,b.start); assert.ok(solved.solution);
      let v=[...b.start];
      for(const [i,target] of solved.solution.entries()) {
        if(Math.floor(target/b.period)!==Math.floor(v[i]/b.period)) {
          v=adjustTide(b,v,'branch-'+i); step('branch-'+i,v);
        }
        while(target!==v[i]){
          const verb=(wrap(target-v[i],b.period)<=b.period/2?'late-':'early-')+i;
          v=adjustTide(b,v,verb);step(verb,v);
        }
      }
      assert.equal(edits,solved.cost);
    }
    assert.equal(data.campaign.jobs[k]!.actions,startActions+(replay?0:edits));
    click('camp-sign');
  };
  desk.map();
  assert.match(page.html,/已签收 0 \/ 144/); assert.doesNotMatch(page.html,/重读终章/);
  // Visit the market before the foundry: either branch may be finished first.
  for(const district of [0,2,1,3,5,4,6,7]) {
    click('district-'+district);
    for(let sector=0;sector<6;sector++){
      const index=district*6+sector;
      const sequence: readonly Trade[]=sector%2===0?['field','tide','loom']:TRADES;
      for(const trade of sequence){
        const count=signedCount(data.campaign);
        assert.equal(canWork(data.campaign,'field',47),count>=143);
        if(trade==='field') click('job-field-'+index);
        else board(trade,index);
        assert.equal(signedCount(data.campaign),count+1);
        assert.equal(data.campaign.jobs[jobKey(trade,index)]?.done,true);
        assert.equal(page.screen,count===143?'camp-ending':'camp-receipt');
        if(count!==143) click('camp-district');
      }
      assert.equal(restoredSectors(data.campaign,district),sector+1);
      if(district===0 && sector===2) assert.ok(districtOpen(data.campaign,1)&&districtOpen(data.campaign,2));
      if(district===2) assert.equal(districtOpen(data.campaign,3),false);
      if(district===5) assert.equal(districtOpen(data.campaign,6),false);
    }
    reload();
  }
  assert.equal(enteredSites,48); assert.equal(seals,144);
  assert.equal((page.html.match(/class="atlas-station atlas-restored"/g)??[]).length,8);
  click('camp-ending'); assert.equal(page.screen,'camp-ending');
  assert.equal(data.campaign.jobs['field-47']?.done,true);
  // Replaying a signed board is allowed, without either an extra stamp or a changed first-clear record.
  click('camp-map'); click('district-0'); const saved=structuredClone(data.campaign.jobs['loom-0']);
  board('loom',0,true); assert.deepEqual(data.campaign.jobs['loom-0'],saved); assert.equal(signedCount(data.campaign),144);
});
