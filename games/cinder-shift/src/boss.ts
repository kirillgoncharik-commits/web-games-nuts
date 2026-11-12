import config from '../game.config.json' with {type:'json'};
import type {Point,Rect} from './room-data';
import {segmentRect} from './geometry';

export const regulatorRules=Object.freeze({
 laneWarningMs:1300,laneStrikeMs:650,coreWindowMs:3200,recoveryMs:1000,
 phaseTransitionMs:1500,sweepWarningMs:2400,sweepActiveMs:2200,exposureDamage:8
});
export type RegulatorPattern={phase:'warning'|'active'|'core'|'idle';stage:'lanes'|'transition'|'sweep'|'shutdown';rects:Rect[];moving:boolean;cycle:number;warningId:string;overloaded:boolean};

/** One simulation pattern drives hazards, armor, HUD and audio. */
export function regulatorPattern(elapsedMs:number,hp:number,phaseTwoAt:number|null=hp<=config.m05b3.boss_phase_two_hp?0:null,windowDamage=0,aimX=192):RegulatorPattern{
 const c=regulatorRules;
 const empty={rects:[] as Rect[],moving:false,cycle:0,warningId:'',overloaded:false};
 if(hp<=0)return{...empty,phase:'idle',stage:'shutdown'};
 const second=phaseTwoAt!==null;
 if(second&&elapsedMs-phaseTwoAt!<c.phaseTransitionMs)return{...empty,phase:'idle',stage:'transition'};
 const stage=second?'sweep':'lanes';
 const attackEnd=second?c.sweepWarningMs+c.sweepActiveMs:2*(c.laneWarningMs+c.laneStrikeMs);
 const cycleMs=attackEnd+c.coreWindowMs+c.recoveryMs;
 const local=Math.max(0,elapsedMs-(second?phaseTwoAt!+c.phaseTransitionMs:0)),cycle=Math.floor(local/cycleMs),time=local%cycleMs;
 const base={...empty,stage,cycle} as RegulatorPattern;
 if(second){
  if(time<c.sweepWarningMs)return{...base,phase:'warning',rects:[{x:126,y:40,width:412,height:280}],moving:true,warningId:`sweep:${cycle}`};
  if(time<attackEnd){const x=144+376*(time-c.sweepWarningMs)/c.sweepActiveMs;return{...base,phase:'active',rects:[{x:x-18,y:40,width:36,height:280}],moving:true};}
 }else{
  const pair=c.laneWarningMs+c.laneStrikeMs,index=Math.floor(time/pair),within=time%pair;
  if(time<attackEnd)return{...base,phase:within<c.laneWarningMs?'warning':'active',rects:[{x:Math.max(80,Math.min(560,aimX))-24,y:40,width:48,height:280}],warningId:`lanes:${cycle}:${index}`};
 }
 if(time<attackEnd+c.coreWindowMs)return{...base,phase:windowDamage>=c.exposureDamage?'idle':'core',overloaded:windowDamage>=c.exposureDamage};
 return{...base,phase:'idle'};
}

export class RegulatorEncounter{
 hp=config.m05b3.boss_hp;elapsedMs=0;phaseTwoAt:number|null=null;aimX=192;
 private windowDamage=0;private windowKey='';private lastWarning='';
 pattern(){return regulatorPattern(this.elapsedMs,this.hp,this.phaseTwoAt,this.windowDamage,this.aimX);}
 advance(ms:number,playerX:number){
  if(this.hp<=0)return;
  this.elapsedMs+=Math.max(0,ms);
  if(this.hp<=config.m05b3.boss_phase_two_hp&&this.phaseTwoAt===null)this.phaseTwoAt=this.elapsedMs;
  const pattern=this.pattern(),key=pattern.stage+':'+pattern.cycle;
  if(key!==this.windowKey){this.windowKey=key;this.windowDamage=0;}
  if(pattern.phase==='warning'&&pattern.warningId!==this.lastWarning){this.lastWarning=pattern.warningId;this.aimX=Math.max(80,Math.min(560,playerX));}
 }
 /** A core overload closes visible shutters; extra pellets strike that armor. */
 hit(damage:number){
  if(this.pattern().phase!=='core'||!Number.isFinite(damage)||damage<=0)return 0;
  const floor=this.phaseTwoAt===null?config.m05b3.boss_phase_two_hp:0;
  const accepted=Math.max(0,Math.min(Math.floor(damage),this.hp-floor,regulatorRules.exposureDamage-this.windowDamage));
  this.hp-=accepted;this.windowDamage+=accepted;
  if(this.hp===config.m05b3.boss_phase_two_hp&&this.phaseTwoAt===null){this.phaseTwoAt=this.elapsedMs;this.windowKey='transition:0';this.windowDamage=0;}
  return accepted;
 }
 snapshot(){return{hp:this.hp,elapsedMs:this.elapsedMs,phaseTwoAt:this.phaseTwoAt,aimX:this.aimX,windowDamage:this.windowDamage,pattern:this.pattern()};}
}

export const regulatorBody=(x:number,y:number,width:number,height:number):Rect=>({x:x-width/2,y:y-height/2,width,height});

/** Normalized to the actual robot sprite, including the gap between its legs. */
export function regulatorHitboxes(body:Rect){
 const part=(x:number,y:number,width:number,height:number):Rect=>({x:body.x+body.width*x,y:body.y+body.height*y,width:body.width*width,height:body.height*height});
 return{core:part(.418,.414,.164,.105),armor:[part(.40,.12,.20,.51),part(.46,0,.08,.13),part(.06,.04,.34,.67),part(.60,.04,.34,.67),part(.22,.63,.22,.37),part(.56,.63,.22,.37)]};
}
export function regulatorImpact(body:Rect,from:Point,to:Point,open:boolean):'core'|'armor'|null{
 const hitboxes=regulatorHitboxes(body);
 if(segmentRect(from,to,hitboxes.core))return open?'core':'armor';
 // The open shutters reveal a clear horizontal firing aperture across the chest.
 if(open&&from.y>=hitboxes.core.y&&from.y<=hitboxes.core.y+hitboxes.core.height&&to.y>=hitboxes.core.y&&to.y<=hitboxes.core.y+hitboxes.core.height)return null;
 return hitboxes.armor.some(rect=>segmentRect(from,to,rect))?'armor':null;
}
