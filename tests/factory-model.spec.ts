import {test,expect} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {createWorldState,actWorld,powerTarget,worldSolids,worldPhaseDoors,worldReady,worldPulse,worldPulseHits,stepWorldEnvironment} from '../games/cinder-shift/src/session/world-runtime';
import {switchCircuit} from '../games/cinder-shift/src/session/world-mechanics';
import {intersects} from '../games/cinder-shift/src/geometry';
import {MissionAttempt} from '../games/cinder-shift/src/mission';
import {loadout} from '../games/cinder-shift/src/session/research';
const body=(x:number,y:number)=>({x:x-11,y:y-44,width:22,height:44});

test('factory first show is safe and both circuits keep a permanent upper walkway',()=>{
 const room=rooms['YU04-A'],spec=room.world!,s=createWorldState(room.id,spec),fixed=structuredClone(room.solids);
 expect(room.enemies.map(e=>e.kind)).toEqual(['walker','drone']);expect(room.enemies.every(e=>e.activateX>112)).toBe(true);expect(spec.pulse).toBeUndefined();expect(spec.powerField).toBeUndefined();
 expect(worldSolids(spec,s).find(r=>r.id==='world-power:belt-A')).toMatchObject({x:264,y:272,height:48});
 expect(actWorld(spec,s,{x:112,y:320},body(112,320),1,100)?.action).toBe('switch');
 expect(worldSolids(spec,s).some(r=>r.id==='world-power:belt-A')).toBe(false);expect(room.solids).toEqual(fixed);
 // The stopped-belt ground lane must not end in a low step under the walkway lip.
 const upper=room.solids.find(r=>r.y===256&&r.width>100)!;const lane={x:upper.x+upper.width,y:276,width:552-upper.x-upper.width,height:44};
 expect([...room.solids,...worldSolids(spec,s)].some(r=>intersects(lane,r))).toBe(false);
 expect(room.cache).toMatchObject({x:328,y:256});
 expect(actWorld(spec,s,{x:552,y:320},body(552,320),1,200)?.ids).toEqual(['belt:phase-0']);expect(worldReady(spec,s)).toBe(true);
});
test('hoist feed is earned on the lowered platform and the far lever is before the exit door',()=>{
 const room=rooms['YU04-B'],spec=room.world!,s=createWorldState(room.id,spec);
 actWorld(spec,s,{x:112,y:320},body(112,320),1,100);
 expect(actWorld(spec,s,{x:300,y:320},body(300,320),1,200)).toBeNull();
 expect(actWorld(spec,s,{x:300,y:280},body(300,280),1,200)?.ids).toEqual(['hoist:phase-0']);
 expect(switchCircuit(s.power!,body(300,280))).toBe(false);
 expect(spec.switches![1].x).toBeLessThan(532-11);
 actWorld(spec,s,{x:480,y:320},body(480,320),1,300);
 expect(worldSolids(spec,s).some(r=>r.id==='world-power:hoist-door-B')).toBe(false);
 expect(actWorld(spec,s,{x:552,y:320},body(552,320),1,400)?.ids).toEqual(['hoist:phase-1']);expect(worldReady(spec,s)).toBe(true);
});
test('distributor connects the real upper island before its separate lower feed',()=>{
 const spec=rooms['YU04-C'].world!,s=createWorldState('YU04-C',spec);
 actWorld(spec,s,{x:112,y:320},body(112,320),1,100);
 expect(actWorld(spec,s,{x:340,y:320},body(340,320),1,200)).toBeNull();
 expect(actWorld(spec,s,{x:340,y:244},body(340,244),1,200)?.ids).toEqual(['feed:phase-0']);
 actWorld(spec,s,{x:432,y:320},body(432,320),1,300);
 expect(actWorld(spec,s,{x:552,y:320},body(552,320),1,400)?.ids).toEqual(['feed:phase-1']);expect(worldReady(spec,s)).toBe(true);
});
test('drive first contact releases a physical screen and starts a full fresh warning',()=>{
 const spec=rooms['YU04-D'].world!,s=createWorldState('YU04-D',spec);
 stepWorldEnvironment(spec,s,body(64,320),320,20000);
 expect(worldPulse(spec,20000,s)).toBe('safe');expect(s.pulseStartedAt).toBeNull();expect(worldPhaseDoors(spec,s)).toHaveLength(2);
 actWorld(spec,s,{x:112,y:320},body(112,320),1,20000);
 expect(actWorld(spec,s,{x:264,y:320},body(264,320),1,20100)).toBeNull();
 expect(actWorld(spec,s,{x:264,y:288},body(264,288),1,20100)).toMatchObject({action:'activate',ids:['drive:phase-0'],geometry:true});
 expect(worldPhaseDoors(spec,s).map(r=>r.id)).toEqual(['world-phase:c03-adriatic-1986:YU04-D:drive-shield']);
 expect(s.pulseStartedAt).toBe(20100);expect(worldPulse(spec,21699,s)).toBe('warning');expect(worldPulse(spec,21700,s)).toBe('active');
 for(const x of [264,408,416,552])expect(worldPulseHits(spec,body(x,320),21700,s)).toBe(false);
 expect(worldPulseHits(spec,body(352,320),21700,s)).toBe(true);
});
test('reset stops the drive and removes its second screen; routing the exit earns each stable ID once',()=>{
 const spec=rooms['YU04-D'].world!,s=createWorldState('YU04-D',spec);
 actWorld(spec,s,{x:112,y:320},body(112,320),1,20000);actWorld(spec,s,{x:264,y:288},body(264,288),1,20100);
 actWorld(spec,s,{x:416,y:320},body(416,320),1,20200);
 expect(actWorld(spec,s,{x:408,y:320},body(408,320),1,21700)).toBeNull();
 expect(actWorld(spec,s,{x:408,y:320},body(408,320),1,22500)).toMatchObject({ids:['drive:phase-1'],geometry:true});
 expect(worldPhaseDoors(spec,s)).toHaveLength(0);expect(worldPulse(spec,26300,s)).toBe('safe');expect(worldPulseHits(spec,body(352,320),26300,s)).toBe(false);
 actWorld(spec,s,{x:416,y:320},body(416,320),1,22600);actWorld(spec,s,{x:552,y:320},body(552,320),1,22700);
 expect(s.ledger).toEqual(['drive:phase-0','drive:phase-1','drive:phase-2']);expect(worldReady(spec,s)).toBe(true);
 actWorld(spec,s,{x:552,y:320},body(552,320),1,22800);expect(s.ledger).toHaveLength(3);
});
test('all factory switches and earned contact bodies fit the actual configured colliders',()=>{
 for(const id of ['YU04-A','YU04-B','YU04-C','YU04-D'] as const){const room=rooms[id],spec=room.world!,s=createWorldState(id,spec);
  for(const circuit of ['A','B'] as const){s.power!.circuit=circuit;for(const p of spec.switches!)expect([...room.solids,...worldSolids(spec,s)].some(r=>intersects(body(p.x,p.y),r)),id+' '+circuit).toBe(false);}
  for(let phase=0;phase<spec.sequence!.length;phase++){s.phase=phase;s.power!.circuit=spec.sequence![phase];const p=powerTarget(spec,s)!;expect([...room.solids,...worldSolids(spec,s)].some(r=>intersects(body(p.x,p.y),r)),id+' '+phase).toBe(false);}
 }
});
test('factory phase geometry survives a restored state and Retry starts a fresh drive',()=>{
 const entry={mission_id:'YU04' as const,seed:4,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:[]};
 const a=new MissionAttempt('mission',entry),spec=rooms['YU04-D'].world!,s=a.room('YU04-D').world!;
 actWorld(spec,s,{x:112,y:320},body(112,320),1,100);actWorld(spec,s,{x:264,y:288},body(264,288),1,200);
 const restored=structuredClone(s);expect(worldSolids(spec,restored)).toEqual(worldSolids(spec,s));expect(restored.ledger).toEqual(['drive:phase-0']);
 expect(new MissionAttempt('mission',entry).room('YU04-D').world).toEqual(createWorldState('YU04-D',spec));
});
