import { TRAM_BASE, TRAM_STOPS, tramStopById } from './last-tram';
import { defaultPreferences, readPreferences, type Preferences } from './preferences';
import { validEcho, validCapture } from './echo';
import { normalizeSeen } from './story';
import type { Snapshot } from './engine';
import { LEVELS, type Level } from './levels';
import { fieldById, FIELD_BASE } from './field-service';
import { freshCampaign, readCampaign, type CampaignProgress } from './campaign-progress';
import { defaultAppearance, normalizeAppearance, type Appearance } from './appearance';
import { hasMailEvidence } from './return-mail';
import { normalizeMastery } from './mastery';
import { REPAIRS } from './repairs';
export interface RecordEntry { stars: number; seconds: number; hits: number; moves: number }
export interface ShiftDraft { snapshot: Snapshot; hintCount: number }
export interface ManualSave extends ShiftDraft { savedAt: string; appearance: Appearance; repairId?: string }
export interface SaveData {
  version: 1; unlocked: number; records: Record<string, RecordEntry>;
  mastery: Record<string, string[]>;
  campaign: CampaignProgress;
  tram: { completed: number; draft?: ShiftDraft };
  repairBest: Record<string, number>;
  repairDrafts: Record<string, ShiftDraft>;
  checkpoint?: Snapshot; hintCount?: number;
  slots: (ManualSave | null)[];
  appearance: Appearance;
  story: { seen: string[] };
  settings: Preferences;
}
export const STORAGE_KEY = 'borrowed-fire.save.v1';
export function saveShiftDraft(data: SaveData, draft: ShiftDraft, repairId?: string) {
  const stop = tramStopById(draft.snapshot.level);
  if (stop) {
    if (draft.snapshot.level === TRAM_BASE + data.tram.completed) data.tram.draft = draft;
    return;
  }
  if (repairId) data.repairDrafts[repairId] = draft;
  else { data.checkpoint = draft.snapshot; data.hintCount = draft.hintCount; }
}
export function signRepair(data: SaveData, repairId: string, moves: number): number {
  delete data.repairDrafts[repairId];
  const best = Math.min(data.repairBest[repairId] ?? moves, moves);
  data.repairBest[repairId] = best;
  return best;
}
export const defaults = (): SaveData => ({ version: 1, unlocked: 0, records: {}, mastery: {}, campaign: freshCampaign(), tram: {completed:0}, repairBest: {}, repairDrafts: {}, slots: [null, null, null], appearance: defaultAppearance(), story: { seen: [] }, settings: defaultPreferences() });
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const cell = (v: unknown) => obj(v) && finite(v.x) && finite(v.y) && v.x >= 0 && v.x <= 12 && v.y >= 0 && v.y <= 8;
export function validSnapshot(v: unknown): v is Snapshot {
  if (!obj(v) || v.version !== 1 || !Number.isInteger(v.level) || Number(v.level) < 0 || Number(v.level) >= LEVELS.length) return false;
  return matchesLevel(v, LEVELS[Number(v.level)]);
}
function validFieldSnapshot(v: unknown): v is Snapshot {
  if (!obj(v) || v.version !== 1 || typeof v.level !== 'number' || !Number.isInteger(v.level)) return false;
  const level = fieldById(v.level);
  if (!level || v.carried !== null || !Array.isArray(v.mirrors) || !matchesLevel(v, level)) return false;
  return v.mirrors.every((m,i) => obj(m) && m.id === level.mirrors[i].id && m.x === level.mirrors[i].x && m.y === level.mirrors[i].y && (!m.fixed || m.slash === level.mirrors[i].slash));
}
function fieldDraftOK(value: unknown, index: number): value is ShiftDraft {
  return obj(value) && validFieldSnapshot(value.snapshot) && value.snapshot.level === FIELD_BASE + index;
}
function readProgress(raw: unknown, strict = false): CampaignProgress {
  const p = readCampaign(raw, fieldDraftOK, strict);
  if (!obj(raw) || raw.returned === undefined) return p;
  const reject = () => { if (strict) throw Error('战役退信记录损坏'); };
  if (!Array.isArray(raw.returned)) { reject(); return p; }
  for (const i of raw.returned) {
    if (!Number.isInteger(i) || !hasMailEvidence(p, i)) reject();
    else if (!p.returned.includes(i)) p.returned.push(i);
  }
  return p;
}
function validTramSnapshot(v: unknown): v is Snapshot {
  if (!obj(v) || v.version !== 1 || typeof v.level !== 'number') return false;
  const stop = tramStopById(v.level);
  if (!stop || !matchesLevel(v, stop.level)) return false;
  const snap = v as unknown as Snapshot;
  return stop.level.mirrors.filter(m => m.fixed).every(m =>
    snap.mirrors.some(saved => saved.id === m.id && saved.x === m.x && saved.y === m.y && saved.slash === m.slash));
}
function readTram(raw: unknown, strict = false): SaveData['tram'] {
  const out: SaveData['tram'] = {completed:0};
  if (raw === undefined) return out;
  if (!obj(raw) || !finite(raw.completed) || !Number.isInteger(raw.completed) || raw.completed < 0 || raw.completed > TRAM_STOPS.length) {
    if (strict) throw Error('末班车车票损坏');
    return out;
  }
  out.completed = raw.completed;
  if (raw.draft !== undefined) {
    const d = raw.draft;
    if (obj(d) && validTramSnapshot(d.snapshot) && d.snapshot.level === TRAM_BASE + out.completed) {
      out.draft = {snapshot:d.snapshot, hintCount:clampHints(d.hintCount)};
    } else if (strict) throw Error('末班车车票损坏');
  }
  return out;
}
function slotSnapshot(v: unknown, completedStops: number): v is Snapshot {
  return validSnapshot(v) || validFieldSnapshot(v) || (validTramSnapshot(v) && v.level <= TRAM_BASE + completedStops);
}
function matchesLevel(v: Record<string, unknown>, level: Level): boolean {
  if (v.stats !== undefined) {
    const s = v.stats;
    if (!obj(s) || !['emitted', 'rejected', 'lost', 'peakEchoes', 'stableSeconds'].every(k => finite(s[k]) && Number(s[k]) >= 0)
      || !Array.isArray(s.reflected) || s.reflected.length > level.mirrors.length || new Set(s.reflected).size !== s.reflected.length
      || !s.reflected.every(id => level.mirrors.some(m => m.id === id))) return false;
  }
  if (v.echoes !== undefined && (!Array.isArray(v.echoes) || v.echoes.length > (level.echoLimit ?? 0) || !v.echoes.every(validEcho))) return false;
  if (v.recording !== undefined && v.recording !== null && (!level.echoLimit || !validCapture(v.recording) || Array.isArray(v.echoes) && v.echoes.length >= level.echoLimit)) return false;
  if (!cell(v.player)) return false;
  if (!obj(v.facing) || ![-1, 0, 1].includes(Number(v.facing.x)) || ![-1, 0, 1].includes(Number(v.facing.y)) || Math.abs(Number(v.facing.x)) + Math.abs(Number(v.facing.y)) !== 1) return false;
  if (!Array.isArray(v.mirrors) || !Array.isArray(v.pulses) || v.pulses.length > 1 || !obj(v.receivers) || typeof v.sourceOn !== 'boolean') return false;
  const mirrors = [...v.mirrors, ...(v.carried === null ? [] : [v.carried])];
  if (mirrors.length !== level.mirrors.length || new Set(mirrors.map(m => obj(m) ? m.id : null)).size !== mirrors.length) return false;
  if (!mirrors.every(m => obj(m) && cell(m) && typeof m.slash === 'boolean' && level.mirrors.some(original => original.id === m.id && !!original.fixed === !!m.fixed && original.kind === m.kind))) return false;
  if (!v.pulses.every(p => obj(p) && cell(p) && finite(p.id) && finite(p.dx) && finite(p.dy) && Math.abs(p.dx) + Math.abs(p.dy) === 1 && finite(p.wait) && finite(p.age) && typeof p.last === 'string' && (p.phase === undefined || p.phase === 'warm' || p.phase === 'cool'))) return false;
  if (!level.receivers.every(r => { const s = (v.receivers as Record<string, unknown>)[r.id]; return obj(s) && finite(s.charge) && s.charge >= 0 && s.charge <= r.ttl && finite(s.hits) && finite(s.lastPulse); })) return false;
  return ['elapsed', 'hits', 'moves', 'nextPulse', 'spawnTimer'].every(k => finite(v[k])) && Number(v.elapsed) >= 0 && Number(v.hits) >= 0 && Number(v.moves) >= 0;
}
const clampHints = (v: unknown) => finite(v) ? Math.max(0, Math.min(3, Math.floor(v))) : 0;
function validSlotMode(id: unknown, snapshot: Snapshot): boolean {
  return id === undefined || REPAIRS.some(order => order.id === id && order.level === snapshot.level);
}
function validRepairDraft(v: unknown, level: number): v is ShiftDraft {
  return obj(v) && validSnapshot(v.snapshot) && v.snapshot.level === level;
}
export function parseSave(raw: string | null): SaveData {
  const result = defaults(); if (!raw) return result;
  try {
    const v: unknown = JSON.parse(raw); if (!obj(v) || v.version !== 1) return result;
    if (finite(v.unlocked)) result.unlocked = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(v.unlocked)));
    result.settings = readPreferences(v.settings);
    if (obj(v.story)) result.story.seen = normalizeSeen(v.story.seen);
    result.campaign = readProgress(v.campaign);
    result.tram = readTram(v.tram);
    result.mastery = normalizeMastery(v.mastery, LEVELS);
    for (const order of REPAIRS) {
      const best = obj(v.repairBest) ? v.repairBest[order.id] : undefined;
      if (finite(best) && Number.isSafeInteger(best) && best >= 0) result.repairBest[order.id] = best;
      const draft = obj(v.repairDrafts) ? v.repairDrafts[order.id] : undefined;
      if (validRepairDraft(draft, order.level)) result.repairDrafts[order.id] = { snapshot: draft.snapshot, hintCount: clampHints(draft.hintCount) };
    }
    result.appearance = normalizeAppearance(v.appearance);
    if (Array.isArray(v.slots)) result.slots = [0, 1, 2].map(i => {
      const slot: unknown = (v.slots as unknown[])[i];
      return obj(slot) && slotSnapshot(slot.snapshot, result.tram.completed) && validSlotMode(slot.repairId, slot.snapshot) && typeof slot.savedAt === 'string' && Number.isFinite(Date.parse(slot.savedAt))
        ? { snapshot: slot.snapshot, savedAt: slot.savedAt, hintCount: clampHints(slot.hintCount), appearance: normalizeAppearance(slot.appearance), ...(typeof slot.repairId === 'string' && { repairId: slot.repairId }) } : null;
    });
    if (obj(v.records)) for (const [id, rec] of Object.entries(v.records)) if (Number(id) >= 0 && Number(id) < LEVELS.length && obj(rec) && finite(rec.stars) && finite(rec.seconds) && finite(rec.hits) && finite(rec.moves)) result.records[id] = { stars: Math.min(3, Math.max(1, rec.stars)), seconds: Math.max(0, rec.seconds), hits: Math.max(0, rec.hits), moves: Math.max(0, rec.moves) };
    if (validSnapshot(v.checkpoint)) { result.checkpoint = v.checkpoint; if (v.checkpoint.level < 7) result.unlocked = Math.max(result.unlocked, v.checkpoint.level); }
    if (finite(v.hintCount)) result.hintCount = clampHints(v.hintCount);
  } catch { /* A damaged or old save safely falls back to a fresh shift. */ }
  return result;
}

