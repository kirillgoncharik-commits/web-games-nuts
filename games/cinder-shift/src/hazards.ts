import type {HazardDefinition} from './room-data';
export function machineState(hazard:HazardDefinition,now:number):'off'|'warning'|'active'|'recovery'|'idle'{
 if(hazard.enabled===false)return'off';
 const phase=((now+(hazard.offset_ms||0))%hazard.cycle_ms+hazard.cycle_ms)%hazard.cycle_ms;
 if(phase<hazard.warning_ms)return'warning';
 if(phase<hazard.warning_ms+hazard.active_ms)return'active';
 if(phase<hazard.warning_ms+hazard.active_ms+420)return'recovery';
 return'idle';
}
