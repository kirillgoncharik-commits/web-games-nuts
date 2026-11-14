import {loadout} from './research';
import {planEvents,type EventPlan} from './events';
import type {MissionEntry,RelaySupport} from './campaign';
import {makeChallengeSpec,trialContentId,trialSimulationVersion,challengeKey,type ChallengeSpec} from './challenge-spec';

export const RELAY_TEMPLATE='relay_airlock_cargo_v1';
export type CompactRelayResult={run_id:string;score:number;elapsed_ms:number;outcome:'victory'|'death'|'dnf';breakdown?:Record<string,number>};
export type RelayHandoff={schema:'CS64-H1';handoff_id:string;template_id:string;team_challenge_key:string;stage_a:CompactRelayResult;intel:boolean;support:RelaySupport;event_plan_id:string;seed:number};
export type RelayReceipt={schema:'CS64-R1';response_kind:'relay';handoff_digest:string;team_challenge_key:string;stage_a:CompactRelayResult;stage_b:CompactRelayResult;team_score:number;team_elapsed_ms:number;solo:boolean};
export type RelayBranch={handoff_digest:string;team_challenge_key:string;stage_a_run_id:string;support:RelaySupport;receipt:RelayReceipt;received_at:number};
export type RelayRecords={version:1;handoffs:RelayHandoff[];handoff_digests:string[];branches:RelayBranch[]};
export const emptyRelayRecords=():RelayRecords=>({version:1,handoffs:[],handoff_digests:[],branches:[]});
const ENTRY_B_EVENT:EventPlan=[{event_id:'E01',definition_version:2,room_id:'F',variant:'emergency-power'}];

