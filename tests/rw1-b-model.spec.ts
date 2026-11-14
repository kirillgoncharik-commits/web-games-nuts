import {test,expect} from '@playwright/test';
import {Campaign,newCampaign} from '../games/cinder-shift/src/session/campaign';
import {MissionAttempt} from '../games/cinder-shift/src/mission';
import {missions} from '../games/cinder-shift/src/session/missions';
import {planEvents,eventAllowed} from '../games/cinder-shift/src/session/events';
import {rooms} from '../games/cinder-shift/src/room-data';
import {createEnemy,enemyRect,stepEnemy,alertEnemyOnHit} from '../games/cinder-shift/src/enemies';
import {intersects} from '../games/cinder-shift/src/geometry';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {roomThreatCanActivate} from '../games/cinder-shift/src/session/threat-activation';
import config from '../games/cinder-shift/game.config.json' with {type:'json'};

function reactor(){const c=new Campaign(newCampaign(4));c.data.mission_id='reactor';return new MissionAttempt('mission',c.prepare());}

test('Airlock keeps seeded repair/shutter events while six required encounters precede the exit',()=>{
 expect(eventAllowed('E02','upper-shutter')).toBe(true);expect(eventAllowed('E03','repair-cache')).toBe(true);
 expect(planEvents(0).map(e=>e.event_id)).toEqual(['E02','E03']);
 const a=new MissionAttempt('mission'),seen:string[]=[];
 while(true){seen.push(a.current);expect(a.forwardExitOpen()).toBe(false);a.room().enemies.forEach(e=>e.hp=0);a.room().terminal=true;if(!a.definition().next)break;expect(a.forwardExitOpen()).toBe(true);a.current=a.definition().next!;}
 expect(seen).toEqual(['A','B','M1A','M1B','M1C','C']);expect(a.forwardExitOpen()).toBe(false);a.objective=true;expect(a.forwardExitOpen()).toBe(true);
});

test('upper Airlock salvage remains optional and pays once per attempt',()=>{
 const a=new MissionAttempt('mission');a.current='M1B';a.room().enemies.forEach(e=>e.hp=0);
 expect(a.forwardExitOpen()).toBe(true);const score=a.score;expect(a.chooseCache('salvage')).toBe(true);expect(a.score-score).toBe(config.m04.salvage_score);expect(a.chooseCache('salvage')).toBe(false);
 a.current='M1C';a.current='M1B';expect(a.room().cacheUsed).toBe(true);expect(new MissionAttempt('mission',a.entry).room('M1B').cacheUsed).toBe(false);
});

for(const circuit of ['cooling','isolation'] as const)test(`Reactor ${circuit} choice connects nine rooms and powers exactly one final threat`,()=>{
 const a=reactor(),seen:string[]=[];expect(a.toggleReactorPower()).toBe(false);
 while(true){
  seen.push(a.current);a.room().enemies.forEach(e=>e.hp=0);
  if(a.current==='M5A')a.room().terminal=true;
  if(a.current==='M5H'){expect(a.forwardExitOpen()).toBe(false);a.toggleReactorPower();if(circuit==='isolation')a.toggleReactorPower();}
  if(a.current==='M5I'){expect(a.definition().hazards![0].enabled).toBe(circuit==='isolation');expect(a.enemyPowered(a.room().enemies.find(e=>e.kind==='turret'))).toBe(circuit==='cooling');}
  if(a.current==='M5D'){expect(a.forwardExitOpen()).toBe(false);a.bossHp=0;}
  if(!a.definition().next)break;
  expect(a.forwardExitOpen(),a.current).toBe(true);a.current=a.definition().next!;
 }
 expect(seen).toEqual(missions.reactor.rooms);expect(a.forwardExitOpen()).toBe(false);a.objective=true;a.room().terminal=true;expect(a.forwardExitOpen()).toBe(true);
 const retry=new MissionAttempt('mission',a.entry);expect(retry.reactorRerouted).toBe(false);expect(retry.reactorCircuit).toBe('isolation');expect(retry.eventPlan).toEqual(a.eventPlan);
});

test('E06 is optional, spawns a supported ram outside solids, and grants the full first warning',()=>{
 const a=reactor();a.current='M5B';expect(a.eventPlan.some(e=>e.event_id==='E06')).toBe(true);a.room().enemies.forEach(e=>e.hp=0);
 expect(a.forwardExitOpen()).toBe(true);expect(a.chooseCache('challenge')).toBe(true);expect(a.chooseCache('challenge')).toBe(false);expect(a.forwardExitOpen()).toBe(false);
 const e=a.room().enemies.at(-1)!,body=enemyRect(e);expect(a.definition().solids.some(s=>intersects(body,s))).toBe(false);expect(a.definition().solids.some(s=>s.y===body.y+body.height&&s.x<=e.x&&s.x+s.width>=e.x)).toBe(true);
 stepEnemy(e,1000/60,{x:520,y:298},a.definition().solids,new Projectiles(),()=>{});
 expect(e.attackPhase).toBe('telegraph');expect(e.phaseMs).toBe(config.combat.walker.first_telegraph_ms);expect(e.shots).toBe(0);
});

for(const [room,first,second] of [['M1C','m1c-security','m1c-turret'],['M5G','m5g-security','m5g-drone'],['M5I','m5i-ram','m5i-turret']] as const)test(`${room} preserves its staged response under a distant impact`,()=>{
 const roster=rooms[room].enemies.map(createEnemy),e=roster.find(e=>e.id===second)!,p={x:64,y:298};alertEnemyOnHit(e,true);
 expect(roomThreatCanActivate(room,e,roster,p,rooms[room].solids)).toBe(false);roster.find(e=>e.id===first)!.hp=0;expect(roomThreatCanActivate(room,e,roster,p,rooms[room].solids)).toBe(true);
});

test('provoked security responds from outside pursuit radius with full acquisition and warning',()=>{
 const e=createEnemy(rooms.M1B.enemies[0]),shots=new Projectiles(),floor=[{x:0,y:320,width:640,height:40}],p={x:208,y:298};alertEnemyOnHit(e,true);
 for(let i=0;i<60&&e.attackPhase!=='telegraph';i++)stepEnemy(e,1000/60,p,floor,shots,()=>{});
 expect(e.attackPhase).toBe('telegraph');expect(e.phaseMs).toBe(config.combat.walker.telegraph_ms);expect(shots.shots).toHaveLength(0);
 const before=e.phaseMs;alertEnemyOnHit(e,true);expect(e.phaseMs).toBe(before);
 stepEnemy(e,1000/60,p,[...floor,{x:300,y:260,width:16,height:60}],shots,()=>{});expect(e.attackPhase).toBe('recovery');expect(shots.shots).toHaveLength(0);
});

test('every new enemy begins outside collision geometry without raising base HP',()=>{
 for(const id of ['M1A','M1B','M1C','M5F','M5G','M5I'] as const)for(const def of rooms[id].enemies){const e=createEnemy(def);expect(rooms[id].solids.some(s=>intersects(enemyRect(e),s)),id+':'+e.id).toBe(false);expect(e.hp).toBe(config.combat[e.kind].hp);}
});
