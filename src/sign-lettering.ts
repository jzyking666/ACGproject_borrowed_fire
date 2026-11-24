// Canvas text cannot use CSS var() directly. Resolve the two faces when the first plate is made.
const fallback = {
  title: '"Songti SC", "STSong", "Noto Serif CJK SC", SimSun, serif',
  instrument: 'Menlo, Consolas, "PingFang SC", "Microsoft YaHei", sans-serif',
};
let faces: typeof fallback | undefined;

export const enamelInk = '#19272d';
export function signFaces(): typeof fallback {
  if (faces) return faces;
  const root = typeof document !== 'undefined' && typeof getComputedStyle === 'function'
    ? getComputedStyle(document.documentElement) : undefined;
  faces = {
    title: root?.getPropertyValue('--font-display').trim() || fallback.title,
    instrument: root?.getPropertyValue('--font-key').trim() || fallback.instrument,
  };
  return faces;
}
