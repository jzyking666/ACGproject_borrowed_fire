import * as THREE from 'three';
import type { Level, Receiver } from './levels';
import type { ReceiverState } from './engine';

type Theme = NonNullable<Level['theme']>;
type Point = [number, number];
type Color = number;
export const receiverState = (reading: ReceiverState | undefined, repeats: number) =>
  !reading || reading.charge <= 0 ? 'dark' : reading.hits < repeats ? 'lit' : 'running';

const charcoal = 0x202e30, ink = 0x354643, brass = 0xa49370, paper = 0xe9d7ad;

/** Opaque cut-paper shapes at successive depths, submitted as one vertex-coloured mesh. */
class Cutout {
  private positions: number[] = [];
  private colors: number[] = [];
  private depth = 0;
  polygon(points: Point[], color: Color) {
    const vertices = points.map(([x, y]) => new THREE.Vector2(x, y));
    const fill = new THREE.Color(color);
    for (const face of THREE.ShapeUtils.triangulateShape(vertices, [])) {
      for (const i of face) {
        this.positions.push(vertices[i].x, vertices[i].y, this.depth);
        this.colors.push(fill.r, fill.g, fill.b);
      }
    }
    this.depth += .001;
  }
  rect(x: number, y: number, width: number, height: number, color: Color) {
    this.polygon([[x,y], [x+width,y], [x+width,y+height], [x,y+height]], color);
  }
  disk(x: number, y: number, radius: number, color: Color, sides = 18) {
    const points: Point[] = [];
    for (let i = 0; i < sides; i++) {
      const a = 2 * Math.PI * i / sides; points.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
    }
    this.polygon(points, color);
  }
  stroke(a: Point, b: Point, width: number, color: Color) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = -(b[1] - a[1]) / length * width / 2, dy = (b[0] - a[0]) / length * width / 2;
    this.polygon([[a[0]+dx,a[1]+dy], [b[0]+dx,b[1]+dy], [b[0]-dx,b[1]-dy], [a[0]-dx,a[1]-dy]], color);
  }
  mesh(material: THREE.MeshBasicMaterial) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.computeBoundingSphere();
    return new THREE.Mesh(geometry, material);
  }
}

