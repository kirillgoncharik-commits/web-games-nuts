import {canonicalJson,sha256} from './challenge-spec';
export type CodeKind='challenge'|'handoff'|'response';
const prefixes:Record<CodeKind,string>={challenge:'CS64-C1',handoff:'CS64-H1',response:'CS64-R1'};
const MAX_CODE=4096,MAX_JSON=3072;
const allowedKeys:Record<CodeKind,readonly string[]>={
  challenge:['schema','challenge_key','spec','created_at'],
  handoff:['schema','handoff_id','template_id','team_challenge_key','stage_a','intel','support','event_plan_id','seed'],
  response:['schema','response_kind','challenge_key','result','handoff_digest','team_challenge_key','stage_a','stage_b','team_score','team_elapsed_ms','solo']
};
function bytesToBase64(bytes:Uint8Array){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function base64ToBytes(value:string){const base=value.replace(/-/g,'+').replace(/_/g,'/');const binary=atob(base+'='.repeat((4-base.length%4)%4));return Uint8Array.from(binary,char=>char.charCodeAt(0));}
async function digest16(bytes:Uint8Array){return Array.from((await sha256(bytes)).slice(0,16),value=>value.toString(16).padStart(2,'0')).join('');}
function validate(kind:CodeKind,value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const object=value as Record<string,unknown>;if(Object.keys(object).some(key=>!allowedKeys[kind].includes(key)))return false;
  if(object.schema!==prefixes[kind])return false;
  if(kind==='challenge')return typeof object.challenge_key==='string'&&object.challenge_key.length<=80&&object.spec!==null&&typeof object.spec==='object'&&Object.keys(object.spec as object).length<=16;
  if(kind==='handoff')return typeof object.handoff_id==='string'&&object.handoff_id.length<=64&&typeof object.template_id==='string'&&object.template_id==='relay_airlock_cargo_v1'&&typeof object.team_challenge_key==='string'&&object.team_challenge_key.length<=80&&validCompactResult(object.stage_a)&&typeof object.intel==='boolean'&&['none','power','repair'].includes(object.support as string)&&typeof object.event_plan_id==='string'&&object.event_plan_id.length<=64&&uint(object.seed);
  if(object.response_kind==='duel')return Object.keys(object).every(key=>['schema','response_kind','challenge_key','result'].includes(key))&&typeof object.challenge_key==='string'&&object.challenge_key.length<=80&&validCompactResult(object.result);
  const stageA=validCompactResult(object.stage_a),stageB=validCompactResult(object.stage_b);
  return object.response_kind==='relay'&&typeof object.handoff_digest==='string'&&/^[a-f0-9]{32}$/.test(object.handoff_digest)&&typeof object.team_challenge_key==='string'&&object.team_challenge_key.length<=80&&stageA&&stageB&&uint(object.team_score)&&uint(object.team_elapsed_ms)&&typeof object.solo==='boolean'&&object.team_score===((object.stage_a as CompactResult).score+(object.stage_b as CompactResult).score)&&object.team_elapsed_ms===((object.stage_a as CompactResult).elapsed_ms+(object.stage_b as CompactResult).elapsed_ms);
}
type CompactResult={run_id:string;score:number;elapsed_ms:number;outcome:'victory'|'death'|'dnf';breakdown?:Record<string,number>};
function uint(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=0xffffffff;}
function validCompactResult(value:unknown):value is CompactResult{if(!value||typeof value!=='object'||Array.isArray(value))return false;const item=value as Record<string,unknown>;return Object.keys(item).every(key=>['run_id','score','elapsed_ms','outcome','breakdown'].includes(key))&&typeof item.run_id==='string'&&item.run_id.length<=64&&uint(item.score)&&item.score<=100_000_000&&uint(item.elapsed_ms)&&item.elapsed_ms<=900_000&&['victory','death','dnf'].includes(item.outcome as string)&&(!item.breakdown||typeof item.breakdown==='object'&&!Array.isArray(item.breakdown)&&Object.keys(item.breakdown).length<=8&&Object.values(item.breakdown as object).every(uint));}
export async function encodeCode(kind:CodeKind,payload:Record<string,unknown>){
  if(!validate(kind,payload))throw new TypeError('invalid_code_payload');
  const json=canonicalJson(payload),bytes=new TextEncoder().encode(json);if(bytes.length>MAX_JSON)throw new RangeError('code_payload_too_large');
  const code=`${prefixes[kind]}.${bytesToBase64(bytes)}.${await digest16(bytes)}`;if(code.length>MAX_CODE)throw new RangeError('code_too_large');return code;
}
export async function decodeCode(input:string,expected?:CodeKind){
  const code=typeof input==='string'?input.trim():'';
  if(code.length<20||code.length>MAX_CODE||!/^[\x21-\x7e]+$/.test(code))throw new TypeError('invalid_code');
  const [prefix,encoded,digest,...rest]=code.split('.');if(rest.length||!/^[A-Za-z0-9_-]+$/.test(encoded)||!/^[a-f0-9]{32}$/.test(digest))throw new TypeError('invalid_code');
  const kind=(Object.keys(prefixes) as CodeKind[]).find(item=>prefixes[item]===prefix);if(!kind||expected&&expected!==kind)throw new TypeError('unknown_code_schema');
  let bytes:Uint8Array;try{bytes=base64ToBytes(encoded);}catch{throw new TypeError('invalid_code_encoding');}
  if(bytes.length>MAX_JSON||await digest16(bytes)!==digest)throw new TypeError('invalid_code_digest');
  const json=new TextDecoder('utf-8',{fatal:true}).decode(bytes);let payload:unknown;try{payload=JSON.parse(json);}catch{throw new TypeError('invalid_code_json');}
  if(canonicalJson(payload)!==json||!validate(kind,payload))throw new TypeError('invalid_code_payload');
  return{kind,payload:structuredClone(payload) as Record<string,unknown>,digest};
}
export const codeLimits={maxCode:MAX_CODE,maxJson:MAX_JSON};
