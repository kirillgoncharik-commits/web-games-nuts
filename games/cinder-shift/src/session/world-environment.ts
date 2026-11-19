import type {Rect} from '../room-data';
import {intersects} from '../geometry';

export type KeyboardSpec={id:string;trigger:Rect;target:Rect;travel:number;returnDelayMs:number};
export type KeyboardState={pressed:boolean;lowered:boolean;releaseAt:number};
export const createKeyboardState=():KeyboardState=>({pressed:false,lowered:false,releaseAt:0});

/** Both keys keep their bottom at the desk. Rendering consumes these same bodies. */
export function keyboardSolids(spec:KeyboardSpec,state:KeyboardState):Rect[]{
 const triggerDrop=state.pressed?4:0,targetDrop=state.lowered?spec.travel:0;
 return [
  {...spec.trigger,id:'world-key:'+spec.id+':trigger',y:spec.trigger.y+triggerDrop,height:spec.trigger.height-triggerDrop},
  {...spec.target,id:'world-key:'+spec.id+':target',y:spec.target.y+targetDrop,height:spec.target.height-targetDrop},
 ];
}

/** Uses the fixed simulation clock. A returning key never materializes inside Mira. */
export function stepKeyboard(spec:KeyboardSpec,state:KeyboardState,body:Rect,feet:number,now:number){
 const oldPressed=state.pressed,oldLowered=state.lowered,trigger=keyboardSolids(spec,state)[0];
 state.pressed=body.x<trigger.x+trigger.width&&body.x+body.width>trigger.x&&Math.abs(feet-trigger.y)<=5;
 if(state.pressed)state.releaseAt=now+spec.returnDelayMs;
 const waitingForMira=state.lowered&&intersects(body,spec.target);
 state.lowered=state.pressed||now<state.releaseAt||waitingForMira;
 return oldPressed!==state.pressed||oldLowered!==state.lowered;
}

export function keyboardPhase(state:KeyboardState,now:number){
 return state.pressed?'pressed':!state.lowered?'ready':state.releaseAt-now<=350?'returning':'lowered';
}

export type PaperSpec={id:string;platform:Rect;cycleMs:number;warningMs:number;extendedMs:number;returnWarningMs:number};
export type PaperState={startedAt:number|null;visible:boolean;waitingForMira:boolean};
export const createPaperState=():PaperState=>({startedAt:null,visible:false,waitingForMira:false});
export function paperPhase(spec:PaperSpec,state:PaperState,now:number){
 if(state.waitingForMira)return 'held' as const;
 const time=state.startedAt===null?0:Math.max(0,now-state.startedAt)%spec.cycleMs;
 return time<spec.warningMs?'warning' as const:time<spec.warningMs+spec.extendedMs?'extended' as const:time<spec.warningMs+spec.extendedMs+spec.returnWarningMs?'returning' as const:'idle' as const;
}
export const paperSolids=(spec:PaperSpec,state:PaperState):Rect[]=>state.visible?[{...spec.platform,id:'world-paper:'+spec.id}]:[];

/** The external tray has a permanent lower bypass. Never spawn through or withdraw under Mira. */
export function stepPaper(spec:PaperSpec,state:PaperState,body:Rect,feet:number,now:number){
 if(state.startedAt===null)state.startedAt=now;
 const before=state.visible;
 state.waitingForMira=false;
 const phase=paperPhase(spec,state,now),wantsPaper=phase==='extended'||phase==='returning';
 const onPaper=body.x<spec.platform.x+spec.platform.width&&body.x+body.width>spec.platform.x&&Math.abs(feet-spec.platform.y)<=3;
 const overlaps=intersects(body,spec.platform);
 if(wantsPaper)state.visible=state.visible||!overlaps;
 else if(state.visible&&(onPaper||overlaps))state.waitingForMira=true;
 else state.visible=false;
 return before!==state.visible;
}

export type LampSpec={origin:{x:number;y:number};cycleMs:number;warningMs:number;scanMs:number};
export type LampState={startedAt:number|null};
export const createLampState=():LampState=>({startedAt:null});
export function lampPhase(spec:LampSpec,state:LampState,now:number){
 const time=state.startedAt===null?0:Math.max(0,now-state.startedAt)%spec.cycleMs;
 return time<spec.warningMs?'warning' as const:time<spec.warningMs+spec.scanMs?'scanning' as const:'open' as const;
}

export type ClothSpec={id:string;platform:Rect;travel:number;cycleMs:number};
export type ClothState={startedAt:number|null;offset:number;riderDx:number};
export const createClothState=():ClothState=>({startedAt:null,offset:0,riderDx:0});
export const clothSolid=(spec:ClothSpec,state:ClothState):Rect=>({...spec.platform,x:spec.platform.x+state.offset,id:'world-cloth:'+spec.id});
/** A horizontal cloth shuttle carries a rider; a blocked move waits rather than crushing them. */
export function stepCloth(spec:ClothSpec,state:ClothState,body:Rect,feet:number,now:number,solids:readonly Rect[],riding=true){
 if(state.startedAt===null)state.startedAt=now;
 const before=clothSolid(spec,state),phase=Math.max(0,now-state.startedAt)%spec.cycleMs/spec.cycleMs;
 const next=spec.travel*(1-Math.cos(phase*Math.PI*2))/2,dx=next-state.offset;
 state.riderDx=0;
 const onTop=riding&&body.x<before.x+before.width&&body.x+body.width>before.x&&Math.abs(feet-before.y)<3;
 const proposed={...before,x:spec.platform.x+next},moved={...body,x:body.x+dx};
 if(solids.some(s=>intersects(proposed,s))||(!onTop&&intersects(proposed,body))||onTop&&(moved.x<0||moved.x+moved.width>640||solids.some(s=>intersects(moved,s))))return false;
 state.offset=next;if(onTop)state.riderDx=dx;
 return Math.abs(dx)>0.00001;
}

export type BridgeSpec={id:string;platform:Rect;contactId:string};
export type BridgeState={visible:boolean};
export const createBridgeState=():BridgeState=>({visible:false});
export function stepBridge(spec:BridgeSpec,state:BridgeState,earned:boolean,body:Rect){
 if(state.visible||!earned||intersects(body,spec.platform))return false;
 state.visible=true;return true;
}
export const bridgeSolids=(spec:BridgeSpec,state:BridgeState):Rect[]=>state.visible?[{...spec.platform,id:'world-bridge:'+spec.id}]:[];

export type AirSpec={area:Rect;direction:1|-1;speed:number;cycleMs:number;quietMs:number;warningMs:number;activeMs:number;damperContact?:string};
export type AirPhase='quiet'|'warning'|'gust'|'closed';
export function airPhase(spec:AirSpec,now:number,closed=false):AirPhase{
 if(closed)return 'closed';
 const time=Math.max(0,now)%spec.cycleMs;
 return time<spec.quietMs?'quiet':time<spec.quietMs+spec.warningMs?'warning':time<spec.quietMs+spec.warningMs+spec.activeMs?'gust':'quiet';
}
/** Wind only adds a bounded horizontal drift. Every baseline jump and the sheltered floor remain available. */
export function airVelocity(spec:AirSpec,body:Rect,now:number,closed=false,crouching=false){
 return !crouching&&airPhase(spec,now,closed)==='gust'&&intersects(body,spec.area)?spec.direction*spec.speed:0;
}
