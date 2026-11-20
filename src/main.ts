import './style.css';
import { Simulation } from './engine';
import { LEVELS } from './levels';
import { View } from './view';
import { Sound } from './audio';
import { defaults, exportSave, importSave, parseSave, STORAGE_KEY, type SaveData } from './storage';
import { BADGES, COATS, HELMETS } from './appearance';
import { Controller } from './controller';
import { menuMarkup, ROOT_MARKUP } from './ui';

const app = document.querySelector<HTMLDivElement>('#app')!;
const fmt = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const stars = (n: number) => `<span class="stars" aria-label="${n} 星">${'★'.repeat(n)}<span>${'☆'.repeat(3 - n)}</span></span>`;

function boot() {
  app.innerHTML = ROOT_MARKUP;
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const sound = new Sound();
  let data: SaveData;
  try { data = parseSave(localStorage.getItem(STORAGE_KEY)); } catch { data = defaults(); }
  sound.mute(data.settings.muted);
  sound.setVolume(data.settings.volume); sound.setMusic(data.settings.music);
  const view = new View($('viewport')); view.setQuality(data.settings.highQuality);
  view.setAppearance(data.appearance);
  document.documentElement.style.fontSize = `${16 * data.settings.textScale}px`;
  let sim = new Simulation(LEVELS[2]); sim.mirrors = structuredClone(sim.level.solution);
  for (let i = 0; i < 150; i++) sim.step(.1, false);
  view.load(sim.level);
  let screen = 'menu', observe = false, hintCount = 0, hasRun = false, photoDof = true, usingPad = false;
  let pendingImport: SaveData | undefined;
  const modalHistory: string[] = [];
  let toastTimer = 0, hudTimer = 0, autoTimer = 0, saveWarning = false;
  const keys = new Set<string>(); let cameraDrag = false, previousX = 0;
  const controller = new Controller();
  let lastTime = performance.now(), frameCount = 0;
  const toast = (message: string) => { $('toast').textContent = message; $('toast').classList.add('show'); toastTimer = 3.5; };
  const persist = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { if (!saveWarning) { saveWarning = true; toast('浏览器未允许本地存档；本次仍可游玩。'); } } };
  const checkpoint = (notify = false) => {
    if (hasRun && !sim.won) { data.checkpoint = sim.snapshot(); data.hintCount = hintCount; persist(); if (notify) toast('断点已保存 · 包含装置布局与脉冲状态'); }
  };
  const setScreen = (value: string) => {
    screen = value; keys.clear(); app.dataset.screen = value || 'playing';
    $('overlay').className = `overlay ${value === '' ? 'closed' : value === 'menu' ? 'home' : value === 'photo' ? 'photo-overlay' : 'modal-backdrop'}`;
    $('hud').hidden = !hasRun || value === 'menu' || value === 'photo' || value === 'wardrobe';
    $('pause-btn').hidden = value === 'menu';
    view.setPresentation(value === 'menu' ? 'menu' : value === 'wardrobe' ? 'wardrobe' : 'game');
  };
  const button = (action: string, label: string, cls = 'secondary') => `<button class="${cls}" data-action="${action}">${label}</button>`;
  function menu() {
    if (hasRun && !sim.won) checkpoint(); modalHistory.length = 0; setScreen('menu');
    $('sound-btn').textContent = `声音 ${data.settings.muted ? '关' : '开'}`;
    $('overlay').innerHTML = menuMarkup(data);
  }
  function load(id: number, restore = false) {
    sound.unlock(); sim = new Simulation(LEVELS[id]); hintCount = 0;
    if (restore && data.checkpoint?.level === id) { sim.restore(data.checkpoint); hintCount = data.hintCount ?? 0; }
    hasRun = true; observe = false; autoTimer = 0; modalHistory.length = 0; view.load(sim.level); view.resetCamera();
    $('room-index').textContent = String(id + 1).padStart(2, '0');
    $('room-name').textContent = sim.level.name; $('room-subtitle').textContent = sim.level.subtitle;
    $('objective').textContent = sim.level.repeats === 1 ? '让接收环通电，然后抵达出口。' : `让同一颗脉冲重复供电，验证所有接收环的循环。${sim.level.offGrid ? '完成后关闭发射器，再抵达出口。' : '保持供电并抵达出口。'}`;
    $('entry-number').textContent = ` / ${String(id + 1).padStart(2, '0')}`;
    $('briefing-text').textContent = sim.level.briefing; $('lesson').textContent = sim.level.lesson;
    $('hint-text').hidden = hintCount === 0; $('hint-text').textContent = sim.level.hints[Math.max(0, hintCount - 1)];
    $('briefing').hidden = hintCount === 0;
    $('world-labels').innerHTML = sim.level.receivers.map((r, i) => `<span data-receiver="${r.id}" class="world-label"><b>${i + 1}</b><span>${r.name}</span></span>`).join('');
    setScreen(''); $('overlay').innerHTML = ''; updateHud(); checkpoint();
    toast(restore ? '夜班断点已恢复' : `进入机房 ${String(id + 1).padStart(2, '0')} · ${sim.level.name}`);
  }
  function modal(title: string, body: string, footer: string, kind = 'dialog') {
    const focusedAction = screen === kind ? (document.activeElement as HTMLElement | null)?.dataset.action : undefined;
    const scrollTop = screen === kind ? $('overlay').querySelector('.dialog-body')?.scrollTop ?? 0 : 0;
    if (screen !== kind) modalHistory.push(screen);
    const closeAction = kind === 'pause' ? 'resume' : kind === 'win' ? 'menu' : 'back';
    setScreen(kind); $('overlay').innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-heading"><div><p class="dialog-context">第七区维修组</p><h1 id="dialog-title">${title}</h1></div><button class="dialog-close" data-action="${closeAction}" aria-label="关闭${title}">×</button></header><div class="dialog-body">${body}</div><footer class="dialog-actions">${footer}</footer></section>`;
    const dialogBody = $('overlay').querySelector<HTMLElement>('.dialog-body')!;
    requestAnimationFrame(() => {
      if (!dialogBody.isConnected) return;
      const buttons = [...$('overlay').querySelectorAll<HTMLButtonElement>('button:not(:disabled):not(.dialog-close)')];
      const primary = kind === 'pause' || kind === 'win' ? $('overlay').querySelector<HTMLButtonElement>('.dialog-actions .primary') : null;
      const focused = buttons.find(b => focusedAction && b.dataset.action === focusedAction) ?? primary ?? buttons[0];
      dialogBody.scrollTop = scrollTop;
      focused?.focus({ preventScroll: true });
    });
  }
  function pause() {
    if (!hasRun || sim.won) return; checkpoint();
    modal('暂停', `<p class="dialog-copy">当前进度已自动保存。</p><nav class="pause-menu" aria-label="暂停选项">${button('saves', '存档管理')}${button('ledger', '工单')}${button('wardrobe', '维修员')}${button('photo', '拍照')}${button('settings', '设置')}${button('levels', '选择机房')}</nav>`, button('menu', '返回主菜单') + button('resume', '继续', 'primary'), 'pause');
  }
  function levels() {
    if (screen === '') checkpoint();
    const cards = LEVELS.map((l, i) => {
      const rec = data.records[i], unlocked = i <= data.unlocked;
      return `<button class="level-card ${unlocked ? '' : 'locked'}" data-level="${i}" ${unlocked ? '' : 'disabled'}><span class="level-num">${String(i + 1).padStart(2, '0')}</span><span><strong>${l.name}</strong><small>${unlocked ? l.offGrid ? '循环供电 · 关闭发射器' : l.repeats > 1 ? '循环供电' : '基础维修' : '完成上一机房后解锁'}</small></span>${rec ? stars(rec.stars) : `<span class="level-lock">${unlocked ? '进入' : '未解锁'}</span>`}</button>`;
    }).join('');
    modal('选择机房', `<div class="level-grid">${cards}</div>`, button('back', '返回'), 'levels');
  }
  function settings() {
    const row = (action: string, name: string, help: string, value: string) => `<button data-action="${action}"><span class="setting-label">${name}<small>${help}</small></span><span class="setting-value">${value}<span aria-hidden="true">›</span></span></button>`;
    const group = (title: string, rows: string) => `<section class="settings-section"><h2>${title}</h2>${rows}</section>`;
    const audio = row('sound', '声音开关', '控制所有游戏声音', data.settings.muted ? '关' : '开') + row('volume', '音量', '每次调整 10%', `${Math.round(data.settings.volume * 100)}%`) + row('music', '背景音乐', '配乐随设备供电状态变化', data.settings.music ? '开' : '关');
    const graphics = row('quality', '高画质', '关闭后降低耗电，并停用辉光与景深', data.settings.highQuality ? '开' : '关') + row('environment', '环境照明', '显示金属表面的环境反射', data.settings.environment ? '开' : '关') + row('dof', '游戏景深', '焦点跟随角色；关闭时全场保持清晰', data.settings.depthOfField ? data.settings.highQuality ? '开' : '低画质停用' : '关');
    const reading = row('motion', '减少动态效果', '关闭相机震动和角色浮动', data.settings.reducedMotion ? '开' : '关') + row('text-size', '文字大小', '调整界面文字与操作说明', `${Math.round(data.settings.textScale * 100)}%`);
    modal('设置', `<div class="settings-list">${group('声音', audio)}${group('画面', graphics)}${group('操作与阅读', reading)}</div><p class="dialog-copy">${navigator.getGamepads?.().some(p => p?.mapping === 'standard') ? '已连接手柄。' : '手柄未连接。连接后按任意键激活。'}</p>`, button('help', '操作指南') + button('back', '返回', 'primary'), 'settings');
  }
  function help() {
    const bindings = (rows: [string, string][]) => `<dl class="binding-list">${rows.map(([input, description]) => `<div><dt>${input}</dt><dd>${description}</dd></div>`).join('')}</dl>`;
    const keyboard = bindings([
      ['<kbd>WASD</kbd> / 方向键', '移动'], ['<kbd>E</kbd>', '拿取、放下；切换附近发射器'], ['<kbd>Q</kbd>', '旋转手持或附近反射器'],
      ['<kbd>Space</kbd>', '观察：暂停并预览弹道'], ['<kbd>Shift</kbd> + 移动', '精细移动'], ['<kbd>H</kbd>', '分步提示；第三步显示参考轮廓'],
      ['<kbd>R</kbd> / <kbd>Esc</kbd>', '重试 / 暂停'], ['<kbd>I</kbd> / <kbd>J</kbd>', '维修工单 / 存档'], ['<kbd>F2</kbd>', '拍照与图片导出'],
      ['右键 / 滚轮', '转动相机 / 缩放'], ['<kbd>C</kbd>', '相机复位'],
    ]);
    const gamepad = bindings([
      ['左摇杆 / 方向键', '移动'], ['<kbd>A</kbd> / 下方键', '拿取、放下'], ['<kbd>B</kbd> / 右方键', '旋转'], ['<kbd>X</kbd> / 左方键', '观察'],
      ['<kbd>Y</kbd> / 上方键', '提示'], ['右摇杆', '调整视角与缩放'], ['<kbd>Start</kbd>', '暂停、继续'], ['菜单方向键', '选择选项；A 确认，B 返回'],
    ]);
    modal('值班手册', `<div class="help-grid"><section><h2>键盘与鼠标</h2>${keyboard}</section><section><h2>实体手柄</h2>${gamepad}<p class="dialog-copy">首次连接后按任意键激活。支持浏览器标准映射手柄。</p></section></div><section class="manual-note"><h2>维修准则</h2><p>接收环需要定期补充电力。后续机房要求同一颗脉冲重复经过；超时会失去循环验证。关闭发射器不会清除已有脉冲。受击会返回起点，但保留你搭建的装置。</p><p>完成目标后，空手进入青色出口。每关一颗完成星，另两颗分别奖励无伤、未使用提示。提示不影响解锁。</p></section>`, button('back', '知道了', 'primary'), 'help');
  }
  function hint() {
    if (!hasRun || screen !== '') return;
    hintCount = Math.min(3, hintCount + 1); $('hint-text').hidden = false; $('briefing').hidden = false;
    $('hint-text').textContent = sim.level.hints[hintCount - 1]; sound.play('ui'); checkpoint();
  }
  function complete() {
    const n = 1 + Number(sim.hits === 0) + Number(hintCount === 0), rec = data.records[sim.level.id];
    if (!rec || n > rec.stars || n === rec.stars && sim.elapsed < rec.seconds) data.records[sim.level.id] = { stars: n, seconds: sim.elapsed, hits: sim.hits, moves: sim.moves };
    data.unlocked = Math.max(data.unlocked, Math.min(LEVELS.length - 1, sim.level.id + 1));
    delete data.checkpoint; delete data.hintCount; persist();
    const last = sim.level.id === LEVELS.length - 1;
    modal(last ? '夜班完成' : '维修完成', `<div class="result-stars">${stars(n)}</div><p class="dialog-copy">${last ? '七间机房已恢复供电。夜班结束。' : `${sim.level.name} · 设备运行正常。`}</p><div class="result-stats"><div><b>${fmt(sim.elapsed)}</b><span>维修用时</span></div><div><b>${sim.hits}</b><span>受击次数</span></div><div><b>${sim.moves}</b><span>装置操作</span></div></div><p class="result-note">完成 ★ · 无伤 ${sim.hits === 0 ? '★' : '☆'} · 未使用提示 ${hintCount === 0 ? '★' : '☆'}</p>`, (last ? button('levels', '夜班记录', 'primary') : button('next', '下一间机房', 'primary')) + button('restart', '重新维修') + button('menu', '返回主菜单'), 'win');
  }
  function wardrobe() {
    const choices = (group: string, values: readonly string[], selected: number) => values.map((name, i) => `<button data-action="${group}-${i}" aria-pressed="${selected === i}" class="choice ${selected === i ? 'chosen' : ''}">${name}</button>`).join('');
    modal('维修员', `<p class="dialog-copy">更换工作服、头部配件和胸前标记。外观不影响能力。</p><section class="outfit-group"><h2>工作服</h2><div class="swatches">${COATS.map((c, i) => `<button data-action="coat-${i}" aria-label="${c.name}" aria-pressed="${data.appearance.coat === i}" class="swatch ${data.appearance.coat === i ? 'chosen' : ''}" style="--swatch:${c.hex}"><i></i><span>${c.name}</span></button>`).join('')}</div></section><section class="outfit-group"><h2>头部配件</h2><div class="choices">${choices('helmet', HELMETS, data.appearance.helmet)}</div></section><section class="outfit-group"><h2>胸前标记</h2><div class="choices">${choices('badge', BADGES, data.appearance.badge)}</div></section><p class="dialog-copy outfit-saved">外观会自动保存。</p>`, button('back', '完成', 'primary'), 'wardrobe');
  }
  function saves() {
    if (screen === '') checkpoint();
    const date = (iso: string) => new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const canSave = hasRun && !sim.won;
    const rows = data.slots.map((slot, i) => `<section class="save-slot"><div><b>存档 ${i + 1}</b><p>${slot ? `${String(slot.snapshot.level + 1).padStart(2, '0')} ${LEVELS[slot.snapshot.level].name} · ${fmt(slot.snapshot.elapsed)}` : '空存档'}</p><small>${slot ? date(slot.savedAt) : '进入机房后可以保存'}</small></div><div class="slot-actions"><button data-action="save-slot-${i}" ${canSave ? '' : 'disabled'}>${slot ? '覆盖' : '保存'}</button><button data-action="load-slot-${i}" ${slot ? '' : 'disabled'}>读取</button><button data-action="delete-slot-${i}" ${slot ? '' : 'disabled'} aria-label="删除存档 ${i + 1}">删除</button></div></section>`).join('');
    modal('存档管理', `<div class="autosave-row"><div><b>自动存档</b><p>${data.checkpoint ? `${LEVELS[data.checkpoint.level].name} · ${fmt(data.checkpoint.elapsed)}` : '暂无自动存档'}</p></div><button data-action="load-auto" ${data.checkpoint ? '' : 'disabled'}>读取</button></div><div class="save-slots">${rows}</div><p class="dialog-copy">手动存档独立于自动存档。可以导出文件，带到其他浏览器继续。</p>`, button('export', '导出存档文件') + button('import', '导入存档文件') + button('back', '返回', 'primary'), 'saves');
  }
  function ledger() {
    if (screen === '') checkpoint();
    const current = hasRun ? `<section class="work-order"><h2>${String(sim.level.id + 1).padStart(2, '0')} ${sim.level.name}</h2><p>${sim.level.lesson}</p><ul>${sim.level.receivers.map(r => `<li><span>${r.name}</span><b>${sim.receivers[r.id].charge > 0 ? `${Math.min(sim.receivers[r.id].hits, sim.level.repeats)} / ${sim.level.repeats} 次` : '待供电'}</b></li>`).join('')}${sim.level.offGrid ? `<li><span>发射器离网</span><b>${sim.sourceOn ? '待关闭' : '已关闭'}</b></li>` : ''}</ul></section>` : '<p class="dialog-copy">进入机房后，这里会显示当前维修任务。</p>';
    const records = LEVELS.map(l => { const r = data.records[l.id]; return `<tr><td>${String(l.id + 1).padStart(2, '0')}</td><th>${l.name}</th><td>${r ? fmt(r.seconds) : '—'}</td><td>${r ? stars(r.stars) : '未完成'}</td></tr>`; }).join('');
    modal('维修工单', `${current}<h2 class="section-title">夜班记录</h2><table class="record-table"><thead><tr><th>机房</th><th>任务</th><th>最佳时间</th><th>记录</th></tr></thead><tbody>${records}</tbody></table>`, button('help', '操作指南') + button('back', '返回', 'primary'), 'ledger');
  }
  function photo() {
    if (!hasRun) { toast('进入机房后可以拍照。'); return; }
    if (screen !== 'photo') modalHistory.push(screen);
    setScreen('photo');
    $('overlay').innerHTML = `<section class="photo-toolbar"><b>拍照</b><span>${usingPad ? '右摇杆调整相机' : '右键转动 · 滚轮缩放'}</span><button data-action="photo-dof" aria-pressed="${photoDof && data.settings.highQuality}" ${data.settings.highQuality ? '' : 'disabled'}>景深 ${data.settings.highQuality ? photoDof ? '开' : '关' : '需高画质'}</button><button data-action="capture">保存图片</button><button data-action="back">返回 <kbd>${usingPad ? 'B' : 'Esc'}</kbd></button></section>`;
  }
  function download(name: string, content: string, type: string) {
    const dataURL = content.startsWith('data:'), url = dataURL ? content : URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    if (!dataURL) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function updateHud() {
    const labels = usingPad ? ['左摇杆', 'A', 'B', 'X', 'Y'] : ['WASD', 'E', 'Q', 'Space', 'H'];
    document.querySelectorAll<HTMLElement>('[data-control]').forEach((element, i) => element.textContent = labels[i]);
    $('camera-controls').textContent = usingPad ? '右摇杆调整视角与缩放 · Start 暂停' : '右键拖动视角 · 滚轮缩放 · C 复位';
    $('timer').textContent = fmt(sim.elapsed); $('hits').textContent = `${sim.hits}`;
    $('lesson').hidden = sim.elapsed > 20 && !observe;
    $('receivers').innerHTML = sim.level.receivers.map((r, i) => {
      const s = sim.receivers[r.id], live = s.charge > 0;
      return `<div class="receiver-row ${live ? 'powered' : ''}"><span class="receiver-icon">${i + 1}</span><div><b>${r.name}</b><small>${live ? `${s.charge.toFixed(1)} 秒 · ${Math.min(s.hits, sim.level.repeats)}/${sim.level.repeats}` : '等待供电'}</small><div class="charge-track"><i style="width:${s.charge / r.ttl * 100}%"></i></div></div><span class="receiver-check">${s.hits >= sim.level.repeats && live ? '✓' : '○'}</span></div>`;
    }).join('');
    $('source-state').innerHTML = `<span class="status-dot ${sim.sourceOn ? 'red' : ''}"></span> 发射器${sim.sourceOn ? '在线' : '已关闭'} <b>${sim.exitOpen ? '出口已开放 ↗' : sim.stable && sim.level.offGrid ? '请关闭发射器' : '出口待机'}</b>`;
    $('observe-banner').hidden = !observe;
    $('observe-banner').querySelector('span')!.textContent = usingPad ? 'X 继续' : '空格继续';
    const nearest = sim.nearest;
    $('interaction').innerHTML = observe ? '<kbd>Space</kbd> 继续时间 · 观察弹道后再调整装置' : sim.carried ? `<kbd>E</kbd> ${sim.validCell(sim.targetCell) ? '放置反射器' : '此处无法放置'} <span>·</span> <kbd>Q</kbd> 旋转 ${sim.carried.slash ? '/' : '\\'}` : nearest === 'source' ? `<kbd>E</kbd> ${sim.sourceOn ? '关闭' : '开启'}发射器` : nearest ? '<kbd>E</kbd> 拿起反射器 <span>·</span> <kbd>Q</kbd> 原地旋转' : sim.exitOpen ? '循环已验证 · 空手抵达青色出口 ↗' : '';
    $('interaction').classList.toggle('visible', !!$('interaction').innerHTML);
    if (usingPad) $('interaction').querySelectorAll('kbd').forEach(k => { k.textContent = k.textContent === 'Space' ? 'X' : k.textContent === 'E' ? 'A' : 'B'; });
    $('sound-btn').textContent = `声音 ${data.settings.muted ? '关' : '开'}`;
  }
  function back() {
    const previous = modalHistory.pop() ?? (hasRun ? '' : 'menu');
    setScreen(previous);
    if (previous === '') $('overlay').innerHTML = '';
    else if (previous === 'menu') menu();
    else if (previous === 'pause') pause();
    else if (previous === 'settings') settings();
    else if (previous === 'saves') saves();
    else if (previous === 'ledger') ledger();
    else if (previous === 'levels') levels();
    else if (previous === 'wardrobe') wardrobe();
    else if (previous === 'win') complete();
    else { setScreen(''); $('overlay').innerHTML = ''; }
  }
  function action(a: string) {
    sound.unlock(); sound.play('ui');
    if (a === 'continue') { if (data.checkpoint) load(data.checkpoint.level, true); else load(data.unlocked); }
    else if (a === 'menu') menu();
    else if (a === 'pause') { if (screen === '') pause(); else if (screen === 'pause') action('resume'); }
    else if (a === 'resume') { modalHistory.length = 0; setScreen(''); $('overlay').innerHTML = ''; }
    else if (a === 'restart' && hasRun) load(sim.level.id);
    else if (a === 'next') load(Math.min(LEVELS.length - 1, sim.level.id + 1));
    else if (a === 'levels') levels();
    else if (a === 'settings') settings();
    else if (a === 'help') help();
    else if (a === 'wardrobe') wardrobe();
    else if (a === 'saves') saves();
    else if (a === 'ledger') ledger();
    else if (a === 'note-close') $('briefing').hidden = true;
    else if (a === 'photo') photo();
    else if (a === 'photo-dof') { photoDof = !photoDof; photo(); }
    else if (a === 'capture') { download(`borrowed-fire-${sim.level.id + 1}.png`, view.capture(), 'image/png'); toast('图片已交给浏览器保存。'); }
    else if (a === 'load-auto' && data.checkpoint) load(data.checkpoint.level, true);
    else if (/^save-slot-[0-2]$/.test(a) && hasRun && !sim.won) {
      const i = Number(a.at(-1));
      data.slots[i] = { snapshot: sim.snapshot(), savedAt: new Date().toISOString(), hintCount, appearance: { ...data.appearance } }; persist(); saves(); toast(`存档 ${i + 1} 已保存。`);
    } else if (/^load-slot-[0-2]$/.test(a)) {
      const slot = data.slots[Number(a.at(-1))];
      if (slot) { data.checkpoint = structuredClone(slot.snapshot); data.hintCount = slot.hintCount; data.appearance = { ...slot.appearance }; view.setAppearance(data.appearance); load(slot.snapshot.level, true); }
    } else if (/^delete-slot-[0-2]$/.test(a)) {
      const i = Number(a.at(-1)); modal('删除存档', `<p class="dialog-copy">删除手动存档 ${i + 1}？自动存档不会受影响。</p>`, button(`confirm-delete-${i}`, '删除') + button('back', '取消', 'primary'), 'confirm');
    } else if (/^confirm-delete-[0-2]$/.test(a)) { data.slots[Number(a.at(-1))] = null; persist(); back(); }
    else if (a === 'export') { checkpoint(); download('borrowed-fire-save.json', exportSave(data), 'application/json'); }
    else if (a === 'import') $('save-import').click();
    else if (a === 'confirm-import' && pendingImport) {
      data = pendingImport; pendingImport = undefined; hasRun = false; view.setAppearance(data.appearance); view.setQuality(data.settings.highQuality);
      sound.mute(data.settings.muted); sound.setVolume(data.settings.volume); sound.setMusic(data.settings.music);
      document.documentElement.style.fontSize = `${16 * data.settings.textScale}px`; persist(); menu(); toast('存档已导入。');
    } else if (/^(coat|helmet|badge)-[0-9]$/.test(a)) {
      const [part, index] = a.split('-'); const i = Number(index);
      const limit = part === 'coat' ? COATS.length : part === 'helmet' ? HELMETS.length : BADGES.length;
      if (i < limit) { data.appearance[part as 'coat' | 'helmet' | 'badge'] = i; view.setAppearance(data.appearance); persist(); wardrobe(); }
    }
    else if (a === 'back') back();
    else if (a === 'save') checkpoint(true);
    else if (a === 'hint') hint();
    else if (a === 'sound') { data.settings.muted = !data.settings.muted; sound.mute(data.settings.muted); persist(); $('sound-btn').textContent = `声音 ${data.settings.muted ? '关' : '开'}`; if (screen === 'settings') settings(); }
    else if (a === 'quality') { data.settings.highQuality = !data.settings.highQuality; view.setQuality(data.settings.highQuality); persist(); settings(); }
    else if (a === 'motion') { data.settings.reducedMotion = !data.settings.reducedMotion; persist(); settings(); }
    else if (a === 'music') { data.settings.music = !data.settings.music; sound.setMusic(data.settings.music); persist(); settings(); }
    else if (a === 'volume') { data.settings.volume = data.settings.volume >= .99 ? 0 : Math.min(1, Math.round((data.settings.volume + .1) * 10) / 10); sound.setVolume(data.settings.volume); persist(); settings(); }
    else if (a === 'dof') { data.settings.depthOfField = !data.settings.depthOfField; persist(); settings(); }
    else if (a === 'environment') { data.settings.environment = !data.settings.environment; persist(); settings(); }
    else if (a === 'text-size') { data.settings.textScale = data.settings.textScale > 1 ? 1 : 1.2; document.documentElement.style.fontSize = `${16 * data.settings.textScale}px`; persist(); settings(); }
  }
  $('save-import').addEventListener('change', async e => {
    const input = e.target as HTMLInputElement, file = input.files?.[0]; if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('文件过大');
      pendingImport = importSave(await file.text());
      modal('导入存档', '<p class="dialog-copy">导入会替换当前进度和外观。建议先导出当前存档。</p>', button('confirm-import', '导入') + button('back', '取消', 'primary'), 'confirm');
    } catch { toast('无法读取这个存档文件，当前进度未改变。'); }
    input.value = '';
  });
  document.addEventListener('click', e => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action], [data-level]');
    if (!target || target instanceof HTMLButtonElement && target.disabled) return;
    if (target.dataset.level !== undefined) load(Number(target.dataset.level)); else action(target.dataset.action!);
  });
  function gameAction(a: string) {
    if (screen !== '') return;
    if (a === 'observe') { observe = !observe; sound.play('ui'); updateHud(); }
    else if (a === 'hint') hint();
    else if (!observe && a === 'interact') { const before = sim.moves; sim.interact(); if (sim.carried && before === sim.moves && !sim.validCell(sim.targetCell)) toast('前方格子被占用，朝向一块空地再放下。'); }
    else if (!observe && a === 'rotate') sim.rotate();
  }
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    usingPad = false;
    if (e.repeat && e.code === 'Escape') return;
    if (e.code === 'Tab' && screen !== '' && screen !== 'menu' && screen !== 'photo') {
      const options = [...$('overlay').querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if (options.length) { e.preventDefault(); const index = options.indexOf(document.activeElement as HTMLButtonElement); options[(index + (e.shiftKey ? -1 : 1) + options.length) % options.length].focus(); } return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && screen === '') e.preventDefault();
    if (e.code === 'Escape') { e.preventDefault(); if (screen === '') pause(); else if (screen === 'pause') action('resume'); else if (screen !== 'menu' && screen !== 'win') back(); return; }
    if (screen !== '') return;
    keys.add(e.code); if (e.repeat) return; sound.unlock();
    if (e.code === 'KeyE') gameAction('interact');
    if (e.code === 'KeyQ') gameAction('rotate');
    if (e.code === 'Space') gameAction('observe');
    if (e.code === 'KeyH') gameAction('hint');
    if (e.code === 'KeyR') action('restart');
    if (e.code === 'KeyC') view.resetCamera();
    if (e.code === 'KeyI') ledger();
    if (e.code === 'KeyJ') saves();
    if (e.code === 'F2') { e.preventDefault(); photo(); }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); if (screen === '') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { checkpoint(); if (screen === '') pause(); } });
  addEventListener('pagehide', () => checkpoint());
  const canvas = view.renderer.domElement;
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => { if (e.button === 2 && (screen === '' || screen === 'photo')) { cameraDrag = true; previousX = e.clientX; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', e => { if (cameraDrag) { view.orbit((e.clientX - previousX) * .004); previousX = e.clientX; } });
  canvas.addEventListener('pointerup', () => cameraDrag = false);
  canvas.addEventListener('wheel', e => { if (screen === '' || screen === 'photo') { e.preventDefault(); view.zoomBy(-Math.sign(e.deltaY) * .05); } }, { passive: false });
  function pollPad(dt: number): { x: number; y: number } {
    const pad = navigator.getGamepads?.().find(p => p?.mapping === 'standard');
    const input = controller.read(pad ?? undefined, dt);
    if (!pad) usingPad = false;
    else if (input.move.x || input.move.y || input.camera.x || input.camera.y || input.interact || input.rotate || input.observe || input.hint || input.pause || input.navigation) usingPad = true;
    $('pad-state').textContent = pad ? ' · 手柄已连接' : '';
    if (input.pause) { sound.unlock(); if (screen === '') pause(); else if (screen === 'pause') action('resume'); }
    if (screen === '') {
      if (input.interact) gameAction('interact'); if (input.rotate) gameAction('rotate'); if (input.observe) gameAction('observe'); if (input.hint) gameAction('hint');
      if (input.camera.x) view.orbit(input.camera.x * dt);
      if (input.camera.y) view.zoomBy(-input.camera.y * dt * .5);
    } else {
      const options = [...$('overlay').querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if (input.navigation && options.length) {
        const index = options.indexOf(document.activeElement as HTMLButtonElement);
        options[index < 0 ? input.navigation > 0 ? 0 : options.length - 1 : (index + input.navigation + options.length) % options.length].focus(); sound.play('ui');
      }
      if (screen === 'photo') { if (input.camera.x) view.orbit(input.camera.x * dt); if (input.camera.y) view.zoomBy(-input.camera.y * dt * .5); }
      if (input.confirm) {
        sound.unlock();
        const active = options.find(option => option === document.activeElement) ?? options[0]; active?.click();
      }
      if (input.back && screen !== 'menu' && screen !== 'win') { if (screen === 'pause') action('resume'); else back(); }
    }
    return input.move;
  }
  function frame(now: number) {
    const dt = Math.min((now - lastTime) / 1000, .05); lastTime = now;
    const pad = pollPad(dt);
    if (screen === '' && !observe) {
      const dx = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + pad.x;
      const dy = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + pad.y;
      const movement = view.movement(dx, dy);
      sim.move(movement.x, movement.y, dt, keys.has('ShiftLeft') || keys.has('ShiftRight')); sim.step(dt);
      autoTimer += dt; if (autoTimer > 8) { checkpoint(); autoTimer = 0; }
    } else if (screen === 'menu' && !hasRun) sim.step(dt, false);
    for (const event of sim.drainEvents()) {
      if (screen !== 'menu') sound.play(event.type);
      if (event.type === 'hit') { view.kick(); toast('绝缘服挡住了冲击。已返回起点，装置布局保留。'); }
      if (event.type === 'drop') view.kick(.12);
      if (event.type === 'charge') view.kick(.08);
      if ((event.type === 'reflect' || event.type === 'lost') && event.x !== undefined && event.y !== undefined) view.burst(event.x, event.y);
      if (event.type === 'win') complete();
    }
    hudTimer += dt; if (hasRun && hudTimer > .1) { updateHud(); hudTimer = 0; }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show'); }
    sound.tick(sim.level.receivers.filter(r => sim.receivers[r.id].charge > 0).length / sim.level.receivers.length, screen === '' && !observe);
    view.setEffects(screen === 'photo' ? photoDof : data.settings.depthOfField, data.settings.environment);
    view.update(sim, dt, observe, hintCount >= 3, screen === 'menu', !data.settings.reducedMotion);
    app.dataset.observing = String(observe);
    if (hasRun && screen === '') for (const r of sim.level.receivers) {
      const label = $('world-labels').querySelector<HTMLElement>(`[data-receiver="${r.id}"]`); if (!label) continue;
      const position = view.project(r, .38); label.style.transform = `translate(${position.x}px,${position.y}px)`;
      label.classList.toggle('powered', sim.receivers[r.id].charge > 0);
    }
    frameCount++; requestAnimationFrame(frame);
  }
  // A read-only diagnostic surface supports browser smoke checks without exposing solutions in the UI.
  Object.defineProperty(window, '__borrowedFire', { get: () => ({ screen, level: sim.level.id, frameCount, powered: sim.powered, exitOpen: sim.exitOpen, player: { ...sim.player }, appearance: { ...data.appearance }, slots: data.slots.map(Boolean), depthOfField: view.dof.enabled }) });
  menu(); requestAnimationFrame(frame);
}

try { boot(); } catch (error) {
  console.error(error);
  app.innerHTML = `<div class="fallback"><span class="eyebrow">BORROWED FIRE</span><h1>这间机房暂时无法启动。</h1><p>请使用支持 WebGL 2 的桌面浏览器，并开启硬件加速。</p><p>如果你直接打开了 HTML 文件，请改用 README 中的本地服务器命令。</p><button onclick="location.reload()">重新启动</button></div>`;
}
