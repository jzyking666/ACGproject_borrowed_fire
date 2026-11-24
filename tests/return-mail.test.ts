import assert from 'node:assert/strict';
import test from 'node:test';
import { freshCampaign, jobKey, jobOf, TRADES } from '../src/campaign-progress';
import { checkAddress, hasMailEvidence, RETURN_MAIL } from '../src/return-mail';
import { STREET_NOTES } from '../src/street-ledger';
import { SECTORS } from '../src/field-service';

// Each item identifies the existing filed observation available to the player.
// This also guards against board reordering silently changing an address.
const evidenceWords = [
  ['踮脚', '四十六克', '折角'],
  ['蜡纸', '烟黑', '对着篷外的光'],
  ['一瓶', '豁口', '半掌黄漆'],
  ['两个小孔', '补写了个“西”', '低水线'],
  ['平结', '褪色的鞋带', '不同颜色的线'],
  ['没用过的往返票', '进门方向', '早班车到站'],
  ['五种笔迹', '信请分送', '防锈油'],
  ['旧纸的裁线', '一个指节', '空夹子'],
];

test('八件退信都有可查实的书面证据、合理的途中章及有顺序的两个地址', () => {
  const notes = STREET_NOTES.flat();
  const sectors = SECTORS.flat();
  assert.equal(RETURN_MAIL.length, 8);
  assert.equal(new Set(RETURN_MAIL.map(m => m.title)).size, 8);
  for (const [index, mail] of RETURN_MAIL.entries()) {
    assert.equal(mail.evidence.length, evidenceWords[index].length);
    assert.deepEqual(new Set(mail.candidates), new Set(mail.evidence));
    assert.ok(new Set(mail.candidates).size >= 3);
    assert.notEqual(mail.from, mail.to);
    for (const [observation, sector] of mail.evidence.entries()) {
      assert.ok(sector >= 0 && sector < 47, '没有线索依赖最后总闸的签收');
      assert.ok(notes[sector].includes(evidenceWords[index][observation]), mail.title);
    }
    const pairs = [];
    for (const from of mail.candidates) {
      for (const to of mail.candidates) {
        if (checkAddress(index, from, to)) pairs.push([from, to]);
      }
    }
    assert.deepEqual(pairs, [[mail.from, mail.to]]);
    for (const sector of [mail.from, mail.to]) {
      const name = sectors[sector];
      assert.ok(mail.explanation.includes(name), '回信解释要给出信端的依据');
      assert.ok(!(mail.envelope + mail.marks).includes(name), '信封文字不应直接给出正确地名');
    }
    if (index > 0) {
      assert.notEqual(Math.floor(mail.from / 6), Math.floor(mail.to / 6));
    }
  }
  assert.ok(RETURN_MAIL[0].evidence.every(s => s < 6));
});

test('每封信单独开案，只需本案三个地段全签收，任一地段少做一项都不能代替', () => {
  for (const [index, mail] of RETURN_MAIL.entries()) {
    const progress = freshCampaign();
    assert.equal(hasMailEvidence(progress, index), false);
    const stamps = mail.evidence.flatMap(sector =>
      TRADES.map(trade => jobOf(progress, jobKey(trade, sector)))
    );
    for (const stamp of stamps) stamp.done = true;
    assert.equal(hasMailEvidence(progress, index), true);
    for (const stamp of stamps) {
      stamp.done = false;
      assert.equal(hasMailEvidence(progress, index), false);
      stamp.done = true;
    }
  }
  assert.equal(checkAddress(-1, 0, 1), false);
  assert.equal(hasMailEvidence(freshCampaign(), 8), false);
});
