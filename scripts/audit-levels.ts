import { writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { LEVELS, type Level, type Mirror } from '../src/levels';
import { Simulation } from '../src/engine';

const occupied = (level: Level, x: number, y: number) => [...level.walls, ...level.receivers, level.source, level.exit, ...(level.inverters ?? []), ...(level.delay ? [level.delay] : []), ...(level.gates ?? []), ...(level.portals ?? []).flatMap(p => [p.a, p.b])].some(c => c.x === x && c.y === y);
export function rectangles(level: Level) {
  const candidates: Mirror[][] = [];
  if (level.mirrors.length < 4 || level.mirrors.some(m => m.kind === 'prism')) return candidates;
  for (let l = 1; l < 10; l++) for (let r = l + 1; r <= 11; r++) for (let t = 1; t < 7; t++) for (let b = t + 1; b <= 7; b++) {
    const cells = [{ x: l, y: t, slash: true }, { x: r, y: t, slash: false }, { x: r, y: b, slash: true }, { x: l, y: b, slash: false }];
    if (cells.some(c => occupied(level, c.x, c.y))) continue;
    if (level.mirrors.some(m => m.fixed && !cells.some(c => c.x === m.x && c.y === m.y && c.slash === m.slash))) continue;
    // Test only circuits that include every receiver and the emitter. This is a restricted audit, not a general solver.
    const edge = (c: { x: number; y: number }) => ((c.x === l || c.x === r) && c.y >= t && c.y <= b) || ((c.y === t || c.y === b) && c.x >= l && c.x <= r);
    if (![...level.receivers, level.source].every(edge)) continue;
    const used = new Set<string>();
    const mirrors = cells.map(c => {
      const original = level.mirrors.find(m => m.fixed && m.x === c.x && m.y === c.y) ?? level.mirrors.find(m => !m.fixed && !used.has(m.id))!;
      used.add(original.id); return { ...original, ...c };
    });
    candidates.push(mirrors);
  }
  return candidates;
}

export function auditRectangles(level: Level) {
  const candidates = rectangles(level); let solves = 0, skipDelay = 0;
  for (const candidate of candidates) {
    const sim = new Simulation(level); sim.player = { x: 1, y: 1 };
    sim.mirrors = [...candidate, ...level.solution.filter(m => !candidate.some(c => c.id === m.id))];
    for (const recipe of level.echoSolution ?? []) sim.echoes.push({ points: [{ ...recipe.start, t: 0 }, { ...recipe.start, t: 1 }], duration: 1, time: 0 });
    let stable = true;
    for (let n = 0; n < 120 * 24; n++) { sim.step(1 / 120, false); if (n >= 120 * 18 && !sim.stable) stable = false; }
    if (!stable) continue;
    solves++;
    if (level.delay && !sim.trace().some(c => c.x === level.delay!.x && c.y === level.delay!.y)) skipDelay++;
  }
  return { candidates: candidates.length, solves, skipDelay };
}
async function main() {
  const lines = ['# 关卡矩形回路审计', '', '自动检查限定为：四面镜构成的轴对齐矩形、来源和所有接收环位于矩形边上、角色静止、回声静止在参考示教起点。不覆盖双色棱镜、导光井折叠的非矩形路径、六镜凹形路径、动态搬运或完整回声时序；零候选或零通过不表示关卡不可解。全部参考解由另一组测试验证。', '', '| 关卡 | 几何候选 | 18–24 秒全程稳定 | 可绕开缓冲器 |', '|---|---:|---:|---:|'];
  for (const level of LEVELS) {
    const result = auditRectangles(level);
    lines.push(`| ${level.id + 1} ${level.name} | ${result.candidates} | ${result.solves} | ${level.delay ? result.skipDelay : '—'} |`);
  }
  lines.push('', '本审计用于发现静态替代解，不构成全局唯一解证明。慢半拍修正前有两个绕开缓冲器的矩形解；新增两根维修柱后，同一范围内仅剩一个持续可行候选，且经过缓冲器。');
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/level-audit.md', lines.join('\n') + '\n');
  console.log(lines.join('\n'));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
