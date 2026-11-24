import './lens-panel.css';
import type { Simulation, OpticalRoute } from './engine';
import type { Cell, Mirror, Phase, Receiver } from './levels';
import { LensPreview, opticalStrokes, type LensReading, type LensTrial } from './lens-preview';

const pitch = 20;
const colors = { warm: '#ffc083', cool: '#9bdeeb' } as const;
const endings: Record<OpticalRoute['end'], string> = { loop: '形成回路', wall: '碰墙', gate: '光闸截停', edge: '离开机房', limit: '达到追踪上限' };
const coord = (n: number) => n * pitch;
const at = (c: Cell) => `translate(${coord(c.x)} ${coord(c.y)})`;
const safe = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const direction = (d: Cell) => d.x > 0 ? '右' : d.x < 0 ? '左' : d.y > 0 ? '下' : '上';
const angle = (d: Cell) => Math.atan2(d.y, d.x) * 180 / Math.PI;

function mirrorGlyph(mirror: Mirror, index: number, selected: number, rotated: boolean) {
  const picked = index >= 0 && index === selected;
  const y = (picked && rotated ? !mirror.slash : mirror.slash) ? 5 : -5;
  const slash = (rise: number, color: string) => `<path d="M-5 ${rise}L5 ${-rise}" stroke="${color}" stroke-width="2.4"/>`;
  const edges = slash(y, mirror.kind ? colors.warm : '#e5e2d2') + (mirror.kind ? slash(-y, colors.cool) : '');
  const label = index < 0 ? '' : `<circle cx="7" cy="-7" r="4.2" fill="#202827"/><text x="7" y="-4.6" text-anchor="middle" fill="#f4dfb0" font-size="7.3">${index + 1}</text>`;
  const pick = index < 0 ? '' : `class="lens-pick" data-action="lens-mirror-${index}"`;
  return `<g transform="${at(mirror)}" ${pick}>${index < 0 ? '' : '<rect x="-10" y="-10" width="20" height="20" fill="transparent"/>'}<rect x="-6.8" y="-6.8" width="13.6" height="13.6" rx="${mirror.fixed ? 1 : 3}" fill="#24353d" stroke="${picked ? '#fff1bf' : '#648078'}" stroke-width="${picked ? '1.8' : '.8'}"/>${edges}${label}</g>`;
}

function map(bench: LensPreview, reading: LensReading, selected: number, rotated: boolean, turn?: LensTrial['turn']) {
  const level = bench.level, marker = rotated ? 'trial' : 'base';
  const width = coord(level.width - 1), height = coord(level.height - 1);
  const stroke = opticalStrokes(reading.route).map(run => `<polyline points="${run.points.map(p => `${coord(p.x)},${coord(p.y)}`).join(' ')}" fill="none" stroke="${colors[run.phase]}" stroke-width="${run.phase === 'cool' ? '3' : '2.4'}" ${run.phase === 'cool' ? 'stroke-dasharray="4 3"' : ''} stroke-linejoin="round"/>`).join('');
  const solids = level.walls.map(w => `<rect transform="${at(w)}" x="-9" y="-9" width="18" height="18" fill="#435057" stroke="#79878b"/>`).join('');
  const gates = (level.gates ?? []).map((g, i) => `<path transform="${at(g)}" d="${bench.gates[i] ? 'M-6 -4v8m12 -8v8' : 'M-6 -6l12 12m-12 0l12 -12'}" stroke="${bench.gates[i] ? '#adc2a6' : '#d6a7a0'}" stroke-width="2.4"/>`).join('');
  const plates = (level.plates ?? []).map((p, i) => `<g transform="${at(p)}"><rect x="-6" y="-5" width="12" height="10" rx="2" stroke="#bbaf88" fill="${bench.plates[i] ? '#727252' : '#322f2a'}"/><text text-anchor="middle" y="2.6" font-size="7" fill="#f1e6c6">${safe(p.id)}</text></g>`).join('');
  const wells = (level.portals ?? []).flatMap(p => [p.a, p.b].map(c => `<g transform="${at(c)}"><circle r="6" stroke="#c9a9d4" stroke-width="1.5" fill="#353039"/><text y="2.6" text-anchor="middle" font-size="8" fill="#f1dfeb">${safe(p.id)}</text></g>`)).join('');
  const inverters = (level.inverters ?? []).map(c => `<g transform="${at(c)}"><path d="M0 -6l5 6 -5 6" fill="none" stroke="${colors.cool}" stroke-width="1.8"/><path d="M0 -6l-5 6 5 6" fill="none" stroke="${colors.warm}" stroke-width="1.8"/></g>`).join('');
  const receiverGlyphs = level.receivers.map((r, i) => {
    const reached = reading.arrivals[r.id].some(phase => !r.phase || phase === r.phase);
    return `<g transform="${at(r)}"><circle r="6.5" fill="${reached ? '#34534f' : '#23333c'}" stroke="${reached ? '#cdf1cf' : '#9db2a8'}" stroke-width="1.5"/><text y="2.9" text-anchor="middle" font-size="8" fill="#eef3dc">${i + 1}</text></g>`;
  }).join('');
  const source = `<g transform="${at(level.source)} rotate(${angle({ x: level.source.dx, y: level.source.dy })})"><circle r="6" fill="#e8d4a0"/><path d="M-2 -3l5 3 -5 3z" fill="#3a382d"/></g>`;
  const mirrors = bench.mirrors.map(m => mirrorGlyph(m, bench.choices.findIndex(v => v.id === m.id), selected, rotated)).join('');
  const last = reading.route.points.at(-1)!;
  const stop = ['wall', 'gate', 'edge'].includes(reading.route.end) ? `<path transform="${at(last)}" d="M-3 -3l6 6m0 -6l-6 6" stroke="#fae4ce" stroke-width="1.7"/>` : '';
  const arrow = turn ? `<path transform="${at(turn.at)} rotate(${angle(rotated ? turn.after : turn.before)})" d="M9 -3l4 3 -4 3" stroke="#ffffde" fill="none" stroke-width="1.7"/>` : '';
  return `<svg viewBox="-5 -5 ${width + 10} ${height + 10}" role="img" aria-label="${rotated ? '试转' : '当前'}光路，${endings[reading.route.end]}"><defs><pattern id="lens-grid-${marker}" x="10" y="10" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#20303a"/><path d="M0 20V0H20" fill="none" stroke="#485b63" stroke-width="1"/></pattern></defs><rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="2" fill="url(#lens-grid-${marker})" stroke="#8d9b96"/>${solids}${plates}${stroke}${gates}${inverters}${wells}${source}${receiverGlyphs}${mirrors}${arrow}${stop}</svg>`;
}

