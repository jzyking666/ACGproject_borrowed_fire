import { ROUTE_EN } from './street-route';
import { TRAM_EN } from './last-tram';
import { TICKET_EN } from './tram-ticket';
import { CONTENT_EN } from './locale-content';
import { UI_EN } from './locale-ui';

export type Language = 'zh-CN' | 'en';

let current: Language = 'zh-CN';
const words = new Map(Object.entries({ ...CONTENT_EN, ...UI_EN, ...TRAM_EN, ...TICKET_EN, ...ROUTE_EN }));
const translatable = /[\p{Script=Han}，。、：；？！「」（）]/u;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Longest first so a full sentence wins over a word or a board symbol.
const fragments = new RegExp([...words.keys()].filter(Boolean).sort((a, b) => b.length - a.length)
  .map(escape).join('|'), 'gu');
const punctuation: Record<string,string> = { '，': ', ', '。': '. ', '、': ', ', '：': ': ', '；': '; ', '？': '? ', '！': '! ', '「': '“', '」': '”', '（': ' (', '）': ') ' };
const compass: Record<string,string> = { 西: 'W', 东: 'E', 南: 'S', 北: 'N' };
const roman: Record<string,string> = { 一: 'I', 二: 'II', 三: 'III', 四: 'IV', 五: 'V', 六: 'VI' };
const lineName = (letter: string) => 'ABCDE'['甲乙丙丁戊'.indexOf(letter)];

function english(source: string): string {
  const literal = words.get(source);
  if (literal !== undefined) return literal;
  // These live readings change word order in English. Keep the numbers, IDs
  // and route marks from the simulation, including displayed leading zeroes.
  let s = source
    .replace(/推演中的实载脉冲沿甲路运行。当前 ([甲乙丙丁戊、]+) 路没有通过端口联检，出口保持待机。/g, (_, lines: string) => {
      const failed = lines.split('、').map(lineName);
      const list = failed.length < 2 ? failed[0] : failed.slice(0, -1).join(', ') + ' and ' + failed.at(-1);
      return 'The live forecast pulse follows line A. ' + (failed.length === 1 ? 'Line ' : 'Lines ') + list + (failed.length === 1 ? ' has' : ' have') + ' failed inspection. The exit stays closed.';
    })
    .replace(/([甲乙丙丁戊])路实测 · (.+?) · ([冷暖])光　目标 ([西东南北]) (\d+) ([冷暖])光/g, (_, line: string, actual: string, phase: string, side: string, port: string, required: string) =>
      'Line ' + lineName(line) + ' measured ' + actual + ' (' + (phase === '冷' ? 'cool' : 'warm') + ') · target ' + compass[side] + port + ' (' + (required === '冷' ? 'cool' : 'warm') + ')')
    .replace(/([甲乙丙丁戊])路校线 ·/g, (_, c: string) => 'Test line ' + lineName(c) + ' ·')
    .replace(/本单已用 (\d+) 次操作 · 精修目标 (\d+) 次/g, 'Actions used: $1 · Precision target: $2')
    .replace(/转动 ([A-Z]) 号轴座镜/g, 'Turn mirror mount $1')
    .replace(/([西东南北])\s*(\d+)/g, (_, c: string, n: string) => ' '+compass[c]+n+' ')
    .replace(/([甲乙丙丁戊])(?=[✓○×])/g, (_, c: string) => lineName(c))
    .replace(/(单班|双班) · 第 (\d+) 拍发/g, (_, n: string, beat: string) => (n === '单班' ? 'Single' : 'Double') + ' service · departs on beat ' + beat)
    .replace(/(定位第|查第)\s*(\d+)\s*拍/g, 'Inspect beat $2')
    .replace(/第 ([\d、]+) 拍封航/g, (_, beats: string) => 'Closed on beat' + (beats.includes('、') ? 's ' : ' ') + beats.replaceAll('、', ', '))
    .replace(/第\s*(\d+)\s*拍/g, 'Beat $1')
    .replace(/(\d+) 拍靠岸/g, 'Docks on beat $1')
    .replace(/整圈有 (\d+) 处冲突。/g, (_, n: string) => n+' conflict'+(n==='1'?'':'s')+' over the full cycle.')
    .replace(/([\p{Script=Han}]+)遇到封航的 ([A-Z]) 闸。/gu, (_, boat: string, lock: string) => (words.get(boat) ?? boat) + ' hit closed lock ' + lock + '.')
    .replace(/([\p{Script=Han}]+)与([\p{Script=Han}]+?)(争用|对向驶入) ([A-Z]) 闸。/gu, (_, a: string, b: string, mode: string, lock: string) => (words.get(a) ?? a) + ' and ' + (words.get(b) ?? b) + (mode === '争用' ? ' both claim lock ' : ' enter from opposite ends of lock ') + lock + '.')
    .replace(/([A-Z]) 闸/g, ' lock $1 ')
    .replace(/(提前|推迟)([\p{Script=Han}]+?)一拍/gu, (_, op: string, boat: string) => (op === '提前' ? 'Advance ' : 'Delay ') + (words.get(boat) ?? boat) + ' by one beat')
    .replace(/先把「([^」]+)」(提前|推迟)一拍，给交错的船留出位置。/g, (_, boat: string, op: string) =>
      (op === '提前' ? 'Advance ' : 'Delay ') + (words.get(boat) ?? boat) + ' by one beat to let the other boat pass.')
    .replace(/先给「([^」]+)」换一条航道，再看它占用哪些闸口。/g, (_, boat: string) => 'Reroute ' + (words.get(boat) ?? boat) + ', then check which locks it uses.')
    .replace(/与 (.+) 接同一根线/g, 'Match the wire at $1')
    .replace(/([A-Z]) 梭后/g, 'After shuttle $1')
    .replace(/([A-Z]) 梭，转至([ⅠⅡⅢ])档/g, 'Shuttle $1: turn to stop $2')
    .replace(/([A-Z]) 梭，离合未接通/g, 'Shuttle $1: clutch disengaged')
    .replace(/(\d+) 道(?=\s|$)/g, 'lane $1')
    .replace(/([一二三四五六])(?=[／/])/g, (_, n: string) => roman[n]+' ');
  s = s.replace(fragments, key => ' ' + words.get(key)! + ' ');
  // Unknown Chinese can be a player-supplied name. Keep it intact if the
  // catalogue cannot account for the entire label.
  if (/\p{Script=Han}/u.test(s)) return source;
  return s.replace(/[，。、：；？！「」（）]/g, c => punctuation[c])
    .replace(/[\s\u3000]+/g, ' ').replace(/ +([,.:;!?%)”])/g, '$1').replace(/([(“]) +/g, '$1')
    .trim();
}

