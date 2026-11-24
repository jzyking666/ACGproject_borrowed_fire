import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { DISTRICTS } from '../src/district-atlas';
import { FIELD_LEVELS } from '../src/field-service';
import { Simulation } from '../src/engine';
import type { Level } from '../src/levels';
import { looms, loomSolved, packLoom, searchLoom, turnLoom } from '../src/grid-loom';
import { TIDES, inspectTide, solveTide } from '../src/tide-dispatch';
import { SECTOR_COUNT, SECTORS_PER_DISTRICT, TRADES, jobKey, readJob } from '../src/campaign-progress';

function requireResult(condition: unknown, reason: string): asserts condition {
  if (!condition) throw Error(reason);
}
function auditField(level: Level) {
  const sim = new Simulation(level);
  const movable = level.mirrors.flatMap((m,i) => m.fixed ? [] : [i]);
  let nearest = Infinity, accepted = 0;
  for (let mask=0; mask < 2 ** movable.length; mask++) {
    let turns = 0;
    for (const [bit, i] of movable.entries()) {
      const flip = !!(mask & (1 << bit));
      sim.mirrors[i].slash = flip !== level.mirrors[i].slash;
      if (flip) turns++;
    }
    const lines = sim.commissionReadings();
    if (!lines.length || !lines.every(t => t.passes)) continue;
    // The port certificate alone is insufficient: the first delivery must power the live receiver.
    const probe = new Simulation(level); probe.mirrors = structuredClone(sim.mirrors); probe.player = {...level.exit};
    for (let step=0; step<120*45 && !probe.won; step++) probe.step(1/120,false);
    if (probe.won) { accepted++; nearest=Math.min(nearest,turns); }
  }
  requireResult(accepted>0 && nearest>0, level.name+' 应有可完成的配置，且开工布局不能直接验收。');
  return { nearest, accepted };
}

function auditLoom(index:number) {
  const board=looms[index], search=searchLoom(board);
  let v=[...board.opening]; const steps=search.distance[packLoom(v)];
  requireResult(steps>0, board.title+' 缺少待修的可达目标。');
  for(let n=0;n<steps;n++) v=turnLoom(board,v,search.next[packLoom(v)]);
  requireResult(loomSolved(board,v), board.title+' 的搜索动作无法交付。');
  return steps;
}
function auditTide(index:number) {
  const b=TIDES[index], found=solveTide(b,b.start);
  requireResult(found.solution && found.cost>0 && !inspectTide(b,found.solution).incidents.length, b.title+' 未取得可提交的班表。');
  return found.cost;
}
// Compare route shapes with lock names, boat order, branch order and direction labels erased.
function tideShape(board: typeof TIDES[number]): string {
  const permutations = (letters: string[]): string[] => letters.length
    ? letters.flatMap(c => permutations(letters.filter(x => x !== c)).map(rest => c + rest)) : [''];
  return permutations(board.locks).map(labels => board.boats.map(boat => boat.routes
    .map(route => route.replace(/[a-d]/gi, mark => labels[board.locks.indexOf(mark.toUpperCase())]))
    .sort().join('/')).sort().join(' ')).sort()[0];
}
const range = (values:number[]) => Math.min(...values) === Math.max(...values) ? String(values[0]) : `${Math.min(...values)}–${Math.max(...values)}`;
const time = (seconds:number) => {
  const minutes=Math.round(seconds/60);
  return `${Math.floor(minutes/60)} 小时 ${minutes%60} 分`;
};

// Per-job first-clear planning allowances in minutes. Keep these explicit so real CSV data
// can disprove them; do not scale solver runtime or pad the shortest path to hit a target.
const budget: readonly (readonly [number, number, number])[] = [
  [1.5,1.5,2.5], [2,2,3], [3,3,4], [4,4,5],
  [5,5,6], [5,6,7], [6,7,8], [7,8,9],
];

