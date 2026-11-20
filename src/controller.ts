export interface PadFrame {
  move: { x: number; y: number }; camera: { x: number; y: number };
  interact: boolean; rotate: boolean; observe: boolean; hint: boolean; pause: boolean; back: boolean; confirm: boolean;
  navigation: number;
}
export class Controller {
  private previous: boolean[] = [];
  private navigationTime = 0;
  private direction = 0;
  read(pad: Pick<Gamepad, 'buttons' | 'axes'> | undefined, dt: number): PadFrame {
    const result: PadFrame = { move: { x: 0, y: 0 }, camera: { x: 0, y: 0 }, interact: false, rotate: false, observe: false, hint: false, pause: false, back: false, confirm: false, navigation: 0 };
    if (!pad) { this.previous = []; this.direction = 0; this.navigationTime = 0; return result; }
    const b = pad.buttons.map(button => button.pressed);
    const edge = (i: number) => !!b[i] && !this.previous[i];
    const axis = (v: number) => Math.abs(v) < .2 ? 0 : Math.sign(v) * Math.min(1, (Math.abs(v) - .2) / .8);
    result.move = { x: axis(pad.axes[0] ?? 0) + Number(!!b[15]) - Number(!!b[14]), y: axis(pad.axes[1] ?? 0) + Number(!!b[13]) - Number(!!b[12]) };
    result.camera = { x: axis(pad.axes[2] ?? 0), y: axis(pad.axes[3] ?? 0) };
    result.interact = result.confirm = edge(0); result.rotate = result.back = edge(1);
    result.observe = edge(2); result.hint = edge(3); result.pause = edge(9);
    const direction = Number(!!b[13] || !!b[15] || (pad.axes[1] ?? 0) > .6 || (pad.axes[0] ?? 0) > .6) - Number(!!b[12] || !!b[14] || (pad.axes[1] ?? 0) < -.6 || (pad.axes[0] ?? 0) < -.6);
    this.navigationTime -= dt;
    if (direction && (direction !== this.direction || this.navigationTime <= 0)) {
      result.navigation = direction; this.navigationTime = direction !== this.direction ? .34 : .15;
    }
    this.direction = direction; this.previous = b; return result;
  }
}
