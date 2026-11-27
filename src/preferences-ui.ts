import { directions, keyLabel, type Direction, type MixChannel, type Preferences } from './preferences';
import type { SoundScene } from './night-score';

type Pair = readonly [string, string];
export const previewTracks: readonly {scene:SoundScene; name:Pair}[] = [
  {scene:'menu',name:['夜班封面','Night shift']}, {scene:'room',name:['机房供电','Powered room']},
  {scene:'harbor',name:['码头班表','Harbour']}, {scene:'workshop',name:['配线织盘','Loom']},
  {scene:'post',name:['退信邮袋','Mailbag']}, {scene:'paper',name:['值班文书','Paperwork']},
  {scene:'story',name:['夜班电台','Radio']}, {scene:'tram',name:['末班车','Last tram']},
];
export function preferencesPage(p: Preferences, full: boolean, canFullscreen: boolean, trackIndex:number, listening?: Direction) {
  const t = (zh: string, en: string) => p.language === 'en' ? en : zh;
  const on = (v: boolean) => v ? t('开','On') : t('关','Off');
  const row = (action: string, name: Pair, help: Pair, value: string, selected?: boolean, disabled = false) =>
    `<button class="pref-row" data-action="${action}" ${disabled?'disabled':''} ${selected === undefined ? '' : 'aria-pressed="'+selected+'"'}><span class="setting-label">${t(...name)}<small>${t(...help)}</small></span><span class="setting-value">${value}${selected === undefined?'':'<i class="setting-contact" aria-hidden="true"></i>'}</span></button>`;
  const mix = (k: MixChannel, name: Pair, cue?:string) => {
    const n = Math.round(p[k]*100), label = t(...name);
    const step = (up:boolean) => `<button data-action="mix-${k}-${up?'up':'down'}" aria-label="${up?t('提高','Raise'):t('降低','Lower')} ${label}"> ${up?'+':'−'} </button>`;
    return `<div class="pref-channel"><label for="pref-${k}">${label}</label><div class="pref-fader">${step(false)}<input id="pref-${k}" aria-label="${label}" type="range" min="0" max="100" step="1" value="${n}" style="--fader:${n}%" data-mix="${k}">${step(true)}</div><output for="pref-${k}">${n}%</output>${cue?`<button class="pref-listen" data-action="listen-${cue}" aria-label="${t('试听','Preview')} ${label}">${t('试听','Listen')}</button>`:''}</div>`;
  };
  const section=(id:string,name:Pair,rows:string)=>`<section class="settings-section" id="prefs-${id}"><h2>${t(...name)}</h2><div>${rows}</div></section>`;
  const labels:Record<Direction,Pair>={up:['前','Up'],left:['左','Left'],down:['后','Down'],right:['右','Right']};
  const keys = `<div class="pref-bindings"><div class="setting-label">${t('移动按键','Movement keys')}<small>${listening?t('按下一个新键；Esc 取消。','Press the new key. Esc cancels.'):t('选择方向后按键，方向键始终可用。','Select a direction, then press a key. Arrow keys always work.')}</small></div><div>${directions.map(d=>`<button data-action="bind-${d}" aria-pressed="${listening===d}">${t(...labels[d])}<kbd>${listening===d?'…':keyLabel(p.movement[d])}</kbd></button>`).join('')}</div></div>`;
  const groups: [string,Pair,string][] = [
    ['reading',['语言与阅读','Language & reading'], [
      row('language',['语言 / Language','Language / 语言'],['界面、工单、提示和通讯','Menus, work orders, hints and dialogue'],p.language==='en'?'English → 简体中文':'简体中文 → English'),
      row('text-size',['文字大小','Text size'],['菜单、工单与现场读数','Menus, paperwork and instruments'],Math.round(p.textScale*100)+'%'),
      row('dialogue',['自动播放剧情','Play story scenes'],['首次入场与完工时播放通讯','Play radio scenes on first arrival and completion'],on(p.dialogue),p.dialogue),
      row('captions',['声音提示字幕','Sound captions'],['显示供电、失电与设备音的文字提示','Describe power changes and equipment sounds on site'],on(p.audioCaptions),p.audioCaptions),
    ].join('')],
    ['audio',['调音台','Mixing desk'],[
      row('sound',['声音开关','Sound'],['控制整台游戏的声音','Enable or mute all game audio'],on(!p.muted),!p.muted),
      mix('volume',['总音量','Master volume']),mix('musicVolume',['配乐','Score'],'music'),mix('effectsVolume',['现场音效','Equipment'],'effects'),mix('uiVolume',['按键与纸张','Interface'],'ui'),
      row('preview-track',['试听场景','Preview scene'],['点按切换曲目并试听两小节','Press to hear two bars from the next scene'],t(...previewTracks[trackIndex].name)),
      row('music',['背景音乐','Background music'],['配乐随地点与供电变化','Scene music changes with location and power'],on(p.music),p.music),
    ].join('')],
    ['display',['显示与动态','Display & motion'],[
      row('fullscreen',['全屏显示','Fullscreen'],['跟随当前窗口；Esc 可退出','Applies to this window. Esc exits fullscreen.'],canFullscreen?on(full):t('浏览器不支持','Unavailable'),full,!canFullscreen),
      row('quality',['高画质','High quality'],['降低画质可减少耗电，停用辉光与景深','Lower quality saves power and disables bloom and depth of field'],on(p.highQuality),p.highQuality),
      row('environment',['环境照明','Environment lighting'],['显示金属表面的环境反射','Show reflections on metal surfaces'],on(p.environment),p.environment),
      row('dof',['游戏景深','Depth of field'],['焦点跟随角色','Focus the camera on the mechanic'],p.highQuality?on(p.depthOfField):t('需高画质','Needs high quality'),p.depthOfField,!p.highQuality),
      row('motion',['减少动态效果','Reduce motion'],['停用装饰性浮动与相机震动','Disable decorative motion and camera shake'],on(p.reducedMotion),p.reducedMotion),
      row('shake',['相机震动','Camera shake'],['冲击和设备交互时的画面反馈','Camera feedback on impacts and equipment use'],p.reducedMotion?t('已减少动态','Reduced motion'):on(p.cameraShake),p.cameraShake&&!p.reducedMotion,p.reducedMotion),
    ].join('')],
    ['controls',['操作','Controls'],[
      keys,
      row('sensitivity',['视角灵敏度','Camera sensitivity'],['控制右键拖动和手柄右摇杆速度','Adjust mouse drag and right-stick speed'],Math.round(p.cameraSensitivity*100)+'%'),
      row('invert',['反向旋转视角','Invert camera orbit'],['反转水平拖动与右摇杆的旋转方向','Reverse horizontal dragging and right-stick orbit'],on(p.invertOrbit),p.invertOrbit),
      row('deadzone',['手柄摇杆死区','Stick dead zone'],['提高以消除摇杆漂移','Raise to suppress stick drift'],Math.round(p.deadZone*100)+'%'),
    ].join('')],
  ];
  return `<div class="pref-book" data-localized><nav class="pref-index" aria-label="${t('设置目录','Settings index')}">${groups.map(([id,title])=>`<button data-action="prefs-go-${id}">${t(...title)}</button>`).join('')}</nav><div class="settings-list">${groups.map(([id,title,body])=>section(id,title,body)).join('')}</div></div>`;
}
