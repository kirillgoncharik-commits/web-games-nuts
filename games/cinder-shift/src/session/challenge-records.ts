import type {ChallengeSpec} from './challenge-spec';
import type {RunResult} from './run-clock';

export type StoredRun=Pick<RunResult,'run_id'|'challenge_key'|'mode'|'state'|'eligibility'|'elapsed_ms'|'sim_ms'|'score'|'outcome'|'pause_count'|'finished_at'>&{splits?:readonly {checkpoint_id:string;elapsed_ms:number}[];medal?:'bronze'|'silver'|'gold'|null};
export type PersonalBest={challenge_key:string;mode:string;metric:'elapsed_ms'|'score';value:number;run_id:string;updated_at:number};
export type GhostPoint={t:number;x:number;y:number;room:string;facing?:1|-1;animation_id?:'idle'|'run'|'jump'|'crouch';event?:'room_enter'};
export type GhostTrace={challenge_key:string;run_id:string;sampled_at:number;points:readonly GhostPoint[]};
export type ChallengeRecords={version:1;best:PersonalBest[];recent:Record<string,StoredRun[]>;traces:GhostTrace[]};
export const MAX_GHOST_TRACE_BYTES=300*1024;
export const emptyChallengeRecords=():ChallengeRecords=>({version:1,best:[],recent:{},traces:[]});
export function validateChallengeRecords(value:unknown):value is ChallengeRecords{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;const data=value as Record<string,unknown>;
  if(data.version!==1||!Array.isArray(data.best)||data.best.length>1000||!data.recent||typeof data.recent!=='object'||Array.isArray(data.recent)||!Array.isArray(data.traces))return false;
  if(!data.best.every((row:unknown)=>{if(!row||typeof row!=='object')return false;const r=row as Record<string,unknown>;return typeof r.challenge_key==='string'&&r.challenge_key.length<=80&&typeof r.mode==='string'&&['elapsed_ms','score'].includes(r.metric as string)&&uint(r.value)&&typeof r.run_id==='string'&&r.run_id.length<=80&&uint(r.updated_at);}))return false;
  const recent=data.recent as Record<string,unknown>;
  if(Object.keys(recent).length>1000||!Object.entries(recent).every(([key,runs])=>key.length<=80&&Array.isArray(runs)&&runs.length<=20&&runs.every(validRun)))return false;
  if(data.traces.length>10||data.traces.reduce((sum,trace)=>sum+traceBytes(trace),0)>3*1024*1024||data.traces.some(trace=>traceBytes(trace)>MAX_GHOST_TRACE_BYTES))return false;
  return data.traces.every(validTrace);
}
export function recordChallengeRun(input:ChallengeRecords,spec:ChallengeSpec,run:StoredRun,updatedAt=Date.now()):{records:ChallengeRecords;isPersonalBest:boolean;duplicate:boolean}{
  const records=structuredClone(input);if(!validateChallengeRecords(records))throw new TypeError('invalid_challenge_records');
  const rows=records.recent[run.challenge_key]??[];if(rows.some(row=>row.run_id===run.run_id))return{records,isPersonalBest:false,duplicate:true};
  records.recent[run.challenge_key]=[run,...rows].slice(0,20);
  let isPersonalBest=false;
  if(run.outcome==='victory'&&run.eligibility==='standard'&&run.state==='finished'){
    const value=spec.comparison_metric==='score'?run.score:run.elapsed_ms;
    const previous=records.best.find(row=>row.challenge_key===run.challenge_key);
    const improved=!previous||previous.metric!==spec.comparison_metric||(spec.comparison_metric==='score'?value>previous.value:value<previous.value);
    if(improved){isPersonalBest=true;const entry:PersonalBest={challenge_key:run.challenge_key,mode:spec.mode_id,metric:spec.comparison_metric,value,run_id:run.run_id,updated_at:updatedAt};records.best=[...records.best.filter(row=>row.challenge_key!==run.challenge_key),entry];}
  }
  if(records.best.length>1000)records.best.sort((a,b)=>b.updated_at-a.updated_at).splice(1000);
  return{records, isPersonalBest, duplicate:false};
}
export function addGhostTrace(input:ChallengeRecords,trace:GhostTrace):ChallengeRecords{
  if(!validTrace(trace)||traceBytes(trace)>MAX_GHOST_TRACE_BYTES)throw new TypeError('invalid_ghost_trace');
  const records=structuredClone(input);records.traces=records.traces.filter(item=>item.run_id!==trace.run_id);
  records.traces.push(structuredClone(trace));records.traces.sort((a,b)=>b.sampled_at-a.sampled_at);
  while(records.traces.length>10||records.traces.reduce((sum,item)=>sum+traceBytes(item),0)>3*1024*1024)records.traces.pop();
  return records;
}
export function sampleGhostTrace(points:readonly GhostPoint[],time:number,room:string):GhostPoint|null{
  if(!Number.isFinite(time)||!points.length)return null;
  let before:GhostPoint|undefined,after:GhostPoint|undefined;
  for(const point of points){if(point.t<=time)before=point;if(point.t>=time){after=point;break;}}
  if(before&&after&&before.room===room&&after.room===room&&after.t>before.t&&after.t-before.t<=200){
    const ratio=(time-before.t)/(after.t-before.t);return{t:time,room,x:before.x+(after.x-before.x)*ratio,y:before.y+(after.y-before.y)*ratio,facing:ratio<.5?before.facing:after.facing,animation_id:ratio<.5?before.animation_id:after.animation_id};
  }
  const nearest=points.reduce<{point:GhostPoint|null;distance:number}>((best,point)=>{const distance=Math.abs(point.t-time);return distance<best.distance?{point,distance}:best;},{point:null,distance:Infinity});
  return nearest.point&&nearest.point.room===room&&nearest.distance<=120?nearest.point:null;
}
export function bestFor(records:ChallengeRecords,key:string){return records.best.find(row=>row.challenge_key===key)??null;}
function validRun(value:unknown):value is StoredRun{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;const run=value as Record<string,unknown>;
  return Object.keys(run).every(key=>['run_id','challenge_key','mode','state','eligibility','elapsed_ms','sim_ms','score','outcome','pause_count','finished_at','splits','medal'].includes(key))&&typeof run.run_id==='string'&&run.run_id.length<=80&&typeof run.challenge_key==='string'&&run.challenge_key.length<=80&&['time_attack','score_attack','daily','duel','relay'].includes(run.mode as string)&&['finished','dnf'].includes(run.state as string)&&['standard','practice'].includes(run.eligibility as string)&&uint(run.elapsed_ms)&&uint(run.sim_ms)&&uint(run.score)&&['victory','death','cancelled'].includes(run.outcome as string)&&uint(run.pause_count)&&uint(run.finished_at)&&(!run.medal||['bronze','silver','gold'].includes(run.medal as string))&&(!run.splits||Array.isArray(run.splits)&&run.splits.length<=32&&run.splits.every((split:unknown)=>Boolean(split&&typeof split==='object'&&typeof (split as any).checkpoint_id==='string'&&(split as any).checkpoint_id.length<=32&&uint((split as any).elapsed_ms))));
}
function validTrace(value:unknown):value is GhostTrace{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;const trace=value as Record<string,unknown>;
  return typeof trace.challenge_key==='string'&&trace.challenge_key.length<=80&&typeof trace.run_id==='string'&&trace.run_id.length<=80&&uint(trace.sampled_at)&&Array.isArray(trace.points)&&trace.points.length<=90_001&&trace.points.every(point=>{if(!point||typeof point!=='object')return false;const p=point as Record<string,unknown>;return Number.isSafeInteger(p.t)&&typeof p.x==='number'&&Number.isFinite(p.x)&&typeof p.y==='number'&&Number.isFinite(p.y)&&typeof p.room==='string'&&p.room.length<=16&&(p.facing===undefined||p.facing===1||p.facing===-1)&&(p.animation_id===undefined||['idle','run','jump','crouch'].includes(p.animation_id as string))&&(p.event===undefined||p.event==='room_enter');});
}
function traceBytes(trace:unknown){try{return new TextEncoder().encode(JSON.stringify(trace)).byteLength;}catch{return Infinity;}}
function uint(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;}