export function exportSave(data: SaveData): string { return JSON.stringify({ format: 'borrowed-fire', version: 1, data }, null, 2); }
export function importSave(raw: string): SaveData {
  if (raw.length > 1_000_000) throw new Error('存档文件过大');
  const envelope: unknown = JSON.parse(raw);
  if (!obj(envelope) || envelope.format !== 'borrowed-fire' || envelope.version !== 1 || !obj(envelope.data) || envelope.data.version !== 1) throw new Error('这不是兼容的借火存档');
  const d = envelope.data;
  if (d.checkpoint !== undefined && !validSnapshot(d.checkpoint)) throw new Error('自动存档状态损坏');
  const tram = readTram(d.tram, true);
  if (d.slots !== undefined && (!Array.isArray(d.slots) || d.slots.length > 3 || d.slots.some(s => s !== null && (!obj(s) || !slotSnapshot(s.snapshot, tram.completed) || !validSlotMode(s.repairId, s.snapshot))))) throw new Error('手动存档状态损坏');
  if (d.repairDrafts !== undefined && (!obj(d.repairDrafts) || Object.entries(d.repairDrafts).some(([id, draft]) => !REPAIRS.some(order => order.id === id && validRepairDraft(draft, order.level))))) throw new Error('返修工单状态损坏');
  readProgress(d.campaign, true);
  return parseSave(JSON.stringify(d));
}
