import { LEVELS } from './levels';
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
    <aside class="mission"><div class="panel-heading"><h2>设备状态</h2><span class="panel-line"></span></div><p id="objective"></p><div id="receivers"></div><div id="source-state" class="source-state"></div><div id="mechanic-status" class="mechanic-status"></div><div class="mission-footer"><span>时间 <b id="timer">00:00</b></span><span>受击 <b id="hits">0</b></span></div></aside>
    <div id="world-labels" aria-hidden="true"></div>
    <aside id="briefing" class="field-note" hidden><header><b>维修提示 <span id="entry-number"></span></b><button data-action="note-close" aria-label="关闭提示">×</button></header><p id="briefing-text"></p><p id="hint-text" class="hint-text" hidden></p><button data-action="hint" class="text-button">下一条提示 <kbd>H</kbd></button></aside>
    <div id="observe-banner" class="observe-banner" hidden><b>观察</b>时间暂停 · 虚线为当前弹道<span>空格继续</span></div>
    <div id="interaction" class="interaction" role="status"></div>
    <footer class="control-bar"><span><kbd data-control="move">WASD</kbd> 移动</span><span><kbd data-control="interact">E</kbd> 拿取 / 放下</span><span><kbd data-control="rotate">Q</kbd> 旋转</span><span><kbd data-control="observe">Space</kbd> 观察</span><button id="undo-button" data-action="undo">撤销 <kbd id="undo-key">Z</kbd></button><button data-action="hint">提示 <kbd data-control="hint">H</kbd></button><button data-action="photo">拍照 <kbd>F2</kbd></button><button data-action="restart">重试 <kbd>R</kbd></button></footer>
    <div class="camera-note"><span id="camera-controls">右键拖动视角 · 滚轮缩放 · C 复位</span><span id="pad-state"></span></div>
  </main>
  <div id="overlay" class="overlay"></div><div id="toast" class="toast" role="status" aria-live="polite"></div>
  <input id="save-import" type="file" accept="application/json,.json" hidden>
  <div class="mobile-notice">需要键盘或手柄 · 建议电脑横屏游玩</div>`;

export function menuMarkup(data: SaveData) {
  const completed = Object.keys(data.records).length;
  return `<section class="home-content"><div class="home-stamp">第七区维修组</div><div class="home-wordmark">${MARK}<h1>借火</h1></div><p class="home-subtitle">末班维修员</p><div class="home-actions">
    <button data-action="continue" class="menu-option selected"><span class="menu-cursor">▸</span>${data.checkpoint ? '继续夜班' : '开始夜班'}</button>
    <button data-action="relay" class="menu-option"><span class="menu-cursor">▸</span>中继站 · 新章节</button>
    <button data-action="levels" class="menu-option"><span class="menu-cursor">▸</span>选择机房</button>
    <button data-action="saves" class="menu-option"><span class="menu-cursor">▸</span>存档管理</button>
    <button data-action="wardrobe" class="menu-option"><span class="menu-cursor">▸</span>维修员</button>
    <button data-action="settings" class="menu-option"><span class="menu-cursor">▸</span>设置与操作</button>
  </div><div class="home-progress"><span>维修进度</span><b>${String(completed).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')}</b><div>${LEVELS.map(l => `<i class="${data.records[l.id] ? 'done' : ''}"></i>`).join('')}</div></div></section><div class="home-caption"><b>注意：高压脉冲</b><span>搬动反射器，恢复设施供电。</span></div><footer class="edition"><span>借火 / 单人动作解谜</span><span>鼠标选择 · 手柄 A 确认</span></footer>`;
}