function arrival(r: Receiver, phases: Phase[]) {
  if (!phases.length) return '<span class="lens-absent">未到达</span>';
  return phases.map(p => `<span class="lens-arrival" data-phase="${p}">${p === 'warm' ? '暖光' : '冷光'}${r.phase && r.phase !== p ? '拒收' : '抵达'}</span>`).join(' ');
}

export class LensPanel {
  private readonly bench: LensPreview;
  private index: number;
  constructor(sim: Simulation) { this.bench = new LensPreview(sim); this.index = this.bench.nearestIndex; }
  select(index: number) { if (Number.isInteger(index) && this.bench.choices[index]) this.index = index; }
  cycle(step: number) {
    const n = this.bench.choices.length;
    if (n) this.select(((this.index + step) % n + n) % n);
  }
  markup(): string {
    const b = this.bench, mirror = b.choices[this.index], trial = b.turn(this.index);
    const chips = b.choices.map((m, i) => `<button type="button" data-action="lens-mirror-${i}" aria-pressed="${i === this.index}" aria-label="试转第 ${i + 1} 面${m.kind ? '双色棱镜' : '反射器'}，位置 ${m.x}, ${m.y}"><strong>${i + 1}</strong><span>${m.kind ? '棱镜' : '镜'} (${m.x}, ${m.y})</span></button>`).join('');
    const choice = chips ? `<div class="lens-choices" role="group" aria-label="选择试转的镜面">${chips}</div>` : '';
    const summary = !mirror ? (b.carrying ? '手中的镜面尚未放下，场内只有固定装置。' : '场内只有固定装置，可查看当前光路。') : trial?.turn ? `第 ${this.index + 1} 面${mirror.kind ? '棱镜' : '镜'}第一次接到光时，原本向${direction(trial.turn.before)}反射。旋转后，光向${direction(trial.turn.after)}走。` : `从来源发出的光经过别处，第 ${this.index + 1} 面镜的位置在这条光路之外。`;
    const sheet = (name: string, reading: LensReading, rotated: boolean) => `<figure><figcaption><strong>${name}</strong><span>${endings[reading.route.end]}</span></figcaption>${map(b, reading, this.index, rotated, trial?.turn)}</figure>`;
    const rows = b.level.receivers.map((r, i) => `<tr><th scope="row"><span class="lens-ring-number">${i + 1}</span>${safe(r.name)}</th><td>${arrival(r, b.original.arrivals[r.id])}</td>${trial ? `<td>${arrival(r, trial.reading.arrivals[r.id])}</td>` : ''}</tr>`).join('');
    return `<div class="lens-panel"><p class="lens-caption">选一面镜，对照试转前后的光路。两图都从暖光源出发，采用此刻的闸门状态。</p>${choice}<div class="lens-instrument"><div class="lens-sheets ${trial ? '' : 'lens-single'}">${sheet('当前布局', b.original, false)}${trial ? sheet(`试转第 ${this.index + 1} 面`, trial.reading, true) : ''}</div><div class="lens-legend"><span>暖光</span><span>冷光</span></div></div><p class="lens-finding" aria-live="polite">${summary}</p><table><caption>接收环沿途读数</caption><thead><tr><th scope="col">接收环</th><th scope="col">当前</th>${trial ? '<th scope="col">试转后</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
}
