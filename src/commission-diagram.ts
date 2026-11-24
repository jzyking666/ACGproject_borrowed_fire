import { Simulation, type OpticalRoute } from './engine';
import { opticalStrokes } from './lens-preview';
import { portLabel } from './field-service';
import type { Cell } from './levels';
import type { PassageReport } from './passage';

const tag = (n: number) => '甲乙丙丁戊'[n];
const pos = (c: Cell) => `translate(${c.x*22},${c.y*22})`;
const temp = (p: string) => p==='cool'?'冷':'暖';
function routeEnd(route: OpticalRoute) {
  const end = route.points.at(-1)!;
  if (route.end === 'edge') return portLabel(end) + ' · ' + temp(end.phase) + '光';
  const terminal = { loop: '室内成环', wall: '墙面', gate: '光闸', limit: '追踪上限' }[route.end];
  return terminal + ' · ' + temp(end.phase) + '光';
}
export function calibrationReadings(sim: Simulation, mirrorId: string) {
  const installed = sim.mirrors.find(m => m.id === mirrorId && !m.fixed);
  if (!installed || !sim.level.commission) return;
  const copy = new Simulation(sim.level);
  copy.restore(sim.snapshot());
  const mirror = copy.mirrors.find(m => m.id === installed.id)!;
  mirror.slash = !mirror.slash;
  return copy.commissionReadings();
}
function calibrationPanel(sim: Simulation, mirrorId?: string) {
  const choices = sim.mirrors.filter(m => !m.fixed);
  if (!choices.length) return '<p class="camp-foot">本室轴座全部铆定。</p>';
  const mirror = choices.find(m => m.id === mirrorId);
  const buttons = choices.map(m =>
    `<button data-action="calibrate-${m.id}" aria-pressed="${m === mirror}" aria-label="校样试转 ${m.id} 轴座">${m.id}</button>`).join('');
  let table = '';
  if (mirror) {
    const current = sim.commissionReadings(), test = calibrationReadings(sim, mirror.id)!;
    const rows = current.map((read,i) => {
      const cell = (r: typeof read) => `${r.passes ? '✓ 相符' : '○ 待查'} · ${routeEnd(r.route)}`;
      return `<tr><th scope="row">${tag(i)}路</th><td>${cell(read)}</td><td class="${test[i].passes !== read.passes ? 'calibration-change' : ''}">${cell(test[i])}</td></tr>`;
    }).join('');
    table = `<table class="calibration-table"><caption>同一组端口，试转 ${mirror.id} 一次</caption><thead><tr><th>校线</th><th>现场读数</th><th>校样读数</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  return `<section class="commission-template"><h2>配线校样</h2><p>选一只活动轴座，在校样上转一格，逐路对照实际出口和来光。</p><div class="calibration-controls">${buttons}${mirror ? '<button data-action="calibrate-off">收起对照</button>' : ''}</div>${table}</section>`;
}
function passagePanel(sim: Simulation, report?: PassageReport) {
  const targets = ['exit', ...sim.mirrors.filter(m => !m.fixed).map(m => m.id)];
  const buttons = targets.map(id => `<button data-action="passage-${id}" aria-pressed="${report?.target === id}">${id === 'exit' ? '出口' : id + ' 轴座'}</button>`).join('');
  const valid = report && targets.includes(report.target);
  const rows = valid ? report.trips.map(result => {
    const label = { hit:'受到冲击', complete:'进入出口', standby:'已抵达，等待放行', arrive:'已抵达', blocked:'无法靠近' }[result.outcome];
    return `<tr><th scope="row">${result.wait ? '等一秒出发' : '立即出发'}</th><td>+${result.time.toFixed(2)} 秒</td><td>${label} · (${result.place.x.toFixed(1)}, ${result.place.y.toFixed(1)})</td></tr>`;
  }).join('') : '';
  const result = valid ? rows ? `<table class="calibration-table"><caption>前往${report.target === 'exit' ? '出口' : report.target + ' 轴座'} · 图上浅色点线为模拟步行路线</caption><thead><tr><th>出发方案</th><th>从现在起</th><th>结果与位置</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>格网中未找到能走到的操作位置。</p>' : '';
  return `<section class="commission-template"><h2>过道放行表</h2><p>选择去处，检查沿同一条路按普通速度走到那里会遇到什么。两次推算都从现在的脉冲、镜向与保护时间出发，途中保持装置原样。</p><div class="calibration-controls">${buttons}${valid ? '<button data-action="passage-off">收起放行表</button>' : ''}</div>${result}</section>`;
}

export function commissionDiagram(sim: Simulation, selected: number, templateUnlocked = false, mirrorId?: string, tideUnlocked = false, passage?: PassageReport) {
  const trialId = templateUnlocked ? sim.mirrors.find(m => m.id === mirrorId && !m.fixed)?.id : undefined;
  const runs=sim.level.commission!, readings=sim.commissionReadings(), reading=readings[selected], target=runs[selected];
  const panels=runs.map((run,n)=>`<button data-action="probe-${n}" aria-pressed="${n===selected}"><b>${tag(n)}路 · ${readings[n].passes?'相符':'待查'}</b><small>${portLabel(run.inlet)} ${temp(run.phase)} → ${portLabel(run.outlet)} ${temp(run.delivery)}</small></button>`).join('');
  const inletColor = target.phase === 'cool' ? '#9adce8' : '#fac78e';
  const port = target.phase === 'cool' ? '<path d="M0 -6l6 6-6 6-6-6z"/>' : '<circle r="5"/>';
  const requested = target.delivery === 'cool' ? '#9adce8' : '#fac78e';
  const strokes=opticalStrokes(reading.route).map(s=>`<polyline points="${s.points.map(p=>`${p.x*22},${p.y*22}`).join(' ')}" fill="none" stroke="${s.phase==='warm'?'#efb67c':'#89d2df'}" stroke-width="2" ${s.phase==='cool'?'stroke-dasharray="5 3"':''}/>`).join('');
  const trail = tideUnlocked && passage?.path.length ?
    `<g aria-label="维修员预计步行路线" pointer-events="none"><polyline points="${passage.path.map(p => `${p.x*22},${p.y*22}`).join(' ')}" transform="translate(2 2)" fill="none" stroke="#e1e8d9" stroke-width="1.7" stroke-dasharray="1 4" stroke-linecap="round"/><circle transform="${pos(passage.path[0])}" r="3" fill="#e1e8d9"/>${passage.trips.filter(r=>r.outcome==='hit').map(r=>`<path transform="${pos(r.place)}" d="M-3 -3l6 6m0 -6l-6 6" stroke="#ef9f92" stroke-width="1.8"/>`).join('')}</g>` : '';
  const mirrors=sim.mirrors.map(m=>`<g transform="${pos(m)}" ${templateUnlocked && !m.fixed ? `class="calibration-pick" data-action="calibrate-${m.id}"` : ''}>${trialId === m.id ? '<rect x="-9" y="-9" width="18" height="18" fill="none" stroke="#ffe1a7" stroke-dasharray="3 2"/>' : ''}<rect x="-6" y="-6" width="12" height="12" fill="#1e2c2c" stroke="${m.fixed?'#8d9897':'#efc791'}"/><path d="M-4 ${m.slash?4:-4}l8 ${m.slash?-8:8}" stroke="#ecc397" stroke-width="2"/>${m.kind?`<path d="M-4 ${m.slash?-4:4}l8 ${m.slash?8:-8}" stroke="#89d2df" stroke-width="2"/>`:''}<text x="7" y="-5">${m.id}</text></g>`).join('');
  const specials=(sim.level.inverters??[]).map(c=>`<path transform="${pos(c)}" d="M0 -6l5 6 -5 6 -5 -6z" fill="#4c7880" stroke="#dbbd87"/>`).join('')+(sim.level.portals??[]).flatMap(p=>[p.a,p.b]).map(c=>`<circle transform="${pos(c)}" r="5" fill="#282237" stroke="#cba6d9" stroke-width="2"/>`).join('');
  const grid=Array.from({length:13},(_,x)=>`M${22*x} 0v176`).join('')+Array.from({length:9},(_,y)=>`M0 ${22*y}h264`).join('');
  const compass=(x:number,y:number,t:string)=>`<text x="${x}" y="${y}" text-anchor="middle">${t}</text>`;
  const coordinates=Array.from({length:11},(_,i)=>compass((i+1)*22,-3,String(i+1))).join('')+Array.from({length:7},(_,i)=>compass(-7,(i+1)*22+3,String(i+1))).join('');
  const stop=routeEnd(reading.route);
  return `<p class="camp-foot">所有校线共用当前镜向。甲路带真实负载。选中校线查看从入口发出的路线，回到观察时地面显示同一条线。</p><div class="commission-layout"><div class="commission-list">${panels}</div><figure><svg role="img" aria-label="${tag(selected)}路联检图" viewBox="-15 -15 295 205"><path d="${grid}" stroke="#66818b" opacity=".6" stroke-width=".65"/>${coordinates}${strokes}${trail}${specials}${mirrors}<g transform="${pos(target.inlet)}" fill="${inletColor}">${port}<text x="6" y="5">入</text></g><circle transform="${pos(target.outlet)}" r="7" stroke="${requested}" stroke-width="2.4" fill="none"/></svg><figcaption><div class="commission-traces" aria-label="线型图例"><span>暖光</span><span>冷光</span></div><div>${tag(selected)}路实测 · ${stop}　${reading.passes?'✓ 已接对':'目标 '+portLabel(target.outlet)+' '+temp(target.delivery)+'光'}</div></figcaption></figure></div>${templateUnlocked ? calibrationPanel(sim,trialId) : '<p class="camp-foot">签收本段的配线织盘，可在此领取轴座试转校样。</p>'}${tideUnlocked ? passagePanel(sim,passage) : ''}`;
}
