import { normalizeSeen } from './story';
import type { Snapshot } from './engine';
import { LEVELS } from './levels';
import { defaultAppearance, normalizeAppearance, type Appearance } from './appearance';
export interface RecordEntry { stars: number; seconds: number; hits: number; moves: number }
export interface ManualSave { snapshot: Snapshot; hintCount: number; savedAt: string; appearance: Appearance }
export interface SaveData {
  version: 1; unlocked: number; records: Record<string, RecordEntry>;
  checkpoint?: Snapshot; hintCount?: number;
  slots: (ManualSave | null)[];
  appearance: Appearance;
  story: { seen: string[] };
  settings: { dialogue: boolean; muted: boolean; highQuality: boolean; reducedMotion: boolean; depthOfField: boolean; environment: boolean; music: boolean; volume: number; textScale: number };
}
export const STORAGE_KEY = 'borrowed-fire.save.v1';
export const defaults = (): SaveData => ({ version: 1, unlocked: 0, records: {}, slots: [null, null, null], appearance: defaultAppearance(), story: { seen: [] }, settings: { dialogue: true, muted: false, highQuality: true, reducedMotion: false, depthOfField: false, environment: true, music: true, volume: .7, textScale: 1 } });
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const cell = (v: unknown) => obj(v) && finite(v.x) && finite(v.y) && v.x >= 0 && v.x <= 12 && v.y >= 0 && v.y <= 8;
export function validSnapshot(v: unknown): v is Snapshot {
  if (!obj(v) || v.version !== 1 || !Number.isInteger(v.level) || Number(v.level) < 0 || Number(v.level) >= LEVELS.length) return false;
  const level = LEVELS[Number(v.level)];
  if (!cell(v.player)) return false;
  if (!obj(v.facing) || ![-1, 0, 1].includes(Number(v.facing.x)) || ![-1, 0, 1].includes(Number(v.facing.y)) || Math.abs(Number(v.facing.x)) + Math.abs(Number(v.facing.y)) !== 1) return false;
  if (!Array.isArray(v.mirrors) || !Array.isArray(v.pulses) || v.pulses.length > 1 || !obj(v.receivers) || typeof v.sourceOn !== 'boolean') return false;
  const mirrors = [...v.mirrors, ...(v.carried === null ? [] : [v.carried])];
  if (mirrors.length !== level.mirrors.length || new Set(mirrors.map(m => obj(m) ? m.id : null)).size !== mirrors.length) return false;
  if (!mirrors.every(m => obj(m) && cell(m) && typeof m.slash === 'boolean' && level.mirrors.some(original => original.id === m.id && !!original.fixed === !!m.fixed))) return false;
  if (!v.pulses.every(p => obj(p) && cell(p) && finite(p.id) && finite(p.dx) && finite(p.dy) && Math.abs(p.dx) + Math.abs(p.dy) === 1 && finite(p.wait) && finite(p.age) && typeof p.last === 'string' && (p.phase === undefined || p.phase === 'warm' || p.phase === 'cool'))) return false;
  if (!level.receivers.every(r => { const s = (v.receivers as Record<string, unknown>)[r.id]; return obj(s) && finite(s.charge) && s.charge >= 0 && s.charge <= r.ttl && finite(s.hits) && finite(s.lastPulse); })) return false;
  return ['elapsed', 'hits', 'moves', 'nextPulse', 'spawnTimer'].every(k => finite(v[k])) && Number(v.elapsed) >= 0 && Number(v.hits) >= 0 && Number(v.moves) >= 0;
}
export function parseSave(raw: string | null): SaveData {
  const result = defaults(); if (!raw) return result;
  try {
    const v: unknown = JSON.parse(raw); if (!obj(v) || v.version !== 1) return result;
    if (finite(v.unlocked)) result.unlocked = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(v.unlocked)));
    if (obj(v.settings)) {
      for (const k of ['dialogue', 'muted', 'highQuality', 'reducedMotion', 'depthOfField', 'environment', 'music'] as const) if (typeof v.settings[k] === 'boolean') result.settings[k] = v.settings[k];
      if (finite(v.settings.volume)) result.settings.volume = Math.max(0, Math.min(1, v.settings.volume));
      if (finite(v.settings.textScale)) result.settings.textScale = Math.max(1, Math.min(1.2, v.settings.textScale));
    }
    if (obj(v.story)) result.story.seen = normalizeSeen(v.story.seen);
    result.appearance = normalizeAppearance(v.appearance);
    if (Array.isArray(v.slots)) result.slots = [0, 1, 2].map(i => {
      const slot: unknown = (v.slots as unknown[])[i];
      return obj(slot) && validSnapshot(slot.snapshot) && typeof slot.savedAt === 'string' && Number.isFinite(Date.parse(slot.savedAt))
        ? { snapshot: slot.snapshot, savedAt: slot.savedAt, hintCount: finite(slot.hintCount) ? Math.max(0, Math.min(3, slot.hintCount)) : 0, appearance: normalizeAppearance(slot.appearance) } : null;
    });
    if (obj(v.records)) for (const [id, rec] of Object.entries(v.records)) if (Number(id) >= 0 && Number(id) < LEVELS.length && obj(rec) && finite(rec.stars) && finite(rec.seconds) && finite(rec.hits) && finite(rec.moves)) result.records[id] = { stars: Math.min(3, Math.max(1, rec.stars)), seconds: Math.max(0, rec.seconds), hits: Math.max(0, rec.hits), moves: Math.max(0, rec.moves) };
    if (validSnapshot(v.checkpoint)) { result.checkpoint = v.checkpoint; if (v.checkpoint.level < 7) result.unlocked = Math.max(result.unlocked, v.checkpoint.level); }
    if (finite(v.hintCount)) result.hintCount = Math.min(3, Math.max(0, v.hintCount));
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
  if (d.slots !== undefined && (!Array.isArray(d.slots) || d.slots.length > 3 || d.slots.some(s => s !== null && (!obj(s) || !validSnapshot(s.snapshot))))) throw new Error('手动存档状态损坏');
  return parseSave(JSON.stringify(d));
}
