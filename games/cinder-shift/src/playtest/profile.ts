import type {RoomDefinition} from '../room-data';

export type PlaytestVariant='A'|'B'|'off';
declare const __C01_PLAYTEST__:PlaytestVariant;
// Compile-time only: a query parameter can never change the published ruleset.
export const playtestVariant:PlaytestVariant=typeof __C01_PLAYTEST__==='undefined'?'off':__C01_PLAYTEST__;
export const playtestEnabled=playtestVariant!=='off';
export const playtestBaseSha='1eee69e8dfd4efaa9b3c203ae0c707d098ccb3db';
export const playtestProfile={id:'c01-gate-v1',room:'A',next:'B',movement:{acceleration:1900,deceleration:2600,airAcceleration:1650,jump_buffer_ms:150,coyote_ms:110},repair:{x:602,y:320,radius:17,hp:2}} as const;
export function storageKey(key:string,variant:PlaytestVariant=playtestVariant){return variant==='off'?key:`${key}.c01-gate-v1.${variant}`;}
export function experimentActive(mode:string,mission:string,room:string,variant:PlaytestVariant=playtestVariant){return variant==='B'&&mode==='mission'&&mission==='airlock'&&room===playtestProfile.room;}
export function experimentRoom(base:RoomDefinition,mode:string,mission:string,variant:PlaytestVariant=playtestVariant):RoomDefinition{
 if(!experimentActive(mode,mission,base.id,variant))return base;
 return{...base,enemies:[
  {id:'a-sentry',kind:'walker',preset:'walker_security',x:470,y:305,end:{x:494,y:305},activateX:420,first:true,leash:{min:432,max:504}},
  {id:'a-lab-turret',kind:'turret',preset:'turret_cycle',x:548,y:305,end:{x:548,y:305},activateX:432,first:true},
 ]};
}
export function movementProfile<T extends {acceleration:number;deceleration:number;coyote_ms:number;jump_buffer_ms:number}>(active:boolean,grounded:boolean,base:T):T{
 return active?{...base,...playtestProfile.movement,acceleration:grounded?playtestProfile.movement.acceleration:playtestProfile.movement.airAcceleration}:base;
}
