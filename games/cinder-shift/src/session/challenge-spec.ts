import type {PlayableMissionId} from './missions';
import type {RunModeId,RunTimingPolicy} from './run-clock';

export type ChallengeSpec=Readonly<{
  game_id:'cinder-shift-64';mode_id:RunModeId;mission_ids:readonly PlayableMissionId[];ruleset_id:string;
  content_hash:string;simulation_version:string;preset_id:string;event_plan_id:string;seed:number;
  timing_policy:RunTimingPolicy;scoring_version:string;comparison_metric:'elapsed_ms'|'score';assist_profile:'standard-manual'|'assisted';duration_limit_ms:number;
}>;
export type ChallengeInput=Omit<ChallengeSpec,'game_id'>;
export const trialRuleset='combat-clear-v2';
export const trialMissions=['airlock','cargo'] as const;
export const trialSimulationVersion='phaser-60hz-rework1';
export const trialContentId=(mission:string)=>`${mission}-rework1`;
export function isTrialMission(value:unknown):value is typeof trialMissions[number] {
  return trialMissions.some(mission=>mission===value);
}
const validMode=new Set<RunModeId>(['time_attack','score_attack','daily','duel','relay']);
export function makeChallengeSpec(input:ChallengeInput):ChallengeSpec{
  if(!validMode.has(input.mode_id)||input.mission_ids.length<1||input.mission_ids.length>2||input.mission_ids.some(id=>!isTrialMission(id)))throw new TypeError('invalid_challenge');
  if(!['standard','personal'].includes(input.timing_policy)||!['elapsed_ms','score'].includes(input.comparison_metric)||!['standard-manual','assisted'].includes(input.assist_profile))throw new TypeError('invalid_challenge_policy');
  if(!Number.isInteger(input.seed)||input.seed<0||input.seed>0xffffffff||!Number.isInteger(input.duration_limit_ms)||input.duration_limit_ms<1||input.duration_limit_ms>900_000)throw new TypeError('invalid_challenge_limits');
  for(const value of [input.ruleset_id,input.content_hash,input.simulation_version,input.preset_id,input.event_plan_id,input.scoring_version])if(!/^[A-Za-z0-9_.:-]{1,96}$/.test(value))throw new TypeError('invalid_challenge_text');
  const spec={game_id:'cinder-shift-64' as const,...input,mission_ids:Object.freeze([...input.mission_ids])};
  return Object.freeze(spec);
}
export function canonicalJson(value:unknown):string{
  const visit=(item:unknown):string=>{
    if(item===null||typeof item==='boolean'||typeof item==='string')return JSON.stringify(item);
    if(typeof item==='number'){if(!Number.isFinite(item))throw new TypeError('non_finite_number');return JSON.stringify(item);}
    if(Array.isArray(item))return`[${item.map(visit).join(',')}]`;
    if(typeof item==='object'){
      const object=item as Record<string,unknown>;
      if(Object.getPrototypeOf(object)!==Object.prototype&&Object.getPrototypeOf(object)!==null)throw new TypeError('unsupported_object');
      return`{${Object.keys(object).sort().map(key=>`${JSON.stringify(key)}:${visit(object[key])}`).join(',')}}`;
    }
    throw new TypeError('unsupported_value');
  };
  return visit(value);
}
export async function sha256(value:string|Uint8Array):Promise<Uint8Array>{
  const bytes=typeof value==='string'?new TextEncoder().encode(value):value;
  const copy=new Uint8Array(bytes.byteLength);copy.set(bytes);
  return new Uint8Array(await crypto.subtle.digest('SHA-256',copy.buffer as ArrayBuffer));
}
export async function sha256Hex(value:string|Uint8Array){return Array.from(await sha256(value),byte=>byte.toString(16).padStart(2,'0')).join('');}
export async function challengeKey(spec:ChallengeSpec){return`CS64-${await sha256Hex(canonicalJson(spec))}`;}
