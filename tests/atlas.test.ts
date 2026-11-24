import test from 'node:test';
import assert from 'node:assert/strict';
import { feedNames } from '../src/campaign-progress';
import { CAMPAIGN_EPILOGUE, DISTRICTS, districtArt, districtMap, type DistrictStatus } from '../src/district-atlas';

test('八个街区在同一张总图上由不同住户报修，每区有完整的抵达与交付记录', () => {
  assert.deepEqual(DISTRICTS.map(d => d.id), [0, 1, 2, 3, 4, 5, 6, 7]);
  for (const field of ['title', 'resident', 'arrival', 'restored', 'landmark'] as const) {
    assert.equal(new Set(DISTRICTS.map(d => d[field])).size, 8);
  }
  assert.ok(CAMPAIGN_EPILOGUE.includes('第八粒'));
  assert.ok(DISTRICTS.every(d => d.x > 0 && d.x < 840 && d.y > 0 && d.y < 420));
});

test('地图按钮可按街区选择，锁定、当前和完工状态彼此独立', () => {
  const states: DistrictStatus[] = ['restored', 'restored', 'open', 'locked', 'locked', 'locked', 'locked', 'locked'];
  const lookedUp: number[] = [];
  const markup = districtMap(2, id => { lookedUp.push(id); return states[id]; });
  assert.deepEqual(lookedUp, DISTRICTS.map(d => d.id));
  const cables = [...markup.matchAll(/data-feeder="(\d-\d)"/g)].map(match => match[1]);
  const expected = DISTRICTS.flatMap(d => feedNames(d.id).map(from => `${from}-${d.id}`));
  assert.deepEqual(cables.sort(), expected.sort(), '地图实线与上游供电规则必须使用同样的河岸分叉');
  const buttons = [...markup.matchAll(/<button\b[^>]+>/g)].map(m => m[0]);
  assert.equal(buttons.length, 8);
  for (const [i, tag] of buttons.entries()) {
    assert.ok(tag.includes(`data-action="district-${i}"`));
    assert.ok(tag.includes(`aria-label="${DISTRICTS[i].title}，`));
    assert.ok(tag.includes(`aria-pressed="${i === 2}"`));
    assert.equal(tag.includes(' disabled'), states[i] === 'locked');
  }
  assert.match(markup, /<b>2<\/b> \/ 8/);
  assert.equal(districtMap(7, () => 'restored').match(/ disabled/g), null);
});

test('八幅窗外版画具有专用地标，完成时切换物体姿态，纸图可内嵌至离线文件', () => {
  const shapes = new Set<string>();
  for (const d of DISTRICTS) {
    const original = districtArt(d.id, false), restored = districtArt(d.id, true);
    assert.ok(original.includes(`${d.landmark}，等待接通`));
    assert.ok(restored.includes(`${d.landmark}，恢复运行`));
    // A text, colour or backdrop swap alone cannot satisfy the mechanical-pose check.
    const pose = (svg: string) => svg.split('<g transform="translate(46 0)">')[1]
      .replace(/\s(?:fill|stroke)="[^"]*"/g, '');
    assert.notEqual(pose(original), pose(restored));
    shapes.add(pose(restored));
    assert.doesNotMatch(restored, /<image|href=|<foreignObject|<script/);
  }
  assert.equal(shapes.size, DISTRICTS.length);
  assert.equal(districtArt(-1, false), '');
});