async function sampleFromCSV(path:string) {
  const raw=(await readFile(path,'utf8')).replace(/^\uFEFF/,'').trim();
  const [header,...rows]=raw.split(/\r?\n/);
  requireResult(header==='task_id,district,sector,trade,first_clear,active_seconds,actions,hints', path+' 的战役 CSV 表头不符。');
  const ids=new Set<string>(), districtSeconds=DISTRICTS.map(() => TRADES.map(() => 0));
  let done=0, seconds=0;
  for(const row of rows) {
    const [key,d,s,trade,clear,elapsed,actions,hints,...extra]=row.split(',');
    const entry=readJob(key);
    requireResult(entry && !extra.length && !ids.has(key) && key===jobKey(entry.trade,entry.index) && trade===entry.trade
      && String(Math.floor(entry.index/SECTORS_PER_DISTRICT)+1)===d && String(entry.index%SECTORS_PER_DISTRICT+1)===s
      && /^[01]$/.test(clear) && [elapsed,actions,hints].every(v=>typeof v==='string' && /^\d+$/.test(v) && Number.isSafeInteger(Number(v))),path+' 有缺失、重复或非法的记录。');
    ids.add(key); seconds+=Number(elapsed); done+=Number(clear);
    districtSeconds[Number(d)-1][TRADES.indexOf(entry.trade)]+=Number(elapsed);
  }
  requireResult(ids.size===SECTOR_COUNT*TRADES.length,path+' 没有列出全部任务。');
  return {done,seconds,districtSeconds};
}
function median(numbers: number[]) {
  const sorted=[...numbers].sort((a,b)=>a-b), center=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[center] : (sorted[center-1]+sorted[center])/2;
}
async function main() {
  const total=SECTOR_COUNT*TRADES.length;
  requireResult([FIELD_LEVELS.length,looms.length,TIDES.length].every(n=>n===SECTOR_COUNT),'战役题库不齐。');
  requireResult(DISTRICTS.length===budget.length,'时长预算缺少对应街区。');
  const rows:string[]=[], allField:{nearest:number;accepted:number}[]=[];
  let minutes=0;
  for(const district of DISTRICTS) {
    const start=district.id*SECTORS_PER_DISTRICT;
    const indexes=Array.from({length:SECTORS_PER_DISTRICT},(_,k)=>start+k);
    const turns=indexes.map(auditLoom), timetable=indexes.map(auditTide), fields=indexes.map(i=>auditField(FIELD_LEVELS[i]));
    allField.push(...fields);
    const [loom,tide,field]=budget[district.id], sum=(loom+tide+field)*SECTORS_PER_DISTRICT;
    minutes+=sum;
    rows.push(`| ${district.title} | ${range(turns)} | ${range(timetable)} | ${range(fields.map(f=>f.nearest))} | ${range(indexes.map(i=>FIELD_LEVELS[i].commission!.length))} | ${loom} / ${tide} / ${field} | ${sum} |`);
  }
  const report=[
    '# 战役通关内容与时长校准','',
    `${DISTRICTS.length} 区 × ${SECTORS_PER_DISTRICT} 扇区 × ${TRADES.length} 类工序 = ${total} 项。以下动作数均从发布的开工布局算起，范围取区内六单的最小值和最大值。`,
    '', '| 街区 | 织盘最短转数 | 潮汐最短调班数 | 现场最少转镜数 | 现场校线数 | 单项预算分钟（织／潮／现场） | 全区预算分钟 |',
    '|---|---:|---:|---:|---:|---:|---:|', ...rows,'',
    '织盘按合法联动与离合状态进行多目标反向广搜，再用正常轮钮复演。潮汐按整圈占闸、潮窗与货签做有限约束求解，代价为提前／推迟一拍或一次改道。两者接受所有符合规则的方案。',
    `将船名、闸号、船序、岔道顺序及上下行方向抹去后，仍有 ${new Set(TIDES.map(tideShape)).size} 种不同的逐拍占闸拓扑。此比较还忽略出发时刻、潮窗和货签。`,
    `现场穷举可动镜向，按实际端口、相位及出口逐线验证；每个合格静态方案再让真实模拟在出口收取实载。共 ${FIELD_LEVELS.filter(l=>l.commission!.length>1).length} 单要求多路同时通过，${FIELD_LEVELS.filter(l=>l.portals?.length).length} 单含导光井，${FIELD_LEVELS.filter(l=>l.inverters?.length).length} 单含换相器，${FIELD_LEVELS.filter(l=>l.mirrors.some(m=>m.kind==='prism')).length} 单含棱镜。${allField.filter(f=>f.accepted>1).length} 单有多个合格镜向。枚举把人放在出口且关闭受击，用于测量镜向问题；正常移动和受击属于单独的可玩性测试。`,
    '', '## 首次通关的设计预算','',
    `假设首次接触的玩家在前两区平均每单花 1.5–3 分钟学读盘，后续多线、交接、离合逐步增加，单项计划见表。每区为三列预算之和乘六。合计 ${minutes} 分钟（${time(minutes*60)}）。完成十小时目标需要平均每项 4 分 10 秒。预算只涵盖这 ${total} 项首次任务，不含旧版章节、支线返修、挂机和重玩。`,
    `这是待校准的关卡预算，不是人类试玩结果。若玩家比预算少用 20% 的时间，整场约为 ${time(minutes*60*.8)}。最短动作数只能描述操作结构，无法推导人的推理时间，更不能保证每位玩家都超过十小时。`,
    '', '## 首通试玩样本','',
  ];
  const files=process.argv.slice(2);
  if(files.length) {
    const samples=await Promise.all(files.map(sampleFromCSV));
    const completedRuns=samples.filter(s=>s.done===total);
    const complete=completedRuns.map(s=>s.seconds).sort((a,b)=>a-b);
    report.push(`本次提供 ${samples.length} 份战役 CSV，其中 ${complete.length} 份已完成、${samples.length-complete.length} 份尚未完成。`);
    if(complete.length) {
      report.push(`完整样本的有效通关时间：最快 ${time(complete[0])}，中位 ${time(median(complete))}，最慢 ${time(complete.at(-1)!)}。其中 ${complete.filter(s=>s>=36000).length} 份达到十小时。`);
      report.push('', '| 街区 | 实测中位分钟 / 织盘 | 实测中位分钟 / 潮汐 | 实测中位分钟 / 现场 |',
        '|---|---:|---:|---:|');
      for (const district of DISTRICTS) {
        const perTrade=TRADES.map((_,trade)=>median(completedRuns.map(sample=>sample.districtSeconds[district.id][trade]))/(60*SECTORS_PER_DISTRICT));
        report.push(`| ${district.title} | ${perTrade.map(n=>n.toFixed(2)).join(' | ')} |`);
      }
      report.push('', '分区数值先累加每位完成人在该区该工种的六单用时，再取玩家间的中位数并除以六。可与上表的单项预算逐格对照。');
    }
  } else report.push('本次未提供玩家 CSV，没有实测通关时长。');
  report.push('每名首次试玩者单独存档，终局导出一次 CSV。运行 npm run audit:campaign -- 路径1.csv 路径2.csv 可比较完整样本的有效用时；相同玩家的多份中间导出请勿重复输入。保留未完成样本及中途停下的原因。计时只覆盖前台有效任务，长时间静静思考可能被判为空闲；提示使用、熟练程度也应随样本记录。若完整样本系统性提前结束，应回访过快的工单，调整内容后重测。');
  const output=report.join('\n')+'\n';
  await mkdir('test-results',{recursive:true});
  await writeFile('test-results/campaign-audit.md',output);
  process.stdout.write(output);
}
await main();
