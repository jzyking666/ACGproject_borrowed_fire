import type { BoardFamily } from './campaign-board';
import { TIDES, adjustTide, beat, inspectTide, tideHint, validTide, wrap, type Sailing, type TideBoard, type TideIncident } from './tide-dispatch';

const hulls = ['#ffbd74','#a7d4ce','#e7c9de','#c3cf95','#9ebadb','#f1daa2'];
const hullInks = ['#864526','#28575e','#70435e','#455a26','#354f79','#675121'];
const seal = ['一','二','三','四','五','六'];
const tideNotes = [
  '两艘船在同一拍占用窄闸，就会争道。桐叶的灯号已挂定，试着移动另一行的发船拍。',
  '拖船通过长闸要占用连续两拍。最右边一拍过后会回到第一拍，免得给船尾放早了闸。',
  '有些船能走两条航道。切换岔道会改写整行的经停顺序，有时也会改变靠岸时间。',
  '水闸按潮位封航。先对照潮窗找一艘能出港的船，再给其他船让道。',
  '货签约定了卸船到下一艘发船之间的拍数。末拍卸货也可以交给下一圈的船。',
  '带双箭头的闸可以多船同向编队。上下行同时抵达仍会堵住两扇闸门。',
  '标有双班的航线隔半圈加开同样的船。货签在头班交接，补班也要占闸。',
  '末班港同时结算潮窗、交接与双班。先找到时限最窄的货签，再调整相邻的航线。',
];
const clockButton = (tick: number, label: string, active = false) =>
  `<button type="button" data-action="camp-frame-${tick}" aria-label="定位第 ${beat(tick)} 拍" aria-pressed="${active}">${label}</button>`;
const upper = (s: string) => s.toUpperCase();
const navigates = (mark: string) => !!mark && mark !== '.';
const markLabel = (board: TideBoard, mark: string) => !navigates(mark) ? (mark ? '·' : '—') :
  board.wide.includes(upper(mark)) ? upper(mark) + (mark === upper(mark) ? '↑' : '↓') : upper(mark);
const routeLabel = (b: TideBoard, route: string) => [...route].map(c => markLabel(b,c)).join(' ');
const button = (action: string, label: string, text: string) => `<button type="button" data-action="board-${action}" aria-label="${label}" title="${label}">${text}</button>`;

function boatDrawing(n: number, x: number, y: number, inbound: boolean) {
  const details = [
    '<path d="M-9 -3v-7h9v7m4-2v-3h7v3"/>',
    '<path d="M-11 -4h16l-3-5h-9zm14-1v-9l4 5h-4"/>',
    '<path d="M-10 -3v-5h4v5m1 0v-6h5v6m1 0v-4h5v4"/>',
    '<path d="M-8 -3v-6h7l3 6m0-2v-3h5v3"/>',
    '<path d="M-10 -3v-5h7v5m4-1v-8h3v8m2 0v-5h3v5"/>',
    '<path d="M-11 -4h19l-3-4H-8zm-4-1v-8"/>',
  ][n];
  return `<g transform="translate(${x} ${y})"><g transform="scale(${inbound ? -1 : 1} 1)"><g stroke="#303936" stroke-width="1.2" fill="${hulls[n]}">${details}<path d="M-18 -3h35l-5 5h-22z"/></g><path d="M-21 4h7m25 0h9" stroke="#cbddd0" opacity=".7"/></g><text x="0" y="13" text-anchor="middle" fill="#f4ecda" font-size="9">${seal[n]}</text></g>`;
}

