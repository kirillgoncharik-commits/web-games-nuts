import {createEncounterState,encounterCompleted,stepEncounter,encounterSolids,encounterTiming,encounterThreat,syncEncounterStage,encounterThrowReserveMs} from '../games/cinder-shift/src/session/world-encounter';
import {test,expect} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {clearLine,intersects} from '../games/cinder-shift/src/geometry';
import {MissionAttempt,SimulationClock} from '../games/cinder-shift/src/mission';
import {loadout} from '../games/cinder-shift/src/session/research';
import {createKeyboardState,keyboardSolids,stepKeyboard,keyboardPhase,createPaperState,paperPhase,paperSolids,stepPaper,lampPhase,createClothState,clothSolid,stepCloth,createBridgeState,stepBridge,bridgeSolids,airPhase,airVelocity} from '../games/cinder-shift/src/session/world-environment';
import {createWorldState,stepWorld,actWorld,worldReady,worldSolids,stepWorldEnvironment,worldPulseHits,worldContext} from '../games/cinder-shift/src/session/world-runtime';

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


const cloth=rooms['SW03-B'].world!.cloth!;
test('cloth uses one deterministic collider, carries a rider and freezes when simulation time freezes',()=>{
 const s=createClothState();stepCloth(cloth,s,body(310,248),248,0,[]);
 const before=clothSolid(cloth,s);expect(stepCloth(cloth,s,body(310,248),248,1200,[])).toBe(true);
 expect(s.riderDx).toBeCloseTo(16);expect(clothSolid(cloth,s).x-before.x).toBeCloseTo(s.riderDx);
 const paused=structuredClone(s);stepCloth(cloth,s,body(326,248),248,1200,[]);expect(s.offset).toBe(paused.offset);expect(s.riderDx).toBe(0);
});
test('cloth waits before side collisions and never carries a rider into a wall',()=>{
 const s=createClothState();stepCloth(cloth,s,body(310,248),248,0,[]);
 expect(stepCloth(cloth,s,body(310,248),248,1200,[{x:330,y:190,width:16,height:58}])).toBe(false);
 expect(s.offset).toBe(0);expect(s.riderDx).toBe(0);
 const below=body(380,276);expect(stepCloth(cloth,s,below,276,2400,[])).toBe(false);expect(intersects(clothSolid(cloth,s),below)).toBe(false);
 stepCloth(cloth,s,body(100,320),320,2400,[]);expect(s.offset).toBe(32);expect(s.riderDx).toBe(0);
});
test('jumping releases the cloth instead of towing an airborne Mira',()=>{
 const s=createClothState();stepCloth(cloth,s,body(310,248),248,0,[]);
 stepCloth(cloth,s,body(310,248),248,1200,[],false);expect(s.offset).toBeCloseTo(16);expect(s.riderDx).toBe(0);
});
test('cloth cycles and reset stay identical at 30 and 60 render FPS',()=>{
 const run=(fps:number)=>{const s=createClothState(),clock=new SimulationClock(),positions:number[]=[];for(let f=0;f<fps*6;f++)clock.advance(1000/fps,()=>{stepCloth(cloth,s,body(64,320),320,clock.now,rooms['SW03-B'].solids);positions.push(s.offset);});return{s,positions};};expect(run(30)).toEqual(run(60));
 const entry={mission_id:'SW03' as const,seed:4,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:[]};
 const a=new MissionAttempt('mission',entry);stepCloth(cloth,a.room('SW03-B').world!.cloth!,body(64,320),320,0,[]);stepCloth(cloth,a.room('SW03-B').world!.cloth!,body(64,320),320,1200,[]);
 expect(a.definition('SW03-B').solids.find(s=>s.id?.startsWith('world-cloth:'))!.x).toBeCloseTo(296);
 expect(new MissionAttempt('mission',entry).room('SW03-B').world!.cloth).toEqual(createClothState());
});
test('a caught spool lowers a persistent strap only after the proposed surface is clear',()=>{
 const bridge=rooms['SW03-A'].world!.bridge!,s=createBridgeState();
 expect(stepBridge(bridge,s,false,body(64,320))).toBe(false);expect(bridgeSolids(bridge,s)).toEqual([]);
 expect(stepBridge(bridge,s,true,body(300,260))).toBe(false);expect(s.visible).toBe(false);
 expect(stepBridge(bridge,s,true,body(300,320))).toBe(true);expect(bridgeSolids(bridge,s)[0]).toMatchObject(bridge.platform);
 expect(stepBridge(bridge,s,true,body(300,242))).toBe(false);expect(s.visible).toBe(true);
});
test('gusts have quiet and warning phases, preserve crouch control and do not change vertical velocity',()=>{
 const air=rooms['SW03-C'].world!.air!,inside=body(320,320);
 expect(airPhase(air,0)).toBe('quiet');expect(airPhase(air,1600)).toBe('warning');expect(airVelocity(air,inside,1800)).toBe(0);
 expect(airPhase(air,2600)).toBe('gust');expect(airVelocity(air,inside,2600)).toBe(24);expect(airVelocity(air,inside,2600,false,true)).toBe(0);
 expect(airVelocity(air,body(100,320),2600)).toBe(0);expect(airPhase(air,4200)).toBe('quiet');expect(airPhase(air,2600,true)).toBe('closed');expect(airVelocity(air,inside,2600,true)).toBe(0);
 const balcony=rooms['SW04-A'].world!.air!;expect(airVelocity(balcony,body(320,320),3000)).toBe(0);expect(airVelocity(balcony,body(320,256),3000)).toBe(24);
});
test('closing the vent stops air, exposes the second contact after a short settle and never repeats the fragment',()=>{
 const spec=rooms['SW03-D'].world!,s=createWorldState('SW03-D',spec);let now=100;
 const tick=(time:number)=>stepWorld(spec,s,{x:228,y:320},1,time,16,rooms['SW03-D'].solids);
 tick(now);s.carry!.item.position={x:228,y:292};s.carry!.item.state='held';
 expect(actWorld(spec,s,{x:228,y:320},body(228,320),1,now)?.action).toBe('throw');
 while(!s.carry!.contacts[0].active&&now<1000){now+=16;tick(now);}
 expect(s.damperClosedAt).toBe(now);expect(airPhase(spec.air!,now,true)).toBe('closed');expect(s.carry!.contacts[1].open).toBe(false);
 tick(now+899);expect(s.carry!.contacts[1].open).toBe(false);tick(now+900);expect(s.carry!.contacts[1].open).toBe(true);
 s.carry!.item.state='held';actWorld(spec,s,{x:496,y:320},body(496,320),1,now+900);
 for(let n=0;n<60;n++)stepWorld(spec,s,{x:496,y:320},1,now+916+n*16,16,rooms['SW03-D'].solids);
 expect(worldReady(spec,s)).toBe(true);expect(s.carry!.ledger).toEqual(['damper-close-01','vent-fragment-02']);
 tick(now+10000);expect(s.carry!.ledger).toHaveLength(2);
});
test('rain gutter retains dry approaches, one lid contact and the full warning before a short water pulse',()=>{
 const room=rooms['SW04-C'],p=room.world!.pulse!;expect(p.kind).toBe('water');expect(p.warning).toBeGreaterThanOrEqual(1400);expect(p.active).toBeLessThan(1000);
 expect(room.world!.carry!.contacts).toHaveLength(1);expect(room.world!.carry!.kind).toBe('lid');expect(room.solids[0]).toMatchObject({x:0,y:320,width:640});
 for(const x of [p.x-24,p.x+p.width+24])expect(intersects(body(x,320),{x:p.x,y:274,width:p.width,height:46})).toBe(false);
});

