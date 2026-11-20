import type {WorldRoomState} from './world-runtime';

// These are the existing contact IDs, in transmission order. Only confirmed
// links survive a mission restart; position, timing and transient input do not.
export const radioLinkIds=['antenna:phase-0','antenna:phase-1','antenna:phase-2'] as const;
export function validRadioLinks(value:unknown):value is string[]{
 return Array.isArray(value)&&value.length<=radioLinkIds.length&&value.every((id,index)=>id===radioLinkIds[index]);
}
export function restoreRadioLinks(state:WorldRoomState,links:readonly string[]){
 if(!validRadioLinks(links)||!state.power)throw new TypeError('invalid_radio_links');
 state.phase=links.length;state.ledger=[...links];
 state.power.circuit=links.length===0||links.length===2?'A':'B';
}
