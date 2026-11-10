import type {ChallengeSpec} from './challenge-spec';
import type {CompactRelayResult} from './relay';

export type ArchivedChallenge={challenge_key:string;spec:ChallengeSpec;created_at:number;origin:'created'|'imported';local_result?:CompactRelayResult;opponent_results:CompactRelayResult[]};
export type ChallengeArchive={version:1;items:ArchivedChallenge[]};
export const emptyChallengeArchive=():ChallengeArchive=>({version:1,items:[]});
export function validateChallengeArchive(value:unknown):value is ChallengeArchive{
 if(!object(value)||value.version!==1||!Array.isArray(value.items)||value.items.length>1000)return false;
 return value.items.every(item=>object(item)&&typeof item.challenge_key==='string'&&item.challenge_key.length<=80&&object(item.spec)&&item.spec.mode_id==='duel'&&Array.isArray(item.spec.mission_ids)&&item.spec.mission_ids.length===1&&Number.isSafeInteger(item.created_at)&&['created','imported'].includes(item.origin)&&Array.isArray(item.opponent_results)&&item.opponent_results.length<=20&&(!item.local_result||validResult(item.local_result))&&item.opponent_results.every(validResult));
}
export function archiveChallengeSpec(archive:ChallengeArchive,key:string,spec:ChallengeSpec,origin:'created'|'imported',createdAt=Date.now()):ChallengeArchive{
 const next=structuredClone(archive);const existing=next.items.find(item=>item.challenge_key===key);if(existing){existing.spec=structuredClone(spec);existing.origin=origin;return next;}
 next.items.unshift({challenge_key:key,spec:structuredClone(spec),created_at:createdAt,origin,opponent_results:[]});next.items=next.items.slice(0,1000);return next;
}
export function archiveLocalResult(archive:ChallengeArchive,key:string,result:CompactRelayResult):ChallengeArchive{
 const next=structuredClone(archive),item=next.items.find(row=>row.challenge_key===key);if(!item)throw new TypeError('unknown_challenge_archive');if(item.local_result?.run_id===result.run_id)return next;item.local_result=structuredClone(result);return next;
}
export function archiveOpponentResult(archive:ChallengeArchive,key:string,result:CompactRelayResult):ChallengeArchive{
 const next=structuredClone(archive),item=next.items.find(row=>row.challenge_key===key);if(!item)throw new TypeError('unknown_challenge_archive');if(item.opponent_results.some(row=>row.run_id===result.run_id))return next;item.opponent_results.unshift(structuredClone(result));item.opponent_results=item.opponent_results.slice(0,20);return next;
}
function object(value:unknown):value is Record<string,any>{return Boolean(value&&typeof value==='object'&&!Array.isArray(value));}
function validResult(value:unknown):value is CompactRelayResult{return object(value)&&typeof value.run_id==='string'&&value.run_id.length>0&&value.run_id.length<=64&&Number.isSafeInteger(value.score)&&value.score>=0&&Number.isSafeInteger(value.elapsed_ms)&&value.elapsed_ms>=0&&value.elapsed_ms<=900_000&&['victory','death','dnf'].includes(value.outcome);}
