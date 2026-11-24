import { restoredSectors, signedCount } from './campaign-progress';
import type { SaveData } from './storage';

// Original mark: an interrupted circuit, closed by a lightning-shaped bridge.
export const MARK = `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M29 7H13L6 14v20l7 7h21l8-8V18" stroke="currentColor" stroke-width="4"/><path d="m31 3-12 22h10l-9 20 22-27H30l8-15Z" fill="currentColor"/></svg>`;
export const ROOT_MARKUP = `
  <div id="viewport"></div><div class="vignette"></div>
  <header class="topbar">
    <button class="brand" data-action="menu" aria-label="返回主菜单">${MARK}<span>借火</span></button>
    <span class="station" id="station-status">第七区 · 夜班</span>
    <nav><button data-action="sound" id="sound-btn" aria-label="切换声音">声音 开</button><button data-action="ledger">工单 <kbd>I</kbd></button><button data-action="saves">存档 <kbd>J</kbd></button><button data-action="pause" id="pause-btn">暂停 <kbd>Esc</kbd></button></nav>
  </header>
  <main id="hud" hidden>
    <section class="room-title"><span id="room-index" class="room-number"></span><div><h1 id="room-name"></h1><p id="room-subtitle" hidden></p><p id="lesson" class="lesson"></p></div></section>
    <aside class="mission"><div class="panel-heading"><h2>设备状态</h2><span class="panel-line"></span></div><p id="objective"></p><div id="receivers"></div><div id="source-state" class="source-state"></div><div id="stability-state" class="stability-state" hidden></div><div id="mechanic-status" class="mechanic-status"></div><div id="repair-tally" hidden></div><div class="mission-footer"><span>用时 <b id="timer">00:00</b></span><span>受击 <b id="hits">0</b></span></div></aside>
    <aside id="echo-panel" class="echo-panel" hidden><div class="panel-heading"><h2>回声示教</h2><span id="echo-count"></span></div><p id="echo-status"></p><div id="echo-timelines"></div><div class="echo-actions"><button data-action="record"><kbd id="record-key">F</kbd> <span id="record-label">开始示教</span></button><button data-action="erase"><kbd id="erase-key">G</kbd> <span id="erase-label">移除</span></button></div><small>只记录走位 · 最长 6 秒 · 循环回到起点</small></aside>
    <div id="workbench" class="workbench"><button id="commission-tool" data-action="commission" hidden>端口联检 <kbd>N</kbd></button><button data-action="forecast">推演 <kbd>B</kbd></button><button id="echo-editor-button" data-action="echo-editor" hidden>回声调度 <kbd>L</kbd></button><button data-action="trial-set"><span id="trial-label">设试验点</span> <kbd>T</kbd></button><button id="trial-return" data-action="trial-return" disabled>返回试验点 <kbd>V</kbd></button><p id="circuit-feedback" aria-live="polite"></p></div>
    <div id="world-labels" aria-hidden="true"></div>
    <aside id="briefing" class="field-note" hidden><header><b>维修提示 <span id="entry-number"></span></b><button data-action="note-close" aria-label="关闭提示">×</button></header><p id="briefing-text"></p><p id="hint-text" class="hint-text" hidden></p><button data-action="hint" class="text-button">下一条提示 <kbd>H</kbd></button></aside>
    <div id="observe-banner" class="observe-banner" hidden><b>观察</b><div>时间暂停 · 虚线为当前弹道<small id="route-summary"></small></div><button data-action="lens"><span id="inspect-label">试镜台</span> <kbd id="lens-key">E</kbd></button><span id="observe-resume">空格继续</span></div>
    <div id="interaction" class="interaction" role="status"></div>
    <div id="sound-caption" role="status" aria-live="polite" data-localized hidden></div><footer class="control-bar"><span><kbd data-control="move">WASD</kbd> 移动</span><span><kbd data-control="interact">E</kbd> <span id="interact-action">拿取 / 放下</span></span><span><kbd data-control="rotate">Q</kbd> 旋转</span><span><kbd data-control="observe">Space</kbd> 观察</span><button id="undo-button" data-action="undo">撤销 <kbd id="undo-key">Z</kbd></button><button data-action="hint">提示 <kbd data-control="hint">H</kbd></button><button data-action="photo">拍照 <kbd>F2</kbd></button><button data-action="restart">重试 <kbd>R</kbd></button></footer>
    <div class="camera-note"><button data-action="camera-mode"><span id="camera-mode-label">俯视</span> <kbd>Tab</kbd></button><span id="camera-controls">右键拖动视角 · 滚轮缩放 · C 复位</span><span id="pad-state" hidden> · 手柄已连接</span></div>
  </main>
  <div id="overlay" class="overlay"></div><div id="toast" class="toast" role="status" aria-live="polite"></div>
  <input id="save-import" type="file" accept="application/json,.json" hidden>
  <div class="mobile-notice">需要键盘或手柄 · 建议电脑横屏游玩</div>`;

