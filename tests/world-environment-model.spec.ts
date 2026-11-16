import {test,expect} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {intersects} from '../games/cinder-shift/src/geometry';
import {MissionAttempt,SimulationClock} from '../games/cinder-shift/src/mission';
import {loadout} from '../games/cinder-shift/src/session/research';
import {createKeyboardState,keyboardSolids,stepKeyboard,keyboardPhase,createPaperState,paperPhase,paperSolids,stepPaper,lampPhase} from '../games/cinder-shift/src/session/world-environment';
import {createWorldState,stepWorld,actWorld,worldReady} from '../games/cinder-shift/src/session/world-runtime';

const spec=rooms['SW02-A'].world!.keyboard!;
const body=(x:number,feet:number)=>({x:x-11,y:feet-44,width:22,height:44});
test('standing on the first key lowers the second and release restores both physical surfaces',()=>{
 const state=createKeyboardState(),before=keyboardSolids(spec,state);expect(stepKeyboard(spec,state,body(192,296),296,100)).toBe(true);
 const down=keyboardSolids(spec,state);expect(down[0].y-before[0].y).toBe(4);expect(down[1].y-before[1].y).toBe(16);expect(down.map(r=>r.y+r.height)).toEqual([320,320]);
 expect(stepKeyboard(spec,state,body(192,300),300,200)).toBe(false);expect(state.releaseAt).toBe(200+spec.returnDelayMs);
 stepKeyboard(spec,state,body(240,320),320,250);expect(keyboardPhase(state,1900)).toBe('returning');expect(state.lowered).toBe(true);
 stepKeyboard(spec,state,body(240,320),320,2001);expect(keyboardSolids(spec,state)).toEqual(before);expect(keyboardPhase(state,2001)).toBe('ready');
});
test('a returning key waits for Mira instead of raising through her body',()=>{
 const state=createKeyboardState();stepKeyboard(spec,state,body(192,296),296,100);const onSecond=body(304,288);
 stepKeyboard(spec,state,onSecond,288,3000);expect(state.lowered).toBe(true);expect(intersects(onSecond,keyboardSolids(spec,state)[1])).toBe(false);
 stepKeyboard(spec,state,body(304,268),268,3017);expect(state.lowered).toBe(false);expect(intersects(body(304,268),keyboardSolids(spec,state)[1])).toBe(false);
});
test('keyboard cycles use the simulation clock at both render rates',()=>{
 const run=(fps:number)=>{const state=createKeyboardState(),clock=new SimulationClock(),samples:number[]=[];for(let f=0;f<fps*4;f++)clock.advance(1000/fps,()=>{const feet=clock.now<600?(state.pressed?300:296):320;stepKeyboard(spec,state,body(clock.now<600?192:240,feet),feet,clock.now);samples.push(keyboardSolids(spec,state)[1].y);});return{state,samples};};expect(run(30)).toEqual(run(60));
});
test('the real room definition consumes key geometry and a fresh attempt resets the mechanism',()=>{
 const entry={mission_id:'SW02' as const,seed:4,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:[]},attempt=new MissionAttempt('mission',entry);
 const state=attempt.room().world!.keyboard!;stepKeyboard(spec,state,body(192,296),296,100);expect(attempt.definition().solids.find(s=>s.id?.endsWith(':target'))?.y).toBe(288);
 attempt.suspend();expect(state.lowered).toBe(true);expect(attempt.room().world!.ledger).toEqual([]);
 const retry=new MissionAttempt('mission',entry);expect(retry.room().world!.keyboard).toEqual(createKeyboardState());expect(retry.definition().solids.find(s=>s.id?.endsWith(':target'))?.y).toBe(272);
});

