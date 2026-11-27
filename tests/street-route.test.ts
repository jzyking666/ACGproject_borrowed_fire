import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CampaignDesk} from '../src/campaign-ui';
import {canWork, districtOpen, jobKey, jobOf, signedCount, signJob, TRADES} from '../src/campaign-progress';
import {STREET_ROUTE, relayPosition, relayCopy, ROUTE_EN} from '../src/street-route';
import {translateText} from '../src/locale';
import {defaults, exportSave, importSave, parseSave} from '../src/storage';
import {FIELD_LEVELS} from '../src/field-service';
import {Simulation} from '../src/engine';
import {looms, packLoom, searchLoom, turnLoom} from '../src/grid-loom';
import {TIDES, adjustTide, solveTide} from '../src/tide-dispatch';

function harness() {
  let data=defaults(), page={title:'', body:'', screen:''}, field:Simulation|undefined;
  const open=()=>new CampaignDesk(()=>data.campaign,(title,body,footer,screen)=>{page={title,body:body+footer,screen};},()=>{},i=>{
    field=new Simulation(FIELD_LEVELS[i]);
    const draft=data.campaign.sites[i];
    if (draft) field.restore(draft.snapshot);
  },()=>{},()=>{});
  let desk=open(); desk.map();
  function click(action:string) {
    const button=page.body.match(new RegExp('<button[^>]*data-action="'+action+'"[^>]*>'))?.[0];
    assert.ok(button && !/\sdisabled\b/.test(button),page.screen+' has no active '+action);
    assert.equal(desk.handle(action,page.screen),true);
  }
  return {
    get data(){return data},get page(){return page},get desk(){return desk},get field(){return field},
    click,
    reload(){const before=data;data=importSave(exportSave(data));assert.deepEqual(data,before);desk=open();desk.map();},
    fieldWin(index:number){
      // Full-room movement and routing are covered by the field and campaign suites.
      assert.ok(field);assert.equal(field.level.id,FIELD_LEVELS[index].id);
      field.mirrors=structuredClone(field.level.solution);field.player={...field.level.exit};
      for (let i=0;i<4800 && !field.won;i++)field.step(1/120);
      assert.ok(field.won);desk.finish('field',index);
    },
  };
}

test('八封居民来信从正常入口接单、原工序验收；签完八站能投递且总图仍只有八单',()=>{
  const h=harness();h.click('camp-route');
  for(const [station,stop] of STREET_ROUTE.entries()){
    const p=h.data.campaign, {trade,index}=stop;
    assert.equal(h.page.screen,'camp-route');assert.ok(h.page.body.includes(stop.request));
    assert.equal(relayPosition(p),station);
    if(station>0)assert.equal(STREET_ROUTE[station-1].gift,stop.carrying);
    h.click('route-job-'+station); assert.equal(p.routeJob,jobKey(trade,index));
    if(trade==='field')h.fieldWin(index);
    else {
      assert.equal(h.page.screen,'camp-board');
      h.click('camp-job-back');assert.ok(h.page.body.includes(stop.request));h.click('route-job-'+station);
      if(trade==='loom'){
        const board=looms[index],solution=searchLoom(board);
        let values=[...board.opening], move=0;
        while(solution.distance[packLoom(values)]>0) {
          const wheel=solution.next[packLoom(values)];h.click('board-turn-'+wheel);
          values=turnLoom(board,values,wheel);
          if(station===1 && move++===0){
            h.reload();assert.equal(h.data.campaign.selected,0);
            h.click('camp-resume');assert.deepEqual(h.data.campaign.jobs[jobKey(trade,index)]?.values,values);
            h.desk.jobBack();assert.ok(h.page.body.includes(stop.request));h.click('route-job-'+station);
          }
        }
      } else {
        const board=TIDES[index],target=solveTide(board,board.start).solution;assert.ok(target);
        let values=[...board.start];
        for(const [i,goal] of target.entries()){
          if(Math.floor(goal/board.period)!==Math.floor(values[i]/board.period)){
            h.click('board-branch-'+i);values=adjustTide(board,values,'branch-'+i);
          }
          for(let n=0;values[i]!==goal && n<board.period;n++){
            h.click('board-late-'+i);values=adjustTide(board,values,'late-'+i);
          }
          assert.equal(values[i],goal);
        }
      }
      h.click('camp-sign');
    }
    assert.equal(h.page.screen,'camp-receipt');assert.ok(h.page.body.includes(stop.reply));
    if(station===0){h.reload();h.click('camp-route');assert.ok(h.page.body.includes(STREET_ROUTE[1].request));}
    else h.click(station===7?'camp-route':'route-stop-'+(station+1));
  }
  assert.equal(h.page.screen,'camp-route-ending');assert.ok(h.page.body.includes(relayCopy.finalText));
  assert.equal(signedCount(h.data.campaign),8);assert.equal(districtOpen(h.data.campaign,1),false);
  for(const t of TRADES)assert.equal(canWork(h.data.campaign,t,47),false);
  h.reload();h.click('camp-route');assert.equal(h.page.screen,'camp-route-ending');
  h.click('route-stop-0');h.click('route-job-0');h.fieldWin(0);assert.equal(signedCount(h.data.campaign),8);
});