// Two-ink cutaway of the pivot mirror used on the shop floor.
const mirrorPlate = `<svg class="cover-plate" viewBox="0 0 156 106" fill="none" aria-hidden="true">
  <g stroke="#ad362c" stroke-linecap="square">
    <path d="M22 70 80 46 115 6" stroke-width="4"/>
    <path d="m18 67 55-23m13-2 32-37" stroke-width="1"/>
  </g>
  <g stroke="currentColor" stroke-linejoin="round">
    <path d="m24 87 58-14 49 8-58 16z" fill="#baae97"/>
    <path d="m24 87 49 10 58-16v5l-58 17-49-11z" fill="currentColor"/>
    <path d="M45 85v-5l45-11 21 5v5L67 91z" fill="#ebe0c9"/>
    <path d="m56 81 14-6 5-21 9 2-2 19 14 3-28 8z" fill="currentColor"/>
    <path d="m43 22 13-6 59 37-14 7z" fill="#efe6d4" stroke-width="2"/>
    <path d="m43 22 58 38-1 9-58-39z" fill="#33454c" stroke-width="2"/>
    <path d="m101 60 14-7-1 9-14 7z" fill="#8c958a" stroke-width="2"/>
    <g stroke="#efe6d4" stroke-width="1"><path d="m46 27 13 8m-10-4 13 8m1 0 21 14m-15-8 10 7m3 0 13 9"/></g>
    <path d="m48 23 9-4m5 8 7-3m4 10 8-4m8 12 8-4" stroke="#8b8576"/>
    <ellipse cx="79" cy="54" rx="7" ry="8" fill="#eee3cb" stroke-width="2" transform="rotate(-27 79 54)"/>
    <path d="m76 53 5 4m-25 25 7-2m16 4 12-4"/>
  </g>
</svg>`;

export function menuMarkup(data: SaveData) {
  const districts = Array.from({ length: 8 }, (_, i) => restoredSectors(data.campaign, i));
  const count = signedCount(data.campaign);
  return `<section class="shift-cover" aria-labelledby="cover-title">
    <header class="cover-mast">${MARK}<span>第七区维修组</span></header>
    <div class="cover-art"><h1 id="cover-title" data-localized>${data.settings.language === 'en' ? 'Borrowed <span>Fire</span>' : '借<span>火</span>'}</h1>${mirrorPlate}</div>
    <p class="cover-subtitle">末班维修员</p>
    <div class="cover-contents">
      <button class="cover-campaign" data-action="campaign" aria-label="天亮之前 · 复网战役">
        <span>天亮之前</span><small>复网战役</small><i aria-hidden="true">→</i>
      </button>
      <div class="cover-progress" aria-label="复网进度，已签收 ${count} 项，共 144 项">
        <div class="cover-marks" aria-hidden="true">${districts.map(n => `<i style="--restored:${n/6*100}%"></i>`).join('')}</div>
        <span>工单</span><b>${count} / 144</b>
      </div>
      <div class="cover-shifts">
        <button data-action="continue">${data.checkpoint ? '继续夜班' : '开始夜班'}</button>
        <button data-action="repairs">返修值班台</button>
        <button data-action="levels">选择机房</button>
      </div>
      <div class="cover-branches" role="group" aria-label="章节直达">
        <button data-action="relay" aria-label="中继站 · 新章节">中继站</button>
        <button data-action="echo-wing" aria-label="回声花园 · 新章节">回声花园</button>
        <button data-action="prism-wing" aria-label="分光温室 · 新章节">分光温室</button>
      </div>
    </div>
    <footer class="cover-footer">
      <div class="cover-tools">
        <button data-action="saves">存档管理</button>
        <button data-action="wardrobe">维修员</button>
        <button data-action="settings">设置与操作</button>
      </div>
      <div class="cover-notes"><p>鼠标选择 · 手柄 A 确认</p><button data-action="quick-language" data-localized lang="${data.settings.language === 'en' ? 'zh-CN' : 'en'}">${data.settings.language === 'en' ? '简体中文' : 'English'}</button></div>
    </footer>
  </section>`;
}