test('laundry pegs leave a stable floor firing pocket before the moving cloth',()=>{
 const room=rooms['SW03-B'],enemy=room.enemies[0];
 // A baseline player needs a standing pocket, not a perch above a ground-level target.
 const pockets=Array.from({length:145},(_,i)=>32+i*4).filter(x=>Math.abs(x-enemy.x)>=60&&Math.abs(x-enemy.x)<=220
  &&room.solids.every(r=>r.y>=320||r.x>=x+20||r.x+r.width<=x-20)
  &&!intersects(body(x,320),clothSolid(cloth,createClothState()))
  &&clearLine({x:x+Math.sign(enemy.x-x)*19,y:292},{x:enemy.x,y:enemy.y},room.solids));
 expect(pockets.length).toBeGreaterThan(0);
});


const dock=rooms['SW01-D'].world!.encounter!;
test('dock phase has a complete warning, a real scan and a bounded safe throw window',()=>{
 const s=createEncounterState();stepEncounter(dock,s,0,body(64,320),320,100);
 expect(encounterTiming(dock,s,1599).phase).toBe('warning');expect(encounterTiming(dock,s,1600).phase).toBe('scan');
 expect(encounterTiming(dock,s,2300).phase).toBe('open');expect(encounterTiming(dock,s,4401).phase).toBe('closing');
 expect(encounterTiming(dock,s,5100).phase).toBe('warning');expect(encounterTiming(dock,s,4400).remaining).toBe(encounterThrowReserveMs);
 const solids=[...rooms['SW01-D'].solids,...encounterSolids(dock,s)];expect(encounterThreat(dock,s,body(200,320),1700,solids)).toBe(false);expect(encounterThreat(dock,s,body(400,320),1700,solids)).toBe(true);
 expect(encounterThreat(dock,s,body(400,280),1700,solids)).toBe(false);expect(encounterThreat(dock,s,body(400,320),1200,solids)).toBe(false);
});
test('changing encounter cover waits for a clear body and a rider without starting a hidden scan',()=>{
 const s=createEncounterState();stepEncounter(dock,s,0,body(64,320),320,100);
 expect(stepEncounter(dock,s,1,body(444,320),320,5000)).toBe(false);expect(s).toMatchObject({stage:1,solidStage:0,startedAt:null});expect(encounterTiming(dock,s,9000).phase).toBe('settling');
 expect(stepEncounter(dock,s,1,body(320,288),288,9100)).toBe(false);expect(s.solidStage).toBe(0);
 expect(stepEncounter(dock,s,1,body(380,320),320,9200)).toBe(true);expect(s).toMatchObject({stage:1,solidStage:1,startedAt:9200});expect(encounterTiming(dock,s,9200).phase).toBe('warning');
 expect(encounterSolids(dock,s)[0]).toMatchObject(dock.stages[1].cover);
});
test('encounter completion follows canonical contact IDs and an ordered prefix',()=>{
 expect(encounterCompleted(dock,[{id:'not-a-dock-contact',active:true}])).toBe(0);
 expect(encounterCompleted(dock,[{id:'dock-phase-03',active:true}])).toBe(0);
 expect(encounterCompleted(dock,[{id:'dock-phase-01',active:true},{id:'dock-phase-02',active:true},{id:'wrong',active:true}])).toBe(2);
});
for(const id of ['SW01-D','SW05-D'] as const)test(id+' earns three phases through actual throws and awards each original contact once',()=>{
 const room=rooms[id],spec=room.world!,s=createWorldState(id,spec);let now=0;
 const tick=(x:number)=>{stepWorldEnvironment(spec,s,body(x,320),320,now,[...room.solids,...worldSolids(spec,s)]);return stepWorld(spec,s,{x,y:320},1,now,16,[...room.solids,...worldSolids(spec,s)]);};
 for(const target of spec.encounter!.stages){
  const c=s.carry!.contacts.find(c=>c.id===target.contactId)!;
  const launch=[c.rect.x-54,c.rect.x+54].find(x=>room.solids.concat([target.cover]).every(r=>!intersects(body(x,320),r)))!;expect(launch).toBeDefined();
  for(let n=0;n<700&&!c.open;n++){now+=16;tick(launch);}expect(c.open).toBe(true);
  s.carry!.item.state='resting';s.carry!.item.position={x:launch,y:312};
  const facing=launch<c.rect.x?1:-1;expect(actWorld(spec,s,{x:launch,y:320},body(launch,320),facing,now)?.action).toBe('pickup');expect(actWorld(spec,s,{x:launch,y:320},body(launch,320),facing,now)?.action).toBe('throw');
  for(let n=0;n<60&&!c.active;n++){now+=16;tick(launch);}expect(c.active).toBe(true);expect(encounterTiming(spec.encounter!,s.encounter!,now).phase).toBe(s.phase===3?'complete':'settling');
 }
 expect(worldReady(spec,s)).toBe(true);expect(s.carry!.ledger).toEqual(spec.carry!.contacts.map(c=>c.id));
 for(let n=0;n<600;n++){now+=16;tick(64);}expect(s.carry!.ledger).toHaveLength(3);expect(encounterSolids(spec.encounter!,s.encounter!)).toEqual([]);
});
test('encounter cycles remain deterministic at 30 and 60 render FPS and reset on Retry',()=>{
 const run=(fps:number)=>{const s=createEncounterState(),clock=new SimulationClock(),phases:string[]=[];for(let n=0;n<fps*7;n++)clock.advance(1000/fps,()=>{stepEncounter(dock,s,0,body(64,320),320,clock.now);phases.push(encounterTiming(dock,s,clock.now).phase);});return{s,phases};};expect(run(30)).toEqual(run(60));
 const entry={mission_id:'SW01' as const,seed:4,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:[]},a=new MissionAttempt('mission',entry);syncEncounterStage(dock,a.room('SW01-D').world!.encounter!,2);
 expect(new MissionAttempt('mission',entry).room('SW01-D').world!.encounter).toEqual(createEncounterState());
});
test('all dock and beacon covers fit the base jump and leave their live contact clear',()=>{
 for(const id of ['SW01-D','SW05-D'] as const){const room=rooms[id];for(const stage of room.world!.encounter!.stages){
  expect(stage.cover.height).toBeLessThan(50);expect(room.solids.some(r=>intersects(stage.cover,r))).toBe(false);
  expect(intersects(stage.cover,room.world!.carry!.contacts.find(c=>c.id===stage.contactId)!.rect)).toBe(false);
  expect(stage.origin.y).toBe(stage.beam.y+stage.beam.height/2);expect(stage.openMs).toBeGreaterThan(encounterThrowReserveMs+1500);
 }}
});
test('the drawer latch opens only after the original contact and a fresh attempt restores its gate',()=>{
 const spec=rooms['SW01-A'].world!,s=createWorldState('SW01-A',spec);expect(worldSolids(spec,s).some(r=>r.id?.startsWith('world-latch:'))).toBe(true);
 s.carry!.item.state='resting';s.carry!.item.position={x:240,y:292};stepWorld(spec,s,{x:240,y:320},1,0,16,rooms['SW01-A'].solids);
 actWorld(spec,s,{x:240,y:320},body(240,320),1,0);actWorld(spec,s,{x:240,y:320},body(240,320),1,0);
 for(let n=1;n<=60;n++)stepWorld(spec,s,{x:240,y:320},1,n*16,16,rooms['SW01-A'].solids);
 expect(s.carry!.ledger).toEqual(['drawer-lock-01']);stepWorldEnvironment(spec,s,body(240,320),320,1000);expect(s.latch!.open).toBe(true);expect(worldSolids(spec,s).some(r=>r.id?.startsWith('world-latch:'))).toBe(false);
 expect(createWorldState('SW01-A',spec).latch!.open).toBe(false);
});
test('kitchen steam warns before rising and the lower shelter stays safe at both edges',()=>{
 const spec=rooms['SW01-B'].world!;
 expect(worldPulseHits(spec,body(304,320),1000)).toBe(false);expect(worldPulseHits(spec,body(304,320),1500)).toBe(true);
 expect(worldPulseHits(spec,{x:293,y:294,width:22,height:26},1500)).toBe(false);
 expect(worldPulseHits(spec,{x:260,y:294,width:22,height:26},1500)).toBe(false);expect(worldPulseHits(spec,{x:330,y:294,width:22,height:26},1500)).toBe(false);
 expect(worldPulseHits(spec,{x:293,y:290,width:22,height:26},1500)).toBe(true);
 expect(worldPulseHits(spec,body(304,244),1500)).toBe(true);expect(worldPulseHits(spec,body(360,320),1500)).toBe(false);
});

test('adjacent power switches and repair pockets choose the nearest eligible object',()=>{
 for(const id of ['YU02-C','YU03-C'] as const){
  const spec=rooms[id].world!,s=createWorldState(id,spec),point=spec.switches!.at(-1)!;
  expect(worldContext(spec,s,{x:point.x+4,y:320},0,true)).toBe('switch');
  expect(worldContext(spec,s,spec.repair!,0,true)).toBe('repair');
  expect(worldContext(spec,s,{x:point.x+4,y:320},0,false)).toBe('switch');
 }
 const spec=rooms['YU03-C'].world!,s=createWorldState('YU03-C',spec);expect(worldContext(spec,s,{x:556.57,y:320},0,true)).toBe('switch');expect(worldContext(spec,s,{x:568,y:320},0,true)).toBe('repair');
});
