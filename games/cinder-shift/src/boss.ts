import config from '../game.config.json' with {type:'json'};
import type {Rect} from './room-data';

export type RegulatorPattern={phase:'warning'|'active'|'core'|'idle';rects:Rect[];moving:boolean};

export function regulatorPattern(elapsedMs:number,hp:number):RegulatorPattern{
 if(hp<=0)return{phase:'idle',rects:[],moving:false};
 const c=config.m05b3,cycle=((elapsedMs%c.boss_cycle_ms)+c.boss_cycle_ms)%c.boss_cycle_ms;
 if(hp<=c.boss_phase_two_hp){
  if(cycle<c.boss_move_telegraph_ms){const x=112+368*cycle/c.boss_move_telegraph_ms;return{phase:'warning',rects:[{x:x-18,y:40,width:36,height:280}],moving:true};}
  if(cycle<c.boss_move_telegraph_ms+c.boss_move_active_ms){const t=(cycle-c.boss_move_telegraph_ms)/c.boss_move_active_ms,x=112+368*t;return{phase:'active',rects:[{x:x-18,y:40,width:36,height:280}],moving:true};}
  if(cycle<c.boss_move_telegraph_ms+c.boss_move_active_ms+c.boss_core_window_ms)return{phase:'core',rects:[],moving:false};
  return{phase:'idle',rects:[],moving:false};
 }
 const firstWarning=c.boss_telegraph_ms,firstStrike=firstWarning+c.boss_attack_ms,secondWarning=firstStrike+c.boss_telegraph_ms,secondStrike=secondWarning+c.boss_attack_ms,coreEnd=secondStrike+c.boss_core_window_ms;
 if(cycle<firstWarning)return{phase:'warning',rects:[{x:168,y:40,width:48,height:280}],moving:false};
 if(cycle<firstStrike)return{phase:'active',rects:[{x:168,y:40,width:48,height:280}],moving:false};
 if(cycle<secondWarning)return{phase:'warning',rects:[{x:424,y:40,width:48,height:280}],moving:false};
 if(cycle<secondStrike)return{phase:'active',rects:[{x:424,y:40,width:48,height:280}],moving:false};
 if(cycle<coreEnd)return{phase:'core',rects:[],moving:false};
 return{phase:'idle',rects:[],moving:false};
}

export const regulatorBody=(x:number,y:number,width:number,height:number):Rect=>({x:x-width/2,y:y-height/2,width,height});
