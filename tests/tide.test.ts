import test from 'node:test';
import assert from 'node:assert/strict';
import { TIDES, adjustTide, inspectTide, sailingCost, solveTide, tideHint, validTide, wrap, type TideBoard } from '../src/tide-dispatch';

function testBoard(routes: string[], period=6): TideBoard {
  return { title:'试航',cargo:'提灯',period,wide:'',locks:['A','B'],boats:routes.map((s,i)=>({name:['甲','乙','丙'][i],routes:s.split('/'),relief:false,fixed:false})),closed:{},handoffs:[],start:routes.map(()=>0) };
}
for (const [index,b] of TIDES.entries()) {
  test(`潮汐 ${index+1} · ${b.title}：有故障、可排班、最短提示逐条验收`,()=>{
    assert.ok(validTide(index,b.start));
    assert.ok(inspectTide(b,b.start).incidents.length);
    // Independently apply edits at the operator's buttons, including the long way round a cycle.
    const before=[...b.start], {solution,cost}=solveTide(b,b.start);
    assert.ok(solution); let v=[...b.start], edits=0;
    for (const [i,target] of solution.entries()) {
      if (Math.floor(v[i]/b.period)!==Math.floor(target/b.period)) { v=adjustTide(b,v,'branch-'+i); edits++; }
      while (v[i]!==target) {
        const later=wrap(target-v[i],b.period) <= b.period/2;
        v=adjustTide(b,v,(later?'late-':'early-')+i); edits++;
        assert.ok(edits<=cost);
      }
    }
    assert.deepEqual(inspectTide(b,v).incidents,[]); assert.equal(edits,cost); assert.deepEqual(b.start,before);
    assert.match(tideHint(b,b.start),/先/);
    if(index>=42) assert.ok(cost>=15);
  });
}

test('48 张航图的占闸拓扑不同，邻区逐次引入绕行、潮窗、交接、编队与半圈补班',()=>{
  assert.equal(TIDES.length,48);
  const topologies=TIDES.map(b=>JSON.stringify(b.boats.map(v=>v.routes)));
  assert.equal(new Set(topologies).size,48);
  assert.equal(new Set(TIDES.map(b=>b.title)).size,48);
  assert.ok(TIDES.slice(12,18).every(b=>b.boats.some(v=>v.routes.length>1)));
  assert.ok(TIDES.slice(18).every(b=>Object.values(b.closed).length));
  assert.ok(TIDES.slice(24).every(b=>b.handoffs.length));
  assert.ok(TIDES.slice(30,36).every(b=>b.wide));
  assert.ok(TIDES.slice(36).every(b=>b.boats.some(v=>v.relief)));
  for(const b of TIDES) for(const v of b.boats) {
    assert.ok(v.routes.every(r=>r.length<=b.period));
    if(v.relief) assert.ok(b.period%2===0 && v.routes.every(r=>r.length<=b.period/2));
  }
});

test('末拍的船头与次圈船尾会相撞；并行闸仅允许同向编队',()=>{
  const b=testBoard(['AA','A']); assert.equal(inspectTide(b,[5,0]).incidents[0].tick,0);
  b.wide='A'; assert.equal(inspectTide(b,[5,0]).incidents.length,0);
  b.boats[1].routes=['a']; assert.equal(inspectTide(b,[5,0]).incidents[0].kind,'traffic');
});

test('潮窗同时检查补班与逆向通行；货签按下一班发船时刻跨零点计算',()=>{
  const b=testBoard(['a','B']); b.boats[0].relief=true; b.closed.A=1<<3;
  assert.deepEqual(inspectTide(b,[0,1]).incidents.map(e=>[e.kind,e.tick]),[['tide',3]]);
  b.closed={}; b.handoffs=[{from:0,to:1,min:1,max:1}];
  assert.equal(inspectTide(b,[4,0]).incidents.length,0);
  assert.equal(inspectTide(b,[4,1]).incidents[0].kind,'freight');
});

test('约束求解与小盘穷举的最近解一致，也能判定无解',()=>{
  const b=testBoard(['AB/B','A.A','AB'],5); b.closed={B:1<<3}; const initial=[6,2,2];
  let minimum=Infinity;
  for(let x=0;x<10;x++)for(let y=0;y<5;y++)for(let z=0;z<5;z++) {
    const v=[x,y,z]; if(inspectTide(b,v).incidents.length===0) minimum=Math.min(minimum,v.reduce((a,k,i)=>a+sailingCost(b,initial[i],k),0));
  }
  assert.ok(Number.isFinite(minimum)); assert.equal(solveTide(b,initial).cost,minimum);
  b.closed.A=31; assert.equal(solveTide(b,initial).solution,undefined);
});

test('交接表拒绝修改岸班和未知指令，索引及损坏存档安全拒绝',()=>{
  const b=TIDES[0], v=[...b.start];
  assert.deepEqual(adjustTide(b,v,'late-0'),v); assert.deepEqual(adjustTide(b,v,'branch-1'),v);
  assert.deepEqual(adjustTide(b,v,'early-8'),v);
  for(const bad of [null,[],Array(2),[-1,0],[1,0],[0,4],[0,NaN],[0,1.6],[0,false]]) assert.equal(validTide(0,bad),false);
  assert.equal(validTide(99,v),false);
});

test('岔道教学与最终六盘必须改变至少一条线路，单靠旋转全表无法送货',()=>{
  for (const b of [TIDES[12],...TIDES.slice(42)]) {
    const sameRoutes = b.boats.map((v,i)=>({...v,routes:[v.routes[Math.floor(b.start[i]/b.period)]]}));
    assert.equal(solveTide({...b,boats:sameRoutes},b.start.map(v=>v%b.period),true).solution,undefined);
  }
});
