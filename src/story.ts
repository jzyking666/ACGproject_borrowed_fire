export const CAST = {
  you: { name: '余照', role: '临时维修员', color: '#dba06a' },
  cen: { name: '岑姨', role: '旧区调度', color: '#a5b6d3' },
  stack: { name: '栈灯', role: '站内维护机', color: '#b7c6a1' },
  wei: { name: '阿苇', role: '苗圃看护员', color: '#92b497' },
} as const;
export type Speaker = keyof typeof CAST;
export interface StoryLine { speaker: Speaker; text: string }
export interface StoryBeat { title: string; before: StoryLine[]; after: StoryLine[]; record: string }
const line = (speaker: Speaker, text: string): StoryLine => ({ speaker, text });

/** Original story: an overnight handover, told through the systems the player repairs. */
export const STORY: StoryBeat[] = [
  {
    title: '一张已经失效的工牌',
    before: [line('cen', '余照？五点四十，旧区主网六点迁走。你的单子很简单：检查七间机房，签完交接，赶末班车。'), line('you', '简单到门都不让我进。'), line('stack', '旧工牌已失效。请原路返回。……出口也需要供电。'), line('you', '那先借你一道光。开了门我就走。')],
    after: [line('stack', '出口恢复。是否将本次维修登记为临时借电？'), line('you', '登记吧。收据别太长，我赶车。')],
    record: '第一张借电收据。门重新亮起，调度台收到有人进入旧区的信号。',
  },
  {
    title: '线路的另一头',
    before: [line('wei', '有人听得到吗？苗圃的电梯停了。里面没有人，只有明早要搬走的苗。'), line('you', '岑姨，我的工单上怎么没有苗圃？'), line('cen', '迁移清单只写设备编号。你先把线路接过去，我去找那个编号对应的门牌。')],
    after: [line('wei', '电梯动了。最上面一盘是给新校区的，他们还没地方种。'), line('you', '行。那盘先别摔着。')],
    record: '一个设备编号对应了一座苗圃。交接表上的“无人员占用”并不意味着里面没有东西需要照顾。',
  },
  {
    title: '一盏灯能留多久',
    before: [line('stack', '临时供电即将到期。重复发射不能续签同一份许可。'), line('you', '所以每回亮起来，都被你当成另一个人来借？'), line('stack', '我只认脉冲编号。让它回来，我才知道这条线路仍有人维护。'), line('cen', '试着接成回路。别让这份交接每隔几秒就重新开始。')],
    after: [line('stack', '同一编号再次到达。临时线路转为持续运行。'), line('you', '原来“我还在”也能用电路说。')],
    record: '第一次闭环验证成功。栈灯不再把每次亮灯都当成一笔新的借电申请。',
  },
  {
    title: '同一张单子上的两户',
    before: [line('cen', '查到了。这条线上有电梯，也有维修站的旧电台。不能只保一个。'), line('you', '只有一颗脉冲。'), line('stack', '接收环不消耗它。两处都经过，就不需要把谁划掉。')],
    after: [line('wei', '电台终于听清了。刚才我一直以为你们说“把苗扔了”。'), line('cen', '我说的是“把门留着”。幸好现在能解释清楚。')],
    record: '电梯与电台共享同一条回路。线路表第一次同时写下了两个接收地址。',
  },
  {
    title: '迟到的消息',
    before: [line('stack', '缓冲器内有一条未送达的语音。时间戳：昨天二十一点。'), line('wei', '是我的。昨晚开始断断续续停电，我留了句“别关育苗灯”。没想到现在才送到。'), line('you', '今天这条不能再等到明天了。'), line('cen', '把缓冲时间算进去。消息和电力都得在超时之前回来。')],
    after: [line('wei', '收到就好。我已经把最怕冷的移到一起了，你们慢慢来。'), line('you', '你嘴里的慢慢来，最好能剩一点给我的末班车。')],
    record: '缓冲器送出了昨晚的留言。延迟没有吞掉消息，但让收件人多等了一夜。',
  },
  {
    title: '迁走的主网',
    before: [line('cen', '迁移程序开始了。主网不能一直替旧区垫着，我们也不能在表上写“全部关停”。'), line('you', '把发射器关掉，回路自己维持。这样算交接吗？'), line('stack', '算。前提是断开来源之后，每处接收环仍能认出原来的编号。')],
    after: [line('stack', '外部来源关闭。回路仍在运行。'), line('cen', '这项我能签字。不是“停用”，是“已交接”。')],
    record: '旧区第一次完成离网验证。岑姨把一栏“待关停”改成了“独立运行”。',
  },
  {
    title: '第一班的签名',
    before: [line('cen', '主机房最后三项：通讯、冷却、出口。接稳了，我就能送走第一张交接表。'), line('you', '听着不像最后一间。'), line('cen', '中继站还有五间没回执。我不替你决定去不去。先把眼前这班做完。')],
    after: [line('stack', '主机房交接完成。余照，工牌可以取回了。'), line('you', '中继站往哪边走？'), line('cen', '东边。我给下一班车打个电话，问它能不能多等一站。')],
    record: '主机房完成交接。余照没有在最后一栏画句号，而是问了中继站的方向。',
  },
  {
    title: '替谁值一会儿班',
    before: [line('cen', '这里是中继站，主机房的线路已经接稳。剩下五份回执从这道光闸开始。'), line('stack', '压板必须持续占据。我建议一名维修员留守。'), line('you', '我就一名。备用反射器倒有一面。'), line('stack', '……重量符合要求。留守人员登记改为：设备。')],
    after: [line('you', '看，它也能替班，不用把人留在这里。'), line('cen', '那就给它留个位置。下一个人进来时，要知道为什么不能搬。')],
    record: '一面反射器留在压板上。岑姨在图纸旁补了一行：此处有人交过班，请勿随意挪动。',
  },
  {
    title: '没有走廊的邻居',
    before: [line('wei', '你们现在隔着档案库。地图画的是死路，以前搬东西得绕一整层。'), line('stack', '实体通道只有西侧。导光井能传脉冲，不能传花盆，也不能传人。'), line('you', '够了。先让消息过去，我们再慢慢走。')],
    after: [line('wei', '收到远端回执了。原来就在隔壁。'), line('cen', '路远不远，得看你要送的是什么。')],
    record: '导光井跨过了档案库的隔墙。人仍需要走路，但回执不必再绕整层楼。',
  },
  {
    title: '别把它们都调成一样',
    before: [line('wei', '冷光送给循环泵，暖光留给恒温电梯。别为了省事把两个环都调成一样。'), line('you', '你对这地方比图纸熟。'), line('wei', '冷下来的是哪一盘苗，我每天都要摸一下。图纸上没有这个。')],
    after: [line('stack', '冷端与暖端均已确认，编号一致。'), line('you', '一颗光，两种温度。明早搬苗时，别忘了把这张新图也带走。')],
    record: '冷暖线路分别保住了循环泵和恒温电梯。阿苇把新线路图夹进了运苗单。',
  },
  {
    title: '人离开之后',
    before: [line('stack', '当前回路依赖压板。若值守者离开，跨区传输会中断。'), line('cen', '交接不能只写“我在的时候正常”。'), line('you', '那就让它在我们都不在的时候，也照样回来。')],
    after: [line('stack', '值守者已离开压板。线路仍然正常。'), line('cen', '这句保留。它比“测试通过”说得清楚。')],
    record: '人离开压板之后，远端仍收到了回执。维修的结果终于不再依赖谁一直站着。',
  },
  {
    title: '收件人',
    before: [line('cen', '最后一张：夜间温室、通讯信标、离网中继。三处回执齐了，就能关掉发射器。'), line('stack', '交接表仍缺一项：收件人。现有名单中，没有负责整条旧线路的单位。'), line('wei', '苗圃这一段写我的名字。电台那段呢？'), line('cen', '写我。余照负责把这张表送出来。')],
    after: [line('stack', '外部来源关闭。三个接收地址持续应答。交接表已送达。'), line('wei', '第一盘苗已经上车了。司机问，门口怎么还有人往回跑。'), line('you', '我的工牌忘拿了。'), line('cen', '在门卫那儿。车还在，豆浆也给你留了一杯。'), line('stack', '借电记录已归档。收件人不再为空。')],
    record: '交接表终于有了收件人。主网迁走后，旧线路仍然运行；余照取回工牌，赶上了等在门口的车。',
  },
];

