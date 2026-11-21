import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

let temporaryDirectory: string;
let offlineURL: string;
test.beforeAll(async () => {
  await promisify(execFile)(process.execPath, ['scripts/build-html.mjs']);
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'borrowed-fire-offline-'));
  const copy = join(temporaryDirectory, '借火 离线版.html');
  await copyFile(resolve('release/borrowed-fire.html'), copy);
  offlineURL = pathToFileURL(copy).href;
});
test.afterAll(async () => {
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

test('单个 HTML 移到独立目录后，断网仍可启动、观看剧情、移动和保存', async ({ page, context }) => {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', request => {
    const url = request.url();
    if (url !== offlineURL && !url.startsWith('data:') && !url.startsWith('blob:')) external.push(url);
  });
  await context.setOffline(true);
  await page.goto(offlineURL);
  await expect(page.getByRole('button', { name: '开始夜班' })).toBeVisible();
  await page.getByRole('button', { name: '开始夜班' }).click();
  await expect(page.locator('#story-text')).toContainText('旧区主网六点迁走');
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() => (window as any).__borrowedFire.player.x);
  await page.keyboard.down('KeyA'); await page.waitForTimeout(200); await page.keyboard.up('KeyA');
  expect(await page.evaluate(() => (window as any).__borrowedFire.player.x)).toBeLessThan(before);
  await page.keyboard.press('KeyJ'); await page.locator('[data-action="save-slot-0"]').click();
  await page.reload(); await page.getByRole('button', { name: '继续夜班' }).click();
  await expect(page.locator('#room-name')).toHaveText('借一道光');
  expect(await page.evaluate(() => (window as any).__borrowedFire.slots[0])).toBe(true);
  expect(external).toEqual([]); expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/borrowed-fire-offline.png' });
});
