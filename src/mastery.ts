import type { Simulation } from './engine';
import type { Level } from './levels';

export interface Challenge { id: string; title: string; description: string; achieved: (sim: Simulation) => boolean }
/** Optional construction goals. They never change completion, stars or access to rooms. */
export function challengesFor(level: Level): Challenge[] {
  const precise: Challenge = { id: 'precise', title: '整洁交接', description: '完成时没有受到冲击，也没有接收环拒收过错误颜色。', achieved: s => s.hits === 0 && s.stats.rejected === 0 };
  const economy: Challenge = { id: 'economy', title: '一颗就够', description: '从开工到完成只发射一颗脉冲。可以先关闭来源再布置。', achieved: s => s.stats.emitted === 1 && s.stats.lost === 0 && s.hits === 0 };
  if (level.id === 7 || level.id === 10) return [economy, {
    id: 'handoff', title: '亲手启动', description: '用自己启动压板，由接收环接管光闸；完成时压板上没有反射器。',
    achieved: s => !s.level.plates?.some(p => s.mirrors.some(m => m.x === p.x && m.y === p.y)) && !!s.level.gates?.every(g => !!g.poweredBy && s.receivers[g.poweredBy].charge > 0),
  }];
  if (level.repeats > 1) return [economy, {
    id: 'endurance', title: '经得起等待', description: '所有接收环连续保持循环验证至少十二秒，再完成交接。', achieved: s => s.stats.stableSeconds >= 12 - 1e-6,
  }];
  return [precise, economy];
}
export function achievedChallenges(sim: Simulation): string[] { return sim.won ? challengesFor(sim.level).filter(c => c.achieved(sim)).map(c => c.id) : []; }
export function normalizeMastery(value: unknown, levels: readonly Level[]): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string[]> = {};
  for (const level of levels) {
    const values = (value as Record<string, unknown>)[level.id];
    if (!Array.isArray(values)) continue;
    const valid = new Set(challengesFor(level).map(c => c.id));
    result[level.id] = [...new Set(values.filter((v): v is string => typeof v === 'string' && valid.has(v)))];
  }
  return result;
}
