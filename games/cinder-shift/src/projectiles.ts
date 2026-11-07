import type {Point,Rect} from './mission';
import {segmentRect,expand} from './geometry';
export type Shot={x:number;y:number;vx:number;vy:number;team:'player'|'enemy';source:string;pierces:number;hitIds:string[]};
export class Projectiles{
 shots:Shot[]=[];
 fire(origin:Point,velocity:Point,team:Shot['team'],source:string,pierces=0){if(this.shots.length<64)this.shots.push({...origin,vx:velocity.x,vy:velocity.y,team,source,pierces,hitIds:[]});}
 clear(){this.shots=[];}
 clearTeam(team:Shot['team']){this.shots=this.shots.filter(shot=>shot.team!==team);}
 step(ms:number,solids:Rect[],hit:(shot:Shot,from:Point,to:Point)=>boolean,piercePanel:(solid:Rect)=>void=()=>{}){
  const broken=new Set<string>();
  this.shots=this.shots.filter(s=>{
   const from={x:s.x,y:s.y},to={x:s.x+s.vx*ms/1000,y:s.y+s.vy*ms/1000};
   if(to.x<0||to.x>640||to.y<40||to.y>320)return false;
   for(const solid of solids){if(solid.id&&broken.has(solid.id)||!segmentRect(from,to,expand(solid,4,s.team==='player'?1.5:3)))continue;const id='solid:'+solid.id;if(solid.id&&s.hitIds.includes(id))continue;if(s.team==='player'&&s.pierces>0&&solid.material==='thin'&&solid.id){s.pierces--;s.hitIds.push(id);broken.add(solid.id);piercePanel(solid);}else return false;}
   s.x=to.x;s.y=to.y;return !hit(s,from,to);
  });
 }
}
