import { validLoom } from './grid-loom';
import { validTide } from './tide-dispatch';
import type { ShiftDraft } from './storage';

export const TRADES = ['loom', 'tide', 'field'] as const;
export type Trade = typeof TRADES[number];
export const TRADE_NAME: Record<Trade, string> = { loom: '配线织盘', tide: '潮汐调度', field: '现场联检' };
export const DISTRICT_COUNT = 8, SECTORS_PER_DISTRICT = 6, SECTOR_COUNT = DISTRICT_COUNT * SECTORS_PER_DISTRICT;
export type JobKey = `${Trade}-${number}`;
export const jobKey = (trade: Trade, index: number): JobKey => `${trade}-${index}`;
export interface JobRecord { done: boolean; seconds: number; actions: number; hints: number; values?: number[] }
export interface CampaignProgress {
  selected: number; last?: JobKey;
  jobs: Partial<Record<JobKey, JobRecord>>;
  sites: Record<string, ShiftDraft>;
  returned: number[];
  mailSeconds: number;
}
export const freshCampaign = (): CampaignProgress => ({ selected: 0, jobs: {}, sites: {}, returned: [], mailSeconds: 0 });
export function jobOf(p: CampaignProgress, key: JobKey): JobRecord {
  return p.jobs[key] ??= { done: false, seconds: 0, actions: 0, hints: 0 };
}
export function readJob(key: unknown): { trade: Trade; index: number } | undefined {
  if (typeof key !== 'string') return;
  const found = /^(loom|tide|field)-(0|[1-9]\d?)$/.exec(key);
  if (found && Number(found[2]) < SECTOR_COUNT) return { trade: found[1] as Trade, index: Number(found[2]) };
}
export function restoredSectors(p: CampaignProgress, district: number) {
  let count = 0;
  for (let index = district * 6; index < (district + 1) * 6; index++) {
    if (TRADES.every(t => p.jobs[jobKey(t, index)]?.done)) count++;
  }
  return count;
}
// The river forks after the post office, and the bridge brings the banks together.
const FEEDS = [[], [0], [0], [1,2], [3], [3], [4,5], [6]];
export function districtOpen(p: CampaignProgress, district: number): boolean {
  return Number.isInteger(district) && district >= 0 && district < DISTRICT_COUNT
    && FEEDS[district].every(d => restoredSectors(p, d) >= 3 && districtOpen(p, d));
}
export const feedNames = (d: number): readonly number[] => FEEDS[d];
export const signedCount = (p: CampaignProgress) => Object.values(p.jobs).filter(j => j?.done).length;
export function canWork(p: CampaignProgress, trade: Trade, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= SECTOR_COUNT || !districtOpen(p, Math.floor(index / 6))) return false;
  return trade !== 'field' || index !== SECTOR_COUNT - 1 || signedCount(p) >= SECTOR_COUNT * TRADES.length - 1;
}
export function signJob(p: CampaignProgress, trade: Trade, index: number) {
  if (!canWork(p, trade, index)) return false;
  const j = jobOf(p, jobKey(trade, index));
  if (j.done) return false;
  j.done = true; delete j.values;
  if (trade === 'field') delete p.sites[index];
  return true;
}
export function countPlay(p: CampaignProgress, key: JobKey | 'mail', wallSeconds: number, idleSeconds: number, foreground: boolean) {
  if (!foreground || !(idleSeconds < 120 && wallSeconds > 0 && wallSeconds <= 2)) return;
  if (key === 'mail') { p.mailSeconds += wallSeconds; return; }
  const job = p.jobs[key];
  if (job && !job.done) job.seconds += wallSeconds;
}
export function playReport(p: CampaignProgress): string {
  const lines = ['task_id,district,sector,trade,first_clear,active_seconds,actions,hints'];
  for (let i = 0; i < SECTOR_COUNT; i++) for (const t of TRADES) {
    const k = jobKey(t, i), j = p.jobs[k];
    lines.push([k, Math.floor(i/6)+1, i%6+1, t, Number(j?.done ?? false), Math.round(j?.seconds ?? 0), j?.actions ?? 0, j?.hints ?? 0].join(','));
  }
  return lines.join('\n');
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const positive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(v, 1e9) : 0;
export function readCampaign(value: unknown, draftOK: (v: unknown, i: number) => v is ShiftDraft, strict = false) {
  const state = freshCampaign();
  if (value === undefined) return state;
  const invalid = () => { if (strict) throw Error('战役进度数据损坏'); };
  if (!object(value) || !object(value.jobs) || !object(value.sites)) { invalid(); return state; }
  state.mailSeconds = positive(value.mailSeconds);
  for (const [key, raw] of Object.entries(value.jobs)) {
    const spec = readJob(key);
    if (!spec || !object(raw) || typeof raw.done !== 'boolean') { invalid(); continue; }
    const record: JobRecord = { done: raw.done, seconds: positive(raw.seconds), actions: Math.floor(positive(raw.actions)), hints: Math.floor(positive(raw.hints)) };
    if (!raw.done && raw.values !== undefined) {
      const validate = spec.trade === 'loom' ? validLoom : spec.trade === 'tide' ? validTide : undefined;
      if (validate && validate(spec.index, raw.values)) record.values = [...raw.values]; else invalid();
    }
    state.jobs[jobKey(spec.trade,spec.index)] = record;
  }
  for (const [key, draft] of Object.entries(value.sites)) {
    const spec = readJob('field-' + key);
    if (!spec || !draftOK(draft, spec.index)) { invalid(); continue; }
    if (!state.jobs[jobKey('field',spec.index)]?.done) state.sites[spec.index] = { snapshot: draft.snapshot, hintCount: Math.min(3, Math.floor(positive(draft.hintCount))) };
  }
  if (typeof value.selected === 'number' && districtOpen(state, value.selected)) state.selected = value.selected;
  const last = readJob(value.last);
  if (last && canWork(state, last.trade, last.index)) state.last = jobKey(last.trade,last.index);
  return state;
}
