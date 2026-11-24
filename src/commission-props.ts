import { translateText } from './locale';
import { enamelInk, signFaces } from './sign-lettering';
import * as THREE from 'three';
import type { Level, Phase } from './levels';
import type { Simulation, OpticalRoute } from './engine';

export const circuitNames = ['甲','乙','丙','丁','戊'];
type Tag = {
  label: string; x: number; y: number; z: number; width: number; depth: number;
  direction?: string; phase?: Phase; fixed?: boolean;
};

/** The same worksheet orientation as the field drawing, seen from directly overhead.
 * Rectangles remain entirely on their own rim tile or mirror plinth. */
export function commissionTags(level: Level): Tag[] {
  if (!level.commission) return [];
  const tags: Tag[] = [];
  for (const [i,r] of level.commission.entries()) {
    const dx = r.outlet.x === 0 ? -1 : r.outlet.x === level.width-1 ? 1 : 0;
    const dy = r.outlet.y === 0 ? -1 : r.outlet.y === level.height-1 ? 1 : 0;
    for (const [c, role, phase, vx, vy] of [
      [r.inlet, '入', r.phase, r.inlet.dx, r.inlet.dy],
      [r.outlet, '出', r.delivery, dx, dy],
    ] as const) {
      tags.push({ label: circuitNames[i] + role, x:c.x-6, z:c.y-4, y:.333, width:.81, depth:.71,
        direction: vx === 1 ? '→' : vx === -1 ? '←' : vy === 1 ? '↓' : '↑', phase });
    }
  }
  for (const m of level.mirrors) {
    tags.push({ label:m.id, x:m.x-6+.31, z:m.y-4+.33, y:.218, width:.35, depth:.27, fixed: !!m.fixed });
  }
  return tags;
}

export function probeRoute(sim: Simulation, index: number): OpticalRoute | undefined {
  const reads = sim.commissionReadings();
  return (reads[index] ?? reads[0])?.route;
}

/** A single texture sheet and an instanced metal backing for the full room.
 * No per-frame redraw, lights or camera-facing text sprites are needed. */
export class CommissionProps {
  readonly group = new THREE.Group();
  private brackets: THREE.Mesh[] = [];
  private readonly tags: Tag[];
  private readonly ports: number;
  private readonly texture: THREE.CanvasTexture;
  constructor(level: Level, createCanvas = () => document.createElement('canvas')) {
    this.tags = commissionTags(level); this.ports = level.commission?.length ?? 0;
    const tags = this.tags, cols = 5, rows = Math.max(1, Math.ceil(tags.length/cols)), tileW = 144, tileH = 110;
    const canvas = createCanvas(); canvas.width = cols * tileW; canvas.height = rows * tileH;
    const ctx = canvas.getContext('2d')!;
    const { instrument } = signFaces();
    const faces: number[] = [], uv: number[] = [];
    const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),
      new THREE.MeshStandardMaterial({color: 0x786c50, metalness:.43, roughness:.56}),tags.length);
    body.name = '铭牌铜座';
    const pose = new THREE.Object3D();
    tags.forEach((tag, i) => {
      const col=i%cols, row=Math.floor(i/cols), sx=col*tileW, sy=row*tileH;
      // The crown and the square mark repeat the hue in monochrome.
      const ink = tag.phase === 'cool' ? '#a7d8ef' : tag.phase === 'warm' ? '#ffcd86' : tag.fixed ? '#c4c5b9' : '#f0e4bd';
      ctx.fillStyle = enamelInk; ctx.fillRect(sx,sy,tileW,tileH);
      ctx.fillStyle = ink; ctx.fillRect(sx+5,sy+5,tileW-10,4);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (tag.direction) {
        ctx.font = `600 51px ${instrument}`; ctx.fillText(translateText(tag.label),sx+72,sy+40,tileW-20);
        ctx.font = `600 39px ${instrument}`;
        ctx.fillText((tag.phase === 'cool' ? '◇ ' : '● ') + tag.direction,sx+72,sy+83,tileW-20);
      } else {
        ctx.font = `700 76px ${instrument}`; ctx.fillText(tag.label,sx+72,sy+61,tileW-20);
        if (tag.fixed) for (const offset of [8,tileW-17]) ctx.fillRect(sx+offset,sy+tileH-18,9,9);
      }
      const x=tag.x, z=tag.z, y=tag.y, hw=tag.width/2, hd=tag.depth/2;
      const left=(sx+2)/canvas.width, right=(sx+tileW-2)/canvas.width;
      const top=1-(sy+2)/canvas.height, bottom=1-(sy+tileH-2)/canvas.height;
      faces.push(x-hw,y,z-hd, x-hw,y,z+hd, x+hw,y,z-hd, x+hw,y,z-hd, x-hw,y,z+hd, x+hw,y,z+hd);
      uv.push(left,top, left,bottom, right,top, right,top, left,bottom, right,bottom);
      pose.position.set(x,y-.033,z); pose.scale.set(tag.width+.036,.06,tag.depth+.036);
      pose.updateMatrix(); body.setMatrixAt(i,pose.matrix);
    });
    this.group.add(body);
    this.texture = new THREE.CanvasTexture(canvas); this.texture.colorSpace=THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(faces,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    const finePrint = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:this.texture,toneMapped:false}));
    finePrint.name = '线路与轴座铭牌'; this.group.add(finePrint);
    const ring = new THREE.RingGeometry(.53,.58,4); ring.rotateX(-Math.PI/2);
    const material = new THREE.MeshBasicMaterial({color:0xffe2a9, toneMapped:false});
    for (const end of ['起点','验收口']) {
      const mark = new THREE.Mesh(ring,material); mark.visible=false; mark.name='校线'+end;
      this.group.add(mark); this.brackets.push(mark);
    }
  }
  select(index: number | undefined) {
    const active = index !== undefined && index >= 0 && index < this.ports && Number.isInteger(index);
    this.brackets.forEach((mesh,end) => {
      mesh.visible=active;
      if (active) { const tag=this.tags[index!*2+end]; mesh.position.set(tag.x,.347,tag.z); }
    });
  }
  dispose() {
    const geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.group.traverse(o => {
      if (o instanceof THREE.Mesh) {
        geometry.add(o.geometry); const mats=Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => materials.add(m));
        if (o instanceof THREE.InstancedMesh) o.dispose();
      }
    });
    geometry.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); this.texture.dispose();
    this.brackets = []; this.group.clear();
  }
}