test('旧档里较晚的已办工单在接力中保留回信，并可直接传给下一站',()=>{
  const h=harness(),p=h.data.campaign;
  for(let i=0;i<3;i++)for(const t of TRADES)signJob(p,t,i);
  const market=STREET_ROUTE[2];assert.ok(signJob(p,market.trade,market.index));
  const foundry=STREET_ROUTE[1];assert.equal(relayPosition(p),1);
  jobOf(p,jobKey(foundry.trade,foundry.index)).done=true;
  h.reload();h.click('camp-route');assert.ok(h.page.body.includes(STREET_ROUTE[3].request));
  h.click('route-stop-2');assert.ok(h.page.body.includes(market.reply));h.click('route-stop-3');
  assert.ok(h.page.body.includes(STREET_ROUTE[3].request));
});

test('特许工单与工单间的其他站点权限隔离，导入拒绝伪造的接力续办标签',()=>{
  const h=harness(),p=h.data.campaign;
  h.click('camp-route');assert.equal(canWork(p,'loom',9),false);
  h.desk.handle('route-job-1','camp-route');assert.equal(p.last,undefined);
  assert.ok(signJob(p,'field',0));assert.equal(canWork(p,'loom',9),true);
  assert.equal(canWork(p,'tide',9),false);assert.equal(canWork(p,'field',9),false);
  p.last='field-0';p.routeJob='loom-9';
  assert.throws(()=>importSave(exportSave(h.data)),/战役/);
  assert.equal(parseSave(JSON.stringify(h.data)).campaign.routeJob,undefined);
});

test('临时获准的桥头亭现场从锁区重开仍恢复真实现场快照',()=>{
  const h=harness(), p=h.data.campaign;
  for(const stop of STREET_ROUTE.slice(0,3))assert.ok(signJob(p,stop.trade,stop.index));
  h.click('camp-route');h.click('route-job-3');
  const site=h.field;assert.ok(site);site.step(.14,false);
  p.sites[18]={snapshot:site.snapshot(),hintCount:1};
  assert.equal(p.selected,0);assert.equal(districtOpen(p,3),false);
  h.reload();h.click('camp-resume');assert.deepEqual(h.field?.snapshot(),site.snapshot());
  h.desk.jobBack();assert.ok(h.page.body.includes(STREET_ROUTE[3].request));
});

test('八封信、夹物、交接语和送件结局全部进入双语界面',()=>{
  for(const [zh,en] of Object.entries(ROUTE_EN)){
    assert.equal(translateText(zh,'en'),en);assert.equal(translateText(zh,'zh-CN'),zh);
  }
});
