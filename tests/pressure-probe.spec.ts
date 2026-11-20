import {test,expect} from '@playwright/test';
import {createEnemy,stepEnemy} from '../games/cinder-shift/src/enemies';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {combatBalance,difficulties} from '../games/cinder-shift/src/session/difficulty';
import type {EnemyMob,EnemyKind} from '../games/cinder-shift/src/room-data';

const families:Record<EnemyKind,readonly (EnemyMob|undefined)[]>={
 walker:[undefined,'crumb-rover','relay-crawler'],
 drone:[undefined,'lint-rotor','induction-orb'],
 turret:[undefined,'lidar-guardian','signal-watcher'],
};
test('every enemy family increases sustained fire across worlds and difficulties',()=>{
 for(const kind of ['walker','drone','turret'] as const){
   const acrossModes=difficulties.map(difficulty=>['airlock','SW01','YU01'].map((mission,tier)=>{
     const x=400,y=kind==='walker' || kind==='turret'?305:292;
     const enemy=createEnemy({id:'probe',kind,mob:families[kind][tier],preset:kind==='walker'?'walker_service':kind==='drone'?'drone_service':'turret_cycle',x,y,end:{x,y},activateX:0});
     const ordnance=new Projectiles(),{aggression}=combatBalance(mission,difficulty);
     let fired=0;
     for(let t=0;t<120000;t+=20){
       stepEnemy(enemy,20,{x:240,y:292},[],ordnance,()=>{},1,true,aggression);
       fired+=ordnance.shots.length;ordnance.shots.length=0;
     }
     return fired/2;
   }));
   console.log(kind+' shots/min '+JSON.stringify(acrossModes));
   for(const row of acrossModes){expect.soft(row[1],kind+' C02').toBeGreaterThan(row[0]);expect.soft(row[2],kind+' C03').toBeGreaterThan(row[1]);}
   for(let world=0;world<3;world++)for(let mode=1;mode<3;mode++)expect.soft(acrossModes[mode][world],kind+' difficulty').toBeGreaterThan(acrossModes[mode-1][world]);
 }
});
