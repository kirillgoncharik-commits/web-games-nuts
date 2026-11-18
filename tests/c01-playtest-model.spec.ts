import {test,expect} from '@playwright/test';
import config from '../games/cinder-shift/game.config.json' with {type:'json'};
import {experimentRoom,experimentActive,movementProfile,storageKey} from '../games/cinder-shift/src/playtest/profile';
import {rooms} from '../games/cinder-shift/src/room-data';
import {createEnemy,stepEnemy,enemyRect,turretPresentation,suspendEnemy,alertEnemyOnHit} from '../games/cinder-shift/src/enemies';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {segmentRect,expand} from '../games/cinder-shift/src/geometry';

test('baseline identity, isolated profiles and exact experiment boundary',()=>{
 expect(experimentRoom(rooms.A,'mission','airlock','A')).toBe(rooms.A);
 expect(experimentRoom(rooms.A,'mission','airlock','off')).toBe(rooms.A);
 expect(experimentRoom(rooms.B,'mission','airlock','B')).toBe(rooms.B);
 expect(experimentRoom(rooms.A,'training','airlock','B')).toBe(rooms.A);
 expect(experimentRoom(rooms.A,'mission','cargo','B')).toBe(rooms.A);
 expect(experimentActive('mission','airlock','B','B')).toBe(false);
 expect(new Set(['off','A','B'].map(v=>storageKey('cinder-shift-r01',v as any))).size).toBe(3);
 const original=structuredClone(config.movement);
 expect(movementProfile(false,false,config.movement)).toBe(config.movement);
 expect(movementProfile(true,false,config.movement).acceleration).toBe(1650);
 expect(movementProfile(true,true,config.movement).acceleration).toBe(1900);
 expect(config.movement).toEqual(original);
});
for(const revisit of [false,true])test(`A authored turret warns, fires and can be destroyed${revisit?' after reentry':''}`,()=>{
 const room=experimentRoom(rooms.A,'mission','airlock','B'),enemy=createEnemy(room.enemies.find(e=>e.kind==='turret')!),shots=new Projectiles(),player={x:452,y:292};
 if(revisit){stepEnemy(enemy,1000/60,player,room.solids,shots,()=>{});suspendEnemy(enemy);shots.clear();}
 let warned=false,fired=false,exposed=false;
 for(let tick=0;tick<1800&&enemy.hp>0;tick++){
  stepEnemy(enemy,1000/60,player,room.solids,shots,()=>{warned=true;});fired ||= shots.shots.some(s=>s.team==='enemy');exposed ||= turretPresentation(enemy).damageable;
  if(tick%15===0)shots.fire({x:471,y:292},{x:440,y:0},'player','cutter');
  shots.step(1000/60,room.solids,(shot,from,to)=>{if(shot.team!=='player'||!segmentRect(from,to,expand(enemyRect(enemy),4,1.5)))return false;alertEnemyOnHit(enemy,true);if(turretPresentation(enemy).damageable)enemy.hp-=shot.damage;return true;});
 }
 expect(warned).toBe(true);expect(fired).toBe(true);expect(exposed).toBe(true);expect(enemy.hp).toBe(0);
});
