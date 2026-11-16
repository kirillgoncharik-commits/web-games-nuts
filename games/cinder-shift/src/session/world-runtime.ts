import type {WorldRoomSpec} from '../world-rooms';
import type {Point,Rect} from '../room-data';
import {createCarryRoom,createPowerRoom,carryAction,canPickUp,canFire,stepCarry,settleCarry,switchCircuit,circuitSolids,absorbLidHit,resetMandatoryItem,type CarryRoom,type PowerRoom} from './world-mechanics';
export type WorldRoomState={carry?:CarryRoom;power?:PowerRoom;phase:number;repaired:boolean;ledger:string[]};
export function createWorldState(id:string,spec:WorldRoomSpec):WorldRoomState{
 return{phase:0,repaired:false,ledger:[],carry:spec.carry?createCarryRoom(id,spec.carry.kind,spec.carry.spawn,spec.carry.contacts.map(c=>({...c,active:false,open:!c.window}))):undefined,power:spec.powerObjects?createPowerRoom(spec.powerObjects):undefined};
}
export function worldPulse(spec:WorldRoomSpec,now:number){const p=spec.pulse;if(!p)return'safe' as const;const phase=now%p.cycle;return phase<p.warning?'warning' as const:phase<p.warning+p.active?'active' as const:'safe' as const;}
export function powerTarget(spec:WorldRoomSpec,state:WorldRoomState):Point|null{const seq=spec.sequence;if(!seq||state.phase>=seq.length)return null;if(spec.sequenceTargets?.[state.phase])return{...spec.sequenceTargets[state.phase]};return{x:seq.length===1?552:seq.length===2?(state.phase===0?300:552):[264,408,552][state.phase],y:320};}
export function worldReady(spec:WorldRoomSpec,state:WorldRoomState){return (!state.carry||state.carry.contacts.every(c=>c.active))&&(!spec.sequence||state.phase>=spec.sequence.length);}
export function worldSolids(spec:WorldRoomSpec,state:WorldRoomState){return state.power?circuitSolids(state.power):[];}
export function worldContext(spec:WorldRoomSpec,state:WorldRoomState,player:Point,now:number,allowRepair=true):'pickup'|'throw'|'switch'|'activate'|'repair'|null{
 if(state.carry&&(state.carry.item.state==='held'||canPickUp(state.carry,{x:player.x,y:player.y-28})))return state.carry.item.state==='held'?'throw':'pickup';
 const target=powerTarget(spec,state);if(target&&Math.abs(player.x-target.x)<32&&Math.abs(player.y-target.y)<30&&state.power?.circuit===spec.sequence?.[state.phase]&&worldPulse(spec,now)==='safe')return'activate';
 if(allowRepair&&spec.repair&&!state.repaired&&Math.abs(player.x-spec.repair.x)<28&&Math.abs(player.y-spec.repair.y)<30)return'repair';
 if(spec.switches?.some(p=>Math.abs(player.x-p.x)<32&&Math.abs(player.y-p.y)<30))return'switch';
 return null;
}
export function actWorld(spec:WorldRoomSpec,state:WorldRoomState,player:Point,rect:Rect,facing:1|-1,now:number,crouch=false,allowRepair=true):{action:string;ids:string[];geometry:boolean}|null{
 const action=worldContext(spec,state,player,now,allowRepair);if(!action)return null;
 if(action==='pickup'||action==='throw'){const result=carryAction(state.carry!,{x:player.x,y:player.y-28},facing,crouch);return result?{action:result,ids:[],geometry:false}:null;}
 if(action==='switch'){if(!state.power||!switchCircuit(state.power,rect))return null;return{action:'switch',ids:[],geometry:true};}
 if(action==='activate'){const id=spec.powerObjects?.[0]?.id.split('-')[0]+':phase-'+state.phase;if(!state.ledger.includes(id))state.ledger.push(id);state.phase++;return{action,ids:[id],geometry:false};}
 if(action==='repair'){state.repaired=true;return{action,ids:[],geometry:false};}return null;
}
export function stepWorld(spec:WorldRoomSpec,state:WorldRoomState,player:Point,facing:1|-1,now:number,ms:number,solids:Rect[]){
 if(!state.carry)return[];const first=state.carry.contacts.find(c=>!c.active),pulse=worldPulse(spec,now);
 for(const c of state.carry.contacts)c.open=c===first&&(!spec.carry?.contacts.find(def=>def.id===c.id)?.window||pulse==='safe');
 const ids=stepCarry(state.carry,ms,solids);settleCarry(state.carry,{x:player.x+facing*19,y:player.y-28},solids);state.phase=state.carry.contacts.filter(c=>c.active).length;return ids;
}
export const worldCanFire=(state:WorldRoomState|undefined)=>!state?.carry||canFire(state.carry);
export const worldAbsorb=(state:WorldRoomState|undefined)=>Boolean(state?.carry&&absorbLidHit(state.carry));
export function clearWorldTransient(state:WorldRoomState|undefined){if(state?.carry?.item.state==='thrown')resetMandatoryItem(state.carry);}
