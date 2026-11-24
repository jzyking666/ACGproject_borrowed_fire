export type Cell = { x: number; y: number };
export type Mirror = Cell & { id: string; slash: boolean; fixed?: boolean; kind?: 'prism' };
export type Phase = 'warm' | 'cool';
export type OpticalPort = Cell & { dx: number; dy: number };
export interface CommissionRun { inlet: OpticalPort; phase: Phase; outlet: Cell; delivery: Phase }
export type Receiver = Cell & { id: string; name: string; ttl: number; phase?: Phase };
export interface Level {
  id: number; name: string; subtitle: string; briefing: string; lesson: string;
  width: number; height: number; spawn: Cell; exit: Cell;
  source: Cell & { dx: number; dy: number };
  mirrors: Mirror[]; receivers: Receiver[]; walls: Cell[];
  delay?: Cell; repeats: number; offGrid?: boolean; par: number;
  solution: Mirror[]; hints: string[];
  theme?: 'foundry' | 'garden' | 'archive';
  plates?: (Cell & { id: string; echoOnly?: boolean })[];
  gates?: (Cell & { plate: string; requires?: string[]; inverted?: boolean; poweredBy?: string })[];
  echoLimit?: number;
  echoSolution?: { start: Cell; steps: { target: Cell; wait: number }[]; period?: number }[];
  portals?: { id: string; a: Cell; b: Cell }[];
  commission?: CommissionRun[];
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
    walls: [{ x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 5 }, { x: 4, y: 4 }, { x: 10, y: 6 }], delay: { x: 3, y: 4 }, repeats: 2, par: 140,
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
    lesson: '压板先开闸，出口环收到光后接管光闸；即使离开压板也能继续供电。只用一面镜时，试着自己完成启动。',
    width: 13, height: 9, spawn: { x: 4, y: 6 }, exit: { x: 11, y: 2 }, source: { x: 2, y: 5, dx: 1, dy: 0 },
    mirrors: [m('a', 5, 6, false), m('b', 4, 4, true)], receivers: [r('gate', 8, 2, '出口供电', 10)],
    walls: [{ x: 10, y: 4 }, { x: 10, y: 5 }], plates: [{ id: 'I', x: 4, y: 3 }], gates: [{ plate: 'I', x: 3, y: 5, poweredBy: 'gate' }],
    repeats: 1, par: 65, solution: [m('a', 8, 5, true), m('b', 4, 3, false)],
    hints: ['压住 I 号压板，I 号光闸就会放行。', '出口环通电后会接管闸门。可以用备用镜压板，也可以自己站上去等第一颗光通过。', '反射器放在 (8,5)，方向 /；站在 (4,3) 压板上等出口环亮起，再离开。备用镜也能代替人压板。'],
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
    lesson: '远端电梯通电后会接管光闸。先压板启动跨区回路，再离开岗位；断电后光闸重新需要压板。',
    width: 13, height: 9, spawn: { x: 5, y: 5 }, exit: { x: 11, y: 1 }, source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: [...relayStart(), m('e', 8, 5, true)], receivers: [r('top', 3, 1, '远端电梯'), r('bottom', 7, 6, '出口供电')],
    walls: partition(), portals: well(), plates: [{ id: 'I', x: 8, y: 4 }], gates: [{ plate: 'I', x: 5, y: 6, poweredBy: 'top' }],
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

// Postscript: movement becomes a programmable resource rather than another carried item.
const stay = (x: number, y: number) => ({ start: { x, y }, steps: [{ target: { x, y }, wait: .8 }] });
LEVELS.push(
  {
    id: 12, name: '把自己留在这里', subtitle: '13 / AFTERIMAGE', theme: 'garden', echoLimit: 1,
    briefing: '阿苇找到了旧投影器。它记不住你说的话，但能记住你走过的路。',
    lesson: '站在标记 I 的示教板上，F 开始记录，再按 F 结束；投影会循环走位并压住示教板。G 移除最后一个投影。',
    width: 13, height: 9, spawn: { x: 4, y: 6 }, exit: { x: 11, y: 2 }, source: { x: 2, y: 5, dx: 1, dy: 0 },
    mirrors: [m('a', 5, 6, false)], receivers: [r('gate', 8, 2, '示教回执', 10)], walls: [{ x: 10, y: 4 }, { x: 10, y: 5 }],
    plates: [{ id: 'I', x: 4, y: 3, echoOnly: true }], gates: [{ plate: 'I', x: 3, y: 5 }], repeats: 1, par: 70,
    solution: [m('a', 8, 5, true)], echoSolution: [stay(4, 3)],
    hints: ['带投影标记的示教板只认回声，人和反射器都不能代替。', '示教时可以停在原地，记录结束后投影会留在那里。', '在 I 板 (4,3) 记录一段静止轨迹；反射器放到 (8,5)，方向 /。'],
  },
  {
    id: 13, name: '两处同时有人', subtitle: '14 / TWO SIGNATURES', theme: 'archive', echoLimit: 2,
    briefing: '两处检查点必须同时应答。你可以分两次示教，但回执得在同一时刻成立。',
    lesson: '最多保存两段回声。I 与 II 同时被投影占据，双锁光闸才放行；四面镜仍需留给光路。',
    width: 13, height: 9, spawn: { x: 5, y: 5 }, exit: { x: 11, y: 2 }, source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: relayStart(), receivers: [r('top', 6, 2, '双重签收'), r('right', 10, 4, '远端回执')],
    walls: [{ x: 6, y: 3 }, { x: 6, y: 4 }],
    plates: [{ id: 'I', x: 4, y: 4, echoOnly: true }, { id: 'II', x: 8, y: 4, echoOnly: true }],
    gates: [{ plate: 'I', requires: ['I', 'II'], x: 5, y: 6 }], repeats: 2, par: 140,
    solution: rect(), echoSolution: [stay(4, 4), stay(8, 4)],
    hints: ['一次长巡逻不等于同时在两处值守。', '先在一块示教板录下静止轨迹，再去另一块录第二段。', '两块板各放一个静止回声；四个转角是 (2,2) /、(10,2) 反斜线、(10,6) /、(2,6) 反斜线。'],
  },
  {
    id: 14, name: '留守与让路', subtitle: '15 / MAKE WAY', theme: 'foundry', echoLimit: 1,
    briefing: '同一块板同时控制两道闸，一开一关。留在原地会让后一扇永远关着。',
    lesson: '橙色反向闸在示教板空闲时放行。录下“停留—离开—回来”的巡逻，让脉冲依次通过两道闸。',
    width: 13, height: 9, spawn: { x: 4, y: 6 }, exit: { x: 11, y: 2 }, source: { x: 2, y: 5, dx: 1, dy: 0 },
    mirrors: [m('a', 5, 6, false)], receivers: [r('gate', 8, 2, '接力回执', 10)], walls: [],
    plates: [{ id: 'I', x: 4, y: 3, echoOnly: true }], gates: [{ plate: 'I', x: 3, y: 5 }, { plate: 'I', x: 6, y: 5, inverted: true }],
    repeats: 1, par: 110, solution: [m('a', 8, 5, true)],
    echoSolution: [{ start: { x: 4, y: 3 }, steps: [{ target: { x: 4, y: 3 }, wait: .55 }, { target: { x: 4, y: 4 }, wait: .6 }, { target: { x: 4, y: 3 }, wait: 0 }] }],
    hints: ['脉冲通过第一道闸后，还需要一点时间才到第二道。', '只录静止轨迹会让后一扇闸一直关闭。试着在板上停半秒，再走开一格。', '在 (4,3) 开始，停约半秒，走到 (4,4) 再停半秒，然后走回来结束示教。镜子放到 (8,5)，方向 /。'],
  },
  {
    id: 15, name: '会交班的花园', subtitle: '16 / A GARDEN THAT REMEMBERS', theme: 'garden', echoLimit: 2,
    briefing: '你已经赶上过末班车。今天回来，是为了让下一班也能准时走。',
    lesson: '两段示教、双锁光闸、跨空间传输与冷暖供给。验证后关闭发射器，把独立运行的花园交出去。',
    width: 13, height: 9, spawn: { x: 5, y: 5 }, exit: { x: 11, y: 1 }, source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: relayStart(), receivers: [{ ...r('cold', 5, 1, '夜间温室'), phase: 'cool' }, { ...r('warm', 2, 4, '通讯信标'), phase: 'warm' }, r('bottom', 6, 6, '离网中继')],
    walls: partition(), portals: well(), inverters: [{ x: 7, y: 6 }, { x: 4, y: 1 }],
    plates: [{ id: 'I', x: 4, y: 4, echoOnly: true }, { id: 'II', x: 8, y: 4, echoOnly: true }],
    gates: [{ plate: 'I', requires: ['I', 'II'], x: 5, y: 6 }], repeats: 2, offGrid: true, par: 200,
    solution: relayLoop(), echoSolution: [stay(4, 4), stay(8, 4)],
    hints: ['回声只重放走位，不会拿镜子、反射脉冲或替你开关发射器。', '将两段回声留在示教板，自己去完成跨空间的冷暖回路。', '两块板各留一个静止回声；四个转角与隔墙有耳相同。等三处验证后关闭来源。'],
  },
);

// Two practical exercises turn recorded movement into a timed relay, rather
// than treating each echo as a stationary key. Both remain freely accessible.
LEVELS.push(
  {
    id: 16, name: '一个人的接力', subtitle: '17 / WALK THE SIGNAL', theme: 'archive', echoLimit: 1,
    briefing: '新人问，两个检查点是不是一定要两段示教。阿苇把投影器调到只剩一个名额。',
    lesson: '同一段回声先占据 I，再走到 II。两块板各控制一道闸；用回声调度调整播放相位，配合 B 推演检查交接窗口。',
    width: 13, height: 9, spawn: { x: 4, y: 6 }, exit: { x: 11, y: 2 }, source: { x: 2, y: 5, dx: 1, dy: 0 },
    mirrors: [m('a', 5, 6, false)], receivers: [r('gate', 10, 2, '接力签收', 12)], walls: [{ x: 9, y: 3 }, { x: 9, y: 4 }],
    plates: [{ id: 'I', x: 4, y: 3, echoOnly: true }, { id: 'II', x: 7, y: 3, echoOnly: true }],
    gates: [{ plate: 'I', x: 3, y: 5, poweredBy: 'gate' }, { plate: 'II', x: 7, y: 5, poweredBy: 'gate' }], repeats: 1, par: 120,
    solution: [m('a', 10, 5, true)],
    echoSolution: [{ start: { x: 4, y: 3 }, steps: [{ target: { x: 4, y: 3 }, wait: .25 }, { target: { x: 7, y: 3 }, wait: 1 }] }],
    hints: ['一个静止投影只能打开一扇闸。这次要让脚步跟上光。', '从 I 板短暂停留后走向 II。光从第一扇到第二扇闸，大约需要一秒。', '反射器在 (10,5) /；I 板记录约四分之一秒，沿直线走到 II 停留一秒。用调度器微调或等待下一次发射。'],
  },
  {
    id: 17, name: '每一圈都要交班', subtitle: '18 / KEEP YOUR APPOINTMENT', theme: 'garden', echoLimit: 1,
    briefing: '开一次门不难。难的是每一圈回来时，都有人在约好的地方等。',
    lesson: '两道示教闸都位于循环光路。回声既要赶上两个检查点，也要与整圈周期一致；设置试验点，推演后微调相位，再验证离网。',
    width: 13, height: 9, spawn: { x: 5, y: 5 }, exit: { x: 11, y: 2 }, source: { x: 4, y: 6, dx: 1, dy: 0 },
    mirrors: relayStart(), receivers: [r('top', 6, 2, '周期回执'), r('right', 10, 4, '接力中继')],
    walls: [{ x: 6, y: 3 }], plates: [{ id: 'I', x: 4, y: 4, echoOnly: true }, { id: 'II', x: 7, y: 4, echoOnly: true }],
    gates: [{ plate: 'I', x: 5, y: 6 }, { plate: 'II', x: 9, y: 6 }], repeats: 2, offGrid: true, par: 240,
    solution: rect(),
    echoSolution: [{ start: { x: 4, y: 4 }, steps: [{ target: { x: 4, y: 4 }, wait: .22 }, { target: { x: 7, y: 4 }, wait: .6 }, { target: { x: 4, y: 4 }, wait: 2.9833333333333334 }], period: 24 / 4.2 }],
    hints: ['首圈供电不等于下一圈也能通过。比较回声周期和光的整圈时间。', '参考矩形的周长是 24 格。以每秒 4.2 格运行，一圈约 5.714 秒；可在调度器输入周期。', '四角为 (2,2) /、(10,2) 反斜线、(10,6) /、(2,6) 反斜线。I 停约 0.22 秒，直走 II 停 0.6 秒，再回 I 停到接近六秒。调周期为 5.714 秒，无光时同步启动，然后推演。'],
  },
);

// Color is now executable routing state: a prism uses / for one phase and \ for
// the other. These circuits revisit the same object with different meanings.
const prism = (id: string, x: number, y: number, slash = true, fixed = false): Mirror => ({ ...m(id, x, y, slash, fixed), kind: 'prism' });
const twinLobes = () => [m('a', 2, 2, true, true), m('b', 6, 2, false, true), m('c', 6, 6, true, true), m('d', 2, 6, false, true), prism('return', 2, 4, true, true), prism('switch', 6, 4)];
const butterfly = () => [m('a', 2, 2, true, true), m('b', 6, 2, false), m('c', 10, 6, true, true), m('d', 10, 4, false), m('e', 2, 4, false), m('f', 6, 6, false), prism('switch', 6, 4)];
const foldedPrisms = () => [m('a', 2, 2, true), m('b', 10, 2, false), m('c', 6, 6, true), m('d', 2, 6, false), prism('return', 2, 4, true, true), prism('switch', 6, 4, true, true)];
LEVELS.push(
  {
    id: 18, name: '同一面，不同的回答', subtitle: '19 / TWO ANSWERS', theme: 'garden',
    briefing: '分光温室还留着最后一批苗。旧棱镜的标签只有一句话：看清它收到的是什么。',
    lesson: '双色棱镜对暖光沿橙色斜面反射，对冷光沿蓝色斜面反射。先补上中心棱镜，观察同一颗光怎样依次走进上下两条支路。',
    width: 13, height: 9, spawn: { x: 9, y: 5 }, exit: { x: 10, y: 2 }, source: { x: 4, y: 4, dx: 1, dy: 0 },
    mirrors: twinLobes().map(m => m.id === 'switch' ? { ...m, x: 8, y: 4, slash: false } : m),
    receivers: [{ ...r('upper', 4, 2, '白昼苗床', 10), phase: 'warm' }, { ...r('lower', 4, 6, '夜间苗床', 10), phase: 'cool' }],
    inverters: [{ x: 3, y: 2 }, { x: 3, y: 6 }], walls: [], repeats: 2, par: 90, solution: twinLobes(),
    hints: ['普通镜只看方向；双色棱镜还看脉冲的冷暖属性。Q 会交换两种颜色的反射方向。', '上下两条支路各经过一次换相器。返回中心时，光已经变成另一种颜色。', '把活动棱镜放在 (6,4)，暖光斜面为 /。上支路和下支路会交替运行；空格可查看双色光路。'],
  },
  {
    id: 19, name: '把光折成蝴蝶', subtitle: '20 / A BUTTERFLY OF LIGHT', theme: 'garden',
    briefing: '上一张图的两条支路挤在一侧。阿苇把空着的半间温室也接了进来。',
    lesson: '脉冲的来向和颜色一起决定棱镜的出口。搭建左右交错的两翼，允许同一装置在不同圈作出不同选择。',
    width: 13, height: 9, spawn: { x: 8, y: 3 }, exit: { x: 11, y: 2 }, source: { x: 4, y: 4, dx: 1, dy: 0 },
    mirrors: [m('a', 2, 2, true, true), m('b', 8, 2, true), m('c', 10, 6, true, true), m('d', 9, 3, true), m('e', 3, 5, true), m('f', 7, 6, true), prism('switch', 7, 4, false)],
    receivers: [r('upper', 4, 2, '左翼补光', 13), r('lower', 8, 6, '右翼补光', 13)],
    inverters: [{ x: 3, y: 2 }, { x: 9, y: 6 }], walls: [], repeats: 2, offGrid: true, par: 180, solution: butterfly(),
    hints: ['上方支路从左边返回中心；下方支路从右边返回。返回方向不同，同一种颜色也可能走向不同。', '上下支路不一定严格轮流。用推演观察第二次从同一侧返回时会发生什么。', '中心棱镜 (6,4) 暖 /。上左翼：(6,2) 反斜线、(2,2) /、(2,4) 反斜线；下右翼：(6,6) 反斜线、(10,6) /、(10,4) 反斜线。'],
  },
  {
    id: 20, name: '先有人，后有光', subtitle: '21 / THE FIRST WATCH', theme: 'archive', echoLimit: 1,
    briefing: '隔墙那边的苗床能接管闸门，但有人得先让第一颗光过去。新人已经在写自己的交接表。',
    lesson: '组合双色棱镜、跨区导光井和供电接管。先让回声启动光闸，远端苗床通电后接班，再验证离网。',
    width: 13, height: 9, spawn: { x: 8, y: 5 }, exit: { x: 11, y: 1 }, source: { x: 4, y: 4, dx: 1, dy: 0 },
    mirrors: [m('a', 3, 1, false), m('b', 8, 1, true), m('c', 8, 6, false), m('d', 3, 5, true), prism('return', 2, 4, true, true), prism('switch', 6, 4, true, true)],
    receivers: [{ ...r('upper', 6, 2, '隔墙苗床', 11), phase: 'warm' }, { ...r('lower', 4, 6, '近端苗床', 11), phase: 'cool' }],
    walls: Array.from({ length: 11 }, (_, i) => ({ x: i + 1, y: 3 })).filter(c => ![2, 3, 6, 10].includes(c.x)),
    portals: [{ id: 'B', a: { x: 6, y: 3 }, b: { x: 10, y: 3 } }], inverters: [{ x: 3, y: 2 }, { x: 3, y: 6 }],
    plates: [{ id: 'I', x: 9, y: 4, echoOnly: true }], gates: [{ plate: 'I', x: 7, y: 2, poweredBy: 'upper' }],
    repeats: 2, offGrid: true, par: 200, solution: foldedPrisms(), echoSolution: [stay(9, 4)],
    hints: ['上行光进入 B 井后，会在右侧同方向出现。上方横线需要先从右边向左接通。', 'I 板只需帮助第一颗光通过；隔墙苗床通电后维持光闸，不再需要持续值守。', '四角：(2,2) /、(10,2) 反斜线、(6,6) /、(2,6) 反斜线。两个固定棱镜负责上下交替，先在 (9,4) 留一段静止回声。'],
  },
  {
    id: 21, name: '写给光的值班表', subtitle: '22 / AN APPOINTMENT WITH LIGHT', theme: 'garden', echoLimit: 1,
    briefing: '这一张不留备用能源，也不留第二台投影器。线路图的空白处，是下一班留给自己的签名。',
    lesson: '让双色回路交替经过上下两道闸，同一投影在两处值守。周期与光路匹配后，关掉来源并离开。',
    width: 13, height: 9, spawn: { x: 8, y: 4 }, exit: { x: 11, y: 2 }, source: { x: 4, y: 4, dx: 1, dy: 0 },
    mirrors: [m('a', 3, 1, false), m('b', 8, 2, true), m('c', 8, 6, false), m('d', 3, 5, true), prism('return', 2, 4, true, true), prism('switch', 6, 4, true, true)],
    receivers: [{ ...r('upper', 4, 2, '日间交接', 10), phase: 'warm' }, { ...r('lower', 4, 6, '夜间交接', 10), phase: 'cool' }], walls: [],
    inverters: [{ x: 3, y: 2 }, { x: 3, y: 6 }],
    plates: [{ id: 'I', x: 9, y: 3, echoOnly: true }, { id: 'II', x: 9, y: 5, echoOnly: true }],
    gates: [{ plate: 'I', x: 6, y: 3 }, { plate: 'II', x: 6, y: 5 }], repeats: 2, offGrid: true, par: 240,
    solution: twinLobes().map(m => ({ ...m, fixed: m.id === 'return' || m.id === 'switch' })),
    echoSolution: [{ start: { x: 9, y: 3 }, steps: [{ target: { x: 9, y: 3 }, wait: 1.4 }, { target: { x: 9, y: 5 }, wait: 1.8 }, { target: { x: 9, y: 3 }, wait: 1.2 }], period: 24 / 4.2 }],
    hints: ['暖光走上支路，返回变冷后走下支路。两块板不需要同时有人。', '上下两次过闸相隔约 2.86 秒，整次交班约 5.714 秒。把停留放在这两个窗口附近。', '四角为 (2,2) /、(6,2) 反斜线、(6,6) /、(2,6) 反斜线。I 停约 1.4 秒，走 II 停约 1.8 秒，回 I 后结束；周期调到 5.714 秒，无光时同步启动。'],
  },
);
