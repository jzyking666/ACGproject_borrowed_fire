import { translateText } from './locale';
import { enamelInk, signFaces } from './sign-lettering';
import * as THREE from 'three';
import type { Level } from './levels';
import type { ReceiverState } from './engine';
import { batchStaticBoxes } from './batching';
import { NightWindows } from './night-windows';
const box = new THREE.BoxGeometry(1, 1, 1);
const random = (i: number) => { const n = Math.sin(i * 127.1 + 19.7) * 43758.5453; return n - Math.floor(n); };

/** A layered rooftop set: playable roof, supporting architecture, garden silhouettes and distant city. */
export class EnvironmentArt {
  constructor(private createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')) {}
  readonly group = new THREE.Group();
  private sky?: THREE.ShaderMaterial;
  private rain?: THREE.InstancedMesh;
  private transform = new THREE.Object3D();
  private leaves: THREE.Object3D[] = [];
  private leafBatches: { mesh: THREE.InstancedMesh; leaves: THREE.Object3D[] }[] = [];
  private flowers: THREE.Group[] = [];
  private fan?: THREE.Group;
  private mobile?: THREE.Group;
  private glassLights: THREE.MeshStandardMaterial[] = [];
  private windows: THREE.MeshStandardMaterial[] = [];
  private nightWindows?: NightWindows;
  private textures: THREE.Texture[] = [];
  private palette = new Map<string, THREE.MeshStandardMaterial>();
  batching = { instances: 0, batches: 0, saved: 0 };
  private material(color: number, roughness = .75, glow = 0) {
    const key = `${color}:${roughness}:${glow}`;
    let material = this.palette.get(key);
    if (!material) { material = new THREE.MeshStandardMaterial({ color, roughness, metalness: .25, emissive: color, emissiveIntensity: glow }); this.palette.set(key, material); }
    return material;
  }
  private block(x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: THREE.Material) {
    const mesh = new THREE.Mesh(box, mat); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.receiveShadow = true; this.group.add(mesh); return mesh;
  }
  private branch(points: number[][], radius: number, mat: THREE.Material) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, radius, 6, false), mat); this.group.add(mesh); return mesh;
  }
  clear() {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.group.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Line) { if (o instanceof THREE.InstancedMesh) o.dispose(); if (o.geometry !== box) geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); this.textures.forEach(t => t.dispose());
    this.nightWindows = undefined;
    this.flowers = []; this.fan = undefined; this.mobile = undefined; this.glassLights = []; this.textures = []; this.leaves = []; this.leafBatches = []; this.windows = []; this.group.clear(); this.sky = undefined; this.rain = undefined; this.palette.clear();
  }
  build(level: Level) {
    this.clear();
    const theme = level.theme ?? (level.id < 3 ? 'archive' : level.id < 5 ? 'garden' : 'foundry');
    const prismatic = level.mirrors.some(m => m.kind === 'prism');
    const garden = theme === 'garden', accent = garden ? 0xa7d6a5 : theme === 'foundry' ? 0xe3aa68 : 0x93b6d6;
    const concrete = this.material(0x253333), steel = this.material(0x42514c, .4), trim = this.material(accent, .5);
    // A slow, low contrast sky keeps the foreground readable without a flat black void.
    this.sky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
      uniforms: { time: { value: 0 }, low: { value: new THREE.Color(garden ? 0x365852 : 0x344553) }, high: { value: new THREE.Color(0x101b2c) } },
      vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 p; uniform float time; uniform vec3 low; uniform vec3 high; void main(){float h=smoothstep(-20.,55.,p.y);float cloud=sin(p.x*.08+time*.015)*sin(p.z*.055+time*.009);gl_FragColor=vec4(mix(low,high,h)+cloud*.008,1.);}' });
    this.group.add(new THREE.Mesh(new THREE.SphereGeometry(85, 24, 16), this.sky));
    // The board is the roof of a building with a visible facade, not a floating tray.
    this.block(0, -2.3, 0, 14.1, 3.4, 10, concrete);
    for (const x of [-6.65, 6.65]) {
      this.block(x, -2.3, 0, .27, 3.6, 10.4, steel);
      for (let z = -4; z <= 4; z += 2) {
        this.block(x, .23, z, .065, .75, .065, steel);
        this.branch([[x, .59, z - .8], [x, .59, z], [x, .59, z + .8]], .025, steel);
      }
    }
    for (let i = 0; i < 12; i++) {
      const x = -6.05 + i * 1.1;
      this.block(x, -2.2, 5.02, .75, 1.1, .025, this.material(0x091d24, .2));
      const light = this.material(i % 3 ? 0xb6b586 : 0x6faaa4, .5, .35); this.windows.push(light);
      this.block(x, -2.2, 5.04, .52, .7, .025, light);
      this.block(x, -.85, 5.03, .85, .08, .07, steel);
    }
    this.nightWindows = new NightWindows(level, theme); this.group.add(this.nightWindows.group);
    for (let i = 0; i < 28; i++) {
      const x = (random(i + 1) - .5) * 70, z = -12 - random(i + 44) * 24;
      const height = 5 + random(i + 8) * 13;
      this.block(x, -11 + height / 2, z, 1.6 + random(i + 7) * 3, height, 2 + random(i + 13) * 3, this.material(0x1d3037));
      for (let j = 0; j < 4; j++) {
        this.block(x, -9 + j * 2, z + 1.6, .06 + random(i + j + 55) * 1.2, .055, .02, this.material(accent, .8, .55));
      }
    }
    const street = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), this.material(0x15292d, .3)); street.rotation.x = -Math.PI / 2; street.position.y = -7; this.group.add(street);
    // A greenhouse behind the roof establishes a destination and large, curved silhouettes.
    for (const z of [-5.4, -7.3, -9.2]) {
      this.branch([[-6.4, -.3, z], [-5.3, 2.6, z], [0, 4, z], [5.3, 2.6, z], [6.4, -.3, z]], .065, steel);
    }
    for (const x of [-4, 0, 4]) this.branch([[x, 2.7, -5.4], [x, 3, -7.3], [x, 2.7, -9.2]], .025, trim);
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x83b0a8, transparent: true, opacity: .09, roughness: .2, metalness: .2, side: THREE.DoubleSide, depthWrite: false });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 4), glass); pane.position.set(0, 1.1, -9.25); this.group.add(pane);
    const canvas = this.createCanvas(); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    const place = level.commission ? level.subtitle + ' · ' + level.name
      : prismatic ? '第七区 · 分光温室' : garden ? '第七区 · 夜间温室' : theme === 'foundry' ? '第七区 · 维修屋顶' : '第七区 · 旧档案库';
    ctx.fillStyle = enamelInk; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#b9b39f';
    ctx.fillRect(12, 8, canvas.width - 24, 2); ctx.fillRect(12, 86, canvas.width - 24, 2);
    ctx.font = `700 45px ${signFaces().title}`; ctx.fillStyle = '#f3e7cb';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(translateText(place), canvas.width / 2, canvas.height / 2 + 2, canvas.width - 40);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; this.textures.push(map);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, .825), new THREE.MeshBasicMaterial({ map })); sign.position.set(0, 2.8, -5.45); this.group.add(sign);
    if (prismatic) this.buildGlassMobile(trim);
    // Organic silhouettes frame the roof; branches deliberately grow away from playable tiles.
    const leafGeometry = new THREE.SphereGeometry(1, 8, 6);
    for (const side of [-1, 1]) {
      const x = side * 8.2;
      this.branch([[x, -3, -3], [x - side * .3, 0, -3], [x + side * .7, 2.5, -3.4], [x + side * 1.8, 4.8, -4.2]], .18, this.material(0x334f42));
      for (let k = 0; k < 5; k++) {
        const y = .6 + k * .68, endX = x + side * (1 + (k % 2) * 1.2), z = -2 - k * .8;
        this.branch([[x, y, -3], [endX, y + .5, z], [endX + side, y + .45, z + .3]], .045, steel);
        for (let j = 0; j < 4; j++) {
          const leaf = new THREE.Mesh(leafGeometry, this.material(garden ? j % 2 ? 0x779b72 : 0x3f7569 : 0x4c6b65, .9));
          leaf.position.set(endX + side * j * .24, y + .5, z + j * .23); leaf.scale.set(.15, .035, .48); leaf.rotation.set(.2, j * .9, side * .4); this.group.add(leaf); this.leaves.push(leaf);
        }
      }
      for (let i = 0; i < 3; i++) {
        const z = -4.2 + i * 3.4;
        this.branch([[side * 7.15, -.4, z], [side * 7.25, 1.4, z], [side * 7.6, 1.9, z]], .025, steel);
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 8), this.material(accent, .5, 1.4)); lantern.scale.y = 1.4; lantern.position.set(side * 7.6, 1.9, z); this.group.add(lantern);
      }
    }
    const byMaterial = new Map<THREE.Material, THREE.Mesh[]>();
    for (const leaf of this.leaves as THREE.Mesh[]) { const material = leaf.material as THREE.Material; const list = byMaterial.get(material) ?? []; list.push(leaf); byMaterial.set(material, list); }
    for (const [material, leaves] of byMaterial) {
      const mesh = new THREE.InstancedMesh(leafGeometry, material, leaves.length); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
      leaves.forEach((leaf, i) => { leaf.updateMatrix(); mesh.setMatrixAt(i, leaf.matrix); this.group.remove(leaf); });
      this.group.add(mesh); this.leafBatches.push({ mesh, leaves });
    }
    if (garden) {
      const leafMat = this.material(0x476f59, .9), petalMat = this.material(0x92bfad, .65, .12), heart = this.material(0xeac387, .5, .6);
      const petalGeometry = new THREE.SphereGeometry(1, 7, 5);
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
        const flower = new THREE.Group(); flower.position.set(side * (7.25 + (i % 2) * .5), .15, -4.4 + i * 1.6);
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(.018, .03, .6, 5), leafMat); stalk.position.y = .3; flower.add(stalk);
        const crown = new THREE.Group(); crown.position.y = .6;
        for (let j = 0; j < 5; j++) {
          const petal = new THREE.Mesh(petalGeometry, petalMat); petal.scale.set(.09, .025, .24);
          petal.position.set(Math.sin(j * Math.PI * .4) * .14, 0, Math.cos(j * Math.PI * .4) * .14); petal.rotation.y = j * Math.PI * .4; crown.add(petal);
        }
        batchStaticBoxes(crown, petalGeometry);
        const center = new THREE.Mesh(new THREE.SphereGeometry(.065, 8, 6), heart); crown.add(center); flower.add(crown); flower.userData.crown = crown;
        this.flowers.push(flower); this.group.add(flower);
      }
    } else if (theme === 'foundry') {
      const copper = this.material(0x8e6248, .45), radiator = this.material(0x33464b);
      for (const side of [-1, 1]) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 2.4, 14), copper); tank.position.set(side * 8, .4, -5.3); this.group.add(tank);
        this.branch([[side * 8, 1.6, -5.3], [side * 8, 2.1, -6.2], [side * 5, 2.1, -6.2]], .09, steel);
        for (let i = 0; i < 7; i++) this.block(side * 8, .5, -4.8 + i * .17, 1.1, 1.1, .055, radiator);
      }
      this.fan = new THREE.Group(); this.fan.position.set(0, 2.8, -7.2);
      for (let j = 0; j < 4; j++) { const blade = new THREE.Mesh(box, copper); blade.scale.set(.16, 1.1, .045); blade.position.set(Math.sin(j * Math.PI / 2) * .45, Math.cos(j * Math.PI / 2) * .45, 0); blade.rotation.z = -j * Math.PI / 2; this.fan.add(blade); }
      this.group.add(this.fan);
    } else {
      const cabinet = this.material(0x3b4b59), brass = this.material(0xb09b71, .5);
      for (const x of [-8, 8]) for (let i = 0; i < 3; i++) {
        this.block(x, .25, -3.8 - i * 1.5, .9, 1.8, 1.1, cabinet);
        for (let j = 0; j < 4; j++) { this.block(x, -.35 + j * .4, -3.2 - i * 1.5, .75, .33, .04, steel); this.block(x, -.35 + j * .4, -3.16 - i * 1.5, .22, .035, .06, brass); }
      }
    }
    // A few translucent, diagonal shafts suggest light through the glazing; no screen-filling blur.
    for (let i = 0; i < 3; i++) {
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(.6, 7), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .045, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      beam.position.set(-4 + i * 4, 1, -6); beam.rotation.z = -.45; this.group.add(beam);
    }
    this.rain = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xa2c9cb, transparent: true, opacity: .13, depthWrite: false }), 140); this.rain.frustumCulled = false; this.group.add(this.rain);
    const rim = new THREE.PointLight(accent, 12, 20, 2); rim.position.set(-5, 4, -6); this.group.add(rim);
    this.windows = [...new Set(this.windows)];
    this.batching = batchStaticBoxes(this.group, box);
  }
  private buildGlassMobile(brass: THREE.Material) {
    // A suspended glass botanical study, behind the playable roof. Its colors
    // echo the device grammar, while broad silhouettes keep the board legible.
    this.mobile = new THREE.Group(); this.mobile.position.set(0, 3.6, -8.6);
    const shape = new THREE.Shape(); shape.moveTo(0, -.22); shape.lineTo(.65, -.42); shape.lineTo(1.55, -.1); shape.lineTo(1.82, .2); shape.lineTo(.74, .37); shape.lineTo(0, .12); shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape), edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edge = new THREE.LineBasicMaterial({ color: 0xaca482, transparent: true, opacity: .58 });
    const amber = new THREE.MeshStandardMaterial({ color: 0xe2b176, emissive: 0xe2b176, emissiveIntensity: .15, roughness: .25, metalness: .15, transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide });
    const blue = amber.clone(); blue.color.setHex(0x86bbd1); blue.emissive.setHex(0x86bbd1); this.glassLights = [amber, blue];
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2, petal = new THREE.Group(); petal.rotation.z = angle;
      petal.add(new THREE.Mesh(geometry, i % 2 ? amber : blue)); petal.add(new THREE.LineSegments(edgeGeometry, edge)); this.mobile.add(petal);
    }
    for (const radius of [.28, 1.05, 2]) this.mobile.add(new THREE.Mesh(new THREE.TorusGeometry(radius, .018, 6, 80), brass));
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 2.4, 5), brass); chain.position.set(0, 2.6, 0); this.mobile.add(chain);
    this.group.add(this.mobile);
  }
  update(time: number, motion: boolean, highQuality: boolean, powered: number, readings?: Readonly<Record<string, ReceiverState>>, simulationTime = time) {
    if (readings) this.nightWindows?.update(simulationTime, motion, readings);
    if (this.sky) this.sky.uniforms.time.value = motion ? time : 0;
    this.flowers.forEach((flower, i) => { const crown = flower.userData.crown as THREE.Group; crown.scale.setScalar(.4 + powered * .6); crown.rotation.y = motion ? Math.sin(time * .15 + i) * .1 : 0; });
    if (this.fan && motion) this.fan.rotation.z = time * (.25 + powered);
    if (this.mobile) this.mobile.rotation.z = motion ? Math.sin(time * .13) * .045 : 0;
    this.glassLights.forEach(m => m.emissiveIntensity = .12 + powered * .55);
    this.windows.forEach(m => m.emissiveIntensity = .2 + powered * .6);
    this.leaves.forEach((leaf, i) => leaf.rotation.z = (i < this.leaves.length / 2 ? -.4 : .4) + (motion ? Math.sin(time * .7 + i) * .035 : 0));
    for (const batch of this.leafBatches) { batch.leaves.forEach((leaf, i) => { leaf.updateMatrix(); batch.mesh.setMatrixAt(i, leaf.matrix); }); batch.mesh.instanceMatrix.needsUpdate = true; }
    if (!this.rain) return;
    this.rain.visible = motion && highQuality;
    if (!this.rain.visible) return;
    for (let i = 0; i < 140; i++) {
      const y = ((random(i + 7) * 10 - time * 2.4) % 10 + 10) % 10 - 1;
      this.transform.position.set((random(i + 20) - .5) * 24, y, (random(i + 600) - .5) * 20);
      this.transform.scale.set(.012, .19 + random(i) * .22, .012); this.transform.rotation.z = -.15;
      this.transform.updateMatrix(); this.rain.setMatrixAt(i, this.transform.matrix);
    }
    this.rain.instanceMatrix.needsUpdate = true;
  }
}
