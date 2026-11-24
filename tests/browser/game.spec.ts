import { test, expect } from '@playwright/test';

// Gameplay smoke checks run with automatic dialogue disabled; story.spec exercises the narrative flow.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const key = 'borrowed-fire.save.v1';
    const save = JSON.parse(localStorage.getItem(key) ?? '{"version":1}');
    save.settings = { ...save.settings, dialogue: false };
    localStorage.setItem(key, JSON.stringify(save));
  });
});

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


test('中继站可直接进入，撤销恢复装置，新机房可自由选择', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: '中继站 · 新章节' }).click();
  await expect(page.locator('#room-name')).toHaveText('留下一个人');
  await expect(page.locator('#mechanic-status')).toContainText('光闸关闭');
  await page.keyboard.press('KeyE');
  await expect.poll(() => page.evaluate(() => (window as any).__borrowedFire.undoDepth)).toBe(1);
  await expect(page.locator('#undo-button')).toBeEnabled();
  await page.keyboard.press('KeyZ');
  await expect.poll(() => page.evaluate(() => (window as any).__borrowedFire.carried)).toBe(null);
  await expect(page.locator('#undo-button')).toBeDisabled();
  await page.screenshot({ path: 'test-results/relay-foundry.png' });
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: '选择机房', exact: true }).click();
  await expect(page.locator('[data-level="1"]')).toBeDisabled();
  await expect(page.locator('[data-level="11"]')).toBeEnabled();
  await page.locator('[data-level="9"]').click();
  await expect(page.locator('#room-name')).toHaveText('冷暖之间');
  await expect(page.locator('.phase-badge')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/relay-garden.png' });
  expect(errors).toEqual([]);
});


test('回声花园可直接进入，示教投影可移除与撤销，观察暂停录制', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('THREE.WebGLProgram')) errors.push(message.text()); });
  await page.goto('/'); await page.getByRole('button', { name: '回声花园 · 新章节' }).click();
  await expect(page.locator('#room-name')).toHaveText('把自己留在这里');
  await expect(page.locator('#echo-panel')).toBeVisible();
  await page.keyboard.press('KeyF');
  await expect.poll(() => page.evaluate(() => (window as any).__borrowedFire.recording)).not.toBe(null);
  await page.waitForTimeout(350); await page.keyboard.press('KeyF');
  await expect.poll(() => page.evaluate(() => (window as any).__borrowedFire.echoes)).toBe(1);
  await expect(page.locator('.echo-timeline')).toHaveCount(1);
  await page.keyboard.press('Space'); await expect(page.locator('[data-action="record"]')).toBeDisabled();
  await page.keyboard.press('Space'); await page.keyboard.press('KeyG');
  await expect.poll(() => page.evaluate(() => (window as any).__borrowedFire.echoes)).toBe(0);
  await page.keyboard.press('KeyZ');
  await expect.poll(() => page.evaluate(() => (window as any).__borrowedFire.echoes)).toBe(1);
  await page.screenshot({ path: 'test-results/echo-garden-rooftop.png' });
  expect(errors).toEqual([]);
});


test('未来推演可拖动而不改写进度，试验点恢复位置与布局', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: '开始夜班' }).click();
  await page.keyboard.press('Space');
  await page.keyboard.press('KeyT');
  const before = await page.evaluate(() => ({ elapsed: (window as any).__borrowedFire.elapsed, player: (window as any).__borrowedFire.player }));
  await page.keyboard.press('KeyB');
  await expect(page.getByRole('dialog', { name: '未来推演' })).toBeVisible();
  const slider = page.getByRole('slider', { name: '推演时间' });
  await slider.fill('80'); await slider.dispatchEvent('input');
  await expect(page.locator('#forecast-readout')).toContainText('+10.00 秒');
  expect(await page.evaluate(() => (window as any).__borrowedFire.elapsed)).toBe(before.elapsed);
  await page.screenshot({ path: 'test-results/forecast-timeline.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#observe-banner')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.down('KeyA'); await page.waitForTimeout(200); await page.keyboard.up('KeyA');
  await page.keyboard.press('KeyV'); await page.keyboard.press('Space');
  expect(await page.evaluate(() => (window as any).__borrowedFire.player)).toEqual(before.player);
  await page.keyboard.press('KeyR');
  expect(await page.evaluate(() => (window as any).__borrowedFire.trialSet)).toBe(false);
  expect(errors).toEqual([]);
});

