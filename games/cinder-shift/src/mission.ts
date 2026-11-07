import config from '../game.config.json' with {type:'json'};
import type {MissionEntry} from './session/campaign';
import {loadout} from './session/research';
import {characterProfile,type CharacterProfile}from'./session/profile';
import {hasEvent,shutter,cargoShutter,eventConfig,type EventPlan} from './session/events';
import {missions,type PlayableMissionId} from './session/missions';
import {createEnemy,suspendEnemy,type EnemyState} from './enemies';
export {rooms} from './room-data';
export type {RoomId,Rect,Point,EnemyDefinition,RoomDefinition} from './room-data';
export type {EnemyState} from './enemies';
import {rooms,type RoomId,type RoomDefinition} from './room-data';
export type Mode='mission'|'training';
export type RoomState={targetHp:number;terminal:boolean;enemies:EnemyState[];visited:boolean;containerUsed:boolean;bufferUsed:boolean;brokenPanels:string[];route:'ground'|'service'};
export type Result='victory'|'death';
export class MissionAttempt{
 readonly id=crypto.randomUUID();readonly missionId:PlayableMissionId;
 current:RoomId;hp:number;readonly profile:CharacterProfile;readonly maxHp:number;readonly entry:MissionEntry;score:number;
 objective=false;cellCollected=false;cellInstalled=false;activeMs=0;hurtUntil=-1;lastDamageAbsorbed=false;
 result:Result|'abandoned'|null=null;reason='';tutorial=new Set<string>();clock=new SimulationClock();states:Partial<Record<RoomId,RoomState>>={};
 constructor(readonly mode:Mode,entry?:MissionEntry){this.entry=structuredClone(entry||{mission_id:'airlock',seed:0,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:[]});this.missionId=this.entry.mission_id;this.current=mode==='training'?'T':missions[this.missionId].rooms[0];this.profile=characterProfile(this.entry.build.nodes,this.entry.build.active);this.maxHp=this.entry.max_hp;this.hp=this.entry.initial_hp;this.score=this.entry.initial_score;}
 get build(){return this.entry.build;}
 get eventPlan():EventPlan{return this.entry.event_plan;}
 definition(id=this.current):RoomDefinition{const base=rooms[id],saved=this.states[id];let solids=base.solids.filter(s=>!s.id||!saved?.brokenPanels.includes(s.id));if(id==='B'&&hasEvent(this.eventPlan,'E02'))solids=[...solids,shutter];if(id==='E'&&hasEvent(this.eventPlan,'E01')&&!saved?.terminal)solids=[...solids,cargoShutter];return{...base,solids};}
 chooseContainer(choice:'repair'|'salvage'){const state=this.room('B'),hasChoice=hasEvent(this.eventPlan,'E03');if(this.mode!=='mission'||this.missionId!=='airlock'||this.current!=='B'||state.containerUsed||(choice==='salvage'&&!hasChoice)||(choice==='repair'&&this.hp>=this.maxHp))return false;state.containerUsed=true;if(choice==='repair')this.hp=Math.min(this.maxHp,this.hp+eventConfig.repairHp);else this.score+=eventConfig.salvageScore;return true;}
 room(id=this.current):RoomState{return this.states[id]||=( {targetHp:3,terminal:false,visited:false,containerUsed:false,bufferUsed:false,brokenPanels:[],route:'ground',enemies:rooms[id].enemies.map(createEnemy)} );}
 enemyPowered(){return this.current!=='E'||!hasEvent(this.eventPlan,'E01')||this.room().terminal;}
 suspend(){for(const enemy of this.room().enemies)suspendEnemy(enemy);}
 breakPanel(id:string){const saved=this.room();if(!saved.brokenPanels.includes(id))saved.brokenPanels.push(id);}
 damage(now:number,reason:string){
  this.lastDamageAbsorbed=false;if(this.mode==='training'||this.result||this.hp<=0||now<this.hurtUntil)return false;
  this.hurtUntil=now+config.initial_balance.hurt_invulnerability_seconds*1000;
  if(this.build.buffer&&!this.room().bufferUsed){this.room().bufferUsed=true;this.lastDamageAbsorbed=true;return true;}
  this.hp=Math.max(0,this.hp-1);this.reason=reason;return true;
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
