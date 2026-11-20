import { test, expect } from '@playwright/test';

test('主菜单、三维场景、移动、观察、提示与断点恢复', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开始夜班' })).toBeVisible();
  await page.getByRole('button', { name: '开始夜班' }).click();
  await expect(page.locator('#room-name')).toHaveText('借一道光');
  await expect(page.locator('canvas')).toBeVisible();
  const before = await page.evaluate(() => (window as any).__borrowedFire.player.x);
  await page.keyboard.down('KeyA'); await page.waitForTimeout(250); await page.keyboard.up('KeyA');
  expect(await page.evaluate(() => (window as any).__borrowedFire.player.x)).toBeLessThan(before);
  await page.keyboard.press('Space'); await expect(page.locator('#observe-banner')).toBeVisible();
  await page.keyboard.press('KeyH'); await expect(page.locator('#hint-text')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '存档管理', exact: true }).click();
  await page.locator('[data-action="save-slot-0"]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__borrowedFire.slots[0])).toBe(true);
  await page.reload(); await page.getByRole('button', { name: '继续夜班' }).click();
  await expect(page.locator('#room-name')).toHaveText('借一道光');
  await expect(page.locator('#hint-text')).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/borrowed-fire-game.png' });
});

test('外观设置立即生效并跨刷新保存', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '维修员', exact: true }).click();
  await page.getByRole('button', { name: '巡检蓝', exact: true }).click();
  await page.getByRole('button', { name: '信号天线', exact: true }).click();
  await page.getByRole('button', { name: '斜纹', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__borrowedFire.appearance)).toEqual({ coat: 2, helmet: 1, badge: 2 });
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await page.reload(); await page.getByRole('button', { name: '维修员', exact: true }).click();
  await expect(page.getByRole('button', { name: '巡检蓝', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'test-results/borrowed-fire-wardrobe.png' });
});

test('手动存档恢复位置、导出文件，损坏导入不覆盖进度', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '开始夜班' }).click();
  await page.keyboard.down('KeyA'); await page.waitForTimeout(220); await page.keyboard.up('KeyA');
  await page.keyboard.press('KeyJ'); await page.locator('[data-action="save-slot-0"]').click();
  const position = await page.evaluate(() => (window as any).__borrowedFire.player);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: '导出存档文件' }).click();
  expect((await download).suggestedFilename()).toBe('borrowed-fire-save.json');
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.keyboard.down('KeyD'); await page.waitForTimeout(220); await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyJ'); await page.locator('[data-action="load-slot-0"]').click();
  expect(await page.evaluate(() => (window as any).__borrowedFire.player)).toEqual(position);
  await page.keyboard.press('KeyJ');
  await page.locator('#save-import').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"wrong"}') });
  await expect(page.locator('#toast')).toContainText('无法读取');
  expect(await page.evaluate(() => (window as any).__borrowedFire.slots[0])).toBe(true);
});

test('拍照模式的真正景深可切换并导出无界面的场景', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: '开始夜班' }).click();
  await page.keyboard.press('F2'); await expect(page.locator('.photo-toolbar')).toBeVisible();
  await expect(page.locator('#hud')).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as any).__borrowedFire.depthOfField)).toBe(true);
  await page.getByRole('button', { name: '景深 开' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__borrowedFire.depthOfField)).toBe(false);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: '保存图片' }).click();
  expect((await download).suggestedFilename()).toBe('borrowed-fire-1.png');
  await page.keyboard.press('Escape'); await expect(page.locator('#hud')).toBeVisible();
  expect(errors).toEqual([]);
});

test('模拟标准手柄可移动、观察、暂停并确认菜单', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__testPad = { buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0], mapping: 'standard', connected: true, index: 0, id: 'Browser test pad' };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [(window as any).__testPad] });
  });
  await page.goto('/'); await page.getByRole('button', { name: '开始夜班' }).click();
  const x = await page.evaluate(() => (window as any).__borrowedFire.player.x);
  await page.evaluate(() => (window as any).__testPad.axes[0] = 1); await page.waitForTimeout(230);
  await page.evaluate(() => (window as any).__testPad.axes[0] = 0);
  expect(await page.evaluate(() => (window as any).__borrowedFire.player.x)).toBeGreaterThan(x);
  const press = async (index: number) => {
    await page.evaluate(i => (window as any).__testPad.buttons[i].pressed = true, index); await page.waitForTimeout(80);
    await page.evaluate(i => (window as any).__testPad.buttons[i].pressed = false, index); await page.waitForTimeout(80);
  };
  await press(2); await expect(page.locator('#observe-banner')).toBeVisible();
  await press(9); await expect(page.getByRole('dialog', { name: '暂停', exact: true })).toBeVisible();
  await press(0); await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('1280×720 菜单与游戏截图供美术复核', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await page.goto('/');
  await expect(page.getByRole('button', { name: '开始夜班' })).toBeVisible();
  await page.screenshot({ path: 'test-results/borrowed-fire-menu-720p.png' });
  await page.getByRole('button', { name: '开始夜班' }).click();
  const footer = await page.locator('.control-bar').boundingBox(); expect(footer!.y + footer!.height).toBeLessThanOrEqual(720);
  await page.screenshot({ path: 'test-results/borrowed-fire-game-720p.png' });
});

test('未解锁关卡不可进入，设置在重新加载后保留', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '选择机房' }).click();
  await expect(page.locator('[data-level="1"]')).toBeDisabled();
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.getByRole('button', { name: '设置与操作' }).click();
  await page.locator('.settings-list [data-action="sound"]').click();
  await page.reload(); await expect(page.locator('#sound-btn')).toHaveText('声音 关');
});
