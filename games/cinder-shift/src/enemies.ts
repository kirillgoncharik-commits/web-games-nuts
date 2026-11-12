import config from '../game.config.json' with {type:'json'};
import type {EnemyDefinition,EnemyKind,EnemyPreset,Rect,Point} from './room-data';
import {clearLine,intersects} from './geometry';
import type {Projectiles} from './projectiles';
export type Behavior='passive'|'aggressive';
export type EnemyAIState='idle'|'patrol'|'chase'|'attack'|'return'|'dead';
export type AttackPhase='telegraph'|'fire'|'recovery';
export const enemyPresets:Record<EnemyPreset,{kind:EnemyKind;behavior:Behavior}>={walker_service:{kind:'walker',behavior:'passive'},walker_security:{kind:'walker',behavior:'aggressive'},ram_charge:{kind:'walker',behavior:'passive'},drone_service:{kind:'drone',behavior:'passive'},turret_cycle:{kind:'turret',behavior:'passive'}};
export type EnemyState=EnemyDefinition&{behavior:Behavior;home:Point;hp:number;state:EnemyAIState;attackPhase:AttackPhase|null;phaseMs:number;cooldown:number;direction:number;shots:number;shotFlashMs:number;aim:Point;active:boolean;warnings:number;acquireMs:number;memoryMs:number;lastSeen:Point|null;noticeMs:number;stuckMs:number};
export function createEnemy(def:EnemyDefinition):EnemyState{
 const preset=enemyPresets[def.preset];if(!preset||preset.kind!==def.kind||def.kind==='turret'&&preset.behavior==='aggressive')throw Error('invalid_enemy_preset');
 return{...structuredClone(def),behavior:preset.behavior,home:{x:def.x,y:def.y},hp:config.combat[def.kind].hp,state:def.x===def.end.x&&def.y===def.end.y?'idle':'patrol',attackPhase:null,phaseMs:250,cooldown:0,direction:1,shots:0,shotFlashMs:0,aim:{x:def.x-320,y:def.y-17},active:false,warnings:0,acquireMs:0,memoryMs:0,lastSeen:null,noticeMs:0,stuckMs:0};
}
export const ramVulnerable=(enemy:EnemyState)=>enemy.preset!=='ram_charge'||enemy.hp<=0||enemy.state==='attack'&&enemy.attackPhase==='recovery';
export function enemyRect(e:EnemyState):Rect{return{x:e.x-13,y:e.y-(e.kind==='drone'?10:15),width:26,height:e.kind==='drone'?20:30};}
export type TurretPresentation='off'|'armored'|'warning'|'burst'|'exposed'|'destroyed';
export function turretPresentation(e:EnemyState,powered=true):{state:TurretPresentation;damageable:boolean}{
 if(e.hp<=0)return{state:'destroyed',damageable:false};if(!powered)return{state:'off',damageable:false};
 if(e.state==='attack'&&e.attackPhase==='telegraph')return{state:'warning',damageable:false};
 if(e.state==='attack'&&e.attackPhase==='fire')return{state:'burst',damageable:false};
 if(e.state==='attack'&&e.attackPhase==='recovery')return{state:'exposed',damageable:true};
 return{state:'armored',damageable:false};
}
export function enemyMuzzle(e:EnemyState,direction=Math.sign(e.aim.x-e.x)||-1):Point{
 if(e.kind==='walker')return{x:e.x+direction*17,y:e.y-17};
 if(e.kind==='drone')return{x:e.x,y:e.y};
 const angle=Math.atan2(e.aim.y-(e.y-17),e.aim.x-e.x);return{x:e.x+Math.cos(angle)*18,y:e.y-17+Math.sin(angle)*18};
}
// Compatibility diagnostics are derived; AI decisions have one state and one attack phase.
export const enemyPhase=(e:EnemyState)=>e.state==='attack'?(e.attackPhase==='fire'?'attack':e.attackPhase):e.state==='dead'?'dead':'patrol';
const hasRoute=(e:EnemyState)=>e.home.x!==e.end.x||e.home.y!==e.end.y;
function move(e:EnemyState,to:Point,speed:number,ms:number,solids:Rect[]){
 const dx=to.x-e.x,dy=e.kind==='drone'?to.y-e.y:0,dist=Math.hypot(dx,dy);if(dist<.2)return true;
 const amount=Math.min(dist,speed*ms/1000),next={x:e.x+dx/dist*amount,y:e.y+dy/dist*amount};
 if(e.kind==='walker'){
  if(e.leash)next.x=Math.max(e.leash.min,Math.min(e.leash.max,next.x));
  const rect={...enemyRect(e),x:next.x-13};
  const supported=solids.some(s=>next.x>=s.x&&next.x<=s.x+s.width&&Math.abs(s.y-(e.y+15))<2);
  if(!supported||solids.some(s=>intersects(rect,s)))return false;
 }else if(e.kind==='drone'&&solids.some(s=>intersects({...enemyRect(e),x:next.x-13,y:next.y-10},s)))return false;
 const moved=Math.abs(next.x-e.x)+Math.abs(next.y-e.y);e.x=next.x;e.y=next.y;e.direction=Math.sign(dx)||e.direction;return dist<=amount+.2||moved>.001;
}
function patrol(e:EnemyState,ms:number,solids:Rect[]){
 if(!hasRoute(e)){e.state='idle';return;}
 if(e.state==='idle'){e.phaseMs-=ms;if(e.phaseMs>0)return;e.state='patrol';}
 const destination=e.direction>0?e.end:e.home;
 if(Math.hypot(destination.x-e.x,e.kind==='drone'?destination.y-e.y:0)<1){e.direction*=-1;e.state='idle';e.phaseMs=250;return;}
 if(!move(e,destination,config.combat[e.kind].speed,ms,solids)){e.direction*=-1;e.state='idle';e.phaseMs=250;}
}
function recovery(e:EnemyState){e.attackPhase='recovery';e.cooldown=Math.max(e.cooldown,config.combat[e.kind].recovery_ms);e.phaseMs=0;}
function returnHome(e:EnemyState){if(e.state==='attack'&&e.attackPhase!=='recovery')recovery(e);e.state='return';e.attackPhase=null;e.acquireMs=0;e.lastSeen=null;e.memoryMs=0;e.stuckMs=0;}
export function suspendEnemy(e:EnemyState){
 if(e.hp<=0)return;
 if(e.state==='attack'&&e.attackPhase!=='recovery')recovery(e);
 e.active=false;e.lastSeen=null;e.acquireMs=0;e.memoryMs=0;e.noticeMs=0;e.attackPhase=null;e.state=e.behavior==='aggressive'?'return':hasRoute(e)?'patrol':'idle';
}
export function stepEnemy(e:EnemyState,ms:number,player:Point,solids:Rect[],shots:Projectiles,warn:(kind:string)=>void,telegraphScale=1,canActivate=true){
 if(e.hp<=0){e.state='dead';e.attackPhase=null;return;}
 if(!e.active){if(!canActivate||player.x<e.activateX)return;e.active=true;}
 const cfg=config.combat[e.kind],ai=config.m05b1.ai;
 e.shotFlashMs=Math.max(0,e.shotFlashMs-ms);
 const distance=Math.hypot(e.x-player.x,e.y-player.y),visible=distance<=cfg.range&&clearLine(enemyMuzzle(e),player,solids);
 e.cooldown=Math.max(0,e.cooldown-ms);e.noticeMs=Math.max(0,e.noticeMs-ms);
 if(e.state==='return'){
  if(Math.abs(e.x-e.home.x)<1&&Math.abs(e.y-e.home.y)<1){e.state=hasRoute(e)?'patrol':'idle';e.direction=1;e.phaseMs=250;return;}
  move(e,e.home,ai.chase_speed,ms,solids);return;
 }
 if(e.behavior==='aggressive'){
  if(visible&&distance<=ai.release_radius){e.lastSeen={...player};e.memoryMs=ai.memory_ms;}else e.memoryMs=Math.max(0,e.memoryMs-ms);
  if(e.state==='idle'||e.state==='patrol'){
   e.acquireMs=visible&&distance<=ai.detection_radius?e.acquireMs+ms:0;
   if(e.acquireMs+1e-6>=ai.acquire_ms){e.state='chase';e.noticeMs=250;e.stuckMs=0;}
  }
  if((e.state==='chase'||e.state==='attack')&&(distance>ai.release_radius||e.memoryMs<=0)){returnHome(e);return;}
 }
 const beginAttack=()=>{e.state='attack';e.attackPhase='telegraph';const teaching=e.first&&e.warnings===0;e.phaseMs=(e.kind==='walker'&&teaching?config.combat.walker.first_telegraph_ms:cfg.telegraph_ms)*Math.max(1,telegraphScale)*(e.kind==='turret'&&teaching?2:1);if(visible)e.aim={...player};e.warnings++;warn(e.kind);};
 if(e.state==='attack'){
    if(e.attackPhase==='telegraph'){
   if(e.behavior==='aggressive'&&(!visible||distance>ai.attack_release_radius)){recovery(e);return;}
   if(visible)e.aim={...player};e.phaseMs-=ms;
     if(e.phaseMs<=0){e.attackPhase='fire';e.phaseMs=e.preset==='ram_charge'?config.m05b2.ram_charge_ms:0;e.shots=0;}
  }else if(e.attackPhase==='fire'){
   if(e.preset==='ram_charge'){
    const min=e.charge?.min??Math.min(e.home.x,e.end.x),max=e.charge?.max??Math.max(e.home.x,e.end.x),target={x:Math.max(min,Math.min(max,e.aim.x)),y:e.y},moved=move(e,target,config.m05b2.ram_speed,ms,solids);
    e.phaseMs-=ms;if(!moved||Math.abs(e.x-target.x)<1||e.phaseMs<=0)recovery(e);
   }else{e.phaseMs-=ms;}
   if(e.preset!=='ram_charge'&&e.phaseMs<=0){
    const direction=Math.sign(e.aim.x-e.x)||-1,from=enemyMuzzle(e,direction);
    if(e.kind==='walker'){
     if(clearLine(from,{x:e.aim.x,y:from.y},solids))shots.fire(from,{x:direction*cfg.projectile_speed,y:0},'enemy','walker-shot');
    }else{
     const center={x:e.x,y:e.kind==='drone'?e.y:e.y-17},angle=Math.atan2(e.aim.y-center.y,e.aim.x-center.x)+(e.kind==='turret'?(e.shots-1)*.12:0),to={x:from.x+Math.cos(angle)*300,y:from.y+Math.sin(angle)*300};
     if(clearLine(from,{x:from.x+Math.cos(angle)*18,y:from.y+Math.sin(angle)*18},solids))shots.fire(from,{x:Math.cos(angle)*cfg.projectile_speed,y:Math.sin(angle)*cfg.projectile_speed},'enemy',e.kind+'-shot');
    }
    e.shotFlashMs=75;e.shots++;e.phaseMs='burst_interval_ms' in cfg?cfg.burst_interval_ms:0;if(e.shots>=cfg.burst_count)recovery(e);
   }
  }else if(e.cooldown<=0){e.attackPhase=null;e.state=e.behavior==='aggressive'?'chase':hasRoute(e)?'patrol':'idle';e.phaseMs=250;if(e.behavior==='passive')e.cooldown=cfg.patrol_ms;}
  return;
 }
 if(e.state==='chase'){
  if(visible&&distance<=ai.attack_radius&&e.cooldown<=0){beginAttack();return;}
  if(e.lastSeen&&(!visible||distance>ai.attack_radius)){
   const moved=move(e,e.lastSeen,ai.chase_speed,ms,solids);e.stuckMs=moved?0:e.stuckMs+ms;
   if(e.stuckMs>=ai.stuck_ms||!visible&&Math.abs(e.lastSeen.x-e.x)<2)returnHome(e);
  }
  return;
 }
 patrol(e,ms,solids);
 if(e.behavior==='passive'&&e.cooldown<=0)beginAttack();
}
