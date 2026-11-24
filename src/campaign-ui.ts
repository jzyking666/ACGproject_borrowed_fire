import { districtArt, districtMap, DISTRICTS, CAMPAIGN_EPILOGUE } from './district-atlas';
import { STREET_NOTES } from './street-ledger';
import { SECTORS } from './field-service';
import { canWork, districtOpen, feedNames, jobKey, jobOf, playReport, readJob, restoredSectors, signedCount, signJob, TRADES, TRADE_NAME, type CampaignProgress, type JobKey, type Trade } from './campaign-progress';
import { loomFamily } from './grid-loom-ui';
import { tideFamily } from './tide-dispatch-ui';
import { ReturnMailDesk } from './return-mail-ui';
import { RETURN_MAIL, hasMailEvidence } from './return-mail';

const desks = { loom: loomFamily, tide: tideFamily };
const btn = (verb: string, label: string, primary = false, disabled = false) => `<button class="${primary ? 'primary' : 'secondary'}" data-action="${verb}" ${disabled ? 'disabled' : ''}>${label}</button>`;
const duration = (n: number) => n >= 3600 ? `${Math.floor(n/3600)} 小时 ${Math.floor(n/60)%60} 分` : n >= 60 ? `${Math.floor(n/60)} 分` : `${Math.floor(n)} 秒`;
type Paper = (title: string, body: string, footer: string, kind: string) => void;

export class CampaignDesk {
  private mail: ReturnMailDesk;
  private openNotes = -1;
  private board?: { trade: 'loom'|'tide'; index: number; values: number[]; history: number[][]; frame: number; hint: string };
  constructor(private state: () => CampaignProgress, private paper: Paper, private save: () => void,
    private enterSite: (index: number) => void, private download: (csv: string) => void, private seal: () => void,
    mailSeal = seal) {
    this.mail = new ReturnMailDesk({ state, paper, save, seal: mailSeal });
  }

