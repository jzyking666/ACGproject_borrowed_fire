import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAPTERS } from '../src/chapters';
import { CAMPAIGN_EPILOGUE, DISTRICTS } from '../src/district-atlas';
import { FIELD_LEVELS, SECTORS } from '../src/field-service';
import { looms, wireNames } from '../src/grid-loom';
import { LEVELS } from '../src/levels';
import { translateText } from '../src/locale';
import { CONTENT_EN } from '../src/locale-content';
import { REPAIRS } from '../src/repairs';
import { RETURN_MAIL } from '../src/return-mail';
import { CAST, STORY } from '../src/story';
import { STREET_NOTES } from '../src/street-ledger';
import { TIDES } from '../src/tide-dispatch';

const han = /\p{Script=Han}/u;

function checkAuthoredText(value: unknown): void {
  if (typeof value === 'string' && han.test(value)) {
    assert.ok(CONTENT_EN[value], `Missing authored translation for ${value}`);
    assert.doesNotMatch(translateText(value, 'en'), han);
    assert.equal(translateText(value, 'zh-CN'), value);
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(checkAuthoredText);
  }
}

test('every classic room, crew conversation and repair letter has English copy', () => {
  checkAuthoredText([LEVELS, CHAPTERS, STORY, CAST, REPAIRS]);
});

test('all district notes, mail clues, live loads, loom contacts and shipping orders have English copy', () => {
  checkAuthoredText([DISTRICTS, CAMPAIGN_EPILOGUE, SECTORS, STREET_NOTES,
    FIELD_LEVELS, RETURN_MAIL, looms, wireNames, TIDES]);
});

test('the English explanations for returned mail identify the addresses printed on the selection cards', () => {
  const addresses = SECTORS.flat().map(name => translateText(name, 'en'));
  for (const letter of RETURN_MAIL) {
    const explanation = translateText(letter.explanation, 'en');
    assert.ok(explanation.includes(addresses[letter.from]), explanation);
    assert.ok(explanation.includes(addresses[letter.to]), explanation);
  }
});
