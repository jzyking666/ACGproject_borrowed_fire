import { test, expect, type Page } from '@playwright/test';
import { STORAGE_KEY } from '../../src/storage';

const action = (page: Page, name: string) => page.locator(`#overlay [data-action="${name}"]`);

test('English persists across reload, reaches the story and HUD, and switches back mid-shift', async ({page}) => {
  await page.goto('/');
  await action(page,'settings').click();
  await action(page,'language').click();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
  await action(page,'preview-track').click();
  await expect(action(page,'preview-track')).toContainText('Powered room');
  await action(page,'preview-track').click();
  await expect(action(page,'preview-track')).toContainText('Harbour');
  await page.reload();
  await expect(page.locator('#cover-title')).toHaveText('Borrowed Fire');
  await action(page,'continue').click();
  await expect(page.locator('#story-text')).toContainText("5:40");
  await action(page,'story-skip').click();
  await expect(page.locator('#room-name')).toHaveText('Borrow a Light');
  await page.keyboard.press('KeyH');
  await expect(page.locator('#hint-text')).not.toContainText(/\p{Script=Han}/u);
  await page.keyboard.press('Escape');
  await action(page,'settings').click();
  await action(page,'language').click();
  await action(page,'back').click();
  await action(page,'resume').click();
  await expect(page.locator('#room-name')).toHaveText('借一道光');
  await expect(page.locator('#hint-text')).toContainText(/\p{Script=Han}/u);
});

test('rebinding changes real movement and restoring preferences keeps the checkpoint', async ({page}) => {
  await page.goto('/');
  await action(page,'settings').click();
  await action(page,'dialogue').click();
  await action(page,'bind-left').click();
  await page.keyboard.press('KeyQ');
  await expect(action(page,'bind-left')).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('KeyU');
  await expect(action(page,'bind-left')).toContainText('U');
  const fader = page.locator('#pref-effectsVolume');
  await fader.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('output[for=pref-effectsVolume]')).toHaveText('1%');
  await action(page,'back').click();
  await action(page,'continue').click();
  const x = () => page.evaluate(() => (window as any).__borrowedFire.player.x as number);
  const start = await x();
  await page.keyboard.down('KeyU');
  try { await expect.poll(x).toBeLessThan(start - .1); } finally { await page.keyboard.up('KeyU'); }
  await page.keyboard.press('Escape');
  await action(page,'settings').click();
  await expect(fader).toHaveValue('1');
  await action(page,'reset-prefs').click();
  await action(page,'confirm-prefs').click();
  await expect(fader).toHaveValue('85');
  await expect(action(page,'bind-left')).toContainText('A');
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!),STORAGE_KEY);
  expect(saved.checkpoint.level).toBe(0);
  expect(saved.checkpoint.player.x).toBeLessThan(start - .1);
});
