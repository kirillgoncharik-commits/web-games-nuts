import {test,expect} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {intersects} from '../games/cinder-shift/src/geometry';
import {MissionAttempt,SimulationClock} from '../games/cinder-shift/src/mission';
import {loadout} from '../games/cinder-shift/src/session/research';
import {createKeyboardState,keyboardSolids,stepKeyboard,keyboardPhase} from '../games/cinder-shift/src/session/world-environment';

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
