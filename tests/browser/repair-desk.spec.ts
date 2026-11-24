import { test, expect, type Page } from '@playwright/test';
import { Simulation } from '../../src/engine';
import { LEVELS } from '../../src/levels';
import { createRepair, REPAIRS } from '../../src/repairs';
import { defaults, exportSave, STORAGE_KEY, validSnapshot, type SaveData } from '../../src/storage';

function mainShift() {
  const save = defaults();
  save.settings.dialogue = false;
  save.settings.highQuality = false;
  const sim = new Simulation(LEVELS[0]);
  sim.interact(); // A distinctive, unfinished main checkpoint: a carried mirror and a used hint.
  save.checkpoint = sim.snapshot(); save.hintCount = 1;
  return save;
}
async function start(page: Page, save: SaveData) {
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
  }, { key: STORAGE_KEY, data: save });
  await page.goto('/');
}
const readSave = (page: Page): Promise<SaveData> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
const elapsed = (page: Page): Promise<number> => page.evaluate(() => (window as any).__borrowedFire.elapsed);
async function takeBellOrder(page: Page) {
  await page.locator('[data-action="repairs"]').click();
  await page.locator('[data-action="letter-bell"]').click();
  await expect(page.locator('[data-action="begin-repair"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#room-name')).toHaveText('铃响在隔壁');
}

/** Move the operator's starting viewpoint to the exit after one legal rotation. The
 * actual emitted pulse still has to travel the rest of its route in the browser. */
function signedCircuitWaitingForLight() {
  const s = createRepair(REPAIRS.find(r => r.id === 'bell')!);
  s.player = { x: 8, y: 3 }; s.rotate();
  s.player = { ...s.level.exit };
  for (let i = 0; i < 240; i++) s.step(1 / 120);
  const snapshot = s.snapshot();
  expect(validSnapshot(snapshot)).toBe(true);
  expect(s.moves).toBe(1); expect(s.won).toBe(false); expect(s.exitOpen).toBe(false);
  return { snapshot, hintCount: 0 };
}

test('从主线断点接单，观察中试转和定位故障，重开返修后仍可恢复主线', async ({ page }) => {
  const save = mainShift(); await start(page, save); await takeBellOrder(page);
  await page.keyboard.press('Space'); await expect(page.locator('#observe-banner')).toBeVisible();
  const paused = await elapsed(page);
  await page.keyboard.press('KeyE'); await expect(page.getByRole('dialog', { name: '试镜台' })).toBeVisible();
  const choices = page.locator('.lens-choices button');
  await expect(choices).toHaveCount(2); await expect(choices.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(choices.nth(1)).toBeFocused();
  await page.keyboard.press('Enter'); await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.lens-sheets figure').nth(1)).toContainText('试转第 2 面');
  // Click the drawing, not the mirror-choice button, to verify its delegated SVG action.
  await page.locator('.lens-sheets svg').first().locator('[data-action="lens-mirror-0"]').click();
  await expect(choices.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape'); await expect(page.locator('#observe-banner')).toBeVisible();
  await page.keyboard.press('KeyB'); await expect(page.getByRole('dialog', { name: '未来推演' })).toBeVisible();
  const fault = page.locator('.forecast-findings button').first();
  await expect(fault).toContainText('右侧边界'); await fault.click();
  await expect(fault).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('#inspection-pin i')).toBeVisible();
  expect(Number(await page.locator('#forecast-slider').inputValue())).toBeGreaterThan(0);
  await page.keyboard.press('KeyB'); await expect(page.locator('#observe-banner')).toBeVisible();
  expect(await elapsed(page)).toBe(paused);
  await expect(page.locator('#repair-tally')).toContainText('本单已用 0 次');
  await page.keyboard.press('KeyH'); await expect(page.locator('#hint-text')).toBeVisible();
  await page.keyboard.press('KeyR'); await expect(page.locator('#observe-banner')).toBeHidden();
  await expect(page.locator('#hint-text')).toBeHidden(); await expect(page.locator('#room-name')).toHaveText('铃响在隔壁');
  const saved = await readSave(page);
  expect(saved.checkpoint).toEqual(save.checkpoint); expect(saved.hintCount).toBe(1);
  expect(saved.repairDrafts.bell.hintCount).toBe(0); expect(saved.story.seen).toEqual([]);
  await page.keyboard.press('KeyJ'); await page.locator('[data-action="load-auto"]').click();
  await expect(page.locator('#room-name')).toHaveText('借一道光'); await expect(page.locator('#hint-text')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__borrowedFire.carried)).toBe('a');
});

test('返修手动槽跨刷新保留模式和操作数，真实脉冲交单后只更新本单成绩', async ({ page }) => {
  const save = mainShift(); save.repairDrafts.bell = signedCircuitWaitingForLight();
  await start(page, save); await takeBellOrder(page);
  await page.keyboard.press('KeyJ'); await page.locator('[data-action="save-slot-0"]').click();
  const slot = (await readSave(page)).slots[0];
  expect(slot?.repairId).toBe('bell'); expect(slot?.snapshot.moves).toBe(1);
  await page.keyboard.press('Escape'); await page.keyboard.press('KeyR');
  await expect(page.locator('#repair-tally')).toContainText('本单已用 0 次');
  await page.reload(); await page.locator('[data-action="saves"]').filter({ visible: true }).click();
  await expect(page.locator('.save-slot').first()).toContainText('返修 · 铃响在隔壁');
  await page.locator('[data-action="load-slot-0"]').click();
  await expect(page.locator('#repair-tally')).toContainText('本单已用 1 次');
  await expect(page.getByRole('dialog', { name: '精修签收' })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.dispatch-reply')).toContainText('那个孩子');
  const signed = await readSave(page);
  expect(signed.repairBest).toEqual({ bell: 1 }); expect(signed.repairDrafts.bell).toBeUndefined();
  expect(signed.checkpoint).toEqual(save.checkpoint); expect(signed.records).toEqual({}); expect(signed.unlocked).toBe(0);
  expect(signed.story.seen).toEqual([]); expect(signed.slots[0]?.repairId).toBe('bell');
  await page.locator('[data-action="repair-inbox"]').click();
  await expect(page.locator('[data-action="letter-bell"]')).toContainText('精修签收');
});

test('在出口等光时导入另一份存档，旧返修单不会在首页自行签收', async ({ page }) => {
  const prior = mainShift(); prior.repairDrafts.bell = signedCircuitWaitingForLight();
  await start(page, prior); await takeBellOrder(page); await page.keyboard.press('KeyJ');
  const replacement = mainShift(); replacement.repairBest = { handprint: 0 };
  await page.locator('#save-import').setInputFiles({ name: 'other-shift.json', mimeType: 'application/json', buffer: Buffer.from(exportSave(replacement)) });
  await page.locator('[data-action="confirm-import"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'menu');
  const startTime = await elapsed(page);
  // Allow four simulated seconds. The old repaired circuit would have won after ~2.74.
  await page.waitForFunction(t => {
    const g = (window as any).__borrowedFire;
    return g.screen !== 'menu' || g.elapsed >= t + 4;
  }, startTime, { timeout: 20000 });
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'menu');
  const saved = await readSave(page);
  expect(saved.repairBest).toEqual({ handprint: 0 }); expect(saved.repairDrafts).toEqual({}); expect(saved.checkpoint).toEqual(replacement.checkpoint);
  await page.locator('[data-action="continue"]').click(); await expect(page.locator('#room-name')).toHaveText('借一道光');
});