/** A section through the gates at one beat. Boats are placed from the timetable, including relief runs. */
function harbor(board: TideBoard, fleet: Sailing[], incidents: TideIncident[], tick: number, district: number) {
  const w = 560, y = 109, span = 512 / board.locks.length;
  const docks = board.locks.map((lock,k) => {
    const x = 24 + span*k, occupants = fleet.filter(s => upper(s.marks[tick]) === lock);
    const closed = !!((board.closed[lock] ?? 0) & (1 << tick));
    const trouble = incidents.some(e => e.tick === tick && e.lock === lock);
    const color = trouble ? '#eea08e' : closed ? '#bdae9e' : '#b0d0ba';
    const flotilla = occupants.map((s,j) => {
      const spacing = Math.min(44,(span-14)/Math.max(1,occupants.length));
      return boatDrawing(s.boat, x+span/2 + (j - (occupants.length-1)/2)*spacing, y - (j%2)*6, s.marks[tick] !== lock);
    }).join('');
    const beams = [x+3, x+span-3].map(at => `<g fill="#344549" stroke="#71847e" stroke-width=".8"><path d="M${at-3} 76h6v43h-6z"/><path d="M${at-5} 76v-3h10v3z"/></g>`).join('');
    return `<g>${beams}<path d="M${x+4} ${closed ? 96 : 78}h${span-8}" stroke="${closed ? '#dcad89' : '#83958a'}" stroke-width="${closed ? 4 : 1}"/><rect x="${x+span/2-14}" y="60" width="28" height="15" rx="2" fill="#2d3e40" stroke="${color}"/><text x="${x+span/2}" y="71" text-anchor="middle" font-size="10" fill="${color}">${lock}${board.wide.includes(lock) ? ' ⇅' : ''}</text>${flotilla}</g>`;
  }).join('');
  const silhouettes = Array.from({length: 12}, (_, i) => {
    const x = i*49 - 5, h = [9,18,12,25,15,11][(i+district)%6];
    return `<path d="M${x} 89v-${h}l8-4 10 4v-6l10 4v${h+2}z"/>`;
  }).join('');
  const description = board.locks.map(lock => `${lock} 闸${fleet.filter(s=>upper(s.marks[tick])===lock).map(s=>board.boats[s.boat].name).join('、') || '空闲'}`).join('，');
  return `<svg class="tide-harbor" viewBox="0 0 ${w} 133" role="img" aria-label="第 ${beat(tick)} 拍，${description}"><defs><pattern id="harbor-water" width="13" height="5" patternUnits="userSpaceOnUse"><rect width="13" height="5" fill="#516e76"/><path d="M0 4h6" stroke="#738f92" stroke-width=".5"/></pattern></defs><rect width="560" height="97" fill="#e0c3a0"/><circle cx="${414-district*32}" cy="34" r="11" fill="#ac4c32"/><path d="M0 76q74-38 147-14t130 0 129-6 154-9v47H0z" fill="#94a39a"/><g fill="#596c69">${silhouettes}</g><path d="M38 79V51l25-12m-25 7 25-7v5m441 39V53l-31-10m31 5-31-5v8" stroke="#35494c" fill="none" stroke-width="2"/><rect y="90" width="560" height="43" fill="url(#harbor-water)"/><g stroke="#a1b1a0" opacity=".45"><path d="M2 99h29m5 0h19m42-5h31m14 18h48m52-13h19m30-4h45m51 14h49m32-12h30m4 0h32"/></g>${docks}</svg>`;
}