/** Translates display copy only. IDs, player input, saves and simulation values
 * always stay in their original representation. */
export function translateText(text: string, language: Language = current): string {
  if (language !== 'en' || !translatable.test(text)) return text;
  const source = text.trim();
  const leading = text.slice(0, text.indexOf(source));
  const trailing = text.slice(leading.length + source.length);
  return leading + english(source) + trailing;
}

interface Version { original: string; rendered: string }
const attributes = ['aria-label', 'aria-description', 'alt', 'placeholder', 'title'] as const;
const excluded = 'script,style,[contenteditable]:not([contenteditable="false"]),[translate="no"],[data-localized]';
const inline = 'kbd,b,strong,small,i,em,span,code';

function localizedText(node: Text, source: string, lang: Language) {
  let result = translateText(source, lang);
  if (lang !== 'en' || source === result) return result;
  // Chinese copy often joins a keycap or an emphasized word without a space.
  if (/^[\w(]/.test(result) && node.previousElementSibling?.matches(inline) && node.previousSibling === node.previousElementSibling) result = ' ' + result;
  if (/[\w)]$/.test(result) && node.nextElementSibling?.matches(inline) && node.nextSibling === node.nextElementSibling) result += ' ';
  return result;
}

export function installLocale(root: HTMLElement, language: Language) {
  const textVersions = new WeakMap<Text, Version>();
  const attrVersions = new WeakMap<Element, Map<string, Version>>();
  const doc = root.ownerDocument;
  let active: Language = language;
  let connected = true;
  current = active;
  doc.documentElement.lang = active;

  function applyText(node: Text) {
    const seen = textVersions.get(node);
    const original = seen && seen.rendered === node.data ? seen.original : node.data;
    const rendered = localizedText(node, original, active);
    if (node.data !== rendered) node.data = rendered;
    if (rendered === original) textVersions.delete(node);
    else textVersions.set(node, { original, rendered });
  }
  function applyAttribute(el: Element, key: string) {
    const value = el.getAttribute(key);
    let versions = attrVersions.get(el);
    if (value === null) { versions?.delete(key); return; }
    const seen = versions?.get(key);
    const original = seen && seen.rendered === value ? seen.original : value;
    const rendered = translateText(original, active);
    if (value !== rendered) el.setAttribute(key, rendered);
    if (original === rendered) versions?.delete(key);
    else {
      if (!versions) { versions = new Map(); attrVersions.set(el, versions); }
      versions.set(key, { original, rendered });
    }
  }
  function walk(node: Node) {
    if (node.nodeType === 3) { applyText(node as Text); return; }
    if (node.nodeType !== 1) return;
    const el = node as Element;
    if (el.matches(excluded)) return;
    for (const key of attributes) if (el.hasAttribute(key)) applyAttribute(el, key);
    if (el.matches('textarea')) return;
    for (let child = el.firstChild; child; child = child.nextSibling) walk(child);
  }
  function eligible(node: Node) {
    const parent = node.nodeType === 1 ? node as Element : node.parentElement;
    return root.contains(node) && !!parent && !parent.closest(excluded) && !(node.nodeType === 3 && parent.closest('textarea'));
  }
  function beginWatching() {
    if (connected && active === 'en') observer.observe(root, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: [...attributes],
    });
  }
  function applyChanges(records: MutationRecord[]) {
    // The writes below belong to the translator, not to the game. Disconnect
    // during this synchronous pass to avoid observing them on the next frame.
    observer.disconnect();
    try {
      const branches = new Set<Node>();
      for (const m of records) {
        if (m.type === 'childList') { for (const added of m.addedNodes) branches.add(added); }
        else if (m.type === 'characterData') branches.add(m.target);
        else if (m.attributeName && eligible(m.target)) applyAttribute(m.target as Element, m.attributeName);
      }
      for (const node of branches) if (eligible(node)) walk(node);
    } finally { beginWatching(); }
  }
  const observer = new MutationObserver(applyChanges);
  if (active === 'en') { walk(root); beginWatching(); }
  return {
    set(next: Language) {
      if (next === active) return;
      observer.disconnect();
      active = current = next;
      doc.documentElement.lang = next;
      try { walk(root); } finally { beginWatching(); }
    },
    flush() {
      const records = observer.takeRecords();
      if (records.length) applyChanges(records);
    },
    disconnect() { connected = false; observer.disconnect(); },
  };
}
