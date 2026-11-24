import { jobKey, TRADES, type CampaignProgress } from './campaign-progress';

export interface ReturnMail {
  title: string;
  envelope: string;
  marks: string;
  evidence: readonly number[];
  candidates: readonly number[];
  from: number;
  to: number;
  reply: string;
  explanation: string;
}

/** A sector number is a printed address. The paper trail can include a postmark
 * from a third address; the player must distinguish that mark from either end. */
export const RETURN_MAIL: readonly ReturnMail[] = [
  {
    title: '贴低一点',
    envelope: '六禾的便笺，包着一张很小的称量副票。她写道：“请替我给昨天踮着脚的人留个口信。他问了三回，那件东西今天有人来领。”',
    marks: '寄件章涂掉了，只剩压在章下的“四十六克”。中缝有一道折痕，摊开才读得全。收件人的手碰得到一块擦亮的低玻璃。',
    evidence: [0, 1, 2], candidates: [2, 0, 1], from: 1, to: 0,
    reply: '便笺贴到了窗框下沿。第二天背胶上粘了一点糖，正好在小手揭得下来的高度。',
    explanation: '夜邮秤三次称得四十六克，副票就从那里开出。踮脚才够得着的亮玻璃属于退信窗。雨棚信槽解释了为什么地址折起来看不全。',
  },
  {
    title: '借一张背面',
    envelope: '扁信封里夹着黑乎乎的小方纸，上面一个朝右的“市”。朱鹭写：“这一印是我亲手按的。你那头透光，烦你在背面再核一道，好让我收模。”',
    marks: '正印带着烟黑，不是从铁网上揭下的蜡纸。收件栏画了一角篷布和一张能两面读的薄纸。',
    evidence: [7, 9, 14], candidates: [9, 14, 7], from: 9, to: 14,
    reply: '金嫂把纸举起来看了两遍。回签很大，撕去一个油渍角，仍看得出她写的是“正”。',
    explanation: '退火台上的铜字在烟黑纸上按出了正向的“市”。引风井留下的是蜡纸拓样。油纸摊能覆在铜字上擦，再对篷外的光核背面。',
  },
  {
    title: '欠一只空瓶',
    envelope: '票面本来写着两瓶，第二瓶被圈掉了。背面托车上的人捎一句：“弯里给我让的那半掌，满载的时候也够。今早连空瓶一起放那儿。”',
    marks: '改单处记着从对岸喊回来的原话。出车前有人把票贴在铜锣边沿，拿铅笔横擦出一道带豁口的弧。答谢的对象在旧车辙边新添过黄漆。',
    evidence: [15, 17, 19], candidates: [19, 17, 15], from: 15, to: 19,
    reply: '闻舟把空瓶挪出了黄线。车倒进来的时候，铃铛和玻璃碰了一下，一声就数清了。',
    explanation: '叫卖台先报“两瓶”，听到对岸喊“一瓶”才改了单。车在开市铜锣旁留下豁口的拓印，最后把空瓶送到了慢车道，闻舟在那里给三轮车留了半掌黄漆。',
  },
  {
    title: '一张怕水的拓印',
    envelope: '信里两张干纸，一张拓了对称的圆点，一张留着空白。闻舟请收信人把空白那张贴在旧牌上，沿最低那道刻痕描回来。',
    marks: '第一张的两个圆点出自同一枚印章。封口用的半张小票上有手写的“西”。待描的那根线标得出潮位。',
    evidence: [18, 23, 25], candidates: [23, 25, 18], from: 18, to: 25,
    reply: '薄纸透了水，伍姐把它晾在盘绳上。退潮的时候线恰好干了，纸上还留着旧牌边缘的一点铁锈。',
    explanation: '能在干纸上一次留下成对圆点的是桥头亭的旧章。两岸换乘口给半张票添过“西”字。把旧牌贴到低水线核刻痕的人在验潮尺。',
  },
  {
    title: '褪色也要认得',
    envelope: '封面缝着一截发白的鞋带，底下是伍姐的铅笔字：“以前摸着它才敢收工。如今有灯，把剩下这段拿去缠个柄。挑那支还没人认领的。”',
    marks: '寄件处用鞋带给熄灯后的归船留记号。收件处的柄有长短，工人以缠线认领。封口的平结只标路往河东。',
    evidence: [20, 24, 34], candidates: [24, 20, 34], from: 24, to: 34,
    reply: '短笔添了一圈白线。伍姐来取苗时被塞进手里：“自己的记号自己用，花粉可别蹭到鼻子上。”',
    explanation: '褪色鞋带原先栓在浮标架下，才是寄件源头。桥腹缆的结用来辨河岸。颜色用来认笔柄的是授粉架，收下鞋带的也应是它。',
  },
  {
    title: '去程留了一个空位',
    envelope: '阿苇夹进一张小牌，牌上有早班到站的时辰。她问：“回去那程，能替空位上将来的那户捎张街图吗？有个人把往返的票都留下了。”',
    marks: '小牌从一半有苗、一半空着的床边取下。回邮栏抄的是抽屉里一张未用票背面的请求。另一张画着进门方向的票只是送水人的路引。',
    evidence: [26, 32, 33], candidates: [26, 33, 32], from: 33, to: 26,
    reply: '船票的去程联终于被撕下。回程那半张里卷着一份晒干的图，苗牌的主人什么时候来都行。',
    explanation: '把早班时刻写给空位的是玻璃床。遮风井那张票画了进门方向。船票窗抽屉里的往返票才写着等墨干后带图回来，应该把请求投到那里。',
  },
  {
    title: '请五个人各签一次',
    envelope: '纸上有一排方方的小油印。沈迟把签名的地方分成五栏：“印这几户的新门牌以前，得请原先替同一个号领东西的人，都用自己的笔写一回。”',
    marks: '油印沾自一个写着“撤网后清空”的抽屉。要核的是同户号的领用票；圈户号、写“信请分送”的工单是后来补的旁证。',
    evidence: [8, 11, 37], candidates: [11, 8, 37], from: 37, to: 8,
    reply: '第一栏的字斜出线，第二栏挤小一点，给它让了个位置。五栏写满，沈迟照原样印了下来。',
    explanation: '拣字架的抽屉里八个街名涂着防锈油，纸上的方印说明它从此处寄出。煤票台保存同号五种笔迹的签领票。交接汽笛旁那张分送工单记的是朱鹭后来补的意见。',
  },
  {
    title: '把切去的那一行寄回来',
    envelope: '八小片薄纸叠在一个空夹子里。岑姨说：“我们都留了副本。烦你把新旧两张重叠的地方给我描下来。这回交接，我得把丢地址的原因也交出去。”',
    marks: '夹子的主人逐根挂过防潮纸。收件处已经留下把湿样与旧版对齐的记录；另一处把限位松开了一个指节，是改好版之后的尺寸。',
    evidence: [38, 39, 46], candidates: [38, 46, 39], from: 46, to: 38,
    reply: '沈迟把新样覆在旧样上，隔着两层纸描出那道线。岑姨把线夹进簿子。下一班照这里折纸，就能避开每一户的名字。',
    explanation: '环城管八根支管都挂过防潮纸，岑姨从那里带回空夹子。把湿样与旧图重叠后发现裁线切掉街名行的地方是烘墨槽。压纸轴是发现问题后放宽白边的地方。',
  },
];

export function hasMailEvidence(progress: CampaignProgress, index: number): boolean {
  const mail = RETURN_MAIL[index];
  return !!mail && mail.evidence.every(sector =>
    TRADES.every(trade => progress.jobs[jobKey(trade, sector)]?.done === true)
  );
}

export function checkAddress(index: number, from: number, to: number): boolean {
  const mail = RETURN_MAIL[index];
  return !!mail && mail.from === from && mail.to === to;
}
