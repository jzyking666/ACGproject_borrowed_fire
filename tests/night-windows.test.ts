import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EnvironmentArt } from '../src/environment';
import { NightWindows, receiverState } from '../src/night-windows';
import { exitSignal, SIGNALS, visitLampRadius } from '../src/exit-signal';
import { Simulation, type ReceiverState } from '../src/engine';
import { LEVELS } from '../src/levels';

const reading = (hits: number, charge = 5): ReceiverState => ({ hits, charge, lastPulse: 8 });
const canvas = () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) as unknown as HTMLCanvasElement;
function bayParts(art: NightWindows, id: string) {
  const bay = art.group.getObjectByName('window-' + id)!;
  const mover = bay.getObjectByName('mechanism')!;
  const lamp = (mover.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material;
  return { bay, mover, lamp };
}

test('同一接收环从供电到验证，剩余电量归零就回到断电读数', () => {
  assert.equal(receiverState(undefined, 2), 'dark');
  assert.equal(receiverState(reading(1), 2), 'lit');
  assert.equal(receiverState(reading(2), 2), 'running');
  assert.equal(receiverState(reading(6, 0), 2), 'dark');
  assert.equal(receiverState(reading(1), 1), 'running');
});

test('同一温室的两扇窗分别跟自己的苗床，回看旧状态会重新熄灯、收拢花冠', () => {
  const sim = new Simulation(LEVELS[18]);
  const art = new NightWindows(sim.level, 'garden');
  const upper = bayParts(art, 'upper'), lower = bayParts(art, 'lower');
  const dark = upper.lamp.color.r, seed = lower.mover.scale.y;
  const original = sim.snapshot();
  sim.receivers.lower = reading(1);
  art.update(.5, true, sim.receivers);
  const lit = lower.lamp.color.r;
  assert.ok(lit > dark); assert.ok(lower.mover.scale.y > seed);
  assert.equal(upper.lamp.color.r, dark); assert.equal(upper.mover.scale.y, seed);
  sim.receivers.upper = reading(2);
  art.update(1.1, true, sim.receivers);
  assert.ok(upper.lamp.color.r > lit); assert.ok(upper.mover.scale.y > lower.mover.scale.y);
  assert.notEqual(upper.mover.rotation.z, 0); assert.equal(lower.mover.rotation.z, 0);
  sim.restore(original); art.update(.5, false, sim.receivers);
  assert.equal(upper.lamp.color.r, dark); assert.equal(lower.mover.scale.y, seed);
  assert.equal(upper.mover.rotation.z, 0);
});

test('印床、飞轮与苗床随模拟时间运行，暂停保持同一姿态，减少动态时保留静态通电状态', () => {
  for (const theme of ['archive', 'foundry', 'garden'] as const) {
    const s = new Simulation(LEVELS[0]); const { id } = s.level.receivers[0];
    const art = new NightWindows(s.level, theme), { mover, lamp, bay } = bayParts(art, id);
    const pose = () => [mover.rotation.z, mover.position.y, mover.scale.y, bay.getObjectByName('printed-slip')?.scale.x];
    s.receivers[id] = reading(1); art.update(1, true, s.receivers); const first = pose();
    art.update(1, true, s.receivers); assert.deepEqual(pose(), first);
    art.update(1.4, true, s.receivers); assert.notDeepEqual(pose(), first);
    const light = lamp.color.r;
    art.update(1.4, false, s.receivers); const still = pose();
    art.update(100, false, s.receivers); assert.deepEqual(pose(), still); assert.equal(lamp.color.r, light);
    if (theme === 'archive') assert.ok(bay.getObjectByName('printed-slip')!.scale.x > .5);
  }
});

test('默认镜头下三扇窗位于玩法区外，在 720p 宽屏和方形视口内可见', () => {
  const art = new NightWindows(LEVELS[6], 'foundry');
  art.group.updateMatrixWorld(true);
  for (const [w, h] of [[1280,720], [800,800]]) {
    const aspect = w/h, span = Math.max(13.7,20/aspect);
    const camera = new THREE.OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,150);
    camera.position.set(Math.sin(.54)*18,19.4,Math.cos(.54)*18);
    camera.lookAt(0,-.1,0); camera.updateMatrixWorld();
    art.group.traverse(mesh => {
      if (!(mesh instanceof THREE.Mesh)) return;
      const p = mesh.geometry.getAttribute('position'), v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
        assert.ok(v.z > 5.1 && v.y < -.65);
        v.project(camera);
        assert.ok(Math.abs(v.x) < 1 && Math.abs(v.y) < 1);
      }
    });
  }
});

test('离网房间的出口臂具有待机、供电、等待断源和放行四个姿态', () => {
  const sim = new Simulation(LEVELS[5]);
  const poses = [exitSignal(sim)];
  sim.receivers.lift = reading(1); poses.push(exitSignal(sim));
  sim.receivers.lift = reading(2); sim.receivers.gate = reading(2); poses.push(exitSignal(sim));
  sim.sourceOn = false; poses.push(exitSignal(sim));
  assert.deepEqual(poses, ['waiting','receiving','isolate','clear']);
  assert.equal(new Set(poses.map(s => SIGNALS[s].angle)).size, 4);
  sim.receivers.gate.charge = 0; assert.equal(exitSignal(sim), 'receiving');
  sim.receivers.lift.charge = 0; assert.equal(exitSignal(sim), 'waiting');
});

test('接收环计数珠的亮暗半径均留在底座内，同排两珠之间留缝', () => {
  const lit = visitLampRadius(true, 1, 0), dim = visitLampRadius(true, 1, 1);
  assert.ok(lit > dim && dim > 0); assert.ok(2 * lit < .135);
  assert.equal(visitLampRadius(false, 2, 1), dim);
});

test('窗景独立几何与共享材质在切换机房时恰好释放一次', () => {
  const art = new EnvironmentArt(canvas); art.build(LEVELS[8]);
  const resources = new Set<THREE.BufferGeometry | THREE.Material>();
  const windows = art.group.getObjectByName('night-windows')!;
  windows.traverse(o => {
    if (o instanceof THREE.Mesh) { resources.add(o.geometry); resources.add(o.material); }
  });
  let count = 0;
  for (const resource of resources) resource.addEventListener('dispose', () => count++);
  const off = new Simulation(LEVELS[8]);
  art.update(0, false, false, 0, off.receivers);
  art.build(LEVELS[7]); assert.equal(count, resources.size);
  assert.notEqual(art.group.getObjectByName('night-windows'), windows);
  art.clear(); assert.equal(count, resources.size);
});
