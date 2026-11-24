import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { commissionTags, CommissionProps, circuitNames, probeRoute } from '../src/commission-props';
import { Simulation } from '../src/engine';
import { FIELD_LEVELS } from '../src/field-service';
import { exitSignal } from '../src/exit-signal';
import { LEVELS } from '../src/levels';

test('48 个现场端口的号码、进出、方向、相位和轴座字母与实际线路一致，牌面留在格内', () => {
  for (const level of FIELD_LEVELS) {
    const tags = commissionTags(level), runs = level.commission!;
    assert.equal(tags.length, runs.length * 2 + level.mirrors.length);
    runs.forEach((run,i) => {
      const [a,b] = tags.slice(i*2, i*2+2);
      assert.deepEqual([a.label,b.label],[circuitNames[i]+'入',circuitNames[i]+'出']);
      assert.deepEqual([a.phase,b.phase],[run.phase,run.delivery]);
      assert.deepEqual([a.x+6,a.z+4,b.x+6,b.z+4],[run.inlet.x,run.inlet.y,run.outlet.x,run.outlet.y]);
      assert.equal(a.direction, run.inlet.x === 0 ? '→' : run.inlet.x === 12 ? '←' : run.inlet.y === 0 ? '↓' : '↑');
      assert.equal(b.direction, run.outlet.x === 0 ? '←' : run.outlet.x === 12 ? '→' : run.outlet.y === 0 ? '↑' : '↓');
      for (const plate of [a,b]) assert.ok(plate.width < 1 && plate.depth < 1 && plate.y > .27);
    });
    const mirrors = tags.slice(runs.length*2);
    assert.deepEqual(mirrors.map(tag => tag.label), level.mirrors.map(m => m.id));
    mirrors.forEach((tag,i) => {
      assert.equal(tag.fixed, !!level.mirrors[i].fixed);
      assert.ok(Math.abs(tag.x + 6 - level.mirrors[i].x) + tag.width/2 <= .5);
      assert.ok(Math.abs(tag.z + 4 - level.mirrors[i].y) + tag.depth/2 <= .5);
    });
  }
  assert.deepEqual(commissionTags(LEVELS[0]), []);
});

test('切换检修路线取各自的入口与相位，转动镜面后预览随读数刷新，校线与实载均就绪才放行', () => {
  const s = new Simulation(FIELD_LEVELS.find(l => l.commission!.length === 5)!);
  for (const [i,r] of s.level.commission!.entries()) {
    const route = probeRoute(s,i)!;
    assert.deepEqual([route.points[0].x,route.points[0].y,route.points[0].phase],[r.inlet.x,r.inlet.y,r.phase]);
    assert.equal(probeRoute(s,i),route);
  }
  const old = probeRoute(s,1); s.mirrors = structuredClone(s.level.solution);
  assert.notEqual(probeRoute(s,1),old);
  assert.ok(s.commissionReadings().every(r => r.passes));
  s.receivers.load.charge = 8; s.receivers.load.hits = 1;
  assert.equal(exitSignal(s),'clear');
  s.mirrors = structuredClone(s.level.mirrors);
  assert.equal(exitSignal(s),'receiving');
  assert.equal(probeRoute(new Simulation(LEVELS[0]),0),undefined);
});

test('观察标记只框住选择的一对插座；铭牌共用一个纹理，低画质可见，几何与材质只释放一次', () => {
  const level = FIELD_LEVELS.find(l => l.commission!.length === 5)!;
  const texts: string[] = [];
  const fake = { width:0, height:0, getContext:() => ({fillRect(){},fillText(s: string){texts.push(s);}}) };
  const props = new CommissionProps(level,() => fake as unknown as HTMLCanvasElement);
  const start = props.group.getObjectByName('校线起点')!, end = props.group.getObjectByName('校线验收口')!;
  props.select(2); const r = level.commission![2];
  assert.deepEqual([start.position.x,start.position.z,end.position.x,end.position.z],[r.inlet.x-6,r.inlet.y-4,r.outlet.x-6,r.outlet.y-4]);
  assert.ok(start.visible && end.visible);
  props.select(undefined); assert.ok(!start.visible && !end.visible);
  assert.ok(texts.includes('戊出') && texts.includes('A'));
  const disposed = new Map<THREE.EventDispatcher,number>();
  const track = (obj: THREE.Material | THREE.BufferGeometry | THREE.Texture | THREE.InstancedMesh) => {
    if (disposed.has(obj)) return;
    disposed.set(obj,0); obj.addEventListener('dispose',() => disposed.set(obj,disposed.get(obj)!+1));
  };
  for (const mesh of props.group.children as THREE.Mesh[]) {
    track(mesh.geometry); const mat = mesh.material as THREE.MeshBasicMaterial; track(mat);
    if (mat.map) track(mat.map);
    if (mesh instanceof THREE.InstancedMesh) track(mesh);
  }
  assert.equal(props.group.children.length,4);
  props.dispose(); assert.equal(props.group.children.length,0);
  assert.ok([...disposed.values()].every(times => times === 1));
});
