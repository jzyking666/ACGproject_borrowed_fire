/** Dispatcher's district plates. Positions are surveyed on the same 840 × 420 sheet. */
export const DISTRICTS = [
  {
    id: 0, title: '翻牌邮亭', landmark: '翻牌信号楼', resident: '代班邮差 · 六禾', color: '#cb8768', x: 86, y: 276,
    arrival: '六禾把一袋退信倒在余照脚边。每封都盖着“地址不详”，可窗外明明亮着八条街的灯。邮亭头顶那排翻牌卡在半腰，漆黑的一半正好挡住了街名。',
    restored: '第一块白牌啪地翻下来。六禾照着“炉渣巷”拣出一封厚信，里面夹着半枚铸坏的铜字。收件人已经来过三次。',
  },
  {
    id: 1, title: '炉渣巷', landmark: '皮带飞轮棚', resident: '翻砂工 · 朱鹭', color: '#ce9771', x: 123, y: 112,
    arrival: '朱鹭的模盒打开着。盒里摆着一枚左右写反的“市”字。老电局曾让她把街名铸成牌，撤网通知一来，字模连同订金都装进了退信袋。她想再试一炉。',
    restored: '飞轮牵起搁置了半年的皮带。朱鹭把刚打好的铜字包进报纸，给收市场篷子的师傅留了个角，摸到凸起就能认出是哪一包。',
  },
  {
    id: 2, title: '风篷市场', landmark: '折骨连篷', resident: '收篷师傅 · 金嫂', color: '#bea05f', x: 279, y: 171,
    arrival: '雨都顺着一架收拢的篷骨滴进秤盘。金嫂的柜台上压着铜字、账本和三张过桥小票。她把小票往你手里一塞：“桥那边也算这一条街，千万别只抄到河沿。”',
    restored: '连篷从西到东撑开，秤盘里的雨停了。送豆浆的车头一次按纸上印的站名交货。车尾挂着金嫂的过桥小票，下一站还隔着一条河。',
  },
  {
    id: 3, title: '双孔桥', landmark: '两叶折桥', resident: '开桥员 · 闻舟', color: '#98b0b5', x: 397, y: 272,
    arrival: '豆浆车停在桥头，水上的送尺船也在等。闻舟指着两扇桥叶：“过街的人看路，行船的人看影子。两边的灯得把话说清，同一时刻只能请一边走。”',
    restored: '第一班车过完，桥叶抬起，河面上露出一条完整的白道。送尺船带走了桥洞里捞到的旧标牌，背面刻着一根短短的水线。',
  },
  {
    id: 4, title: '雨尺船坞', landmark: '浮台尺架', resident: '船坞量水员 · 伍姐', color: '#81aaa7', x: 566, y: 314,
    arrival: '伍姐把旧牌贴到潮尺上，刻痕正好对到最低一格。船坞的浮台还趴在滩泥里。苗圃的水盘装满了，一推下坡就会把泥浆摇进种子里。',
    restored: '浮台平平地托起船底，伍姐把水盘一只只递进船。挂在船头的旧牌在水面留下一条方影，远岸的育苗窗也有了同样的倒影。',
  },
  {
    id: 5, title: '盐风苗圃', landmark: '百叶育苗棚', resident: '苗圃看护员 · 阿苇', color: '#9ab58c', x: 729, y: 196,
    arrival: '阿苇用舌尖尝了尝水，终于肯接船上的盘子。盐风一大，百叶窗就得轮着开。她从口袋里摸出一把空苗牌：“街名要是有字了，劳驾也给我印几张。”',
    restored: '棚顶的百叶翻向背风侧，嫩芽直起腰。阿苇用一片叶子包了七粒种子，压在给印字师傅的送样单上。第八粒留在她手里。',
  },
  {
    id: 6, title: '刻字坡', landmark: '脚踏圆盘印床', resident: '排字师 · 沈迟', color: '#a69cb3', x: 611, y: 89,
    arrival: '沈迟把一张苗牌放上印床，排到末行时缺了个字。抽屉里有铸反的旧字，也有给市场新打的正样。他铺开总图：“哪条街的名字漏印了，这张就算废张。”',
    restored: '压盘咬合，八条街第一次印在同一张纸上。沈迟捻起第一张湿样，往回水塔跑；白边还空着一格，等早班的人写上接管时间。',
  },
  {
    id: 7, title: '回水塔', landmark: '四瓣潮时盘', resident: '旧区调度 · 岑姨', color: '#b8af7a', x: 427, y: 76,
    arrival: '潮时盘的四块铜叶垂在塔顶。岑姨把新印的图纸贴上玻璃，露出八行等着签收的空位。余照把笔伸过去，她却推开塔门：“你先听听，谁在下面应声。”',
    restored: '铜叶舒开，潮时盘转过一格。桥下响了一声铃，市场的篷边应了一声，山坡上最后一张苗牌从压盘底下滑出来。表上的八个名字各有人签了。',
  },
] as const;

