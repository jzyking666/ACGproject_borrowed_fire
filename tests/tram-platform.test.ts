import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Simulation } from '../src/engine';
import { EnvironmentArt } from '../src/environment';
import { TRAM_STOPS } from '../src/last-tram';
import { TramPlatform } from '../src/tram-platform';

const canvas = () => ({width:0, height:0, getContext:() => ({fillRect(){}, fillText(){}})}) as unknown as HTMLCanvasElement;

test('临街与棚后的灯分别读取两个接收环，倒带和减少动态都保留正确的亮灭', () => {
  const sim = new Simulation(TRAM_STOPS[0].level);
  const art = new TramPlatform(0,'候车亭',canvas);
  const color = (name: string) => (art.group.getObjectByName(name) as THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>).material.color.getHex();
  art.update(sim,false,0);
  const first = 'first-platform-lamp', second = 'second-platform-lamp', dark = color(first);
  sim.receivers.amber.charge = 4; art.update(sim,false,4); assert.notEqual(color(first), dark); assert.equal(color(second), dark);
  sim.receivers.blue.charge = 3; art.update(sim,true,5); assert.notEqual(color(second), dark); assert.notEqual(color(second), color(first));
  sim.receivers.amber.charge = 0; art.update(sim,false,1); assert.equal(color(first),dark);
});

test('折门只在两路验收后开启，断线随即合拢；收弓后的尾灯独立保持供电', () => {
  const sim = new Simulation(TRAM_STOPS[1].level), art = new TramPlatform(1,'站台',canvas);
  const door = art.group.getObjectByName('right-door')!;
  art.update(sim,true,0); const closed = door.position.x;
  Object.assign(sim.receivers.latch,{hits:1,charge:5}); art.update(sim,true,1); assert.equal(door.position.x,closed);
  Object.assign(sim.receivers.door,{hits:1,charge:5}); art.update(sim,false,2); assert.ok(door.position.x > closed+.45);
  sim.receivers.latch.charge=0; art.update(sim,true,3); assert.equal(door.position.x,closed);

  const last = new Simulation(TRAM_STOPS[2].level), depot = new TramPlatform(2,'终点',canvas);
  const collector = depot.group.getObjectByName('current-collector')!, signal = depot.group.getObjectByName('platform-semaphore')!;
  const car = depot.group.getObjectByName('route-seven-car')!;
  for (const receiver of Object.values(last.receivers)) Object.assign(receiver,{charge:8,hits:2});
  depot.update(last,true,6); const raised = collector.scale.y, caution = signal.rotation.z, parked = car.position.x;
  last.sourceOn=false; depot.update(last,false,7); assert.ok(collector.scale.y<raised); assert.ok(signal.rotation.z>caution);
  last.won=true; depot.update(last,true,8); depot.update(last,true,9.5); assert.ok(car.position.x>parked+2);
  depot.update(last,false,10); assert.equal(car.visible,false);
  last.won=false; depot.update(last,true,4); assert.equal(car.position.x,parked); assert.equal(car.visible,true);
});

test('电车、站台与架线都位于棋盘后方；换站同时释放车体、标牌和实例缓冲', () => {
  const art = new EnvironmentArt(canvas); art.build(TRAM_STOPS[0].level);
  const group = art.group.getObjectByName('tram-platform')!, box = new THREE.Box3().setFromObject(group);
  assert.ok(box.max.z < -4.9);
  const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture | THREE.InstancedMesh>();
  let objects=0;
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    objects++;
    resources.add(object.material); resources.add(object.geometry);
    if (object.material.map) resources.add(object.material.map);
    if (object instanceof THREE.InstancedMesh) resources.add(object);
  });
  assert.ok(objects <= 14, '车站绘制开销不应随车窗或枕木数量增加');
  let released=0;
  for (const r of resources) r.addEventListener('dispose',()=>released++);
  art.build(TRAM_STOPS[1].level); assert.equal(released,resources.size);
  art.clear(); assert.equal(released,resources.size);
});
