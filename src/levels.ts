export type Cell = { x: number; y: number };
export type Mirror = Cell & { id: string; slash: boolean; fixed?: boolean };
export type Phase = 'warm' | 'cool';
export type Receiver = Cell & { id: string; name: string; ttl: number; phase?: Phase };
export interface Level {
  id: number; name: string; subtitle: string; briefing: string; lesson: string;
  width: number; height: number; spawn: Cell; exit: Cell;
  source: Cell & { dx: number; dy: number };
  mirrors: Mirror[]; receivers: Receiver[]; walls: Cell[];
  delay?: Cell; repeats: number; offGrid?: boolean; par: number;
  solution: Mirror[]; hints: string[];
  theme?: 'foundry' | 'garden' | 'archive';
  plates?: (Cell & { id: string })[];
  gates?: (Cell & { plate: string })[];
  portals?: { id: string; a: Cell; b: Cell }[];
  inverters?: Cell[];
}
const m = (id: string, x: number, y: number, slash: boolean, fixed = false): Mirror => ({ id, x, y, slash, fixed });
const r = (id: string, x: number, y: number, name: string, ttl = 8): Receiver => ({ id, x, y, name, ttl });
const rect = (l = 2, t = 2, right = 10, b = 6) => [m('a', l, t, true), m('b', right, t, false), m('c', right, b, true), m('d', l, b, false)];
export const LEVELS: Level[] = [
  {
    id: 0, name: '借一道光', subtitle: '01 / FIRST CONTACT',
    briefing: '安保系统没有认出你的工牌。好消息是：它的弹药，刚好也能给门供电。',
    lesson: '靠近反射器按 E 拿起，Q 旋转，朝向空地按 E 放下。将脉冲引向接收环，然后走进出口。',
    width: 13, height: 9, spawn: { x: 4, y: 6 }, exit: { x: 11, y: 2 },
    source: { x: 2, y: 5, dx: 1, dy: 0 },
    mirrors: [m('a', 5, 6, false)], receivers: [r('gate', 8, 2, '出口供电', 10)],
    walls: [{ x: 10, y: 4 }, { x: 10, y: 5 }, { x: 10, y: 6 }], repeats: 1, par: 35,
    solution: [m('a', 8, 5, true)],
    hints: ['脉冲碰到接收环后会继续前进。门上的计时环表示剩余供电时间。', '需要在发射器同一行，把向右的脉冲折向上方。', '把反射器放在高亮轮廓中，调整到斜线 /，等待出口通电。'],
  },
  {
    id: 1, name: '两次转弯', subtitle: '02 / AROUND THE CORNER',
    briefing: '维修记录：直线距离最短，但管理层坚持把门装在拐角后面。',
    lesson: '两个反射器可以接力。观察模式可暂停时间，并显示当前装置的预计弹道。',
    width: 13, height: 9, spawn: { x: 4, y: 5 }, exit: { x: 2, y: 2 },
    source: { x: 2, y: 6, dx: 1, dy: 0 },
    mirrors: [m('a', 4, 4, false), m('b', 9, 5, true)], receivers: [r('gate', 4, 2, '出口供电', 9)],
    walls: [{ x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }], repeats: 1, par: 65,
    solution: [m('a', 8, 6, true), m('b', 8, 2, false)],
    hints: ['先绕过中间的隔断，再从右侧向上。', '第一面镜把脉冲折向上，第二面镜把脉冲折向左。', '按轮廓放置：右下 /，右上 \\。供电后从隔断的左侧走向出口。'],
  },
  {
    id: 2, name: '别让它结束', subtitle: '03 / THE FIRST LOOP',
    briefing: '这扇门需要同一颗脉冲重复经过。一次性的帮助，不在长期供电协议里。',
    lesson: '让同一颗脉冲两次经过接收环，建立持续供电。带铆钉的反射器已固定，不能搬动。',
    width: 13, height: 9, spawn: { x: 5, y: 5 }, exit: { x: 11, y: 4 },
    source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: [m('a', 2, 2, true, true), m('b', 10, 2, false, true), m('c', 8, 5, false), m('d', 2, 6, false, true)],
    receivers: [r('gate', 6, 2, '循环验证', 8)], walls: [], repeats: 2, par: 55,
    solution: rect().map(a => ({ ...a, fixed: a.id !== 'c' })),
    hints: ['接收环上的两个刻度，必须由同一颗脉冲点亮。', '三面固定镜已经围成大半个环，只缺右下角。', '将活动镜放到右下轮廓，方向 /。闭环后，等待脉冲绕行两次。'],
  },
  {
    id: 3, name: '一光两用', subtitle: '04 / SHARED CURRENT',
    briefing: '库存只剩一份能源。幸运的是，电梯和门还没学会互相争功。',
    lesson: '两个接收环必须同时保持供电，而且都需要验证循环。供电过期会失去验证。',
    width: 13, height: 9, spawn: { x: 5, y: 4 }, exit: { x: 11, y: 2 },
    source: { x: 5, y: 6, dx: 1, dy: 0 },
    mirrors: [m('a', 3, 3, false), m('b', 8, 3, true), m('c', 8, 5, false), m('d', 3, 5, true)],
    receivers: [r('lift', 2, 4, '中继模块'), r('gate', 10, 4, '出口供电')],
    walls: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }], repeats: 2, par: 125,
    solution: rect(),
    hints: ['一颗脉冲可以依次经过多个接收环，并不需要分裂。', '在两个接收环外侧，构建一个包住整个房间的矩形循环。', '把四面镜放到四个轮廓：左上 /，右上 \\，右下 /，左下 \\。'],
  },
  {
    id: 4, name: '慢半拍', subtitle: '05 / BUFFER MEMORY',
    briefing: '缓冲器会扣留脉冲一小会儿。维修手册称之为功能，不是故障。',
    lesson: '金色缓冲器延迟脉冲 1.2 秒。循环必须在供电耗尽前完成，优先尝试紧凑的路线。',
    width: 13, height: 9, spawn: { x: 5, y: 4 }, exit: { x: 11, y: 3 },
    source: { x: 5, y: 6, dx: 1, dy: 0 },
    mirrors: [m('a', 4, 3, false), m('b', 8, 3, true), m('c', 8, 5, false), m('d', 4, 5, true)],
    receivers: [r('upper', 5, 2, '冷却系统', 6.8), r('gate', 9, 4, '出口供电', 6.8)],
    walls: [{ x: 2, y: 3 }, { x: 2, y: 5 }, { x: 10, y: 6 }], delay: { x: 3, y: 4 }, repeats: 2, par: 140,
    solution: rect(3, 2, 9, 6),
    hints: ['观察模式里可以看见脉冲会在哪里转弯。金色装置会让它停顿。', '两个接收环之间的回路越短，越容易保持供电。', '沿四个轮廓接成紧凑矩形。缓冲器上方与下方的镜应处于同一列。'],
  },
  {
    id: 5, name: '离网运行', subtitle: '06 / OFF THE GRID',
    briefing: '总部要求关闭发射装置。总部同时要求照常供电。你决定让他们都满意。',
    lesson: '先建立循环，再靠近发射器按 E 关闭它。已有脉冲会继续运行，停止供电则不能离开。',
    width: 13, height: 9, spawn: { x: 5, y: 4 }, exit: { x: 11, y: 4 },
    source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: [m('a', 3, 3, true), m('b', 9, 3, true), m('c', 9, 5, false), m('d', 3, 5, false)],
    receivers: [r('gate', 6, 2, '独立供电'), r('lift', 10, 4, '中继模块')],
    walls: [{ x: 6, y: 4 }, { x: 7, y: 4 }], repeats: 2, offGrid: true, par: 135,
    solution: rect(),
    hints: ['关闭发射器不会清除已经存在的脉冲。', '先验证两个接收环的循环，再从侧面接近发射器。', '按轮廓接成矩形，等两个环亮起，再到发射器附近按 E。不要打断运行中的循环。'],
  },
  {
    id: 6, name: '最后一班', subtitle: '07 / BORROWED FIRE',
    briefing: '最后一间机房，最后一班。把借来的光留给这里，然后回家。',
    lesson: '六面反射器，三个接收环。让循环绕过隔墙，离网后从出口结束夜班。',
    width: 13, height: 9, spawn: { x: 4, y: 4 }, exit: { x: 11, y: 2 },
    source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: [m('a', 3, 3, false), m('b', 5, 3, true), m('c', 9, 5, false), m('d', 3, 5, true), m('e', 7, 5, true), m('f', 5, 5, true)],
    receivers: [r('top', 4, 2, '通讯系统'), r('left', 2, 4, '冷却系统'), r('bottom', 8, 6, '出口供电')],
    walls: [{ x: 8, y: 2 }, { x: 8, y: 3 }, { x: 9, y: 2 }, { x: 9, y: 3 }], repeats: 2, offGrid: true, par: 210,
    solution: [m('a', 2, 2, true), m('b', 6, 2, false), m('c', 10, 6, true), m('d', 2, 6, false), m('e', 10, 4, false), m('f', 6, 4, false)],
    hints: ['并非所有循环都是矩形。让光绕过隔墙，形成一个凹进去的环。', '右侧路线从底部向上，到隔墙下方后折向左，再向上。', '六个轮廓展示了一种解法。注意中间连续的两面反射器都是 \\。完成后关闭发射器。'],
  },
];

