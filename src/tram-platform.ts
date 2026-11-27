import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Simulation } from './engine';
import { exitSignal, SIGNALS } from './exit-signal';
import { signFaces } from './sign-lettering';

const ink = 0x273737, cream = 0xe1ce9e, rail = 0x79817a, wood = 0x925b40;
const green = 0x396359, red = 0x97463b, brass = 0xb19a6b;
const box = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);

// The baked enamel, metal trim and upholstery share a vertex-coloured mesh.
// Moving parts are built in local coordinates so each part still needs only one draw.
class Bodywork {
  private parts: THREE.BufferGeometry[] = [];
  constructor(private finish: THREE.Material) {}
  shape(template: THREE.BufferGeometry, color: number, x: number, y: number, z: number,
    sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const part = template.index ? template.toNonIndexed() : template.clone();
    part.deleteAttribute('uv');
    const basis = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
    basis.scale(new THREE.Vector3(sx, sy, sz)); basis.setPosition(x,y,z);
    part.applyMatrix4(basis);
    const rgb = new THREE.Color(color), count = part.getAttribute('position').count;
    const paint = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) rgb.toArray(paint, i * 3);
    part.setAttribute('color', new THREE.BufferAttribute(paint, 3));
    this.parts.push(part);
  }
  block(color: number, x: number, y: number, z: number, w: number, h: number, d: number, angle = 0) {
    this.shape(box, color, x,y,z,w,h,d,0,0,angle);
  }
  wheel(color: number, x: number, y: number, z: number, radius: number, width: number) {
    this.shape(cylinder, color, x,y,z,radius,width,radius,Math.PI/2);
  }
  // Chamfered ends leave room for a distinct motorman's cab at either end.
  band(color: number, length: number, width: number, bottom: number, height: number, taper: number) {
    const x = length / 2, z = width / 2, d = taper;
    const outline = new THREE.Shape();
    outline.moveTo(-x+d, -z); outline.lineTo(x-d, -z); outline.lineTo(x,-z+d);
    outline.lineTo(x,z-d); outline.lineTo(x-d,z); outline.lineTo(-x+d,z);
    outline.lineTo(-x,z-d); outline.lineTo(-x,-z+d); outline.closePath();
    const geometry = new THREE.ExtrudeGeometry(outline, {depth:height, bevelEnabled:false});
    this.shape(geometry,color,0,bottom,0,1,1,1,-Math.PI/2);
    geometry.dispose();
  }
  mesh(name: string) {
    const geometry = mergeGeometries(this.parts)!;
    this.parts.forEach(part => part.dispose()); this.parts.length = 0;
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, this.finish);
    mesh.name = name; mesh.receiveShadow = true;
    return mesh;
  }
}

class Lamp {
  readonly material = new THREE.MeshBasicMaterial();
  private panels: THREE.Matrix4[] = [];
  constructor(private lit: number, private unlit = 0x304444) { this.switch(false); }
  switch(on: boolean) { this.material.color.setHex(on ? this.lit : this.unlit); }
  pane(x: number, y: number, z: number, w: number, h: number, d: number) {
    this.panels.push(new THREE.Matrix4().makeScale(w,h,d).setPosition(x,y,z));
  }
  mount(parent: THREE.Group, name: string) {
    const panes = new THREE.InstancedMesh(box.clone(), this.material, this.panels.length);
    this.panels.forEach((matrix,i) => panes.setMatrixAt(i,matrix));
    panes.name = name; panes.computeBoundingSphere(); parent.add(panes);
    this.panels.length = 0;
  }
}

export class TramPlatform {
  readonly group = new THREE.Group();
  private carriage = new THREE.Group();
  private finish = new THREE.MeshStandardMaterial({vertexColors:true, metalness:.23, roughness:.66});
  private cabin = new Lamp(0xffdc96, 0x455959);
  private tail = new Lamp(0xff5f42, 0x633b32);
  private nearLamp: Lamp;
  private farLamp: Lamp;
  private doors: THREE.Mesh[] = [];
  private collector: THREE.Mesh;
  private arm: THREE.Mesh;
  private departureTime?: number;
  readonly nameplate: THREE.CanvasTexture;