export const CAMPAIGN_EPILOGUE = '天亮时，邮亭把昨天的退信袋翻过来，装上今天刚印的街区图。余照在塔梯最下面一级歇脚，阿苇把那第八粒种子塞进砖缝。岑姨在交班簿上写下地址。这一次连门牌号都有了。';

export type DistrictStatus = 'locked' | 'open' | 'restored';
type District = typeof DISTRICTS[number];

const stroke = (d: string, width = 1.8, ink = 'var(--atlas-ink)') =>
  `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const patch = (d: string, color = 'var(--atlas-ink)') => `<path d="${d}" fill="${color}"/>`;
const lamp = (x: number, y: number, r: number, lit: boolean) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${lit ? 'var(--atlas-light)' : 'var(--atlas-shadow)'}"/>`;

// Original cut-paper landmarks. Every moving part has discrete mechanical poses so the
// repaired building is readable in a still print, including under reduced motion.
function landmarkPlate(id: number, lit: boolean): string {
  const ink = 'var(--atlas-ink)', tint = 'var(--atlas-tint)', pale = 'var(--atlas-face)', shadow = 'var(--atlas-shadow)';
  switch (id) {
    case 0: { // Street names turn over inside the high post-office fascia.
      const blades = [0, 1, 2].map(i => {
        const x = 34 + i * 13;
        return patch(lit ? `M${x} 27h10v9h-10z` : `M${x} 28l10 3-10 2z`, lit ? pale : tint);
      }).join('');
      return patch('M19 63V31l9-9h51l7 7v34z') + patch('M14 28l14-13 51 2 13 12H14z', tint)
        + patch('M28 62V40h44v22z', shadow) + patch('M33 41h10v21H33z', tint)
        + stroke('M49 44h18m-18 4h18m-18 4h18', 1.8, pale) + stroke('M78 18V5', 2.3)
        + patch(lit ? 'M79 5l14 2-14 6z' : 'M79 5l3 2 1 9-4-3z', tint) + blades;
    }
    case 1: {
      const wheel = `<g transform="rotate(${lit ? -29 : 8} 70 46)"><circle cx="70" cy="46" r="15" fill="${tint}" stroke="${ink}" stroke-width="3"/>${stroke('M70 32v28m-14-14h28m-24-10 20 20m-20 0 20-20', 2.5)}</g>`;
      return patch('M11 62v-20l18-12 25 1 13 12v19z') + patch('M21 38l1-22h8l2 19zm14-4 1-26h8l3 26z')
        + patch('M14 41l15-8h24l11 9z', tint) + patch('M21 48h11v12H21zM39 48h10v12H39z', lit ? pale : shadow)
        + wheel + stroke(lit ? 'M48 39L67 30m-19 23 23 9' : 'M48 39q13 5 19-9m-19 23q14 13 23 9', 1.9)
        + (lit ? stroke('M33 11q4-5 11-4m3-2q7-3 12-1', 1.6, tint) : '');
    }
    case 2: {
      const cloth = lit ? 'M13 28h67l11 16-8 4-6-4-7 4-7-4-7 4-7-4-7 4-7-4-8 4-7-4-8 3z' : 'M18 29h61l-4 7-11-3-11 3-12-3-12 3-11-2z';
      return stroke('M18 62V23m60 39V22M13 28h72M31 53h34', 2.8)
        + patch('M17 53h61v7H17zM23 57h4v6h-4zm47 0h4v6h-4z') + patch(cloth, tint)
        + (lit ? stroke('M32 28l-6 15m21-15-2 16m15-16 4 16m8-16 9 16', 2.6, pale) : stroke('M21 31h56', 1.3, pale))
        + patch('M29 52v-5l5-3 6 3v5zm26 0v-5h7v5z') + lamp(48, 46, 2.1, lit);
    }
    case 3: {
      const left = lit ? 'M30 48l15-24 4 2-15 24z' : 'M30 48h22v4H30z';
      const right = lit ? 'M70 48L56 24l-4 2 14 24z' : 'M70 48H48v4h22z';
      return patch('M4 46h24v16h-5v-8H12v8H7zm68 0h22v16h-5v-8H78v8h-6z')
        + stroke('M18 46V20h5v26m55 0V20h5v26', 2.7)
        + stroke(lit ? 'M21 22l21 6m39-6-23 6' : 'M21 22l23 26m37-26L56 48', 1.8, shadow)
        + patch(left, tint) + patch(right, tint) + lamp(20.5, 18, 2.8, lit) + lamp(80.5, 18, 2.8, lit)
        + (lit ? patch('M32 56h22l-5 5H37zM39 55v-4h6v4z', tint) : stroke('M36 57h28', 1.4, shadow));
    }
    case 4: {
      const dy = lit ? -9 : 0;
      return patch('M10 60V15h5v45zm69 0V13h5v47zM8 14h79v5H8z')
        + stroke('M15 16l13 11 13-11 13 11 13-11 12 10M24 18v25m45-25v25', 1.6, shadow)
        + `<g transform="translate(0 ${dy})">${patch('M18 50h55l-10 10H33z', tint)}${patch('M33 49v-8h21v8z')}${stroke('M38 43h11', 1.9, pale)}${patch('M17 60h58v3H17z')}</g>`
        + stroke('M89 24v34m-5-30h5m-3 6h3m-5 6h5m-3 6h3m-5 6h5', 1.6);
    }
    case 5: {
      const blinds = [0, 1, 2].map(i => {
        const x = 30 + i * 12;
        return stroke(lit ? `M${x} ${34 - i * 3}l-1-9` : `M${x} ${34 - i * 3}l10-3`, 2.7, tint);
      }).join('');
      return patch('M12 62V40l48-15 26 16v21z', shadow) + stroke('M10 40l49-18 29 17M17 40v21m15-26v26m14-30v30m15-35v35m13-28v29', 2, ink)
        + blinds + (lit ? patch('M23 60v-8q-5 0-6-5 6 0 7 5 2-7 8-7-2 6-7 8v7zm27 0v-9q-8-1-9-9 9 0 10 9 4-11 11-11-1 8-10 13v7z', pale)
          : patch('M18 60q5-6 10 0zm27 0q6-7 12 0z', tint)) + patch('M10 61h79v3H10z') + lamp(67, 38, 2, lit);
    }
    case 6: {
      const bed = lit ? 39 : 49;
      return patch('M17 64V42l5-3V23h9v16h7v25zM31 22h41l3 6H31zM72 26h6v34h-6z')
        + patch('M27 56h59v6H27z') + patch(`M34 ${bed}h38v4H34z`, tint)
        + stroke(`M37 27l7 ${bed - 27}m13-12-6 12`, 2.5) + lamp(23, 49, 9, lit)
        + stroke('M17 50l12-4m-8-3 4 12', 2) + (lit ? patch('M45 52l36-5 10 4-36 5z', pale) : '')
        + patch('M30 18l19-10 14 10-4 3H31z', tint);
    }
    case 7: {
      const sails = [0, 90, 180, 270].map(a => `<g transform="rotate(${a} 53 22)">${patch(lit ? 'M53 22l-2-18 7-3 2 13z' : 'M53 22l1-9 2 2-1 7z', tint)}</g>`).join('');
      return patch('M27 62l8-19-4-8h8v-7h26v7h8l-5 8 9 19h-8l-8-17H42l-8 17z')
        + stroke('M36 62l26-17m5 17L42 45', 2, shadow) + patch('M36 30l6-7h22l7 7z', tint) + sails
        + lamp(53, 22, 3.1, lit) + stroke('M7 58h16m53-4h14', 1.6, shadow);
    }
    default: return '';
  }
}

