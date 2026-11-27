import type { CampaignProgress, Trade } from './campaign-progress';

// The slip is handed from one resident to the next. A station uses an existing
// work order, so both ways of visiting it produce the very same receipt.
export const ROUTE_EN: Record<string,string> = {};
function line(zh:string, en:string) { ROUTE_EN[zh]=en; return zh; }

export const relayCopy = {
  name:line('街名接力','The address relay'),
  pitch:line('替六禾送一张没有门牌的取件单。沿线八位居民，每人帮你补一笔。','Deliver a collection slip with no house number. Eight residents can each fill in a piece.'),
  enter:line('打开取件单','Unfold the slip'),
  resume:line('回取件单','Back to the slip'),
  caption:line('随身带着','In your satchel'),
  gift:line('交到你手里','Handed to you'),
  start:line('接下这站的工单','Take this job'),
  replay:line('重访这站工单','Replay this job'),
  next:line('把口信带到下一站','Carry the message on'),
  finish:line('送到收件人手里','Deliver the slip'),
  ending:line('签收人自己写','Signed in person'),
  reread:line('重读签收回条','Reread the receipt'),
  finalText:line('塔下卖早饭的姑娘把铃推回窗内。她不用等人喊了。第一锅粥冒起白气时，她把签收栏转过来，写下自己的名字。六禾撕走存根，贴在邮亭的送件簿上。这条路从今天起可以投递。','The young woman selling breakfast beneath the tower slides the bell inside her window. She can hear it there. As steam rises from the first pot of congee, she turns the slip around and signs her own name. Liuhe pastes the stub into the post office delivery book. From today on, this route takes mail.'),
};

