import { TIDE_SCORES } from './tide-charts';
import { TIDE_ORDERS } from './tide-orders';

export interface Boat { name: string; routes: string[]; relief: boolean; fixed: boolean }
export interface Handoff { from: number; to: number; min: number; max: number }
export interface TideBoard {
  title: string; cargo: string; period: number; wide: string; boats: Boat[]; locks: string[];
  closed: Record<string, number>; handoffs: Handoff[]; start: number[];
}
export interface Sailing {
  boat: number; value: number; offset: number; route: string; finish: number;
  marks: string[]; withFlow: number[]; againstFlow: number[];
}
export interface TideIncident { kind: 'tide' | 'traffic' | 'freight'; tick: number; boats: number[]; lock?: string; message: string }
export type TideOrder = readonly [start: readonly number[], closures: string, transfers: readonly (readonly [number, number, number, number])[]];

const boatNames = ['桐叶','灰鹭','青螺','石榴','白露','芦花'];
export const wrap = (n: number, period: number) => ((n % period) + period) % period;
export const beat = (tick: number) => String(tick + 1).padStart(2, '0');
export function makeTide(index: number, order?: TideOrder): TideBoard {
  const [title,cargo,period,wide,courses] = TIDE_SCORES[index];
  const boats = courses.split(' ').map((text, i) => ({
    name: boatNames[i], routes: text.replace('+','').split('/'), relief: text.startsWith('+'), fixed: i === 0 && index < 18,
  }));
  const locks = [...new Set(courses.toUpperCase().match(/[A-D]/g))].sort();
  const board: TideBoard = { title,cargo,period,wide,boats,locks, closed: {}, handoffs: [], start: boats.map(() => 0) };
  if (order) {
    board.start = [...order[0]];
    for (const closure of order[1].split(' ').filter(Boolean)) {
      const lock = closure[0], tick = Number(closure.slice(1));
      board.closed[lock] = (board.closed[lock] ?? 0) | (1 << tick);
    }
    board.handoffs = order[2].map(([from,to,min,max]) => ({from,to,min,max}));
  }
  return board;
}

export const TIDES = TIDE_SCORES.map((_, i) => makeTide(i, TIDE_ORDERS[i]));
export function validTide(index: number, values: unknown): values is number[] {
  const board = TIDES[index];
  return !!board && Array.isArray(values) && values.length === board.boats.length &&
    Array.from(values).every((v,i) => Number.isSafeInteger(v) && v >= 0 && v < board.period * board.boats[i].routes.length && (!board.boats[i].fixed || v === 0));
}

export function sail(board: TideBoard, boat: number, value: number): Sailing {
  const vessel = board.boats[boat], offset = value % board.period;
  const route = vessel.routes[Math.floor(value / board.period)];
  const result: Sailing = { boat, value, offset, route, finish: (offset + route.length) % board.period,
    marks: Array(board.period).fill(''), withFlow: [0,0,0,0], againstFlow: [0,0,0,0] };
  for (const launch of vessel.relief ? [offset, offset + board.period / 2] : [offset]) {
    [...route].forEach((mark, step) => {
      const tick = (launch + step) % board.period;
      result.marks[tick] = mark;
      if (mark === '.') return;
      const lock = mark.toUpperCase(), masks = mark === lock ? result.withFlow : result.againstFlow;
      masks[lock.charCodeAt(0) - 65] |= 1 << tick;
    });
  }
  return result;
}

function blockedMask(board: TideBoard, s: Sailing, lock: string) {
  const n = lock.charCodeAt(0) - 65;
  return (s.withFlow[n] | s.againstFlow[n]) & (board.closed[lock] ?? 0);
}
function trafficMask(board: TideBoard, a: Sailing, b: Sailing, lock: string) {
  const n = lock.charCodeAt(0) - 65;
  if (board.wide.includes(lock)) return (a.withFlow[n] & b.againstFlow[n]) | (a.againstFlow[n] & b.withFlow[n]);
  return (a.withFlow[n] | a.againstFlow[n]) & (b.withFlow[n] | b.againstFlow[n]);
}
const handoffWait = (board: TideBoard, sender: Sailing, receiver: Sailing) => wrap(receiver.offset - sender.finish, board.period);
const fitsHandoff = (wait: number, h: Handoff) => wait >= h.min && wait <= h.max;
function compatible(board: TideBoard, a: Sailing, b: Sailing) {
  if (board.locks.some(lock => trafficMask(board,a,b,lock))) return false;
  return board.handoffs.every(h => {
    if (h.from === a.boat && h.to === b.boat) return fitsHandoff(handoffWait(board,a,b),h);
    if (h.from === b.boat && h.to === a.boat) return fitsHandoff(handoffWait(board,b,a),h);
    return true;
  });
}