function timetable(board: TideBoard, fleet: Sailing[], incidents: TideIncident[], tick: number) {
  const ticks = Array.from({length:board.period},(_,i) => i);
  const head = ticks.map(t => `<th scope="col" class="${t===tick?'here':''}">${clockButton(t,beat(t),t===tick)}</th>`).join('');
  const rows = fleet.map(s => {
    const vessel=board.boats[s.boat];
    const cells = ticks.map(t => {
      const bad = incidents.some(e => e.tick===t && e.boats.includes(s.boat));
      const marker = t===s.offset ? 'head' : vessel.relief && t===(s.offset+board.period/2)%board.period ? 'relief' : '';
      return `<td class="${t===tick?'here':''} ${bad?'trouble':''} ${marker}" title="第 ${beat(t)} 拍 · ${s.marks[t] === '.' ? '独用水道' : navigates(s.marks[t]) ? markLabel(board,s.marks[t])+' 闸' : '停泊'}${bad ? ' · 调度冲突' : ''}">${markLabel(board,s.marks[t])}</td>`;
    }).join('');
    return `<tr style="--hull-ink:${hullInks[s.boat]}"><th scope="row"><i aria-hidden="true">${seal[s.boat]}</i>${vessel.name}</th>${cells}</tr>`;
  }).join('');
  return `<div class="tide-scroll"><table class="tide-clock"><caption>整圈占闸表 · 点击列首看这一拍</caption><thead><tr><th scope="col">船名</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function manifest(board: TideBoard, fleet: Sailing[]) {
  const closures = board.locks.filter(lock => board.closed[lock]).map(lock => {
    const times = Array.from({length: board.period}, (_,i)=>i).filter(i => board.closed[lock] & (1<<i));
    return `<li><b>${lock} 闸</b> · 第 ${times.map(beat).join('、')} 拍封航</li>`;
  }).join('');
  const receipts = board.handoffs.map(({from,to,min,max}) => {
    const wait = wrap(fleet[to].offset-fleet[from].finish,board.period);
    return `<li>${board.boats[from].name} → ${board.boats[to].name} · 卸货后 ${min===max ? '恰好 '+min : min+'–'+max} 拍接船 <b>${wait>=min&&wait<=max?'✓':'×'} 实际 ${wait}</b></li>`;
  }).join('');
  if (!closures && !receipts) return '';
  return `<div class="tide-manifest">${closures ? `<section><h3>潮位公报</h3><ul>${closures}</ul></section>` : ''}${receipts ? `<section><h3>货签 · 头班交接</h3><ul>${receipts}</ul></section>` : ''}</div>`;
}

function renderTide(index:number, values:number[], frame:number) {
  const board=TIDES[index], district=Math.floor(index/6), tick=wrap(frame,board.period);
  const {sailings,incidents}=inspectTide(board,values);
  const next = incidents.find(e=>e.tick>=tick) ?? incidents[0];
  const events = incidents.filter(e=>e.tick===tick);
  const controls = sailings.map(s => {
    const v=board.boats[s.boat], branch=Math.floor(s.value/board.period), other=v.routes[1-branch];
    const timing = v.fixed ? '<span class="tide-fixed">岸班固定</span>' :
      button('early-'+s.boat, '提前'+v.name+'一拍','−') + button('late-'+s.boat,'推迟'+v.name+'一拍','＋');
    return `<div class="tide-vessel" style="--hull-ink:${hullInks[s.boat]}"><div class="tide-vessel-name"><i>${seal[s.boat]}</i><b>${v.name}</b><small>${v.relief?'双班':'单班'} · 第 ${beat(s.offset)} 拍发</small></div><div class="tide-offset">${timing}</div><div class="tide-course"><span>${routeLabel(board,s.route)}</span>　${beat(s.finish)} 拍靠岸</div>${other ? button('branch-'+s.boat,'切换'+v.name+'航道，另一线 '+routeLabel(board,other),'换道 · '+routeLabel(board,other)) : ''}</div>`;
  }).join('');
  const reading=events.length ? events.map(e=>e.message).join(' ') : '这一拍各闸畅通。';
  return `<div class="tide-desk"><p class="tide-rule">${tideNotes[district]}</p>
    <section class="tide-waterfront"><figure>${harbor(board,sailings,incidents,tick,district)}<figcaption><span>第 <b>${beat(tick)}</b> 拍 / ${board.period}</span><span>本班货物 · ${board.cargo}</span></figcaption></figure>
    ${timetable(board,sailings,incidents,tick)}<p class="tide-legend">字母为闸口，· 为独用水道，— 为停泊。发船拍上方有刻线。${board.wide ? '箭头标记编队闸的航向。' : ''}</p>
    <div class="tide-report ${events.length?'tide-alert':''}"><span>${reading}</span>${next && tick!==next.tick ? clockButton(next.tick,'查第 '+beat(next.tick)+' 拍') : ''}</div>${manifest(board,sailings)}</section>
    <section class="tide-orders"><h3>调班 · 一圈 ${board.period} 拍</h3><p class="tide-foot">${incidents.length ? `整圈有 ${incidents.length} 处冲突。`:'全周期已核对，可以验收。'}</p><div class="tide-vessels">${controls}</div></section></div>`;

}

export const tideFamily: BoardFamily = {
  name: '潮汐调度', title: i=>TIDES[i].title, initial: i=>[...TIDES[i].start], valid: validTide,
  solved: (i,v)=>validTide(i,v) && inspectTide(TIDES[i],v).incidents.length===0,
  apply: (i,v,verb)=>adjustTide(TIDES[i],v,verb), hint: (i,v)=>tideHint(TIDES[i],v),
  frames:i=>TIDES[i].period, render:renderTide,
};