export interface RelayStop {
  trade: Trade; index: number; carrying: string; request: string; reply: string; gift: string;
}
export const STREET_ROUTE: readonly RelayStop[] = [
  {trade:'field', index:0,
    carrying:line('没有门牌的取件单','A slip without an address'),
    request:line('“收件人一栏就写着‘卖早饭的’。我认得她的字，窗后那架哑铃却叫不应。先给退信窗送上电，我开柜把原单找出来。”','“The name says ‘breakfast seller’. I know her handwriting, but the bell behind the window is dead. Power the returns window so I can open the drawer and find the original.”'),
    reply:line('窗锁啪地弹开。六禾从抽屉底捡出半边铜铃，舌头早掉了。“朱鹭的炉子能给它配一个。单子别弄丢。”','The window latch springs free. Liuhe fishes out half a brass bell, its clapper missing. “Zhu Lu can make it a tongue. Hang on to that slip.”'),
    gift:line('少了铃舌的铜铃','A bell without a clapper')},
  {trade:'loom', index:9,
    carrying:line('少了铃舌的铜铃','A bell without a clapper'),
    request:line('“铃壁上有油星，是开饭摊的东西。退火台的上下两层都得接对，我才能给它打个薄舌头，省得一敲整条巷都醒。”','“Grease on the rim. It came off a food cart. Wire both tiers of the annealing table and I can forge a thin clapper. No sense waking the whole lane.”'),
    reply:line('朱鹭用指甲轻敲，新铜舌响了一声。她在单子上拓下铃边缺口：“给市场收篷的看看，她摸也摸得出来。”','Zhu Lu taps the new clapper with a nail. A single clear note. She rubs the nick in the rim onto the slip. “Show that to the market awning keeper. She knows it by touch.”'),
    gift:line('铃沿的拓印','A rubbing of the bell rim')},
  {trade:'tide', index:12,
    carrying:line('铃沿的拓印','A rubbing of the bell rim'),
    request:line('“这道豁口是鱼箱砸的。早摊姑娘后来搬去了对岸。理顺两头的船班，把空鱼箱送回来，箱底有她留下的送货条。”','“A fish crate made that nick. The girl moved across the river. Sort out the boats at the two docks so we get the empties back. Her delivery chit is under one of them.”'),
    reply:line('空箱搁上秤台，金嫂从蓝漆板底揭下湿纸。纸上写着“过第二个桥孔向右”。她让你把纸贴在铃肚里避风。','The empty crate lands on the scale. Auntie Jin peels a damp chit off the blue-painted bottom. “Right after the second bridge arch.” She tucks it inside the bell, out of the wind.'),
    gift:line('蓝鱼箱底的送货条','A chit from a blue fish crate')},
  {trade:'field', index:18,
    carrying:line('蓝鱼箱底的送货条','A chit from a blue fish crate'),
    request:line('“第二个孔，得看你从哪头数。接亮桥头亭的号灯，我拿送货条的水印和两岸的里程牌对一对。”','“Second from which end? Get the bridge signals lit. I can hold the chit up to the light and check its watermark against the bank markers.”'),
    reply:line('灯下的水印缺了一角，正合西岸那枚旧章。闻舟在纸上按了双孔印，沿西边那个孔穿进一根绳。','The watermark has a corner missing, a perfect match for the west-bank stamp. Wen Zhou punches both arches into the slip and threads string through the western hole.'),
    gift:line('穿了西孔的桥票','A bridge ticket threaded on the west')},
  {trade:'tide', index:26,
    carrying:line('穿了西孔的桥票','A bridge ticket threaded on the west'),
    request:line('“西岸最近的靠点已拆了。票窗还有一趟换船的空位。两端都接上班，这只铃就能搭苗圃的早船。”','“The nearest west landing is gone. There is room for a transfer at the ticket window. Match both connections and your bell can ride the early nursery boat.”'),
    reply:line('伍姐让铜铃坐了头等舱，一只倒扣的茶缸。她剪下返程票根：“去问阿苇。姑娘的早摊总摆着她养的葱。”','Sister Wu gives the bell a first-class cabin under an upturned mug. She clips off the return stub. “Ask Wei. That breakfast stand always had her spring onions.”'),
    gift:line('沾了茶渍的返程票根','A tea-stained return stub')},
  {trade:'loom', index:30,
    carrying:line('沾了茶渍的返程票根','A tea-stained return stub'),
    request:line('“那三盆葱还活着，签条压在育根槽的手轮下面。替我接上离合，手轮转开就能拿出来。”','“All three pots are alive. Their tag is trapped under the root trough wheel. Feed the clutch so I can turn it and pull the tag free.”'),
    reply:line('阿苇把湿签在袖口蹭干。“塔下，第二扇矮窗。”她把葱叶打个结系在铃上，说闻着味儿摊主就会来开窗。','Wei wipes the tag on her sleeve. “Under the tower. Second low window.” She knots an onion leaf to the bell. “She’ll come to the window when she smells that.”'),
    gift:line('写着第二扇矮窗的签条','A tag for the second low window')},
  {trade:'loom', index:39,
    carrying:line('写着第二扇矮窗的签条','A tag for the second low window'),
    request:line('“第二扇矮窗，这就算地址了。把压纸轴的齿带调齐，给我留一指宽的白边。收件人得有地方签名。”','“Second low window. That’s an address. Line up the belts on the paper roller and leave me a finger of margin. She needs somewhere to sign.”'),
    reply:line('沈迟将路线印成了细长一条。最底下空着一格，他试过笔尖，把铅笔也夹在纸上。','Shen Chi prints the route on a narrow strip. The bottom box is empty. He tests the point of a pencil, then clips it to the paper.'),
    gift:line('留着签名格的门牌','An address label with a signature box')},
  {trade:'field', index:42,
    carrying:line('留着签名格的门牌','An address label with a signature box'),
    request:line('“第二扇矮窗的线还接在旧引水钟上。替她把这一路接响。等窗从里头开了，才算送到。”','“That low window still runs off the old water bell. Get the circuit ringing. It’s delivered when she opens the window from inside.”'),
    reply:line('灯先亮，紧接着是朱鹭打的那声薄铃。窗内有人应：“往上一点递，我手上沾着米。”','First the lamp, then the bright note of Zhu Lu’s clapper. A voice answers. “Pass it up a little. I’ve got rice all over my hands.”'),
    gift:line('有了收件人的取件单','A slip that has found its recipient')},
];
export const relayPosition = (p: CampaignProgress) => {
  const first = STREET_ROUTE.findIndex(s => !p.jobs[`${s.trade}-${s.index}`]?.done);
  return first < 0 ? STREET_ROUTE.length : first;
};
export function relayIndex(trade: Trade, index: number) {
  return STREET_ROUTE.findIndex(s => s.trade===trade && s.index===index);
}