// Relay wing: freely accessible experiments; original level identifiers stay stable for old saves.
const relayLoop = () => [m('a', 2, 1, true), m('b', 6, 1, false), m('c', 10, 6, true), m('d', 2, 6, false)];
const relayStart = () => [m('a', 3, 4, false), m('b', 5, 4, true), m('c', 9, 5, false), m('d', 3, 5, true)];
const partition = () => Array.from({ length: 11 }, (_, i) => ({ x: i + 1, y: 3 })).filter(c => c.x !== 2);
const well = () => [{ id: 'A', a: { x: 10, y: 4 }, b: { x: 6, y: 2 } }];
LEVELS.push(
  {
    id: 7, name: '留下一个人', subtitle: '08 / THE ANCHOR', theme: 'foundry',
    briefing: '光闸只认压板，不认工牌。你可以站上去，也可以找一件愿意替你值班的重物。',
    lesson: '人或放下的反射器都能压住压板。对应光闸只拦脉冲，人可以穿过。Z 撤销上次装置操作。',
    width: 13, height: 9, spawn: { x: 4, y: 6 }, exit: { x: 11, y: 2 }, source: { x: 2, y: 5, dx: 1, dy: 0 },
    mirrors: [m('a', 5, 6, false), m('b', 4, 4, true)], receivers: [r('gate', 8, 2, '出口供电', 10)],
    walls: [{ x: 10, y: 4 }, { x: 10, y: 5 }], plates: [{ id: 'I', x: 4, y: 3 }], gates: [{ plate: 'I', x: 3, y: 5 }],
    repeats: 1, par: 65, solution: [m('a', 8, 5, true), m('b', 4, 3, false)],
    hints: ['压住 I 号压板，I 号光闸就会放行。', '反射器除了改变光路，也有重量。', '一面镜压住 (4,3) 的压板，另一面镜放在 (8,5)，方向 /。'],
  },
  {
    id: 8, name: '隔墙有耳', subtitle: '09 / FOLDED SPACE', theme: 'archive',
    briefing: '两个导光井之间没有走廊。对光来说，这不是问题。',
    lesson: '同字母导光井成对传送脉冲，方向和身份保持不变；它们不传送维修员。',
    width: 13, height: 9, spawn: { x: 5, y: 5 }, exit: { x: 11, y: 1 }, source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: relayStart(), receivers: [r('top', 4, 1, '远端通讯'), r('bottom', 7, 6, '底层中继')],
    walls: partition(), portals: well(), repeats: 2, par: 120, solution: relayLoop(),
    hints: ['不要尝试让人穿过导光井。先观察光从另一端出来后的方向。', '右下角折向上方后，光会从上方的井继续向上。', '四角依次是 (2,1) /、(6,1) \\、(10,6) /、(2,6) \\。'],
  },
  {
    id: 9, name: '冷暖之间', subtitle: '10 / PHASE GARDEN', theme: 'garden',
    briefing: '温室要冷光，旧电梯要暖光。这里没有第二台发射器。',
    lesson: '菱形换相器将暖光与冷光互换。带冷／暖标记的接收环只接收对应脉冲。',
    width: 13, height: 9, spawn: { x: 5, y: 5 }, exit: { x: 11, y: 2 }, source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: relayStart(), receivers: [{ ...r('cold', 10, 4, '冷却泵'), phase: 'cool' }, { ...r('warm', 4, 2, '恒温电梯'), phase: 'warm' }],
    walls: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }], inverters: [{ x: 7, y: 6 }, { x: 7, y: 2 }],
    repeats: 2, par: 125, solution: rect(),
    hints: ['颜色不对的脉冲会穿过接收环，但不会供电。', '沿回路经过两次换相，脉冲才会恢复出发时的颜色。', '四角放在 (2,2)、(10,2)、(10,6)、(2,6)，依次 /、\\、/、\\。'],
  },
  {
    id: 10, name: '无人值守', subtitle: '11 / UNATTENDED', theme: 'foundry',
    briefing: '回路能运行，不代表你能走。把自己的岗位交出去，再去开门。',
    lesson: '组合导光井与压板：离开压板后仍需保持闭环。找出哪一面反射器可以充当压舱物。',
    width: 13, height: 9, spawn: { x: 5, y: 5 }, exit: { x: 11, y: 1 }, source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: [...relayStart(), m('e', 8, 5, true)], receivers: [r('top', 3, 1, '远端电梯'), r('bottom', 7, 6, '出口供电')],
    walls: partition(), portals: well(), plates: [{ id: 'I', x: 8, y: 4 }], gates: [{ plate: 'I', x: 5, y: 6 }],
    repeats: 2, par: 150, solution: [...relayLoop(), m('e', 8, 4, false)],
    hints: ['第五面反射器不一定要在光路上。', '先维持压板，再通过导光井接成远端回路。', '四个转角与隔墙有耳相同；额外反射器放在 (8,4) 压板上。'],
  },
  {
    id: 11, name: '把夜晚折起来', subtitle: '12 / NIGHT RELAY', theme: 'garden',
    briefing: '让一颗光穿过两个空间、两种温度和一道锁。等它自己学会回家，你就可以下班了。',
    lesson: '冷暖换相、导光井与压板光闸组合。三环完成循环验证后，关闭发射器并离开。',
    width: 13, height: 9, spawn: { x: 5, y: 5 }, exit: { x: 11, y: 1 }, source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: [...relayStart(), m('e', 8, 5, true)],
    receivers: [{ ...r('cold', 5, 1, '夜间温室'), phase: 'cool' }, { ...r('warm', 2, 4, '通讯信标'), phase: 'warm' }, r('bottom', 6, 6, '离网中继')],
    walls: partition(), portals: well(), plates: [{ id: 'I', x: 8, y: 4 }], gates: [{ plate: 'I', x: 5, y: 6 }],
    inverters: [{ x: 7, y: 6 }, { x: 4, y: 1 }], repeats: 2, offGrid: true, par: 180,
    solution: [...relayLoop(), m('e', 8, 4, false)],
    hints: ['先看清颜色的顺序，再考虑如何离网。', '顶部接收冷光；左侧接收暖光。压板必须有人或反射器持续占据。', '四角沿用导光井回路，额外镜压住 (8,4)。循环验证完成后关闭发射器。'],
  },
);
