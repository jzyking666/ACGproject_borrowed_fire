import type { Simulation } from './engine';
import type { SaveData } from './storage';
import { TRAM_STOPS } from './last-tram';

/** The last signed handover advances the cover even if the player quit on the result screen. */
export function nextNightRoom(data: SaveData): number | undefined {
  if (data.checkpoint) return data.checkpoint.level;
  for (let id = Math.min(data.unlocked, 11); id < 12; id++) {
    if (!data.records[id]) return id;
  }
}

export function tramTicket(data: SaveData, selected: number) {
  const stop = TRAM_STOPS[selected], signed = selected < data.tram.completed;
  const route = TRAM_STOPS.map((s,i) => `<li><button data-action="tram-stop-${i}" ${i > data.tram.completed ? 'disabled' : ''} aria-pressed="${i === selected}">
    <span class="tram-punch" aria-hidden="true">${i < data.tram.completed ? '✓' : String(i+1).padStart(2,'0')}</span>
    <span>${s.place}</span></button></li>`).join('');
  return `<article class="tram-ticket"><header><b>第七区电车</b><span>07</span></header>
    <ol class="tram-line" aria-label="末班车停靠站">${route}</ol>
    <section class="tram-message"><small>${stop.caller}</small><h2>${stop.level.name}</h2>
    <blockquote>${stop.request}</blockquote>${signed ? `<p class="tram-reply">${stop.receipt}</p>` : `<p>${stop.level.briefing}</p>`}</section></article>`;
}

export function tramSignalText(sim: Simulation) {
  switch (sim.level.id) {
    case 3000:
      if (sim.exitOpen) return '两边都看得见。上车吧。';
      return sim.receivers.amber.charge > 0 ? '街这头有光。雨棚背面还看不清。' : '司机正等两盏候车灯。';
    case 3001:
      if (sim.exitOpen) return '后门开了，桶不用抬过前台阶了。';
      return sim.receivers.latch.charge > 0 ? '前门已经自己保持了。现在试后门。' : '前门踏板还在等人。';
    case 3002:
      if (sim.exitOpen) return '弓已收好，尾灯还亮着。可以发车。';
      if (sim.stable && sim.sourceOn) return '回路已经接手。司机在等收弓信号。';
      return sim.receivers.tail.charge > 0 ? '尾灯还亮着。看看车内的阅读灯。' : '司机从后视镜里望着车尾。';
  }
}

export const TICKET_EN: Record<string,string> = {
  '两边都看得见。上车吧。':'Both sides are visible. All aboard.',
  '街这头有光。雨棚背面还看不清。':'This side is lit. The back of the shelter is still dark.',
  '司机正等两盏候车灯。':'The driver is watching for both stop lights.',
  '后门开了，桶不用抬过前台阶了。':'Rear door open. No need to lift the buckets over the front steps.',
  '前门已经自己保持了。现在试后门。':'The front latch is holding. Try the rear door.',
  '前门踏板还在等人。':'The front treadle needs someone to stand on it.',
  '弓已收好，尾灯还亮着。可以发车。':'Collector down, tail lamp lit. Ready to leave.',
  '回路已经接手。司机在等收弓信号。':'The loop is holding. The driver is waiting to lower the collector.',
  '尾灯还亮着。看看车内的阅读灯。':'The tail lamp is lit. Check the reading lamp inside.',
  '司机从后视镜里望着车尾。':'The driver watches the rear-view mirror.',
  '夜班从自动断点继续，返修从值班台续修，复网从街区图续工，电车从车票续乘。手动槽可保存当前机房，导出文件会带走整份进度。':'Resume the shift from its checkpoint, repairs at the desk, restoration on the map and the tram from its ticket. Manual slots keep the current room. Exporting includes all progress.',
  '第七区电车':'District Seven Tramways', '末班车':'Last Tram', '末班车停靠站':'Last tram stops',
  '车票':'Ticket', '主线故事':'Night shift story', '夜班交接':'Shift handovers', '街坊支线':'Neighbourhood stories',
  '夜班后记':'After the shift', '前往站台':'Go to the platform', '继续修车':'Resume repairs',
  '重访本站':'Revisit stop', '下一站':'Next stop', '回看车票':'View ticket',
  '末班车车票损坏':'Damaged tram ticket', '末班车已进站':'Tram in service', '末班车已发车':'The last tram is away',
  '去赶末班车':'Catch the last tram', '查看下一站':'See the next stop', '返回车票':'Back to the ticket',
  '车票收好，街上见。':'Keep your ticket. See you out there.', '沿线居民':'Meet the neighbours',
};