  clockKey(screen: string): JobKey | 'mail' | undefined {
    if (screen === 'camp-address' && this.mail.isWorking(screen)) return 'mail';
    return screen === 'camp-board' && this.board ? jobKey(this.board.trade, this.board.index) : undefined;
  }
  mailbag() { this.mail.list(); }
  map() {
    const p = this.state(), selected = p.selected, last = readJob(p.last);
    const status = (d:number) => restoredSectors(p,d) === 6 ? 'restored' : districtOpen(p,d) ? 'open' : 'locked';
    const open = DISTRICTS.filter(d => status(d.id) === 'open').map(d => d.title).join('、');
    const done = signedCount(p);
    const resume = last && !p.jobs[p.last!]?.done ? btn('camp-resume', `继续 · ${SECTORS[Math.floor(last.index/6)][last.index%6]}`, true) : '';
    const dispatch = `<aside class="camp-dispatch">
      <h2>当班线路</h2>
      <p class="camp-lead">旧区最后一张街名图少了一块。沿线找回八个街区的门牌，赶在交班前印出总图。</p>
      <dl><dt>可检修街区</dt><dd>${open || '全线已复网'}</dd><dt>工单</dt><dd class="camp-counter">已签收 ${done} / 144 项</dd></dl>
      <p class="camp-foot">每区六个地段，接通其中三段即可为下游送电。</p>
    </aside>`;
    this.paper('天亮之前', `<div class="camp-map-spread">${districtMap(selected,status)}${dispatch}</div>`,
      btn('back','返回') + btn('camp-log','值班簿') + btn('camp-mail',`退信寻址 · ${p.returned.length}/8`) + (done===144 ? btn('camp-ending','重读终章') : '') + (resume || btn('district-'+selected, '前往'+DISTRICTS[selected].title,true)), 'camp-map');
  }
  district(d: number) {
    const p=this.state();
    if (!districtOpen(p,d)) return;
    p.selected=d; this.save();
    const area=DISTRICTS[d], restored=restoredSectors(p,d);
    const list = SECTORS[d].map((name,n)=>{
      const i=d*6+n;
      return `<section class="camp-sector"><h2>${name}</h2><div>${TRADES.map(t=>{
        const j=p.jobs[jobKey(t,i)], enabled=canWork(p,t,i);
        const label = t==='field' ? '现场联检' : desks[t].title(i);
        const state = j?.done?'已签收':!enabled?'待其余 143 项签收':j?'续办':'待办';
        return `<button data-action="job-${t}-${i}" ${enabled?'':'disabled'} class="${j?.done?'sealed':''}" aria-label="${TRADE_NAME[t]} · ${state} ${label}"><b>${label}</b><small>${j?.done?'✓ ':''}${state}</small></button>`;
      }).join('')}</div></section>`;
    }).join('');
    const downstream=DISTRICTS.filter(a=>feedNames(a.id).includes(d));
    this.paper(area.title, `<div class="camp-letter">${districtArt(d,restored===6)}<div><small>${area.resident}</small><p>${restored===6?area.restored:area.arrival}</p></div></div><p class="camp-foot">${restored}/6 地段已复网 · 每行三项可任选先后。${downstream.length?'下游为'+downstream.map(a=>a.title).join('、')+'。':''}</p><div class="camp-work"><div class="camp-colheads" aria-hidden="true"><span>地段</span>${TRADES.map(t=>`<span>${TRADE_NAME[t]}</span>`).join('')}</div>${list}</div>`,btn('camp-map','全区地图')+btn('camp-log','值班簿'),'camp-district');
  }
  start(trade: Trade,index: number) {
    const p=this.state(); if (!canWork(p,trade,index)) return;
    const k=jobKey(trade,index), j=jobOf(p,k);
    p.selected=Math.floor(index/6); p.last=k; this.save();
    if (trade==='field') { this.board=undefined; this.enterSite(index); return; }
    const f=desks[trade];
    this.board={trade,index,values:j.values ? [...j.values] : f.initial(index),history:[],frame:0,hint:''};
    this.renderBoard();
  }
  private renderBoard() {
    const b=this.board; if(!b) return;
    const f=desks[b.trade], frames=f.frames?.(b.index,b.values) ?? 0;
    const ok=f.solved(b.index,b.values), place=SECTORS[Math.floor(b.index/6)][b.index%6];
    this.paper(f.title(b.index), `<p class="camp-meta">${DISTRICTS[Math.floor(b.index/6)].title} / ${place} / ${f.name}</p>${f.render(b.index,b.values,b.frame)}${b.hint?`<p class="camp-hint" role="status">${b.hint}</p>`:''}`,
      btn('camp-district','回街区')+btn('camp-undo','撤销',false,!b.history.length)+btn('camp-reset','复原')+btn('camp-hint','提示')+(frames?btn('camp-prev','上一拍')+btn('camp-next','下一拍'):'')+btn('camp-sign',ok?'签收工单':'待验收',true,!ok),'camp-board');
  }
  finish(t:Trade,i:number) {
    const p=this.state(), d=Math.floor(i/6), fresh=signJob(p,t,i);
    p.selected=d;
    this.save(); this.seal();
    if (signedCount(p)===144 && fresh) { this.ending(); return; }
    const complete=TRADES.every(k=>p.jobs[jobKey(k,i)]?.done);
    const restored=restoredSectors(p,d), area=DISTRICTS[d];
    const next=TRADES.find(k=>!p.jobs[jobKey(k,i)]?.done);
    const note = restored===6 ? area.restored : complete ? STREET_NOTES[d][i%6]
      : {loom:'配线校样已经送往现场。在端口联检图里选一只轴座，就能比较试转前后各路光的去处。',tide:'整圈船班已经排定。现场拿到了过道放行表，可以比较立即出发和晚一秒出发的路线。',field:'所有入口都通过联检，住户的实载灯也亮了。'}[t];
    const foundMail = fresh && complete ? RETURN_MAIL.filter((m,n) => m.evidence.includes(i) && hasMailEvidence(p,n) && !p.returned.includes(n)) : [];
    const mailNotice = foundMail.length ? `<p class="camp-foot">邮袋里${foundMail.map(m=>'《'+m.title+'》').join('、')}的寻址线索已齐。</p>` : '';
    this.paper(restored===6?'街区已复网':complete?'地段已复网':'工单已签收',`<div class="camp-letter">${districtArt(d,restored===6)}<div><small>${area.title} / ${SECTORS[d][i%6]}</small><p>${note}</p></div></div><p class="camp-foot">${restored} / 6 地段复网 · 全区 ${signedCount(p)} / 144 项签收</p>${mailNotice}`,btn('camp-map','全区地图')+(foundMail.length ? btn('camp-mail','拆看退信') : '')+btn('camp-district','回街区',!next)+(next&&canWork(p,next,i)?btn('job-'+next+'-'+i,'接办 · '+TRADE_NAME[next],true):''),'camp-receipt');
  }
  private ending() {
    const p=this.state(); if (signedCount(p)!==144) return;
    this.paper('第一张完整的街区图', `<div class="camp-last">${districtArt(7,true)}<p>${CAMPAIGN_EPILOGUE}</p></div><p class="camp-foot">八区四十八段已复网 · 首通有效游玩合计 ${duration(Object.values(p.jobs).reduce((s,j)=>s+(j?.seconds??0),0))}</p>`, btn('camp-map','展开全图')+btn('camp-log','翻阅值班簿',true),'camp-ending');
  }
  private log() {
    const p=this.state();
    const rows=DISTRICTS.map(d=>`<tr><th>${d.title}</th>${TRADES.map(t=>{
      const records=SECTORS[d.id].map((_,n)=>p.jobs[jobKey(t,d.id*6+n)]);
      return `<td>${records.filter(r=>r?.done).length}/6<br><small>${duration(records.reduce((sum,r)=>sum+(r?.seconds??0),0))}</small></td>`;
    }).join('')}</tr>`).join('');
    const entries = DISTRICTS.map(d => {
      const notes = SECTORS[d.id].flatMap((name,n) => TRADES.every(t=>p.jobs[jobKey(t,d.id*6+n)]?.done)
        ? [`<dt>${name}</dt><dd>${STREET_NOTES[d.id][n]}</dd>`] : []);
      if (!notes.length) return '';
      const expanded = this.openNotes === d.id;
      return `<section class="camp-sector-notes"><button data-action="camp-notes-${d.id}" aria-expanded="${expanded}">${expanded?'▾':'▸'} ${d.title} · ${notes.length} 封交班记录</button>${expanded?`<dl>${notes.join('')}</dl>`:''}</section>`;
    }).join('');
    this.paper('复网值班簿',`<table class="camp-log"><thead><tr><th>街区</th>${TRADES.map(t=>`<th>${TRADE_NAME[t]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><p class="camp-foot">每项记录首次签收前的现场、读图和调盘时间。切出页面、暂停及两分钟以上无输入的空闲时段停止累计。记录只保存在本机，可导出明细。</p>${entries}`,btn('camp-map','回地图',true)+btn('camp-report','导出用时 CSV'),'camp-log');
  }
  handle(a:string,screen:string): boolean {
    const p=this.state();
    if (a==='camp-mail') this.mailbag();
    else if (a.startsWith('mail-')) return this.mail.handle(a,screen);
    else if (a==='camp-map') this.map();
    else if (a==='camp-district') this.district(p.selected);
    else if (a==='camp-log') this.log();
    else if (/^camp-notes-[0-7]$/.test(a) && screen==='camp-log') {
      const id=Number(a.at(-1)); this.openNotes=this.openNotes===id?-1:id; this.log();
    }
    else if (a==='camp-report') this.download(playReport(p));
    else if (a==='camp-ending') this.ending();
    else if (/^district-[0-7]$/.test(a)) this.district(Number(a.slice(9)));
    else if (a.startsWith('job-') || a==='camp-resume') {
      const spec=readJob(a==='camp-resume'?p.last:a.slice(4)); if(spec)this.start(spec.trade,spec.index);
    } else if(screen==='camp-board' && this.board && (a.startsWith('board-') || a.startsWith('camp-'))) {
      const b=this.board, f=desks[b.trade], j=jobOf(p,jobKey(b.trade,b.index));
      if(a==='camp-sign') { if(f.solved(b.index,b.values))this.finish(b.trade,b.index); return true; }
      if(a==='camp-hint') {
        if (!b.hint) { b.hint=f.hint(b.index,b.values); if(!j.done)j.hints++; }
      }
      else if(a==='camp-prev'||a==='camp-next'||/^camp-frame-\d+$/.test(a)){
        const frames=f.frames?.(b.index,b.values)??0;
        if(frames)b.frame=a.startsWith('camp-frame-')?Math.min(frames-1,Number(a.slice(11))):(b.frame+frames+(a==='camp-prev'?-1:1))%frames;
      } else {
        let next:number[]|undefined;
        if(a==='camp-undo')next=b.history.pop();
        else if(a==='camp-reset')next=f.initial(b.index);
        else if(a.startsWith('board-'))next=f.apply(b.index,b.values,a.slice(6));
        if(next && f.valid(b.index,next) && next.some((v,k)=>v!==b.values[k])) {
          if(a!=='camp-undo'){ b.history.push([...b.values]); if(b.history.length>100)b.history.shift(); }
          b.values=next; b.hint=''; if(!j.done){ j.values=[...next]; j.actions++; }
        }
      }
      this.save(); this.renderBoard();
    } else return false;
    return true;
  }
}
