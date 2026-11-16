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
