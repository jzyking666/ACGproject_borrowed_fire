import { circuitReading, forecast, forecastFindings, forecastMessage, TrialAnchor, type Forecast, type ForecastFinding, type ForecastFrame } from './forecast';
import './style.css';
import './district-atlas.css';
import './campaign.css';
import './grid-loom.css';
import './commission-calibration.css';
import './tide-dispatch.css';
import './return-mail.css';
import { Simulation } from './engine';
import { LEVELS } from './levels';
import { View } from './view';
import { Sound } from './audio';
import { defaults, exportSave, importSave, parseSave, saveShiftDraft, signRepair, STORAGE_KEY, type SaveData, type ShiftDraft } from './storage';
import { BADGES, COATS, HELMETS } from './appearance';
import { STORY, CAST, StoryPlayer, sceneFor, availableScenes, portrait, type Scene } from './story';
import { History } from './history';
import { Controller } from './controller';
import { menuMarkup, ROOT_MARKUP } from './ui';
import { achievedChallenges, challengesFor } from './mastery';
import { occupancy, routeMap } from './echo-editor';
import { CHAPTERS, chapterFor, roomPlan } from './chapters';
import { createRepair, REPAIRS, repairResult, type RepairOrder } from './repairs';
import { repairList, repairLetter, signedReply } from './repair-desk';
import './repair-desk.css';
import { LensPanel } from './lens-panel';
import { CampaignDesk } from './campaign-ui';
import { canWork, countPlay, jobKey, jobOf } from './campaign-progress';
import { fieldById, FIELD_BASE } from './field-service';
import { passageReport, type PassageReport } from './passage';
import { commissionDiagram } from './commission-diagram';
import { shiftCoach } from './shift-coach';
import './folio.css';
import './shift-screens.css';
import './preferences.css';
import './locale-layout.css';
import { preferencesPage, previewTracks } from './preferences-ui';
import { bindMovement, defaultPreferences, directions, mixChannels, movementLabel, type Direction, type MixChannel } from './preferences';
import { installLocale } from './locale';

const app = document.querySelector<HTMLDivElement>('#app')!;
const fmt = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const stars = (n: number) => `<span class="stars" aria-label="${n} 星">${'★'.repeat(n)}<span>${'☆'.repeat(3 - n)}</span></span>`;

const audioCaptions: Record<string,{zh:string; en:string; priority:number}> = {
  charge:{zh:'接收环鸣响 · 已供电',en:'Receiver chime · powered',priority:1},
  reject:{zh:'低沉双音 · 色相不符',en:'Low double tone · wrong phase',priority:2},
  lost:{zh:'脉冲消散',en:'Pulse dissipated',priority:1},
  hit:{zh:'绝缘服警报 · 受击',en:'Suit alarm · impact',priority:3},
  teleport:{zh:'导光井回响',en:'Light well resonates',priority:1},
  expire:{zh:'接收环低鸣 · 已失电',en:'Descending chime · receiver offline',priority:2},
  phase:{zh:'换相器鸣响 · 脉冲变色',en:'Phase shifter rings · pulse changed colour',priority:1},
};