export function inspectTide(board: TideBoard, values: number[]) {
  const sailings = values.map((v, i) => sail(board,i,v));
  const incidents: TideIncident[] = [];
  const addBeats = (mask: number, problem: Omit<TideIncident, 'tick'>) => {
    for (let tick = 0; mask; tick++, mask >>>= 1) if (mask & 1) incidents.push({...problem, tick});
  };
  for (const s of sailings) {
    const name = board.boats[s.boat].name;
    for (const lock of board.locks) {
      addBeats(blockedMask(board,s,lock), {kind:'tide', boats:[s.boat], lock, message:`${name}遇到封航的 ${lock} 闸。`});
      for (const b of sailings.slice(0,s.boat)) {
        addBeats(trafficMask(board,s,b,lock), {kind:'traffic', boats:[b.boat,s.boat], lock,
          message:`${board.boats[b.boat].name}与${name}${board.wide.includes(lock) ? '对向驶入' : '争用'} ${lock} 闸。`});
      }
    }
  }
  for (const h of board.handoffs) {
    const from = sailings[h.from], to = sailings[h.to], wait = handoffWait(board, from, to);
    if (!fitsHandoff(wait,h)) incidents.push({kind:'freight', tick:to.offset, boats:[h.from,h.to],
      message:`${board.boats[h.from].name}卸货后，货物等了 ${wait} 拍才上${board.boats[h.to].name}，要求 ${h.min}–${h.max} 拍。`});
  }
  return { sailings, incidents: incidents.sort((a,b) => a.tick - b.tick) };
}
export function sailingCost(board: TideBoard, a: number, b: number) {
  const d = Math.abs(a % board.period - b % board.period);
  return Math.min(d, board.period - d) + Number(Math.floor(a / board.period) !== Math.floor(b / board.period));
}
export function adjustTide(board: TideBoard, values: number[], verb: string) {
  const m = /^(early|late|branch)-(\d+)$/.exec(verb);
  if (!m) return values;
  const index = Number(m[2]), vessel = board.boats[index];
  if (!vessel || vessel.fixed || m[1] === 'branch' && vessel.routes.length < 2) return values;
  const result = [...values], phase = values[index] % board.period, branch = Math.floor(values[index] / board.period);
  result[index] = m[1] === 'branch' ? ((branch + 1) % vessel.routes.length) * board.period + phase :
    branch * board.period + wrap(phase + (m[1] === 'early' ? -1 : 1), board.period);
  return result;
}

/** A finite CSP. Discard sailings during low water, then propagate pairwise lock reservations
 * and manifest windows after each choice. A cost bound finds the closest legal edit sequence. */
export function solveTide(board: TideBoard, values: number[], firstOnly = false) {
  const domains = board.boats.map((vessel,i) => Array.from({length: vessel.fixed ? 1 : vessel.routes.length * board.period}, (_,v) => sail(board,i,v))
    .filter(s => board.locks.every(lock => !blockedMask(board,s,lock)))
    .sort((a,b) => sailingCost(board,values[i],a.value) - sailingCost(board,values[i],b.value)));
  let best: number[] | undefined, bestCost = Infinity, nodes = 0;
  const selected = new Array<number>(domains.length).fill(-1);
  function visit(active: Sailing[][], cost: number) {
    if (cost >= bestCost || firstOnly && best) return;
    nodes++;
    let pick = -1, minimum = cost;
    for (let i = 0; i < active.length; i++) if (selected[i] < 0) {
      const options = active[i];
      if (!options.length) return;
      minimum += sailingCost(board,values[i],options[0].value);
      if (pick === -1 || options.length < active[pick].length) pick = i;
    }
    if (minimum >= bestCost) return;
    if (pick < 0) { best = [...selected]; bestCost = cost; return; }
    for (const choice of active[pick]) {
      selected[pick] = choice.value;
      const next = active.map((list,i) => selected[i] >= 0 ? list : list.filter(other => compatible(board,choice,other)));
      visit(next, cost + sailingCost(board,values[pick],choice.value)); selected[pick] = -1;
      if (firstOnly && best) break;
    }
  }
  visit(domains,0); return { solution: best, cost: bestCost, nodes };
}

export function tideHint(board: TideBoard, values: number[]) {
  const {solution} = solveTide(board, values);
  if (!solution) return '航图没有可行班表。';
  const i = solution.findIndex((v,i) => v !== values[i]);
  if (i < 0) return '这一圈可以交付。';
  const name = board.boats[i].name;
  if (Math.floor(solution[i] / board.period) !== Math.floor(values[i] / board.period)) return `先给「${name}」换一条航道，再看它占用哪些闸口。`;
  const forward = wrap(solution[i] - values[i],board.period);
  return `先把「${name}」${forward <= board.period / 2 ? '推迟' : '提前'}一拍，给交错的船留出位置。`;
}
