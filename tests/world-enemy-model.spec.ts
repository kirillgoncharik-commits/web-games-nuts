import {test,expect} from '@playwright/test';
import {createEnemy,stepEnemy,suspendEnemy,turretPresentation} from '../games/cinder-shift/src/enemies';
import {worldEnemyProfiles,worldShotOffset} from '../games/cinder-shift/src/world-enemies';
import {rooms,type EnemyMob} from '../games/cinder-shift/src/room-data';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {productionFrames} from '../games/cinder-shift/src/art/production-art';

for(const [name,p]of Object.entries(worldEnemyProfiles))test(`${name}: full warning, actual shots, recovery and safe suspension`,()=>{
 const mob=name as EnemyMob,e=createEnemy({id:'model-'+name,mob,kind:p.kind,preset:p.kind==='walker'?'walker_service':p.kind==='drone'?'drone_service':'turret_cycle',x:400,y:p.kind==='drone'?292:305,end:{x:400,y:p.kind==='drone'?292:305},activateX:0});
 const shots=new Projectiles(),floor=[{x:0,y:320,width:640,height:40}],player={x:180,y:288};let warned=0,recovered=false,firstShotAt=0;
 for(let time=0;time<7000;time+=20){stepEnemy(e,20,player,floor,shots,()=>warned++);if(shots.shots.length&&!firstShotAt)firstShotAt=time;if(e.attackPhase==='recovery'){recovered=true;break;}}
 expect(warned).toBe(1);expect(firstShotAt).toBeGreaterThanOrEqual(p.telegraph_ms);expect(shots.shots).toHaveLength(p.burst_count);expect(recovered).toBe(true);
 expect(e.cooldown).toBe(p.recovery_ms);if(e.kind==='turret')expect(turretPresentation(e).damageable).toBe(true);
 suspendEnemy(e);expect(e.active).toBe(false);expect(e.aimLocked).toBe(false);expect(e.attackPhase).toBeNull();
 for(const phase of ['idle','warning','attack','recovery','destroyed'])expect(productionFrames[name+'-'+phase]).toBeDefined();
});
test('all six families are deployed only in their respective worlds, with distinct firing patterns',()=>{
 const seen=new Set<string>();for(const r of Object.values(rooms))for(const e of r.enemies){if(r.world){expect(e.mob).toBeDefined();seen.add(e.mob!);expect(worldEnemyProfiles[e.mob!].kind).toBe(e.kind);expect(e.mob!.startsWith('crumb')||e.mob!.startsWith('lint')||e.mob!.startsWith('lidar')).toBe(r.id.startsWith('SW'));}else expect(e.mob).toBeUndefined();}
 expect([...seen].sort()).toEqual(Object.keys(worldEnemyProfiles).sort());
 expect([0,1,2].map(i=>worldShotOffset('signal-watcher',i))).toEqual([0,-.16,.16]);
 expect(worldShotOffset('lint-rotor',0)).toBeLessThan(0);expect(worldShotOffset('lint-rotor',1)).toBeGreaterThan(0);
});

for(const roomId of ['SW05-D','YU05-D'] as const){
 test(roomId+' guardian fires two different warned patterns before recovery',()=>{
  const room=rooms[roomId],def=room.enemies.find(enemy=>enemy.guardian)!;
  expect(def.afterEnemy).toBeTruthy();
  for(const half of [false,true]){
   const enemy=createEnemy(def),shots=new Projectiles();
   if(half)enemy.hp=Math.floor(enemy.hp/2);
   enemy.provoked=true;
   const player={x:enemy.x-76,y:enemy.y-12};
   let warnings=0;
   for(let t=0;t<9000&&enemy.attackPhase!=='recovery';t+=20)
    stepEnemy(enemy,20,player,room.solids,shots,()=>warnings++);
   expect(warnings).toBe(1);
   expect(enemy.attackPhase).toBe('recovery');
   expect(shots.shots.map(shot=>shot.source)).toEqual(Array(half?3:2).fill(def.guardian+'-shot'));
  }
 });
}