const panoramaBacks = [
  'M0 42l12-8h18v7h11v-6h17v9h17l11-8h14v8h19v-5h28v5l23-12h14v13h22v19H0z',
  'M0 45h13v-7l12-7v14h7V24h6v22h8l15-11v10h35l17-11v11h22V21h6v25h8l16-9v8l22-7v23H0z',
  'M0 41l16-9 15 9 15-9 17 9 18-10 18 10 18-8 19 8 19-9 17 9 20-9 17 9v20H0z',
  'M0 43l19-3 18-6 15 5 22-6 19 5 30-7 19 8 18-5 18 4 17-5v28H0z',
  'M0 48l14-5h23l7-8h12l4 8h16l6-5h12v6h24l10-11h15v9h23l9-6 17 10v17H0z',
  'M0 51l19-9 11 4 16-16 17 10 28-18 19 15 12-4 18 11 21-14 21 14 11-4v23H0z',
  'M0 42l18-5v-4l23-4v4l18-4v-5l18-3v4l18-2v-6l21-3v6l15-2 25 14 23 7 25 13v13H0z',
  'M0 47l20-10 17 4 21-15 21 7 23-13 17 12 20-8 19 14 15-4 19 8v18H0z',
];

function plateTint(district: District) {
  return `--atlas-tint:${district.color};--atlas-ink:#29383a;--atlas-shadow:#68736a;--atlas-face:#e4d7b7;--atlas-light:#fff1ae`;
}

