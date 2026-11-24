/** Rebuild the shipped installations only when intentionally revising campaign content.
 * node --import tsx scripts/curate-looms.ts
 * Trials are deterministic. Every candidate is checked against the complete state space. */
import { writeFileSync } from 'node:fs';
import { loomPath, contactFits, searchLoom, unpackLoom, type LoomBoard } from '../src/grid-loom';

const names = [
  ['一根钟线', '折进里侧', '最后一只接头', '错层的灯座', '两路同到', '先过中缝'],
  ['半路取电', '看得见的针脚', '墙内测孔', '上层与下层', '一分为二的读数', '三处验线'],
  ['暂封的孔', '把热线借过去', '一段冷床', '越过禁区', '旁边仍要亮', '带电的空位'],
  ['一只手两根轴', '错开的齿带', '末端跟着转', '同转一格', '给中间留口', '相扣的两对轮'],
  ['同一根铜丝', '认回另一头', '两只无名端子', '反齿回转', '接缝处有人', '谁穿过两道门'],
  ['手轮先吃电', '把钥匙送上去', '借线开锁', '只给手轮供电', '放开后换路', '过锁再折返'],
  ['两条街的同梭', '反齿与双针', '三角形的封条', '牵一动三', '错开的钥匙孔', '交给另一扇闸'],
  ['五路通宵', '先合哪道锁', '不留暗线', '名字被擦掉的插口', '收起试灯', '所有线的去处'],
];
const lengths = [[2,3,3,4,4,4],[4,4,5,5,5,5],[5,5,5,5,6,6],[5,5,6,6,6,6],[5,6,6,6,6,7],[5,6,6,6,7,7],[6,6,7,7,7,7],[7,7,7,7,7,8]];
const minimum = [[2,3,3,4,4,4],[4,4,5,5,5,6],[5,5,6,6,6,7],[5,6,6,7,7,8],[6,6,7,7,7,8],[6,7,7,8,8,9],[7,8,8,9,9,10],[8,9,9,10,10,12]];
function rng(seed: number) {
  return (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * n); };
}
function candidate(d: number, s: number, trial: number): LoomBoard | undefined {
  const random = rng(1_234_567 * (6*d+s+1) + trial * 24317);
  const lanes = d < 1 && s < 4 ? 3 : d < 4 && (d !== 3 || s < 4) ? 4 : 5;
  const n = lengths[d][s];
  const masks = Array.from({length: (1 << (lanes-1))-1}, (_,i) => i+1)
    .filter(m => !(m & (m << 1)) && (d >= 6 || !(m & (m-1))));
  const board: LoomBoard = { title: names[d][s], lanes, drums: [], links: [], clutches: [], contacts: [], opening: [] };
  for (let i=0; i<n; i++) {
    const a = masks[random(masks.length)], others = masks.filter(m => m !== a);
    board.drums.push([0,a,others[random(others.length)]]);
  }
  if (board.drums.flat().reduce((a,b) => a|b,0) !== (1 << (lanes-1))-1) return;
  if (d >= 3) {
    const sources = Array.from({length:n-1},(_,i) => i);
    for (let j=0; j < (d >= 6 ? 3 : s >= 3 ? 2 : 1); j++) {
      const from = sources.splice(random(sources.length),1)[0];
      board.links.push({from, to: from + 1 + random(n-from-1), step: d >= 4 && j === 0 ? -1 : 1});
    }
  }
  // The maintenance key for a drum was cut with a different upstream circuit.
  if (d >= 5) {
    const count = d >= 7 || d === 6 && s >= 4 ? 2 : 1;
    const columns = Array.from({length:n-2},(_,i) => i+2);
    const keyRoute = loomPath(board, Array.from({length:n}, () => random(3)));
    for (let i=0; i<count; i++) {
      const drum = columns.splice(random(columns.length),1)[0], lane = random(lanes);
      const wire = keyRoute[drum][lane];
      if (wire === lane) return;
      board.clutches.push({ drum, lane, wire });
    }
  }
  const witness = Array.from({length:n}, () => random(3));
  const path = loomPath(board,witness);
  const add = (kind: 'end' | 'tap' | 'isolate' | 'match') => {
    const at = kind === 'end' ? n : 1 + random(n-1), lane = random(lanes);
    if (kind === 'match') {
      const earlier = random(at-1) + 1;
      if (earlier === at) return;
      const otherLane = path[earlier].indexOf(path[at][lane]);
      if (lane === otherLane) return;
      board.contacts.push({kind, at, lane, other:{at:earlier,lane:otherLane}});
    } else {
      const wire = kind === 'isolate' ? (path[at][lane]+1+random(lanes-1))%lanes : path[at][lane];
      board.contacts.push({kind:kind === 'isolate' ? 'isolate' : 'feed', at, lane, wire});
    }
  };
  add('end');
  if (d === 0 && s === 0 && board.contacts[0].kind === 'feed' && board.contacts[0].wire !== 0) return;
  if (s > 1 || d > 0) add('end');
  if (d >= 1 || s === 5) add('tap');
  if (d >= 2) add('isolate');
  if (d >= 4) { const before = board.contacts.length; add('match'); if (before === board.contacts.length) return; }
  if (d >= 7 && s >= 2) add('tap');
  if (new Set(board.contacts.map(c => c.at*8+c.lane)).size !== board.contacts.length) return;
  const conditions = board.contacts.length, essential = new Set<number>();
  for (let code=0; code<3**n && essential.size<conditions; code++) {
    const stages = loomPath(board,unpackLoom(code,n));
    const fail = board.contacts.filter(c => !contactFits(c,stages));
    if (fail.length === 1) essential.add(board.contacts.indexOf(fail[0]));
  }
  if (essential.size !== conditions) return;
  const search = searchLoom(board);
  let best = -1, score = -1;
  for (let code=0; code<search.distance.length; code++) {
    if (search.distance[code] < minimum[d][s]) continue;
    const values = unpackLoom(code,n), stages = loomPath(board,values);
    // Introduced rules have an observable problem to solve in the opening installation.
    if (board.contacts.slice(-1).some(c => contactFits(c,stages))) continue;
    if (d >= 5 && board.clutches.every(c => stages[c.drum][c.lane] === c.wire)) continue;
    const merit = search.distance[code] + random(5) * .18;
    if (merit > score) { best = code; score = merit; }
  }
  if (best === -1 || search.solutions > search.distance.length*.36) return;
  board.opening = unpackLoom(best,n);
  return board;
}
const boards: LoomBoard[] = [];
for (let d=0; d<8; d++) for (let s=0; s<6; s++) {
  let result: LoomBoard | undefined;
  for (let trial=0; !result && trial<10000; trial++) result = candidate(d,s,trial);
  if (!result) throw new Error('No curated board for '+names[d][s]);
  boards.push(result);
  console.log(d+1, s+1, result.title);
}
const lines = boards.map(b => {
  const q = (key: keyof LoomBoard) => '    '+key+': '+ JSON.stringify(b[key]);
  return '  {\n'+ (Object.keys(b) as (keyof LoomBoard)[]).map(q).join(',\n')+'\n  },';
});
writeFileSync('src/loom-catalog.ts', "import type { LoomBoard } from './grid-loom';\n\n// Fixed campaign installations. Reproduced by scripts/curate-looms.ts.\nexport const loomCatalog: LoomBoard[] = [\n"+lines.join('\n')+'\n];\n');
