import test from 'node:test';
import assert from 'node:assert/strict';
import { translateText } from '../src/locale';
import { commissionDiagram } from '../src/commission-diagram';
import { FIELD_LEVELS } from '../src/field-service';
import { Simulation } from '../src/engine';
import { loomFamily } from '../src/grid-loom-ui';
import { tideFamily } from '../src/tide-dispatch-ui';

const en = (s: string) => translateText(s, 'en');

test('live readings retain the physical port, phase, route and beat', () => {
  assert.equal(en('丙路实测 · 东 10 · 冷光　目标 西 2 暖光'), 'Line C measured E10 (cool) · target W2 (warm)');
  assert.equal(en('+0.01 秒 · 甲路实载待电 · 暖光'), '+0.01 s · Load A awaiting power · Warm light');
  assert.equal(en('推演中的实载脉冲沿甲路运行。当前 甲、乙 路没有通过端口联检，出口保持待机。'), 'The live forecast pulse follows line A. Lines A and B have failed inspection. The exit stays closed.');
  assert.equal(en('甲 ✓　乙 ○ · 联检'), 'A ✓ B ○ · Inspection');
  assert.equal(en('定位第 01 拍'), 'Inspect beat 01');
  assert.equal(en('· 第 01、05 拍封航'), '· Closed on beats 01, 05');
  assert.equal(en('双班 · 第 03 拍发'), 'Double service · departs on beat 03');
  assert.equal(en('甲入'), 'A IN');
  assert.equal(en('戊出'), 'E OUT');
  assert.equal(en('旧档案库'), 'Old Archives');
  assert.equal(en('夜间温室'), 'Night Glasshouse');
  assert.equal(en('移动'), 'Move');
  assert.equal(en(' 移动'), ' Move');
  assert.equal(en('。'), '.');
  assert.equal(translateText(' 移动', 'zh-CN'), ' 移动');
  assert.equal(en('Q / B · +0.001'), 'Q / B · +0.001');
  assert.equal(en('阿诚的私人存档'), '阿诚的私人存档');
});

test('each campaign order presents localised text and accessible instrument labels', () => {
  const phrases = new Set<string>();
  function collect(html: string) {
    for (const m of html.matchAll(/>([^<>]+)</gu)) phrases.add(m[1]);
    for (const m of html.matchAll(/(?:aria-label|title|alt|placeholder)="([^"]+)"/gu)) phrases.add(m[1]);
  }
  for (const [i, level] of FIELD_LEVELS.entries()) {
    const sim = new Simulation(level);
    collect(commissionDiagram(sim, level.commission!.length - 1, true, 'A', true));
    phrases.add(level.briefing);
    for (const family of [loomFamily, tideFamily]) {
      const state = family.initial(i);
      collect(family.render(i, state, 0));
      phrases.add(family.title(i));
    }
  }
  for (const phrase of phrases) {
    assert.doesNotMatch(en(phrase), /\p{Script=Han}/u, phrase);
  }
});
