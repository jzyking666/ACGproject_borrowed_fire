import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/engine';
import { LEVELS, type Cell } from '../src/levels';
import { FIELD_LEVELS } from '../src/field-service';
import { passageReport, type PassageTrip } from '../src/passage';
import { commissionDiagram } from '../src/commission-diagram';

test('每个现场都可从实际的小数坐标安排去出口或任意活动轴座，两种出发将沿同一路到站或真实受击', () => {
  let different = 0;
  for(const level of FIELD_LEVELS) {
    const s=new Simulation(level);
    s.player={x:1.27,y:1.14}; s.invulnerable=.13;
    const initial=s.snapshot(), original=structuredClone(s.events);
    for (const t of ['exit',...s.mirrors.filter(m=>!m.fixed).map(m=>m.id)]) {
      const report=passageReport(s,t)!;
      assert.deepEqual(report.path[0],s.player); assert.equal(report.trips.length,2);
      for (const outcome of report.trips) assert.notEqual(outcome.outcome,'blocked',level.name+' '+t);
      for(let k=1;k<report.path.length;k++) {
        const a=report.path[k-1],b=report.path[k];
        assert.ok(a.x===b.x||a.y===b.y);
        assert.ok(!s.collides(b.x,b.y));
      }
      if(report.trips[0].outcome !== report.trips[1].outcome) different++;
    }
    assert.deepEqual(s.snapshot(),initial);assert.deepEqual(s.events,original);assert.equal(s.invulnerable,.13);
  }
  assert.ok(different>0);
});

test('步行模拟与普通输入逐帧回放一致，冲击点是重生前的真实位置', () => {
  const sim=new Simulation(FIELD_LEVELS[0]), start={x:1,y:5};
  sim.player=start;
  sim.pulses=[{id:1, x:1.34,y:5,dx:-1,dy:0,phase:'warm',last:'',age:0,wait:0}];
  const report=passageReport(sim,'exit')!;
  assert.equal(report.trips[0].outcome,'hit');
  for(const expected of report.trips) {
    const actual=new Simulation(sim.level);actual.restore(sim.snapshot());actual.invulnerable=sim.invulnerable;
    let i=1,place:Cell|undefined,elapsed=0;
    while(i<report.path.length && elapsed<20) {
      if(elapsed>=expected.wait-1e-9) {
        const dest=report.path[i],dx=dest.x-actual.player.x,dy=dest.y-actual.player.y;
        const stride=3.2/120;
        actual.move(Math.sign(dx)*Math.min(1,Math.abs(dx)/stride), Math.sign(dy)*Math.min(1,Math.abs(dy)/stride), 1/120);
        if(Math.hypot(dest.x-actual.player.x,dest.y-actual.player.y)<1e-5)i++;
      }
      actual.step(1/120);elapsed+=1/120;
      const event=actual.drainEvents().find(e=>e.type==='hit');
      if(event){place={x:event.x!,y:event.y!};break;}
      if(actual.won)break;
    }
    assert.ok(Math.abs(elapsed-expected.time)<1e-5);
    assert.deepEqual(place??actual.player,expected.place);
  }
  sim.invulnerable=.15;
  const protectedTrip=passageReport(sim,'exit')!.trips[0];
  assert.ok(protectedTrip.time>report.trips[0].time+.1);
});

test('放行表页面只有领到同段潮汐工单才能看到路线，收起或切换校线不重算实况', () => {
  const s=new Simulation(FIELD_LEVELS[1]);
  const result=passageReport(s,'A')!;
  assert.equal(passageReport(new Simulation(LEVELS[0]),'exit'),undefined);
  assert.equal(passageReport(s,'unknown'),undefined);
  const locked=commissionDiagram(s,0,false,undefined,false,result);
  assert.doesNotMatch(locked,/passage-exit|立即出发|预计步行路线/);
  const opening=commissionDiagram(s,0,false,undefined,true);
  assert.match(opening,/passage-A/);assert.doesNotMatch(opening,/预计步行路线/);
  const shown=commissionDiagram(s,0,true,'A',true,result);
  assert.match(shown,/立即出发/);assert.match(shown,/预计步行路线/);assert.match(shown,/校样读数/);
});
