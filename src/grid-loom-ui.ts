import type { BoardFamily } from './campaign-board';
import { canTurn, contactFits, drumName, loomPath, looms, loomSolved, nextLoomTurn, turnLoom, validLoom, wireMarks, wireNames, type LoomBoard, type LoomPoint } from './grid-loom';

// Fired enamel on the dark circuit plate, and the matching inks on the inspector's paper.
const colors = ['#f0c266', '#8ad0df', '#ff967f', '#b5d999', '#d4b9e7'];
const inks = ['#78500d', '#1b566d', '#943422', '#345833', '#68417a'];
const tracers = ['0', '1 6', '6 5', '1 4 6 4', '3 3'];
const stops = ['Ⅰ', 'Ⅱ', 'Ⅲ'];
// Names stamped into the actual receiving panel at each of the eight worksites.
const terminals = [
  ['分拣台', '报时钟', '翻名牌', '灯箱', '夜信筒'],
  ['烘模架', '飞轮', '落砂筛', '浇注台', '模印灯'],
  ['风向标', '卷篷轴', '铺台灯', '地秤', '雨槽'],
  ['桥头铃', '北桥叶', '水面灯', '南桥叶', '桥尺'],
  ['汛线灯', '浮台', '水尺', '绞盘', '船闸'],
  ['背风窗', '翻苗盘', '滴水器', '验盐灯', '苗牌槽'],
  ['排字架', '导墨轮', '压盘', '晾纸架', '页码轮'],
  ['水位针', '校时轮', '回水泵', '塔顶灯', '交班铃'],
];
const wireLabel = (name: number) => `${wireMarks[name]} ${wireNames[name]}线`;
const after = (point: LoomPoint, n: number, labels: string[]) => `${point.at === n ? labels[point.lane] : drumName(point.at - 1) + ' 梭后'} · ${point.lane + 1} 道`;
const wireChip = (n: number) => `<span class="loom-wire" style="--wire:${inks[n]}">${wireLabel(n)}</span>`;

function readings(board: LoomBoard, stages: number[][], labels: string[]) {
  const read = (p: LoomPoint) => stages[p.at][p.lane];
  return board.contacts.map((c, i) => {
    const next = c.kind === 'match' ? `与 ${after(c.other, board.drums.length, labels)} 接同一根线` : c.kind === 'isolate' ? `避开 ${wireChip(c.wire)}` : `接入 ${wireChip(c.wire)}`;
    const actual = c.kind === 'match' ? `${wireChip(read(c))} ／ ${wireChip(read(c.other))}` : wireChip(read(c));
    return `<li class="${contactFits(c, stages) ? 'loom-pass' : ''}"><span class="loom-probe">${i + 1}</span><span><b>${after(c, board.drums.length, labels)}</b><br>${next}</span><span>实接 ${actual}</span><strong aria-label="${contactFits(c, stages) ? '已符合' : '待调整'}">${contactFits(c, stages) ? '✓' : '○'}</strong></li>`;
  }).join('');
}

/** Engraved position strip: all three routing patterns can be inspected before turning. */
function detents(board: LoomBoard, drum: number, current: number) {
  const height = (board.lanes - 1) * 4 + 6;
  return `<span class="loom-detents" aria-hidden="true">${board.drums[drum].map((mask, stop) => {
    const strokes = Array.from({ length: board.lanes }, (_, lane) => {
      const target = mask & (1 << lane) ? lane + 1 : lane > 0 && mask & (1 << (lane-1)) ? lane - 1 : lane;
      return `<path d="M2 ${lane*4+3}h3l10 ${(target-lane)*4}h3"/>`;
    }).join('');
    return `<svg data-current="${stop === current}" viewBox="0 0 20 ${height}"><g fill="none" stroke="currentColor" stroke-width="1.2">${strokes}</g></svg>`;
  }).join('')}</span>`;
}

