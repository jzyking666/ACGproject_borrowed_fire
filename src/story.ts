export const CAST = {
  you: { name: '余照', role: '临时维修员', color: '#943b27' },
  cen: { name: '岑姨', role: '旧区调度', color: '#395966' },
  stack: { name: '栈灯', role: '站内维护机', color: '#635735' },
  wei: { name: '阿苇', role: '苗圃看护员', color: '#40644d' },
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

STORY.push(
  { title: '第二天的值班表', before: [line('wei', '你还真回来了。我找到一台旧示教器，能记下走位。'), line('you', '昨天留了一面镜子替班。今天试试留下脚步。'), line('stack', '投影只复现位置。不拿东西，不改变装置，也不替人做决定。')], after: [line('wei', '板上还站着一个你。'), line('you', '让它值这一小段。活人可以去做别的。')], record: '第一次示教完成。余照把一段停留交给投影，自己离开了检查点。' },
  { title: '两个地方同时签收', before: [line('cen', '新表要两处同时确认。不能用一段依次巡逻代替。'), line('you', '那就分两次教。今天不用再借一个人。')], after: [line('stack', '两个检查点同时应答。'), line('cen', '好，把示教顺序写进交接说明。')], record: '两段示教分别值守检查点。两处签收不再需要两个人同时留下。' },
  { title: '留下，也要知道何时让开', before: [line('stack', '这两道闸互锁。一道需要人在，一道需要人不在。'), line('you', '那不能只教它站岗。得教它什么时候让路。')], after: [line('wei', '光刚过去，它就离开了。'), line('you', '总算有一份不用一直站着的值班表。')], record: '回声学会停留、让路和返回。两道互锁光闸完成了第一次接力。' },
  { title: '会交班的花园', before: [line('cen', '最后再断一次外部来源。要确认下一班不在场时，这些安排也成立。'), line('wei', '新来的同学会照着图学。你把脚步留下，我们把花园接过去。')], after: [line('stack', '双点签收、跨区传输、冷暖端与离网验证全部完成。'), line('you', '这回没有忘拿工牌。'), line('wei', '那明天来喝豆浆就行，不用再带工具。')], record: '示教轨迹与线路图一起留下。花园能独立运行，也终于能把维修方法交给下一班。' },
);

STORY.push(
  { title: '给下一班的两张练习单', before: [line('wei', '花园交接了。我想把那天遇到的情况做成练习，留给新来的人。'), line('you', '这一张先只发一台投影器。两个岗位，让它学会接力。')], after: [line('stack', '单段示教完成双点依次签收。'), line('wei', '记下来：不用同时站在两个地方，也不必每件事都多找一个人。')], record: '第一张练习单记录了单段示教的双点接力。时序和路径，都是交接方法的一部分。' },
  { title: '约好了，就每一圈都到', before: [line('cen', '最后一张练习单，把临时接力改成每圈都能履约。'), line('you', '光有它的步速。我们教脚步等它。'), line('wei', '别只看第一次亮灯。让它再跑几圈。')], after: [line('stack', '来源关闭。周期回执仍在持续。'), line('cen', '练习单写完了。这一次，连等待的时间也能交给下一班。')], record: '第二张练习单完成周期同步与离网运行。下一班拿到的不只是布局，还有一份能反复执行的时间表。' },
);

STORY.push(
  { title: '看清它收到的是什么', before: [line('wei', '分光温室还有两排苗。它们需要不同的光，但只剩这一只旧棱镜。'), line('you', '两面标签，一橙一蓝。先看看它怎么回答。'), line('stack', '棱镜不改变颜色。它根据收到的颜色，选择反射方向。')], after: [line('wei', '同一颗光，先照上面，再照下面。'), line('you', '不用第二份能源。只要让它带着另一个问题回来。')], record: '双色棱镜接通上下两条支路。余照留下了两种颜色的线路图，分光温室恢复补光。' },
  { title: '半间空着的温室', before: [line('cen', '另一半棚还没有线路。拿旧的矩形图照抄，接不到那里。'), line('wei', '让它从另一边回来呢？'), line('you', '先把返回的方向也画上。')], after: [line('wei', '两边的光路，像把蝴蝶摊在纸上。'), line('stack', '记录补充：返回的方向与颜色，都决定下一次去向。')], record: '跨过中心棱镜的两翼开始运行。线路不再是简单的四角闭环，来向和颜色一起成为路由条件。' },
  { title: '第一个守岗的人', before: [line('wei', '新人想自己交这张单。我说，先有人守着第一道闸。'), line('you', '等远端亮起来，就让它接班。'), line('cen', '别忘了写上失电后的处理。能接班，也得知道何时回来。')], after: [line('stack', '隔墙苗床接管光闸。外部来源关闭，两侧仍持续应答。'), line('wei', '这次交接表上，已经有新人的名字了。')], record: '示教启动了跨区回路，远端苗床随后接管。新的维修员学会了启动，也学会了验证独立运行。' },
  { title: '留一点空白给下一班', before: [line('cen', '最后这张工单，名字让他们自己签。'), line('you', '我们把线路和约好的时间留下。'), line('wei', '再留一点空白。也许他们会找到更好的接法。')], after: [line('stack', '双支路、周期值守与离网运行全部验证。交接完成。'), line('you', '这张图归你们了。'), line('wei', '下次回来，先来看看新的那一页。')], record: '光的两种回答，与一份可重复执行的值班表一起留下。分光温室完成交接，也给下一班留出了修改的方法。' },
);

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

// Three inks on the paper of a crew identity photograph. The silhouettes carry
// the speaker's identity even when the portraits are printed in greyscale.
const portraits: Record<Speaker, string> = {
  you: `
    <path fill="var(--tint)" d="M4 128v-9l13-14 26-11 10-14 21 5 12 13 21 10 15 20z"/>
    <path fill="var(--key)" d="M7 128l9-18 27-13 12-13 17 5-2 8-12 12-7 19zm56 0l15-24 7-6 8 4-8 12-4 14z"/>
    <path fill="var(--face)" d="M43 50l41-10 5 13-1 10 6 8-5 3-1 7-5 9-9 1-6 9-16-7 2-13-9-9z"/>
    <path fill="var(--key)" d="M39 50l44-10 7 11-16 1-11 5-4 12-5 1-2-8-5 2 2 10 6 4-2 6-9-6-6-9zm28 34l11 3 7-1-3 5-8 2-6 7-7-3 6-8z"/>
    <path fill="var(--tint)" d="M26 57l7-8q0-27 22-31l8-4 9 3q15 6 18 21l9 3 2 5-49 8z"/>
    <path fill="var(--key)" d="M26 57l28-7 46-7 1 4-44 8-29 5zM55 19l7-2-3 24-7 2z"/>
    <path fill="var(--face)" d="M43 42q1-14 10-19l-4 6-3 12zm25-23 6 2 4 12-3-3z"/>
    <g fill="none" stroke="var(--key)" stroke-width="1.65"><path stroke-width="1.45" d="m87 51 1 7-1 5 6 7-5 3-1 7-5 8-8 2m-17-26q-5-8-9-2l1 7 4 4m23-8 4 1"/><path d="m76 58 8-1m-5 4 4-1m-1 15 5-1m-1 4-4 1M19 116l17-8m-9 15 14-10m47 2 8-7m-11 13 12-11"/></g>
    <path fill="var(--face)" d="m68 104 6-5-8 13-8 9 2-7z"/>`,
  cen: `
    <path fill="var(--key)" d="M7 128l7-16 16-10 26-12 17-4 18 14 19 9 13 19z"/>
    <path fill="var(--tint)" d="M36 128l5-20 13-16 16 2-10 16zm25 0 12-19 6-15 14 9-9 5-6 13z"/>
    <path fill="var(--face)" d="M74 95l-14 9-6-7-1-13-10-4-3-10-6-3 6-10 1-12 9-17 23-2 14 21-3 22-9 9z"/>
    <path fill="var(--key)" d="M39 48q-2-24 17-29 22-10 36 9 13-3 15 10t-13 17l-4 13-10 7 2-16-4-10-5-5-10-11-10 10z"/>
    <g fill="none" stroke="var(--face)" stroke-width="1.5"><path d="M47 37q12-15 26-12m-11 2q12 0 20 9m-6-11q10 4 14 14m7-6 5 6m-7-1 5 6"/></g>
    <g stroke="var(--key)" fill="none"><path stroke-width="1.5" d="m40 60-5 7 5 2 2 10 10 5 8 1m9-20-6 4m-3-8-2 4"/><path stroke-width="2.4" d="m38 51 13 1-1 8-9 1-3-4zm12 4 7-2 2-4 12-1-1 9-9 2-4-5m13-2 10-4"/><path stroke-width="1.5" d="m44 54 4 1m14-3 5-1M44 73l8 1 4-1m-6 7 5-1m-2 5 8 2-5 4"/></g>
    <path fill="var(--tint)" d="M39 42q2-24 26-26 19 1 24 21l-4 2q-4-17-20-18-16 0-23 20zm41 0 7-1 4 6-1 16-7 4-5-5z"/>
    <path fill="none" stroke="var(--key)" stroke-width="2.4" d="M87 60q-2 16-14 18l-16-2"/><path fill="var(--key)" d="m52 72 10 1 1 5-11-2z"/>
    <path fill="var(--face)" d="m32 111 8-5-6 6-9 5zm51 2 10-7-6 7-6 3z"/>`,
  stack: `
    <path fill="var(--key)" d="m24 117 10-15 15-5 3-9 24-3 6 10 19 4 10 13v16H22z"/>
    <path fill="var(--tint)" d="m30 118 18-16 26-7 21 8-21 6-4 19H28zm48-8 20-5 8 8v15H77z"/>
    <path fill="var(--key)" d="m34 35 48-9 17 11 2 42-15 10-47 8-11-18z"/>
    <path fill="var(--tint)" d="m31 41 50-8 2 48-43 8-8-8z"/>
    <path fill="var(--face)" d="m35 35 48-9 10 8-50 9zM43 50l31-5 1 26-29 5-6-5V54z"/>
    <path fill="var(--key)" d="m45 54 25-4 2 17-25 5-4-4z"/>
    <path fill="var(--face)" d="m47 60 6-1 3 2 4-6 3 6 7-2v2l-8 3-2-4-3 6-4-4-6 1z"/>
    <path fill="var(--key)" d="m44 81 27-5v2l-27 5zm-4 26 13-4-3 7-13 4zm38-73-2-13 4-2 2 14z"/>
    <g fill="none" stroke="var(--face)" stroke-width="1.5"><path d="m87 44 7-4m-7 9 7-4m-6 9 6-4m-6 10 7-4m-6 10 6-4M52 90l17-4m-16 8 17-4m-17 8 18-4m15 25 9-2m-8 5 8-2"/></g>
    <circle cx="78" cy="16" r="6" fill="var(--key)"/><circle cx="77" cy="15" r="3" fill="var(--face)"/>
    <circle cx="39" cy="46" r="1.6" fill="var(--key)"/><circle cx="77" cy="38" r="1.6" fill="var(--key)"/>`,
  wei: `
    <path fill="var(--tint)" d="m4 128 9-19 31-15 13-13 19 1 4 10 28 11 12 25z"/>
    <path fill="var(--key)" d="M45 45q2-22 20-23 24-3 28 20l3 23-6 11 3 13-8 6-4-6-9 6-18-17-9-18z"/>
    <path fill="var(--face)" d="m49 48 19-6 13-1 1 11-8 13 5 29-12 11-14-11 4-11-10-1-5-4-1-9-6-2 5-10 1-8z"/>
    <path fill="var(--key)" d="M44 53l11-1 1 2-12 2zm-1 6 6-2-1 3-5 1zm0 13 8-1-3 3-5 1zm12 11 10-3-7 7-3 5zM72 47l12-7 4 13-4 11-6 3-3-10z"/>
    <path fill="none" stroke="var(--key)" stroke-width="1.5" d="m41 55-1 6-5 7 6 2 1 6 5 6 9 1m16-17q5-7 8-5l-1 5-4 4m-16-8-4 2"/>
    <path fill="var(--tint)" d="M24 53l7-7 9-3q4-16 12-19l7-8 18-1 8 5 10 24 12 9-19 2-10-6-33 7-12 1z"/>
    <path fill="var(--key)" d="m28 53 23-9 35-6 8 4-41 5-17 7-8 1zm42-35 8-1 7 4-11 1-17 4 1-3z"/>
    <g fill="none" stroke="var(--face)" stroke-width="1.4"><path d="m54 31 24-6m-28 12 34-8m7 18 11 4M21 116l10-8m-7 13 11-10"/></g>
    <path fill="var(--key)" d="m40 97 7-2 7 14 23-6 7-10 6 3-5 16 2 16H43l4-19z"/>
    <path fill="var(--face)" d="m55 115 19-4 1 12-16 5-5-3zm21-2 4-13 3 1-4 13z"/>`,
};

export function portrait(speaker: Speaker): string {
  return `<svg viewBox="0 0 128 128" aria-hidden="true" style="--key:#223037;--face:#f2e5c9;--tint:${CAST[speaker].color}"><rect x="0" y="0" width="128" height="128" fill="var(--face)"/><path fill="var(--tint)" opacity=".13" d="M0 27 128 8v24L0 59zm0 37 128-29v4L0 69z"/>${portraits[speaker]}</svg>`;
}