// These checks exercise the public UI; no solution or writable debug hooks.
test('回声调度暂停计时、编辑周期、撤销和单独删除，刷新后恢复', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: '回声花园 · 新章节' }).click();
  await page.keyboard.press('KeyF'); await page.waitForTimeout(400); await page.keyboard.press('KeyF');
  await page.keyboard.press('KeyL'); await expect(page.getByRole('dialog')).toContainText('回声调度');
  const elapsed = await page.evaluate(() => (window as any).__borrowedFire.elapsed);
  const input = page.locator('#echo-duration'), previous = await input.inputValue();
  await input.fill('2.500'); await input.press('Tab');
  await expect(page.locator('#echo-duration')).toHaveValue('2.500');
  await expect(page.locator('.echo-track-tabs')).toContainText('2.500 秒');
  await page.waitForTimeout(250); expect(await page.evaluate(() => (window as any).__borrowedFire.elapsed)).toBe(elapsed);
  await page.locator('[data-action="echo-undo"]').click(); await expect(page.locator('#echo-duration')).toHaveValue(previous);
  await page.locator('[data-action="echo-longer"]').click(); const saved = await page.locator('#echo-duration').inputValue();
  await page.reload(); await page.getByRole('button', { name: '继续夜班' }).click(); await page.keyboard.press('KeyL');
  await expect(page.locator('#echo-duration')).toHaveValue(saved);
  await page.locator('[data-action="echo-delete"]').click(); await expect(page.locator('.echo-track-tabs button')).toHaveCount(0);
  await page.locator('[data-action="echo-undo"]').click(); await expect(page.locator('.echo-track-tabs button')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/echo-scheduler.png' }); expect(errors).toEqual([]);
});

test('两张新练习单可直接选择，暂停菜单可访问调度、推演与试验点', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '选择机房' }).click();
  await page.locator('[data-level="16"]').click(); await expect(page.locator('#room-name')).toHaveText('一个人的接力');
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: '设置试验点', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__borrowedFire.trialSet)).toBe(true);
  await page.getByRole('button', { name: '回声调度', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('回声调度');
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.getByRole('button', { name: '未来推演', exact: true }).click(); await expect(page.getByRole('dialog', { name: '未来推演' })).toBeVisible();
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.getByRole('button', { name: '选择机房', exact: true }).click();
  await page.locator('[data-level="17"]').click(); await expect(page.locator('#room-name')).toHaveText('每一圈都要交班');
  await page.keyboard.press('KeyI'); await expect(page.getByRole('dialog')).toContainText('经得起等待');
});

test('分光温室可直接进入，棱镜交互保留类型，俯视与立体视角可切换', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('THREE.WebGLProgram')) errors.push(message.text()); });
  await page.goto('/'); await page.getByRole('button', { name: '分光温室 · 新章节' }).click();
  await expect(page.locator('#room-name')).toHaveText('同一面，不同的回答');
  await expect(page.locator('#interaction')).toContainText('拿起双色棱镜');
  await page.keyboard.press('KeyE'); await expect(page.locator('#interaction')).toContainText('暖');
  await page.keyboard.press('KeyQ'); await page.keyboard.press('Tab'); await expect(page.locator('#camera-mode-label')).toHaveText('立体');
  await page.keyboard.press('Space'); await expect(page.locator('#route-summary')).toContainText('从来源发出暖光');
  await page.screenshot({ path: 'test-results/prism-tactical.png' });
  await page.keyboard.press('KeyC'); await expect(page.locator('#camera-mode-label')).toHaveText('俯视');
  await page.screenshot({ path: 'test-results/prism-atrium.png' });
  expect(errors).toEqual([]);
});

test('章节导航和开工缩略图覆盖二十二关，分光工单可自由选择', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '选择机房' }).click();
  await expect(page.locator('.chapter-nav button')).toHaveCount(5); await expect(page.locator('.room-plan')).toHaveCount(22);
  await page.getByRole('button', { name: '分光温室', exact: true }).click();
  await expect(page.locator('[data-level="21"]')).toBeEnabled();
  await page.screenshot({ path: 'test-results/chapter-book.png' });
  await page.locator('[data-level="21"]').click(); await expect(page.locator('#room-name')).toHaveText('写给光的值班表');
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: '切换俯视视角', exact: true }).click();
  await expect(page.getByRole('button', { name: '切换立体视角', exact: true })).toBeVisible();
});

test('大字号手册可用键盘翻页，三页内容与设置开关状态对应', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/');
  const overlay = page.locator('#overlay');
  await overlay.locator('[data-action="settings"]').click();
  await overlay.locator('[data-action="text-size"]').click();
  const music = overlay.locator('[data-action="music"]');
  const initial = await music.getAttribute('aria-pressed');
  await music.click();
  await expect(music).toHaveAttribute('aria-pressed', String(initial === 'false'));
  await overlay.locator('[data-action="help"]').click();
  await expect(overlay.locator('[data-action="guide-keys"]')).toHaveAttribute('aria-pressed', 'true');
  const pad = overlay.locator('[data-action="guide-pad"]');
  await pad.focus();
  await page.keyboard.press('Enter');
  await expect(pad).toBeFocused();
  await expect(pad).toHaveAttribute('aria-pressed', 'true');
  await expect(overlay.locator('.guide-page')).toContainText('左摇杆');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(overlay.locator('.guide-page')).toContainText('端口联检图');
  await expect(overlay.locator('.dialog-actions [data-action="back"]')).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(overlay.getByRole('heading', { name: '设置', exact: true })).toBeVisible();
});
