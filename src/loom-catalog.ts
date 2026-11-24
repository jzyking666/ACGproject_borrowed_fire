import type { LoomBoard } from './grid-loom';

// Fixed campaign installations. Reproduced by scripts/curate-looms.ts.
export const loomCatalog: LoomBoard[] = [
  {
    title: "一根钟线",
    lanes: 3,
    drums: [[0,1,2],[0,1,2]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":2,"lane":1,"wire":0}],
    opening: [0,2]
  },
  {
    title: "折进里侧",
    lanes: 3,
    drums: [[0,1,2],[0,2,1],[0,1,2]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":3,"lane":0,"wire":2}],
    opening: [1,0,2]
  },
  {
    title: "最后一只接头",
    lanes: 3,
    drums: [[0,1,2],[0,2,1],[0,2,1]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":3,"lane":1,"wire":0},{"kind":"feed","at":3,"lane":0,"wire":2}],
    opening: [0,0,0]
  },
  {
    title: "错层的灯座",
    lanes: 3,
    drums: [[0,2,1],[0,1,2],[0,1,2],[0,1,2]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":4,"lane":1,"wire":1},{"kind":"feed","at":4,"lane":0,"wire":2}],
    opening: [0,0,0,0]
  },
  {
    title: "两路同到",
    lanes: 4,
    drums: [[0,4,2],[0,1,4],[0,1,4],[0,2,4]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":4,"lane":3,"wire":2},{"kind":"feed","at":4,"lane":0,"wire":1}],
    opening: [2,2,2,2]
  },
  {
    title: "先过中缝",
    lanes: 4,
    drums: [[0,4,1],[0,2,1],[0,4,2],[0,1,2]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":4,"lane":3,"wire":3},{"kind":"feed","at":4,"lane":0,"wire":1},{"kind":"feed","at":2,"lane":1,"wire":2}],
    opening: [0,2,1,2]
  },
  {
    title: "半路取电",
    lanes: 4,
    drums: [[0,4,1],[0,2,1],[0,2,4],[0,2,1]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":4,"lane":1,"wire":0},{"kind":"feed","at":4,"lane":2,"wire":1},{"kind":"feed","at":1,"lane":0,"wire":0}],
    opening: [2,2,2,0]
  },
  {
    title: "看得见的针脚",
    lanes: 4,
    drums: [[0,4,2],[0,4,1],[0,1,2],[0,1,4]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":4,"lane":1,"wire":3},{"kind":"feed","at":4,"lane":2,"wire":1},{"kind":"feed","at":1,"lane":3,"wire":3}],
    opening: [1,2,0,0]
  },
  {
    title: "墙内测孔",
    lanes: 4,
    drums: [[0,1,2],[0,1,4],[0,2,1],[0,1,4],[0,2,4]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":2,"wire":3},{"kind":"feed","at":5,"lane":1,"wire":0},{"kind":"feed","at":4,"lane":2,"wire":1}],
    opening: [0,2,0,2,0]
  },
  {
    title: "上层与下层",
    lanes: 4,
    drums: [[0,4,1],[0,1,4],[0,4,1],[0,1,4],[0,4,2]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":1,"wire":3},{"kind":"feed","at":5,"lane":0,"wire":1},{"kind":"feed","at":2,"lane":2,"wire":3}],
    opening: [2,0,1,0,0]
  },
  {
    title: "一分为二的读数",
    lanes: 4,
    drums: [[0,1,2],[0,2,4],[0,1,4],[0,2,1],[0,2,4]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":0,"wire":2},{"kind":"feed","at":5,"lane":2,"wire":3},{"kind":"feed","at":2,"lane":0,"wire":0}],
    opening: [1,1,2,0,1]
  },
  {
    title: "三处验线",
    lanes: 4,
    drums: [[0,1,2],[0,4,1],[0,4,2],[0,1,2],[0,4,2]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":3,"wire":2},{"kind":"feed","at":5,"lane":2,"wire":3},{"kind":"feed","at":3,"lane":2,"wire":0}],
    opening: [2,0,0,0,0]
  },
  {
    title: "暂封的孔",
    lanes: 4,
    drums: [[0,1,2],[0,2,1],[0,4,1],[0,2,1],[0,1,4]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":0,"wire":2},{"kind":"feed","at":5,"lane":2,"wire":1},{"kind":"feed","at":2,"lane":0,"wire":0},{"kind":"isolate","at":1,"lane":1,"wire":2}],
    opening: [2,2,1,1,0]
  },
  {
    title: "把热线借过去",
    lanes: 4,
    drums: [[0,4,2],[0,1,2],[0,4,2],[0,4,2],[0,2,4]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":1,"wire":2},{"kind":"feed","at":5,"lane":2,"wire":3},{"kind":"feed","at":3,"lane":1,"wire":2},{"kind":"isolate","at":4,"lane":0,"wire":1}],
    opening: [1,1,0,2,0]
  },
  {
    title: "一段冷床",
    lanes: 4,
    drums: [[0,4,2],[0,2,1],[0,1,2],[0,4,1],[0,1,2]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":2,"wire":2},{"kind":"feed","at":5,"lane":0,"wire":0},{"kind":"feed","at":3,"lane":2,"wire":3},{"kind":"isolate","at":3,"lane":0,"wire":1}],
    opening: [0,0,1,2,1]
  },
  {
    title: "越过禁区",
    lanes: 4,
    drums: [[0,2,1],[0,4,2],[0,1,2],[0,2,1],[0,1,2]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":0,"wire":2},{"kind":"feed","at":5,"lane":1,"wire":0},{"kind":"feed","at":2,"lane":1,"wire":1},{"kind":"isolate","at":1,"lane":2,"wire":2}],
    opening: [2,0,1,0,2]
  },
  {
    title: "旁边仍要亮",
    lanes: 4,
    drums: [[0,2,4],[0,4,2],[0,1,2],[0,2,1],[0,2,4],[0,1,4]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":6,"lane":2,"wire":1},{"kind":"feed","at":6,"lane":1,"wire":3},{"kind":"feed","at":5,"lane":1,"wire":0},{"kind":"isolate","at":2,"lane":1,"wire":2}],
    opening: [1,1,2,0,1,2]
  },
  {
    title: "带电的空位",
    lanes: 4,
    drums: [[0,2,1],[0,2,4],[0,1,4],[0,4,2],[0,1,4],[0,4,2]],
    links: [],
    clutches: [],
    contacts: [{"kind":"feed","at":6,"lane":2,"wire":0},{"kind":"feed","at":6,"lane":3,"wire":2},{"kind":"feed","at":4,"lane":1,"wire":3},{"kind":"isolate","at":3,"lane":1,"wire":2}],
    opening: [1,0,0,0,0,1]
  },
  {
    title: "一只手两根轴",
    lanes: 4,
    drums: [[0,2,4],[0,2,4],[0,4,1],[0,1,2],[0,2,4]],
    links: [{"from":3,"to":4,"step":1}],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":1,"wire":0},{"kind":"feed","at":5,"lane":2,"wire":2},{"kind":"feed","at":4,"lane":0,"wire":1},{"kind":"isolate","at":3,"lane":3,"wire":3}],
    opening: [1,1,0,2,1]
  },
  {
    title: "错开的齿带",
    lanes: 4,
    drums: [[0,1,4],[0,1,4],[0,2,4],[0,1,4],[0,2,4]],
    links: [{"from":3,"to":4,"step":1}],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":1,"wire":0},{"kind":"feed","at":5,"lane":0,"wire":1},{"kind":"feed","at":2,"lane":0,"wire":0},{"kind":"isolate","at":1,"lane":0,"wire":1}],
    opening: [1,1,1,2,2]
  },
  {
    title: "末端跟着转",
    lanes: 4,
    drums: [[0,4,1],[0,2,4],[0,4,1],[0,4,1],[0,2,1],[0,2,4]],
    links: [{"from":4,"to":5,"step":1}],
    clutches: [],
    contacts: [{"kind":"feed","at":6,"lane":0,"wire":1},{"kind":"feed","at":6,"lane":1,"wire":3},{"kind":"feed","at":3,"lane":1,"wire":0},{"kind":"isolate","at":1,"lane":2,"wire":3}],
    opening: [1,1,2,1,2,2]
  },
  {
    title: "同转一格",
    lanes: 4,
    drums: [[0,1,2],[0,1,2],[0,2,1],[0,4,2],[0,2,4],[0,4,1]],
    links: [{"from":1,"to":3,"step":1},{"from":4,"to":5,"step":1}],
    clutches: [],
    contacts: [{"kind":"feed","at":6,"lane":3,"wire":1},{"kind":"feed","at":6,"lane":0,"wire":2},{"kind":"feed","at":1,"lane":1,"wire":1},{"kind":"isolate","at":4,"lane":1,"wire":1}],
    opening: [1,1,0,1,1,2]
  },
  {
    title: "给中间留口",
    lanes: 5,
    drums: [[0,2,4],[0,2,8],[0,1,8],[0,1,2],[0,1,8],[0,8,4]],
    links: [{"from":2,"to":5,"step":1},{"from":0,"to":5,"step":1}],
    clutches: [],
    contacts: [{"kind":"feed","at":6,"lane":0,"wire":2},{"kind":"feed","at":6,"lane":3,"wire":4},{"kind":"feed","at":4,"lane":2,"wire":0},{"kind":"isolate","at":1,"lane":2,"wire":2}],
    opening: [0,2,2,0,1,2]
  },
  {
    title: "相扣的两对轮",
    lanes: 5,
    drums: [[0,2,8],[0,2,8],[0,4,2],[0,8,2],[0,8,1],[0,4,8]],
    links: [{"from":4,"to":5,"step":1},{"from":2,"to":4,"step":1}],
    clutches: [],
    contacts: [{"kind":"feed","at":6,"lane":4,"wire":4},{"kind":"feed","at":6,"lane":0,"wire":1},{"kind":"feed","at":4,"lane":4,"wire":4},{"kind":"isolate","at":4,"lane":3,"wire":3}],
    opening: [0,2,2,1,1,0]
  },
  {
    title: "同一根铜丝",
    lanes: 5,
    drums: [[0,4,8],[0,4,2],[0,4,1],[0,2,1],[0,4,1]],
    links: [{"from":1,"to":3,"step":-1}],
    clutches: [],
    contacts: [{"kind":"feed","at":5,"lane":0,"wire":0},{"kind":"feed","at":5,"lane":3,"wire":2},{"kind":"feed","at":4,"lane":2,"wire":2},{"kind":"isolate","at":1,"lane":4,"wire":3},{"kind":"match","at":3,"lane":3,"other":{"at":2,"lane":2}}],
    opening: [2,2,2,2,2]
  },
  {
    title: "认回另一头",
    lanes: 5,
    drums: [[0,4,2],[0,1,2],[0,2,8],[0,2,8],[0,8,2],[0,1,4]],
    links: [{"from":2,"to":3,"step":-1}],
    clutches: [],
    contacts: [{"kind":"feed","at":6,"lane":0,"wire":0},{"kind":"feed","at":6,"lane":3,"wire":2},{"kind":"feed","at":3,"lane":3,"wire":2},{"kind":"isolate","at":4,"lane":2,"wire":1},{"kind":"match","at":5,"lane":3,"other":{"at":4,"lane":4}}],
    opening: [2,2,1,0,2,1]
  },
  {
    title: "两只无名端子",
    lanes: 5,
    drums: [[0,8,2],[0,1,4],[0,2,8],[0,1,2],[0,4,1],[0,4,2]],
    links: [{"from":4,"to":5,"step":-1}],
    clutches: [],
    contacts: [{"kind":"feed","at":6,"lane":1,"wire":1},{"kind":"feed","at":6,"lane":4,"wire":4},{"kind":"feed","at":3,"lane":1,"wire":2},{"kind":"isolate","at":4,"lane":0,"wire":0},{"kind":"match","at":4,"lane":2,"other":{"at":2,"lane":1}}],
    opening: [1,2,2,0,0,1]
  },
  {
    title: "反齿回转",
    lanes: 5,
    drums: [[0,4,1],[0,8,1],[0,8,2],[0,2,1],[0,4,1],[0,2,4]],
    links: [{"from":3,"to":5,"step":-1},{"from":1,"to":3,"step":1}],
    clutches: [],
    contacts: [{"kind":"feed","at":6,"lane":1,"wire":2},{"kind":"feed","at":6,"lane":4,"wire":3},{"kind":"feed","at":3,"lane":0,"wire":1},{"kind":"isolate","at":4,"lane":1,"wire":0},{"kind":"match","at":3,"lane":4,"other":{"at":2,"lane":3}}],
    opening: [1,1,2,1,0,2]
  },
  {
    title: "接缝处有人",
    lanes: 5,
    drums: [[0,1,2],[0,2,4],[0,4,2],[0,8,1],[0,4,8],[0,4,8]],
    links: [{"from":3,"to":5,"step":-1},{"from":4,"to":5,"step":1}],
    clutches: [],
    contacts: [{"kind":"feed","at":6,"lane":3,"wire":4},{"kind":"feed","at":6,"lane":2,"wire":1},{"kind":"feed","at":1,"lane":1,"wire":2},{"kind":"isolate","at":3,"lane":2,"wire":2},{"kind":"match","at":2,"lane":2,"other":{"at":1,"lane":3}}],
    opening: [0,0,2,1,0,1]
  },
  {
    title: "谁穿过两道门",
    lanes: 5,
    drums: [[0,1,8],[0,1,8],[0,1,8],[0,8,2],[0,1,8],[0,2,8],[0,4,2]],
    links: [{"from":3,"to":4,"step":-1},{"from":0,"to":4,"step":1}],
    clutches: [],
    contacts: [{"kind":"feed","at":7,"lane":2,"wire":3},{"kind":"feed","at":7,"lane":0,"wire":0},{"kind":"feed","at":3,"lane":1,"wire":0},{"kind":"isolate","at":1,"lane":3,"wire":4},{"kind":"match","at":3,"lane":4,"other":{"at":2,"lane":3}}],
    opening: [2,2,0,2,1,0,2]
  },
  {
    title: "手轮先吃电",
    lanes: 5,
    drums: [[0,4,2],[0,1,2],[0,8,1],[0,2,4],[0,1,2]],
    links: [{"from":0,"to":2,"step":-1}],
    clutches: [{"drum":2,"lane":2,"wire":1}],
    contacts: [{"kind":"feed","at":5,"lane":1,"wire":1},{"kind":"feed","at":5,"lane":4,"wire":4},{"kind":"feed","at":2,"lane":3,"wire":2},{"kind":"isolate","at":2,"lane":2,"wire":3},{"kind":"match","at":4,"lane":2,"other":{"at":1,"lane":1}}],
    opening: [0,0,2,1,0]
  },
  {
    title: "把钥匙送上去",
    lanes: 5,
    drums: [[0,1,8],[0,4,1],[0,4,8],[0,1,2],[0,1,8],[0,1,8]],
    links: [{"from":0,"to":5,"step":-1}],
    clutches: [{"drum":5,"lane":1,"wire":2}],
    contacts: [{"kind":"feed","at":6,"lane":1,"wire":3},{"kind":"feed","at":6,"lane":3,"wire":4},{"kind":"feed","at":2,"lane":2,"wire":2},{"kind":"isolate","at":4,"lane":2,"wire":0},{"kind":"match","at":5,"lane":3,"other":{"at":4,"lane":4}}],
    opening: [2,1,2,0,0,0]
  },
  {
    title: "借线开锁",
    lanes: 5,
    drums: [[0,8,2],[0,8,4],[0,4,1],[0,4,2],[0,4,1],[0,8,1]],
    links: [{"from":1,"to":3,"step":-1}],
    clutches: [{"drum":2,"lane":3,"wire":4}],
    contacts: [{"kind":"feed","at":6,"lane":1,"wire":0},{"kind":"feed","at":6,"lane":4,"wire":3},{"kind":"feed","at":4,"lane":0,"wire":1},{"kind":"isolate","at":1,"lane":4,"wire":3},{"kind":"match","at":4,"lane":2,"other":{"at":1,"lane":4}}],
    opening: [1,2,0,1,1,1]
  },
  {
    title: "只给手轮供电",
    lanes: 5,
    drums: [[0,1,8],[0,1,2],[0,1,4],[0,1,2],[0,8,4],[0,8,4]],
    links: [{"from":3,"to":4,"step":-1},{"from":2,"to":3,"step":1}],
    clutches: [{"drum":2,"lane":1,"wire":0}],
    contacts: [{"kind":"feed","at":6,"lane":4,"wire":4},{"kind":"feed","at":6,"lane":2,"wire":2},{"kind":"feed","at":4,"lane":0,"wire":1},{"kind":"isolate","at":1,"lane":4,"wire":3},{"kind":"match","at":4,"lane":2,"other":{"at":1,"lane":3}}],
    opening: [2,2,0,0,2,1]
  },
  {
    title: "放开后换路",
    lanes: 5,
    drums: [[0,1,8],[0,2,8],[0,2,4],[0,4,2],[0,8,1],[0,4,1],[0,2,4]],
    links: [{"from":4,"to":6,"step":-1},{"from":3,"to":6,"step":1}],
    clutches: [{"drum":3,"lane":3,"wire":1}],
    contacts: [{"kind":"feed","at":7,"lane":4,"wire":4},{"kind":"feed","at":7,"lane":1,"wire":1},{"kind":"feed","at":1,"lane":1,"wire":0},{"kind":"isolate","at":3,"lane":3,"wire":2},{"kind":"match","at":5,"lane":2,"other":{"at":3,"lane":3}}],
    opening: [1,2,0,2,1,1,0]
  },
  {
    title: "过锁再折返",
    lanes: 5,
    drums: [[0,8,4],[0,4,2],[0,8,4],[0,4,1],[0,4,2],[0,1,8],[0,2,8]],
    links: [{"from":0,"to":1,"step":-1},{"from":4,"to":5,"step":1}],
    clutches: [{"drum":4,"lane":1,"wire":2}],
    contacts: [{"kind":"feed","at":7,"lane":0,"wire":3},{"kind":"feed","at":7,"lane":3,"wire":2},{"kind":"feed","at":5,"lane":2,"wire":0},{"kind":"isolate","at":2,"lane":2,"wire":3},{"kind":"match","at":6,"lane":4,"other":{"at":1,"lane":3}}],
    opening: [2,2,1,2,0,2,0]
  },
  {
    title: "两条街的同梭",
    lanes: 5,
    drums: [[0,10,9],[0,2,4],[0,4,2],[0,9,2],[0,2,5],[0,5,9]],
    links: [{"from":3,"to":5,"step":-1},{"from":0,"to":4,"step":1},{"from":1,"to":5,"step":1}],
    clutches: [{"drum":5,"lane":1,"wire":2}],
    contacts: [{"kind":"feed","at":6,"lane":1,"wire":0},{"kind":"feed","at":6,"lane":4,"wire":3},{"kind":"feed","at":5,"lane":2,"wire":2},{"kind":"isolate","at":2,"lane":3,"wire":4},{"kind":"match","at":4,"lane":1,"other":{"at":2,"lane":0}}],
    opening: [1,0,2,2,2,0]
  },
  {
    title: "反齿与双针",
    lanes: 5,
    drums: [[0,10,5],[0,5,4],[0,2,1],[0,9,5],[0,10,4],[0,9,1]],
    links: [{"from":1,"to":5,"step":-1},{"from":0,"to":4,"step":1},{"from":4,"to":5,"step":1}],
    clutches: [{"drum":2,"lane":0,"wire":1}],
    contacts: [{"kind":"feed","at":6,"lane":4,"wire":4},{"kind":"feed","at":6,"lane":0,"wire":1},{"kind":"feed","at":3,"lane":1,"wire":2},{"kind":"isolate","at":2,"lane":1,"wire":2},{"kind":"match","at":5,"lane":4,"other":{"at":2,"lane":3}}],
    opening: [0,2,2,2,2,1]
  },
  {
    title: "三角形的封条",
    lanes: 5,
    drums: [[0,5,8],[0,2,8],[0,2,9],[0,8,10],[0,8,5],[0,1,4],[0,2,1]],
    links: [{"from":3,"to":6,"step":-1},{"from":2,"to":4,"step":1},{"from":4,"to":6,"step":1}],
    clutches: [{"drum":3,"lane":0,"wire":1}],
    contacts: [{"kind":"feed","at":7,"lane":3,"wire":2},{"kind":"feed","at":7,"lane":1,"wire":0},{"kind":"feed","at":2,"lane":3,"wire":2},{"kind":"isolate","at":4,"lane":2,"wire":3},{"kind":"match","at":6,"lane":3,"other":{"at":3,"lane":4}}],
    opening: [2,2,0,0,0,2,0]
  },
  {
    title: "牵一动三",
    lanes: 5,
    drums: [[0,10,9],[0,1,10],[0,2,5],[0,1,8],[0,5,9],[0,10,5],[0,5,2]],
    links: [{"from":3,"to":5,"step":-1},{"from":5,"to":6,"step":1},{"from":0,"to":2,"step":1}],
    clutches: [{"drum":2,"lane":2,"wire":1}],
    contacts: [{"kind":"feed","at":7,"lane":2,"wire":0},{"kind":"feed","at":7,"lane":4,"wire":3},{"kind":"feed","at":3,"lane":0,"wire":2},{"kind":"isolate","at":6,"lane":2,"wire":0},{"kind":"match","at":5,"lane":2,"other":{"at":4,"lane":3}}],
    opening: [2,0,1,2,2,1,2]
  },
  {
    title: "错开的钥匙孔",
    lanes: 5,
    drums: [[0,1,4],[0,2,5],[0,1,2],[0,10,2],[0,4,5],[0,2,9],[0,8,2]],
    links: [{"from":0,"to":2,"step":-1},{"from":1,"to":5,"step":1},{"from":5,"to":6,"step":1}],
    clutches: [{"drum":3,"lane":0,"wire":2},{"drum":4,"lane":0,"wire":2}],
    contacts: [{"kind":"feed","at":7,"lane":1,"wire":2},{"kind":"feed","at":7,"lane":3,"wire":4},{"kind":"feed","at":1,"lane":3,"wire":2},{"kind":"isolate","at":5,"lane":1,"wire":2},{"kind":"match","at":6,"lane":3,"other":{"at":4,"lane":2}}],
    opening: [2,2,1,1,0,0,0]
  },
  {
    title: "交给另一扇闸",
    lanes: 5,
    drums: [[0,1,8],[0,2,4],[0,10,4],[0,8,9],[0,8,1],[0,1,8],[0,2,4]],
    links: [{"from":3,"to":4,"step":-1},{"from":5,"to":6,"step":1},{"from":1,"to":6,"step":1}],
    clutches: [{"drum":4,"lane":1,"wire":4},{"drum":6,"lane":2,"wire":1}],
    contacts: [{"kind":"feed","at":7,"lane":1,"wire":2},{"kind":"feed","at":7,"lane":3,"wire":3},{"kind":"feed","at":3,"lane":4,"wire":4},{"kind":"isolate","at":3,"lane":0,"wire":1},{"kind":"match","at":2,"lane":2,"other":{"at":1,"lane":3}}],
    opening: [1,0,2,2,2,0,1]
  },
  {
    title: "五路通宵",
    lanes: 5,
    drums: [[0,10,9],[0,9,4],[0,5,9],[0,9,1],[0,10,9],[0,10,5],[0,2,9]],
    links: [{"from":1,"to":5,"step":-1},{"from":0,"to":4,"step":1},{"from":2,"to":3,"step":1}],
    clutches: [{"drum":3,"lane":3,"wire":2},{"drum":2,"lane":1,"wire":0}],
    contacts: [{"kind":"feed","at":7,"lane":0,"wire":2},{"kind":"feed","at":7,"lane":2,"wire":4},{"kind":"feed","at":6,"lane":3,"wire":1},{"kind":"isolate","at":5,"lane":4,"wire":1},{"kind":"match","at":3,"lane":3,"other":{"at":1,"lane":2}}],
    opening: [0,2,2,1,0,1,2]
  },
  {
    title: "先合哪道锁",
    lanes: 5,
    drums: [[0,4,8],[0,4,10],[0,9,1],[0,8,9],[0,9,2],[0,1,2],[0,5,4]],
    links: [{"from":2,"to":4,"step":-1},{"from":4,"to":6,"step":1},{"from":5,"to":6,"step":1}],
    clutches: [{"drum":2,"lane":3,"wire":4},{"drum":3,"lane":1,"wire":0}],
    contacts: [{"kind":"feed","at":7,"lane":3,"wire":1},{"kind":"feed","at":7,"lane":2,"wire":2},{"kind":"feed","at":1,"lane":4,"wire":4},{"kind":"isolate","at":2,"lane":2,"wire":3},{"kind":"match","at":4,"lane":0,"other":{"at":3,"lane":1}}],
    opening: [2,0,0,0,0,2,2]
  },
  {
    title: "不留暗线",
    lanes: 5,
    drums: [[0,8,10],[0,9,5],[0,9,5],[0,10,2],[0,5,1],[0,8,10],[0,5,4]],
    links: [{"from":5,"to":6,"step":-1},{"from":4,"to":6,"step":1},{"from":2,"to":6,"step":1}],
    clutches: [{"drum":5,"lane":1,"wire":0},{"drum":2,"lane":2,"wire":1}],
    contacts: [{"kind":"feed","at":7,"lane":2,"wire":2},{"kind":"feed","at":7,"lane":1,"wire":4},{"kind":"feed","at":1,"lane":4,"wire":3},{"kind":"isolate","at":5,"lane":0,"wire":0},{"kind":"match","at":3,"lane":1,"other":{"at":2,"lane":0}},{"kind":"feed","at":5,"lane":4,"wire":2}],
    opening: [0,1,0,0,0,0,2]
  },
  {
    title: "名字被擦掉的插口",
    lanes: 5,
    drums: [[0,4,1],[0,2,9],[0,8,10],[0,1,4],[0,1,8],[0,5,8],[0,2,10]],
    links: [{"from":4,"to":6,"step":-1},{"from":1,"to":4,"step":1},{"from":3,"to":5,"step":1}],
    clutches: [{"drum":6,"lane":0,"wire":1},{"drum":3,"lane":2,"wire":3}],
    contacts: [{"kind":"feed","at":7,"lane":1,"wire":0},{"kind":"feed","at":7,"lane":3,"wire":3},{"kind":"feed","at":4,"lane":2,"wire":0},{"kind":"isolate","at":2,"lane":4,"wire":3},{"kind":"match","at":6,"lane":4,"other":{"at":3,"lane":3}},{"kind":"feed","at":4,"lane":0,"wire":2}],
    opening: [2,2,2,2,2,2,0]
  },
  {
    title: "收起试灯",
    lanes: 5,
    drums: [[0,8,1],[0,2,4],[0,10,2],[0,2,8],[0,8,9],[0,1,10],[0,2,8]],
    links: [{"from":2,"to":5,"step":-1},{"from":3,"to":4,"step":1},{"from":1,"to":4,"step":1}],
    clutches: [{"drum":6,"lane":0,"wire":3},{"drum":3,"lane":3,"wire":2}],
    contacts: [{"kind":"feed","at":7,"lane":2,"wire":3},{"kind":"feed","at":7,"lane":3,"wire":4},{"kind":"feed","at":1,"lane":1,"wire":1},{"kind":"isolate","at":4,"lane":4,"wire":4},{"kind":"match","at":3,"lane":3,"other":{"at":2,"lane":4}},{"kind":"feed","at":5,"lane":4,"wire":2}],
    opening: [1,0,1,2,1,1,1]
  },
  {
    title: "所有线的去处",
    lanes: 5,
    drums: [[0,9,5],[0,8,10],[0,1,9],[0,5,2],[0,2,8],[0,9,8],[0,2,8],[0,10,5]],
    links: [{"from":4,"to":6,"step":-1},{"from":1,"to":2,"step":1},{"from":6,"to":7,"step":1}],
    clutches: [{"drum":2,"lane":1,"wire":2},{"drum":3,"lane":1,"wire":2}],
    contacts: [{"kind":"feed","at":8,"lane":0,"wire":4},{"kind":"feed","at":8,"lane":3,"wire":2},{"kind":"feed","at":3,"lane":1,"wire":0},{"kind":"isolate","at":7,"lane":4,"wire":1},{"kind":"match","at":6,"lane":3,"other":{"at":5,"lane":4}},{"kind":"feed","at":1,"lane":2,"wire":2}],
    opening: [2,0,2,2,2,0,2,2]
  },
];
