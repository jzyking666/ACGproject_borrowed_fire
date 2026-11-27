import { test, expect } from '@playwright/test';
import { defaults, STORAGE_KEY } from '../../src/storage';
import { Simulation } from '../../src/engine';
import { TRAM_STOPS } from '../../src/last-tram';
import { LEVELS } from '../../src/levels';

test('the cover starts the story; leaving the tram keeps both routes resumable', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.cover-campaign')).toHaveAttribute('data-action','continue');
  const doAction = (act:string) => page.locator(`#overlay [data-action="${act}"]`).click();
  await doAction('continue'); await doAction('story-skip');
  await page.keyboard.press('Escape'); await doAction('menu');
  await doAction('tram'); await expect(page.locator('[data-action="tram-stop-1"]')).toBeDisabled();
  await doAction('tram-ride'); await expect(page.locator('#room-name')).toHaveText(TRAM_STOPS[0].level.name);
  await page.keyboard.press('KeyH'); await page.keyboard.press('KeyJ');
  await doAction('save-slot-0'); await page.reload();
  await doAction('tram'); await expect(page.locator('[data-action="tram-ride"]')).toHaveText('继续修车');
  await doAction('tram-ride'); await expect(page.locator('#hint-text')).toBeVisible();
  const saved = await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!), STORAGE_KEY);
  expect(saved.checkpoint.level).toBe(0);
  expect(saved.slots[0].snapshot.level).toBe(3000);
});

test('a completed electrical handover signs the last ticket and leads straight to a resident', async ({page}) => {
  const data = defaults(), sim = new Simulation(TRAM_STOPS[2].level);
  sim.mirrors = structuredClone(sim.level.solution); sim.player={x:6,y:5};
  for (let i=0; i<6000 && !sim.stable; i++) sim.step(1/120,false);
  expect(sim.stable).toBe(true);
  sim.sourceOn = false; sim.player = {...sim.level.exit};
  data.tram = {completed:2,draft:{snapshot:sim.snapshot(),hintCount:1}};
  data.checkpoint = new Simulation(LEVELS[1]).snapshot();
  await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)), {key:STORAGE_KEY, save:data});
  await page.goto('/'); await page.locator('[data-action="tram"]').click();
  await page.locator('[data-action="tram-ride"]').click();
  await expect(page.locator('#dialog-title')).toHaveText('末班车已发车');
  await expect(page.locator('.tram-arrival p')).toHaveText(TRAM_STOPS[2].receipt);
  await page.locator('[data-action="street-relay"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen','camp-route');
  const saved = await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!), STORAGE_KEY);
  expect(saved.tram).toEqual({completed:3}); expect(saved.checkpoint.level).toBe(1);
});
