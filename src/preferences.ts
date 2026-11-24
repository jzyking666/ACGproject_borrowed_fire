export const directions = ['up', 'left', 'down', 'right'] as const;
export type Direction = typeof directions[number];
export const mixChannels = ['volume', 'musicVolume', 'effectsVolume', 'uiVolume'] as const;
export type MixChannel = typeof mixChannels[number];

export function defaultPreferences() {
  return {
    language: 'zh-CN' as 'zh-CN' | 'en', dialogue: true, muted: false, highQuality: true,
    reducedMotion: false, depthOfField: false, environment: true, music: true,
    volume: .7, musicVolume: .7, effectsVolume: .85, uiVolume: .65, textScale: 1,
    audioCaptions: false, cameraShake: true, invertOrbit: false, cameraSensitivity: 1,
    deadZone: .2, movement: {up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD'},
  };
}
export type Preferences = ReturnType<typeof defaultPreferences>;

// Arrow keys remain available for movement. The other reserved keys operate equipment or menus.
export function canBindMovement(code: unknown): code is string {
  return typeof code === 'string' && /^(?:Key[ADKMOPSUWXY]|Digit[0-9]|Numpad[0-9]|Comma|Period|Semicolon|BracketLeft|BracketRight)$/.test(code);
}
export function keyLabel(code: string) {
  const punctuation: Record<string,string> = {Comma:',', Period:'.', Semicolon:';', BracketLeft:'[', BracketRight:']'};
  return punctuation[code] ?? code.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'Num ');
}
export function movementLabel(keys: Preferences['movement']) {
  const labels = directions.map(d => keyLabel(keys[d]));
  return labels.join(labels.every(label => label.length === 1) ? '' : ' ');
}
export function bindMovement(keys: Preferences['movement'], dir: Direction, code: string) {
  if (!canBindMovement(code)) return false;
  const previousOwner = directions.find(other => keys[other] === code);
  if (previousOwner) keys[previousOwner] = keys[dir];
  keys[dir] = code;
  return true;
}
export function readPreferences(raw: unknown): Preferences {
  const result = defaultPreferences();
  if (!raw || typeof raw !== 'object') return result;
  const v = raw as Record<string,unknown>;
  if (v.language === 'en') result.language = 'en';
  for (const k of ['dialogue','muted','music','environment','depthOfField','highQuality','cameraShake','reducedMotion','audioCaptions','invertOrbit'] as const) {
    if (typeof v[k] === 'boolean') result[k] = v[k];
  }
  const range = (k: MixChannel | 'textScale' | 'cameraSensitivity' | 'deadZone', lo: number, hi: number) => {
    if (typeof v[k] === 'number' && Number.isFinite(v[k])) result[k] = Math.max(lo,Math.min(hi,v[k]));
  };
  for (const k of mixChannels) range(k,0,1);
  range('textScale',1,1.4); range('cameraSensitivity',.5,2); range('deadZone',.1,.4);
  const bindings = v.movement as Record<string,unknown> | undefined;
  if (bindings && directions.every(d => canBindMovement(bindings[d])) && new Set(directions.map(d => bindings[d])).size === directions.length) {
    for (const d of directions) result.movement[d] = bindings[d] as string;
  }
  return result;
}
