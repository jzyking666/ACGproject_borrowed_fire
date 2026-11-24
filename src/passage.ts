import { Simulation } from './engine';
import type { Cell } from './levels';

export type PassageOutcome = 'arrive' | 'standby' | 'complete' | 'hit' | 'blocked';
export interface PassageTrip {
  wait: number;
  time: number;
  outcome: PassageOutcome;
  place: Cell;
}
export interface PassageReport {
  target: string;
  path: Cell[];
  trips: PassageTrip[];
}

const directions: Cell[] = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
const distance = (a:Cell,b:Cell) => Math.hypot(a.x-b.x,a.y-b.y);
const pointKey = (p:Cell) => p.x+','+p.y;
const facing = (a:Cell,b:Cell): Cell => ({x:Math.sign(b.x-a.x), y:Math.sign(b.y-a.y)});

function inspectionCopy(sim:Simulation) {
  const copy=new Simulation(sim.level);
  copy.restore(sim.snapshot()); copy.invulnerable=sim.invulnerable;
  return copy;
}
function passagePath(live: Simulation, target: string): Cell[] {
  const copy = inspectionCopy(live);
  const start = {...live.player};
  const ready = (at:Cell, towards:Cell) => {
    if(target === 'exit') return distance(at,copy.level.exit) < .05;
    copy.player=at; copy.facing=towards;
    const fixture=copy.nearest;
    return typeof fixture === 'object' && fixture.id === target;
  };
  if (ready(start,live.facing)) return [start];
  // Find an orthogonal entrance to the integer tile grid from a freely moving character.
  // Up to four nearby cell centres are candidates. Keep the shorter of the two elbow routes.
  const clear = (a:Cell,b:Cell) => {
    const steps = Math.max(1,Math.ceil(distance(a,b)/.05));
    for (let i=1;i<=steps;i++) if (copy.collides(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps)) return false;
    return true;
  };
  type Entry = { p:Cell; direction:Cell; path:Cell[]; cost:number };
  const pending: Entry[] = [], best = new Map<string,number>();
  const add = (entry:Entry) => {
    // At the same standing tile two equidistant mirrors can be selected by facing.
    const key = pointKey(entry.p)+'/'+pointKey(entry.direction);
    if (entry.cost >= (best.get(key) ?? Infinity)-1e-8) return;
    best.set(key,entry.cost); pending.push(entry);
  };
  for (const x of new Set([Math.floor(start.x),Math.ceil(start.x)])) for(const y of new Set([Math.floor(start.y),Math.ceil(start.y)])) {
    const p={x,y}; if(copy.collides(x,y)) continue;
    for(const corner of [{x,y:start.y},{x:start.x,y}]) {
      if(!clear(start,corner)||!clear(corner,p)) continue;
      const path=[start];
      for(const waypoint of [corner,p]) if(distance(path.at(-1)!,waypoint)>.00001) path.push(waypoint);
      const dir=path.length>1?facing(path.at(-2)!,p):live.facing;
      add({p,direction:dir,path,cost:distance(start,corner)+distance(corner,p)});
    }
  }
  const blocked = new Set(copy.mirrors.map(pointKey));
  copy.level.walls.forEach(p=>blocked.add(pointKey(p)));
  while (pending.length) {
    let shortest=0;
    for(let i=1;i<pending.length;i++) if(pending[i].cost<pending[shortest].cost) shortest=i;
    const here=pending.splice(shortest,1)[0];
    if(ready(here.p,here.direction)) return here.path;
    for(const d of directions){
      const p={x:here.p.x+d.x,y:here.p.y+d.y};
      if(p.x<1||p.y<1||p.x>=copy.level.width-1||p.y>=copy.level.height-1||blocked.has(pointKey(p))) continue;
      add({p,direction:d,path:[...here.path,p],cost:here.cost+1});
    }
  }
  return [];
}

function trial(sim:Simulation, target:string, path:Cell[], wait:number): PassageTrip {
  const copy=inspectionCopy(sim), step=1/120, speed=3.2;
  let time=0;
  const finish=(outcome:PassageOutcome,place:Cell={...copy.player}):PassageTrip=>({wait,time,outcome,place});
  const advance = () => {
    copy.step(step); time+=step;
    const hit = copy.drainEvents().find(e=>e.type==='hit');
    if(hit) return finish('hit',{x:hit.x!,y:hit.y!});
    if(copy.won) return finish('complete');
  };
  for(let tick=0;tick<Math.round(wait/step);tick++) { const stop=advance(); if(stop) return stop; }
  for(const waypoint of path.slice(1)) {
    while(distance(copy.player,waypoint)>.00001) {
      const pos=copy.player;
      const x=pos.x,y=pos.y;
      const dx=waypoint.x-x, dy=waypoint.y-y, scale=Math.max(speed*step,Math.hypot(dx,dy));
      copy.move(dx/scale,dy/scale,step);
      const stop=advance(); if(stop) return stop;
      if(distance(copy.player,{x,y})<1e-9) return finish('blocked');
    }
  }
  if(target==='exit') return finish(copy.exitOpen?'arrive':'standby');
  const fixture=copy.nearest;
  return finish(typeof fixture==='object' && fixture.id===target?'arrive':'blocked');
}

/** Called only when the player requests a walk to a particular fixture. Both departure
 * strategies use the exact same path, pulse/timer state, collision rules and walking speed. */
export function passageReport(sim:Simulation,target:string):PassageReport|undefined {
  if(!sim.level.commission || sim.won || sim.carried || target!=='exit' && !sim.mirrors.some(m=>m.id===target && !m.fixed)) return;
  const path=passagePath(sim,target);
  return {target,path,trips:path.length?[trial(sim,target,path,0),trial(sim,target,path,1)]:[]};
}
