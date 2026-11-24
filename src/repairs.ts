import { Simulation } from './engine';
import { LEVELS, type Mirror } from './levels';
import type { EchoTrack } from './echo';

export interface RepairOrder {
  id: string;
  level: number;
  title: string;
  client: string;
  symptom: string;
  objective: string;
  reply: string;
  budget: number;
  hints: [string, string, string];
  /** The night shift's installation, expressed as deviations from the working circuit. */
  faults: (Partial<Pick<Mirror, 'x' | 'y' | 'slash'>> & { id: string })[];
  echoes?: EchoTrack[];
}

const oldSignature = (x: number, y: number): EchoTrack => ({
  duration: 1, time: 0, points: [{ x, y, t: 0 }, { x, y, t: 1 }],
});

export const REPAIRS: readonly RepairOrder[] = [
  {
    id: 'bell', level: 1, title: '铃响在隔壁', client: '站台售票员 · 罗姨',
    symptom: '发车铃哑了。倒是右边那堵墙，每隔几秒亮一道横光。刚才有个孩子冲着墙挥手，以为车要来了。',
    objective: '给站台接收环送一次电，空手到出口试铃。',
    reply: '铃响了。那个孩子还在跟墙告别，我等他上车。',
    budget: 1, faults: [{ id: 'b', slash: true }],
    hints: ['沿第一道折线往上看，光到站台的高度了吗？', '同一高度上，接收环和亮起来的墙分居两侧。', '走到 (8,2) 的镜旁，原地旋转一次，把向上的光送向左。'],
  },
  {
    id: 'freight', level: 5, title: '少停一层的货梯', client: '货运月台 · 路叔',
    symptom: '顶楼配电盘的针一直在走。货梯这头一格都没亮。手推车上六箱梨，闻着比我还急。',
    objective: '让两处接收环都验证同一颗光，再关掉发射器、空手抵达出口。',
    reply: '车门开了，梨没磕着。最上头那颗已经熟透了，放你工具柜里了。',
    budget: 4, faults: [{ id: 'b', x: 9 }, { id: 'c', x: 9 }],
    hints: ['先等光走一圈。发射器还在补发，还是同一颗光在绕？', '比较右侧那条竖直光路与中继模块的位置。要平移整条边，两个转角都得跟着走。', '将 (9,2)、(9,6) 两面镜各向右搬一格，保持方向。循环验证后关掉来源。'],
  },
  {
    id: 'handprint', level: 10, title: '没人按的门铃', client: '档案库守夜人 · 老周',
    symptom: '刚交班，远端电梯和底层中继全黑了。值班簿上说，开馆的时候，总有人先去地板上那个磨白的小方块站一会儿。',
    objective: '先启动远端电梯，让它接管闸门，再去出口。整洁交付可以一次装置操作都不用。',
    reply: '我一直以为地砖是被档案车磨白的。今晚终于记住了。明早我来第一个。',
    budget: 0, faults: [{ id: 'e', x: 9 }],
    hints: ['观察光消失的第一道闸，找到与它同号的压板。', '看清闸门说明：远端电梯亮起来后，就能替你按住这扇门。', '站在 (8,4) 压板上，等远端电梯通电再离开。保持光路，循环验证后走到出口。'],
  },
  {
    id: 'carbon', level: 13, title: '两张相同的签名', client: '交接簿保管员 · 小麦',
    symptom: '两段录音都在播。我听见左边点了两次名，右边一直没人应。门上倒是清清楚楚留了两个签名的位置。',
    objective: '让两块板同时收到回声签名，维持回路到出口。',
    reply: '左边答到，右边也答到。终于可以把那张用旧的复写纸抽掉了。',
    budget: 3, faults: [], echoes: [oldSignature(3.84, 4), oldSignature(4.16, 4)],
    hints: ['打开回声调度，看看两张轨迹图上的落点。', '两段轨迹都占用了名额，各自负责的压板却是同一块。把其中一个名额腾出来。', '移除最后一段回声，在 II 板 (8,4) 按 F，原地再按 F，留下一份新的签名。'],
  },
  {
    id: 'seasons', level: 18, title: '寄错季节的信', client: '育苗员 · 阿苇',
    symptom: '夜间苗床总等来一阵暖光，灯亮不到一瞬就退了件。白昼那排苗倒是一封也没收到。苗牌我来回核过三遍了。',
    objective: '让白昼和夜间苗床各自收到正确颜色，完成两次循环签收后抵达出口。',
    reply: '白昼的叶子舒开了，夜间的叶子卷起来了。明早换班的人光看叶子就能认出这两排。',
    budget: 1, faults: [{ id: 'switch', slash: false }],
    hints: ['比较暖光离开发射器时的颜色，和它第一个碰到的苗床标签。', '中心交叉玻璃上有两道刻线。换向一次，两种颜色的去处会一同对调。', '在 (6,4) 的双色棱镜旁按 Q 一次，让暖光上行。等它换相后，再观察第二条支路。'],
  },
];

/** Each call creates an independent shift. Setup and inherited recordings cost the operator zero moves. */
export function createRepair(order: RepairOrder): Simulation {
  const level = structuredClone(LEVELS[order.level]);
  level.mirrors = level.solution.map(mirror => ({ ...mirror, ...order.faults.find(fault => fault.id === mirror.id) }));
  // The caretaker can start this latch in person. Its spare mirror stays on the shelf.
  if (order.id === 'handprint') level.solution = structuredClone(level.mirrors);
  level.hints = [...order.hints];
  level.briefing = order.symptom;
  level.lesson = order.objective;
  const sim = new Simulation(level);
  sim.echoes = structuredClone(order.echoes ?? []);
  sim.stats.peakEchoes = sim.echoes.length;
  return sim;
}

export function repairResult(order: RepairOrder, sim: Simulation): { moves: number; withinBudget: boolean } | undefined {
  if (sim.level.id !== order.level || !sim.won) return;
  return { moves: sim.moves, withinBudget: sim.moves <= order.budget };
}
