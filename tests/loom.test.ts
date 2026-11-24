import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTurn, contactFits, looms, loomPath, loomSolved, nextLoomTurn, packLoom, searchLoom, turnLoom, unpackLoom, validLoom, type LoomBoard } from '../src/grid-loom';

function forwardMinimum(b: LoomBoard, origin: number[]): number {
  const queue: number[][] = [origin];
  const seen = new Map([[packLoom(origin), 0]]);
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i], depth = seen.get(packLoom(state))!;
    if (loomSolved(b,state)) return depth;
    for (let drum=0; drum<b.drums.length; drum++) {
      const next = turnLoom(b,state,drum), code = packLoom(next);
      if (!seen.has(code)) { seen.set(code,depth+1); queue.push(next); }
    }
  }
  return -1;
}

for (let district = 0; district < 8; district++) {
  test(`配线织盘第 ${district+1} 区六盘开局有差错，独立向前搜索与最短提示一致，每一步均可实际拨动`, () => {
    const boards = looms.slice(district*6,district*6+6);
    assert.equal(boards.length,6);
    for (const [slot,b] of boards.entries()) {
      const i = district*6+slot, initial = [...b.opening], analysis = searchLoom(b);
      let state = [...initial], length = analysis.distance[packLoom(state)];
      assert.ok(length >= [2,4,5,5,6,6,7,8][district],b.title);
      assert.equal(forwardMinimum(b,state),length,b.title);
      assert.ok(analysis.solutions > 1 && analysis.solutions < analysis.next.length*.36);
      while (length > 0) {
        const drum = nextLoomTurn(i,state), old = [...state];
        assert.ok(canTurn(b,drum,loomPath(b,state)),b.title);
        const next = turnLoom(b,state,drum);
        assert.deepEqual(state,old); assert.notDeepEqual(next,old);
        assert.equal(analysis.distance[packLoom(next)],--length);
        state = next;
      }
      assert.ok(loomSolved(b,state)); assert.equal(nextLoomTurn(i,state),-1);
      assert.deepEqual(b.opening,initial);
    }
  });
}

test('所有公开盘具备不同的实际布线拓扑，每份验收要求都能独立排除一种看似正确的局面', () => {
  const signatures = new Set<string>();
  for (const b of looms) {
    const n = b.drums.length;
    const key = JSON.stringify([b.lanes,b.drums,b.links,b.clutches]);
    assert.ok(!signatures.has(key),b.title); signatures.add(key);
    for (const stops of b.drums) {
      assert.equal(new Set(stops).size,3);
      assert.ok(stops.every(mask => mask >= 0 && mask < (1 << (b.lanes-1)) && !(mask & (mask<<1))));
    }
    assert.ok(b.links.every(link => link.to > link.from && link.to < n && Math.abs(link.step) === 1));
    const indispensable = new Set<number>(), permutation = Array.from({length:b.lanes},(_,i) => i);
    for (let code = 0; code < 3**n; code++) {
      const stages = loomPath(b,unpackLoom(code,n));
      assert.deepEqual([...stages[n]].sort(),permutation);
      const failed = b.contacts.filter(c => !contactFits(c,stages));
      if (failed.length===1) indispensable.add(b.contacts.indexOf(failed[0]));
      if (indispensable.size === b.contacts.length) break;
    }
    assert.equal(indispensable.size,b.contacts.length,b.title);
  }
});

test('全库任意合法设定都能接着完成，堵转不能偷动齿带；可操作的离合转三次准确归位', () => {
  for (const b of looms) {
    assert.ok(searchLoom(b).distance.every(d => d >= 0));
    for (const clutch of b.clutches) {
      // Inspect a full cycle in both clutch conditions, not only the curated opening.
      let locked = false, engaged = false;
      for (let code=0; code<3**b.drums.length && !(locked && engaged); code++) {
        const v = unpackLoom(code,b.drums.length), one = turnLoom(b,v,clutch.drum);
        if (!canTurn(b,clutch.drum,loomPath(b,v))) {
          assert.deepEqual(one,v); locked = true;
        } else {
          assert.notDeepEqual(one,v);
          assert.deepEqual(turnLoom(b,turnLoom(b,one,clutch.drum),clutch.drum),v);
          engaged = true;
        }
      }
      assert.ok(locked && engaged);
    }
  }
});

test('存档只接受本盘手轮数与三档整数，忽略无效转动，织盘不依赖页面样式模块', () => {
  const b=looms[0], n=b.drums.length;
  for (const bad of [null,{},'0',new Array(n),[...b.opening,1],b.opening.map(()=>1.5),b.opening.map(()=>-1),b.opening.map(()=>3)]) assert.equal(validLoom(0,bad),false);
  assert.ok(validLoom(0,b.opening));
  assert.equal(validLoom(99,[]),false);
  for (const action of [-1,n,NaN,1.5]) assert.deepEqual(turnLoom(b,b.opening,action),b.opening);
});