export type SceneKind = 'before' | 'after';
export interface Scene { id: string; level: number; kind: SceneKind; title: string; lines: StoryLine[] }
export function sceneFor(level: number, kind: SceneKind): Scene {
  const beat = STORY[level]; if (!beat) throw new Error('Unknown story level');
  return { id: `${level}:${kind}`, level, kind, title: beat.title, lines: beat[kind] };
}
export function validSceneId(id: unknown): id is string {
  if (typeof id !== 'string' || !/^\d+:(before|after)$/.test(id)) return false;
  const [n] = id.split(':'); return Number.isInteger(Number(n)) && String(Number(n)) === n && Number(n) < STORY.length;
}
export function normalizeSeen(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(validSceneId))] : [];
}
export function availableScenes(seen: readonly string[], completed: Readonly<Record<string, unknown>>): Scene[] {
  return STORY.flatMap((_, i) => (['before', 'after'] as const).map(k => sceneFor(i, k)))
    .filter(s => seen.includes(s.id) || Object.hasOwn(completed, s.level));
}
export class StoryPlayer {
  index = 0;
  constructor(readonly scene: Scene) {}
  get line() { return this.scene.lines[this.index]; }
  get last() { return this.index === this.scene.lines.length - 1; }
  next() { if (this.last) return false; this.index++; return true; }
  previous() { this.index = Math.max(0, this.index - 1); }
}

