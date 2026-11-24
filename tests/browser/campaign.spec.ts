import { test, expect, type Page } from '@playwright/test';
import { defaults, parseSave, STORAGE_KEY, type SaveData } from '../../src/storage';
import { Simulation } from '../../src/engine';
import { LEVELS } from '../../src/levels';
import { FIELD_LEVELS } from '../../src/field-service';
import { TRADES, jobKey, signedCount } from '../../src/campaign-progress';
import { inspectTide, solveTide, TIDES, adjustTide } from '../../src/tide-dispatch';

const action = (page: Page, verb: string) => page.locator(`button[data-action="${verb}"]`).filter({ visible: true });
const screen = (page: Page) => expect(page.locator('#app'));
const saveFromBrowser = (page: Page): Promise<SaveData> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
function oldShift() {
  const save = defaults(), old = new Simulation(LEVELS[0]);
  old.interact();
  save.checkpoint = old.snapshot(); save.hintCount = 1;
  save.settings.highQuality = false; save.settings.dialogue = false;
  return save;
}
async function openMap(page: Page, initial: SaveData) {
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
  }, { key: STORAGE_KEY, data: initial });
  await page.goto('/');
  await action(page, 'campaign').click();
  await screen(page).toHaveAttribute('data-screen', 'camp-map');
}
async function district(page: Page, n: number) {
  await page.locator(`.atlas-station[data-action="district-${n}"]`).click();
  await screen(page).toHaveAttribute('data-screen', 'camp-district');
}