export function relayStageAEntry():MissionEntry{return{mission_id:'airlock',seed:4,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:planEvents(4,'airlock'),relay_template:RELAY_TEMPLATE,relay_leg:'A',relay_support:'none'};}
export function relayStageBEntry(support:RelaySupport):MissionEntry{return{mission_id:'cargo',seed:4,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:structuredClone(ENTRY_B_EVENT),relay_template:RELAY_TEMPLATE,relay_leg:'B',relay_support:support};}
export function relayEventPlanId(){return`A-${planEvents(4,'airlock').map(event=>`${event.event_id}-v${event.definition_version}`).join('_')||'none'}_B-E01-v2`;}
export function makeRelaySpec(support:RelaySupport):ChallengeSpec{return makeChallengeSpec({mode_id:'relay',mission_ids:['airlock','cargo'],ruleset_id:'relay-combat-clear-v7',content_hash:trialContentId('relay-airlock-cargo'),simulation_version:trialSimulationVersion,preset_id:'base-mira-6hp-no-modules',event_plan_id:`${relayEventPlanId()}_support-${support}`,seed:4,timing_policy:'standard',scoring_version:'score-v1',comparison_metric:'score',assist_profile:'standard-manual',duration_limit_ms:900_000});}
export async function relayTeamKey(support:RelaySupport){return challengeKey(makeRelaySpec(support));}
export function compactRelayResult(run:{run_id:string;score:number;elapsed_ms:number;outcome:'victory'|'death'|'cancelled'},breakdown?:Record<string,number>):CompactRelayResult{return{run_id:run.run_id,score:run.score,elapsed_ms:run.elapsed_ms,outcome:run.outcome==='cancelled'?'dnf':run.outcome,...(breakdown?{breakdown}: {})};}
export async function validateRelayHandoff(value:unknown):Promise<RelayHandoff>{
 if(!object(value)||value.schema!=='CS64-H1'||value.template_id!==RELAY_TEMPLATE||!validCompact(value.stage_a)||value.stage_a.outcome!=='victory'||typeof value.intel!=='boolean'||!isSupport(value.support)||!uint(value.seed)||value.seed!==4||value.event_plan_id!==relayEventPlanId()||typeof value.handoff_id!=='string'||value.handoff_id.length<1||value.handoff_id.length>64)throw new TypeError('invalid_relay_handoff');
 if(!value.intel&&value.support!=='none')throw new TypeError('relay_support_requires_intel');
 const expected=await relayTeamKey(value.support);if(value.team_challenge_key!==expected)throw new TypeError('relay_team_key_mismatch');
 return structuredClone(value) as RelayHandoff;
}
export function makeRelayReceipt(input:{handoffDigest:string;teamChallengeKey:string;stageA:CompactRelayResult;stageB:CompactRelayResult;solo:boolean}):RelayReceipt{
 if(!/^[a-f0-9]{32}$/.test(input.handoffDigest)||!validCompact(input.stageA)||!validCompact(input.stageB)||input.stageA.outcome!=='victory'||input.stageB.outcome!=='victory')throw new TypeError('invalid_relay_result');
 return{schema:'CS64-R1',response_kind:'relay',handoff_digest:input.handoffDigest,team_challenge_key:input.teamChallengeKey,stage_a:structuredClone(input.stageA),stage_b:structuredClone(input.stageB),team_score:input.stageA.score+input.stageB.score,team_elapsed_ms:input.stageA.elapsed_ms+input.stageB.elapsed_ms,solo:input.solo};
}
export async function validateRelayReceipt(value:unknown,handoff:RelayHandoff,digest:string):Promise<RelayReceipt>{
 if(!object(value)||value.schema!=='CS64-R1'||value.response_kind!=='relay'||!validCompact(value.stage_a)||!validCompact(value.stage_b)||value.stage_a.outcome!=='victory'||value.stage_b.outcome!=='victory'||typeof value.solo!=='boolean'||value.handoff_digest!==digest||value.team_challenge_key!==handoff.team_challenge_key||value.stage_a.run_id!==handoff.stage_a.run_id||value.team_score!==value.stage_a.score+value.stage_b.score||value.team_elapsed_ms!==value.stage_a.elapsed_ms+value.stage_b.elapsed_ms)throw new TypeError('relay_receipt_mismatch');
 await validateRelayHandoff(handoff);return structuredClone(value) as RelayReceipt;
}
export function validateRelayRecords(value:unknown):value is RelayRecords{
 if(!object(value)||value.version!==1||!Array.isArray(value.handoffs)||value.handoffs.length>100||!Array.isArray(value.handoff_digests)||value.handoff_digests.length>100||!Array.isArray(value.branches)||value.branches.length>500)return false;
 return value.handoff_digests.every(d=>typeof d==='string'&&/^[a-f0-9]{32}$/.test(d))&&value.branches.every(branch=>object(branch)&&/^[a-f0-9]{32}$/.test(String(branch.handoff_digest))&&typeof branch.team_challenge_key==='string'&&typeof branch.stage_a_run_id==='string'&&isSupport(branch.support)&&Number.isSafeInteger(branch.received_at)&&object(branch.receipt)&&branch.receipt.handoff_digest===branch.handoff_digest&&branch.receipt.team_challenge_key===branch.team_challenge_key);
}
export function addRelayBranch(records:RelayRecords,branch:RelayBranch):RelayRecords{if(!validateRelayRecords(records))throw new TypeError('invalid_relay_records');const next=structuredClone(records);if(next.branches.some(item=>item.handoff_digest===branch.handoff_digest&&item.receipt.stage_b.run_id===branch.receipt.stage_b.run_id))return next;next.branches.unshift(structuredClone(branch));next.branches=next.branches.slice(0,500);return next;}
function object(value:unknown):value is Record<string,any>{return Boolean(value&&typeof value==='object'&&!Array.isArray(value));}
function uint(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=0xffffffff;}
function isSupport(value:unknown):value is RelaySupport{return value==='none'||value==='power'||value==='repair';}
function validCompact(value:unknown):value is CompactRelayResult{return object(value)&&typeof value.run_id==='string'&&value.run_id.length>0&&value.run_id.length<=64&&uint(value.score)&&value.score<=100_000_000&&uint(value.elapsed_ms)&&value.elapsed_ms<=900_000&&['victory','death','dnf'].includes(value.outcome)&&(!value.breakdown||object(value.breakdown)&&Object.keys(value.breakdown).length<=8&&Object.values(value.breakdown).every(uint));}