function handwheel(position: number) {
  return `<svg class="loom-wheel" viewBox="0 0 44 44" aria-hidden="true">
    <circle cx="22" cy="22" r="18.6" fill="#233640" stroke="#abada0" stroke-width="2.4" stroke-dasharray="1.4 2.1"/>
    <circle cx="22" cy="22" r="15" fill="#d2c6a9" stroke="#0d212a" stroke-width="2"/>
    <g transform="rotate(${position * 120} 22 22)"><path d="M22 9v10" stroke="#883a29" stroke-width="4"/><path d="M12 27l5-3m15 3-5-3" stroke="#82785f" stroke-width="2"/></g>
    <circle cx="22" cy="22" r="3" fill="#26373a"/>
  </svg>`;
}

function drumKey(board: LoomBoard, values: number[], stages: number[][], i: number) {
  const name = drumName(i), value = values[i];
  const links = board.links.filter(l => l.from === i).map(l => `${drumName(l.to)}${l.step === 1 ? ' 同转' : ' 反转'}`).join('、');
  const clutch = board.clutches.find(c => c.drum === i);
  const open = canTurn(board, i, stages);
  const nextMask = board.drums[i][(value + 1) % 3];
  const crossing: string[] = [];
  for (let lane = 0; lane < board.lanes - 1; lane++) if (nextMask & (1 << lane)) crossing.push(`${lane + 1}↔${lane + 2}`);
  return `<button type="button" class="loom-key" data-action="board-turn-${i}" ${!open ? 'disabled' : ''} aria-label="${name} 梭，${open ? '转至' + stops[(value + 1) % 3] + '档' : '离合未接通'}">${handwheel(value)}<b>${name} 梭 <small>${stops[value]} → ${stops[(value + 1) % 3]}</small></b>${detents(board,i,value)}<span>下档　${crossing.length ? crossing.join(' · ') : '各道直通'}</span>${links ? `<em>齿带 · ${links}</em>` : ''}${clutch ? `<em class="loom-clutch">${open ? '已合' : '待合'} · 入口 ${clutch.lane + 1} 道需${wireLabel(clutch.wire)}</em>` : ''}</button>`;
}

function chart(board: LoomBoard, values: number[], stages: number[][], labels: string[]) {
  const pitch = 80, top = 48, lead = 61, spacing = 32;
  const height = top + spacing * (board.lanes - 1) + 30, end = lead + pitch * board.drums.length, width = end + 78;
  const rowY = (lane: number) => top + spacing * lane;
  const xAt = (at: number) => lead + at * pitch;
  const linkBadges = board.drums.map((_, i) => {
    const clutch = board.clutches.find(c => c.drum === i);
    const x = xAt(i) + pitch / 2;
    return `<path d="M${xAt(i)} 24v${height - 35}" stroke="#a0b9ba" stroke-opacity=".36" stroke-dasharray="2 4"/><text x="${x}" y="17" text-anchor="middle" fill="#e5d8b5" font-weight="600">${drumName(i)} · ${stops[values[i]]}</text>${clutch ? `<circle cx="${xAt(i)}" cy="${rowY(clutch.lane)}" r="8" fill="none" stroke="#fff1c6" stroke-dasharray="${canTurn(board,i,stages) ? 'none' : '2 2'}"/>` : ''}`;
  }).join('');
  const stamps = stages[0].map((_,lane) => {
    const y = rowY(lane), final = stages.at(-1)![lane];
    return `<text x="${lead - 9}" y="${y + 4}" text-anchor="end" fill="${colors[lane]}">${wireMarks[lane]} ${wireNames[lane]}</text><text x="${end+9}" y="${y+4}" fill="${colors[final]}">${wireMarks[final]} ${lane+1} ${labels[lane]}</text>`;
  }).join('');
  const wires = board.drums.map((_, i) => stages[i].map((wire, before) => {
    const x=xAt(i), y=rowY(before), nextY=rowY(stages[i+1].indexOf(wire));
    const d=`M${x} ${y}h11C${x+35} ${y} ${x+45} ${nextY} ${x+69} ${nextY}h11`;
    return `<path d="${d}" stroke="#1b303a" stroke-width="8"/><path d="${d}" stroke="${colors[wire]}" stroke-width="3.8"/><path d="${d}" stroke="${wire ? '#18303a' : 'none'}" stroke-width="1.6" stroke-dasharray="${tracers[wire]}"/>`;
  }).join('')).join('');
  const stamp = (p: LoomPoint, i: number, fits: boolean, second = false) => {
    const x=xAt(p.at) - (second ? 9 : 0), y=rowY(p.lane) - (second ? -10 : 10);
    return `<g transform="translate(${x} ${y})"><path d="M0 0v${second ? -9 : 9}" stroke="#e4d8b7"/><rect x="-6" y="-6" width="12" height="12" rx="2" fill="${fits ? '#b0cda8' : '#e6cea3'}"/><text text-anchor="middle" fill="#182528" font-size="10" y="3.8">${i+1}</text></g>`;
  };
  const probes = board.contacts.map((c,i) => stamp(c,i,contactFits(c, stages)) + (c.kind === 'match' ? stamp(c.other,i,contactFits(c,stages),true) : '')).join('');
  return `<svg class="loom-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="配线从左向右穿过旋梭。出线从上往下是${stages.at(-1)!.map(wireLabel).join('、')}。"><rect width="100%" height="100%" fill="#1b303a"/><rect x="3" y="3" width="${width-6}" height="${height-6}" stroke="#90a5a5" fill="none" opacity=".6"/><g fill="none">${wires}</g>${linkBadges}${stamps}${probes}</svg>`;
}

