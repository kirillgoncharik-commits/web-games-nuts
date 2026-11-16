import type Phaser from 'phaser';
import type {Point} from '../room-data';
import {signals} from './lighting';

export type CombatCue='muzzle'|'wall'|'armour'|'hit'|'shield'|'charge'|'shutdown'|'ability'|'ready';

type Cue=Point&{kind:CombatCue;born:number;direction:number};
const color={
  muzzle:signals.shot,wall:signals.warning,armour:signals.shot,hit:signals.damage,
  shield:signals.energy,charge:signals.repair,shutdown:signals.warning,ability:signals.violet,ready:signals.energy
} satisfies Record<CombatCue,number>;
const lifetimes={muzzle:66,wall:126,armour:145,hit:130,shield:195,charge:210,shutdown:310,ability:240,ready:320};
const priorities={muzzle:0,wall:0,armour:1,hit:2,shield:3,charge:3,shutdown:3,ability:2,ready:2};

export class CombatEffects{
  private cues:Cue[]=[];
  private links:Array<{from:Point;to:Point;born:number}>=[];
  push(kind:CombatCue,point:Point,now:number,direction=1){
    this.cues=this.cues.filter(cue=>now-cue.born<lifetimes[cue.kind]);
    if(this.cues.length>=12){const victim=this.cues.findIndex(cue=>priorities[cue.kind]<=priorities[kind]);if(victim<0)return;this.cues.splice(victim,1);}
    this.cues.push({...point,kind,born:now,direction});
  }
  connect(from:Point,to:Point,now:number){if(this.links.length>=3)this.links.shift();this.links.push({from:{...from},to:{...to},born:now});}

  clear(){this.cues=[];this.links=[];}

  draw(graphics:Phaser.GameObjects.Graphics,now:number,reduced:boolean){
    graphics.clear();
    this.cues=this.cues.filter(cue=>now-cue.born<lifetimes[cue.kind]);
    for(const cue of this.cues){
      const progress=Math.max(0,(now-cue.born)/lifetimes[cue.kind]),alpha=.9*(1-progress);
      const x=Math.round(cue.x),y=Math.round(cue.y);
      if(cue.kind==='muzzle'){
        graphics.fillStyle(color.muzzle,alpha).fillRect(x-2,y-2,5,4);
        if(!reduced)graphics.lineStyle(1,color.muzzle,alpha).lineBetween(x,y,x+cue.direction*9,y);
      }else if(cue.kind==='armour'){
        const distance=reduced?4:4+progress*10;
        graphics.lineStyle(2,color.armour,alpha).lineBetween(x-cue.direction*distance,y-5,x,y).lineBetween(x,y,x-cue.direction*distance,y+5);
      }else if(cue.kind==='shield'){
        graphics.lineStyle(2,color.shield,alpha).strokeCircle(x,y,reduced?8:8+progress*9);
      }else if(cue.kind==='charge'||cue.kind==='ready'){
        const size=reduced?6:6+progress*8;
        graphics.lineStyle(2,color.charge,alpha).lineBetween(x-size,y,x+size,y).lineBetween(x,y-size,x,y+size);
      }else if(cue.kind==='ability'){
        graphics.lineStyle(2,color.ability,alpha);
        for(const offset of [-5,5]){const d=reduced?7:7+progress*13;graphics.lineBetween(x-cue.direction*d,y+offset-4,x-cue.direction*(d-5),y+offset).lineBetween(x-cue.direction*(d-5),y+offset,x-cue.direction*d,y+offset+4);}
      }else if(cue.kind==='hit'){
        const size=reduced?3:3+progress*5;
        graphics.lineStyle(2,color.hit,alpha).lineBetween(x-size,y-size,x+size,y+size).lineBetween(x-size,y+size,x+size,y-size);
      }else if(cue.kind==='wall'||cue.kind==='shutdown'){
        graphics.fillStyle(color[cue.kind],alpha);
        const distance=reduced?4:4+progress*(cue.kind==='shutdown'?21:11);
        for(let i=-1;i<=1;i++)graphics.fillRect(x-cue.direction*distance,y+i*distance,3,2);
        if(cue.kind==='shutdown'&&!reduced)graphics.lineStyle(1,color.shutdown,alpha*.6).strokeCircle(x,y,distance);
      }
    }
    this.links=this.links.filter(link=>now-link.born<650);
    for(const link of this.links){
      const p=Math.min(1,Math.max(0,(now-link.born)/500)),alpha=(1-(now-link.born)/650)*.8;
      const bendY=Math.min(link.from.y,link.to.y)-24;
      graphics.lineStyle(reduced?2:1,signals.energy,alpha).beginPath().moveTo(link.from.x,link.from.y).lineTo(link.from.x,bendY).lineTo(link.to.x,bendY).lineTo(link.to.x,link.to.y).strokePath();
      if(!reduced){const px=link.from.x+(link.to.x-link.from.x)*p;graphics.fillStyle(signals.energy,alpha).fillRect(Math.round(px)-3,bendY-2,6,4);}
      graphics.lineStyle(2,signals.energy,alpha).strokeRect(link.to.x-5,link.to.y-5,10,10);
    }
  }
}
