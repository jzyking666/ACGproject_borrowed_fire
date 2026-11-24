import type { Simulation } from './engine';
import type { Cell } from './levels';

/** A single prompt for the first two shifts. Read the current board each time, so undo,
 * a restored checkpoint or an unconventional route needs no tutorial checkpoint. */
export function shiftCoach(sim: Simulation, usingPad = false): string | undefined {
  if ((sim.level.id !== 0 && sim.level.id !== 1) || sim.won) return;
  const use = usingPad ? '手柄 A' : 'E', turn = usingPad ? '手柄 B' : 'Q', pause = usingPad ? '按手柄 X 暂停' : '按空格暂停';
  if (sim.exitOpen) {
    return sim.carried ? `出口已通电。面朝空格按 ${use} 放下镜子，再走进亮起的出口。` : '出口已通电。趁接收环的刻度仍亮着，走进青色出口。';
  }
  const path = sim.opticalRoute().points.slice(1);
  const lit = (c: Cell) => path.some(p => p.x === c.x && p.y === c.y);
  const connected = sim.level.receivers.every(lit);
  if (sim.carried) {
    if (!sim.validCell(sim.targetCell)) return `前面的格子放不下镜子。换个位置或朝向，等轮廓变青再按 ${use}。`;
    if (connected) return `场内的镜子已经能把光送到接收环。朝光路旁的空格按 ${use} 放下手里这面。`;
    if (lit(sim.targetCell)) return `前面的格子在光路上。按 ${use} 放下，想换方向可按 ${turn}。`;
    return `镜子在手上。走到想让光转弯的地方旁边，面朝那一格按 ${use} 放下。`;
  }
  if (connected) {
    if (!sim.sourceOn) return sim.pulses.length ? '光路已经接到环上。看场内这颗光能否到达，留意发射器仍然关着。' : `光路已经接到环上。靠近发射器，选中它后按 ${use} 开机。`;
    return '光路已经接到环上。站到光线旁边，等接收环亮起。';
  }
  const onPath = sim.mirrors.filter(lit), near = sim.nearest;
  if (typeof near === 'object' && !lit(near)) {
    if (onPath.length) return `这面镜子还没接到光。按 ${use} 拿起它，沿上一面镜子送出的方向找落点。`;
    return sim.moves ? `镜子偏离了从发射器出来的光。按 ${use} 搬起镜子，在光要转弯的格子放下。` : `身边这面斜镜可以搬动。按 ${use} 拿起它。`;
  }
  if (onPath.length) {
    if (sim.level.id === 0 && typeof near === 'object') return `这面镜子在光路上。按 ${turn} 原地转向，或按 ${use} 换一个转弯位置。`;
    return `${pause}，沿镜面反射的路线找一找，光从哪里错过了接收环。`;
  }
  return `走近地上的斜镜，等选中圈落在镜脚，再按 ${use} 拿起。`;
}
