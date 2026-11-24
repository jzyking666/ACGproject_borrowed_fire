import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/engine';
import { LEVELS } from '../src/levels';
import { History } from '../src/history';
import { shiftCoach } from '../src/shift-coach';

function start(id = 0) {
  const level = { ...LEVELS[id] };
  Object.defineProperty(level, 'solution', { get() { throw new Error('关内提示不能读取参考解'); } });
  return new Simulation(level);
}

test('头两班的入场指引识别靠近的镜子，并随键盘、手柄和撤销切换', () => {
  for (const id of [0, 1]) {
    const s = start(id), history = new History();
    const before = s.snapshot(), original = shiftCoach(s);
    assert.match(original!, /E 拿起/); assert.match(shiftCoach(s, true)!, /手柄 A 拿起/);
    assert.deepEqual(s.snapshot(), before);
    history.perform(s, () => s.interact()); assert.ok(s.carried); assert.match(shiftCoach(s)!, /放下/);
    history.undo(s); assert.equal(shiftCoach(s), original); assert.deepEqual(s.snapshot(), before);
  }
});

test('手持时区分空地、被占用的落点与光线经过的落点，无需记录提示阶段', () => {
  const s = start(); s.interact();
  s.player = { x: 5, y: 4 }; s.facing = { x: 0, y: 1 }; assert.match(shiftCoach(s, true)!, /手柄 A.*手柄 B/);
  s.player = { x: 7, y: 2 }; s.facing = { x: 1, y: 0 }; assert.match(shiftCoach(s)!, /放不下/);
  s.facing = { x: 0, y: -1 }; assert.match(shiftCoach(s)!, /镜子在手上/);
  s.player = { x: 7, y: 5 }; s.facing = { x: 1, y: 0 }; s.interact(); assert.ok(!s.carried);
  assert.match(shiftCoach(s)!, /Q 原地转向/); s.rotate(); assert.match(shiftCoach(s)!, /等接收环亮起/);
  s.mirrors[0].y = 6; assert.match(shiftCoach(s)!, /偏离/);
});

test('第二班允许用一面镜接通的替代布局，按实际先后引导开机、等光、空手走进出口', () => {
  const s = start(1);
  s.mirrors[0] = { ...s.mirrors[0], x: 4, y: 6, slash: true };
  s.sourceOn = false; assert.match(shiftCoach(s)!, /开机/);
  s.player = { x: 1, y: 6 }; s.interact(); assert.ok(s.sourceOn); assert.match(shiftCoach(s)!, /等接收环亮起/);
  s.player = { x: 1, y: 3 }; for (let i = 0; i < 3 * 120; i++) s.step(1 / 120);
  assert.ok(s.exitOpen); assert.match(shiftCoach(s)!, /走进青色出口/);
  s.player = { x: 9, y: 4 }; s.interact(); assert.ok(s.carried); assert.match(shiftCoach(s, true)!, /手柄 A 放下镜子/);
  s.won = true; assert.equal(shiftCoach(s), undefined);
});

test('接不上的第二道光可以通过观察定位；首次两关以外的机房使用本来的说明', () => {
  const s = start(1); s.mirrors[0] = { ...s.mirrors[0], x: 8, y: 6, slash: true };
  s.player = { x: 8, y: 7 }; assert.match(shiftCoach(s, true)!, /手柄 X.*暂停/);
  s.player = { x: 9, y: 4 }; assert.match(shiftCoach(s)!, /上一面镜子/);
  s.mirrors[0].x = 3; s.mirrors[0].y = 3;
  s.player = { x: 1, y: 7 }; assert.match(shiftCoach(s)!, /走近/);
  assert.equal(shiftCoach(start(2)), undefined);
});