/** Small station print for the district heading. Contains its own palette for offline export. */
export function districtArt(id: number, restored: boolean): string {
  const d = DISTRICTS[id];
  if (!d) return '';
  const paper = restored ? '#dcd0ab' : '#b3bab1';
  const water = [3, 4, 5, 7].includes(id);
  return `<svg class="district-print" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 72" role="img" aria-label="${d.landmark}，${restored ? '恢复运行' : '等待接通'}" style="${plateTint(d)}">
    <rect width="192" height="72" fill="${paper}"/>${patch(panoramaBacks[id], restored ? '#a9ac94' : '#8e9b92')}
    ${stroke('M0 53q34-8 61-2t65-2q40-7 66 0', 1, '#829181')}
    <path d="M0 61q44-6 97-2t95-3v16H0z" fill="${water ? '#91a5a0' : '#929982'}"/>
    ${water ? stroke('M3 63h16m6 1h13m104-2h17m5 4h18m-36 3h8', 1, '#c9c9ae')
    : stroke('M2 62l32-2m-13 5 20-1m106-2 24 1m-17 3 33 2', 1, '#bbc0aa')}
    <g transform="translate(46 0)">${landmarkPlate(id, restored)}</g>
    ${stroke('M3 5v4M3 5h5m176 0h5v4', .9, '#707865')}</svg>`;
}

const channel = 'M-12 162C87 181 134 241 222 239S352 180 410 203S471 279 524 261S587 188 642 217S719 281 758 271S829 231 856 246';
const inlet = 'M506 -12C479 52 532 82 525 132S477 208 501 257';