// Enclosures as they would sit in the satchel, printed with the same three inks
// as the delivery slip. Each drawing depicts the item the resident asks to see.
export function relayEnclosure(station:number) {
  const cutPaper='<path d="M17 16 89 9l10 58-72 9z" fill="#e3d5b8"/>';
  const ruled='<path d="m29 28 48-5m-46 12 37-4m-35 12 49-5m-47 12 30-3" opacity=".6"/>';
  const bell='<path d="M39 49c8-4 4-23 15-28 13-6 23 2 25 14 2 7 6 12 12 14l1 5c-12 6-37 8-53 2z" fill="#bda57c"/><path d="M40 51q28 6 50-2m-36-26c-5-11 10-14 11-4m5 6q5 4 5 10"/>';
  const items=[
    cutPaper+ruled+'<path d="m49 60 30-3 1 8-30 3z" fill="none" stroke="#9d3d30"/>',
    bell+'<path d="m59 55 5-4 4 5m-37 8 4-5m58-17 4 3" stroke="#9d3d30"/>',
    cutPaper+'<path d="M33 47q15-6 12-18 10-14 25-1 3 14 15 17-19 8-52 2z" fill="#455158"/><path d="m48 45 7-3m13 2 4-4" stroke="#e3d5b8"/><path d="m33 58 43-5"/>',
    '<path d="M11 24 91 12l10 53-78 9z" fill="#677e87"/><path d="m14 38 79-13m-75 29 79-14m-74 29 76-13" stroke="#ddd3b9"/>'+ '<path d="m43 25 51 3-4 35-50-4z" fill="#ede0c2"/><path d="m50 38 30 2m-30 5 20 2m-23 6 32 2"/>',
    '<path d="m16 26 76-9 3 18q-8 1-6 6t8 4l3 14-78 9-2-12q9-3 6-9t-9-1z" fill="#dfc19e"/><circle cx="47" cy="43" r="4"/><circle cx="69" cy="41" r="4"/><path d="M47 43C23 29 8 14 9 10q1-8 13 4l28 30" stroke="#9d3d30"/><path d="m55 22 4 40" stroke-dasharray="2 3"/>',
    '<path d="m17 22 77-5 3 43-77 5z" fill="#e9d4ac"/><path d="m37 21 3 42" stroke-dasharray="2 3"/><circle cx="74" cy="48" r="13" stroke="#a27950" opacity=".8"/><path d="m51 28 30-2m-29 9 21-1m-46 8 5-1"/>',
    '<path d="M18 50Q27 18 67 10 46 29 18 50zm4-6Q32 20 33 9 38 22 22 44z" fill="#758873"/><path d="m29 49 15-15 50 11-4 24-51-10z" fill="#dfc69d"/><circle cx="43" cy="45" r="2"/><path d="m43 45-24-1m34 4 29 7m-31 0 19 4"/>',
    cutPaper+ruled+'<path d="m52 57 30-3 1 9-30 3z" stroke="#9d3d30"/><path d="m79 62 17-45 4 2-16 45-5 5z" fill="#ac6551"/>',
  ];
  return `<svg class="relay-enclosure" viewBox="0 0 112 84" fill="none" stroke="#344348" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true" focusable="false">${items[station]}</svg>`;
}
