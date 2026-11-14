import type Phaser from 'phaser';
import type {Point} from '../room-data';
import {signals} from './lighting';

export type CombatCue='muzzle'|'wall'|'armour'|'hit'|'shield'|'charge'|'shutdown';

type Cue=Point&{kind:CombatCue;born:number;direction:number};
const color={
  muzzle:signals.shot,wall:signals.warning,armour:signals.shot,hit:signals.damage,
  shield:signals.energy,charge:signals.repair,shutdown:signals.warning
} satisfies Record<CombatCue,number>;
const lifetimes={muzzle:66,wall:126,armour:145,hit:130,shield:195,charge:210,shutdown:310};

export class CombatEffects{
  private cues:Cue[]=[];
  push(kind:CombatCue,point:Point,now:number,direction=1){
    if(this.cues.length>=12)this.cues.shift();
    this.cues.push({...point,kind,born:now,direction});
  }

  clear(){this.cues=[];}

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
      }else if(cue.kind==='charge'){
        const size=reduced?6:6+progress*8;
        graphics.lineStyle(2,color.charge,alpha).lineBetween(x-size,y,x+size,y).lineBetween(x,y-size,x,y+size);
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
  }
}
