import { translateText } from './locale';
import { enamelInk, signFaces } from './sign-lettering';
import { EnvironmentArt } from './environment';
import { batchStaticBoxes } from './batching';
import { PulseRibbon } from './pulse-ribbon';
import { echoPosition } from './echo';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Simulation, type OpticalRoute } from './engine';
import { CommissionProps, probeRoute } from './commission-props';
import type { Cell, Level, Mirror } from './levels';
import { COATS, type Appearance } from './appearance';
import { CameraImpulse } from './feedback';
import { exitSignal, SIGNALS, visitLampRadius } from './exit-signal';

const C = { teal: 0x78f9d5, amber: 0xffba67, red: 0xff6872, blue: 0x6ecbff, dark: 0x142c32 };
const metal = (color: number, roughness = .5, metalness = .4) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const lit = (color: number, intensity = 1) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .35, metalness: .25 });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);

export class View {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(); composer: EffectComposer; bloom: UnrealBloomPass; dof: BokehPass;
  root = new THREE.Group(); dynamic = new THREE.Group(); player = new THREE.Group();
  mirrors = new Map<string, THREE.Group>(); receivers = new Map<string, THREE.Group>();
  pulseGroups = new Map<number, THREE.Group>();
  source = new THREE.Group(); exit = new THREE.Group(); ghost = new THREE.Group(); hintGhosts = new THREE.Group();
  trajectory?: THREE.LineSegments;
  private commissionProps?: CommissionProps;
  private drawnProbe?: OpticalRoute;
  private plates = new Map<string, THREE.Group>();
  private gates: THREE.Group[] = [];
  batching = { instances: 0, batches: 0, saved: 0 };
  private wells: THREE.Group[] = [];
  private art = new EnvironmentArt();
  private ribbon = new PulseRibbon();
  private echoVisuals: THREE.Group[] = [];
  private recordTrail?: THREE.Line; private recordPoints = 0;
  private legs: THREE.Group[] = []; private scarf = new THREE.Group();
  private recoveryGuard = new THREE.Group();
  private scarfCloth?: THREE.Mesh;
  private scarfRest?: Float32Array;
  private pulseLight = new THREE.PointLight(C.amber, 1.5, 3, 2);
  private dust?: THREE.Points; floor?: THREE.Mesh; level?: Level;
  private robotBody!: THREE.Group; private arms: THREE.Group[] = [];
  private helmet = new THREE.Group(); private badge = new THREE.Group();
  private coat = metal(COATS[0].color, .65, .2);
  private appearanceKey = '';
  private presentation = 'game'; private highQuality = true;
  private impulse = new CameraImpulse();
  private environmentTarget: THREE.WebGLRenderTarget;
  private target = new THREE.Vector3(0, -.1, 0);
  private sparks = new THREE.InstancedMesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0xf3c679 }), 48);
  private sparkState: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number }[] = [];
  private sparkTransform = new THREE.Object3D();
  private lastPlayer = new THREE.Vector2(); private targetYaw = 0;
  private clock = 0; private zoom = 1; private yaw = .54;
  tacticalView = false;
  private selection?: THREE.Mesh;
  private width = 1; private height = 1; private glowTexture: THREE.CanvasTexture;
  private deckTexture: THREE.CanvasTexture;
  private sourceLamp = lit(C.red, 1.4); private exitLamp = lit(C.teal, .3);
  private cyan = lit(C.teal, 1.1); private orange = lit(C.amber, 1);
  private bodyMat = metal(0x263e46); private frameMat = metal(0x14262c); private silver = metal(0xb5d0ce, .23, .78);
  private resizeHandler = () => this.resize();
  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.setAttribute('aria-label', '借火三维游戏场景'); container.append(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x15181b); this.scene.fog = new THREE.FogExp2(0x1b3035, .012);
    this.scene.add(new THREE.HemisphereLight(0xb5ebe4, 0x17272e, 2.1));
    const sun = new THREE.DirectionalLight(0xe4fff5, 3); sun.position.set(-5, 14, 7); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 10, bottom: -10, near: .5, far: 40 });
    sun.shadow.bias = -.0005; sun.shadow.normalBias = .035; this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x618aef, 1.4); fill.position.set(8, 4, -8); this.scene.add(fill);
    const environment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environmentTarget = pmrem.fromScene(environment, .04);
    this.scene.environment = this.environmentTarget.texture; this.scene.environmentIntensity = .35;
    environment.dispose(); pmrem.dispose();
    this.scene.add(this.root, this.dynamic, this.player, this.art.group, this.pulseLight, this.ribbon.mesh);
    this.sparks.count = 0; this.sparks.frustumCulled = false; this.scene.add(this.sparks);
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d')!, g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.15, '#ffffffaa'); g.addColorStop(.5, '#ffffff22'); g.addColorStop(1, '#ffffff00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); this.glowTexture = new THREE.CanvasTexture(c);
    this.deckTexture = this.makeDeckTexture();
    this.buildRobot();
    this.composer = new EffectComposer(this.renderer); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .25, .5, 1.1); this.composer.addPass(this.bloom);
    this.dof = new BokehPass(this.scene, this.camera, { focus: 26, aperture: .0016, maxblur: .009 });
    // Three's BokehShader defaults to perspective depth: our game camera is orthographic.
    this.dof.materialBokeh.defines.PERSPECTIVE_CAMERA = 0; this.dof.enabled = false;
    this.composer.addPass(this.dof); this.composer.addPass(new OutputPass());
    addEventListener('resize', this.resizeHandler); this.resize();
  }
  private makeDeckTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#b6c4c2'; ctx.fillRect(0, 0, 256, 256);
    let seed = 17;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    // Deterministic original brushed metal, scratches, bolts and painted service markings.
    for (let i = 0; i < 850; i++) {
      const shade = Math.floor(130 + random() * 90); ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.16)`;
      const x = random() * 256, y = random() * 256; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + random() * 48, y + random() * 2); ctx.stroke();
    }
    ctx.strokeStyle = '#566769'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, 236, 236);
    ctx.strokeStyle = '#e0e9d6'; ctx.lineWidth = 3;
    for (const x of [23, 233]) for (const y of [23, 233]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#e1e8d0'; ctx.fillRect(32, 218, 39, 4); ctx.fillRect(32, 228, 20, 3);
    ctx.font = `600 10px ${signFaces().instrument}`; ctx.fillText('HF / 07', 174, 232, 52);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy()); return texture;
  }
  private box(parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: THREE.Material) {
    const mesh = new THREE.Mesh(boxGeo, mat); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = sy > .15; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private ball(parent: THREE.Object3D, x: number, y: number, z: number, s: number, mat: THREE.Material) {
    const mesh = new THREE.Mesh(sphereGeo, mat); mesh.position.set(x, y, z); mesh.scale.setScalar(s); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  private ring(parent: THREE.Object3D, radius: number, y: number, mat: THREE.Material, tube = .025) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 40), mat); mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; parent.add(mesh); return mesh;
  }
  private glow(parent: THREE.Object3D, color: number, size: number, y = .25) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTexture, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .55 }));
    sprite.scale.set(size, size, size); sprite.position.y = y; parent.add(sprite); return sprite;
  }
  private at(c: Cell, y = 0) { return new THREE.Vector3(c.x - 6, y, c.y - 4); }
  private mirror(m: Mirror, ghost = false) {
    const g = new THREE.Group();
    const mat = ghost ? new THREE.MeshBasicMaterial({ color: C.teal, transparent: true, opacity: .25, wireframe: true }) : m.kind === 'prism' ? new THREE.MeshPhysicalMaterial({ color: C.amber, emissive: C.amber, emissiveIntensity: .18, metalness: .15, roughness: .2, transparent: true, opacity: .55, depthWrite: false }) : this.silver;
    this.box(g, 0, .11, 0, .7, .16, .7, ghost ? mat : this.bodyMat);
    const blade = this.box(g, 0, .48, 0, .83, .54, .075, mat); blade.rotation.y = m.slash ? Math.PI / 4 : -Math.PI / 4;
    const edge = this.box(blade, 0, .5, 0, .99, .035, 1.05, ghost ? mat : m.kind === 'prism' ? lit(C.amber, .8) : this.cyan); edge.castShadow = false;
    if (m.kind === 'prism') {
      const coldMat = ghost ? mat : new THREE.MeshPhysicalMaterial({ color: C.blue, emissive: C.blue, emissiveIntensity: .18, metalness: .15, roughness: .2, transparent: true, opacity: .55, depthWrite: false });
      const cold = this.box(g, 0, .48, 0, .83, .54, .04, coldMat); cold.rotation.y = -blade.rotation.y;
      const coldEdge = this.box(cold, 0, .5, 0, .99, .035, 1.05, ghost ? mat : lit(C.blue, .8)); coldEdge.castShadow = false;
      this.ring(g, .43, .22, ghost ? mat : this.silver, .015);
      this.ball(g, 0, .8, 0, .055, ghost ? mat : this.orange);
      g.userData.coldBlade = cold; g.userData.warmLamp = edge.material; g.userData.coldLamp = coldEdge.material;
    }
    if (m.fixed) for (const x of [-.24, .24]) for (const z of [-.24, .24]) this.ball(g, x, .22, z, .04, this.orange);
    g.userData.blade = blade; g.userData.kind = m.kind ?? 'mirror'; g.position.copy(this.at(m)); return g;
  }
  private clear(group: THREE.Group) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    group.traverse(o => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Sprite || o instanceof THREE.Points) {
        if (o.geometry && o.geometry !== boxGeo && o.geometry !== sphereGeo) geometries.add(o.geometry);
        if (o instanceof THREE.InstancedMesh) o.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of mats) if (![this.sourceLamp, this.exitLamp, this.cyan, this.orange, this.bodyMat, this.frameMat, this.silver].includes(mat)) materials.add(mat);
      }
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => { const map = (m as THREE.MeshBasicMaterial).map; if (map && map !== this.glowTexture && map !== this.deckTexture) map.dispose(); m.dispose(); }); group.clear();
  }
  load(level: Level) {
    if (this.commissionProps) {
      this.root.remove(this.commissionProps.group); this.commissionProps.dispose(); this.commissionProps = undefined;
    }
    this.drawnProbe = undefined;
    this.ribbon.reset();
    this.level = level; this.clear(this.root); this.clear(this.dynamic); this.mirrors.clear(); this.receivers.clear(); this.pulseGroups.clear();
    this.art.build(level); this.echoVisuals = []; this.recordTrail = undefined; this.recordPoints = 0;
    this.plates.clear(); this.gates = []; this.wells = []; this.sparkState = [];
    this.trajectory = undefined; this.lastPlayer.set(level.spawn.x, level.spawn.y); this.impulse.trauma = 0;
    const deck = new THREE.Shape(), w = 6.9, h = 4.9, rad = .45;
    deck.moveTo(-w + rad, -h); deck.lineTo(w - rad, -h); deck.quadraticCurveTo(w, -h, w, -h + rad);
    deck.lineTo(w, h - rad); deck.quadraticCurveTo(w, h, w - rad, h); deck.lineTo(-w + rad, h);
    deck.quadraticCurveTo(-w, h, -w, h - rad); deck.lineTo(-w, -h + rad); deck.quadraticCurveTo(-w, -h, -w + rad, -h);
    const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(deck, { depth: .45, bevelEnabled: true, bevelSize: .09, bevelThickness: .08, bevelSegments: 2, steps: 1 }), this.frameMat);
    slab.rotation.x = -Math.PI / 2; slab.position.y = -.62; slab.receiveShadow = true; slab.castShadow = true; this.root.add(slab);
    const palette = level.theme === 'garden' ? [0x354b42, 0x40584b, 0x78947c] : level.theme === 'foundry' ? [0x514238, 0x605043, 0xae8754] : level.theme === 'archive' ? [0x343b54, 0x404963, 0x8897bd] : [0x29444a, 0x30494e, 0x365057];
    const floorMat = metal(palette[0], .7, .25), altMat = metal(palette[1], .74, .25), seamMat = metal(palette[2], .7);
    floorMat.map = this.deckTexture; altMat.map = this.deckTexture;
    const borderMat = metal(0x30464c), darkMat = metal(0x101f26);
    for (let x = 0; x < level.width; x++) for (let y = 0; y < level.height; y++) {
      const wx = x - 6, wz = y - 4, border = x === 0 || y === 0 || x === level.width - 1 || y === level.height - 1;
      this.box(this.root, wx, -.12, wz, .988, .18, .988, border ? borderMat : (x + y) % 3 ? floorMat : altMat);
      if (border) {
        this.box(this.root, wx, .12, wz, .87, .27, .87, darkMat);
        if ((x + y) % 2 === 0) this.box(this.root, wx, .265, wz, .36, .012, .045, x === 0 || x === 12 ? this.orange : this.cyan);
      } else {
        this.box(this.root, wx - .33, -.02, wz - .34, .11, .012, .025, seamMat);
        this.box(this.root, wx + .33, -.02, wz + .34, .11, .012, .025, seamMat);
      }
    }
    for (const w of level.walls) {
      const g = new THREE.Group(); g.position.copy(this.at(w));
      this.box(g, 0, .42, 0, .94, .84, .94, this.bodyMat); this.box(g, 0, .88, 0, .82, .09, .82, borderMat);
      for (let i = 0; i < 3; i++) this.box(g, -.25 + i * .25, .94, 0, .08, .025, .6, darkMat);
      this.root.add(g);
    }
    this.source = new THREE.Group(); this.source.position.copy(this.at(level.source));
    this.box(this.source, 0, .18, 0, .72, .35, .72, this.bodyMat);
    const barrel = new THREE.Group(); barrel.rotation.y = -Math.atan2(level.source.dy, level.source.dx);
    this.box(barrel, .1, .5, 0, .66, .33, .4, this.silver); this.box(barrel, .44, .5, 0, .09, .24, .28, this.sourceLamp);
    this.source.add(barrel); this.ring(this.source, .48, .03, this.sourceLamp); this.root.add(this.source);
    this.exit = new THREE.Group(); this.exit.position.copy(this.at(level.exit));
    this.box(this.exit, 0, .02, 0, .85, .04, .85, this.bodyMat);
    this.ring(this.exit, .36, .06, this.exitLamp); this.ring(this.exit, .25, .07, this.exitLamp, .015);
    for (const x of [-.45, .45]) {
      this.box(this.exit, x, .6, 0, .09, 1.2, .16, this.silver); this.box(this.exit, x, .6, .1, .025, .9, .025, this.exitLamp);
    }
    this.box(this.exit, 0, 1.21, 0, .98, .1, .16, this.bodyMat);
    this.exit.userData.glow = this.glow(this.exit, C.teal, 1.8, .5); this.root.add(this.exit);
    const arm = new THREE.Group(); arm.position.set(-.32, 1.24, .12);
    const flag = lit(0x89736a, .06);
    this.box(arm, .25, 0, 0, .56, .09, .075, flag);
    this.box(arm, .47, 0, 0, .13, .165, .09, flag);
    this.box(arm, .387, 0, .005, .042, .11, .09, this.frameMat);
    this.ball(arm, 0, 0, .035, .068, this.silver);
    this.exit.add(arm); this.exit.userData.arm = arm; this.exit.userData.flag = flag;
    const doors: THREE.Mesh[] = [];
    for (const sign of [-1, 1]) {
      const door = this.box(this.exit, sign * .2, .58, 0, .38, 1.02, .055, metal(0x466966, .3, .7));
      this.box(door, sign * .36, 0, .7, .06, .9, .03, this.exitLamp);
      doors.push(door);
    }
    this.exit.userData.doors = doors;
    for (const r of level.receivers) {
      const g = new THREE.Group(); g.position.copy(this.at(r));
      const phaseColor = r.phase === 'cool' ? C.blue : r.phase === 'warm' ? C.amber : C.teal;
      const lamp = lit(phaseColor, .08); g.userData.lamp = lamp;
      this.box(g, 0, .04, 0, .84, .08, .84, this.frameMat);
      this.ring(g, .31, .12, lamp, .048); this.ring(g, .2, .12, this.silver, .012);
      // Physical gauge: outer marks show remaining reserve; inner marks show
      // repeated visits by the same pulse. Color is supplementary to geometry.
      const reserve: THREE.Mesh[] = [], visits: THREE.Mesh[] = [];
      for (let i = 0; i < 16; i++) {
        const angle = i / 16 * Math.PI * 2;
        const tick = this.box(g, Math.sin(angle) * .41, .105, Math.cos(angle) * .41, .025, .018, .065, lamp);
        tick.rotation.y = angle; tick.castShadow = false; reserve.push(tick);
      }
      for (let i = 0; i < level.repeats; i++) {
        const tick = this.ball(g, (i - (level.repeats - 1) / 2) * .135, .155, .205, visitLampRadius(false, 0, i), lamp); tick.castShadow = false; visits.push(tick);
      }
      g.userData.reserve = reserve; g.userData.visits = visits;
      for (let i = 0; i < 4; i++) {
        const bar = this.box(g, Math.cos(i * Math.PI / 2) * .38, .13, Math.sin(i * Math.PI / 2) * .38, .06, .025, .06, lamp); bar.castShadow = false;
      }
      const glow = this.glow(g, C.teal, 1.9, .12); g.userData.glow = glow;
      const rotor = new THREE.Group(); rotor.position.y = .15;
      for (let i = 0; i < 3; i++) { const vane = this.box(rotor, 0, 0, 0, .035, .025, .3, this.silver); vane.rotation.y = i * Math.PI / 3; }
      g.add(rotor); g.userData.rotor = rotor;
      if (r.phase) { const badge = this.box(g, 0, .2, 0, .16, .025, .16, lit(phaseColor, .7)); badge.rotation.y = r.phase === 'cool' ? Math.PI / 4 : 0; }
      this.receivers.set(r.id, g); this.root.add(g);
    }
    if (level.delay) {
      const g = new THREE.Group(); g.position.copy(this.at(level.delay));
      this.ring(g, .36, .14, this.orange, .05); this.ring(g, .22, .15, this.silver);
      this.box(g, 0, .06, 0, .85, .1, .85, this.bodyMat); this.root.add(g);
    }
    this.buildMechanisms(level);
    this.dressScene(level);
    if (level.commission) { this.commissionProps = new CommissionProps(level); this.root.add(this.commissionProps.group); }
    this.ghost = this.mirror({ id: 'ghost', x: 0, y: 0, slash: true }, true); this.dynamic.add(this.ghost);
    this.selection = this.ring(this.dynamic, .49, .035, new THREE.MeshBasicMaterial({ color: 0xe6cf9c, transparent: true, opacity: .65 }), .014);
    this.hintGhosts = new THREE.Group();
    for (const mirror of level.solution) if (!mirror.fixed) this.hintGhosts.add(this.mirror(mirror, true));
    this.dynamic.add(this.hintGhosts); this.hintGhosts.visible = false;
    // Underfloor pipes and light strips make the playfield read as a physical diorama.
    for (const z of [-4.65, 4.65]) {
      this.box(this.root, 0, -.35, z, 11, .045, .04, this.cyan);
      this.box(this.root, -5.6, -.35, z, .5, .045, .04, this.orange);
    }
    for (const x of [-5.5, 5.5]) this.box(this.root, x, -.9, 0, .3, .65, 6.2, this.bodyMat);
    this.batching = batchStaticBoxes(this.root, boxGeo);
  }
  /** Undo and scrub transitions change running objects, not rooftop scenery. */
  invalidatePlayback() {
    this.ribbon.reset();
    for (const g of [...this.mirrors.values(), ...this.pulseGroups.values(), ...this.echoVisuals]) { this.dynamic.remove(g); this.clear(g); }
    this.mirrors.clear(); this.pulseGroups.clear(); this.echoVisuals = [];
    if (this.recordTrail) { this.dynamic.remove(this.recordTrail); this.clearLine(this.recordTrail); this.recordTrail = undefined; }
    if (this.trajectory) { this.dynamic.remove(this.trajectory); this.clearLine(this.trajectory); this.trajectory = undefined; }
    this.recordPoints = 0; this.sparkState = [];
  }
  private label(parent: THREE.Group, text: string, color: string, y = .7) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = enamelInk; ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.strokeRect(3, 3, 122, 58);
    ctx.fillStyle = color; ctx.font = `700 38px ${signFaces().instrument}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(translateText(text), 64, 34, 108);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthWrite: false })); sprite.position.y = y; sprite.scale.set(.52, .26, 1); parent.add(sprite);
  }
  private buildMechanisms(level: Level) {
    for (const plate of level.plates ?? []) {
      const g = new THREE.Group(); g.position.copy(this.at(plate));
      this.box(g, 0, .015, 0, .88, .06, .88, this.frameMat);
      const top = this.box(g, 0, .09, 0, .66, .08, .66, lit(0xd8a35c, .2));
      g.userData.top = top; this.label(g, plate.id + (plate.echoOnly ? ' ◇' : ''), plate.echoOnly ? '#a2d3e9' : '#dfb377', .4);
      this.root.add(g); this.plates.set(plate.id, g);
    }
    for (const gate of level.gates ?? []) {
      const g = new THREE.Group(); g.position.copy(this.at(gate));
      for (const x of [-.4, .4]) this.box(g, x, .5, 0, .09, 1, .15, this.silver);
      const curtain = this.box(g, 0, .48, 0, .7, .85, .08, new THREE.MeshStandardMaterial({ color: C.red, emissive: C.red, emissiveIntensity: 1, transparent: true, opacity: .45 }));
      g.userData.curtain = curtain; g.userData.gate = gate;
      this.label(g, (gate.requires ?? [gate.plate]).join('+') + (gate.inverted ? '−' : '') + (gate.poweredBy ? ' ⟳' : ''), gate.inverted ? '#efab74' : '#dfb377', 1.15); this.root.add(g); this.gates.push(g);
      if (gate.poweredBy) {
        const receiver = level.receivers.find(r => r.id === gate.poweredBy)!;
        const a = this.at(receiver, .028), b = this.at(gate, .028);
        const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, new THREE.Vector3(b.x, .028, a.z), b]), new THREE.LineDashedMaterial({ color: C.teal, dashSize: .2, gapSize: .08, transparent: true, opacity: .55 }));
        wire.computeLineDistances(); this.root.add(wire);
      }
      for (const id of gate.requires ?? [gate.plate]) {
        const plate = level.plates!.find(p => p.id === id)!;
        const a = this.at(plate, .01), b = this.at(gate, .01);
        const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, new THREE.Vector3(a.x, .01, b.z), b]), new THREE.LineDashedMaterial({ color: 0xc99853, dashSize: .12, gapSize: .1, transparent: true, opacity: .5 }));
        wire.computeLineDistances(); this.root.add(wire);
      }
    }
    for (const pair of level.portals ?? []) for (const c of [pair.a, pair.b]) {
      const g = new THREE.Group(); g.position.copy(this.at(c));
      this.box(g, 0, .02, 0, .82, .08, .82, this.frameMat);
      this.ring(g, .34, .14, lit(0xb69cff, 1.3), .045);
      const halo = this.ring(g, .27, .32, lit(0xc4b2ff, .8), .02); halo.rotation.x = -.9;
      this.glow(g, 0x9a83f0, 1.1, .17); this.label(g, pair.id, '#c6b7ef', .82);
      this.root.add(g); this.wells.push(g);
    }
    for (const c of level.inverters ?? []) {
      const g = new THREE.Group(); g.position.copy(this.at(c));
      this.box(g, 0, .025, 0, .78, .08, .78, this.bodyMat);
      const left = this.box(g, -.14, .24, 0, .19, .3, .22, lit(C.amber, .8)); left.rotation.z = -.35;
      const right = this.box(g, .14, .24, 0, .19, .3, .22, lit(C.blue, .8)); right.rotation.z = .35;
      const diamond = this.box(g, 0, .48, 0, .17, .17, .07, this.silver); diamond.rotation.z = Math.PI / 4;
      this.root.add(g);
    }
  }
  private dressScene(level: Level) {
    // Peripheral scenery never alters the playable collision map.
    const theme = level.theme ?? (level.id < 3 ? 'archive' : level.id < 5 ? 'garden' : 'foundry');
    const accent = theme === 'garden' ? 0x8ba783 : theme === 'foundry' ? 0xd9a05d : 0x8d9fc7;
    const trim = metal(accent, .65, .35), dark = metal(0x20282c);
    for (const sign of [-1, 1]) for (let i = 0; i < 4; i++) {
      const x = sign * 6.7, z = -3 + i * 2;
      if (theme === 'garden') {
        this.box(this.root, x, -.02, z, .48, .35, 1.15, dark);
        for (let j = 0; j < 4; j++) {
          const leaf = this.box(this.root, x + Math.sin(j * 3.1) * .15, .27 + (j % 2) * .12, z - .35 + j * .23, .16, .46, .045, metal(j % 2 ? 0x769676 : 0x476b58, .9));
          leaf.rotation.z = Math.sin(j * 2 + i) * .55;
        }
      } else if (theme === 'foundry') {
        this.box(this.root, x, .1, z, .34, .65, .75, dark);
        for (const dz of [-.2, 0, .2]) this.box(this.root, x, .47, z + dz, .24, .025, .045, trim);
      } else {
        this.box(this.root, x, .08, z, .42, .5, .95, dark);
        for (let j = 0; j < 3; j++) this.box(this.root, x, .35 + j * .055, z, .37, .025, .8, j === 1 ? trim : this.silver);
      }
    }
    for (let i = 0; i < 5; i++) {
      this.box(this.root, -4.8 + i * 2.4, -.7, -5.05, 1.8, .12, .18, trim);
      this.box(this.root, -4.8 + i * 2.4, -.72, 5.05, 1.8, .08, .12, dark);
    }
    const positions = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) { positions[i * 3] = Math.sin(i * 127.1) * 7; positions[i * 3 + 1] = .5 + ((i * 73) % 101) / 40; positions[i * 3 + 2] = Math.cos(i * 311.7) * 5; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: accent, size: .025, transparent: true, opacity: .26, depthWrite: false })); this.root.add(this.dust);
    const light = new THREE.PointLight(accent, 9, 13, 2); light.position.set(-4, 3, -3); this.root.add(light);
  }
  private buildRobot() {
    this.robotBody = new THREE.Group(); this.player.add(this.robotBody);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.17, .23, .43, 10), this.coat); body.position.y = .42; body.castShadow = true; this.robotBody.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), this.coat); head.scale.set(.255, .2, .23); head.position.y = .76; head.castShadow = true; this.robotBody.add(head);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI), metal(0x112b34, .16, .6)); visor.scale.set(.215, .12, .225); visor.position.set(0, .77, -.045); visor.rotation.y = Math.PI; this.robotBody.add(visor);
    for (const x of [-.075, .075]) this.box(this.robotBody, x, .77, -.257, .05, .025, .015, this.cyan);
    const pack = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .33, 10), this.bodyMat); pack.position.set(0, .46, .23); this.robotBody.add(pack);
    this.box(this.robotBody, 0, .48, .36, .12, .13, .025, this.orange);
    for (const x of [-.25, .25]) {
      const arm = new THREE.Group(); arm.position.set(x, .54, 0);
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(.055, .12, 4, 8), this.coat); sleeve.position.y = -.09; sleeve.castShadow = true; arm.add(sleeve);
      this.ball(arm, 0, -.24, 0, .065, this.silver); this.robotBody.add(arm); this.arms.push(arm);
    }
    for (const x of [-.11, .11]) {
      const leg = new THREE.Group(); leg.position.set(x, .24, 0);
      this.box(leg, 0, -.1, -.035, .14, .19, .25, this.bodyMat); this.robotBody.add(leg); this.legs.push(leg);
    }
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(.24, .4, 4, 9), new THREE.MeshStandardMaterial({ color: 0xc8b88e, side: THREE.DoubleSide, roughness: .95 }));
    const positions = cloth.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) { const t = (.2 - positions.getY(i)) / .4; positions.setX(i, positions.getX(i) * (1 - t * .3)); }
    this.scarfCloth = cloth; this.scarfRest = new Float32Array(positions.array);
    cloth.position.set(-.13, -.12, .2); cloth.rotation.x = .4; this.scarf.position.set(0, .62, .12); this.scarf.add(cloth); this.robotBody.add(this.scarf);
    this.ring(this.player, .29, .025, this.orange, .012);
    const guardMaterial = new THREE.MeshBasicMaterial({ color: 0xb0dce1, side: THREE.DoubleSide });
    const guardArc = new THREE.RingGeometry(.36, .405, 16, 1, .27, Math.PI * .65);
    for (const angle of [0, Math.PI]) {
      const arc = new THREE.Mesh(guardArc, guardMaterial); arc.rotation.set(-Math.PI / 2, 0, angle);
      this.recoveryGuard.add(arc);
    }
    this.recoveryGuard.position.y = .046; this.recoveryGuard.visible = false; this.player.add(this.recoveryGuard);
    this.robotBody.add(this.helmet, this.badge);
  }
  private updateEchoes(sim: Simulation) {
    while (this.echoVisuals.length > sim.echoes.length) { const g = this.echoVisuals.pop()!; this.dynamic.remove(g); this.clear(g); }
    const positions = sim.echoPositions;
    sim.echoes.forEach((track, i) => {
      let g = this.echoVisuals[i];
      if (!g) {
        g = new THREE.Group(); const body = new THREE.Group(); g.userData.body = body;
        const mat = new THREE.MeshBasicMaterial({ color: 0x92d5ef, transparent: true, opacity: .38, depthWrite: false });
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(.15, .22, .35, 10), mat); shell.position.y = .45; body.add(shell);
        this.ball(body, 0, .77, 0, .22, mat);
        this.box(body, 0, .75, -.17, .3, .09, .07, mat);
        this.box(body, 0, .48, .21, .18, .26, .12, mat);
        const limbs: THREE.Group[] = [];
        for (const sign of [-1, 1]) {
          const leg = new THREE.Group(); leg.position.set(sign * .11, .24, 0); this.box(leg, 0, -.1, -.035, .14, .19, .25, mat); body.add(leg); limbs.push(leg);
          const arm = new THREE.Group(); arm.position.set(sign * .25, .54, 0); this.box(arm, 0, -.11, 0, .09, .23, .1, mat); body.add(arm); limbs.push(arm);
        }
        g.userData.limbs = limbs;
        this.ring(body, .32, .03, mat, .018); g.add(body);
        const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(track.points.map(p => this.at(p, .035))), new THREE.LineDashedMaterial({ color: 0x7bb5ce, transparent: true, opacity: .28, dashSize: .08, gapSize: .12 })); path.computeLineDistances(); g.add(path);
        this.label(body, String(i + 1), '#a2d3e9', 1.2); this.dynamic.add(g); this.echoVisuals.push(g);
      }
      const position = positions[i], body = g.userData.body as THREE.Group;
      const future = echoPosition({ ...track, time: track.time + .025 }), dx = future.x - position.x, dy = future.y - position.y;
      const moving = Math.hypot(dx, dy) > .002 && Math.hypot(dx, dy) < .2;
      body.position.copy(this.at(position)); if (moving) body.rotation.y = Math.atan2(-dx, -dy);
      (g.userData.limbs as THREE.Group[]).forEach((limb, j) => limb.rotation.x = moving ? Math.sin(track.time * 15 + (j === 1 || j === 2 ? Math.PI : 0)) * .32 : 0);
    });
    if (!sim.recording && this.recordTrail) { this.dynamic.remove(this.recordTrail); this.clearLine(this.recordTrail); this.recordTrail = undefined; this.recordPoints = 0; }
    if (sim.recording && sim.recording.points.length !== this.recordPoints) {
      if (this.recordTrail) { this.dynamic.remove(this.recordTrail); this.clearLine(this.recordTrail); }
      this.recordTrail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(sim.recording.points.map(p => this.at(p, .045))), new THREE.LineBasicMaterial({ color: 0xe9b17a, transparent: true, opacity: .8 }));
      this.dynamic.add(this.recordTrail); this.recordPoints = sim.recording.points.length;
    }
  }
  private clearLine(line: THREE.Line) { line.geometry.dispose(); (line.material as THREE.Material).dispose(); }
  setAppearance(value: Appearance) {
    const key = JSON.stringify(value); if (key === this.appearanceKey) return; this.appearanceKey = key;
    this.coat.color.setHex(COATS[value.coat].color); this.clear(this.helmet); this.clear(this.badge);
    if (value.helmet === 0) {
      this.box(this.helmet, 0, .89, -.03, .18, .09, .19, this.bodyMat);
      this.ball(this.helmet, 0, .9, -.13, .045, this.orange);
    } else if (value.helmet === 1) {
      this.box(this.helmet, .13, .98, .02, .025, .3, .025, this.silver);
      this.ball(this.helmet, .13, 1.14, .02, .042, this.cyan);
    } else for (const sign of [-1, 1]) this.box(this.helmet, sign * .255, .73, 0, .075, .24, .25, this.silver);
    if (value.badge === 0) for (const x of [-.045, .045]) this.box(this.badge, x, .43, -.15, .035, .12, .015, this.silver);
    else if (value.badge === 1) {
      this.box(this.badge, 0, .43, -.15, .035, .14, .015, this.silver); this.box(this.badge, 0, .43, -.16, .13, .035, .015, this.silver);
    } else for (const x of [-.065, 0, .065]) { const stripe = this.box(this.badge, x, .43, -.15, .025, .13, .015, this.silver); stripe.rotation.z = -.4; }
  }
  setPresentation(value: string) {
    if (value === this.presentation) return;
    this.presentation = value;
    this.target.set(value === 'menu' ? -3.6 : value === 'wardrobe' ? -1 : 0, value === 'wardrobe' ? .5 : -.1, 0);
    this.updateCamera();
  }
  setEffects(depthOfField: boolean, environment: boolean) {
    this.dof.enabled = depthOfField && this.highQuality;
    this.scene.environment = environment ? this.environmentTarget.texture : null;
  }
  project(cell: Cell, height = .7) {
    const v = this.at(cell, height).project(this.camera);
    return { x: (v.x * .5 + .5) * this.width, y: (-v.y * .5 + .5) * this.height };
  }
  capture() { this.composer.render(); return this.renderer.domElement.toDataURL('image/png'); }
  burst(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3 + this.clock;
      this.sparkState.push({ x: x - 6, y: .44, z: y - 4, vx: Math.cos(angle) * 1.3, vy: 1 + i * .1, vz: Math.sin(angle) * 1.3, life: .36 });
    }
    this.sparkState = this.sparkState.slice(-48);
  }
  resize() {
    this.width = innerWidth; this.height = innerHeight; this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height); this.updateCamera();
  }
  private updateCamera() {
    const aspect = this.width / this.height;
    const span = this.presentation === 'wardrobe' ? 3.7 : Math.max(13.7, 20 / aspect) / this.zoom;
    this.camera.left = -span * aspect / 2; this.camera.right = span * aspect / 2;
    this.camera.top = span / 2; this.camera.bottom = -span / 2; this.camera.near = .1; this.camera.far = 150;
    const tactical = this.tacticalView && this.presentation === 'game';
    this.camera.up.set(0, tactical ? 0 : 1, tactical ? -1 : 0);
    this.camera.position.set(this.target.x + (tactical ? 0 : Math.sin(this.yaw) * 18), this.target.y + (tactical ? 26 : 19.5), this.target.z + (tactical ? 0 : Math.cos(this.yaw) * 18));
    this.camera.lookAt(this.target); this.camera.updateProjectionMatrix();
  }
  orbit(delta: number) { this.tacticalView = false; this.yaw = THREE.MathUtils.clamp(this.yaw + delta, -.45, .9); this.updateCamera(); }
  toggleTactical() { this.tacticalView = !this.tacticalView; this.updateCamera(); }
  movement(dx: number, dy: number) { const yaw = this.tacticalView ? 0 : this.yaw; return { x: dx * Math.cos(yaw) + dy * Math.sin(yaw), y: -dx * Math.sin(yaw) + dy * Math.cos(yaw) }; }
  zoomBy(delta: number) { this.zoom = THREE.MathUtils.clamp(this.zoom + delta, .75, 1.3); this.updateCamera(); }
  resetCamera() { this.tacticalView = false; this.yaw = .54; this.zoom = 1; this.updateCamera(); }
  setQuality(high: boolean) { this.highQuality = high; this.renderer.setPixelRatio(high ? Math.min(devicePixelRatio, 1.5) : 1); this.bloom.enabled = high; this.resize(); }
  kick(strength = .65) { this.impulse.add(strength); }
  update(sim: Simulation, dt: number, observe: boolean, hint: boolean, menu = false, motion = true, probeIndex = 0) {
    this.clock += dt;
    this.art.group.visible = this.presentation !== 'wardrobe';
    if (this.art.group.visible) this.art.update(this.clock, motion, this.highQuality, sim.level.receivers.filter(r => sim.receivers[r.id].charge > 0).length / sim.level.receivers.length, sim.receivers, sim.elapsed);
    this.updateEchoes(sim);
    const wardrobe = this.presentation === 'wardrobe';
    this.root.visible = this.dynamic.visible = !wardrobe; this.player.scale.setScalar(wardrobe ? 1.6 : 1);
    if (wardrobe) this.player.position.set(1.3, 0, 0); else this.player.position.copy(this.at(sim.player));
    const moving = Math.hypot(this.lastPlayer.x - sim.player.x, this.lastPlayer.y - sim.player.y) > .001;
    this.lastPlayer.set(sim.player.x, sim.player.y);
    this.targetYaw = wardrobe ? -.35 + (motion ? Math.sin(this.clock * .35) * .45 : 0) : Math.atan2(-sim.facing.x, -sim.facing.y);
    this.robotBody.rotation.y += Math.atan2(Math.sin(this.targetYaw - this.robotBody.rotation.y), Math.cos(this.targetYaw - this.robotBody.rotation.y)) * Math.min(1, dt * 14);
    this.robotBody.position.y = moving && motion ? Math.sin(this.clock * 15) * .025 : 0;
    this.arms.forEach((a, i) => a.rotation.x = sim.carried && !wardrobe ? -1.1 : moving && motion && !wardrobe ? Math.sin(this.clock * 15 + i * Math.PI) * .4 : 0);
    this.legs.forEach((leg, i) => leg.rotation.x = moving && motion && !wardrobe ? Math.sin(this.clock * 15 + i * Math.PI) * .4 : 0);
    this.scarf.rotation.x = motion && !wardrobe ? Math.sin(this.clock * 4) * .05 + (moving ? -.2 : 0) : 0;
    if (this.scarfCloth && this.scarfRest) {
      const positions = this.scarfCloth.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const t = (.2 - this.scarfRest[i * 3 + 1]) / .4;
        positions.setZ(i, motion ? Math.sin(this.clock * (moving ? 8 : 2.2) - t * 3.5) * t * (moving ? .055 : .018) : 0);
      }
      positions.needsUpdate = true; this.scarfCloth.geometry.computeVertexNormals();
    }
    this.recoveryGuard.visible = !wardrobe && !menu && sim.invulnerable > 0;
    this.recoveryGuard.scale.setScalar(1 + Math.min(sim.invulnerable, .5) * .18);
    this.sparkState = this.sparkState.filter(s => s.life > 0);
    this.sparks.count = this.sparkState.length; this.sparks.visible = !wardrobe && motion;
    this.sparkState.forEach((s, i) => {
      s.life -= dt; s.vy -= dt * 5; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      this.sparkTransform.position.set(s.x, s.y, s.z); this.sparkTransform.scale.setScalar(Math.max(0, s.life) * .065);
      this.sparkTransform.updateMatrix(); this.sparks.setMatrixAt(i, this.sparkTransform.matrix);
    });
    this.sparks.instanceMatrix.needsUpdate = true;
    const live = new Set(sim.mirrors.map(m => m.id)); if (sim.carried) live.add(sim.carried.id);
    for (const [id, group] of this.mirrors) if (!live.has(id)) { this.dynamic.remove(group); this.clear(group); this.mirrors.delete(id); }
    for (const m of [...sim.mirrors, ...(sim.carried ? [sim.carried] : [])]) {
      let g = this.mirrors.get(m.id);
      if (!g) { g = this.mirror(m); this.dynamic.add(g); this.mirrors.set(m.id, g); }
      if (sim.carried?.id === m.id) g.position.copy(this.at({ x: sim.player.x + sim.facing.x * .4, y: sim.player.y + sim.facing.y * .4 }, .85));
      else g.position.copy(this.at(m));
      g.userData.blade.rotation.y = m.slash ? Math.PI / 4 : -Math.PI / 4;
      if (g.userData.coldBlade) {
        g.userData.coldBlade.rotation.y = -g.userData.blade.rotation.y;
        const nearby = sim.pulses.find(p => Math.hypot(p.x - m.x, p.y - m.y) < .9);
        (g.userData.warmLamp as THREE.MeshStandardMaterial).emissiveIntensity = nearby ? nearby.phase !== 'cool' ? 1.8 : .12 : .7;
        (g.userData.coldLamp as THREE.MeshStandardMaterial).emissiveIntensity = nearby ? nearby.phase === 'cool' ? 1.8 : .12 : .7;
      }
    }
    const near = sim.nearest;
    if (this.selection) { this.selection.visible = !!near && !sim.carried && !menu; if (near) { this.selection.position.copy(this.at(near === 'source' ? sim.level.source : near, .035)); this.selection.rotation.x = -Math.PI / 2; } }
    if (sim.carried && this.ghost.userData.kind !== (sim.carried.kind ?? 'mirror')) { this.dynamic.remove(this.ghost); this.clear(this.ghost); this.ghost = this.mirror(sim.carried, true); this.dynamic.add(this.ghost); }
    this.ghost.visible = !!sim.carried && !menu;
    if (sim.carried) {
      this.ghost.position.copy(this.at(sim.targetCell)); this.ghost.userData.blade.rotation.y = sim.carried.slash ? Math.PI / 4 : -Math.PI / 4;
      if (this.ghost.userData.coldBlade) this.ghost.userData.coldBlade.rotation.y = -this.ghost.userData.blade.rotation.y;
      this.ghost.traverse(o => { if (o instanceof THREE.Mesh) (o.material as THREE.MeshBasicMaterial).color.setHex(sim.validCell(sim.targetCell) ? C.teal : C.red); });
    }
    this.hintGhosts.visible = hint && !menu;
    for (const r of sim.level.receivers) {
      const g = this.receivers.get(r.id)!, s = sim.receivers[r.id], lamp = g.userData.lamp as THREE.MeshStandardMaterial;
      lamp.emissiveIntensity = s.charge > 0 ? .7 + s.charge / r.ttl : .08;
      const phaseColor = r.phase === 'cool' ? C.blue : r.phase === 'warm' ? C.amber : C.teal;
      lamp.emissive.setHex(phaseColor); lamp.color.setHex(s.charge > 0 || r.phase ? phaseColor : 0x35666b);
      (g.userData.glow as THREE.Sprite).visible = s.charge > 0;
      ((g.userData.glow as THREE.Sprite).material as THREE.SpriteMaterial).color.setHex(phaseColor);
      if (s.charge > 0 && motion) (g.userData.rotor as THREE.Group).rotation.y += dt * 2.2;
      (g.userData.reserve as THREE.Mesh[]).forEach((tick, i) => tick.visible = i < Math.ceil(s.charge / r.ttl * 16));
      (g.userData.visits as THREE.Mesh[]).forEach((tick, i) => tick.scale.setScalar(visitLampRadius(s.charge > 0, s.hits, i)));
    }
    this.sourceLamp.color.setHex(sim.sourceOn ? C.red : C.blue); this.sourceLamp.emissive.setHex(sim.sourceOn ? C.red : C.blue);
    this.sourceLamp.emissiveIntensity = sim.sourceOn ? 1.2 : .2;
    this.exitLamp.emissiveIntensity = sim.exitOpen ? 2 : .12;
    const signal = exitSignal(sim);
    if (this.exit.userData.signal !== signal) {
      const pose = SIGNALS[signal], flag = this.exit.userData.flag as THREE.MeshStandardMaterial;
      const arm = this.exit.userData.arm as THREE.Group;
      arm.rotation.z = pose.angle;
      // Lifting also turns the blade away from the threshold in the overhead view.
      arm.rotation.y = -pose.angle * .55; arm.rotation.order = 'ZYX';
      flag.color.setHex(pose.color); flag.emissive.setHex(pose.color); flag.emissiveIntensity = pose.light;
      (this.exit.userData.glow as THREE.Sprite).visible = signal === 'clear';
      this.exit.userData.signal = signal;
    }
    (this.exit.userData.doors as THREE.Mesh[]).forEach((door, i) => {
      const target = (i === 0 ? -1 : 1) * (sim.exitOpen ? .52 : .2);
      door.position.x += (target - door.position.x) * Math.min(1, dt * 6);
    });
    const pulseIds = new Set(sim.pulses.map(p => p.id));
    for (const [id, g] of this.pulseGroups) if (!pulseIds.has(id)) { this.dynamic.remove(g); this.clear(g); this.pulseGroups.delete(id); }
    for (const p of sim.pulses) {
      let g = this.pulseGroups.get(p.id);
      if (!g) {
        g = new THREE.Group(); this.ball(g, 0, .43, 0, .085, lit(0xffedc4, 3)); this.glow(g, C.amber, 1.2, .43);
        const trail = this.box(g, 0, .43, 0, .35, .035, .035, lit(C.amber, .8)); g.userData.trail = trail;
        this.dynamic.add(g); this.pulseGroups.set(p.id, g);
      }
      const phaseColor = p.phase === 'cool' ? C.blue : C.amber;
      const core = g.children[0] as THREE.Mesh; const coreMat = core.material as THREE.MeshStandardMaterial;
      coreMat.color.setHex(phaseColor); coreMat.emissive.setHex(phaseColor);
      ((g.children[1] as THREE.Sprite).material as THREE.SpriteMaterial).color.setHex(phaseColor);
      g.position.copy(this.at(p)); const trail = g.userData.trail as THREE.Mesh;
      (trail.material as THREE.MeshStandardMaterial).color.setHex(phaseColor); (trail.material as THREE.MeshStandardMaterial).emissive.setHex(phaseColor);
      trail.rotation.y = -Math.atan2(p.dy, p.dx); trail.position.x = -p.dx * .19; trail.position.z = -p.dy * .19;
      g.scale.setScalar(p.wait > 0 && motion ? 1 + Math.sin(this.clock * 9) * .15 : 1);
    }
    const selected = sim.level.commission && observe && !menu ? probeRoute(sim, probeIndex) : undefined;
    this.commissionProps?.select(selected ? probeIndex : undefined);
    if (this.trajectory && (!observe || menu || selected !== this.drawnProbe)) { this.dynamic.remove(this.trajectory); this.trajectory.geometry.dispose(); (this.trajectory.material as THREE.Material).dispose(); this.trajectory = undefined; }
    if (observe && !menu && !this.trajectory) {
      this.drawnProbe = selected;
      const route = (selected ?? sim.opticalRoute()).points, points: THREE.Vector3[] = [], colors: number[] = [];
      const pathHeight = selected ? .38 : .16;
      for (let i = 1; i < route.length; i++) if (!route[i].jump) {
        points.push(this.at(route[i - 1], pathHeight), this.at(route[i], pathHeight));
        const color = new THREE.Color(route[i - 1].phase === 'cool' ? C.blue : C.amber); colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      this.trajectory = new THREE.LineSegments(geometry, new THREE.LineDashedMaterial({ vertexColors: true, dashSize: .14, gapSize: .12, transparent: true, opacity: .7 }));
      this.trajectory.computeLineDistances(); this.dynamic.add(this.trajectory);
    }
    for (const [id, g] of this.plates) {
      const top = g.userData.top as THREE.Mesh; const active = sim.plateActive(id);
      top.position.y = active ? .04 : .09;
      (top.material as THREE.MeshStandardMaterial).emissiveIntensity = active ? 1.1 : .2;
    }
    for (const g of this.gates) {
      const curtain = g.userData.curtain as THREE.Mesh, gate = g.userData.gate;
      curtain.scale.y = sim.gateOpen(gate) ? .025 : 1;
      (curtain.material as THREE.MeshStandardMaterial).color.setHex(gate.inverted ? C.amber : C.red);
      (curtain.material as THREE.MeshStandardMaterial).emissive.setHex(gate.inverted ? C.amber : C.red);
    }
    const pulse = sim.pulses[0]; this.pulseLight.intensity = pulse && !wardrobe ? 1.5 : 0;
    this.ribbon.update(pulse, sim.elapsed, motion && !wardrobe && !observe);
    if (pulse) { this.pulseLight.position.copy(this.at(pulse, .55)); this.pulseLight.color.setHex(pulse.phase === 'cool' ? C.blue : C.amber); }
    if (motion) this.wells.forEach((g, i) => { (g.children[2] as THREE.Mesh).rotation.z = this.clock * .65 * (i % 2 ? -1 : 1); });
    if (this.dust) { this.dust.visible = motion; if (motion) this.dust.position.y = Math.sin(this.clock * .16) * .15; }
    const offset = this.impulse.sample(dt, !motion || menu || wardrobe);
    if (this.impulse.trauma > 0) this.camera.setViewOffset(this.width, this.height, offset.x, offset.y, this.width, this.height);
    else this.camera.clearViewOffset();
    if (this.dof.enabled) {
      this.camera.updateMatrixWorld();
      const focus = (wardrobe ? new THREE.Vector3(1.3, .7, 0) : this.at(sim.player, .45)).applyMatrix4(this.camera.matrixWorldInverse);
      this.dof.materialBokeh.uniforms.focus.value = -focus.z;
    }
    this.composer.render();
  }
}
