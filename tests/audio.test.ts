import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scores, scoreNotes, type SoundScene } from '../src/night-score';
import { Sound } from '../src/audio';

const scenes = Object.keys(scores) as SoundScene[];

test('all seven written scores fit their meter and resolve on the tonic through the bridge', () => {
  for (const scene of scenes) {
    const s = scores[scene], width = s.backing.length;
    assert.equal(s.bars.length, 8); assert.equal(s.bridge.length, 8); assert.equal(s.answers.length, 2);
    for (const bar of [...s.bars, ...s.bridge, ...s.answers]) {
      assert.equal(bar.length, width, scene + ' ' + bar);
      assert.match(bar, /^[1-8.\-]+$/);
    }
    for (let pass = 0; pass < 4; pass++) {
      const cadence = scoreNotes(scene, 0, (pass * 8 + 7) * width, 1);
      assert.equal(cadence.find(n => n.instrument === s.lead)?.midi, 62);
      for (let step = pass * 8 * width; step < (pass + 1) * 8 * width; step++) {
        for (const n of scoreNotes(scene, 0, step, 1)) {
          assert.ok(Number.isFinite(n.midi) && n.midi >= 36 && n.midi < 90);
          assert.ok(n.beats > 0 && n.beats <= width && n.level > 0 && n.level <= 1);
        }
      }
    }
    assert.notDeepEqual(s.bars, s.bridge);
  }
});
test('power adds musical voices to the running circuit without retuning its melody', () => {
  let additional = 0;
  for (let step = 0; step < 64; step++) {
    const quiet = scoreNotes('room', 2, step, 0), live = scoreNotes('room', 2, step, 1);
    assert.deepEqual(quiet.filter(n=>n.instrument === 'wire'), live.filter(n=>n.instrument === 'wire'));
    additional += live.length - quiet.length;
  }
  assert.ok(additional > 8);
  assert.equal(scoreNotes('harbor',4,0,0)[0].midi - scoreNotes('harbor',0,0,0)[0].midi, 5);
});
test('audio settings, transitions and a missing audio device remain safe before the first gesture', () => {
  const sound = new Sound();
  sound.setBackground(true); sound.unlock(); sound.setScene('room',3); sound.setVolume(0); sound.setMix(.5,1,0);
  sound.previewMusic(); sound.play('rotate'); sound.tick(1, true); sound.setMusic(false); sound.mute(true);
  sound.setBackground(false); sound.unlock(); sound.setScene('harbor',2); assert.equal(sound.ctx, undefined);
});