const lessons = [
  '光线从左向右走。梭子每转一档，会交换指定的两道线。按插座清单送到相应的位置。',
  '巡线员在半路留下了测孔。逐个核对编号，末端和中途的接线要同时符合。',
  '封条上写着应当避开的线。把那根线引走，封条旁可以经过其他线。',
  '齿带接在手轮上。亲手转动一梭，带动标出的从动梭换一档。被带动的梭不会再拉动下一条齿带。',
  '两个贴着同号签的测孔要认出同一根线。带反齿的从动梭会向相反方向转一格。',
  '虚线圈是手轮的取电口。指定的线经过入口，手轮才能转动。关着的手轮仍能被齿带带动。',
  '有的档位一口气交换两对线。先看手轮标出的下档，接着追踪中途的取电口。',
  '在两只手轮之间借电开锁，再把线路接回测孔。比较同号测孔上的纹章，检查最后的接头。',
];
export function renderLoom(index: number, values: number[]) {
  const b = looms[index], stages = loomPath(b,values), labels = terminals[Math.floor(index / 6)];
  return `<section class="loom-bench" aria-label="配线织盘"><p class="loom-brief">${lessons[Math.floor(index/6)]}</p><div class="loom-assembly"><div class="loom-plate">${chart(b,values,stages,labels)}</div><div class="loom-controls" aria-label="旋梭手轮">${b.drums.map((_,i) => drumKey(b,values,stages,i)).join('')}</div></div><section class="loom-worksheet"><h2>测孔读数</h2><ol class="loom-readings" aria-label="测孔读数">${readings(b,stages,labels)}</ol></section></section>`;
}
export const loomFamily: BoardFamily = {
  name: '配线织盘',
  title: i => looms[i].title,
  initial: i => [...looms[i].opening],
  valid: validLoom,
  solved: (i,v) => loomSolved(looms[i],v),
  apply(i,v,verb) {
    const match = /^turn-(\d+)$/.exec(verb);
    return match ? turnLoom(looms[i],v,Number(match[1])) : v;
  },
  hint(i,v) {
    const next = nextLoomTurn(i,v);
    if (next < 0) return '所有测孔都已符合，可以验收。';
    const linked = looms[i].links.filter(l => l.from === next);
    const extra = linked.length ? `留意 ${linked.map(l => drumName(l.to)).join('、')} 梭的联动。` : '从这一列往右追踪换道的线，看看下一个测孔接入什么。';
    return `从当前布线出发，先将 ${drumName(next)} 梭转一格，到 ${stops[(v[next]+1)%3]} 档。${extra}`;
  },
  render: renderLoom,
};
