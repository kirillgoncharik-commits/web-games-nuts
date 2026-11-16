import {test,expect} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {createEnemy,stepEnemy,alertEnemyOnHit,guardVulnerable,aimedGuardRules,suspendEnemy} from '../games/cinder-shift/src/enemies';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {segmentRect} from '../games/cinder-shift/src/geometry';
import {roomThreatCanActivate} from '../games/cinder-shift/src/session/threat-activation';
import config from '../games/cinder-shift/game.config.json' with {type:'json'};

const dt=1000/60,floor=[{x:0,y:320,width:640,height:40}],crouched={x:230,y:307};
function guard(){const e=createEnemy(rooms.M4H.enemies[0]);alertEnemyOnHit(e,true);return e;}
function advanceUntil(e:ReturnType<typeof guard>,shots:Projectiles,condition:()=>boolean,player=crouched){
 for(let i=0;i<500&&!condition();i++)stepEnemy(e,dt,player,floor,shots,()=>{});
 expect(condition()).toBe(true);
}

test('the late marksman protects its approach and gives a full locked-aim response before opening armor',()=>{
 const e=guard(),shots=new Projectiles();expect(guardVulnerable(e)).toBe(false);
 advanceUntil(e,shots,()=>e.attackPhase==='telegraph');
 expect(e.phaseMs).toBe(aimedGuardRules.warningMs);expect(shots.shots).toHaveLength(0);
 advanceUntil(e,shots,()=>e.aimLocked);
 expect(e.phaseMs).toBeGreaterThanOrEqual(aimedGuardRules.lockMs-dt);expect(guardVulnerable(e)).toBe(false);
 const locked={...e.aim};
 advanceUntil(e,shots,()=>shots.shots.length>0,{x:230,y:240});
 expect(e.aim).toEqual(locked);expect(guardVulnerable(e)).toBe(true);expect(e.cooldown).toBe(aimedGuardRules.recoveryMs);
 const shot=shots.shots[0],flight=(locked.x-shot.x)/shot.vx;
 expect(shot.source).toBe('security-aimed-shot');expect(flight).toBeGreaterThan(0);
 expect(shot.y+shot.vy*flight).toBeCloseTo(locked.y,6);
 expect(segmentRect(shot,{x:locked.x,y:locked.y},{x:219,y:294,width:22,height:26})).toBe(true);
 expect(segmentRect(shot,{x:locked.x,y:locked.y},{x:219,y:218,width:22,height:44})).toBe(false);
 expect(e.hp).toBe(config.combat.walker.hp);
});

test('breaking sight cancels the aimed shot and leaves a reachable counter window',()=>{
 const e=guard(),shots=new Projectiles();advanceUntil(e,shots,()=>e.aimLocked);
 stepEnemy(e,dt,crouched,[...floor,{x:300,y:270,width:16,height:50}],shots,()=>{});
 expect(e.attackPhase).toBe('recovery');expect(e.aimLocked).toBe(false);expect(guardVulnerable(e)).toBe(true);expect(shots.shots).toHaveLength(0);
});

test('ordinary security retains horizontal shots and all non-marksman damage contracts',()=>{
 const e=createEnemy(rooms.M4B.enemies[0]),shots=new Projectiles();alertEnemyOnHit(e,true);
 advanceUntil(e,shots,()=>shots.shots.length>0);
 expect(shots.shots[0].source).toBe('walker-shot');expect(shots.shots[0].vy).toBe(0);expect(guardVulnerable(e)).toBe(true);
});

test('the raised drone waits for marksman defeat and suspension clears its locked aim',()=>{
 const roster=rooms.M4H.enemies.map(createEnemy),[marksman,drone]=roster,shots=new Projectiles();alertEnemyOnHit(marksman,true);
 advanceUntil(marksman,shots,()=>marksman.aimLocked);
 expect(roomThreatCanActivate('M4H',drone,roster,{x:400,y:220},rooms.M4H.solids)).toBe(false);
 suspendEnemy(marksman);expect(marksman.aimLocked).toBe(false);expect(marksman.attackPhase).toBeNull();
 marksman.hp=0;expect(roomThreatCanActivate('M4H',drone,roster,{x:400,y:220},rooms.M4H.solids)).toBe(true);
});

test('the marksman fires from its authored leash without requiring the player to provoke it',()=>{
 const e=createEnemy(rooms.M4H.enemies[0]),shots=new Projectiles();
 advanceUntil(e,shots,()=>e.attackPhase==='telegraph',{x:211,y:307});
 expect(e.provoked).toBe(false);expect(e.x).toBeGreaterThanOrEqual(e.leash!.min);expect(e.phaseMs).toBe(aimedGuardRules.warningMs);
});
