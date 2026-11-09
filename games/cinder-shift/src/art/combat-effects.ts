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

  draw(graphics:Phaser.GameObjects.Graphics,now:number,reduced:boolean){
    graphics.clear();
    this.cues=this.cues.filter(cue=>now-cue.born<lifetimes[cue.kind]);
    for(const cue of this.cues){
      const progress=Math.max(0,(now-cue.born)/lifetimes[cue.kind]),alpha=.9*(1-progress);
      const x=Math.round(cue.x),y=Math.round(cue.y);
      if(reduced){
        graphics.lineStyle(1,color[cue.kind],alpha).strokeRect(x-3,y-3,6,6);
      }else if(cue.kind==='muzzle'){
        graphics.fillStyle(color.muzzle,alpha).fillRect(x-2,y-2,5,4);
        graphics.lineStyle(1,color.muzzle,alpha).lineBetween(x,y,x+cue.direction*9,y);
      }else if(cue.kind==='wall'||cue.kind==='armour'||cue.kind==='shutdown'){
        graphics.fillStyle(color[cue.kind],alpha);
        const distance=4+progress*(cue.kind==='shutdown'?21:11);
        for(let i=-1;i<=1;i++)graphics.fillRect(x-cue.direction*distance,y+i*distance,3,2);
      }else{
        const size=cue.kind==='hit'?7:8+Math.round(progress*11);
        graphics.lineStyle(2,color[cue.kind],alpha).strokeRect(x-size/2,y-size/2,size,size);
      }
    }
  }
}
