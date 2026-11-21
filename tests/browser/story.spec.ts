import { test, expect } from '@playwright/test';
import { Simulation } from '../../src/engine';
import { LEVELS } from '../../src/levels';
import { defaults } from '../../src/storage';

// Seed a physically valid circuit to reach the post-level dialogue through the real win event.
function completedCircuit(id: number) {
  const sim = new Simulation(LEVELS[id]); sim.mirrors = structuredClone(sim.level.solution); sim.player = { x: 1, y: 1 };
  for (let i = 0; i < 60 * 25; i++) sim.step(1 / 60, false);
  if (sim.level.offGrid) sim.sourceOn = false;
  sim.player = { ...sim.level.exit };
  const save = defaults(); save.checkpoint = sim.snapshot(); return save;
}

test('首次入场有原创通讯，暂停计时，可前进回看并跳过；重试不重复', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '开始夜班' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'story');
  await expect(page.locator('#story-text')).toContainText('旧区主网六点迁走');
  const elapsed = await page.evaluate(() => (window as any).__borrowedFire.elapsed);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__borrowedFire.elapsed)).toBe(elapsed);
  await page.keyboard.press('Space'); await expect(page.locator('#story-text')).toContainText('门都不让我进');
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('#story-text')).toContainText('旧区主网六点迁走');
  await page.keyboard.press('Escape'); await expect(page.locator('#app')).toHaveAttribute('data-screen', 'playing');
  await page.keyboard.press('KeyR'); await expect(page.locator('#app')).toHaveAttribute('data-screen', 'playing');
});

test('通讯收藏可回看，回看结束返回列表，未遇到的完工对话保持锁定', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '开始夜班' }).click(); await page.keyboard.press('Escape');
  await page.keyboard.press('KeyI'); await page.getByRole('button', { name: '夜班通讯', exact: true }).click();
  await expect(page.locator('[data-action="replay-0-before"]')).toBeEnabled();
  await expect(page.locator('[data-action="replay-0-after"]')).toBeDisabled();
  await page.locator('[data-action="replay-0-before"]').click();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: '夜班通讯', exact: true })).toBeVisible();
});

test('第一班结尾由完工通讯进入结算，第二班继续剧情', async ({ page }) => {
  const save = completedCircuit(6);
  await page.addInitScript(data => localStorage.setItem('borrowed-fire.save.v1', JSON.stringify(data)), save);
  await page.goto('/'); await page.getByRole('button', { name: '继续夜班' }).click();
  await expect(page.locator('#story-text')).toContainText('主机房交接完成');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: '第一班交接完成', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '下一间机房' }).click();
  await expect(page.locator('#story-text')).toContainText('这里是中继站');
});

test('终章通讯有结尾，推进后保存通关记录并进入结算', async ({ page }) => {
  const save = completedCircuit(11);
  await page.addInitScript(data => localStorage.setItem('borrowed-fire.save.v1', JSON.stringify(data)), save);
  await page.goto('/'); await page.getByRole('button', { name: '继续夜班' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'story');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Space');
  await expect(page.locator('#story-text')).toContainText('收件人不再为空');
  await page.screenshot({ path: 'test-results/story-ending.png' });
  await page.keyboard.press('Space'); await expect(page.getByRole('dialog', { name: '收件人', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('borrowed-fire.save.v1')!).records['11'].stars)).toBe(3);
});

test('720p 放大文字下对话按钮可见，刷新保留收录状态并恢复关卡', async ({ page }) => {
  const save = defaults(); save.settings.textScale = 1.2;
  // Only seed once: a reload must use the game's own persisted save.
  await page.addInitScript(data => {
    if (!localStorage.getItem('borrowed-fire.save.v1')) localStorage.setItem('borrowed-fire.save.v1', JSON.stringify(data));
  }, save);
  await page.setViewportSize({ width: 1280, height: 720 }); await page.goto('/');
  await page.getByRole('button', { name: '开始夜班' }).click();
  await expect(page.locator('[data-action="story-next"]')).toBeInViewport();
  await page.screenshot({ path: 'test-results/story-720p-large-type.png' });
  await page.reload(); await page.getByRole('button', { name: '继续夜班' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'playing');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('borrowed-fire.save.v1')!).story.seen)).toContain('0:before');
});
