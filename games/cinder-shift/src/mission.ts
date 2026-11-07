import config from '../game.config.json' with {type:'json'};
import type {MissionEntry} from './session/campaign';
import {loadout} from './session/research';
import{characterProfile,type CharacterProfile}from'./session/profile';
import {hasEvent,shutter,eventConfig,type EventPlan} from './session/events';
export {rooms} from './room-data';
export type {RoomId,Rect,Point,EnemyDefinition,RoomDefinition} from './room-data';
import {rooms,type RoomId,type Rect,type Point,type EnemyDefinition,type RoomDefinition} from './room-data';
export type Mode='mission'|'training';
export type EnemyState=EnemyDefinition & {home:Point;hp:number;phase:'patrol'|'telegraph'|'attack'|'recovery'|'dead';remaining:number;direction:number;shots:number;aim:Point;activated:boolean;warnings:number};
export type RoomState={targetHp:number;terminal:boolean;enemies:EnemyState[];visited:boolean;containerUsed:boolean};
export type Result='victory'|'death';
export class MissionAttempt{
  readonly id=crypto.randomUUID();
  readonly missionId='airlock';
  current:RoomId;
  hp:number;readonly profile:CharacterProfile;readonly maxHp:number;readonly entry:MissionEntry;score:number;
  objective=false;
  activeMs=0;
  hurtUntil=-1;
  result:Result|'abandoned'|null=null;
  reason='';
  tutorial=new Set<string>();
  clock=new SimulationClock();
  states:Partial<Record<RoomId,RoomState>>={};
  constructor(readonly mode:Mode,entry?:MissionEntry){this.current=mode==='training'?'T':'A';this.entry=structuredClone(entry||{mission_id:'airlock',seed:0,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:[]});this.profile=characterProfile(this.entry.build.nodes);this.maxHp=this.entry.max_hp;this.hp=this.entry.initial_hp;this.score=this.entry.initial_score;}
  get build(){return this.entry.build;}
  get eventPlan():EventPlan{return this.entry.event_plan;}
  definition(id=this.current):RoomDefinition{const base=rooms[id];return id==='B'&&hasEvent(this.eventPlan,'E02')?{...base,solids:[...base.solids,shutter]}:base;}
  chooseContainer(choice:'repair'|'salvage'){const state=this.room('B');if(this.mode!=='mission'||this.current!=='B'||!hasEvent(this.eventPlan,'E03')||state.containerUsed||(choice==='repair'&&this.hp>=this.maxHp))return false;state.containerUsed=true;if(choice==='repair')this.hp=Math.min(this.maxHp,this.hp+eventConfig.repairHp);else this.score+=eventConfig.salvageScore;return true;}
  room(id=this.current){
    return this.states[id] ||= {targetHp:3,terminal:false,visited:false,containerUsed:false,enemies:rooms[id].enemies.map(e=>({...e,home:{x:e.x,y:e.y},hp:config.combat[e.kind].hp,phase:'patrol',remaining:0,direction:1,shots:0,aim:{x:0,y:0},activated:false,warnings:0}))};
  }
  damage(now:number,reason:string){
    if(this.mode==='training'||this.result||this.hp<=0||now<this.hurtUntil)return false;
    this.hp=Math.max(0,this.hp-1);this.hurtUntil=now+config.initial_balance.hurt_invulnerability_seconds*1000;this.reason=reason;return true;
  }
  finish(result:Result|'abandoned'){if(this.result)return false;this.result=result;return true;}
}
// Render rate never changes simulation steps; long frames are admitted as bounded work.
export class SimulationClock{
  now=0;private accumulator=0;
  advance(delta:number,step:(ms:number)=>boolean|void){
    this.accumulator+=Math.max(0,Math.min(delta,250));
    let count=0;
    while(this.accumulator+1e-6>=1000/60 && count<15){this.accumulator-=1000/60;this.now+=1000/60;count++;if(step(1000/60)===false){this.accumulator=0;break;}}
    return count;
  }
  clear(){this.accumulator=0;}
}
