import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CampaignDesk } from '../src/campaign-ui';
import { canWork, jobKey, jobOf, signedCount, signJob, TRADES } from '../src/campaign-progress';
import { Simulation } from '../src/engine';
import { FIELD_LEVELS } from '../src/field-service';
import { looms, turnLoom } from '../src/grid-loom';
import { LEVELS } from '../src/levels';
import { createRepair, REPAIRS } from '../src/repairs';
import { RETURN_MAIL } from '../src/return-mail';
import { defaults, exportSave, importSave, saveShiftDraft } from '../src/storage';
import { STREET_NOTES } from '../src/street-ledger';

const notes = STREET_NOTES.flat();

test('八件退信从地图经实物、逐份手记、误投和对调后送达，读档重读保留主线和返修现场', () => {
  let data = defaults();
  const room = new Simulation(LEVELS[0]).snapshot();
  saveShiftDraft(data, { snapshot: room, hintCount: 1 });
  const repair = { snapshot: createRepair(REPAIRS[0]).snapshot(), hintCount: 2 };
  saveShiftDraft(data, repair, REPAIRS[0].id);
  data.slots[0] = { ...repair, repairId: REPAIRS[0].id, savedAt: new Date(0).toISOString(), appearance: data.appearance };
  data.campaign.sites[5] = { snapshot: new Simulation(FIELD_LEVELS[5]).snapshot(), hintCount: 1 };
  jobOf(data.campaign, 'field-5');
  const loom = jobOf(data.campaign, 'loom-5');
  loom.values = turnLoom(looms[5], looms[5].opening, 0);
  loom.actions = 1;
  data = importSave(exportSave(data));
  const { campaign: _campaign, ...otherModes } = structuredClone(data);

  let page = { screen: '', title: '', html: '' };
  let saved = '', postalSeals = 0;
  const makeDesk = () => new CampaignDesk(
    () => data.campaign,
    (title, body, footer, screen) => { page = { title, html: body + footer, screen }; },
    () => { saved = exportSave(data); },
    () => assert.fail('寻址误入了现场联检'),
    () => assert.fail('寻址误触了用时表导出'),
    () => assert.fail('退信误触了主线签收'),
    () => { postalSeals++; },
  );
  let desk = makeDesk();
  const button = (action: string) => page.html.match(new RegExp('<button\\b[^>]*data-action="' + action + '"[^>]*>'))?.[0];
  const click = (action: string) => {
    const tag = button(action);
    assert.ok(tag, `${page.screen} 缺少按钮 ${action}`);
    assert.doesNotMatch(tag, /\sdisabled\b/, action);
    assert.equal(desk.handle(action, page.screen), true, action);
  };
  const open = (i: number) => {
    click('mail-open-' + i);
    assert.equal(page.screen, 'camp-address');
    assert.equal(page.title, RETURN_MAIL[i].title);
    assert.ok(page.html.includes(RETURN_MAIL[i].envelope));
    assert.ok(page.html.includes(RETURN_MAIL[i].marks));
  };
  const cabinet = () => {
    click('mail-list');
    assert.equal(page.screen, 'camp-mail');
    assert.equal(desk.clockKey(page.screen), undefined);
  };
  desk.map();
  click('camp-mail');
  for (const [i, m] of RETURN_MAIL.entries()) {
    open(i);
    for (const s of m.evidence) assert.ok(!page.html.includes(notes[s]), '空档不应提前出现地段手记');
    assert.ok(!button('mail-send'));
    assert.ok(!page.html.includes(m.reply));
    assert.equal(desk.clockKey(page.screen), undefined);
    cabinet();
  }

  // Sign jobs in district order using the same prerequisite checks as the campaign desk.
  // Read the first letter while each of its three street observations becomes available.
  const posted = new Set<number>();
  for (let sector = 0; sector < 48; sector++) {
    for (const trade of TRADES) {
      assert.equal(signJob(data.campaign, trade, sector), true);
      if (sector < 3) {
        open(0);
        for (const s of RETURN_MAIL[0].evidence) {
          const expected = s < sector || (s === sector && trade === 'field');
          assert.equal(page.html.includes(notes[s]), expected, `${jobKey(trade,sector)} / 手记 ${s}`);
        }
        assert.equal(!!button('mail-send'), sector === 2 && trade === 'field');
        cabinet();
      }
    }

    for (const [i, m] of RETURN_MAIL.entries()) {
      if (posted.has(i) || !m.evidence.every(s => s <= sector)) continue;
      const count = signedCount(data.campaign);
      const before = structuredClone(data.campaign);
      const sealsBefore = postalSeals;
      open(i);
      assert.equal(desk.clockKey(page.screen), 'mail');
      for (const s of m.evidence) assert.ok(page.html.includes(notes[s]));
      assert.match(button('mail-send')!, /\sdisabled\b/);
      assert.ok(!page.html.includes(m.reply));
      const transit = m.candidates.find(s => s !== m.from && s !== m.to)!;

      click('mail-from-' + transit);
      click('mail-to-' + transit);
      assert.match(button('mail-send')!, /\sdisabled\b/);
      click('mail-to-' + m.to);
      click('mail-send');
      assert.match(page.html, /role="status"/);
      assert.ok(!page.html.includes(m.reply));
      assert.deepEqual(data.campaign, before);
      assert.equal(postalSeals, sealsBefore);

      click('mail-from-' + m.to);
      click('mail-to-' + m.from);
      click('mail-send');
      assert.match(page.html, /role="status"/);
      assert.deepEqual(data.campaign, before);
      click('mail-swap');
      assert.match(button('mail-from-' + m.from)!, /aria-pressed="true"/);
      assert.match(button('mail-to-' + m.to)!, /aria-pressed="true"/);
      click('mail-send');
      posted.add(i);
      assert.equal(postalSeals, sealsBefore + 1);
      assert.equal(page.screen, 'camp-address');
      assert.ok(page.html.includes(m.reply));
      assert.ok(page.html.includes(m.explanation));
      assert.equal(desk.clockKey(page.screen), undefined);
      assert.ok(!button('mail-send'));
      assert.deepEqual(data.campaign, { ...before, returned: [...posted] });
      assert.equal(signedCount(data.campaign), count);

      // Restore from the payload the real submission saved, not a new snapshot assembled by the test.
      const loaded = importSave(saved);
      assert.deepEqual(loaded, data);
      data = loaded;
      const { campaign, ...retainedModes } = data;
      assert.deepEqual(retainedModes, otherModes);
      if (sector < 5) {
        assert.ok(campaign.sites[5]);
        assert.ok(campaign.jobs['loom-5']?.values);
      }
      desk = makeDesk();
      desk.map();
      click('camp-mail');
      open(i);
      assert.ok(page.html.includes(m.reply));
      assert.ok(!button('mail-send'));
      cabinet();
      assert.equal(postalSeals, posted.size);
    }
    if (sector === 46) {
      assert.equal(posted.size, 8);
      assert.equal(canWork(data.campaign, 'field', 47), false);
      click('camp-map');
      assert.ok(!button('camp-ending'));
      click('camp-mail');
    }
  }
  click('camp-map');
  assert.equal(signedCount(data.campaign), 144);
  assert.ok(button('camp-ending'));
  const completed = structuredClone(data);
  click('camp-mail');
  for (const [i, m] of RETURN_MAIL.entries()) {
    open(i);
    assert.ok(page.html.includes(m.reply));
    assert.ok(page.html.includes(m.explanation));
    assert.equal(desk.clockKey(page.screen), undefined);
    cabinet();
  }
  assert.deepEqual(data, completed);
  assert.equal(postalSeals, 8);
});