function archiveInterior(scene: Cutout) {
  // Stacked ledgers and a swing-arm lamp over the platen of a little letterpress.
  scene.polygon([[-.78,.22],[-.59,.27],[-.27,-.24],[-1.06,-.24]],0xc8c5a4);
  scene.rect(.74,.18,.16,.23,0x7f8981);
  scene.rect(.762,.15,.18,.23,paper); scene.rect(.79,.29,.12,.015,brass);
  scene.rect(.79,.245,.08,.012,brass); scene.disk(.846,.372,.012,charcoal,8);
  scene.rect(-1.21, -.37, 2.42, .08, charcoal);
  for (let i = 0; i < 5; i++) {
    const y = -.285 + i * .047, x = -.98 + Math.sin(i * 3) * .06, width = .45 - i % 3 * .055;
    scene.rect(x, y, width, .044, i % 2 ? 0x715d49 : 0x606e62);
    scene.rect(x + .025, y + .012, width - .045, .019, paper);
  }
  scene.stroke([-.82, -.28], [-1, .21], .032, charcoal);
  scene.stroke([-1, .21], [-.77, .38], .032, charcoal);
  scene.disk(-1, .21, .04, brass);
  scene.polygon([[-.82,.37],[-.72,.4],[-.59,.27],[-.79,.21]], charcoal);
  scene.stroke([-.79,.21],[-.59,.27],.027,paper);
  scene.rect(-.18,-.29,.95,.092,ink);
  scene.polygon([[.52,-.22],[.51,.115],[.12,.115],[.12,.269],[.52,.269],[.68,.142],[.69,-.22]],ink);
  scene.rect(.47,.135,.158,.044,brass);
  scene.rect(-.12,-.175,.56,.055,charcoal);
  scene.rect(-.14,-.175,.57,.024,paper);
}
function pressSlip(material: THREE.MeshBasicMaterial) {
  const cut = new Cutout();
  cut.polygon([[0,0],[.32,0],[.455,-.055],[.49,-.18],[.4,-.105],[.3,-.064],[0,-.058]],paper);
  cut.rect(.052,-.021,.109,.012,brass); cut.rect(.2,-.022,.082,.012,brass);
  const slip = cut.mesh(material); slip.position.set(.425,-.15,.09); slip.name = 'printed-slip';
  return slip;
}
function pumpInterior(scene: Cutout) {
  // Inlet bends, a ribbed pump casing and a pressure dial.
  for (let i = 0; i < 4; i++) scene.rect(.47,.38-i*.044,.37,.016,0x997e61);
  scene.rect(.68,-.13,.115,.095,paper);
  scene.stroke([.789,-.062],[.831,-.068],.012,paper); scene.stroke([.831,-.068],[.815,-.104],.012,paper);
  scene.rect(-1.2,-.33,2.4,.07,charcoal);
  scene.rect(-1.18,-.12,.56,.11,ink); scene.rect(-.86,-.09,.12,.46,ink);
  scene.rect(-1.15,.33,.41,.1,ink); scene.rect(-.97,.29,.045,.18,brass);
  scene.polygon([[-.76,-.27],[-.71,-.01],[-.52,.15],[-.34,.14],[-.22,.01],[-.2,-.27]],charcoal);
  for (let i = 0; i < 5; i++) scene.stroke([-.66 + .09 * i,-.2],[-.64 + .09 * i,-.04],.023, brass);
  scene.stroke([-.5,-.02],[-.5,.27],.049,ink);
  scene.disk(-.5,.32,.139,charcoal); scene.disk(-.5,.32,.1,paper);
  scene.stroke([-.5,.32],[-.45,.37],.017,charcoal);
  scene.rect(-.28,-.15,.92,.08,ink); scene.rect(.5,-.21,.55,.08,ink); scene.rect(.91,-.21,.08,.32,ink);
  scene.rect(.84,.08,.24,.058,brass);
}
function gardenInterior(scene: Cutout) {
  // Propagation bench, a tray of seed tags and a copper watering can.
  scene.stroke([-1.2,.06],[-.35,.5],.025,0x92aa9a);
  scene.stroke([-.45,.075],[.35,.5],.021,0x92aa9a); scene.rect(-1.17,.096,2.32,.022,0x92aa9a);
  scene.stroke([.86,.5],[.86,.26],.018,ink);
  scene.polygon([[.75,.26],[.97,.26],[.93,.165],[.8,.165]],0x806951);
  scene.polygon([[.845,.25],[.785,.34],[.71,.32],[.755,.266]],ink);
  scene.polygon([[.85,.25],[.922,.382],[.997,.359],[.953,.276]],0x516553);
  scene.rect(-1.18,-.34,2.36,.06,charcoal);
  scene.rect(-.82,-.32,.9,.085,ink);
  for (let i = 0; i < 3; i++) {
    const x = -.7 + i * .27;
    scene.polygon([[x-.065,-.25],[x+.06,-.25],[x+.09,-.09],[x-.09,-.09]],0x86624b);
    scene.stroke([x,-.1],[x+.04,.01],.015,charcoal);
    scene.polygon([[x+.04,-.015],[x+.12,.045],[x+.095,.107],[x+.015,.05]],paper);
  }
  scene.polygon([[-1.06,-.27],[-.86,-.27],[-.87,-.09],[-.98,-.06],[-1.07,-.12]],brass);
  scene.stroke([-.91,-.14],[-.78,-.015],.036,brass);
  scene.polygon([[.23,-.28],[.59,-.28],[.66,-.08],[.18,-.08]],0x775c4e);
  scene.rect(.166,-.105,.51,.043,brass);
}
function interiorMotion(theme: Theme, material: THREE.MeshBasicMaterial) {
  const cut = new Cutout(), mover = new THREE.Group();
  if (theme === 'garden') {
    // Each leaf has a pale vein that reads in a narrow window.
    cut.stroke([0,-.02],[.03,.33],.035,ink);
    cut.polygon([[.02,.13],[-.14,.14],[-.28,.25],[-.11,.27],[.03,.18]],0x506c56);
    cut.polygon([[.025,.22],[.15,.36],[.29,.37],[.19,.24],[.05,.195]],0x586e4f);
    cut.stroke([.03,.22],[.24,.34],.012,0xafbb7d);
    cut.polygon([[.03,.32],[-.055,.412],[-.04,.49],[.028,.45],[.065,.51],[.111,.43],[.073,.34]],0xe0b98a);
    mover.position.set(.41,-.095,.09);
  } else if (theme === 'archive') {
    cut.rect(-.048,.015,.096,.209,brass);
    cut.polygon([[-.24,-.03],[-.19,.046],[.19,.046],[.238,-.03]],charcoal);
    cut.rect(-.234,-.047,.463,.023,brass);
    mover.position.set(.1,-.05,.09);
  } else {
    const radius = .30;
    cut.disk(0,0,radius,charcoal,28); cut.disk(0,0,radius * .84,brass,28);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      cut.disk(Math.cos(a) * radius * .55, Math.sin(a) * radius * .55, radius * .2, ink, 10);
    }
    cut.disk(0,0,radius * .2,charcoal);
    cut.disk(radius * .76,0,.025,paper);
    mover.position.set(.24,-.005,.09);
  }
  mover.add(cut.mesh(material));
  return mover;
}

