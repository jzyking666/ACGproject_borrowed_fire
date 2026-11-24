// Original chamber score. Each character is an eighth note: a scale degree, a tie (-), or a rest (.).
export type SoundScene = 'menu' | 'room' | 'harbor' | 'workshop' | 'post' | 'paper' | 'story';
export type Instrument = 'tine' | 'reed' | 'wire' | 'wood' | 'bass' | 'pad';
interface Score {
  bpm: number;
  lead: Instrument;
  bass: readonly number[]; // Scale degree below each bar.
  bars: readonly string[];
  bridge: readonly string[];
  answers: readonly string[]; // Alternate cadences for the last two bars.
  backing: string; // Bass, fifth, third and octave on a recurring eighth-note grid.
}
export const scores: Record<SoundScene, Score> = {
  menu: {
    bpm: 78, lead: 'tine', bass: [1, 4, 6, 5, 1, 3, 4, 1], backing: 'b...5..3',
    bars: ['2-5.4---', '..3-1---', '4--.6-5.', '3---....', '..2-5-8.', '7-.5.3-.', '4--.2-3.', '1---....'],
    bridge: ['..8-7.5-', '6-4---..', '3..56---', '..2-5---', '6---.8-.', '7-6-5---', '4--32---', '1-----..'],
    answers: ['6-.4-32.', '1----...'],
  },
  room: {
    bpm: 84, lead: 'wire', bass: [1, 1, 4, 6, 3, 4, 5, 1], backing: 'b..5..3.',
    bars: ['2-..5-4.', '....3-1.', '4-.2..5.', '6---....', '.3-.5-7.', '4--.21..', '..2-5-3.', '1---....'],
    bridge: ['..6-..8-', '7...5-..', '3-..6--.', '2---....', '4-.6..8.', '7-.3.5..', '..5--.2-', '1----...'],
    answers: ['..5.43-2', '1--.....'],
  },
  harbor: {
    bpm: 88, lead: 'reed', bass: [1, 4, 5, 1, 6, 4, 5, 1], backing: 'b..5.3',
    bars: ['2-5.4-', '3--.1-', '.235--', '1---..', '6-8.7-', '4--.6-', '5-.32-', '1---..'],
    bridge: ['6-.8.7', '5-3-..', '2-.46-', '5--..3', '4-.6-8', '7--.5-', '.432--', '1---..'],
    answers: ['.5-72-', '1----.'],
  },
  workshop: {
    bpm: 101, lead: 'wood', bass: [1, 4, 1, 5, 6, 3, 4, 1], backing: 'b.5.3',
    bars: ['2.54-', '.3.1.', '2..56', '5--..', '6.8.5', '..73-', '4.2.3', '1--..'],
    bridge: ['6-..8', '7.5-.', '.36.4', '2--..', '6..8-', '7.53.', '4..32', '1--..'],
    answers: ['4.62-', '1....'],
  },
  post: {
    bpm: 70, lead: 'tine', bass: [4, 1, 6, 5, 4, 3, 5, 1], backing: 'b....3..',
    bars: ['4---6-5.', '..3-1---', '...6-8-.', '7---....', '4-.2-5-.', '3--.1-3.', '.5-.32-.', '1----...'],
    bridge: ['..6---8.', '7-----..', '...3-6-.', '5---.2-.', '..4---6.', '3--.1---', '2---3---', '1----...'],
    answers: ['...5-2-.', '1---....'],
  },
  paper: {
    bpm: 76, lead: 'wire', bass: [1, 1, 4, 1, 6, 4, 5, 1], backing: 'b.......',
    bars: ['..2-5---', '4-3-....', '....2-4-', '1---....', '..3-6---', '5-4-....', '..2--.3.', '1---....'],
    bridge: ['....6-8-', '5---....', '.3-6--..', '2---....', '...4-6-.', '5---....', '..3-2---', '1----...'],
    answers: ['..4-3-2.', '1----...'],
  },
  story: {
    bpm: 68, lead: 'reed', bass: [6, 4, 1, 5, 6, 3, 4, 1], backing: 'b....5..',
    bars: ['..2-5---', '4---....', '.3-1----', '2---....', '..6-8---', '7---5-3.', '4--.2---', '1----...'],
    bridge: ['6-----..', '..8-7---', '5---3---', '..2-----', '4---..6-', '5---....', '..4-3-2-', '1-----..'],
    answers: ['4-.6--2.', '1----...'],
  },
};

const scale = [0, 2, 3, 5, 7, 9, 10]; // Dorian.
const districtKeys = [0, -2, 3, 0, 5, -2, 3, 5];
export interface ScoreNote { instrument: Instrument; midi: number; beats: number; level: number; pan: number }
function pitch(tonic: number, degree: number): number {
  return tonic + 12 * Math.floor((degree - 1) / 7) + scale[(degree - 1) % 7];
}
export function scoreNotes(scene: SoundScene, district: number, step: number, load: number): ScoreNote[] {
  const score = scores[scene], width = score.backing.length;
  const bar = Math.floor(step / width) % score.bars.length, pos = step % width;
  const pass = Math.floor(step / (width * score.bars.length));
  const tonic = 50 + (districtKeys[district] ?? 0);
  const bridge = pass % 4 === 2;
  const degree = bridge ? [6,3,4,5,2,4,5,1][bar] : score.bass[bar];
  const phrase = bridge ? score.bridge[bar] : pass % 2 === 1 && bar >= 6 ? score.answers[bar - 6] : score.bars[bar];
  const notes: ScoreNote[] = [];
  const melody = Number(phrase[pos]);
  if (melody > 0) {
    let length = 1;
    while (phrase[pos + length] === '-') length++;
    notes.push({ instrument: score.lead, midi: pitch(tonic + 12, melody), beats: length, level: scene === 'paper' ? .52 : .82, pan: .12 });
  }
  const mark = score.backing[pos];
  if (mark === 'b') {
    notes.push({ instrument: 'bass', midi: pitch(tonic - 12, degree), beats: width * .7, level: .9, pan: -.08 });
    if (scene === 'story' || scene === 'menu' || (scene === 'room' && load > 0)) {
      notes.push({ instrument: 'pad', midi: pitch(tonic, degree + 2), beats: width * .87, level: .39, pan: -.35 });
    }
  } else if (mark !== '.' && (scene !== 'room' || load > .01)) {
    notes.push({ instrument: scene === 'harbor' ? 'wire' : 'wood', midi: pitch(tonic, degree + Number(mark) - 1), beats: 1.25, level: .43, pan: -.34 });
  }
  // Current returning to the circuits brings in a quiet high response on alternate bars.
  if (scene === 'room' && load >= .5 && bar % 2 === 1 && pos === 5) {
    notes.push({ instrument: 'tine', midi: pitch(tonic + 12, degree + 4), beats: 2, level: .52 * load, pan: .36 });
  }
  return notes;
}
