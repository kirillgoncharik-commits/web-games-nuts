import{loadout,type NodeId}from'./research';
import{validPlan}from'./events';
const nodeIds=['W1','M1','D1'] as const;
type SaveIssue='corrupt'|'incompatible'|'unknown_nodes'|null;
const object=(v:unknown):v is Record<string,any>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const uint=(v:unknown)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<=0xffffffff;
const ids=(v:unknown):v is NodeId[]=>Array.isArray(v)&&v.length<=3&&v.every(id=>(nodeIds as readonly string[]).includes(id))&&new Set(v).size===v.length;
export function validateLegacySave(v:unknown):SaveIssue{
  if(!object(v)||v.game_id!=='r01')return'corrupt';
  if(v.schema_version!==1||v.content_version!=='airlock-m04.1')return'incompatible';
  const d=v.campaign;if(!object(d)||!Array.isArray(d.nodes))return'corrupt';if(d.nodes.some(id=>!(nodeIds as readonly string[]).includes(id)))return'unknown_nodes';
  if(d.character_id!==undefined&&d.character_id!=='mira')return'corrupt';
  if(!ids(d.nodes)||typeof d.campaign_id!=='string'||d.campaign_id.length<8||d.campaign_id.length>100||!uint(d.campaign_seed)||d.mission_id!=='airlock'||!['research','briefing','mission','result','preview_complete'].includes(d.stage))return'corrupt';
  const expectedActive=d.nodes.includes('M1')?'M1':null;if(d.active!==expectedActive)return'corrupt';
  if(!Array.isArray(d.reward_ledger)||d.reward_ledger.length>1||d.reward_ledger.some(k=>k!==d.campaign_id+':airlock')||!Array.isArray(d.completed_missions)||d.completed_missions.length!==d.reward_ledger.length||d.completed_missions.some(m=>m!=='airlock'))return'corrupt';
  if(d.points!==1+d.reward_ledger.length-d.nodes.length||!Number.isInteger(d.points)||d.points<0)return'corrupt';
  if(!Array.isArray(d.processed_attempts)||d.processed_attempts.some(x=>typeof x!=='string')||new Set(d.processed_attempts).size!==d.processed_attempts.length)return'corrupt';
  if(typeof v.saved_at!=='string'||!Number.isFinite(Date.parse(v.saved_at))||typeof v.build_id!=='string')return'corrupt';
  if(d.entry!==null){const e=d.entry;if(!object(e)||e.mission_id!=='airlock'||e.seed!==d.campaign_seed||!object(e.build)||!ids(e.build.nodes)||e.build.nodes.some(n=>!d.nodes.includes(n))||['maxHp','spread','dash','active'].some(k=>e.build[k]!==loadout(e.build.nodes)[k as keyof ReturnType<typeof loadout>])||e.max_hp!==e.build.maxHp||e.initial_hp!==e.max_hp||e.initial_score!==0||!validPlan(e.event_plan))return'corrupt';}
  if(['briefing','mission','result','preview_complete'].includes(d.stage)&&!d.entry)return'corrupt';
  if(d.result!==null){const r=d.result;if(!object(r)||!['victory','death'].includes(r.result)||r.mission_id!=='airlock'||typeof r.attempt_id!=='string'||!d.processed_attempts.includes(r.attempt_id)||r.applied!==true||typeof r.reward_granted!=='boolean'||!ids(r.nodes)||typeof r.reason!=='string'||!Number.isFinite(r.active_ms)||r.active_ms<0||!Number.isFinite(r.screen_ms)||r.screen_ms<0||![6,8].includes(r.max_hp)||!Number.isInteger(r.hp)||r.hp<0||r.hp>r.max_hp||!Number.isInteger(r.score)||r.score<0||r.score>150)return'corrupt';}
  if(['result','preview_complete'].includes(d.stage)&&!d.result)return'corrupt';return null;
}
