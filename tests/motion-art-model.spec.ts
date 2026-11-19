import {test,expect} from '@playwright/test';
import {motionRigs,motionPalette,sampleMotion,motionSvg} from '../games/cinder-shift/src/art/motion-atlas';
import {WorldMotionArt} from '../games/cinder-shift/src/art/world-motion';
import {rooms} from '../games/cinder-shift/src/room-data';
import {createWorldState} from '../games/cinder-shift/src/session/world-runtime';
import type {RoomState} from '../games/cinder-shift/src/mission';

test('each new mission has an authored rig with finite editable geometry',()=>{
  expect(new Set(motionRigs.map(r=>r.mission)).size).toBe(10);
  for(const room of Object.values(rooms).filter(r=>r.world)){
    expect(motionRigs.filter(r=>r.mission===room.id.slice(0,4))).toHaveLength(1);
  }
  for(const rig of motionRigs)for(const part of rig.parts)for(const shape of part.shapes){
    expect([shape.x,shape.y,shape.width,shape.height].every(Number.isFinite)).toBe(true);
    expect(shape.width).toBeGreaterThan(0);expect(shape.height).toBeGreaterThan(0);
    expect(motionPalette[shape.color]).toMatch(/^#[\da-f]{6}$/);
  }
});
test('reduced motion and a paused clock preserve the exact resting pose',()=>{
  for(const rig of motionRigs){
    expect(motionSvg(rig,0,true)).toBe(motionSvg(rig,18720,true));
    expect(motionSvg(rig,1640)).toBe(motionSvg(rig,1640));
    expect(motionSvg(rig,0)).not.toBe(motionSvg(rig,1200));
  }
});
test('render cadence does not change poses at a shared simulation instant',()=>{
  for(const rig of motionRigs)for(const part of rig.parts){
    const run=(fps:number)=>{let result;for(let frame=0;frame<=fps*2;frame++)result=sampleMotion(part,frame*2000/(fps*2),rig.duration);return result;};
    expect(run(30)).toEqual(run(60));
    expect(sampleMotion(part,rig.duration,rig.duration)).toEqual(sampleMotion(part,0,rig.duration));
  }
});
function setup(id:'YU02-B'|'YU02-D'|'YU04-D'){
  const room=rooms[id],state={world:createWorldState(id,room.world!)} as RoomState;
  const layers:{calls:any[];object:any}[]=[];
  const scene={add:{graphics:()=>{const calls:any[]=[];let object:any;object=new Proxy({},{get:(_,method)=>(...args:any[])=>{calls.push([method,...args]);return object;}});layers.push({calls,object});return object;}}};
  return{state,layers,art:new WorldMotionArt(scene as any,room)};
}
test('rendering never mutates gameplay state and a repeat frame does not redraw the backdrop',()=>{
  const {art,state,layers}=setup('YU02-B'),before=structuredClone(state);
  art.render(state,800,false);const count=layers[0].calls.length;
  art.render(state,800,false);expect(layers[0].calls.length).toBe(count);
  art.render(state,960,false);expect(layers[0].calls.length).toBeGreaterThan(count);
  expect(state).toEqual(before);
});
test('restored progress has no phantom burst; real circuit changes emit near the used lever',()=>{
  const {art,state,layers}=setup('YU02-B');state.world!.phase=1;
  art.render(state,1000,false,552);expect(layers[1].calls.filter(c=>c[0]==='fillRect')).toHaveLength(0);
  state.world!.power!.circuit='B';art.render(state,1080,false,552);
  const flecks=layers[1].calls.filter(c=>c[0]==='fillRect');expect(flecks).toHaveLength(4);
  for(const [,x]of flecks)expect(Math.abs(x-552)).toBeLessThanOrEqual(18);
  layers[1].calls.length=0;art.render(state,1640,false,552);
  expect(layers[1].calls.filter(c=>c[0]==='fillRect')).toHaveLength(0);
});
test('reduced feedback retains a local confirmation without moving particles',()=>{
  const {art,state,layers}=setup('YU02-D');art.render(state,0,true);
  state.world!.phase=1;art.render(state,80,true);
  expect(layers[1].calls.filter(c=>c[0]==='strokeRect')).toHaveLength(1);
  expect(layers[1].calls.filter(c=>c[0]==='fillRect')).toHaveLength(0);
});
test('resetting the factory drive stops its authored flywheel while simulation continues',()=>{
  const {art,state,layers}=setup('YU04-D');state.world!.phase=1;art.render(state,800,false);
  const running=layers[0].calls.length;art.render(state,1040,false);expect(layers[0].calls.length).toBeGreaterThan(running);
  state.world!.phase=2;art.render(state,1120,false);const stopped=layers[0].calls.length,before=structuredClone(state);
  art.render(state,2400,false);art.render(state,4800,false);expect(layers[0].calls.length).toBe(stopped);expect(state).toEqual(before);
});