const streetBlocks: { x: number; y: number; angle: number; columns: number; rows: number }[] = [
  { x: 18, y: 43, angle: -10, columns: 6, rows: 3 }, { x: 153, y: 87, angle: 12, columns: 5, rows: 3 },
  { x: 231, y: 141, angle: -15, columns: 6, rows: 3 }, { x: 319, y: 63, angle: 5, columns: 7, rows: 3 },
  { x: 49, y: 293, angle: 12, columns: 7, rows: 3 }, { x: 198, y: 280, angle: -11, columns: 6, rows: 3 },
  { x: 289, y: 337, angle: -11, columns: 7, rows: 3 }, { x: 419, y: 328, angle: 8, columns: 5, rows: 2 },
  { x: 597, y: 53, angle: 12, columns: 4, rows: 3 }, { x: 665, y: 111, angle: 7, columns: 4, rows: 2 },
];
function cityBlocks(): string {
  return streetBlocks.map(({ x, y, angle, columns, rows }) => {
    let blocks = '';
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const w = (i + j) % 3 === 0 ? 8 : 11, h = (i + 2 * j) % 2 ? 5 : 7;
      blocks += `<rect x="${i * 15}" y="${j * 12}" width="${w}" height="${h}"/>`;
    }
    return `<g transform="translate(${x} ${y}) rotate(${angle})">${blocks}</g>`;
  }).join('');
}

const rail = 'M-8 361L116 354Q158 352 191 331L279 273Q317 247 344 246L423 245Q459 243 482 218L607 102Q622 85 646 79L853 31';
// Endpoints follow the two river-bank branches of the district supply network.
const feeders: readonly [number, number, string][] = [
  [0, 1, 'M86 276L56 251V194l67-82'],
  [0, 2, 'M86 276l64-3 54-56 75-46'],
  [1, 3, 'M123 112l43 30 2 26 38 27 50 25 69 1 72 51'],
  [2, 3, 'M279 171l31 27 56 17 31 57'],
  [3, 4, 'M397 272l46 27 75 15h48'],
  [3, 5, 'M397 272l65-52 79-45 108-5 80 26'],
  [4, 6, 'M566 314l48-48 8-74-11-103'],
  [5, 6, 'M729 196l-12-56-37-34-69-17'],
  [6, 7, 'M611 89l-70 17-51-30h-63'],
];

/** The river, port structures, survey/railway marks and small urban blocks are printed
 * once. Only the feeder traces and eight inset prints depend on progress. */