/** Original code-native portraits; no external fonts or illustrations. */
export function portrait(speaker: Speaker): string {
  const color = CAST[speaker].color;
  const heads: Record<Speaker, string> = {
    you: '<path d="M40 60V44q1-26 24-26t24 26v16" fill="#b77b45"/><path d="M36 48h56v12H36z" fill="#dba06a"/><path d="M39 89l25 13 25-13v25H39" fill="#daaa6f"/>',
    cen: '<path d="M39 56V43q2-27 26-25 26 0 26 29l-9 15-5-22-31 10-1 16z" fill="#b6b9ac"/><path d="M40 60h20v13H40zm28 0h20v13H68zM60 64h8" fill="none" stroke="#303d47" stroke-width="3"/><path d="M91 48q10 8 3 29l-15 5" fill="none" stroke="#a5b6d3" stroke-width="5"/>',
    stack: '<rect x="29" y="27" width="70" height="65" rx="8" fill="#697b6d"/><rect x="37" y="39" width="54" height="32" rx="3" fill="#182d2a"/><path d="M44 54h12m16 0h12M56 80h16M64 17v10" stroke="#c6d4a5" stroke-width="4"/><circle cx="64" cy="15" r="4" fill="#dba06a"/>',
    wei: '<path d="M32 69Q25 16 64 17q41 2 31 57l-10-8-4-27-35 5-3 25z" fill="#4e6f57"/><path d="M88 98q13-17 19-8-9 15-19 8m-2 1q-17-15-17-3 7 11 17 3" fill="#a0b782"/>',
  };
  return `<svg viewBox="0 0 128 128" fill="none" aria-hidden="true"><path d="M12 116V95q9-15 34-17h36q25 2 34 17v21" fill="${color}" opacity=".8"/><path d="M48 79v15l16 10 16-10V79" fill="#bcaa8d"/><path d="M40 47q0-25 24-25t24 25v23q-3 23-24 24-21-1-24-24z" fill="#d2bea0"/>${heads[speaker]}${speaker === 'stack' ? '' : '<path d="M49 61h7m16 0h7" stroke="#30332f" stroke-width="3" stroke-linecap="round"/><path d="M59 79q6 4 12-1" stroke="#7d6655" stroke-width="2" stroke-linecap="round"/>'}<path d="M12 117h104" stroke="${color}" stroke-width="2"/></svg>`;
}
