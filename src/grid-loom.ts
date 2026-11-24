import { loomCatalog } from './loom-catalog';

export interface LoomPoint { at: number; lane: number }
export type LoomContact = LoomPoint & (
  | { kind: 'feed' | 'isolate'; wire: number }
  | { kind: 'match'; other: LoomPoint }
);
export interface LoomBoard {
  title: string;
  lanes: number;
  /** Three detents per drum. Bit i exchanges adjacent lanes i and i+1. */
  drums: number[][];
  links: { from: number; to: number; step: number }[];
  clutches: { drum: number; lane: number; wire: number }[];
  contacts: LoomContact[];
  opening: number[];
}
export const looms: readonly LoomBoard[] = loomCatalog;
export const drumName = (i: number) => String.fromCharCode(65 + i);
export const wireNames = ['钟', '泉', '炉', '叶', '星'];
export const wireMarks = ['●', '◆', '▲', '⬢', '✦'];

export function validLoom(index: number, values: unknown): values is number[] {
  const board = looms[index];
  return !!board && Array.isArray(values) && values.length === board.drums.length
    && board.drums.every((_, i) => Number.isInteger(values[i]) && values[i] >= 0 && values[i] < 3);
}

/** stages[k] is the row of labelled wires immediately after k drums. */
export function loomPath(board: LoomBoard, values: number[]): number[][] {
  const stages = [Array.from({ length: board.lanes }, (_, i) => i)];
  board.drums.forEach((drum, i) => {
    const row = [...stages[i]], switches = drum[values[i]];
    for (let lane = 0; lane < row.length - 1; lane++) {
      if (switches & (1 << lane)) [row[lane], row[lane + 1]] = [row[lane + 1], row[lane]];
    }
    stages.push(row);
  });
  return stages;
}
export function canTurn(board: LoomBoard, drum: number, stages: number[][]): boolean {
  const clutch = board.clutches.find(c => c.drum === drum);
  return !clutch || stages[drum][clutch.lane] === clutch.wire;
}
export function contactFits(contact: LoomContact, stages: number[][]): boolean {
  const here = stages[contact.at][contact.lane];
  if (contact.kind === 'match') return here === stages[contact.other.at][contact.other.lane];
  return contact.kind === 'feed' ? here === contact.wire : here !== contact.wire;
}
export function loomSolved(board: LoomBoard, values: number[]): boolean {
  const stages = loomPath(board, values);
  return board.contacts.every(c => contactFits(c, stages));
}
function rotated(board: LoomBoard, values: number[], drum: number, direction: number): number[] {
  const result = [...values];
  result[drum] = (result[drum] + direction + 3) % 3;
  for (const link of board.links) if (link.from === drum) {
    result[link.to] = (result[link.to] + link.step * direction + 3) % 3;
  }
  return result;
}
export function turnLoom(board: LoomBoard, values: number[], drum: number): number[] {
  if (!Number.isInteger(drum) || drum < 0 || drum >= board.drums.length || !canTurn(board, drum, loomPath(board, values))) return values;
  return rotated(board, values, drum, 1);
}

export const packLoom = (values: number[]) => values.reduceRight((code, n) => 3 * code + n, 0);
export function unpackLoom(code: number, count: number): number[] {
  return Array.from({ length: count }, () => { const value = code % 3; code = Math.floor(code / 3); return value; });
}
export interface LoomSearch { distance: Int16Array; next: Int8Array; solutions: number }
/** Reverse multi-source BFS gives the shortest next legal turn to ANY acceptable installation.
 * A clutch samples upstream of its drum. Both the drum and all its followers are downstream
 * of that sample, so it has the same reading at either end of a legal turn. */
export function searchLoom(board: LoomBoard): LoomSearch {
  const count = 3 ** board.drums.length;
  const distance = new Int16Array(count).fill(-1), next = new Int8Array(count).fill(-1);
  const queue = new Int32Array(count), open = new Uint16Array(count);
  let head = 0, tail = 0;
  for (let code = 0; code < count; code++) {
    const values = unpackLoom(code, board.drums.length), stages = loomPath(board, values);
    for (let i = 0; i < values.length; i++) if (canTurn(board, i, stages)) open[code] |= 1 << i;
    if (board.contacts.every(contact => contactFits(contact, stages))) {
      distance[code] = 0; queue[tail++] = code;
    }
  }
  const solutions = tail;
  while (head < tail) {
    const code = queue[head++], values = unpackLoom(code, board.drums.length);
    for (let i = 0; i < values.length; i++) {
      if (!(open[code] & (1 << i))) continue;
      const previous = packLoom(rotated(board, values, i, -1));
      if (distance[previous] >= 0) continue;
      distance[previous] = distance[code] + 1; next[previous] = i; queue[tail++] = previous;
    }
  }
  return { distance, next, solutions };
}
let cached: { index: number; result: LoomSearch } | undefined;
export function nextLoomTurn(index: number, values: number[]): number {
  if (cached?.index !== index) cached = { index, result: searchLoom(looms[index]) };
  return cached.result.next[packLoom(values)];
}