  constructor(private stop: number, stationName: string, createCanvas: () => HTMLCanvasElement) {
    this.group.name = 'tram-platform';
    this.nearLamp = new Lamp(stop === 0 ? 0xffd494 : 0xf1d9a2);
    this.farLamp = new Lamp(stop === 0 ? 0x95deed : 0xc7ead3);
    this.group.add(this.carriage); this.carriage.name = 'route-seven-car';
    this.carriage.position.set(.45,-.24,-7.24);
    this.buildCoach();
    const bow = new Bodywork(this.finish);
    for (const z of [-.27,.27]) {
      bow.block(ink,-.3,.2,z,.72,.055,.055,-.55);
      bow.block(rail,.3,.2,z,.72,.055,.055,.55);
      bow.block(ink,-.3,.57,z,.72,.045,.055,.55);
      bow.block(rail,.3,.57,z,.72,.045,.055,-.55);
    }
    bow.block(ink,0,.76,0,.09,.05,.84);
    this.collector = bow.mesh('current-collector'); this.collector.position.set(.6,2.07,0); this.carriage.add(this.collector);
    this.buildStation();
    const canvas = createCanvas(); canvas.width = 768; canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(0,0,768,160);
    ctx.fillStyle = '#843d30'; ctx.fillRect(0,0,164,160);
    ctx.fillStyle = '#fff2ce'; ctx.font = `bold 96px ${signFaces().instrument}`; ctx.textAlign = 'center';
    ctx.fillText('07',82,112,136);
    ctx.fillStyle = '#243631'; ctx.font = `bold 88px ${signFaces().title}`; ctx.fillText(stationName,463,115,560);
    this.nameplate = new THREE.CanvasTexture(canvas); this.nameplate.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6,.54), new THREE.MeshBasicMaterial({map:this.nameplate}));
    sign.position.set(-4.85,1.75,-5.52); this.group.add(sign);
    this.cabin.mount(this.carriage, 'reading-lamps'); this.tail.mount(this.carriage, 'tail-lamps');
    this.nearLamp.mount(this.group, 'first-platform-lamp'); this.farLamp.mount(this.group, 'second-platform-lamp');
    const signal = new Bodywork(this.finish);
    signal.block(stop === 2 ? red : green,.32,0,0,.79,.15,.08);
    signal.block(cream,.53,0,.004,.13,.15,.09);
    this.arm = signal.mesh('platform-semaphore');
    this.arm.position.set(4.6,1.9,-5.78); this.group.add(this.arm);
  }

  private buildCoach() {
    const car = new Bodywork(this.finish);
    car.band(ink,8.42,1.56,.27,.24,.22);
    car.band(green,8.38,1.63,.48,.55,.25);
    car.band(brass,8.4,1.65,.99,.05,.25);
    car.band(cream,8.38,1.63,1.04,.71,.25);
    car.band(green,8.38,1.65,1.75,.1,.25);
    car.band(ink,8.60,1.85,1.85,.1,.3);
    car.band(0x939789,8.45,1.77,1.95,.105,.33);
    car.band(0xb5b5a4,8.13,1.48,2.055,.048,.34);
    for (const side of [-1,1]) {
      for (const x of [-3.43,-2.68,-1.93,-1.18,1.18,1.93,2.68,3.43]) {
        car.block(ink,x,1.41,side*.82,.69,.57,.025);
        this.cabin.pane(x,1.4,side*.838,.604,.46,.025);
        car.block(cream,x,1.53,side*.86,.63,.03,.03);
        car.block(brass,x,.76,side*.82,.63,.035,.03);
      }
      car.block(ink,0,1.10,side*.825,1.18,1.29,.025);
      car.block(wood,0,.40,side*.85,1.34,.13,.24);
      for (const x of [-3.04,-2.36,2.36,3.04]) {
        car.wheel(ink,x,.26,side*.68,.28,.18);
        car.wheel(rail,x,.26,side*.78,.13,.04);
      }
    }
    for (const end of [-1,1]) {
      car.block(ink,end*4.19,1.4,0,.04,.59,1.05);
      car.block(0x73918c,end*4.219,1.40,0,.025,.47,.94);
      car.block(cream,end*4.242,1.40,0,.03,.54,.046);
      car.block(ink,end*4.22,.51,0,.12,.15,.94);
      this.tail.pane(end*4.236,.79,.28,.045,.108,.12);
      this.tail.pane(end*4.236,.79,-.28,.045,.108,.12);
    }
    for (const x of [-2.8,-2.5,-2.2,2.2,2.5,2.8]) car.block(rail,x,2.13,-.1,.12,.08,.66);
    this.carriage.add(car.mesh('coach-body'));
    for (const sign of [-1,1]) {
      const leaf = new Bodywork(this.finish);
      leaf.block(red,0,1.105,.86,.54,1.25,.068);
      leaf.block(cream,0,1.42,.903,.45,.53,.033);
      leaf.block(0x657977,0,1.42,.933,.37,.44,.025);
      leaf.block(brass,sign*-.18,.986,.93,.036,.16,.046);
      leaf.block(wood,0,.81,.901,.41,.28,.025);
      const mesh = leaf.mesh(sign < 0 ? 'left-door' : 'right-door');
      mesh.position.x = sign*.28; this.doors.push(mesh); this.carriage.add(mesh);
    }
  }

  private buildStation() {
    const set = new Bodywork(this.finish);
    set.block(0x384246,0,-.61,-7.24,25,.46,2.5);
    for (let x=-12; x<=12; x+=.62) set.block(wood,x,-.33,-7.24,.16,.1,1.88);
    for (const z of [-7.89,-6.59]) set.block(rail,0,-.22,z,25,.11,.075);
    set.block(0x56605a,0,-.37,-5.61,14,.86,1.28);
    set.block(cream,0,.09,-6.17,14,.085,.12);
    for(let x=-6.7;x<7;x+=.65) set.block(0xb3a68d,x,.07,-5.64,.025,.035,1.10);
    // The single overhead conductor meets the diamond collector on its contact bar.
    for (const x of [-5.95,5.92]) {
      set.block(ink,x,1.35,-8.75,.105,3.44,.105);
      set.block(rail,x,2.7,-8.04,.07,.07,1.64);
    }
    set.block(ink,0,2.65,-7.24,27,.027,.027);
    for (const x of [-5.96,-3.77]) set.block(ink,x,.88,-5.59,.065,1.76,.065);
    set.block(ink,-4.85,1.75,-5.57,2.69,.63,.07);
    set.block(ink,4.6,.98,-5.8,.145,2.04,.14);
    if (this.stop === 0) {
      // Two separate pools of lamplight belong to the two waiting benches.
      for (const x of [-3.1,1.8]) {
        for (const leg of [-.52,.52]) set.block(ink,x+leg,.22,-5.68,.11,.31,.33);
        set.block(wood,x,.42,-5.68,1.42,.1,.38);
        set.block(wood,x,.66,-5.87,1.42,.25,.08);
        set.block(ink,x-.87,.89,-5.91,.08,1.66,.08);
        set.block(ink,x-.66,1.74,-5.91,.48,.08,.10);
        set.block(green,x-.45,1.72,-5.91,.36,.1,.33);
        (x < 0 ? this.nearLamp : this.farLamp).pane(x-.45,1.63,-5.91,.25,.1,.21);
      }
      // Corrugated shelter on the wet side of the platform. Two kerosene tins
      // on a shoulder pole recur beside the folding door at the next stop.
      for (const x of [-1.08,1.25]) set.block(green,x,1.08,-5.98,.081,2,.081);
      set.block(0x5d746e,.13,2.08,-5.86,3.05,.095,.84);
      for(let x=-1.34;x<1.6;x+=.24) set.block(rail,x,2.14,-5.86,.038,.023,.84);
    } else if (this.stop === 1) {
      set.block(green,-3.2,.60,-5.82,1.35,1.02,.48);
      set.block(cream,-3.2,1.20,-5.82,1.48,.19,.62);
      set.block(ink,-3.21,1.42,-5.8,1.11,.27,.42);
      this.nearLamp.pane(-3.5,1.45,-5.57,.24,.11,.035);
      this.farLamp.pane(-3.03,1.45,-5.57,.24,.11,.035);
      for (const x of [-3.6,-2.82]) set.block(brass,x,.78,-5.55,.19,.07,.035);
      set.block(brass,-2.63,1.44,-5.81,.065,.34,.065,-.28);
    } else {
      // The signal gantry and insulated cut-out occupy the last stop.
      set.block(ink,4.60,2.27,-6.61,.105,.13,2.1);
      set.block(rail,4.6,1.66,-7.59,.06,1.3,.07);
      set.block(ink,4.6,1.28,-7.59,.34,.62,.17);
      this.nearLamp.pane(4.60,1.44,-7.49,.145,.13,.04);
      this.farLamp.pane(4.60,1.19,-7.49,.145,.13,.04);
      set.block(wood,-3.2,.55,-5.83,.96,.9,.56);
      for(const x of [-3.45,-3.0]) {
        set.block(cream,x,1.19,-5.83,.12,.37,.12);
        set.block(ink,x,1.41,-5.83,.18,.1,.18);
      }
    }
    if (this.stop < 2) {
      const stand = this.stop === 0 ? -.16 : .68;
      for (const delta of [-.37,.37]) {
        set.shape(cylinder, 0xa58463, stand+delta,.27,-5.5,.152,.34,.152);
        set.shape(cylinder, cream, stand+delta,.45,-5.5,.157,.032,.157);
        set.block(ink,stand+delta,.54,-5.50,.026,.16,.024);
      }
      set.block(wood,stand,.64,-5.5,1.01,.042,.044);
    }
    this.group.add(set.mesh('street-platform'));
  }

  update(sim: Simulation, motion: boolean, clock: number) {
    const lit = (id: string) => (sim.receivers[id]?.charge ?? 0) > 0;
    const cabinOn = this.stop === 0 ? lit('amber') : this.stop === 1 ? lit('latch') : lit('roof');
    const secondOn = this.stop === 0 ? lit('blue') : this.stop === 1 ? lit('door') : lit('tail');
    this.nearLamp.switch(cabinOn); this.farLamp.switch(secondOn);
    this.cabin.switch(cabinOn); this.tail.switch(secondOn && this.stop === 2);
    this.collector.scale.y = this.stop === 2 && !sim.sourceOn ? .27 : 1;
    const open = this.stop === 1 && sim.exitOpen, gap = open ? .81 : .28;
    this.doors[0].position.x = -gap; this.doors[1].position.x = gap;
    this.arm.rotation.z = SIGNALS[exitSignal(sim)].angle;
    if (this.stop === 2 && sim.won) {
      this.departureTime ??= clock;
      const t = Math.min(4, Math.max(0,clock-this.departureTime));
      this.carriage.position.x = motion ? .45+1.45*t*t : .45;
      this.carriage.visible = motion ? t<4 : false;
    } else {
      this.departureTime = undefined; this.carriage.visible = true; this.carriage.position.x = .45;
    }
  }
}
