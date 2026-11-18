import type {Point,Rect} from '../room-data';
import {clearLine,intersects} from '../geometry';

export type EncounterStage={contactId:string;origin:Point;beam:Rect;cover:Rect;warningMs:number;scanMs:number;openMs:number};
export type EncounterSpec={id:string;stages:EncounterStage[]};
export type EncounterState={stage:number;solidStage:number;startedAt:number|null};
export type EncounterPhase='settling'|'warning'|'scan'|'open'|'closing'|'complete';
// A full throw must fit before the panel closes. No new action or resource is introduced.
export const encounterThrowReserveMs=700;
export const createEncounterState=():EncounterState=>({stage:0,solidStage:-1,startedAt:null});
export function encounterCompleted(spec:EncounterSpec,contacts:readonly {id:string;active:boolean}[]){
 let count=0;for(const stage of spec.stages){if(!contacts.some(c=>c.id===stage.contactId&&c.active))break;count++;}return count;
}
export function syncEncounterStage(spec:EncounterSpec,state:EncounterState,completed:number){
 const stage=Math.min(spec.stages.length,Math.max(0,completed));
 if(stage===state.stage)return false;
 state.stage=stage;state.startedAt=null;return true;
}
export function encounterSolids(spec:EncounterSpec,state:EncounterState):Rect[]{
 const current=spec.stages[state.solidStage];
 return current?[{...current.cover,id:'world-encounter:'+spec.id+':cover-'+state.solidStage}]:[];
}
/** Changing cover waits for both a clear new body and a rider to leave the old surface. */
export function stepEncounter(spec:EncounterSpec,state:EncounterState,completed:number,body:Rect,feet:number,now:number){
 syncEncounterStage(spec,state,completed);
 if(state.solidStage===state.stage&&state.startedAt!==null)return false;
 const old=spec.stages[state.solidStage]?.cover,next=spec.stages[state.stage]?.cover;
 const riding=old&&body.x<old.x+old.width&&body.x+body.width>old.x&&Math.abs(feet-old.y)<3;
 if(riding||next&&intersects(body,next))return false;
 const changed=state.solidStage!==state.stage;state.solidStage=state.stage;state.startedAt=now;return changed;
}
export function encounterTiming(spec:EncounterSpec,state:EncounterState,now:number){
 const stage=spec.stages[state.stage];
 if(!stage)return{phase:'complete' as EncounterPhase,remaining:0,cycle:0};
 if(state.startedAt===null)return{phase:'settling' as EncounterPhase,remaining:0,cycle:0};
 const cycleMs=stage.warningMs+stage.scanMs+stage.openMs,elapsed=Math.max(0,now-state.startedAt),time=elapsed%cycleMs;
 if(time<stage.warningMs)return{phase:'warning' as EncounterPhase,remaining:stage.warningMs-time,cycle:Math.floor(elapsed/cycleMs)};
 if(time<stage.warningMs+stage.scanMs)return{phase:'scan' as EncounterPhase,remaining:stage.warningMs+stage.scanMs-time,cycle:Math.floor(elapsed/cycleMs)};
 const remaining=cycleMs-time;
 return{phase:(remaining>=encounterThrowReserveMs?'open':'closing') as EncounterPhase,remaining,cycle:Math.floor(elapsed/cycleMs)};
}
export function encounterThreat(spec:EncounterSpec,state:EncounterState,body:Rect,now:number,solids:Rect[]){
 const stage=spec.stages[state.stage];
 return Boolean(stage&&encounterTiming(spec,state,now).phase==='scan'&&intersects(body,stage.beam)
  &&clearLine(stage.origin,{x:body.x+body.width/2,y:stage.origin.y},solids));
}

export type LatchSpec={id:string;gate:Rect;contactId:string};
export type LatchState={open:boolean};
export const createLatchState=():LatchState=>({open:false});
export function stepLatch(state:LatchState,earned:boolean){if(state.open||!earned)return false;state.open=true;return true;}
export const latchSolids=(spec:LatchSpec,state:LatchState):Rect[]=>state.open?[]:[{...spec.gate,id:'world-latch:'+spec.id}];
