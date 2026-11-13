import {hasEvent,planEvents} from '../games/cinder-shift/src/session/events';
import {missionSeed} from '../games/cinder-shift/src/session/missions';

export function archiveCampaignSeed(beacon:boolean){
 for(let seed=0;seed<256;seed++)if(hasEvent(planEvents(missionSeed(seed,'archive'),'archive'),'E05')===beacon)return seed;
 throw Error('No deterministic Archive event seed found');
}