const baseSheet = `
  <defs><pattern id="atlas-water-lines" width="9" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-17)"><rect width="9" height="8" fill="#7f9fa8"/><path d="M0 1h9" stroke="#9eb6b9" stroke-width=".8"/></pattern></defs>
  <rect width="840" height="420" fill="#eee3c8"/>
  <g fill="#bbb79f">${cityBlocks()}</g>
  <g stroke="#a3a68e" stroke-width="1.2" fill="none">
  ${Array.from({ length: 7 }, (_, i) => `<path transform="translate(${i * 6} ${i * 5})" d="M626 -10q33 17 65 14t68 17q15 10 20 27t61 30"/>`).join('')}
  ${Array.from({ length: 5 }, (_, i) => `<path transform="translate(${i * -6} ${i * -4})" d="M-5 406q40-45 70-34t55 11q30 0 56 35"/>`).join('')}
  </g>
  ${stroke(channel, 33, '#92aba9')}${stroke(channel, 28, 'url(#atlas-water-lines)')}
  ${stroke(inlet, 13, '#92aba9')}${stroke(inlet, 10, '#779aa3')}
  ${patch('M604 420C633 384 623 357 654 333L701 296Q738 276 756 261T840 238V420Z', '#779aa3')}
  ${stroke('M618 419q19-27 22-44t25-35l49-35m15-12 22-18m22-7 30-15', 1.4, '#bfc9b1')}
  ${stroke('M11 166l24 9m123 55 19 3m35 6 20-1m109-27 21-4m59-1 12 12m88 42 21-4m89-44 20 5m69 41 17 5m-7 45 13-5m28 8 14-6m8 17 17-5m-74 16 10-3', 1.6, '#bac3ad')}
  ${stroke('M-3 130l96 50 55-24 73 29 65-20 53 12 70-14 44-50 93-24 66 18 59 21 72 44 97 22', 4, '#fbf3db')}
  ${stroke('M10 311l88-21 70-24 111 7 57-11 69 26 55 34 85-3 60 16 50-27', 5, '#fbf3db')}
  ${stroke('M328 418l19-74 20-33 8-83 17-49 33-67 2-41 9-78', 3.6, '#fbf3db')}
  ${stroke(rail, 4, '#626e69')}<path d="${rail}" fill="none" stroke="#eee3c8" stroke-width="2.3" stroke-dasharray="7 4"/>
  <g fill="#657c71">${[0,1,2,3].map(i => `<path transform="translate(${i * -11} ${i * 13})" d="M693 305l23 16-2 3-24-15z"/>`).join('')}</g>
  <path d="M24 19l-4 14 4-3 4 3z" fill="#53685f"/><text x="24" y="43" text-anchor="middle" font-size="9" fill="#526458">北</text>
  <g fill="none" stroke="#909880" stroke-width=".8"><path d="M8 8h824v404H8z"/>
  ${Array.from({length:27},(_,i)=>`<path d="M${i * 30 + 22} 8v3m0 401v-3"/>`).join('')}</g>`;

const statuses: Record<DistrictStatus, string> = { locked: '待前区送电', open: '可检修', restored: '已复网' };

export function districtMap(selected: number, status: (id: number) => DistrictStatus): string {
  const states = DISTRICTS.map(d => status(d.id));
  const restored = states.filter(s => s === 'restored').length;
  const traces = feeders.map(([from, to, path]) => {
    const connected = states[to] !== 'locked';
    const available = states[from] !== 'locked';
    const color = connected ? '#254c42' : available ? '#9e492f' : '#79745f';
    return `<path data-feeder="${from}-${to}" d="${path}" fill="none" stroke="#ede3c8" stroke-width="5.5"/><path d="${path}" fill="none" stroke="${color}" stroke-width="${connected ? 3.2 : 2.2}" ${connected ? '' : 'stroke-dasharray="5 4"'}/>`;
  }).join('');
  const pins = DISTRICTS.map(d => {
    const state = states[d.id], active = state === 'restored', sealed = state === 'locked';
    return `<button type="button" class="atlas-station atlas-${state}" data-action="district-${d.id}" aria-label="${d.title}，${statuses[state]}" aria-pressed="${d.id === selected}" style="--pin-x:${d.x / 840 * 100}%;--pin-y:${d.y / 420 * 100}%;${plateTint(d)}" ${sealed ? 'disabled' : ''}>
      <svg viewBox="0 0 100 67" aria-hidden="true">${landmarkPlate(d.id, active)}</svg><span><i aria-hidden="true">${active ? '✓' : sealed ? '·' : '○'}</i>${d.title}</span></button>`;
  }).join('');
  return `<figure class="district-atlas" aria-label="七区复网线路图"><div class="atlas-sheet"><svg class="atlas-survey" viewBox="0 0 840 420" preserveAspectRatio="none" aria-hidden="true">${baseSheet}${traces}</svg>
    <div class="atlas-pins" role="group" aria-label="选择街区">${pins}</div></div>
    <figcaption><span><i class="atlas-line" aria-hidden="true"></i>已通行　<i class="atlas-line pending" aria-hidden="true"></i>待接通</span><span><b>${restored}</b> / 8 区已送电</span></figcaption></figure>`;
}
