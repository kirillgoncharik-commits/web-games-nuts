import {test,expect} from '@playwright/test';
import {Campaign,newCampaign} from '../games/cinder-shift/src/session/campaign';
import {MissionAttempt} from '../games/cinder-shift/src/mission';
import {stepEnemy,enemyRect,turretPresentation,alertEnemyOnHit,suspendEnemy} from '../games/cinder-shift/src/enemies';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {segmentRect,expand} from '../games/cinder-shift/src/geometry';

// Authored room geometry, ordinary Cutter cadence, and the real AI/projectile
// engines. This complements the browser checks; it does not prove UI behaviour.
for(const room of ['E','F'] as const)for(const revisit of [false,true])test(`${room}: authored turret fires and loses all HP${revisit?' after suspension':''}`,()=>{
 const campaign=new Campaign(newCampaign(4));campaign.data.mission_id='cargo';const entry=campaign.prepare();
 entry.event_plan=room==='F'?[{event_id:'E01',definition_version:2,room_id:'F',variant:'emergency-power'}]:[];
 const attempt=new MissionAttempt('mission',entry);attempt.current=room;if(room==='F')attempt.room().terminal=true;
 const enemy=attempt.room().enemies.find(e=>e.kind==='turret')!,shots=new Projectiles(),player={x:room==='E'?224:360,y:305},solids=attempt.definition().solids;
 if(revisit){stepEnemy(enemy,1000/60,player,solids,shots,()=>{});suspendEnemy(enemy);shots.clear();}
 let fired=false,exposed=false;
 for(let tick=0;tick<1200&&enemy.hp>0;tick++){
  stepEnemy(enemy,1000/60,player,solids,shots,()=>{});fired ||= shots.shots.some(s=>s.team==='enemy');exposed ||= turretPresentation(enemy,attempt.enemyPowered(enemy)).damageable;
  if(tick%30===0)shots.fire({x:player.x+19,y:player.y},{x:440,y:0},'player','cutter');
  shots.step(1000/60,solids,(shot,from,to)=>{
   if(shot.team!=='player'||!segmentRect(from,to,expand(enemyRect(enemy),4,1.5)))return false;
   alertEnemyOnHit(enemy,attempt.enemyPowered(enemy));if(turretPresentation(enemy,attempt.enemyPowered(enemy)).damageable)enemy.hp-=shot.damage;return true;
  });
 }
 expect(fired,'enemy projectile clears its authored muzzle').toBe(true);expect(exposed,'recovery exposes the armor').toBe(true);expect(enemy.hp,'grounded Cutter shots can destroy the turret').toBe(0);
});
