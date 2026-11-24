import { echoPosition, type EchoTrack } from './echo';
import type { Level, Cell } from './levels';

export function occupancy(track: EchoTrack, plate: Cell, samples = 80): boolean[] {
  return Array.from({ length: samples }, (_, i) => {
    const p = echoPosition({ ...track, time: i / samples * track.duration });
    return Math.hypot(p.x - plate.x, p.y - plate.y) < .42;
  });
}
export function routeMap(level: Level, tracks: EchoTrack[], selected: number): string {
  const colors = ['#a7cbd6', '#d5bb8b'];
  const cell = (c: Cell, size: number, fill: string) => `<rect x="${c.x * 24 - size / 2}" y="${c.y * 24 - size / 2}" width="${size}" height="${size}" rx="2" fill="${fill}"/>`;
  return `<svg class="echo-route-map" viewBox="0 0 288 192" role="img" aria-label="回声平面路线图，虚线表示循环回到起点"><defs><pattern id="route-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#70877d" stroke-opacity=".16"/></pattern></defs><rect width="288" height="192" fill="#172122"/><rect x="12" y="12" width="264" height="168" fill="url(#route-grid)" stroke="#526c64"/>${level.walls.map(c => cell(c, 20, '#40504e')).join('')}${(level.plates ?? []).map(p => `${cell(p, 16, '#806642')}<text x="${p.x * 24}" y="${p.y * 24 + 3}" fill="#f0d7a0" text-anchor="middle" font-size="9">${p.id}</text>`).join('')}${tracks.map((track, i) => {
    const points = track.points.map(p => `${p.x * 24},${p.y * 24}`).join(' '), first = track.points[0], last = track.points.at(-1)!, p = echoPosition(track);
    return `<g opacity="${i === selected ? 1 : .3}" stroke="${colors[i % colors.length]}" fill="none"><polyline points="${points}" stroke-width="2" stroke-linecap="round"/><path d="M${last.x * 24} ${last.y * 24}L${first.x * 24} ${first.y * 24}" stroke-dasharray="3 4"/><circle cx="${first.x * 24}" cy="${first.y * 24}" r="4"/><circle cx="${p.x * 24}" cy="${p.y * 24}" r="3" fill="${colors[i % colors.length]}"/></g>`;
  }).join('')}</svg>`;
}
