import type { Level } from './levels';

export const TRAM_BASE = 3000;

export interface TramStop {
  level: Level;
  place: string;
  caller: string;
  request: string;
  receipt: string;
}

export const TRAM_STOPS: readonly TramStop[] = [
  {
    place: '槐荫候车亭', caller: '末班车司机',
    request: '我开了四十年夜车。只亮黄灯，我就当这站没人。雨棚背面那盏蓝灯，能帮我看看吗？',
    receipt: '蓝灯一亮，我才看见棚底伸出来一只手。等等，别开，是个提着两只桶的人。',
    level: {
      id: 3000, name: '雨棚的背面', subtitle: '01 / SHELTER',
      briefing: '近街的黄灯还亮着，背街的蓝灯一直没亮。两盏灯串用同一颗光，雨棚上只有一根换相管。',
      lesson: '沿着已经得电的黄灯往前找。蓝灯要收冷光，光必须先经过雨棚上的换相器。',
      width: 13, height: 9, theme: 'garden',
      spawn: { x: 10, y: 6 }, exit: { x: 3, y: 7 }, source: { x: 2, y: 5, dx: 1, dy: 0 },
      mirrors: [{ id: 'A', x: 9, y: 5, slash: false }, { id: 'B', x: 7, y: 2, slash: false, fixed: true }],
      receivers: [
        { id: 'amber', name: '临街黄灯', x: 4, y: 5, ttl: 9, phase: 'warm' },
        { id: 'blue', name: '棚后蓝灯', x: 3, y: 2, ttl: 9, phase: 'cool' },
      ],
      inverters: [{ x: 5, y: 2 }],
      walls: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 9, y: 2 }, { x: 9, y: 3 }],
      repeats: 1, par: 45,
      solution: [{ id: 'A', x: 7, y: 5, slash: true }, { id: 'B', x: 7, y: 2, slash: false, fixed: true }],
      hints: [
        '黄灯自己就会亮。站在它的下游观察，看看光从哪里离开了站台。',
        '从蓝灯倒着找：先是换相器，再是雨棚拐角的固定镜。固定镜的下方缺一道从街上折来的光。',
        '把活动镜搬到 (7,5)，调成 /。等脉冲穿过换相器，两灯同亮后去出口。',
      ],
    },
  },
  {
    place: '折门站台', caller: '卖豆花的邹师傅',
    request: '前门窄，侧着过去也得洒一桶。你先上车，帮我把后面那扇折门叫醒。我在这儿等。',
    receipt: '进来了！明早要是有人问，这桶豆花坐的可是末班车。来，把空座让给你的工具箱。',
    level: {
      id: 3001, name: '请从后门上车', subtitle: '02 / FOLDING DOORS',
      briefing: '前后门各有一只脚踏开关。旧车保留了继电器：每路先踩踏板，等自己的接收环亮起，才可松脚。',
      lesson: '先让靠近发射器的继电器接管，再去启动后门。查看闸门上所连的踏板标记。',
      width: 13, height: 9, theme: 'foundry',
      spawn: { x: 3, y: 3 }, exit: { x: 11, y: 2 }, source: { x: 2, y: 6, dx: 1, dy: 0 },
      mirrors: [{ id: 'A', x: 9, y: 6, slash: false }],
      receivers: [
        { id: 'latch', name: '前门继电器', x: 6, y: 6, ttl: 10 },
        { id: 'door', name: '后门电铃', x: 9, y: 2, ttl: 10 },
      ],
      plates: [{ id: 'A', x: 3, y: 4 }, { id: 'B', x: 7, y: 4 }],
      gates: [{ plate: 'A', x: 4, y: 6, poweredBy: 'latch' }, { plate: 'B', x: 9, y: 4, poweredBy: 'door' }],
      walls: [{ x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 4, y: 3 }, { x: 6, y: 3 }, { x: 10, y: 6 }],
      repeats: 1, par: 70,
      solution: [{ id: 'A', x: 9, y: 6, slash: true }],
      hints: [
        '从发射器顺着看。第一道闸如果没开，去后门踩多久都等不到光。',
        '站在 A 板等前门继电器亮，再走开。前门现在能自己守住了。',
        '把 (9,6) 的镜转成 /，离开光路。站在 B 板等后门电铃亮起，然后绕开光束去出口。',
      ],
    },
  },
  {
    place: '旧线终点', caller: '末班车司机',
    request: '前面没有架空线，我得把车顶的弓收下来。你看着车尾那点红光；它要是还在，我们就能把这一车人送到家。',
    receipt: '车弓落下，窗里的灯没灭。邹师傅拎走了豆花，在工具箱盖上留下一张车票。背面写着：明早头班，凭票喝一碗。',
    level: {
      id: 3002, name: '收弓以后', subtitle: '03 / PANTOGRAPH DOWN',
      briefing: '架空线只够发车。车顶和车底以一对导光井相连，两端的灯要在断开来源后仍收到同一颗光。',
      lesson: '用踏板启动发车闸，尾灯得电后会接管。等两只接收环都验证循环，再去发射器旁断电。',
      width: 13, height: 9, theme: 'archive',
      spawn: { x: 5, y: 5 }, exit: { x: 6, y: 4 }, source: { x: 4, y: 6, dx: 1, dy: 0 },
      mirrors: [
        { id: 'A', x: 9, y: 5, slash: false }, { id: 'B', x: 10, y: 2, slash: false, fixed: true },
        { id: 'C', x: 3, y: 2, slash: true, fixed: true }, { id: 'D', x: 3, y: 6, slash: true },
      ],
      receivers: [
        { id: 'roof', name: '车厢阅读灯', x: 8, y: 2, ttl: 10, phase: 'cool' },
        { id: 'tail', name: '车尾灯', x: 3, y: 4, ttl: 10, phase: 'warm' },
      ],
      plates: [{ id: 'C', x: 6, y: 5 }], gates: [{ plate: 'C', x: 7, y: 6, poweredBy: 'tail' }],
      inverters: [{ x: 5, y: 6 }, { x: 6, y: 2 }], portals: [{ id: 'T', a: { x: 8, y: 4 }, b: { x: 10, y: 3 } }],
      walls: [{ x: 4, y: 3 }, { x: 5, y: 3 }, { x: 7, y: 3 }, { x: 9, y: 3 }, { x: 9, y: 4 }],
      repeats: 2, offGrid: true, par: 110,
      solution: [
        { id: 'A', x: 8, y: 6, slash: true }, { id: 'B', x: 10, y: 2, slash: false, fixed: true },
        { id: 'C', x: 3, y: 2, slash: true, fixed: true }, { id: 'D', x: 3, y: 6, slash: false },
      ],
      hints: [
        '先找通往车顶的 T 井。换过相的冷光应该从车底往北入井，从另一口井出来时方向仍然朝北。',
        '车顶已经铺好。回到尾灯向南看，要让它下方的镜把暖光送回发射器所在的那一行。',
        '将 A 放在 (8,6) 调成 /，将 D 调成反斜线。踩 C 等两个环各亮两格，再松脚、关闭发射器、走到出口。',
      ],
    },
  },
];

