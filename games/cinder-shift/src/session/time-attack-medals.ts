import type {PlayableMissionId} from './missions';

export type TimeAttackMedal='bronze'|'silver'|'gold';
export type MedalCalibration={mission_id:PlayableMissionId;reference_ms:number|null;source:'awaiting_playtest'|'accepted_playtest'};

/** References stay unset until a real standard run is accepted in playtest. */
export const timeAttackMedalCalibration:Readonly<Record<PlayableMissionId,MedalCalibration>>=Object.freeze({
  airlock:{mission_id:'airlock',reference_ms:null,source:'awaiting_playtest'},
  cargo:{mission_id:'cargo',reference_ms:null,source:'awaiting_playtest'},
  foundry:{mission_id:'foundry',reference_ms:null,source:'awaiting_playtest'},
  archive:{mission_id:'archive',reference_ms:null,source:'awaiting_playtest'},
  reactor:{mission_id:'reactor',reference_ms:null,source:'awaiting_playtest'}
});

/** Gold/Silver/Bronze candidates are 115%/140%/180% of the accepted reference D. */
export function medalForTime(elapsedMs:number,referenceMs:number|null):TimeAttackMedal|null{
  if(!Number.isSafeInteger(elapsedMs)||elapsedMs<0||!Number.isSafeInteger(referenceMs)||referenceMs===null||referenceMs<=0)return null;
  if(elapsedMs*100<=referenceMs*115)return'gold';
  if(elapsedMs*100<=referenceMs*140)return'silver';
  if(elapsedMs*100<=referenceMs*180)return'bronze';
  return null;
}