function boot() {
  app.innerHTML = ROOT_MARKUP;
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const title = document.querySelector<HTMLElement>('.room-title')!;
  new ResizeObserver(() => { const bounds = title.getBoundingClientRect(); if (bounds.height) $('workbench').style.top = `${bounds.bottom + 14}px`; }).observe(title);
  const sound = new Sound();
  let data: SaveData;
  try { data = parseSave(localStorage.getItem(STORAGE_KEY)); } catch { data = defaults(); }
  const locale = installLocale(app, data.settings.language);
  const bilingual = (zh: string, en: string) => data.settings.language === 'en' ? en : zh;
  function applyMix() {
    const s = data.settings;
    sound.mute(s.muted); sound.setVolume(s.volume); sound.setMusic(s.music);
    sound.setMix(s.musicVolume, s.effectsVolume, s.uiVolume);
  }
  function applyDisplayPreferences() {
    document.documentElement.style.fontSize = `${16 * data.settings.textScale}px`;
    app.dataset.reducedMotion = String(data.settings.reducedMotion);
  }
  applyMix();
  sound.setBackground(document.hidden);
  const enableTitleAudio = () => sound.unlock();
  document.addEventListener('pointerup', enableTitleAudio, { once: true });
  document.addEventListener('keydown', enableTitleAudio, { once: true });
  let binding: Direction | undefined;
  let previewTrack = 0;
  let captionUntil = 0;
  let captionPriority = 0;
  const view = new View($('viewport')); view.setQuality(data.settings.highQuality);
  view.setAppearance(data.appearance);
  applyDisplayPreferences();
  function titleCircuit() {
    const background = new Simulation(LEVELS[2]); background.mirrors = structuredClone(background.level.solution);
    for (let i = 0; i < 150; i++) background.step(.1, false);
    background.drainEvents(); return background;
  }
  let sim = titleCircuit();
  view.load(sim.level);
  let screen = 'menu', observe = false, hintCount = 0, hasRun = false, photoDof = true, usingPad = false;
  let activeStory: { player: StoryPlayer; replay: boolean; finish: () => void } | undefined;
  let pendingImport: SaveData | undefined;
  let repair: RepairOrder | undefined, letter: RepairOrder | undefined;
  let lens: LensPanel | undefined;
  const modalHistory: string[] = [];
  let toastTimer = 0, hudTimer = 0, autoTimer = 0, saveWarning = false;
  const keys = new Set<string>(); let cameraDrag = false, previousX = 0;
  const controller = new Controller();
  const history = new History();
  const trial = new TrialAnchor();
  let prediction: { result: Forecast; preview: Simulation; index: number; findings: ForecastFinding[]; pin?: ForecastFinding } | undefined;
  let feedbackUntil = 0;
  let templateMirror: string | undefined;
  let travelPlan: PassageReport | undefined;
  let probe = 0, campaignOrigin: 'pause' | 'menu' = 'menu';
  let lastInput = performance.now(), clockSave = 0;
  const inputNow = () => { lastInput = performance.now(); };
  for (const type of ['pointerdown', 'pointermove', 'wheel', 'keydown']) document.addEventListener(type, inputNow, { passive: true });
  let selectedEcho = 0;
  let echoPeriodStep = .05;
  const markupCache = new Map<string, string>();
  const markup = (id: string, html: string) => { if (markupCache.get(id) !== html) { $(id).innerHTML = html; markupCache.set(id, html); } };
  let lastTime = performance.now(), frameCount = 0;
  const toast = (message: string) => { $('toast').textContent = message; $('toast').classList.add('show'); toastTimer = 3.5; };
  const persist = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { if (!saveWarning) { saveWarning = true; toast('浏览器未允许本地存档；本次仍可游玩。'); } } };
  const checkpoint = (notify = false) => {
    if (screen.startsWith('camp-') || !hasRun || sim.won) { if (screen.startsWith('camp-')) persist(); return; }
    const draft = { snapshot: sim.snapshot(), hintCount };
    if (sim.level.commission) {
      const i=sim.level.id-FIELD_BASE;
      if (!data.campaign.jobs[jobKey('field',i)]?.done) data.campaign.sites[i]=draft;
    } else saveShiftDraft(data, draft, repair?.id);
    persist();
    if (notify) toast('断点已保存 · 包含装置布局与脉冲状态');
  };
  const setScreen = (value: string) => {
    if (screen !== value) {
      if (screen === 'settings') sound.stopPreview();
      toastTimer = 0; $('toast').classList.remove('show'); $('sound-caption').hidden = true;
      captionPriority = 0; captionUntil = 0; binding = undefined;
    }
    const cue = value === 'camp-board' ? (data.campaign.last?.startsWith('tide-') ? 'harbor' : 'workshop')
      : value === 'menu' ? 'menu' : value === 'story' ? 'story'
      : ['camp-mail','camp-address','letter','camp-ending','camp-receipt'].includes(value) ? 'post'
      : ['', 'forecast','commission','lens','photo','echo-editor'].includes(value) ? 'room' : 'paper';
    const roomDistrict = sim.level.commission ? Math.floor((sim.level.id-FIELD_BASE)/6) : CHAPTERS.indexOf(chapterFor(sim.level.id));
    sound.setScene(cue, cue === 'room' ? roomDistrict : data.campaign.selected);
    screen = value; keys.clear(); app.dataset.screen = value || 'playing';
    document.querySelector<HTMLElement>('.topbar')!.inert = !!value && value !== 'menu';
    $('hud').inert = !!value;
    $('overlay').className = `overlay ${value === '' ? 'closed' : value === 'menu' ? 'home' : value === 'photo' || value === 'forecast' ? 'photo-overlay' : 'modal-backdrop'}`;
    $('hud').hidden = !!value || !hasRun;
    $('pause-btn').hidden = value === 'menu';
    view.setPresentation(value === 'menu' ? 'menu' : value === 'wardrobe' ? 'wardrobe' : 'game');
  };
  const button = (action: string, label: string, cls = 'secondary') => `<button class="${cls}" data-action="${action}">${label}</button>`;
  const campaign = new CampaignDesk(() => data.campaign, (name,body,footer,kind) => {
    modalHistory.length=0; modal(name,body,footer,kind);
  }, persist, index => load(FIELD_BASE + index, data.campaign.sites[index]),
    csv => download(bilingual('借火-战役用时.csv', 'borrowed-fire-timesheet.csv'), '\uFEFF'+csv, 'text/csv;charset=utf-8'), () => sound.play('win'), () => sound.play('postmark'));
  function inspection() {
    if (!sim.level.commission || sim.won) return;
    if (screen !== 'commission') travelPlan=undefined;
    modal('端口联检图', commissionDiagram(sim,probe,!!data.campaign.jobs[jobKey('loom', sim.level.id-FIELD_BASE)]?.done,templateMirror,!!data.campaign.jobs[jobKey('tide',sim.level.id-FIELD_BASE)]?.done,travelPlan), button('back','回到现场','primary'), 'commission');
  }
  function menu() {
    if (hasRun && !sim.won) checkpoint(); activeStory = undefined; modalHistory.length = 0; setScreen('menu');
    $('sound-btn').textContent = `声音 ${data.settings.muted ? '关' : '开'}`;
    $('overlay').innerHTML = menuMarkup(data);
  }
  function load(id: number, draft?: ShiftDraft, order?: RepairOrder) {
    const site = fieldById(id), index = id - FIELD_BASE;
    if (site && !canWork(data.campaign,'field',index)) { toast('先为这个街区接通上游线路。'); return; }
    checkpoint(); sound.unlock(); activeStory = undefined; prediction = undefined; lens = undefined; trial.clear(); history.clear();
    repair = order; sim = order ? createRepair(order) : new Simulation(site ?? LEVELS[id]); hintCount = 0; probe = 0; templateMirror=undefined;
    if (site) { data.campaign.last=jobKey('field',index); data.campaign.selected=Math.floor(index/6); jobOf(data.campaign,data.campaign.last); campaignOrigin='menu'; }
    let repaired = false;
    if (draft) { repaired = sim.restore(draft.snapshot); hintCount = draft.hintCount; }
    hasRun = true; observe = false; autoTimer = 0; modalHistory.length = 0; view.load(sim.level); view.resetCamera();
    $('circuit-feedback').textContent = ''; feedbackUntil = 0;
    const roomNumber = String(site ? index % 6 + 1 : id + 1).padStart(2, '0');
    $('room-index').textContent = roomNumber;
    $('interact-action').textContent = site ? '转镜 / 开关电源' : '拿取 / 放下';
    $('room-name').textContent = order?.title ?? sim.level.name; $('room-subtitle').textContent = sim.level.subtitle;
    $('station-status').textContent = site ? `七区复网 · ${site.subtitle}` : order ? `返修 · ${order.client}` : `第七区 · ${chapterFor(id).short}`;
    $('objective').textContent = site ? '将每路送到指定端口与色相，保持甲路实载供电后抵达出口。' : sim.level.repeats === 1 ? '让接收环通电，然后抵达出口。' : `让同一颗脉冲重复供电，验证所有接收环的循环。${sim.level.offGrid ? '完成后关闭发射器，再抵达出口。' : '保持供电并抵达出口。'}`;
    $('entry-number').textContent = ` / ${roomNumber}`;
    $('briefing-text').textContent = sim.level.briefing; $('lesson').textContent = sim.level.lesson;
    $('hint-text').hidden = hintCount === 0; $('hint-text').textContent = sim.level.hints[Math.max(0, hintCount - 1)];
    $('briefing').hidden = hintCount === 0;
    $('world-labels').innerHTML = sim.level.receivers.map((r, i) => `<span data-receiver="${r.id}" class="world-label"><b>${i + 1}</b><span>${r.name}</span></span>`).join('');
    $('receivers').innerHTML = sim.level.receivers.map((r, i) => `<div class="receiver-row" data-status-receiver="${r.id}"><span class="receiver-icon">${i + 1}</span><div><b>${r.name}${r.phase ? `<span class="phase-badge phase-${r.phase}">${r.phase === 'cool' ? '冷 ◇' : '暖 ●'}</span>` : ''}</b><small></small><div class="charge-track"><i></i></div></div><span class="receiver-check"></span></div>`).join('');
    const intro = site || order ? undefined : sceneFor(id, 'before'), firstVisit = intro && !data.story.seen.includes(intro.id);
    if (intro && firstVisit) data.story.seen.push(intro.id);
    setScreen(''); $('overlay').innerHTML = ''; updateHud(); checkpoint();
    toast(repaired ? '机房结构更新，冲突装置已移到邻近空位。成绩与解锁保留。' : draft ? '值班断点已恢复' : site ? site.subtitle+' · '+site.name : order ? `报修人 · ${order.client}` : `进入机房 ${String(id + 1).padStart(2, '0')} · ${sim.level.name}`);
    if (intro && !draft && data.settings.dialogue && !data.records[id] && firstVisit) playStory(intro, resumeGame);
  }
  function continueShift() {
    if (data.checkpoint) load(data.checkpoint.level, { snapshot: data.checkpoint, hintCount: data.hintCount ?? 0 });
    else load(data.unlocked);
  }
  function repairs() {
    modal('返修值班台', repairList(data), button('back', '返回'), 'repairs');
  }
  function readLetter(order: RepairOrder) {
    letter = order;
    modal(order.title, repairLetter(order, data), button('back', '返回') +
      button('begin-repair', data.repairDrafts[order.id] ? '继续返修' : '接单进场', 'primary'), 'letter');
  }
  function showLens() {
    if (!observe || (screen !== '' && screen !== 'lens')) return;
    if (sim.level.commission) { inspection(); return; }
    lens ??= new LensPanel(sim);
    modal('试镜台', lens.markup(), button('back', '返回观察', 'primary'), 'lens');
  }
  function modal(title: string, body: string, footer: string, kind = 'dialog') {
    const focusedAction = screen === kind ? (document.activeElement as HTMLElement | null)?.dataset.action : undefined;
    const scrollTop = screen === kind ? $('overlay').querySelector('.dialog-body')?.scrollTop ?? 0 : 0;
    if (screen !== kind) modalHistory.push(screen);
    const closeAction = kind === 'pause' ? 'resume' : kind === 'win' ? 'menu' : kind === 'story' ? 'story-skip' : 'back';
    setScreen(kind); $('overlay').innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-heading"><h1 id="dialog-title">${title}</h1><button class="dialog-close" data-action="${closeAction}" aria-label="关闭${title}">×</button></header><div class="dialog-body">${body}</div><footer class="dialog-actions">${footer}</footer></section>`;
    const dialogBody = $('overlay').querySelector<HTMLElement>('.dialog-body')!;
    requestAnimationFrame(() => {
      if (!dialogBody.isConnected) return;
      const buttons = [...$('overlay').querySelectorAll<HTMLButtonElement>('button:not(:disabled):not(.dialog-close)')];
      const primary = ['pause','win','story','letter','camp-map','camp-log','camp-receipt','camp-ending'].includes(kind) ? $('overlay').querySelector<HTMLButtonElement>('.dialog-actions .primary') : null;
      const pickedMirror = kind === 'lens' ? $('overlay').querySelector<HTMLButtonElement>('.lens-choices [aria-pressed="true"]') : null;
      const focused = pickedMirror ?? buttons.find(b => focusedAction && b.dataset.action === focusedAction) ?? primary ?? buttons[0];
      dialogBody.scrollTop = scrollTop;
      focused?.focus({ preventScroll: true });
    });
  }
  function resumeGame() { setScreen(''); $('overlay').innerHTML = ''; }
  function playStory(scene: Scene, finish: () => void, replay = false) {
    const depth = modalHistory.length;
    if (!data.story.seen.includes(scene.id)) { data.story.seen.push(scene.id); persist(); }
    activeStory = { player: new StoryPlayer(scene), replay, finish: () => { modalHistory.length = depth; finish(); } };
    renderStory();
  }
  function renderStory() {
    if (!activeStory) return;
    const player = activeStory.player, scene = player.scene, cast = CAST[player.line.speaker];
    const previous = `<button class="secondary" data-action="story-prev" ${player.index === 0 ? 'disabled' : ''}>上一句</button>`;
    modal(scene.title, `<div class="story-location">${chapterFor(scene.level).title} / ${LEVELS[scene.level].name} / ${scene.kind === 'before' ? '入场通讯' : '完工通讯'}</div><div class="story-conversation" style="--speaker-color:${cast.color}"><div class="story-portrait">${portrait(player.line.speaker)}</div><div class="story-dialogue"><div class="story-speaker"><b>${cast.name}</b><span>${cast.role}</span></div><p id="story-text" aria-live="polite" aria-atomic="true"></p></div></div><div class="story-progress"><span>${player.index + 1} / ${scene.lines.length}</span><span>空格 / Enter / 手柄 A 继续 · Esc / B 跳过</span></div>`, previous + button('story-skip', '跳过对话') + button('story-next', player.last ? activeStory.replay ? '返回通讯' : scene.kind === 'before' ? '开始维修' : '查看结果' : '下一句', 'primary'), 'story');
    $('story-text').textContent = player.line.text;
  }
  function finishStory() {
    if (!activeStory) return;
    const finish = activeStory.finish; activeStory = undefined; finish();
  }
  function journal() {
    if (screen === '') checkpoint();
    const scenes = availableScenes(data.story.seen, data.records);
    const rows = STORY.map((beat, i) => {
      const before = scenes.some(s => s.level === i && s.kind === 'before'), after = scenes.some(s => s.level === i && s.kind === 'after');
      return `<section class="journal-entry"><div class="journal-entry-title"><span>${String(i + 1).padStart(2, '0')}</span><h2>${before || after ? beat.title : '尚无通讯'}</h2></div><p>${data.records[i] ? beat.record : before || after ? '已收录入场通讯，完工后补入交接记录。' : '进入对应机房后收录。'}</p><div class="journal-entry-actions"><button class="secondary" data-action="replay-${i}-before" ${before ? '' : 'disabled'}>入场通讯</button><button class="secondary" data-action="replay-${i}-after" ${after ? '' : 'disabled'}>完工通讯</button></div></section>`;
    }).join('');
    modal('夜班通讯', `<p class="dialog-copy">已收录的对话可以随时回看。跳过对话不影响维修与星级。</p><div class="journal-list">${rows}</div>`, button('back', '返回', 'primary'), 'journal');
  }
  function pause() {
    if (!hasRun || sim.won) return; checkpoint();
    const group = (name: string, actions: string) => `<section><h2>${name}</h2><div>${actions}</div></section>`;
    const tools = button('forecast', '未来推演') + button('camera-mode', view.tacticalView ? '切换立体视角' : '切换俯视视角')
      + (sim.level.commission ? button('commission','端口联检图') : '') + (sim.level.echoLimit ? button('echo-editor', '回声调度') : '')
      + button('trial-set-pause', '设置试验点') + (trial.exists ? button('trial-return-pause', '返回试验点') : '') + button('photo','拍照');
    const desk = button('saves','存档管理') + button('ledger','工单') + button('journal','夜班通讯') + button('wardrobe','维修员') + button('settings','设置');
    const jobs = button('campaign','复网战役') + button('repairs','返修值班台') + button('levels','选择机房') + button('restart',repair ? '重修本单' : '重试本关');
    modal('暂停', `<p class="pause-location"><b>${repair?.title ?? sim.level.name}</b><span>当前进度已自动保存。</span></p><nav class="pause-menu" aria-label="暂停选项">${group('现场工具',tools)}${group('值班台',desk)}${group('更换任务',jobs)}</nav>`,
      button('menu','返回主菜单') + button('resume','继续','primary'), 'pause');
  }
  function levels() {
    if (screen === '') checkpoint();
    const cards = CHAPTERS.map(chapter => `<section data-chapter="${chapter.start}" class="chapter-section" style="--chapter-color:${chapter.color}"><header class="chapter-heading"><div><h2>${chapter.title}</h2><p>${chapter.note}</p></div><span>${LEVELS.slice(chapter.start, chapter.end).filter(l => data.records[l.id]).length} / ${chapter.end - chapter.start}</span></header>${LEVELS.slice(chapter.start, chapter.end).map(l => {
      const i = l.id;
      const rec = data.records[i], unlocked = i >= 7 || i <= data.unlocked;
      return `<button class="level-card ${unlocked ? '' : 'locked'}" data-level="${i}" ${unlocked ? '' : 'disabled'}><span class="level-num">${String(i + 1).padStart(2, '0')}</span>${roomPlan(l)}<span class="level-description"><strong>${l.name}</strong><small>${unlocked ? `${l.mirrors.some(m => m.kind === 'prism') ? '双色路由 · ' : ''}${l.offGrid ? '离网交接' : l.repeats > 1 ? '循环供电' : '基础维修'}${rec ? ` · 挑战 ${data.mastery[i]?.length ?? 0}/2` : ''}` : '完成上一机房后解锁'}</small></span>${rec ? stars(rec.stars) : `<span class="level-lock">${unlocked ? '进入' : '未解锁'}</span>`}</button>`;
    }).join('')}</section>`).join('');
    modal('选择机房', `<nav class="chapter-nav" aria-label="章节导航">${CHAPTERS.map(c => `<button data-action="chapter-${c.start}">${c.short}</button>`).join('')}</nav><p class="level-book-note">缩略图显示开工布局 · 第一班按顺序解锁，其余章节自由选关</p><div class="level-grid">${cards}</div>`, button('journal', '夜班通讯') + button('back', '返回'), 'levels');
  }
  function settings() {
    const body = preferencesPage(data.settings, !!document.fullscreenElement, !!document.fullscreenEnabled, previewTrack, binding);
    modal(bilingual('设置','Settings'), body, button('help', bilingual('操作指南','Field manual')) +
      button('reset-prefs',bilingual('恢复默认设置','Restore defaults')) + button('back',bilingual('返回','Back'),'primary'), 'settings');
  }
  function setMixValue(key: MixChannel, percent: number) {
    data.settings[key] = Math.round(Math.max(0, Math.min(100, percent))) / 100;
    const slider = $<HTMLInputElement>('pref-'+key);
    slider.value = String(Math.round(data.settings[key]*100));
    slider.style.setProperty('--fader', slider.value + '%');
    const out = slider.closest('.pref-channel')!.querySelector('output')!;
    out.value = slider.value+'%';
    applyMix(); persist();
  }
  function setLanguage() {
    locale.set(data.settings.language);
    document.title = bilingual('借火 — 末班维修员','Borrowed Fire — The Night Mechanic');
    // Reprint labels in the current room. The simulation and all active jobs keep their state.
    view.load(sim.level);
  }
  function resetPreferences() {
    data.settings = defaultPreferences(); binding = undefined; previewTrack = 0;
    applyMix(); setLanguage(); view.setQuality(data.settings.highQuality);
    applyDisplayPreferences(); persist(); back();
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { toast(bilingual('此窗口无法切换全屏。','Fullscreen is unavailable in this window.')); }
  }
  document.addEventListener('fullscreenchange', () => { if (screen === 'settings') settings(); });
  $('overlay').addEventListener('input', e => {
    const input = e.target;
    if (screen !== 'settings' || !(input instanceof HTMLInputElement)) return;
    const key = mixChannels.find(k => k === input.dataset.mix);
    if (key) setMixValue(key, input.valueAsNumber);
  });
  function help(page: 'keys' | 'pad' | 'devices' = usingPad ? 'pad' : 'keys') {
    const previousPage = screen === 'help' ? $('overlay').querySelector('.dialog-body') : null;
    if (previousPage) previousPage.scrollTop = 0;
    const bindings = (rows: [string, string][]) => `<dl class="binding-list">${rows.map(([input, description]) => `<div><dt>${input}</dt><dd>${description}</dd></div>`).join('')}</dl>`;
    const keyboard = bindings([
      [`<kbd>${movementLabel(data.settings.movement)}</kbd> / 方向键`, '移动'], ['<kbd>E</kbd>', '拿取、放下；切换附近发射器'], ['<kbd>Q</kbd>', '旋转手持或附近反射器'],
      ['<kbd>Space</kbd>', '暂停观察弹道；观察中按 E 进入试镜台'], ['<kbd>Shift</kbd> + 移动', '精细移动'], ['<kbd>H</kbd>', '分步提示；第三步显示参考轮廓'],
      ['<kbd>N</kbd>', '复网现场的端口联检图'], ['<kbd>R</kbd> / <kbd>Esc</kbd>', '重试 / 暂停'], ['<kbd>I</kbd> / <kbd>J</kbd>', '维修工单 / 存档'], ['<kbd>F2</kbd>', '拍照与图片导出'], ['<kbd>B</kbd>', '未来十二秒推演与回放'], ['<kbd>T</kbd> / <kbd>V</kbd>', '设置 / 返回试验点'], ['<kbd>Z</kbd> / 手柄 LB', '撤销上次装置操作'], ['<kbd>F</kbd> / 手柄 LT', '开始或结束回声示教'], ['<kbd>G</kbd> / 手柄 RB', '取消录制或移除最后一个回声'],
      ['<kbd>Tab</kbd> / 暂停菜单', '切换俯视与立体视角'], ['<kbd>L</kbd> / 暂停菜单', '回声调度：调整周期、播放相位与同步'], ['右键 / 滚轮', '转动相机 / 缩放'], ['<kbd>C</kbd>', '相机复位'],
    ]);
    const gamepad = bindings([
      ['左摇杆 / 方向键', '移动'], ['<kbd>A</kbd> / 下方键', '拿取、放下'], ['<kbd>B</kbd> / 右方键', '旋转'], ['<kbd>X</kbd> / 左方键', '暂停观察，随后 A 进入试镜台'],
      ['<kbd>Y</kbd> / 上方键', '提示'], ['右摇杆', '调整视角与缩放'], ['<kbd>Start</kbd>', '暂停、继续'], ['菜单方向键', '选择选项；A 确认，B 返回'],
    ]);
    const pages = { keys: '键盘与鼠标', pad: '实体手柄', devices: '装置手册' };
    const index = Object.entries(pages).map(([key, label]) =>
      `<button data-action="guide-${key}" aria-pressed="${page === key}">${label}</button>`).join('');
    const notes = `<section class="manual-note"><h2>现场联检</h2><p>在复网现场，按 N 查看端口联检图，选择要追踪的线路。靠近活动轴座按 Q 或 E 转镜。各路出口与相位正确、甲路实载得电后，到出口签收。</p><h2>中继站装置</h2><p>压板可以由人或放下的反射器占据，对应光闸只拦脉冲。成对的导光井传送脉冲，保持方向和身份，不传送人。菱形换相器互换冷暖属性；接收环只接受对应颜色。Z / 手柄 LB 撤销装置操作和当时的完整回路状态。</p><h2>双色棱镜</h2><p>交叉的橙蓝斜面代表两种反射规则：暖光走橙色斜面，冷光走蓝色斜面；棱镜不改变冷暖。Q 旋转棱镜会交换两种颜色的反射方向。换相器可以让返回的光选择另一支路。空格观察按颜色绘制完整静态光路，B 可以检查动态时序；Tab 俯视便于分辨交叉线路。</p><h2>回声示教</h2><p>回声花园中，F / LT 记录最长六秒走位，再按一次结束。最多同时保留两段投影；G / RB 取消录制或移除最后一段。投影循环回到起点，只占据压板，不复制拿放、反射或开关操作。带 ◇ 标记的示教板只认投影；橙色反向闸在对应板空闲时打开。观察虚线只表示当前占据状态，不预测未来投影。所有示教操作可撤销，并随存档恢复。</p><h2>回声调度</h2><p>L 或暂停菜单打开调度器，期间时间暂停。选择一段回声，调整播放相位或输入 0.5–6 秒周期；路线保持不变，播放速度随周期改变。占板条和路线图可检查交接关系；步长可切换至 0.001 秒以便手柄微调。同步启动将所有回声归零，来源在线且无光时会同时发射。编辑支持完整撤销和存档。</p><h2>推演与试验</h2><p>B 从当前状态推演十二秒，角色保持原地，脉冲、回声和供电正常演算。拖动时间轴检查哪个环先断电、哪道闸没打开，不会改写实际进度。T 记录一个临时试验点，V 恢复，方便比较不同布局；进关与读档后清空。连到接收环的光闸可由压板启动，接收环通电后接管，断电后再关闭。</p><h2>维修准则</h2><p>接收环需要定期补充电力。后续机房要求同一颗脉冲重复经过；超时会失去循环验证。关闭发射器不会清除已有脉冲。受击会返回起点，但保留你搭建的装置。</p><p>完成目标后，空手进入青色出口。每关一颗完成星，另两颗分别奖励无伤、未使用提示。提示不影响解锁。</p></section>`;
    const bindingsPage = page === 'pad' ? gamepad + '<p class="dialog-copy">连接标准映射手柄后，按任意键激活。</p>' : keyboard;
    modal('值班手册', `<div class="guide-spread"><nav class="guide-index" aria-label="手册目录">${index}</nav><div class="guide-page">${page === 'devices' ? notes : bindingsPage}</div></div>`, button('back','知道了','primary'), 'help');

  }
  function hint() {
    if (!hasRun || screen !== '') return;
    if (sim.level.commission) { const j=jobOf(data.campaign,jobKey('field',sim.level.id-FIELD_BASE)); if(!j.done)j.hints++; }
    hintCount = Math.min(3, hintCount + 1); $('hint-text').hidden = false; $('briefing').hidden = false;
    $('hint-text').textContent = sim.level.hints[hintCount - 1]; sound.play('ui'); checkpoint();
  }
  function complete() {
    if (sim.level.commission) { campaign.finish('field',sim.level.id-FIELD_BASE); return; }
    if (repair) {
      const result = repairResult(repair, sim);
      if (!result) return;
      const best = signRepair(data, repair.id, result.moves); persist();
      modal(result.withinBudget ? '精修签收' : '返修已签收',
        signedReply(repair) + `<p class="result-note">${repair.title} · 本次 ${result.moves} 次操作 · 精修目标 ${repair.budget} 次 · 个人最佳 ${best} 次</p>`,
        button('repair-inbox', '下一封报修单', 'primary') + button('restart', '重修本单') + button('menu', '返回主菜单'), 'win');
      return;
    }
    const n = 1 + Number(sim.hits === 0) + Number(hintCount === 0), rec = data.records[sim.level.id];
    if (!rec || n > rec.stars || n === rec.stars && sim.elapsed < rec.seconds) data.records[sim.level.id] = { stars: n, seconds: sim.elapsed, hits: sim.hits, moves: sim.moves };
    if (sim.level.id < 7) data.unlocked = Math.max(data.unlocked, Math.min(6, sim.level.id + 1));
    data.mastery[sim.level.id] = [...new Set([...(data.mastery[sim.level.id] ?? []), ...achievedChallenges(sim)])];
    delete data.checkpoint; delete data.hintCount; persist();
    const scene = sceneFor(sim.level.id, 'after');
    if (!rec && data.settings.dialogue && !data.story.seen.includes(scene.id)) playStory(scene, () => showResult(n));
    else showResult(n);
  }
  function showResult(n: number) {
    const last = sim.level.id === 11 || sim.level.id === 15 || sim.level.id === LEVELS.length - 1;
    const title = sim.level.id === 21 ? '分光温室已交班' : sim.level.id === 17 ? '练习单已归档' : sim.level.id === 15 ? '花园已交班' : sim.level.id === 11 ? '收件人' : sim.level.id === 6 ? '第一班交接完成' : '维修完成';
    const copy = sim.level.id === 21 ? '两种光路与一份值班表已经留下。下一页，交给下一班自己修改。' : sim.level.id === 17 ? '线路、脚步与等待的时间，都已交给下一班。' : sim.level.id === 15 ? '示教与线路图已留下。下一班可以照着它，把花园接过去。' : sim.level.id === 11 ? '回执已送达。有人接过了这条线路，也有人等你下班。' : `${sim.level.name} · 设备运行正常。`;
    modal(title, `<div class="result-stars">${stars(n)}</div><p class="dialog-copy">${copy}</p><div class="result-stats"><div><b>${fmt(sim.elapsed)}</b><span>维修用时</span></div><div><b>${sim.hits}</b><span>受击次数</span></div><div><b>${sim.moves}</b><span>装置操作</span></div></div><p class="result-note">完成 ★ · 无伤 ${sim.hits === 0 ? '★' : '☆'} · 未使用提示 ${hintCount === 0 ? '★' : '☆'}</p>${challengeMarkup(true)}`, (last ? button('levels', '夜班记录', 'primary') : button('next', '下一间机房', 'primary')) + (sim.level.id === 11 ? button('echo-wing', '后记：回声花园') : sim.level.id === 15 ? button('practice', '给下一班的练习') : '') + button('journal', '夜班通讯') + button('restart', '重新维修') + button('menu', '返回主菜单'), 'win');
  }
  function challengeMarkup(result = false) {
    return `<section class="challenge-list"><h2>可选挑战 <small>不影响通关与星级</small></h2>${challengesFor(sim.level).map(c => {
      const achieved = result && c.achieved(sim), saved = data.mastery[sim.level.id]?.includes(c.id);
      return `<div class="challenge-row ${achieved ? 'earned' : ''}"><span aria-hidden="true">${achieved || saved ? '◆' : '◇'}</span><div><b>${c.title}</b><p>${c.description}</p></div><small>${achieved ? '本次完成' : saved ? '曾经完成' : '待尝试'}</small></div>`;
    }).join('')}</section>`;
  }
  function echoEditor() {
    if (!hasRun || sim.won || !sim.level.echoLimit) return;
    selectedEcho = Math.max(0, Math.min(sim.echoes.length - 1, selectedEcho));
    const track = sim.echoes[selectedEcho];
    const tabs = sim.echoes.map((e, i) => `<button data-action="echo-select-${i}" aria-pressed="${i === selectedEcho}">回声 ${i + 1}<small>${e.duration.toFixed(3)} 秒</small></button>`).join('');
    const timelines = track ? (sim.level.plates ?? []).map(p => `<div class="echo-occupancy"><span>板 ${p.id}</span><div>${occupancy(track, p).map(on => `<i class="${on ? 'occupied' : ''}"></i>`).join('')}<b style="left:${track.time / track.duration * 100}%"></b></div></div>`).join('') : '';
    const controls = track ? `<section class="echo-edit-controls"><label for="echo-duration">循环周期 <small>路线不变，改变播放速度</small></label><div class="echo-number"><button data-action="echo-shorter" aria-label="缩短周期 ${echoPeriodStep} 秒">−</button><input id="echo-duration" type="number" min="0.5" max="6" step="0.001" value="${track.duration.toFixed(3)}"><span>秒</span><button data-action="echo-longer" aria-label="延长周期 ${echoPeriodStep} 秒">＋</button></div><button class="echo-step" data-action="echo-step">步长 ${echoPeriodStep} 秒 · 切换</button><p>当前播放到 ${track.time.toFixed(3)} 秒</p><div class="echo-phase-buttons">${button('echo-earlier', '后移 0.05 秒')}${button('echo-later', '前移 0.05 秒')}</div>${button('echo-delete', '移除此回声')}</section>` : '<p class="dialog-copy">先回到机房，按 F 录下一段走位。再到这里调整播放。</p>';
    modal('回声调度', `<p class="dialog-copy">调度期间时间暂停。浅色条标出此回声占据各块板的时段；虚线表示循环回到起点。</p><nav class="echo-track-tabs" aria-label="选择回声">${tabs}</nav><div class="echo-editor-layout"><div>${routeMap(sim.level, sim.echoes, selectedEcho)}<div class="echo-occupancy-list">${timelines}</div></div>${controls}</div>${sim.recording ? '<p class="dialog-copy">正在示教。请先返回并结束录制，再调整已有回声。</p>' : '<p class="dialog-copy">同步启动会把所有回声归零。若来源在线且场内无光，会同时发射；已有脉冲继续运行。调整后用 B 推演检查放行时刻。</p>'}`, button('echo-undo', '撤销调整') + button('echo-sync', '同步启动') + button('back', '返回', 'primary'), 'echo-editor');
    $('overlay').querySelectorAll<HTMLButtonElement>('.echo-edit-controls button, [data-action="echo-sync"]').forEach(b => b.disabled = !!sim.recording || !track);
    $<HTMLButtonElement>('overlay').querySelector<HTMLButtonElement>('[data-action="echo-undo"]')!.disabled = history.size === 0;
    const duration = document.getElementById('echo-duration') as HTMLInputElement | null;
    if (duration) { duration.disabled = !!sim.recording; duration.addEventListener('change', () => editEcho(() => sim.retimeEcho(selectedEcho, Number(duration.value)))); }
  }
  function editEcho(edit: () => void) {
    if (screen !== 'echo-editor') return;
    history.perform(sim, edit); view.invalidatePlayback(); checkpoint(); echoEditor(); updateHud();
  }
  function wardrobe() {
    const choices = (group: string, values: readonly string[], selected: number) => values.map((name, i) => `<button data-action="${group}-${i}" aria-pressed="${selected === i}" class="choice ${selected === i ? 'chosen' : ''}">${name}</button>`).join('');
    modal('维修员', `<p class="dialog-copy">更换工作服、头部配件和胸前标记。外观不影响能力。</p><section class="outfit-group"><h2>工作服</h2><div class="swatches">${COATS.map((c, i) => `<button data-action="coat-${i}" aria-label="${c.name}" aria-pressed="${data.appearance.coat === i}" class="swatch ${data.appearance.coat === i ? 'chosen' : ''}" style="--swatch:${c.hex}"><i></i><span>${c.name}</span></button>`).join('')}</div></section><section class="outfit-group"><h2>头部配件</h2><div class="choices">${choices('helmet', HELMETS, data.appearance.helmet)}</div></section><section class="outfit-group"><h2>胸前标记</h2><div class="choices">${choices('badge', BADGES, data.appearance.badge)}</div></section><p class="dialog-copy outfit-saved">外观会自动保存。</p>`, button('back', '完成', 'primary'), 'wardrobe');
  }
  function saves() {
    if (screen === '') checkpoint();
    const date = (iso: string) => new Date(iso).toLocaleString(data.settings.language, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const canSave = hasRun && !sim.won;
    const rows = data.slots.map((slot, i) => {
      const order = slot && REPAIRS.find(r => r.id === slot.repairId);
      const field = slot && fieldById(slot.snapshot.level);
      const title = !slot ? '空存档' : field ? `复网 · ${field.name}` : order ? `返修 · ${order.title}` : `${String(slot.snapshot.level + 1).padStart(2, '0')} ${LEVELS[slot.snapshot.level].name}`;
      return `<section class="save-slot"><span class="save-index" aria-hidden="true">${String(i + 1).padStart(2,'0')}</span><div><b>存档 ${i + 1}</b><p>${title}${slot ? ' · ' + fmt(slot.snapshot.elapsed) : ''}</p><small>${slot ? date(slot.savedAt) : '进入机房后可以保存'}</small></div><div class="slot-actions"><button data-action="save-slot-${i}" ${canSave ? '' : 'disabled'}>${slot ? '覆盖' : '保存'}</button><button data-action="load-slot-${i}" ${slot ? '' : 'disabled'}>读取</button><button data-action="delete-slot-${i}" ${slot ? '' : 'disabled'} aria-label="删除存档 ${i + 1}">删除</button></div></section>`;
    }).join('');
    modal('存档管理', `<div class="autosave-row"><div><b>自动存档</b><p>${data.checkpoint ? `${LEVELS[data.checkpoint.level].name} · ${fmt(data.checkpoint.elapsed)}` : '暂无自动存档'}</p></div><button data-action="load-auto" ${data.checkpoint ? '' : 'disabled'}>读取</button></div><div class="save-slots">${rows}</div><p class="dialog-copy">夜班从自动断点继续，返修从值班台续修，复网从街区图续工。手动槽可保存当前机房，导出文件会带走整份进度。</p>`, button('export', '导出存档文件') + button('import', '导入存档文件') + button('back', '返回', 'primary'), 'saves');
  }
  function ledger() {
    if (screen === '') checkpoint();
    const roomLabel = sim.level.commission ? sim.level.subtitle : String(sim.level.id + 1).padStart(2, '0');
    const current = hasRun ? `<section class="work-order"><h2>${roomLabel} · ${sim.level.name}</h2><p>${sim.level.lesson}</p><ul>${sim.level.receivers.map(r => `<li><span>${r.name}</span><b>${sim.receivers[r.id].charge > 0 ? `${Math.min(sim.receivers[r.id].hits, sim.level.repeats)} / ${sim.level.repeats} 次` : '待供电'}</b></li>`).join('')}${sim.level.offGrid ? `<li><span>发射器离网</span><b>${sim.sourceOn ? '待关闭' : '已关闭'}</b></li>` : ''}</ul></section>` : '<p class="dialog-copy">进入机房后，这里会显示当前维修任务。</p>';
    const records = LEVELS.map(l => { const r = data.records[l.id]; return `<tr><td>${String(l.id + 1).padStart(2, '0')}</td><th>${l.name}</th><td>${r ? fmt(r.seconds) : '—'}</td><td>${r ? stars(r.stars) : '未完成'}</td></tr>`; }).join('');
    modal('维修工单', `${repair && hasRun ? repairLetter(repair, data) : current}${hasRun && !repair && !sim.level.commission ? challengeMarkup() : ''}<h2 class="section-title">夜班记录</h2><table class="record-table"><thead><tr><th>机房</th><th>任务</th><th>最佳时间</th><th>记录</th></tr></thead><tbody>${records}</tbody></table>`, button('journal', '夜班通讯') + button('help', '操作指南') + button('back', '返回', 'primary'), 'ledger');
  }
  function photo() {
    if (!hasRun) { toast('进入机房后可以拍照。'); return; }
    if (screen !== 'photo') modalHistory.push(screen);
    setScreen('photo');
    $('overlay').innerHTML = `<section class="photo-toolbar"><b>拍照</b><span>${usingPad ? '右摇杆调整相机' : '右键转动 · 滚轮缩放'}</span><button data-action="photo-dof" aria-pressed="${photoDof && data.settings.highQuality}" ${data.settings.highQuality ? '' : 'disabled'}>景深 ${data.settings.highQuality ? photoDof ? '开' : '关' : '需高画质'}</button><button data-action="capture">保存图片</button><button data-action="back">返回 <kbd>${usingPad ? 'B' : 'Esc'}</kbd></button></section>`;
  }
  function openForecast() {
    if (!hasRun || sim.won || screen !== '') return;
    const result = forecast(sim);
    const findings = forecastFindings(result, sim.level);
    const tests = sim.commissionReadings();
    const missed = tests.flatMap((v,i)=>v.passes?[]:['甲乙丙丁戊'[i]]);
    const forecastNote = sim.level.commission ? `推演中的实载脉冲沿甲路运行。${missed.length?'当前 '+missed.join('、')+' 路没有通过端口联检，出口保持待机。': '各路校线已接对，甲路得电时出口放行。'}` : forecastMessage(result);
    prediction = { result, preview: new Simulation(sim.level), index: 0, findings };
    prediction.preview.restore(result.frames[0].state);
    modalHistory.push(''); setScreen('forecast');
    $('overlay').innerHTML = `<section class="forecast-panel" role="dialog" aria-label="未来推演"><div class="forecast-heading"><h1>未来推演</h1><button data-action="forecast-close">返回 <kbd>Esc</kbd></button></div><p>${forecastNote}</p><div id="forecast-readout"></div><div class="forecast-scrub"><button data-action="forecast-prev" aria-label="上一帧">‹</button><input id="forecast-slider" type="range" min="0" max="${result.frames.length - 1}" step="1" value="0" aria-label="推演时间"><button data-action="forecast-next" aria-label="下一帧">›</button></div><div id="forecast-tracks"></div><small>站在原地、保持布局，推演未来 12 秒。拖动或 ← → 查看；不会消耗时间、受击或改写存档。</small></section>`;
    if (findings.length) {
      $('forecast-tracks').insertAdjacentHTML('afterend', `<section class="forecast-findings"><h2>现场读数 · 选取后定位</h2>${findings.map((f, i) =>
        `<button data-action="finding-${i}" aria-pressed="false"><time>+${f.time.toFixed(2)}s</time> ${f.label}</button>`).join('')}</section>`);
      $('overlay').insertAdjacentHTML('afterbegin', '<div class="inspection-pin" id="inspection-pin" hidden aria-hidden="true"><i></i><span></span></div>');
    }
    $('forecast-slider').addEventListener('input', e => scrubForecast(Number((e.target as HTMLInputElement).value)));
    const trackRow = (name: string, active: (frame: ForecastFrame) => boolean) =>
      `<div class="forecast-track"><span>${name}</span><div>${result.frames.map(f => `<i class="${active(f) ? 'on' : ''}"></i>`).join('')}</div></div>`;
    $('forecast-tracks').innerHTML = sim.level.receivers.map(r => trackRow(r.name, f => f.state.receivers[r.id].charge > 0)).join('')
      + (sim.level.gates ?? []).map((g, i) => trackRow(`光闸 ${(g.requires ?? [g.plate]).join('+')}`, f => f.gates[i])).join('')
      + '<ol class="forecast-events" id="forecast-events"></ol>';
    $<HTMLInputElement>('forecast-slider').focus({ preventScroll: true });
    scrubForecast(0);
  }
  function scrubForecast(index: number, pin?: ForecastFinding) {
    if (!prediction) return;
    prediction.pin = pin;
    const { frames } = prediction.result;
    prediction.index = Math.max(0, Math.min(frames.length - 1, index));
    const frame = frames[prediction.index]; prediction.preview.restore(frame.state); prediction.preview.invulnerable = 0;
    $<HTMLInputElement>('forecast-slider').value = String(prediction.index);
    const marker = document.getElementById('inspection-pin');
    if (marker) {
      marker.hidden = !pin;
      if (pin) marker.querySelector('span')!.textContent = `(${pin.cell.x}, ${pin.cell.y})`;
      $('overlay').querySelectorAll<HTMLButtonElement>('.forecast-findings button').forEach((b, i) => b.setAttribute('aria-pressed', String(prediction!.findings[i] === pin)));
    }
    $('forecast-readout').textContent = `+${frame.time.toFixed(2)} 秒 · ${sim.level.commission ? (frame.powered ? '甲路实载通电' : '甲路实载待电') : frame.stable ? '循环已验证' : frame.powered ? '供电中' : '供电未齐'} · ${frame.state.pulses.length ? frame.state.pulses[0].phase === 'cool' ? '冷光' : '暖光' : '场内无光'}`;
    $('forecast-tracks').querySelectorAll('.cursor').forEach(tick => tick.classList.remove('cursor'));
    $('forecast-tracks').querySelectorAll(`.forecast-track i:nth-child(${prediction.index + 1})`).forEach(tick => tick.classList.add('cursor'));
    const labels: Record<string, string> = { lost: '脉冲丢失', hit: '受到冲击', reject: '属性不匹配', expire: '供电超时', charge: '接收环供电', teleport: '跨井传输', phase: '冷暖切换' };
    const recent = prediction.result.events.filter(e => e.time <= frame.time && labels[e.event.type]).slice(-4);
    $('forecast-events').innerHTML = recent.map(e => `<li><time>+${e.time.toFixed(2)}s</time> ${labels[e.event.type]}</li>`).join('');
  }
  function closeForecast() {
    if (!prediction) return;
    prediction = undefined; view.invalidatePlayback(); back(); updateHud();
  }
  function download(name: string, content: string, type: string) {
    const dataURL = content.startsWith('data:'), url = dataURL ? content : URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    if (!dataURL) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function updateHud() {
    const labels = usingPad ? ['左摇杆', 'A', 'B', 'X', 'Y'] : [movementLabel(data.settings.movement), 'E', 'Q', 'Space', 'H'];
    document.querySelectorAll<HTMLElement>('[data-control]').forEach((element, i) => element.textContent = labels[i]);
    $('camera-controls').textContent = usingPad ? '右摇杆调整视角与缩放 · 暂停菜单切换俯视' : '右键拖动视角 · 滚轮缩放 · Tab 切换俯视 · C 复位';
    $('camera-mode-label').textContent = view.tacticalView ? '立体' : '俯视';
    $<HTMLButtonElement>('trial-return').disabled = !trial.exists;
    $('trial-label').textContent = trial.exists ? '重设试验点' : '设试验点';
    $('undo-key').textContent = usingPad ? 'LB' : 'Z';
    $<HTMLButtonElement>('undo-button').disabled = history.size === 0;
    $('echo-panel').hidden = !sim.level.echoLimit;
    $('echo-editor-button').hidden = !sim.level.echoLimit;
    $('echo-count').textContent = `${sim.echoes.length} / ${sim.echoLimit}`;
    $<HTMLButtonElement>('echo-panel').querySelector<HTMLButtonElement>('[data-action=record]')!.disabled = observe || !sim.recording && sim.echoes.length >= sim.echoLimit;
    $('echo-panel').querySelector<HTMLButtonElement>('[data-action=erase]')!.disabled = observe || !sim.recording && sim.echoes.length === 0;
    $('erase-label').textContent = sim.recording ? '取消示教' : '移除';
    $('echo-status').textContent = observe ? '观察已暂停 · 回声与示教均暂停' : sim.recording ? `正在示教 · ${sim.recording.elapsed.toFixed(1)} / 6.0 秒` : '先示教，再让投影替你值守。';
    $('record-label').textContent = sim.recording ? '结束示教' : '开始示教';
    $('record-key').textContent = usingPad ? 'LT' : 'F'; $('erase-key').textContent = usingPad ? 'RB' : 'G';
    markup('echo-timelines', sim.echoes.map((e, i) => `<div class="echo-timeline"><span>${i + 1}</span><div><i></i></div><b>${e.duration.toFixed(1)}s</b></div>`).join(''));
    $('echo-timelines').querySelectorAll<HTMLElement>('i').forEach((bar, i) => bar.style.width = `${sim.echoes[i].time / sim.echoes[i].duration * 100}%`);
    markup('mechanic-status', (sim.level.plates ?? []).map(p => `<span class="${sim.plateActive(p.id) ? 'active' : ''}">${p.echoOnly ? '示教板' : '压板'} ${p.id} · ${sim.plateActive(p.id) ? '占据' : '空闲'}</span>`).join('') + (sim.level.gates ?? []).map(g => `<span class="${sim.gateOpen(g) ? 'active' : ''}">${(g.requires ?? [g.plate]).join(' + ')}${g.inverted ? ' 反向' : ''}${g.poweredBy ? ' / 供电接管' : ''} · 光闸${sim.gateOpen(g) ? '放行' : '关闭'}</span>`).join('') + (sim.level.inverters?.length ? `<span class="phase-${sim.pulses[0]?.phase ?? 'warm'}">场内脉冲 · ${sim.pulses.length ? sim.pulses[0].phase === 'cool' ? '冷光 ◇' : '暖光 ●' : '等待发射'}</span>` : '') + (sim.level.portals?.length ? `<span>${sim.level.portals.map(p => `导光井 ${p.id} ↔ ${p.id}`).join(' · ')} · 保持方向</span>` : ''));
    $('timer').textContent = fmt(sim.elapsed); $('hits').textContent = `${sim.hits}`;
    $('commission-tool').hidden = !sim.level.commission;
    $('repair-tally').hidden = !repair && !sim.level.commission;
    if(sim.level.commission) $('repair-tally').textContent = sim.commissionReadings().map((c,i)=>'甲乙丙丁戊'[i]+(c.passes?' ✓':' ○')).join('　')+' · 联检';
    if (repair) $('repair-tally').textContent = `本单已用 ${sim.moves} 次操作 · 精修目标 ${repair.budget} 次`;
    const coach = !observe && !repair && !data.records[sim.level.id] ? shiftCoach(sim, usingPad) : undefined;
    $('lesson').textContent = coach ?? sim.level.lesson;
    $('lesson').hidden = !coach && sim.elapsed > 20 && !observe;
    for (const r of sim.level.receivers) {
      const s = sim.receivers[r.id], live = s.charge > 0;
      const row = $('receivers').querySelector<HTMLElement>(`[data-status-receiver="${r.id}"]`)!;
      row.classList.toggle('powered', live);
      row.querySelector('small')!.textContent = live ? `${s.charge.toFixed(1)} 秒 · ${Math.min(s.hits, sim.level.repeats)}/${sim.level.repeats}` : '等待供电';
      row.querySelector<HTMLElement>('.charge-track i')!.style.width = `${s.charge / r.ttl * 100}%`;
      row.querySelector('.receiver-check')!.textContent = s.hits >= sim.level.repeats && live ? '✓' : '○';
    }
    $('source-state').innerHTML = `<span class="status-dot ${sim.sourceOn ? 'red' : ''}"></span> 发射器${sim.sourceOn ? '在线' : '已关闭'} <b>${sim.exitOpen ? '出口已开放 ↗' : sim.stable && sim.level.offGrid ? '请关闭发射器' : '出口待机'}</b>`;
    $('stability-state').hidden = sim.level.repeats === 1;
    $('stability-state').textContent = sim.stable ? `循环已连续验证 ${sim.stats.stableSeconds.toFixed(1)} 秒` : '等待所有接收环完成循环验证';
    $('observe-banner').hidden = !observe;
    if (observe) {
      const route = sim.level.commission ? sim.commissionReadings()[probe].route : sim.opticalRoute();
      const explanation = { loop: '光路闭合', wall: '终止于墙体', gate: '终止于关闭的光闸', edge: '离开机房边界', limit: '到达预览上限' }[route.end];
      $('route-summary').textContent = sim.level.commission
        ? `${'甲乙丙丁戊'[probe]}路校线 · ${explanation} · 在端口联检图中切换线路`
        : `从来源发出暖光 · ${explanation} · 冷暖按颜色标注 · 动态闸门请用 B 推演`;
    }
    $('observe-resume').textContent = usingPad ? 'X 继续' : '空格继续';
    $('inspect-label').textContent = sim.level.commission ? '端口联检' : '试镜台';
    $('lens-key').textContent = usingPad ? 'A' : 'E';
    const nearest = sim.nearest;
    const carriedName = sim.carried?.kind === 'prism' ? '双色棱镜' : '反射器';
    const rotation = sim.carried?.kind === 'prism' ? `暖 ${sim.carried.slash ? '/' : '\\'} / 冷 ${sim.carried.slash ? '\\' : '/'}` : sim.carried?.slash ? '/' : '\\';
    $('interaction').innerHTML = observe ? '<kbd>Space</kbd> 继续时间 · 观察弹道后再调整装置' : sim.carried ? `<kbd>E</kbd> ${sim.validCell(sim.targetCell) ? `放置${carriedName}` : '此处无法放置'} <span>·</span> <kbd>Q</kbd> 旋转 ${rotation}` : nearest === 'source' ? `<kbd>E</kbd> ${sim.sourceOn ? '关闭' : '开启'}发射器` : nearest && sim.level.commission ? `<kbd>Q</kbd> 转动 ${nearest.id} 号轴座镜` : nearest ? `<kbd>E</kbd> 拿起${nearest.kind === 'prism' ? '双色棱镜' : '反射器'} <span>·</span> <kbd>Q</kbd> ${nearest.kind === 'prism' ? '交换冷暖反射方向' : '原地旋转'}` : sim.exitOpen ? (sim.level.commission ? '联检通过 · 抵达青色出口 ↗' : '循环已验证 · 空手抵达青色出口 ↗') : '';
    $('interaction').classList.toggle('visible', !!$('interaction').innerHTML);
    if (usingPad) $('interaction').querySelectorAll('kbd').forEach(k => { k.textContent = k.textContent === 'Space' ? 'X' : k.textContent === 'E' ? 'A' : 'B'; });
    $('sound-btn').textContent = `声音 ${data.settings.muted ? '关' : '开'}`;
  }
  function back() {
    if (screen==='camp-map') {
      modalHistory.length=0;
      if (campaignOrigin==='pause' && hasRun && !sim.won) { resumeGame(); pause(); } else menu();
      return;
    }
    if (screen==='camp-address') { campaign.mailbag(); return; }
    if (screen==='camp-district'||screen==='camp-log'||screen==='camp-ending'||screen==='camp-mail') { campaign.map(); return; }
    if (screen==='camp-board'||screen==='camp-receipt') { campaign.district(data.campaign.selected); return; }
    if (screen === 'lens') lens = undefined;
    const previous = modalHistory.pop() ?? (hasRun ? '' : 'menu');
    setScreen(previous);
    if (previous === '') $('overlay').innerHTML = '';
    else if (previous === 'menu') menu();
    else if (previous === 'pause') pause();
    else if (previous === 'settings') settings();
    else if (previous === 'saves') saves();
    else if (previous === 'ledger') ledger();
    else if (previous === 'journal') journal();
    else if (previous === 'levels') levels();
    else if (previous === 'repairs') repairs();
    else if (previous === 'letter' && letter) readLetter(letter);
    else if (previous === 'lens') showLens();
    else if (previous === 'echo-editor') echoEditor();
    else if (previous === 'wardrobe') wardrobe();
    else if (previous === 'win') complete();
    else { setScreen(''); $('overlay').innerHTML = ''; }
  }
  function action(a: string) {
    sound.unlock();
    if ((a === 'quick-language' && screen === 'menu') || (a === 'language' && screen === 'settings')) {
      data.settings.language = data.settings.language === 'en' ? 'zh-CN' : 'en';
      binding = undefined; setLanguage(); persist();
      if (screen === 'menu') { menu(); $('overlay').querySelector<HTMLButtonElement>('[data-action="quick-language"]')?.focus(); }
      else settings();
      sound.play('ui'); return;
    }
    if (screen === 'settings') {
      if (binding && !a.startsWith('bind-')) { binding = undefined; settings(); }
      if (a.startsWith('prefs-go-')) {
        const section = document.getElementById('prefs-'+a.slice(9));
        section?.scrollIntoView({block:'start'});
        section?.querySelector('button')?.focus({preventScroll:true}); return;
      }
      if (a.startsWith('mix-')) {
        const [,name,step] = a.split('-');
        const k = mixChannels.find(key => key === name);
        if (k) setMixValue(k, data.settings[k]*100 + (step === 'up' ? 5 : -5));
        return;
      }
      if (a === 'preview-track') {
        previewTrack = (previewTrack + 1) % previewTracks.length;
        settings(); a = 'listen-music';
      }
      if (a.startsWith('listen-')) {
        const s = data.settings;
        const level = a === 'listen-effects' ? s.effectsVolume : a === 'listen-ui' ? s.uiVolume : s.music ? s.musicVolume : 0;
        if (s.muted || !s.volume || !level) {
          toast(bilingual('此声部已静音。请检查声音开关和音量。','This channel is silent. Check its switch and volume.'));
          return;
        }
        if (a === 'listen-music') sound.previewMusic(previewTracks[previewTrack].scene);
        if (a === 'listen-effects') sound.play('charge');
        if (a === 'listen-ui') sound.play('ui');
        return;
      }
      if (a.startsWith('bind-')) { binding = directions.find(d => a === 'bind-'+d); settings(); return; }
      if (a === 'fullscreen') { void toggleFullscreen(); return; }
      if (a === 'reset-prefs') {
        modal(bilingual('恢复默认设置','Restore defaults'), bilingual('将恢复中文、音量、画面及操作设置。已完成的任务和存档都会保留。','Restore Chinese, audio, display and control defaults? All progress and save slots will be kept.'),
          button('confirm-prefs',bilingual('恢复默认设置','Restore defaults')) + button('back',bilingual('取消','Cancel'),'primary'),'confirm');
        return;
      }
    }
    if (a === 'confirm-prefs' && screen === 'confirm') { resetPreferences(); return; }
    const feedback = a.startsWith('board-turn-') ? 'ratchet'
      : a.startsWith('board-branch-') ? 'harbor-bell'
      : /^board-(early|late)-/.test(a) ? 'timetable-key' : /^(guide-|story-(next|prev)|replay-|letter-|mail-open-)/.test(a) ? 'page' : 'ui';
    sound.play(feedback);
    if (a==='campaign') {
      campaignOrigin=screen==='pause'?'pause':'menu'; checkpoint(); campaign.map(); return;
    }
    if (screen.startsWith('camp-') && campaign.handle(a,screen)) {
      const feedbackSelector = a === 'camp-hint' ? '.camp-hint' : a === 'mail-send' ? '.mail-bounce, .mail-receipt' : undefined;
      const notice = feedbackSelector ? $('overlay').querySelector(feedbackSelector) : null;
      if (notice) requestAnimationFrame(() => {
        if (notice.isConnected) notice.scrollIntoView({block: 'nearest'});
      });
      return;
    }
    if (/^passage-(off|exit|[A-Z])$/.test(a) && screen==='commission' && sim.level.commission && data.campaign.jobs[jobKey('tide',sim.level.id-FIELD_BASE)]?.done) {
      travelPlan=a==='passage-off'?undefined:passageReport(sim,a.slice(8)); inspection(); return;
    }
    if (/^calibrate-(off|[A-Z])$/.test(a) && screen==='commission' && sim.level.commission && data.campaign.jobs[jobKey('loom',sim.level.id-FIELD_BASE)]?.done) {
      templateMirror=a==='calibrate-off'?undefined:a.slice(10); inspection(); return;
    }
    if (a==='commission' && (screen==='' || screen==='pause')) { inspection(); return; }
    if (/^probe-[0-4]$/.test(a) && screen==='commission' && sim.level.commission) {
      probe=Math.min(Number(a.slice(6)),sim.level.commission.length-1); inspection(); return;
    }
    if (a === 'forecast') { if (screen === 'pause') { modalHistory.length = 0; resumeGame(); } openForecast(); }
    else if (/^finding-\d+$/.test(a) && screen === 'forecast' && prediction) {
      const pin = prediction.findings[Number(a.slice(8))];
      if (pin) scrubForecast(pin.frame, pin);
    }
    else if (a === 'lens') showLens();
    else if (/^lens-mirror-\d+$/.test(a) && screen === 'lens' && lens) { lens.select(Number(a.slice(12))); showLens(); }
    else if (a === 'camera-mode' && hasRun && (screen === '' || screen === 'pause')) { view.toggleTactical(); updateHud(); if (screen === 'pause') pause(); }
    else if (/^chapter-\d+$/.test(a) && screen === 'levels') { $('overlay').querySelector<HTMLElement>(`[data-chapter="${a.slice(8)}"]`)?.scrollIntoView({ behavior: data.settings.reducedMotion ? 'instant' : 'smooth', block: 'start' }); }
    else if (a === 'forecast-close') closeForecast();
    else if (a === 'forecast-prev') scrubForecast((prediction?.index ?? 0) - 1);
    else if (a === 'forecast-next') scrubForecast((prediction?.index ?? 0) + 1);
    else if (a === 'trial-set') { if (screen === '' && !sim.won) { trial.set(sim); updateHud(); toast('试验点已记录。调整后按 V 回到这里。'); } }
    else if (a === 'trial-set-pause' && screen === 'pause') { trial.set(sim); pause(); toast('试验点已记录。'); }
    else if (a === 'trial-return-pause' && screen === 'pause' && trial.restore(sim)) { history.clear(); view.invalidatePlayback(); updateHud(); checkpoint(); pause(); toast('试验点已恢复。'); }
    else if (a === 'trial-return') { if (screen === '' && trial.restore(sim)) { history.clear(); view.invalidatePlayback(); updateHud(); checkpoint(); toast('已恢复试验点，布局、回声和供电一并返回。'); } }
    else if (a === 'story-next') { if (activeStory && !activeStory.player.next()) finishStory(); else renderStory(); }
    else if (a === 'story-prev') { activeStory?.player.previous(); renderStory(); }
    else if (a === 'story-skip') finishStory();
    else if (a === 'journal') journal();
    else if (/^replay-\d+-(before|after)$/.test(a)) {
      const [, n, kind] = a.split('-');
      const scene = availableScenes(data.story.seen, data.records).find(s => s.level === Number(n) && s.kind === kind);
      if (scene) playStory(scene, () => { setScreen('journal'); journal(); }, true);
    }
    else if (a === 'continue') continueShift();
    else if (a === 'repairs') repairs();
    else if (a === 'repair-inbox') { menu(); repairs(); }
    else if (a.startsWith('letter-') && screen === 'repairs') {
      const order = REPAIRS.find(r => r.id === a.slice(7));
      if (order) readLetter(order);
    }
    else if (a === 'begin-repair' && screen === 'letter' && letter) load(letter.level, data.repairDrafts[letter.id], letter);
    else if (a === 'menu') menu();
    else if (a === 'pause') { if (screen === '') pause(); else if (screen === 'pause') action('resume'); }
    else if (a === 'resume') { modalHistory.length = 0; setScreen(''); $('overlay').innerHTML = ''; }
    else if (a === 'restart' && hasRun) load(sim.level.id, undefined, repair);
    else if (a === 'next') load(Math.min(LEVELS.length - 1, sim.level.id + 1));
    else if (a === 'echo-wing') load(12);
    else if (a === 'practice') load(16);
    else if (a === 'echo-editor' && (screen === '' || screen === 'pause')) echoEditor();
    else if (/^echo-select-[01]$/.test(a) && screen === 'echo-editor') { selectedEcho = Number(a.at(-1)); echoEditor(); }
    else if (a === 'echo-earlier') editEcho(() => sim.shiftEcho(selectedEcho, -.05));
    else if (a === 'echo-later') editEcho(() => sim.shiftEcho(selectedEcho, .05));
    else if (a === 'echo-shorter') editEcho(() => sim.retimeEcho(selectedEcho, Math.max(.5, (sim.echoes[selectedEcho]?.duration ?? 1) - echoPeriodStep)));
    else if (a === 'echo-longer') editEcho(() => sim.retimeEcho(selectedEcho, Math.min(6, (sim.echoes[selectedEcho]?.duration ?? 1) + echoPeriodStep)));
    else if (a === 'echo-step' && screen === 'echo-editor') { echoPeriodStep = echoPeriodStep === .05 ? .01 : echoPeriodStep === .01 ? .001 : .05; echoEditor(); }
    else if (a === 'echo-delete') editEcho(() => sim.eraseEcho(selectedEcho));
    else if (a === 'echo-sync') editEcho(() => sim.synchronizeEchoes());
    else if (a === 'echo-undo' && screen === 'echo-editor') { history.undo(sim); view.invalidatePlayback(); checkpoint(); echoEditor(); updateHud(); }
    else if (a === 'record' || a === 'erase') gameAction(a);
    else if (a === 'relay') load(7);
    else if (a === 'prism-wing') load(18);
    else if (a === 'undo') gameAction('undo');
    else if (a === 'levels') levels();
    else if (a === 'settings') settings();
    else if (a === 'help') help();
    else if (screen === 'help' && (a === 'guide-keys' || a === 'guide-pad' || a === 'guide-devices')) help(a === 'guide-keys' ? 'keys' : a === 'guide-pad' ? 'pad' : 'devices');
    else if (a === 'wardrobe') wardrobe();
    else if (a === 'saves') saves();
    else if (a === 'ledger') ledger();
    else if (a === 'note-close') $('briefing').hidden = true;
    else if (a === 'photo') photo();
    else if (a === 'photo-dof') { photoDof = !photoDof; photo(); }
    else if (a === 'capture') { download(`borrowed-fire-${sim.level.id + 1}.png`, view.capture(), 'image/png'); toast('图片已交给浏览器保存。'); }
    else if (a === 'load-auto' && data.checkpoint) continueShift();
    else if (/^save-slot-[0-2]$/.test(a) && hasRun && !sim.won) {
      const i = Number(a.at(-1));
      data.slots[i] = { snapshot: sim.snapshot(), savedAt: new Date().toISOString(), hintCount, appearance: { ...data.appearance }, ...(repair && { repairId: repair.id }) }; persist(); saves(); toast(`存档 ${i + 1} 已保存。`);
    } else if (/^load-slot-[0-2]$/.test(a)) {
      const slot = data.slots[Number(a.at(-1))];
      if (slot) { data.appearance = { ...slot.appearance }; view.setAppearance(data.appearance); load(slot.snapshot.level, slot, REPAIRS.find(r => r.id === slot.repairId)); }
    } else if (/^delete-slot-[0-2]$/.test(a)) {
      const i = Number(a.at(-1)); modal('删除存档', `<p class="dialog-copy">删除手动存档 ${i + 1}？自动存档不会受影响。</p>`, button(`confirm-delete-${i}`, '删除') + button('back', '取消', 'primary'), 'confirm');
    } else if (/^confirm-delete-[0-2]$/.test(a)) { data.slots[Number(a.at(-1))] = null; persist(); back(); }
    else if (a === 'export') { checkpoint(); download('borrowed-fire-save.json', exportSave(data), 'application/json'); }
    else if (a === 'import') $('save-import').click();
    else if (a === 'confirm-import' && pendingImport) {
      data = pendingImport; pendingImport = undefined; hasRun = false; repair = undefined; letter = undefined;
      prediction = undefined; lens = undefined; observe = false; trial.clear(); history.clear(); hintCount = 0;
      sim = titleCircuit(); view.setAppearance(data.appearance); view.setQuality(data.settings.highQuality);
      applyMix(); setLanguage();
      applyDisplayPreferences(); persist(); menu(); toast('存档已导入。');
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
    else if (a === 'motion') { data.settings.reducedMotion = !data.settings.reducedMotion; applyDisplayPreferences(); persist(); settings(); }
    else if (a === 'dialogue') { data.settings.dialogue = !data.settings.dialogue; persist(); settings(); }
    else if (a === 'music') { data.settings.music = !data.settings.music; sound.setMusic(data.settings.music); persist(); settings(); }
    else if (a === 'captions') { data.settings.audioCaptions = !data.settings.audioCaptions; persist(); settings(); }
    else if (a === 'shake') { data.settings.cameraShake = !data.settings.cameraShake; persist(); settings(); }
    else if (a === 'invert') { data.settings.invertOrbit = !data.settings.invertOrbit; persist(); settings(); }
    else if (a === 'sensitivity') { data.settings.cameraSensitivity = data.settings.cameraSensitivity >= 2 ? .5 : Math.min(2, data.settings.cameraSensitivity + .25); persist(); settings(); }
    else if (a === 'deadzone') { data.settings.deadZone = data.settings.deadZone >= .4 ? .1 : Math.round((data.settings.deadZone+.05)*100)/100; persist(); settings(); }
    else if (a === 'dof') { data.settings.depthOfField = !data.settings.depthOfField; persist(); settings(); }
    else if (a === 'environment') { data.settings.environment = !data.settings.environment; persist(); settings(); }
    else if (a === 'text-size') { data.settings.textScale = data.settings.textScale < 1.2 ? 1.2 : data.settings.textScale < 1.4 ? 1.4 : 1; applyDisplayPreferences(); persist(); settings(); }
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
    const beforeMoves=sim.moves, beforeSource=sim.sourceOn;
    if (a === 'observe') { observe = !observe; lens = undefined; sound.play('ui'); updateHud(); }
    else if (observe && a === 'interact') showLens();
    else if (a === 'hint') hint();
    else if (!observe && a === 'interact') { const before = sim.moves; history.perform(sim, () => sim.interact()); if (sim.carried && before === sim.moves && !sim.validCell(sim.targetCell)) toast('前方格子被占用，朝向一块空地再放下。'); }
    else if (!observe && a === 'rotate') history.perform(sim, () => sim.rotate());
    else if (!observe && a === 'record') {
      if (!sim.level.echoLimit) return;
      if (!sim.recording && sim.echoes.length >= sim.echoLimit) { toast('投影位置已满，按 G 移除最后一段示教。'); return; }
      history.perform(sim, () => sim.toggleRecording()); updateHud(); checkpoint();
    }
    else if (!observe && a === 'erase') { history.perform(sim, () => sim.removeEcho()); updateHud(); checkpoint(); }
    else if (a === 'undo') {
      if (history.undo(sim)) { view.invalidatePlayback(); updateHud(); checkpoint(); toast('已撤销装置操作，回路与脉冲一并恢复。'); }
      else toast('本次进入机房后，还没有可撤销的操作。');
    }
    if(sim.level.commission && (beforeMoves!==sim.moves || beforeSource!==sim.sourceOn)) {
      const j=jobOf(data.campaign,jobKey('field',sim.level.id-FIELD_BASE)); if(!j.done)j.actions++;
      checkpoint();
    }
  }
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    usingPad = false;
    if (binding && screen === 'settings') {
      e.preventDefault();
      if (e.repeat) return;
      if (e.code !== 'Escape' && !bindMovement(data.settings.movement, binding, e.code)) {
        toast(bilingual('该键留给设备或菜单，请换一个字母、数字或小键盘键。','That key is reserved. Try a free letter, number or numpad key.')); return;
      }
      binding = undefined; persist(); settings(); return;
    }
    if (e.repeat && e.code === 'Escape') return;
    if (e.code === 'Tab' && screen !== '' && screen !== 'menu' && screen !== 'photo' && screen !== 'forecast') {
      const options = [...$('overlay').querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')];
      if (options.length) { e.preventDefault(); const index = options.indexOf(document.activeElement as HTMLElement); options[(index + (e.shiftKey ? -1 : 1) + options.length) % options.length].focus(); } return;
    }
    if (screen === 'forecast') {
      if (['Escape', 'KeyB', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        if (e.code === 'Escape' || e.code === 'KeyB') closeForecast();
        else scrubForecast((prediction?.index ?? 0) + (e.code === 'ArrowLeft' ? -1 : 1));
      }
      return;
    }
    if (screen === 'lens' && lens && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
      e.preventDefault(); lens.cycle(e.code === 'ArrowLeft' ? -1 : 1); showLens(); return;
    }
    if (screen === 'story') {
      if (['Space', 'Enter', 'KeyE', 'ArrowRight', 'ArrowLeft', 'Escape'].includes(e.code)) {
        e.preventDefault();
        if (!e.repeat) {
          const focused = document.activeElement;
          if (e.code === 'Enter' && focused instanceof HTMLButtonElement && $('overlay').contains(focused)) focused.click();
          else action(e.code === 'Escape' ? 'story-skip' : e.code === 'ArrowLeft' ? 'story-prev' : 'story-next');
        }
      }
      return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && screen === '') e.preventDefault();
    if (e.code === 'Escape') { e.preventDefault(); if (screen === '') pause(); else if (screen === 'pause') action('resume'); else if (screen !== 'menu' && screen !== 'win') back(); return; }
    if (screen !== '') return;
    keys.add(e.code); if (e.repeat) return; sound.unlock();
    if (e.code === 'KeyN' && sim.level.commission) inspection();
    if (e.code === 'KeyB') action('forecast');
    if (e.code === 'KeyT') action('trial-set');
    if (e.code === 'KeyV') action('trial-return');
    if (e.code === 'KeyE') gameAction('interact');
    if (e.code === 'KeyQ') gameAction('rotate');
    if (e.code === 'Space') gameAction('observe');
    if (e.code === 'KeyH') gameAction('hint');
    if (e.code === 'KeyF') gameAction('record');
    if (e.code === 'KeyG') gameAction('erase');
    if (e.code === 'KeyL') echoEditor();
    if (e.code === 'KeyZ') gameAction('undo');
    if (e.code === 'KeyR') action('restart');
    if (e.code === 'KeyC') view.resetCamera();
    if (e.code === 'Tab') { e.preventDefault(); action('camera-mode'); }
    if (e.code === 'KeyI') ledger();
    if (e.code === 'KeyJ') saves();
    if (e.code === 'F2') { e.preventDefault(); photo(); }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); if (screen === '') pause(); });
  document.addEventListener('visibilitychange', () => { sound.setBackground(document.hidden); if (document.hidden) { checkpoint(); if (screen === '') pause(); } });
  addEventListener('pagehide', () => checkpoint());
  const canvas = view.renderer.domElement;
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => { if (e.button === 2 && (screen === '' || screen === 'photo' || screen === 'forecast')) { cameraDrag = true; previousX = e.clientX; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', e => { if (cameraDrag) { view.orbit((e.clientX - previousX) * .004 * orbitScale()); previousX = e.clientX; } });
  canvas.addEventListener('pointerup', () => cameraDrag = false);
  canvas.addEventListener('wheel', e => { if (screen === '' || screen === 'photo' || screen === 'forecast') { e.preventDefault(); view.zoomBy(-Math.sign(e.deltaY) * .05); } }, { passive: false });
  const orbitScale = () => data.settings.cameraSensitivity * (data.settings.invertOrbit ? -1 : 1);
  function pollPad(dt: number): { x: number; y: number } {
    const pad = navigator.getGamepads?.().find(p => p?.mapping === 'standard');
    const input = controller.read(pad ?? undefined, dt, data.settings.deadZone);
    if (!pad) usingPad = false;
    else if (input.move.x || input.move.y || input.camera.x || input.camera.y || input.interact || input.rotate || input.observe || input.hint || input.undo || input.record || input.erase || input.pause || input.navigation) { usingPad = true; inputNow(); }
    $('pad-state').hidden = !pad;
    if (input.pause) { sound.unlock(); if (screen === '') pause(); else if (screen === 'pause') action('resume'); }
    if (screen === '') {
      if (input.record) gameAction('record'); if (input.erase) gameAction('erase');
      if (input.undo) gameAction('undo');
      if (input.interact) gameAction('interact'); if (input.rotate) gameAction('rotate'); if (input.observe) gameAction('observe'); if (input.hint) gameAction('hint');
      if (input.camera.x) view.orbit(input.camera.x * dt * orbitScale());
      if (input.camera.y) view.zoomBy(-input.camera.y * dt * .5 * data.settings.cameraSensitivity);
    } else {
      const options = [...$('overlay').querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if (input.navigation && options.length) {
        const index = options.indexOf(document.activeElement as HTMLButtonElement);
        options[index < 0 ? input.navigation > 0 ? 0 : options.length - 1 : (index + input.navigation + options.length) % options.length].focus(); sound.play('ui');
      }
      if (screen === 'photo') { if (input.camera.x) view.orbit(input.camera.x * dt * orbitScale()); if (input.camera.y) view.zoomBy(-input.camera.y * dt * .5 * data.settings.cameraSensitivity); }
      if (input.confirm) {
        sound.unlock();
        const active = options.find(option => option === document.activeElement) ?? options[0]; active?.click();
      }
      if (input.back && binding) { binding = undefined; settings(); }
      else if (input.back && screen === 'forecast') closeForecast();
      else if (input.back && screen !== 'menu' && screen !== 'win') { if (screen === 'story') action('story-skip'); else if (screen === 'pause') action('resume'); else back(); }
    }
    return input.move;
  }
  function frame(now: number) {
    const wallSeconds=(now-lastTime)/1000, dt=Math.min(wallSeconds,.05); lastTime=now;
    const pad = pollPad(dt);
    const fieldClock=sim.level.commission && hasRun && ['', 'forecast','lens','commission'].includes(screen);
    const k=fieldClock ? jobKey('field',sim.level.id-FIELD_BASE) : campaign.clockKey(screen);
    if(k){
      countPlay(data.campaign,k,wallSeconds,(now-lastInput)/1000,!document.hidden && document.hasFocus());
      clockSave+=wallSeconds; if(clockSave>=12){clockSave=0;persist();}
    }
    if (screen === '' && !observe) {
      const dx = Number(keys.has(data.settings.movement.right) || keys.has('ArrowRight')) - Number(keys.has(data.settings.movement.left) || keys.has('ArrowLeft')) + pad.x;
      const dy = Number(keys.has(data.settings.movement.down) || keys.has('ArrowDown')) - Number(keys.has(data.settings.movement.up) || keys.has('ArrowUp')) + pad.y;
      const movement = view.movement(dx, dy);
      sim.move(movement.x, movement.y, dt, keys.has('ShiftLeft') || keys.has('ShiftRight')); sim.step(dt);
      autoTimer += dt; if (autoTimer > 8) { checkpoint(); autoTimer = 0; }
    } else if (screen === 'menu' && !hasRun) sim.step(dt, false);
    for (const event of sim.drainEvents()) {
      if (screen !== 'menu' && !(sim.level.commission && event.type === 'win')) sound.play(event.type === 'reflect' && event.prism ? `prism-${event.phase}` : event.type);
      const subtitle = audioCaptions[event.type];
      if (subtitle && data.settings.audioCaptions && screen === '' && (now >= captionUntil || subtitle.priority >= captionPriority)) {
        const caption = $('sound-caption');
        caption.textContent = bilingual(subtitle.zh, subtitle.en); caption.hidden = false;
        captionUntil = now + 1700; captionPriority = subtitle.priority;
      }
      if (event.type === 'hit') { if (data.settings.cameraShake && !data.settings.reducedMotion) view.kick(); toast('绝缘服挡住了冲击。已返回起点，装置布局保留。'); }
      if (hasRun && screen === '' && performance.now() >= feedbackUntil) {
        const reading = circuitReading(event, sim.level);
        if (reading) {
          $('circuit-feedback').textContent = reading.label;
          feedbackUntil = performance.now() + 1800;
        } else if (event.type === 'charge') {
          const receiver = sim.level.receivers.find(r => r.id === event.receiverId);
          if (receiver) $('circuit-feedback').textContent = `${receiver.name}已收到光 · ${Math.min(sim.receivers[receiver.id].hits, sim.level.repeats)} / ${sim.level.repeats}`;
        }
      }
      if (data.settings.cameraShake && !data.settings.reducedMotion && event.type === 'drop') view.kick(.12);
      if (data.settings.cameraShake && !data.settings.reducedMotion && event.type === 'charge') view.kick(.08);
      if ((event.type === 'reflect' || event.type === 'lost') && event.x !== undefined && event.y !== undefined) view.burst(event.x, event.y);
      if (event.type === 'win' && hasRun && screen === '') complete();
    }
    hudTimer += dt; if (hasRun && screen === '' && hudTimer > .1) { updateHud(); hudTimer = 0; }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show'); }
    if (captionUntil && now >= captionUntil) { $('sound-caption').hidden = true; captionUntil = 0; }
    sound.tick(sim.level.receivers.filter(r => sim.receivers[r.id].charge > 0).length / sim.level.receivers.length, screen === '' && !observe);
    view.setEffects(screen === 'photo' ? photoDof : data.settings.depthOfField, data.settings.environment);
    if (!screen.startsWith('camp-')) view.update(prediction?.preview ?? sim, dt, prediction ? false : observe, hintCount >= 3, screen === 'menu', !data.settings.reducedMotion, probe);
    if (screen === 'forecast' && prediction?.pin) {
      const pos = view.project(prediction.pin.cell, .42);
      $('inspection-pin').style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    }
    app.dataset.observing = String(observe);
    if (hasRun && screen === '') for (const r of sim.level.receivers) {
      const label = $('world-labels').querySelector<HTMLElement>(`[data-receiver="${r.id}"]`); if (!label) continue;
      const position = view.project(r, .38); label.style.transform = `translate(${position.x}px,${position.y}px)`;
      label.classList.toggle('powered', sim.receivers[r.id].charge > 0);
    }
    frameCount++; requestAnimationFrame(frame);
  }
  // A read-only diagnostic surface supports browser smoke checks without exposing solutions in the UI.
  Object.defineProperty(window, '__borrowedFire', { get: () => ({ screen, repairId: repair?.id, forecastIndex: prediction?.index, trialSet: trial.exists, storyScene: activeStory?.player.scene.id, storyLine: activeStory?.player.index, elapsed: sim.elapsed, level: sim.level.id, frameCount, echoes: sim.echoes.length, recording: sim.recording?.elapsed ?? null, carried: sim.carried?.id ?? null, undoDepth: history.size, powered: sim.powered, exitOpen: sim.exitOpen, player: { ...sim.player }, appearance: { ...data.appearance }, slots: data.slots.map(Boolean), depthOfField: view.dof.enabled }) });
  document.title = bilingual('借火 — 末班维修员','Borrowed Fire — The Night Mechanic');
  menu(); requestAnimationFrame(frame);
}

try { boot(); } catch (error) {
  console.error(error);
  if (document.documentElement.lang === 'en') {
    app.innerHTML = '<div class="fallback"><span class="fallback-brand">Borrowed Fire</span><h1>The machine room could not start.</h1><p>Use a desktop browser with WebGL 2 and enable hardware acceleration.</p><p>For offline play, open the exported single-file HTML.</p><button onclick="location.reload()">Restart</button></div>';
  } else app.innerHTML = `<div class="fallback"><span class="fallback-brand">借火</span><h1>这间机房暂时无法启动。</h1><p>请使用支持 WebGL 2 的桌面浏览器，并开启硬件加速。</p><p>离线游玩请使用导出的单文件 HTML；项目源码的运行方式请查看 README。</p><button onclick="location.reload()">重新启动</button></div>`;
}
