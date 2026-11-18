import {createEncounterState,encounterCompleted,encounterSolids,stepEncounter,syncEncounterStage,encounterTiming,type EncounterState,createLatchState,latchSolids,stepLatch,type LatchState} from './world-encounter';
import type {WorldRoomSpec} from '../world-rooms';
import {intersects} from '../geometry';
import type {Point,Rect} from '../room-data';
import {createCarryRoom,createPowerRoom,carryAction,canPickUp,canFire,stepCarry,settleCarry,switchCircuit,circuitSolids,absorbLidHit,resetMandatoryItem,type CarryRoom,type PowerRoom} from './world-mechanics';
import {createKeyboardState,keyboardSolids,stepKeyboard,type KeyboardState,createPaperState,paperSolids,stepPaper,type PaperState,createLampState,lampPhase,type LampState,createClothState,clothSolid,stepCloth,type ClothState,createBridgeState,bridgeSolids,stepBridge,type BridgeState,airVelocity} from './world-environment';
export type WorldRoomState={encounter?:EncounterState;latch?:LatchState;carry?:CarryRoom;power?:PowerRoom;keyboard?:KeyboardState;paper?:PaperState;lamp?:LampState;cloth?:ClothState;bridge?:BridgeState;damperClosedAt:number|null;phase:number;repaired:boolean;ledger:string[]};
export function createWorldState(id:string,spec:WorldRoomSpec):WorldRoomState{
 return{encounter:spec.encounter?createEncounterState():undefined,latch:spec.latch?createLatchState():undefined,damperClosedAt:null,cloth:spec.cloth?createClothState():undefined,bridge:spec.bridge?createBridgeState():undefined,phase:0,repaired:false,ledger:[],carry:spec.carry?createCarryRoom(id,spec.carry.kind,spec.carry.spawn,spec.carry.contacts.map(c=>({...c,active:false,open:!c.window&&!spec.lamp}))):undefined,power:spec.powerObjects?createPowerRoom(spec.powerObjects):undefined,keyboard:spec.keyboard?createKeyboardState():undefined,paper:spec.paper?createPaperState():undefined,lamp:spec.lamp?createLampState():undefined};
}
export function worldPulse(spec:WorldRoomSpec,now:number){const p=spec.pulse;if(!p)return'safe' as const;const phase=now%p.cycle;return phase<p.warning?'warning' as const:phase<p.warning+p.active?'active' as const:'safe' as const;}
export function worldPulseArea(spec:WorldRoomSpec):Rect|null{const p=spec.pulse;return p?{x:p.x,y:p.y??274,width:p.width,height:p.height??46}:null;}
export function worldPulseHits(spec:WorldRoomSpec,body:Rect,now:number){
 const area=worldPulseArea(spec);if(!area||worldPulse(spec,now)!=='active'||!intersects(body,area))return false;
 // Only the part actually in the plume needs shelter; entering from dry ground is safe.
 const left=Math.max(body.x,area.x),top=Math.max(body.y,area.y),right=Math.min(body.x+body.width,area.x+area.width),bottom=Math.min(body.y+body.height,area.y+area.height);
 return !spec.pulse?.shelters?.some(r=>left>=r.x&&right<=r.x+r.width&&top>=r.y&&bottom<=r.y+r.height);
}
export function powerTarget(spec:WorldRoomSpec,state:WorldRoomState):Point|null{const seq=spec.sequence;if(!seq||state.phase>=seq.length)return null;if(spec.sequenceTargets?.[state.phase])return{...spec.sequenceTargets[state.phase]};return{x:seq.length===1?552:seq.length===2?(state.phase===0?300:552):[264,408,552][state.phase],y:320};}
export function worldReady(spec:WorldRoomSpec,state:WorldRoomState){return (!state.carry||state.carry.contacts.every(c=>c.active))&&(!spec.sequence||state.phase>=spec.sequence.length);}
export function worldSolids(spec:WorldRoomSpec,state:WorldRoomState){return [...(state.power?circuitSolids(state.power):[]),...(spec.keyboard&&state.keyboard?keyboardSolids(spec.keyboard,state.keyboard):[]),...(spec.paper&&state.paper?paperSolids(spec.paper,state.paper):[]),...(spec.cloth&&state.cloth?[clothSolid(spec.cloth,state.cloth)]:[]),...(spec.bridge&&state.bridge?bridgeSolids(spec.bridge,state.bridge):[]),...(spec.encounter&&state.encounter?encounterSolids(spec.encounter,state.encounter):[]),...(spec.latch&&state.latch?latchSolids(spec.latch,state.latch):[])];}
export function stepWorldEnvironment(spec:WorldRoomSpec,state:WorldRoomState,body:Rect,feet:number,now:number,solids:readonly Rect[]=[],riding=true){
 const keys=Boolean(spec.keyboard&&state.keyboard&&stepKeyboard(spec.keyboard,state.keyboard,body,feet,now));
 const paper=Boolean(spec.paper&&state.paper&&stepPaper(spec.paper,state.paper,body,feet,now));
 const fixed=solids.filter(s=>!s.id?.startsWith('world-cloth:'));
 const cloth=Boolean(spec.cloth&&state.cloth&&stepCloth(spec.cloth,state.cloth,body,feet,now,fixed,riding));
 const bridge=Boolean(spec.bridge&&state.bridge&&stepBridge(spec.bridge,state.bridge,Boolean(state.carry?.ledger.includes(spec.bridge.contactId)),body));
 const encounter=Boolean(spec.encounter&&state.encounter&&stepEncounter(spec.encounter,state.encounter,encounterCompleted(spec.encounter,state.carry?.contacts||[]),body,feet,now));
 const latch=Boolean(spec.latch&&state.latch&&stepLatch(state.latch,Boolean(state.carry?.ledger.includes(spec.latch.contactId))));
 return keys||paper||cloth||bridge||encounter||latch;
}
export const worldAirVelocity=(spec:WorldRoomSpec,state:WorldRoomState,body:Rect,now:number,crouching=false)=>spec.air?airVelocity(spec.air,body,now,state.damperClosedAt!==null,crouching):0;
export function worldContext(spec:WorldRoomSpec,state:WorldRoomState,player:Point,now:number,allowRepair=true):'pickup'|'throw'|'switch'|'activate'|'repair'|null{
 if(state.carry&&(state.carry.item.state==='held'||canPickUp(state.carry,{x:player.x,y:player.y-28})))return state.carry.item.state==='held'?'throw':'pickup';
 const target=powerTarget(spec,state);if(target&&Math.abs(player.x-target.x)<32&&Math.abs(player.y-target.y)<30&&state.power?.circuit===spec.sequence?.[state.phase]&&worldPulse(spec,now)==='safe')return'activate';
 // Adjacent repair pockets must not steal an interaction at the switch itself.
 const switchDistance=Math.min(Infinity,...(spec.switches||[]).filter(p=>Math.abs(player.x-p.x)<32&&Math.abs(player.y-p.y)<30).map(p=>Math.hypot(player.x-p.x,player.y-p.y)));
 const repair=spec.repair,repairDistance=allowRepair&&repair&&!state.repaired&&Math.abs(player.x-repair.x)<28&&Math.abs(player.y-repair.y)<30?Math.hypot(player.x-repair.x,player.y-repair.y):Infinity;
 if(repairDistance<Infinity&&repairDistance<=switchDistance)return'repair';
 if(switchDistance<Infinity)return'switch';
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
 if(state.lamp&&state.lamp.startedAt===null)state.lamp.startedAt=now;
 const lampOpen=!spec.lamp||Boolean(state.lamp&&lampPhase(spec.lamp,state.lamp,now)==='open');
 const encounterOpen=!spec.encounter||Boolean(state.encounter&&encounterTiming(spec.encounter,state.encounter,now).phase==='open');
 for(const c of state.carry.contacts)c.open=c===first&&lampOpen&&encounterOpen&&(!spec.encounter||c.id===spec.encounter.stages[state.encounter!.stage]?.contactId)&&(state.damperClosedAt===null||now-state.damperClosedAt>=900)&&(!spec.carry?.contacts.find(def=>def.id===c.id)?.window||pulse==='safe');
 const ids=stepCarry(state.carry,ms,solids);if(spec.air?.damperContact&&ids.includes(spec.air.damperContact))state.damperClosedAt=now;settleCarry(state.carry,{x:player.x+facing*19,y:player.y-28},solids);state.phase=state.carry.contacts.filter(c=>c.active).length;
 if(spec.encounter&&state.encounter)syncEncounterStage(spec.encounter,state.encounter,encounterCompleted(spec.encounter,state.carry.contacts));
 // Every completed reflector contact starts a new scan over the next position.
 if(ids.length&&state.lamp){state.lamp.startedAt=now;for(const c of state.carry.contacts)c.open=false;}
 return ids;
}
export const worldCanFire=(state:WorldRoomState|undefined)=>!state?.carry||canFire(state.carry);
export const worldAbsorb=(state:WorldRoomState|undefined)=>Boolean(state?.carry&&absorbLidHit(state.carry));
export function clearWorldTransient(state:WorldRoomState|undefined){if(state?.carry?.item.state==='thrown')resetMandatoryItem(state.carry);}