test('织盘草稿跨刷新复原，调班与倒放只改当前工单，主线夜班断点独立保留', async ({ page }) => {
  const initial = oldShift(); await openMap(page, initial);
  await expect(page.locator('.atlas-station')).toHaveCount(8);
  await expect(page.locator('.atlas-station[data-action="district-1"]')).toBeDisabled();
  await district(page, 0); await action(page,'job-loom-0').click();
  await screen(page).toHaveAttribute('data-screen', 'camp-board');
  await expect(action(page,'camp-sign')).toBeDisabled();
  await page.locator('button.loom-key:enabled').first().click();
  const first = (await saveFromBrowser(page)).campaign.jobs['loom-0']!;
  expect(first.actions).toBe(1); expect(first.values).toBeTruthy();
  await page.reload();
  await action(page,'campaign').click(); await action(page,'camp-resume').click();
  await screen(page).toHaveAttribute('data-screen', 'camp-board');
  expect((await saveFromBrowser(page)).campaign.jobs['loom-0']!.values).toEqual(first.values);
  await action(page,'camp-hint').click(); await expect(page.locator('.camp-hint')).toBeInViewport();
  await action(page,'camp-district').click(); await action(page,'job-tide-0').click();
  await action(page,'camp-next').click();
  await expect(page.locator('.tide-clock [data-action="camp-frame-1"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('button[data-action^="board-late-"]:enabled').first().click();
  const edited = (await saveFromBrowser(page)).campaign.jobs['tide-0']!;
  expect(edited.actions).toBe(1); expect(edited.values).toBeTruthy();
  await action(page,'camp-undo').click();
  const book = await saveFromBrowser(page);
  expect(book.campaign.jobs['tide-0']!.values).toEqual(TIDES[0].start);
  expect(book.campaign.jobs['loom-0']!.values).toEqual(first.values);
  expect(book.checkpoint).toEqual(initial.checkpoint); expect(book.hintCount).toBe(1);
});

test('现场进入第一单，联检图能选择另一张工单的副线，退出读图续作且不覆盖旧关', async ({ page }) => {
  const initial = oldShift(); await openMap(page, initial); await district(page,0);
  await action(page,'job-field-0').click(); await screen(page).toHaveAttribute('data-screen','playing');
  await page.keyboard.press('KeyN'); await screen(page).toHaveAttribute('data-screen','commission');
  await expect(action(page,'probe-0')).toBeVisible();
  await page.keyboard.press('Escape'); await screen(page).toHaveAttribute('data-screen','playing');
  await page.reload(); await action(page,'campaign').click(); await district(page,0); await action(page,'job-field-2').click();
  await page.keyboard.press('KeyN'); await action(page,'probe-1').click();
  await expect(action(page,'probe-1')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.dialog-actions [data-action="back"]').click(); await screen(page).toHaveAttribute('data-screen','playing');
  await page.keyboard.press('KeyH'); await page.keyboard.press('KeyJ');
  const stored = await saveFromBrowser(page);
  expect(stored.campaign.sites['2'].snapshot.level).toBe(102); expect(stored.campaign.sites['2'].hintCount).toBe(1);
  expect(stored.checkpoint).toEqual(initial.checkpoint);
  await page.reload(); await action(page,'campaign').click(); await action(page,'camp-resume').click();
  await screen(page).toHaveAttribute('data-screen','playing');
  await expect(page.locator('#room-name')).toHaveText(FIELD_LEVELS[2].name);
  await expect(page.locator('#hint-text')).toBeVisible();
});

test('最后两单的公开入口从 142 项走到 144 项，最终签收要求实际通电并可回看总图', async ({ page }) => {
  const save = oldShift(), p = save.campaign;
  for (let i=0; i<48; i++) for (const trade of TRADES) {
    if (i === 47 && trade !== 'loom') continue;
    p.jobs[jobKey(trade,i)] = { done: true, actions: 4, hints: 0, seconds: 45 };
  }
  // Leave a valid draft one player action from a legal shipping schedule.
  const b = TIDES[47], solution = solveTide(b, b.start, true).solution!;
  const boat = b.boats.findIndex((v,i) => !v.fixed &&
    inspectTide(b,adjustTide(b,solution,'early-'+i)).incidents.length > 0);
  expect(boat).toBeGreaterThanOrEqual(0);
  p.jobs['tide-47'] = { done:false, seconds:40, actions:3, hints:0, values:adjustTide(b,solution,'early-'+boat) };
  // Stage a correctly commissioned site at its real exit. The normal simulation,
  // win handler and campaign receipt still have to accept the restored circuit.
  const site = new Simulation(FIELD_LEVELS[47]); site.mirrors = structuredClone(site.level.solution);
  for(let i=0; i<60*40 && !site.powered; i++) site.step(1/60);
  expect(site.powered).toBe(true); site.player = { ...site.level.exit };
  p.sites[47] = { snapshot:site.snapshot(), hintCount:0 }; p.selected = 7;
  expect(parseSave(JSON.stringify(save)).campaign.sites[47]).toBeDefined();
  await openMap(page, save); await district(page,7); await expect(action(page,'job-field-47')).toBeDisabled();
  await action(page,'job-tide-47').click(); await expect(action(page,'camp-sign')).toBeDisabled();
  await action(page,'board-late-'+boat).click(); await action(page,'camp-sign').click();
  await screen(page).toHaveAttribute('data-screen','camp-receipt');
  expect(signedCount((await saveFromBrowser(page)).campaign)).toBe(143);
  await action(page,'camp-district').click(); await expect(action(page,'job-field-47')).toBeEnabled();
  await action(page,'job-field-47').click(); await screen(page).toHaveAttribute('data-screen','camp-ending');
  const done=await saveFromBrowser(page); expect(signedCount(done.campaign)).toBe(144); expect(done.campaign.sites[47]).toBeUndefined();
  expect(done.checkpoint).toEqual(save.checkpoint); expect(done.records).toEqual(save.records);
  await action(page,'camp-map').click(); await expect(page.locator('.atlas-restored')).toHaveCount(8);
  await action(page,'camp-ending').click(); await screen(page).toHaveAttribute('data-screen','camp-ending');
});

test('签收织盘与潮表后，同地段的校样和放行表可独立试算，观察选线保留', async ({ page }) => {
  const save=oldShift();
  for(const t of ['loom','tide'] as const) save.campaign.jobs[jobKey(t,2)]={ done:true,seconds:30,actions:2,hints:0 };
  await openMap(page,save); await district(page,0); await action(page,'job-field-2').click();
  await page.keyboard.press('Space'); await page.keyboard.press('KeyE');
  await screen(page).toHaveAttribute('data-screen','commission');
  await action(page,'probe-1').click();
  await page.locator('.calibration-controls button[data-action^="calibrate-"]').first().click();
  await expect(page.locator('.calibration-table')).toBeVisible();
  await action(page,'passage-exit').click(); await expect(action(page,'passage-off')).toBeVisible();
  await expect(action(page,'probe-1')).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('Escape'); await expect(page.locator('#observe-banner')).toBeVisible();
  await expect(page.locator('#route-summary')).toContainText('乙路校线');
  const saved=await saveFromBrowser(page);
  expect(saved.campaign.jobs['field-2']!.actions).toBe(0);
  expect(saved.checkpoint).toEqual(save.checkpoint);
});

test('从地图投递首封退信，错误地址可对调，刷新后邮戳和两种主线存档都保留', async ({ page }) => {
  const save = oldShift();
  for (const i of [0, 1, 2]) for (const trade of TRADES) {
    save.campaign.jobs[jobKey(trade, i)] = { done: true, seconds: 60, actions: 4, hints: 0 };
  }
  await openMap(page, save);
  await action(page, 'camp-mail').click();
  await expect(page.locator('.mail-folder')).toHaveCount(8);
  await action(page, 'mail-open-0').click();
  await expect(page.locator('.mail-evidence article')).toHaveCount(3);
  await action(page, 'mail-from-0').click();
  await action(page, 'mail-to-1').click();
  await action(page, 'mail-send').click();
  await expect(page.locator('.mail-bounce')).toBeInViewport();
  await action(page, 'mail-swap').click();
  await action(page, 'mail-send').click();
  await expect(page.locator('.mail-receipt')).toContainText('签收回信');
  await page.keyboard.press('Escape');
  await screen(page).toHaveAttribute('data-screen', 'camp-mail');
  await page.keyboard.press('Escape');
  await screen(page).toHaveAttribute('data-screen', 'camp-map');
  await page.reload();
  await action(page, 'campaign').click();
  await action(page, 'camp-mail').click();
  await expect(action(page, 'mail-open-0')).toContainText('重读回信');
  const after = await saveFromBrowser(page);
  expect(after.campaign.returned).toEqual([0]);
  expect(signedCount(after.campaign)).toBe(9);
  expect(after.checkpoint).toEqual(save.checkpoint);
});
