import config from '../game.config.json' with {type:'json'};
import type {EnemyState,Rect,Point} from './mission';
import {clearLine} from './geometry';
import type {Projectiles} from './projectiles';
export function enemyRect(e:EnemyState):Rect{return {x:e.x-13,y:e.y-(e.kind==='walker'?15:10),width:26,height:e.kind==='walker'?30:20};}
export function stepEnemy(e:EnemyState,ms:number,player:Point,solids:Rect[],shots:Projectiles,warn:(kind:string)=>void){
  if(e.hp<=0){e.phase='dead';return;}
  if(player.x>=e.activateX)e.activated=true;
  if(!e.activated)return;
  const cfg=config.combat[e.kind],origin=()=>({x:e.x,y:e.kind==='walker'?e.y-17:e.y});
  const target={x:player.x,y:player.y};
  const visible=Math.abs(e.x-player.x)<=cfg.range&&clearLine(origin(),target,solids);
  if(e.phase==='patrol'){
    e.remaining=Math.max(0,e.remaining-ms);
    const dest=e.direction>0?e.end:e.home;
    const dx=dest.x-e.x,dy=e.kind==='walker'?0:dest.y-e.y,dist=Math.hypot(dx,dy),amount=cfg.speed*ms/1000;
    if(dist<=amount)e.direction*=-1;else{e.x+=dx/dist*amount;e.y+=dy/dist*amount;}
    if(visible&&e.remaining<=0){e.phase='telegraph';e.remaining=e.kind==='walker'&&e.first&&e.warnings===0?config.combat.walker.first_telegraph_ms:cfg.telegraph_ms;e.aim=target;e.warnings++;warn(e.kind);}
  }else if(e.phase==='telegraph'){
    if(!visible){e.phase='patrol';return;}
    // During warning the marker follows; its final point is locked for the shot.
    e.aim=target;e.remaining-=ms;
    if(e.remaining<=0){e.phase='attack';e.shots=0;e.remaining=0;}
  }else if(e.phase==='attack'){
    e.remaining-=ms;
    if(e.remaining<=0){
      const from=origin();
      if(e.kind==='walker'){
        const dir=Math.sign(e.aim.x-e.x)||-1;
        if(clearLine(from,{x:e.aim.x,y:from.y},solids))shots.fire({...from,x:from.x+dir*17},{x:dir*cfg.projectile_speed,y:0},'enemy','walker-shot');
      }else{
        const dx=e.aim.x-e.x,dy=e.aim.y-e.y,len=Math.hypot(dx,dy)||1;
        if(clearLine(from,e.aim,solids))shots.fire(from,{x:dx/len*cfg.projectile_speed,y:dy/len*cfg.projectile_speed},'enemy','drone-shot');
      }
      e.shots++;e.remaining=e.kind==='walker'?config.combat.walker.burst_interval_ms:0;
      if(e.shots>=cfg.burst_count){e.phase='recovery';e.remaining=cfg.recovery_ms;}
    }
  }else if(e.phase==='recovery'){e.remaining-=ms;if(e.remaining<=0){e.phase='patrol';e.remaining=cfg.patrol_ms;}}
}
