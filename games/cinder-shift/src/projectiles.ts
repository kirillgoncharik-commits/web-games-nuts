import type {Point,Rect} from './mission';
import {segmentRect,expand} from './geometry';
export type Shot={x:number;y:number;vx:number;vy:number;team:'player'|'enemy';source:string};
export class Projectiles{
  shots:Shot[]=[];
  fire(origin:Point,velocity:Point,team:Shot['team'],source:string){if(this.shots.length<64)this.shots.push({...origin,vx:velocity.x,vy:velocity.y,team,source});}
  clear(){this.shots=[];}
  step(ms:number,solids:Rect[],hit:(shot:Shot,from:Point,to:Point)=>boolean){
    this.shots=this.shots.filter(s=>{
      const from={x:s.x,y:s.y},to={x:s.x+s.vx*ms/1000,y:s.y+s.vy*ms/1000};
      if(to.x<0||to.x>640||to.y<40||to.y>320||solids.some(r=>segmentRect(from,to,expand(r,4,s.team==='player'?1.5:3))))return false;
      s.x=to.x;s.y=to.y;return !hit(s,from,to);
    });
  }
}