export function tramStopById(id: number): TramStop | undefined {
  const stop = TRAM_STOPS[id - TRAM_BASE];
  return stop?.level.id === id ? stop : undefined;
}

// Complete authored sentences also localize dynamic HUD hints and radio receipts.
export const TRAM_EN: Record<string, string> = {
  '槐荫候车亭': 'Locust Tree Shelter',
  '末班车司机': 'Last tram driver',
  '雨棚的背面': 'Behind the Shelter',
  '我开了四十年夜车。只亮黄灯，我就当这站没人。雨棚背面那盏蓝灯，能帮我看看吗？': "Forty years on nights. When I see only amber, I take it there's nobody waiting. Could you check the blue lamp behind the shelter?",
  '蓝灯一亮，我才看见棚底伸出来一只手。等等，别开，是个提着两只桶的人。': 'When the blue lamp came on I saw a hand reach out from under the awning. Hold on. Someone with two pails.',
  '近街的黄灯还亮着，背街的蓝灯一直没亮。两盏灯串用同一颗光，雨棚上只有一根换相管。': 'The amber lamp still faces the street. The blue lamp at the back stays dark. Both run on the same pulse. A single phase inverter sits on the canopy.',
  '沿着已经得电的黄灯往前找。蓝灯要收冷光，光必须先经过雨棚上的换相器。': 'Follow the beam past the working amber lamp. The blue one takes a cool pulse. Find the inverter on the canopy.',
  '临街黄灯': 'Street lamp', '棚后蓝灯': 'Shelter lamp',
  '黄灯自己就会亮。站在它的下游观察，看看光从哪里离开了站台。': 'The street lamp already works. Trace the pulse past it and watch where it leaves the platform.',
  '从蓝灯倒着找：先是换相器，再是雨棚拐角的固定镜。固定镜的下方缺一道从街上折来的光。': 'Trace backwards from the blue lamp through the inverter to the fixed corner mirror. Feed that mirror from the street below.',
  '把活动镜搬到 (7,5)，调成 /。等脉冲穿过换相器，两灯同亮后去出口。': 'Move the loose mirror to (7,5) and turn it to /. Wait for the pulse to pass the inverter and light both lamps, then take the exit.',
  '折门站台': 'Folding Door Platform', '卖豆花的邹师傅': 'Zou, the tofu seller', '请从后门上车': 'Board at the Rear',
  '前门窄，侧着过去也得洒一桶。你先上车，帮我把后面那扇折门叫醒。我在这儿等。': "Even sideways I'd spill a whole pail through that front door. Hop aboard and wake up the folding doors at the back for me. I'll wait here.",
  '进来了！明早要是有人问，这桶豆花坐的可是末班车。来，把空座让给你的工具箱。': "Made it! If anyone asks tomorrow, this tofu rode the last tram. Here, the empty seat's for your toolbox.",
  '前后门各有一只脚踏开关。旧车保留了继电器：每路先踩踏板，等自己的接收环亮起，才可松脚。': 'Both doors have foot switches. This old tram still has its relays. Stand on each pedal until its own ring lights up, then step off.',
  '先让靠近发射器的继电器接管，再去启动后门。查看闸门上所连的踏板标记。': 'Hand control to the relay nearest the emitter first. Then start the rear door. Each gate carries its pedal mark.',
  '前门继电器': 'Front relay', '后门电铃': 'Rear bell',
  '从发射器顺着看。第一道闸如果没开，去后门踩多久都等不到光。': 'Trace from the emitter. The rear door gets no light while the first gate is shut.',
  '站在 A 板等前门继电器亮，再走开。前门现在能自己守住了。': 'Stand on pedal A until the front relay lights. It can now hold its own gate open.',
  '把 (9,6) 的镜转成 /，离开光路。站在 B 板等后门电铃亮起，然后绕开光束去出口。': 'Turn the mirror at (9,6) to / and step aside. Wait on pedal B for the rear bell, then walk around the beam to the exit.',
  '旧线终点': 'Old Line Terminus', '收弓以后': 'After the Pole Comes Down',
  '前面没有架空线，我得把车顶的弓收下来。你看着车尾那点红光；它要是还在，我们就能把这一车人送到家。': "No overhead wire beyond here. I've got to lower the pole. Keep your eye on that red lamp at the back. If it holds, we can get these people home.",
  '车弓落下，窗里的灯没灭。邹师傅拎走了豆花，在工具箱盖上留下一张车票。背面写着：明早头班，凭票喝一碗。': 'The pole comes down. Light still spills from the windows. Zou takes the pails and leaves a ticket on your toolbox. On the back: first tram tomorrow, one bowl on me.',
  '架空线只够发车。车顶和车底以一对导光井相连，两端的灯要在断开来源后仍收到同一颗光。': 'The overhead wire only gets us moving. Paired light wells link the roof and underframe. The same pulse must reach both lamps after disconnection.',
  '用踏板启动发车闸，尾灯得电后会接管。等两只接收环都验证循环，再去发射器旁断电。': 'Start the departure gate with its pedal. The tail lamp takes over when powered. Once both rings verify the loop, switch off the emitter.',
  '车厢阅读灯': 'Reading lamp', '车尾灯': 'Tail lamp',
  '先找通往车顶的 T 井。换过相的冷光应该从车底往北入井，从另一口井出来时方向仍然朝北。': 'Find well T leading to the roof. Send the cool pulse north from below. It will still be travelling north when it emerges.',
  '车顶已经铺好。回到尾灯向南看，要让它下方的镜把暖光送回发射器所在的那一行。': 'The roof is wired. Look south from the tail lamp. Its mirror must send the warm pulse back along the emitter row.',
  '将 A 放在 (8,6) 调成 /，将 D 调成反斜线。踩 C 等两个环各亮两格，再松脚、关闭发射器、走到出口。': 'Set mirror A to / at (8,6) and D to a backslash. Hold pedal C until each ring shows two marks, then step off, switch off the emitter and take the exit.',
};
