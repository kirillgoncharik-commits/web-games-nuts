import {buildTarget,targetProfile,type PlatformTarget} from '../platform';
import type {ChallengeSpec} from './challenge-spec';

export type LeaderboardMapping={provider:'crazygames';board_id:'cinder_shift_airlock_score_v1';metric:'points';direction:'descending'};
export type LeaderboardStatus={status:'available'|'not_available';reason:'ready'|'host_sdk_missing'|'board_not_configured'|'comparison_not_supported';mapping?:LeaderboardMapping};
export type LeaderboardSubmitResult={status:'accepted'|'not_available'|'rejected';reason:string};
export function leaderboardStatus(spec:ChallengeSpec,target:PlatformTarget=buildTarget,profile:Record<string,unknown>=targetProfile):LeaderboardStatus{
 const candidate=target==='crazygames-full'&&spec.mode_id==='score_attack'&&spec.mission_ids.length===1&&spec.mission_ids[0]==='airlock'&&spec.preset_id==='base-mira-6hp-no-modules'&&spec.assist_profile==='standard-manual'&&spec.timing_policy==='standard'&&spec.scoring_version==='score-v1';
 if(!candidate)return{status:'not_available',reason:'comparison_not_supported'};
 const mapping:LeaderboardMapping={provider:'crazygames',board_id:'cinder_shift_airlock_score_v1',metric:'points',direction:'descending'};
 if(profile.integration_status!=='ready')return{status:'not_available',reason:'host_sdk_missing',mapping};
 // A configured SDK is not sufficient: the target portal must confirm this board exists.
 return{status:'not_available',reason:'board_not_configured',mapping};
}
export async function submitLeaderboardScore(spec:ChallengeSpec,_score:number):Promise<LeaderboardSubmitResult>{const status=leaderboardStatus(spec);return{status:'not_available',reason:status.reason};}
