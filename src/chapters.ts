import type { Level } from './levels';

export const CHAPTERS = [
  { start: 0, end: 7, title: '第一班 · 机房', short: '机房', note: '把危险变成能源', color: '#86402d' },
  { start: 7, end: 12, title: '第二班 · 中继站', short: '中继站', note: '让装置互相接班', color: '#65502b' },
  { start: 12, end: 16, title: '后记 · 回声花园', short: '回声花园', note: '把脚步留下', color: '#345f55' },
  { start: 16, end: 18, title: '附录 · 给下一班的练习', short: '练习单', note: '把等待写进时间表', color: '#425b75' },
  { start: 18, end: 22, title: '第三班 · 分光温室', short: '分光温室', note: '同一束光的两种回答', color: '#405e3c' },
] as const;
export const chapterFor = (level: number) => CHAPTERS.find(c => level >= c.start && level < c.end) ?? CHAPTERS[0];

/** Floor plan of the starting room, never a solution preview. */
export function roomPlan(level: Level): string {
  const square = (x: number, y: number, color: string, size = 8) => `<rect x="${x * 10 - size / 2}" y="${y * 10 - size / 2}" width="${size}" height="${size}" rx="1" fill="${color}"/>`;
  const hardware = [
    ...(level.plates ?? []).map(p => `<rect x="-3" y="-3" width="6" height="6" fill="none" stroke="#6f512e" transform="translate(${p.x * 10} ${p.y * 10}) rotate(${p.echoOnly ? 45 : 0})"/>`),
    ...(level.gates ?? []).map(g => `<path d="M-3 -3v6m3 -6v6m3 -6v6" transform="translate(${g.x * 10} ${g.y * 10})" stroke="#744735"/>`),
    ...(level.inverters ?? []).map(c => `<g fill="none" transform="translate(${c.x * 10} ${c.y * 10})"><path d="M0 -3l3 3 -3 3" stroke="#9d4928"/><path d="M0 -3l-3 3 3 3" stroke="#205775"/></g>`),
  ].join('');
  const source = level.source;
  return `<svg class="room-plan" viewBox="0 0 120 80" aria-hidden="true"><rect x="1" y="1" width="118" height="78" fill="#ddd9c8" stroke="#738181"/><path d="M4 6h112v68H4z" stroke="#a1aaa0" stroke-width=".65" fill="none"/><path d="M10 10h100m-100 20h100m-100 20h100m-100 20h100m-100-60v60m20-60v60m20-60v60m20-60v60m20-60v60m20-60v60" fill="none" stroke="#a0a79b" stroke-width=".6" stroke-dasharray="1.2 1.8"/>${level.walls.map(w => square(w.x, w.y, '#798685')).join('')}${hardware}${level.delay ? square(level.delay.x, level.delay.y, '#85602e', 5) : ''}${level.mirrors.map(m => {
    const x = m.x * 10, y = m.y * 10;
    return `<g stroke-width="1.5"><path d="M${x - 3} ${y + (m.slash ? 3 : -3)}l6 ${m.slash ? -6 : 6}" stroke="${m.kind ? '#9d4928' : '#263e4c'}"/>${m.kind ? `<path d="M${x - 3} ${y + (m.slash ? -3 : 3)}l6 ${m.slash ? 6 : -6}" stroke="#205775"/>` : ''}</g>`;
  }).join('')}${level.receivers.map(r => `<circle cx="${r.x * 10}" cy="${r.y * 10}" r="3" fill="none" stroke="${r.phase === 'cool' ? '#205775' : r.phase === 'warm' ? '#9d4928' : '#385c43'}" stroke-width="1.5"/>`).join('')}${(level.portals ?? []).flatMap(p => [p.a, p.b]).map(p => square(p.x, p.y, '#685576', 4)).join('')}${square(source.x, source.y, '#a33f30', 5)}<path d="M${source.x * 10} ${source.y * 10}l${source.dx * 6} ${source.dy * 6}" stroke="#a33f30" stroke-width="2"/>${square(level.exit.x, level.exit.y, '#385c43', 4)}</svg>`;
}
