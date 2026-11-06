import {contentVersion,type CampaignData} from './campaign';
import {nodeIds,loadout,type NodeId} from './research';
import {validPlan} from './events';
export const databaseName='cinder-shift-r01';
export const schemaVersion=1;
export type Settings={locale:'en'|'ru';muted:boolean;touchMode:'auto'|'on'|'off';layout:'dock'|'sides';autofire:boolean;debugBodies:boolean;musicVolume:number;sfxVolume:number;uiVolume:number};
export type SaveIssue='unavailable'|'write_failed'|'corrupt'|'incompatible'|'unknown_nodes'|null;
export type Envelope={schema_version:1;content_version:string;game_id:'r01';build_id:string;saved_at:string;campaign:CampaignData};
export const defaults=(locale:'en'|'ru'):Settings=>({locale,muted:false,touchMode:'auto',layout:'dock',autofire:true,debugBodies:false,musicVolume:.18,sfxVolume:.75,uiVolume:.6});
const object=(v:unknown):v is Record<string,any>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const uint=(v:unknown)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<=0xffffffff;
const ids=(v:unknown):v is NodeId[]=>Array.isArray(v)&&v.length<=3&&v.every(id=>nodeIds.includes(id))&&new Set(v).size===v.length;
export function validateSave(v:unknown):SaveIssue{
  if(!object(v)||v.game_id!=='r01')return'corrupt';
  if(v.schema_version!==schemaVersion||v.content_version!==contentVersion)return'incompatible';
  const d=v.campaign;if(!object(d)||!Array.isArray(d.nodes))return'corrupt';if(d.nodes.some(id=>!nodeIds.includes(id)))return'unknown_nodes';
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
export function validateSettings(v:unknown,locale:'en'|'ru'):Settings{
  const d=defaults(locale);if(!object(v))return d;const level=(key:'musicVolume'|'sfxVolume'|'uiVolume')=>typeof v[key]==='number'&&Number.isFinite(v[key])&&v[key]>=0&&v[key]<=1?v[key]:d[key];
  return {locale:v.locale==='en'||v.locale==='ru'?v.locale:locale,muted:typeof v.muted==='boolean'?v.muted:d.muted,touchMode:['auto','on','off'].includes(v.touchMode)?v.touchMode:d.touchMode,layout:['dock','sides'].includes(v.layout)?v.layout:d.layout,autofire:typeof v.autofire==='boolean'?v.autofire:d.autofire,debugBodies:typeof v.debugBodies==='boolean'?v.debugBodies:d.debugBodies,musicVolume:level('musicVolume'),sfxVolume:level('sfxVolume'),uiVolume:level('uiVolume')};
}
export class SaveService{
  private db?:IDBDatabase;private queue:Promise<unknown>=Promise.resolve();private blocked=false;
  lastError:string|null=null;issue:SaveIssue=null;savedAt:string|null=null;available=false;
  onStatus:()=>void=()=>{};
  constructor(readonly build:string){}
  private status(issue:SaveIssue){this.issue=issue;if(!issue)this.lastError=null;this.onStatus();}
  async connect(){
    if(this.available&&this.db)return true;this.db?.close();
    try{this.db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(databaseName,1);let expired=false;const timer=setTimeout(()=>{expired=true;reject(Error('storage_timeout'));},5000);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records');};request.onsuccess=()=>{clearTimeout(timer);if(expired){request.result.close();return;}resolve(request.result);};request.onerror=()=>{expired=true;clearTimeout(timer);reject(request.error);};request.onblocked=()=>{expired=true;clearTimeout(timer);reject(Error('storage_blocked'));};});this.db.onversionchange=()=>{this.db?.close();this.available=false;this.status('unavailable');};this.available=true;if(this.issue==='unavailable'||this.issue==='write_failed')this.status(null);return true;}catch(error){this.lastError=error instanceof Error?error.name+':'+error.message:'storage_error';this.available=false;this.status('unavailable');return false;}
  }
  private read(key:string){return new Promise<unknown>((resolve,reject)=>{const tx=this.db!.transaction('records','readonly'),r=tx.objectStore('records').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error);});}
  async load(locale:'en'|'ru'){
    if(!await this.connect())return{campaign:null,settings:defaults(locale)};
    try{const [record,rawSettings]=await Promise.all([this.read('campaign'),this.read('settings')]);const settings=validateSettings(rawSettings,locale);try{const mirror=localStorage.getItem('cinder-shift-language-v1');if(mirror==='en'||mirror==='ru')settings.locale=mirror;}catch{/* IndexedDB locale remains available. */}if(record===undefined)return{campaign:null,settings};const issue=validateSave(record);if(issue){this.blocked=true;this.status(issue);return{campaign:null,settings};}const envelope=record as Envelope;this.savedAt=envelope.saved_at;return{campaign:{...envelope.campaign,character_id:'mira' as const},settings};}catch{this.available=false;this.status('unavailable');return{campaign:null,settings:defaults(locale)};}
  }
  private put(key:string,value:unknown){const snapshot=structuredClone(value);const operation=async()=>{
    if(!this.available||!this.db)return false;
    try{await new Promise<void>((resolve,reject)=>{const tx=this.db!.transaction('records','readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);try{tx.objectStore('records').put(snapshot,key);}catch(error){tx.abort();reject(error);}});if(key==='campaign'){this.savedAt=(snapshot as Envelope).saved_at;}if(!this.blocked)this.status(null);return true;}catch(error){this.lastError=error instanceof Error?error.name+':'+error.message:'write_error';this.available=false;this.status('write_failed');return false;}
  };const result=this.queue.then(operation,operation);this.queue=result;return result;}
  saveCampaign(campaign:CampaignData,replace=false){
    if(this.blocked&&!replace)return Promise.resolve(false);if(replace){this.blocked=false;if(this.issue==='corrupt'||this.issue==='incompatible'||this.issue==='unknown_nodes')this.status(null);}
    const envelope:Envelope={schema_version:1,content_version:contentVersion,game_id:'r01',build_id:this.build,saved_at:new Date().toISOString(),campaign:structuredClone(campaign)};const issue=validateSave(envelope);if(issue){this.status(issue);return Promise.resolve(false);}return this.put('campaign',envelope);
  }
  saveSettings(settings:Settings){try{localStorage.setItem('cinder-shift-language-v1',settings.locale);}catch{/* Language still applies in memory. */}return this.put('settings',settings);}
  async retry(campaign:CampaignData|null,settings:Settings){if(!await this.connect())return false;await this.saveSettings(settings);return campaign?this.saveCampaign(campaign):true;}
}
