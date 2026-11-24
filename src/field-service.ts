import drawings from './field-layouts.json' with { type: 'json' };
import type { Cell, CommissionRun, Level, OpticalPort, Phase } from './levels';
import { DISTRICTS } from './district-atlas';

export const FIELD_BASE = 100;
export const SECTORS = [
  ['退信窗','夜邮秤','雨棚信槽','翻牌柜','投递道口','首班邮车'],
  ['灰车轨','引风井','煤票台','退火台','余热水箱','交接汽笛'],
  ['鱼货秤','遮雨篷','油纸摊','叫卖台','冰箱街','开市铜锣'],
  ['桥头亭','慢车道','桥腹缆','栏杆灯','分流墩','两岸换乘口'],
  ['浮标架','验潮尺','船票窗','绞盘舱','夜渡口','干船坞'],
  ['育根槽','盐水泵','遮风井','玻璃床','授粉架','背风苗棚'],
  ['字钉盘','拣字架','烘墨槽','压纸轴','活字仓','总图印床'],
  ['引水钟','浮球室','高位槽','泄压廊','环城管','门牌总闸'],
] as const;
const phase = (n: number): Phase => n ? 'cool' : 'warm';
const cell = ([x,y]: number[]): Cell => ({ x, y });
const inlet = ([x,y,dx,dy]: number[]): OpticalPort => ({ x, y, dx, dy });
export const portLabel = (c: Cell) => c.x === 0 ? `西 ${c.y}` : c.x === 12 ? `东 ${c.y}` : c.y === 0 ? `北 ${c.x}` : `南 ${c.x}`;
const inside = (c: Cell) => ({ x: Math.max(1, Math.min(11,c.x)), y: Math.max(1, Math.min(7,c.y)) });

export const FIELD_LEVELS: Level[] = drawings.map((drawing, index) => {
  const d = Math.floor(index / 6), district = DISTRICTS[d], name = SECTORS[d][index % 6];
  const runs: CommissionRun[] = drawing.runs.map(row => {
    const [start, color, end] = row as [number[], number, number[]];
    return { inlet: inlet(start), phase: phase(color), outlet: cell(end), delivery: phase(end[2]) };
  });
  const mirrors = drawing.m.map(([x,y,s,p,f], i) => ({ x,y, id: String.fromCharCode(65+i), slash: !!s, fixed: !!f, ...(p && { kind: 'prism' as const }) }));
  const first = runs[0], source = { ...first.inlet, ...inside(first.inlet) };
  const spawn = { x: 1, y: 1 }, exit = { x: 11, y: 7 };
  return { id: FIELD_BASE + index, width: 13, height: 9, name, subtitle: district.title, spawn, exit, source, mirrors,
    theme: (['archive','foundry','garden','archive','foundry','garden','archive','foundry'] as const)[d],
    solution: mirrors.map((m,i) => ({ ...m, slash: drawing.flips.includes(i) ? !m.slash : m.slash })),
    receivers: [{ ...inside(first.outlet), id: 'load', name: name + '实载', ttl: 16, phase: first.delivery }],
    briefing: `${district.resident}留下了${runs.length}条联检线。第一路接实载，其余校线从边界端口送入。所有线路共用同一组镜向。`,
    lesson: '靠近活动轴座按 Q 或 E 转向。按 N 看端口图，同时接对所有校线，让实载灯亮，再走到出口。',
    hints: ['在联检图中选一条尚未接通的线，从它要求的出口向内看，找到最后一个可能的转角。', '切到另一条线，看它是否也经过你准备转动的镜。棱镜的冷面与暖面分别转向两侧。', '透明镜面标出一个可用的全局配置。逐个对齐之后，到出口旁等待实载灯亮。'],
    walls: [], inverters: drawing.glass.map(cell), portals: drawing.wells.length ? [{ id: '井', a: cell(drawing.wells[0]), b: cell(drawing.wells[1]) }] : [],
    repeats: 1, par: 0, commission: runs };
});
export const fieldById = (id: number) => FIELD_LEVELS[id - FIELD_BASE];
