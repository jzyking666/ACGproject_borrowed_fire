import { RETURN_MAIL, hasMailEvidence, checkAddress } from './return-mail';
import { DISTRICTS } from './district-atlas';
import { STREET_NOTES } from './street-ledger';
import { SECTORS } from './field-service';
import { jobKey, TRADES, type CampaignProgress } from './campaign-progress';

interface PostalOptions {
  state: () => CampaignProgress;
  paper: (title: string, body: string, footer: string, kind: string) => void;
  save: () => void;
  seal: () => void;
}
const district = (sector: number) => Math.floor(sector / 6);
const place = (sector: number) => SECTORS[district(sector)][sector%6];
const named = (sector: number) => DISTRICTS[district(sector)].title+' · '+place(sector);
const known = (p: CampaignProgress,s: number) => TRADES.every(t=>p.jobs[jobKey(t,s)]?.done);
const foot = (action: string, label: string, primary = false, disabled = false) => `<button class="${primary?'primary':'secondary'}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const safe = (s: string) => s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c]!);

// Master dies are drawn in the 40 × 27 central field of a cancellation stamp.
const dies = [
  // A scale ticket, lower window and the small hand that can just reach the sill.
  '<path d="M12 35h29m-27 2v-17h26v16M25 20v14m-11-9h26m-18 4 2-2 5 2v5l-5 1-3-3zM15 43l3-5v-5q2-2 2 2v2l2-3 1 4-3 4"/>',
  // Reversed copper type beside the inked face of the impression.
  '<path d="M12 26l11-6 11 4-11 7zM12 26v7l11 6 11-8v-7m-11 7v8m7-6 8-3 5 11-12 2-3-8"/><text transform="translate(34 39) rotate(-10)" font-size="7.5" fill="currentColor" text-anchor="middle">市</text>',
  // A returned milk bottle and its delivery trike.
  '<path d="M20 20h6v2l-1 1v3l3 4v7h-9v-7l2-4v-3l-1-1zm1 11h5m3 7h6l-2-8h-4m4 1h4m-22 6h4"/><circle cx="16" cy="39" r="3"/><circle cx="36" cy="39" r="3"/>',
  // Twin-hole bridge postmark and notched tide gauge.
  '<path d="M12 24h20v13H12zm2 15h17m5-17h4v20h-4zm0 3h2m-2 4h3m-3 4h2m-2 4h3"/><circle cx="18" cy="30" r="2.5"/><circle cx="26" cy="30" r="2.5"/>',
  // A worn shoelace wrapped around the short pollination brush.
  '<path d="M13 39l15-13 4 4-15 13zm12-10 4 3m-7 0 4 3m2-10 4-4q7-1 7-3l1 4q-1 6-7 8zm-6 7q-12-6-9-10 4-3 6 6m4 8q5 1 8-3m-19 9-4 1"/>',
  // A round-trip ferry ticket and a seedling label with one vacant bed.
  '<path d="M10 25l17-5 4 12-17 5-1-4q3-2-1-3zm11-3 3 11m-7-5 3-1m-2 4 2-1M26 35l10-7 6 10-9 4zM34 38l2-5m-1 4q-4-1-4-3 3 0 4 3"/>',
  // Five signatures under one account; each stroke is cast slightly differently.
  '<path d="M11 22l30-2 2 18-30 3zm5 5 20-2m-19 8 1-4 2 3m2 1 1-5 2 3m2 1 1-4 1 3m2 0 2-4 1 3m2 0 1-4 2 3m-21 7 18-2"/>',
  // Sheets held by a sprung binder clip, the lost row just below the old crop.
  '<path d="M12 27l20-5 5 14-19 6zM15 26l21-2 4 12-4 1m-16 0 11-3m-13 0 12-3m-14-1 11-3M21 23l-2-4q1-3 4-2l3 5m-6 3 10-3 1 4-10 3z"/>',
];
function stamp(i: number, inked: boolean) {
  const ink = ['#913b2c','#864120','#6c502b','#345666','#366457','#465a35','#654d68','#745325'][i%8];
  const ridges = Array.from({length:24},(_,j) => `<path d="M27 5v2" transform="rotate(${j*15} 27 29)"/>`).join('');
  return `<svg class="mail-stamp ${inked?'inked':''}" style="--post-ink:${ink}" viewBox="0 0 54 58" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="27" cy="29" rx="23" ry="25" stroke-width="1.6"/><ellipse cx="27" cy="29" rx="20" ry="22" stroke-width=".6"/>${ridges}<g stroke-width="1.5">${dies[i%8]}</g></g><text x="27" y="14" text-anchor="middle" fill="currentColor" font-size="5" letter-spacing="1">第七区</text><text x="27" y="47" text-anchor="middle" fill="currentColor" font-size="4.6">投递留念</text></svg>`;
}
export class ReturnMailDesk {
  private selected = -1;
  private choices = new Map<number,{from?: number; to?: number}>();
  private bounced = false;
  constructor(private readonly options: PostalOptions) {}
  isWorking(screen: string): boolean {
    const p = this.options.state();
    return screen === 'camp-address' && this.selected >= 0 && hasMailEvidence(p,this.selected) && !p.returned.includes(this.selected);
  }
  list() {
    const p=this.options.state();
    const minutes = Math.floor(p.mailSeconds / 60);
    const elapsed = minutes > 0 ? `${minutes} 分钟` : '不足 1 分钟';
    const rows=RETURN_MAIL.map((m,i)=>{
      const done=p.returned.includes(i), ready=hasMailEvidence(p,i);
      return `<button class="mail-folder ${done?'is-posted':''}" data-action="mail-open-${i}">${stamp(i,done)}<span><b>${safe(m.title)}</b><small>${done?'重读回信':ready?'可以寻址':'札记待补'}</small></span><span class="mail-chevron" aria-hidden="true">›</span></button>`;
    }).join('');
    this.options.paper('退信寻址',`<p class="mail-intro">六禾把字迹磨花的信留了下来。翻阅信封、印痕和各处手记，补上寄出与收件的两个地名。</p><div class="mail-cabinet">${rows}</div><p class="mail-counter">已投递 ${p.returned.length} / ${RETURN_MAIL.length} · 解读用时 ${elapsed}</p>`,foot('camp-map','回到地图'),'camp-mail');
  }
  private address(i: number) {
    const item=RETURN_MAIL[i];
    if(!item) return;
    const data=this.options.state(), delivered=data.returned.includes(i);
    const ready=hasMailEvidence(data,i), choice=this.choices.get(i) ?? {};
    const clueText = (value:string | readonly string[]) => typeof value === 'string' ? safe(value) : value.map(safe).join('　');
    const paper = `<article class="mail-envelope"><div class="mail-frank">${stamp(i,delivered)}<svg viewBox="0 0 80 20" aria-hidden="true"><path d="M0 4q8-4 16 0t16 0 16 0 16 0 16 0M0 10q8-4 16 0t16 0 16 0 16 0 16 0M0 16q8-4 16 0t16 0 16 0 16 0 16 0"/></svg></div><div><h2>封面</h2><p>${clueText(item.envelope)}</p><h2>印痕</h2><p>${clueText(item.marks)}</p></div></article>`;
    if(delivered) {
      this.options.paper(item.title,`<div class="mail-case">${paper}<article class="mail-receipt"><h2>签收回信</h2><p>${safe(item.reply)}</p><div>${named(item.from)} <span>→</span> ${named(item.to)}</div><p class="mail-annotation">${safe(item.explanation)}</p></article></div>`,foot('mail-list','回信柜',true),'camp-address'); return;
    }
    const notebook = item.candidates.map(s=>`<article><h3>${named(s)}</h3><p>${known(data,s)?safe(STREET_NOTES[district(s)][s%6]):'这段街道还没有交来手记。'}</p></article>`).join('');
    const missing = item.evidence.filter(s=>!known(data,s));
    const picker=(role:'from'|'to',label:string) => `<div class="mail-picker" role="group" aria-label="${label}"><h3>${label}</h3><div>${item.candidates.map(s=>`<button data-action="mail-${role}-${s}" aria-pressed="${choice[role]===s}">${place(s)}</button>`).join('')}</div></div>`;
    const controls = ready ? `<div class="mail-address">${picker('from','寄出地')}${picker('to','收件地')}<button class="mail-swap" data-action="mail-swap" ${choice.from===undefined && choice.to===undefined?'disabled':''}>对调寄收 ↔</button></div>` :
      `<p class="mail-missing">去 ${missing.map(named).join('、')} 补齐街段手记，即可投递。</p>`;
    this.options.paper(item.title,`<div class="mail-case">${paper}<section class="mail-evidence"><h2>街段手记</h2><div>${notebook}</div></section></div>${controls}${this.bounced?'<p class="mail-bounce" role="status">退回。再对照封面的寄出痕迹和收件人要找的物件。</p>':''}`,foot('mail-list','回信柜')+(ready?foot('mail-send','投递',true,choice.from===undefined||choice.to===undefined||choice.from===choice.to):''),'camp-address');
  }
  handle(action:string,screen:string): boolean {
    if(screen!=='camp-mail'&&screen!=='camp-address') return false;
    const open=/^mail-open-(\d+)$/.exec(action);
    if(open && screen==='camp-mail') {
      const index=Number(open[1]); if(!RETURN_MAIL[index])return false;
      this.selected=index; this.bounced=false; this.address(index);return true;
    }
    if(action==='mail-list') { this.list(); return true; }
    if(screen!=='camp-address'||!RETURN_MAIL[this.selected]) return false;
    const i=this.selected, m=RETURN_MAIL[i], p=this.options.state();
    if(!this.isWorking(screen)) return action==='mail-send';
    const choice=this.choices.get(i) ?? {};
    const select = /^mail-(from|to)-(\d+)$/.exec(action);
    if(select) {
      const candidate=Number(select[2]);
      if(!m.candidates.includes(candidate)) return false;
      choice[select[1] as 'from'|'to']=candidate; this.bounced=false;
    } else if(action==='mail-swap') {
      [choice.from,choice.to]=[choice.to,choice.from]; this.bounced=false;
    } else if(action==='mail-send') {
      if(choice.from===undefined||choice.to===undefined||choice.from===choice.to) return true;
      if(checkAddress(i,choice.from,choice.to)) {
        p.returned.push(i); this.choices.delete(i); this.bounced=false;
        this.options.save(); this.options.seal(); this.address(i); return true;
      }
      this.bounced=true;
    } else return false;
    this.choices.set(i,choice); this.address(i); return true;
  }
}
