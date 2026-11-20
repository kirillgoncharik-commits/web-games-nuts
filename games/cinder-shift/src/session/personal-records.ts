import type {CampaignData} from './campaign';
import {makeChallengeSpec,type ChallengeSpec} from './challenge-spec';

export type CombatCounters={shots:number;hits:number;total_ms:number;mission_ms:number};
export type StatisticsFragment=CombatCounters&{campaign_ms:Record<string,number>};
export type CampaignRecord={id:string;world:string;content_version:string;completed_at:string;active_ms:number;deaths:number;score:number;route:string|null;ruleset:string;assisted:boolean;history_complete:boolean};
export type CampaignBaseline={active_ms:number;history_complete:boolean};
export type PersonalRecords={version:1;started_at:string;sessions:Record<string,StatisticsFragment>;campaign_baselines:Record<string,CampaignBaseline>;completed:CampaignRecord[];specs:Record<string,ChallengeSpec>};
const object=(v:unknown):v is Record<string,any>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const uint=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>=1&&v.length<=100&&!['__proto__','constructor','prototype'].includes(v);
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const world=(v:unknown)=>['r01','c02-small-world','c03-adriatic-1986'].includes(v as string);
export const emptyFragment=():StatisticsFragment=>({shots:0,hits:0,total_ms:0,mission_ms:0,campaign_ms:{}});
export const emptyPersonalRecords=(startedAt=new Date().toISOString()):PersonalRecords=>({version:1,started_at:startedAt,sessions:{},campaign_baselines:{},completed:[],specs:{}});
export function validatePersonalRecords(v:unknown):v is PersonalRecords{
 if(!object(v)||v.version!==1||!date(v.started_at)||!object(v.sessions)||!object(v.campaign_baselines)||!Array.isArray(v.completed)||!object(v.specs)||Object.keys(v.specs).length>1000)return false;
 try{for(const [key,spec]of Object.entries(v.specs)){if(!id(key)||!object(spec)||spec.game_id!=='cinder-shift-64')return false;makeChallengeSpec(spec as any);}}catch{return false;}
 if(Object.keys(v.sessions).length>10000||Object.keys(v.campaign_baselines).length>10000||v.completed.length>10000)return false;
 if(!Object.entries(v.sessions).every(([key,s])=>id(key)&&object(s)&&['shots','hits','total_ms','mission_ms'].every(k=>uint(s[k]))&&s.hits<=s.shots&&s.mission_ms<=s.total_ms&&object(s.campaign_ms)&&Object.entries(s.campaign_ms).every(([key,time])=>id(key)&&uint(time)&&time<=s.mission_ms)))return false;
 if(!Object.entries(v.campaign_baselines).every(([key,b])=>id(key)&&object(b)&&uint(b.active_ms)&&typeof b.history_complete==='boolean'))return false;
 if(!v.completed.every((r:unknown)=>object(r)&&id(r.id)&&world(r.world)&&id(r.content_version)&&date(r.completed_at)&&uint(r.active_ms)&&uint(r.deaths)&&uint(r.score)&&typeof r.ruleset==='string'&&r.ruleset.length<=100&&typeof r.assisted==='boolean'&&typeof r.history_complete==='boolean'&&(r.route===null||['service','press'].includes(r.route))))return false;
 const sums={shots:0,hits:0,total_ms:0,mission_ms:0};for(const row of Object.values(v.sessions) as CombatCounters[])for(const key of ['shots','hits','total_ms','mission_ms'] as const)sums[key]+=row[key];if(Object.values(sums).some(value=>!Number.isSafeInteger(value)))return false;
 return new Set(v.completed.map((r:CampaignRecord)=>r.id)).size===v.completed.length;
}
/** Cumulative fragments make retries idempotent and stale tabs monotonic. */
export function mergePersonalRecords(stored:unknown,incoming:PersonalRecords):PersonalRecords{
 if(stored!==undefined&&!validatePersonalRecords(stored))throw Error('personal_records_unreadable');
 if(!validatePersonalRecords(incoming))throw Error('personal_records_invalid');
 const result=structuredClone(stored===undefined?emptyPersonalRecords(incoming.started_at):stored as PersonalRecords);
 if(incoming.started_at<result.started_at)result.started_at=incoming.started_at;
 for(const [key,row]of Object.entries(incoming.sessions)){
  const old=result.sessions[key]||emptyFragment(),merged:StatisticsFragment={...old,campaign_ms:{...old.campaign_ms}};
  for(const field of ['shots','hits','total_ms','mission_ms'] as const)merged[field]=Math.max(old[field],row[field]);
  for(const [campaign,ms]of Object.entries(row.campaign_ms))merged.campaign_ms[campaign]=Math.max(old.campaign_ms[campaign]||0,ms);
  result.sessions[key]=merged;
 }
 for(const [key,row]of Object.entries(incoming.campaign_baselines))result.campaign_baselines[key]??=structuredClone(row);
 for(const [key,spec]of Object.entries(incoming.specs))result.specs[key]??=structuredClone(spec);
 for(const row of incoming.completed)if(!result.completed.some(r=>r.id===row.id))result.completed.push(structuredClone(row));
 result.completed.sort((a,b)=>b.completed_at.localeCompare(a.completed_at));
 if(!validatePersonalRecords(result))throw Error('personal_records_capacity');
 return result;
}
export function statisticsTotals(data:PersonalRecords):CombatCounters{
 const total={shots:0,hits:0,total_ms:0,mission_ms:0};
 for(const row of Object.values(data.sessions))for(const key of ['shots','hits','total_ms','mission_ms'] as const)total[key]+=row[key];
 return total;
}
export const accuracy=(shots:number,hits:number)=>shots===0?null:Math.round(hits/shots*1000)/10;
export type ActivityContext={ready:boolean;visible:boolean;focused:boolean;state:string;panel:boolean;transition:boolean;hostPaused:boolean};
export function canTrackTime(context:ActivityContext){
 return context.ready&&context.visible&&context.focused&&!context.hostPaused&&!context.transition&&!['loading','countdown','paused','dying','error'].includes(context.state)&&(context.state==='playing'||context.panel);
}
export class PersonalStatistics{
 readonly sessionId=crypto.randomUUID();private own=emptyFragment();private lastAt:number|null=null;private active=false;private inMission=false;private campaignId:string|null=null;
 data=emptyPersonalRecords();ready=false;writable=true;unsaved=false;saveFailed=false;recovered=false;private queue:Promise<unknown>=Promise.resolve();private checkpointMs=0;
 constructor(private readonly store:{loadModeData:(key:'personal-records.v1'|'personal-records.backup.v1')=>Promise<{ok:boolean;value?:unknown}>;updatePersonalRecords:(incoming:PersonalRecords)=>Promise<PersonalRecords|null>}){}
 async load(){
  const loaded=await this.store.loadModeData('personal-records.v1');this.writable=loaded.ok&&(loaded.value===undefined||validatePersonalRecords(loaded.value));
  if(this.writable&&loaded.value)this.data=mergePersonalRecords(this.data,loaded.value as PersonalRecords);
  else if(loaded.ok&&loaded.value!==undefined){const backup=await this.store.loadModeData('personal-records.backup.v1');if(backup.ok&&validatePersonalRecords(backup.value)){this.data=mergePersonalRecords(this.data,backup.value);this.recovered=true;this.writable=object(loaded.value)&&loaded.value.version===1;}}
  this.ready=true;
 }
 tick(now:number,active:boolean,inMission:boolean,campaignId:string|null=null){
  if(!Number.isFinite(now))return;
  const delta=this.lastAt===null?0:now-this.lastAt;
  // A suspended device / long stalled frame starts a fresh interval.
  if(this.ready&&this.active&&delta>=0&&delta<=1500){this.own.total_ms+=delta;if(this.inMission){this.own.mission_ms+=delta;if(this.campaignId)this.own.campaign_ms[this.campaignId]=(this.own.campaign_ms[this.campaignId]||0)+delta;}if(delta)this.unsaved=true;}
  this.lastAt=now;this.active=active;this.inMission=active&&inMission;this.campaignId=campaignId;
  if(this.own.total_ms-this.checkpointMs>=15000){this.checkpointMs=this.own.total_ms;void this.flush();}
 }
 combat(kind:'shots'|'hits'){if(!this.ready)return;this.own[kind]++;this.unsaved=true;}
 registerCampaign(c:CampaignData,existing=false){if(this.data.campaign_baselines[c.campaign_id])return;this.data.campaign_baselines[c.campaign_id]={active_ms:Math.floor(c.run_stats.active_ms),history_complete:c.run_stats.history_complete&&!(existing&&c.stage==='mission')};}
 complete(c:CampaignData,worldId:string,contentId:string,completedAt=new Date().toISOString()){
  if(c.stage!=='campaign_complete'||this.data.completed.some(r=>r.id===c.campaign_id))return;
  this.registerCampaign(c);const view=this.snapshot(),baseline=view.campaign_baselines[c.campaign_id];
  const measured=baseline.active_ms+Object.values(view.sessions).reduce((sum,row)=>sum+(row.campaign_ms[c.campaign_id]||0),0);
  this.data.completed.push({id:c.campaign_id,world:worldId,content_version:contentId,completed_at:completedAt,active_ms:measured,deaths:c.run_stats.deaths,score:c.run_stats.score,route:c.run_stats.foundry_route,ruleset:c.run_stats.ruleset_id||'legacy',assisted:c.run_stats.assisted,history_complete:baseline.history_complete});this.unsaved=true;
 }
 importCareer(runs:readonly {campaign_id:string;content_version:string;completed_at:string;active_ms:number;deaths:number;score:number;foundry_route:string|null;ruleset_id?:string;assistance:string;history_complete:boolean}[]){
  for(const r of runs)if(!this.data.completed.some(c=>c.id===r.campaign_id)){
   const record={id:r.campaign_id,world:'r01',content_version:r.content_version,completed_at:r.completed_at,active_ms:Math.floor(r.active_ms),deaths:r.deaths,score:r.score,route:r.foundry_route,ruleset:r.ruleset_id||'legacy',assisted:r.assistance==='assisted',history_complete:r.history_complete};
   if(validatePersonalRecords({...emptyPersonalRecords(),completed:[record]}))this.data.completed.push(record);
  }
 }
 snapshot():PersonalRecords{
  const incoming=structuredClone(this.data),own=structuredClone(this.own);own.total_ms=Math.floor(own.total_ms);own.mission_ms=Math.floor(own.mission_ms);for(const id in own.campaign_ms)own.campaign_ms[id]=Math.floor(own.campaign_ms[id]);incoming.sessions[this.sessionId]=own;
  return mergePersonalRecords(undefined,incoming);
 }
 flush(){
  if(!this.ready||!this.writable)return Promise.resolve(false);
  const operation=async()=>{try{const incoming=this.snapshot(),saved=await this.store.updatePersonalRecords(incoming);if(!saved){this.unsaved=true;this.saveFailed=true;return false;}this.data=mergePersonalRecords(this.data,saved);this.unsaved=JSON.stringify(this.snapshot())!==JSON.stringify(saved);this.saveFailed=false;return true;}catch{this.unsaved=true;this.saveFailed=true;return false;}};
  const pending=this.queue.then(operation,operation);this.queue=pending;return pending;
 }
}
