import {canonicalJson,sha256} from './challenge-spec';
export type DailyTemplate={id:string;mission_id:'airlock'|'cargo';event_plan_id:string;seed:number;mode_id:'daily'};
export const dailyTemplates:readonly DailyTemplate[]=Object.freeze([
  {id:'airlock-base-events',mission_id:'airlock' as const,event_plan_id:'E02-v1_E03-v2',seed:0,mode_id:'daily' as const},
  {id:'airlock-base-clear',mission_id:'airlock' as const,event_plan_id:'none',seed:5,mode_id:'daily' as const},
  {id:'cargo-base-events',mission_id:'cargo' as const,event_plan_id:'E01-v2',seed:0,mode_id:'daily' as const},
  {id:'cargo-base-clear',mission_id:'cargo' as const,event_plan_id:'none',seed:3,mode_id:'daily' as const}
].sort((a,b)=>a.id.localeCompare(b.id)));
export async function dailySeed(dayId:string,scheduleVersion='daily-v1'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dayId))throw new TypeError('invalid_day');
  const hash=await sha256(`cinder-shift-64|${scheduleVersion}|${dayId}`);
  return new DataView(hash.buffer,hash.byteOffset,hash.byteLength).getUint32(0,false);
}
export async function selectDailyTemplate(dayId:string,templates:readonly DailyTemplate[]=dailyTemplates,scheduleVersion='daily-v1'){
  if(!templates.length)throw new TypeError('empty_daily_catalog');
  const sorted=[...templates].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  if(new Set(sorted.map(item=>item.id)).size!==sorted.length||sorted.some(item=>!/^[-a-z0-9_]{1,64}$/.test(item.id)))throw new TypeError('invalid_daily_catalog');
  const seed=await dailySeed(dayId,scheduleVersion);return{day_id:dayId,template:sorted[seed%sorted.length],daily_seed:seed};
}
export function utcDayId(date:Date){return date.toISOString().slice(0,10);}
export function dailyTemplateHash(template:DailyTemplate){return canonicalJson(template);}
