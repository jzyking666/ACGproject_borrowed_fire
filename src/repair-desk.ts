import { roomPlan } from './chapters';
import { LEVELS } from './levels';
import { createRepair, REPAIRS, type RepairOrder } from './repairs';
import type { SaveData } from './storage';

export function repairList(data: SaveData): string {
  return `<p class="dialog-copy">线路已经装好，使用它的人却遇到了麻烦。选一封报修单，从他们看见的现象查起。</p>
    <div class="dispatch-list">${REPAIRS.map((order, index) => {
      const best = data.repairBest[order.id], open = !!data.repairDrafts[order.id];
      return `<button class="dispatch-row" data-state="${open ? 'working' : best === undefined ? 'new' : 'filed'}" data-action="letter-${order.id}"><span class="dispatch-no">${String(index + 1).padStart(2, '0')}</span><span><strong>${order.title}</strong><small>${order.client}</small></span><span class="dispatch-status">${open ? '续修' : best === undefined ? '待接单' : best <= order.budget ? '精修签收' : '已签收'}</span></button>`;
    }).join('')}</div>`;
}

export function repairLetter(order: RepairOrder, data: SaveData): string {
  const best = data.repairBest[order.id];
  return `<article class="dispatch-letter"><div class="dispatch-correspondence"><header><span>报修人</span><b>${order.client}</b></header>
    <blockquote>${order.symptom}</blockquote></div>
    <div class="dispatch-spec">${roomPlan(createRepair(order).level)}<div><small>机房 ${String(order.level + 1).padStart(2, '0')} · ${LEVELS[order.level].name}</small><p>${order.objective}</p></div></div>
    <p class="dispatch-budget">精修目标 <b>${order.budget} 次操作</b>${best !== undefined ? ` · 最佳 ${best} 次` : ''}</p></article>
    ${best !== undefined ? signedReply(order) : ''}
    <p class="dispatch-help">空格／手柄 X 观察，E／A 拿放，Q／B 转镜。拿、放、转镜和回声操作各记一次。走动、等待、开关电源免费。超出目标仍可交单。</p>`;
}

export function signedReply(order: RepairOrder): string {
  return `<section class="dispatch-reply"><h2>完工回信</h2><blockquote>${order.reply}</blockquote><p>—— ${order.client}</p></section>`;
}
