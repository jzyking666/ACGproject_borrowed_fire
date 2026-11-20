export const COATS = [
  { name: '工程橙', color: 0xd48a45, hex: '#d48a45' },
  { name: '搪瓷白', color: 0xd4d4c3, hex: '#d4d4c3' },
  { name: '巡检蓝', color: 0x5b8d9e, hex: '#5b8d9e' },
  { name: '苔藓绿', color: 0x7d9370, hex: '#7d9370' },
  { name: '旧漆红', color: 0xa65b50, hex: '#a65b50' },
] as const;
export const HELMETS = ['巡检灯', '信号天线', '双侧护罩'] as const;
export const BADGES = ['双杠', '十字', '斜纹'] as const;
export interface Appearance { coat: number; helmet: number; badge: number }
export const defaultAppearance = (): Appearance => ({ coat: 0, helmet: 0, badge: 0 });
export function normalizeAppearance(value: unknown): Appearance {
  const v = value && typeof value === 'object' ? value as Partial<Appearance> : {};
  const index = (n: unknown, length: number) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < length ? Number(n) : 0;
  return { coat: index(v.coat, COATS.length), helmet: index(v.helmet, HELMETS.length), badge: index(v.badge, BADGES.length) };
}