const paper=rooms['SW02-C'].world!.paper!;
test('printer warns, extends a real surface, warns before returning and keeps its lower bypass',()=>{
 const s=createPaperState(),outside=body(230,320);
 stepPaper(paper,s,outside,320,500);expect(paperPhase(paper,s,500)).toBe('warning');expect(paperSolids(paper,s)).toEqual([]);
 expect(stepPaper(paper,s,outside,320,1500)).toBe(true);expect(paperSolids(paper,s)[0]).toMatchObject(paper.platform);
 stepPaper(paper,s,outside,320,4100);expect(paperPhase(paper,s,4100)).toBe('returning');expect(s.visible).toBe(true);
 stepPaper(paper,s,outside,320,4800);expect(paperPhase(paper,s,4800)).toBe('idle');expect(s.visible).toBe(false);
 expect(rooms['SW02-C'].world!.pulse).toBeUndefined();expect(rooms['SW02-C'].solids[0]).toMatchObject({x:0,y:320,width:640});
});
test('paper neither materializes through Mira nor withdraws under a rider',()=>{
 const s=createPaperState();stepPaper(paper,s,body(320,260),260,0);stepPaper(paper,s,body(320,260),260,1100);expect(s.visible).toBe(false);
 stepPaper(paper,s,body(230,320),320,1200);expect(s.visible).toBe(true);
 stepPaper(paper,s,body(320,244),244,4400);expect(s).toMatchObject({visible:true,waitingForMira:true});expect(paperPhase(paper,s,4400)).toBe('held');
 stepPaper(paper,s,body(400,320),320,4450);expect(s.visible).toBe(false);
});
test('paper uses fixed simulation time and Retry resets its cycle',()=>{
 const run=(fps:number)=>{const s=createPaperState(),clock=new SimulationClock(),samples:boolean[]=[];for(let f=0;f<fps*6;f++)clock.advance(1000/fps,()=>{stepPaper(paper,s,body(230,320),320,clock.now);samples.push(s.visible);});return{state:s,samples};};expect(run(30)).toEqual(run(60));
 const a=new MissionAttempt('mission',{mission_id:'SW02',seed:4,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:[]});
 stepPaper(paper,a.room('SW02-C').world!.paper!,body(230,320),320,0);stepPaper(paper,a.room('SW02-C').world!.paper!,body(230,320),320,1200);
 expect(a.definition('SW02-C').solids.some(r=>r.id?.startsWith('world-paper:'))).toBe(true);
 const retry=new MissionAttempt('mission',a.entry);expect(retry.room('SW02-C').world!.paper).toEqual(createPaperState());
});
test('lamp requires a fresh scan for each reflector position and awards each contact once',()=>{
 const spec=rooms['SW02-D'].world!,s=createWorldState('SW02-D',spec);let now=0;
 const tick=(time:number)=>stepWorld(spec,s,{x:330,y:320},1,time,16,[]);
 tick(now);expect(lampPhase(spec.lamp!,s.lamp!,now)).toBe('warning');expect(s.carry!.contacts[0].open).toBe(false);
 tick(950);expect(lampPhase(spec.lamp!,s.lamp!,950)).toBe('scanning');expect(s.carry!.contacts[0].open).toBe(false);
 for(const c of s.carry!.contacts){
  now=s.lamp!.startedAt!+1850;tick(now);expect(c.open).toBe(true);
  const x=c.rect.x-54;s.carry!.item.state='resting';s.carry!.item.position={x,y:312};
  expect(actWorld(spec,s,{x,y:320},body(x,320),1,now)?.action).toBe('pickup');expect(actWorld(spec,s,{x,y:320},body(x,320),1,now)?.action).toBe('throw');
  for(let n=0;n<60&&!c.active;n++){now+=16;tick(now);}
  expect(c.active).toBe(true);expect(lampPhase(spec.lamp!,s.lamp!,now)).toBe('warning');expect(s.carry!.contacts.every(c=>!c.open)).toBe(true);
 }
 expect(worldReady(spec,s)).toBe(true);expect(s.carry!.ledger).toEqual(['desktop-line-01','desktop-line-02']);tick(now+10000);expect(s.carry!.ledger).toHaveLength(2);
});