function frame(index: number, material: THREE.MeshBasicMaterial) {
  const f = new Cutout();
  // The slanted sill and brass bay marks remain visible while the interior is dark.
  f.rect(-1.27,-.59,2.54,.09,charcoal); f.rect(-1.27,.48,2.54,.09,ink);
  f.rect(-1.25,-.52,.085,1.02,ink); f.rect(1.165,-.52,.085,1.02,ink);
  f.rect(-1.28,-.56,2.56,.033,brass); f.rect(.98,-.49,.04,.99,ink);
  for (let j = 0; j <= index; j++) f.rect(-1.13 + j * .073,.491,.037,.065,paper);
  const result = f.mesh(material); result.position.z = .15; return result;
}

/** Individual windows are addressed by receiver ID, including when a forecast restores an earlier frame. */
export class NightWindows {
  readonly group = new THREE.Group();
  private bays: {
    receiver: Receiver; interior: THREE.MeshBasicMaterial; mechanism: THREE.Group; slip?: THREE.Mesh;
    state?: ReturnType<typeof receiverState>;
  }[] = [];
  private theme: Theme;
  private repeats: number;
  constructor(level: Level, theme: Theme) {
    this.theme = theme; this.repeats = level.repeats;
    const frameMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.group.name = 'night-windows';
    level.receivers.forEach((receiver, index) => {
      const bay = new THREE.Group(); bay.name = 'window-' + receiver.id;
      bay.position.set(-1.2 + (index - (level.receivers.length - 1) / 2) * 2.84, -1.26, 5.53);
      bay.rotation.x = -.48;
      const interior = frameMaterial.clone(), silhouette = new Cutout();
      const wall = receiver.phase === 'cool' ? 0x9cb9bb : receiver.phase === 'warm' ? 0xe1bf8d
        : theme === 'foundry' ? 0xd6ae7c : theme === 'archive' ? 0xacb7ac : 0xbac4a3;
      silhouette.rect(-1.24,-.54,2.48,1.07,wall);
      silhouette.polygon([[-1.23,-.53],[1.24,-.53],[1.24,-.12],[.56,.02],[-1.23,.08]], theme === 'foundry' ? 0xa78768 : 0x90a098);
      if (theme === 'garden') gardenInterior(silhouette);
      else if (theme === 'foundry') pumpInterior(silhouette);
      else archiveInterior(silhouette);
      const mechanism = interiorMotion(theme, interior); mechanism.name = 'mechanism';
      const slip = theme === 'archive' ? pressSlip(interior) : undefined;
      if (slip) bay.add(slip);
      bay.add(silhouette.mesh(interior), mechanism, frame(index, frameMaterial)); this.group.add(bay);
      this.bays.push({ receiver, interior, mechanism, slip });
    });
    this.update(0, false, {});
  }
  update(time: number, motion: boolean, readings: Readonly<Record<string, ReceiverState>>) {
    for (const bay of this.bays) {
      const state = receiverState(readings[bay.receiver.id], this.repeats);
      if (bay.state !== state) {
        bay.interior.color.setScalar(state === 'dark' ? .12 : state === 'running' ? .95 : .58);
        bay.state = state;
      }
      const running = state === 'running';
      if (this.theme === 'garden') {
        bay.mechanism.scale.y = running ? 1 : state === 'lit' ? .7 : .44;
        bay.mechanism.rotation.z = running && motion ? Math.sin(time * .85) * .055 : 0;
      } else if (this.theme === 'archive') {
        const stroke = running && motion ? Math.cos(time * 3.4) : 0;
        bay.mechanism.position.y = running ? -.035 + .067 * stroke : .038;
        if (bay.slip) {
          const phase = motion ? time * 3.4 / (2 * Math.PI) % 1 : .75;
          bay.slip.scale.x = running ? .38 + .62 * phase : .24;
        }
      } else {
        bay.mechanism.rotation.z = running ? motion ? time * 1.4 : .52 : 0;
      }
    }
  }
}
