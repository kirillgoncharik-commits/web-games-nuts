import {contentVersion,type CampaignData} from './campaign';
import {nodeIds,loadout,prerequisitesMet,type NodeId} from './research';
import {migrateEventPlan,validPlan} from './events';
import {isPlayableMission,missionIds,missionSeed,missions,type PlayableMissionId} from './missions';
import {validateLegacySave} from './legacy-save';
import {actions,bindingAllowed,type Action} from '../input';
export const databaseName='cinder-shift-r01';
export const schemaVersion=1;
export type Settings={locale:'en'|'ru';muted:boolean;touchMode:'auto'|'on'|'off';layout:'dock'|'sides';autofire:boolean;debugBodies:boolean;reducedFlashes:boolean;reducedMotion:boolean;effectsIntensity:number;combatAssist:boolean;ghostEnabled:boolean;keyBindings:Partial<Record<Action,string>>;musicVolume:number;sfxVolume:number;uiVolume:number};
export type SaveIssue='unavailable'|'write_failed'|'corrupt'|'incompatible'|'unknown_nodes'|null;
export type Envelope={schema_version:1;content_version:string;game_id:'r01';build_id:string;saved_at:string;campaign:CampaignData};
export type CompletedRun={ruleset_id?:string;campaign_id:string;content_version:string;completed_at:string;active_ms:number;deaths:number;score:number;foundry_route:'service'|'press'|null;nodes:NodeId[];difficulty:'standard';assistance:'standard'|'assisted';history_complete:boolean};
export const defaults=(locale:'en'|'ru'):Settings=>({locale,muted:false,touchMode:'auto',layout:'dock',autofire:true,debugBodies:false,reducedFlashes:false,reducedMotion:false,effectsIntensity:.7,combatAssist:false,ghostEnabled:true,keyBindings:{},musicVolume:.18,sfxVolume:.75,uiVolume:.6});
const object=(v:unknown):v is Record<string,any>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const uint=(v:unknown)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<=0xffffffff;
const ids=(v:unknown):v is NodeId[]=>Array.isArray(v)&&v.length<=nodeIds.length&&v.every(id=>nodeIds.includes(id))&&new Set(v).size===v.length&&v.every(id=>prerequisitesMet(v,id));
const buildKeys={b1:['maxHp','spread','piercing','dash','airDash','buffer','active'],b2:['maxHp','spread','piercing','ricochet','dash','airDash','wallMove','buffer','shieldClear','active']};
const sameLoadout=(saved:Record<string,any>,expected:ReturnType<typeof loadout>,format:'b1'|'b2'|'current')=>{const keys=Object.keys(saved).filter(k=>k!=='nodes'),allowed=format==='current'?Object.keys(expected).filter(k=>k!=='nodes'):buildKeys[format];return keys.length===allowed.length&&allowed.every(k=>keys.includes(k)&&saved[k]===expected[k as keyof typeof expected]);};
export function validateSave(v:unknown):SaveIssue{
 if(!object(v)||v.game_id!=='r01')return'corrupt';
 if(v.schema_version!==schemaVersion)return'incompatible';
 if(v.content_version==='airlock-m04.1')return validateLegacySave(v);
 const previousDraft=['campaign-m05b1.1','campaign-m05b1.2','campaign-m05b1.3','campaign-m05b2.0'].includes(v.content_version);const previousPreviewDraft=v.content_version==='campaign-m05b1.1';if(v.content_version!==contentVersion&&!previousDraft)return'incompatible';
 const d=v.campaign;if(!object(d)||!Array.isArray(d.nodes))return'corrupt';if(d.nodes.some(id=>!nodeIds.includes(id)))return'unknown_nodes';
 const oldB1Nodes=['W1','W2','M1','M2','D1','D2'],oldB2Nodes=['W1','W2','W3','M1','M2','M3','D1','D2','D3'],legacyVersion=v.content_version!=='campaign-m05b3.0';if(legacyVersion&&d.nodes.some((id:NodeId)=>!(v.content_version==='campaign-m05b2.0'?oldB2Nodes:oldB1Nodes).includes(id)))return'unknown_nodes';
 if(d.character_id!==undefined&&d.character_id!=='mira')return'corrupt';
 if(!ids(d.nodes)||typeof d.campaign_id!=='string'||d.campaign_id.length<8||d.campaign_id.length>100||!uint(d.campaign_seed)||!isPlayableMission(d.mission_id)||!isPlayableMission(d.location_id)||!['map','research','briefing','mission','result','campaign_checkpoint','campaign_complete'].includes(d.stage)&&!(previousPreviewDraft&&d.stage==='preview_complete'))return'corrupt';
 if(d.active!==null&&(!['M1','W4'].includes(d.active)||!d.nodes.includes(d.active)))return'corrupt';
 if(!Array.isArray(d.completed_missions)||d.completed_missions.some((m:unknown)=>!isPlayableMission(m))||new Set(d.completed_missions).size!==d.completed_missions.length||d.completed_missions.some((m:PlayableMissionId,index:number)=>missionIds[index]!==m)||legacyVersion&&d.completed_missions.some((m:PlayableMissionId)=>missionIds.indexOf(m)>(v.content_version==='campaign-m05b2.0'?3:1)))return'corrupt';
 const missionIndex=missionIds.indexOf(d.mission_id),locationIndex=missionIds.indexOf(d.location_id);
 if(missionIndex>d.completed_missions.length||locationIndex>d.completed_missions.length)return'corrupt';
 const expectedRewards=d.completed_missions.filter((m:PlayableMissionId)=>missions[m].researchReward>0).map((m:PlayableMissionId)=>d.campaign_id+':'+m);
 if(!Array.isArray(d.reward_ledger)||d.reward_ledger.length!==expectedRewards.length||new Set(d.reward_ledger).size!==d.reward_ledger.length||expectedRewards.some((key:string)=>!d.reward_ledger.includes(key)))return'corrupt';
 const earned=d.completed_missions.reduce((sum:number,m:PlayableMissionId)=>sum+missions[m].researchReward,0);
 if(d.points!==1+earned-d.nodes.length||!Number.isInteger(d.points)||d.points<0)return'corrupt';
 if(!Array.isArray(d.processed_attempts)||d.processed_attempts.some((x:unknown)=>typeof x!=='string'||!x.length)||new Set(d.processed_attempts).size!==d.processed_attempts.length)return'corrupt';
 if(typeof v.saved_at!=='string'||!Number.isFinite(Date.parse(v.saved_at))||typeof v.build_id!=='string')return'corrupt';
 if(d.run_stats!==undefined&&(!object(d.run_stats)||!Number.isFinite(d.run_stats.active_ms)||d.run_stats.active_ms<0||!Number.isInteger(d.run_stats.deaths)||d.run_stats.deaths<0||!Number.isInteger(d.run_stats.score)||d.run_stats.score<0||![null,'service','press'].includes(d.run_stats.foundry_route)||typeof d.run_stats.history_complete!=='boolean'||d.run_stats.assisted!==undefined&&typeof d.run_stats.assisted!=='boolean'))return'corrupt';
 if(!legacyVersion&&!d.run_stats)return'corrupt';
 if(d.entry!==null){const e=d.entry,format=v.content_version==='campaign-m05b2.0'?'b2':legacyVersion?'b1':'current';if(!object(e)||!isPlayableMission(e.mission_id)||missionIds.indexOf(e.mission_id)>d.completed_missions.length||legacyVersion&&missionIds.indexOf(e.mission_id)>(v.content_version==='campaign-m05b2.0'?3:1)||e.seed!==missionSeed(d.campaign_seed,e.mission_id)||!object(e.build)||!ids(e.build.nodes)||e.build.nodes.some((n:NodeId)=>!d.nodes.includes(n))||!['M1','W4',null].includes(e.build.active))return'corrupt';const expected=loadout(e.build.nodes,e.build.active);if(!sameLoadout(e.build,expected,format)||e.max_hp!==expected.maxHp||e.initial_hp!==e.max_hp||e.initial_score!==0||!validPlan(e.event_plan,e.mission_id))return'corrupt';}
 if(['briefing','mission','result','campaign_checkpoint','campaign_complete'].includes(d.stage)||previousPreviewDraft&&d.stage==='preview_complete'){if(!d.entry||d.entry.mission_id!==d.mission_id)return'corrupt';}
 if(d.result!==null){const r=d.result;if(!object(r)||!['victory','death'].includes(r.result)||!isPlayableMission(r.mission_id)||typeof r.attempt_id!=='string'||!d.processed_attempts.includes(r.attempt_id)||r.applied!==true||typeof r.reward_granted!=='boolean'||!ids(r.nodes)||r.nodes.some((n:NodeId)=>!d.nodes.includes(n))||typeof r.reason!=='string'||!Number.isFinite(r.active_ms)||r.active_ms<0||!Number.isFinite(r.screen_ms)||r.screen_ms<0||r.max_hp!==loadout(r.nodes).maxHp||!Number.isInteger(r.hp)||r.hp<0||r.hp>r.max_hp||!Number.isInteger(r.score)||r.score<0||r.score>1000000||r.reward_granted&&!d.reward_ledger.includes(d.campaign_id+':'+r.mission_id))return'corrupt';}
 if(['result','campaign_checkpoint','campaign_complete'].includes(d.stage)&&(!d.result||d.result.mission_id!==d.mission_id))return'corrupt';
 if(previousPreviewDraft&&d.stage==='preview_complete'&&(d.mission_id!=='cargo'||d.result?.result!=='victory'))return'corrupt';
 const resultMissionId=d.result?.mission_id,resultMission=isPlayableMission(resultMissionId)?missions[resultMissionId]:null;
 const legacyFoundryCheckpoint=previousDraft&&d.stage==='campaign_checkpoint'&&d.result?.result==='victory'&&d.result.mission_id==='cargo'&&resultMission?.next==='foundry'&&d.completed_missions.includes('cargo');
 if(d.stage==='campaign_checkpoint'&&(!d.result||d.result.result!=='victory'||!resultMission?.next||missions[resultMission.next].implemented&&!legacyFoundryCheckpoint))return'corrupt';
 if(d.stage==='campaign_complete'&&(!d.result||d.result.result!=='victory'||!resultMission||resultMission.next!==null))return'corrupt';
 return null;
}
// Decode known content only. The caller keeps unknown records intact and blocks replacement.
export function migrateSave(record:any):Envelope{
 const issue=validateSave(record);if(issue)throw Error(issue);
 const envelope=structuredClone(record),d=envelope.campaign;
 d.character_id='mira';d.location_id??=d.entry?.mission_id||d.mission_id;
 if(envelope.content_version==='airlock-m04.1'){
  if(d.entry)d.entry.build=loadout(d.entry.build.nodes,d.entry.build.active);
  if(d.entry)d.entry.event_plan=migrateEventPlan(d.entry.event_plan);
  if(d.stage==='briefing')d.stage='research';
  if(d.stage==='preview_complete'&&d.result?.result==='victory'){d.stage='map';d.mission_id='cargo';}
  envelope.content_version=contentVersion;
 }else if(envelope.content_version==='campaign-m05b1.1'||envelope.content_version==='campaign-m05b1.2'||envelope.content_version==='campaign-m05b1.3'||envelope.content_version==='campaign-m05b2.0'){
  if(d.entry)d.entry.build=loadout(d.entry.build.nodes,d.entry.build.active);
  if(d.entry)d.entry.event_plan=migrateEventPlan(d.entry.event_plan);
  if(envelope.content_version==='campaign-m05b1.1'&&d.stage==='preview_complete')d.stage='campaign_checkpoint';
  envelope.content_version=contentVersion;
 }
 if(d.stage==='campaign_checkpoint'&&d.result?.result==='victory'&&d.result.mission_id==='cargo'&&missions.foundry.implemented&&d.completed_missions.includes('cargo')){d.stage='map';d.mission_id='foundry';}
 if(!d.run_stats)d.run_stats={active_ms:0,deaths:0,score:0,foundry_route:null,history_complete:false,assisted:false};
 else d.run_stats.assisted??=false;
 if(d.entry)d.entry.event_plan=migrateEventPlan(d.entry.event_plan);
 const migratedIssue=validateSave(envelope);if(migratedIssue)throw Error('migration_'+migratedIssue);
 return envelope;
}
export function validateSettings(v:unknown,locale:'en'|'ru'):Settings{
  const d=defaults(locale);if(!object(v))return d;const level=(key:'musicVolume'|'sfxVolume'|'uiVolume')=>typeof v[key]==='number'&&Number.isFinite(v[key])&&v[key]>=0&&v[key]<=1?v[key]:d[key];
  const keyBindings:Partial<Record<Action,string>>={},used=new Set<string>();if(object(v.keyBindings))for(const[action,code]of Object.entries(v.keyBindings)){if(actions.includes(action as Action)&&typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space)$/.test(code)&&bindingAllowed(action as Action,code)&&!used.has(code)){keyBindings[action as Action]=code;used.add(code);}}
  return {locale:v.locale==='en'||v.locale==='ru'?v.locale:locale,muted:typeof v.muted==='boolean'?v.muted:d.muted,touchMode:['auto','on','off'].includes(v.touchMode)?v.touchMode:d.touchMode,layout:['dock','sides'].includes(v.layout)?v.layout:d.layout,autofire:typeof v.autofire==='boolean'?v.autofire:d.autofire,debugBodies:typeof v.debugBodies==='boolean'?v.debugBodies:d.debugBodies,reducedFlashes:typeof v.reducedFlashes==='boolean'?v.reducedFlashes:d.reducedFlashes,reducedMotion:typeof v.reducedMotion==='boolean'?v.reducedMotion:d.reducedMotion,effectsIntensity:typeof v.effectsIntensity==='number'&&Number.isFinite(v.effectsIntensity)&&v.effectsIntensity>=0&&v.effectsIntensity<=1?v.effectsIntensity:d.effectsIntensity,combatAssist:typeof v.combatAssist==='boolean'?v.combatAssist:d.combatAssist,ghostEnabled:typeof v.ghostEnabled==='boolean'?v.ghostEnabled:d.ghostEnabled,keyBindings,musicVolume:level('musicVolume'),sfxVolume:level('sfxVolume'),uiVolume:level('uiVolume')};
}
export class SaveService{
  private db?:IDBDatabase;private queue:Promise<unknown>=Promise.resolve();private blocked=false;
  lastError:string|null=null;issue:SaveIssue=null;savedAt:string|null=null;available=false;careerRuns:CompletedRun[]=[];careerValid=true;
  onStatus:()=>void=()=>{};
  constructor(readonly build:string){}
  private status(issue:SaveIssue){this.issue=issue;if(!issue)this.lastError=null;this.onStatus();}
  async connect(){
    if(this.available&&this.db)return true;this.db?.close();
    try{this.db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(databaseName,1);let expired=false;const timer=setTimeout(()=>{expired=true;reject(Error('storage_timeout'));},5000);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records');};request.onsuccess=()=>{clearTimeout(timer);if(expired){request.result.close();return;}resolve(request.result);};request.onerror=()=>{expired=true;clearTimeout(timer);reject(request.error);};request.onblocked=()=>{expired=true;clearTimeout(timer);reject(Error('storage_blocked'));};});this.db.onversionchange=()=>{this.db?.close();this.available=false;this.status('unavailable');};this.available=true;if(this.issue==='unavailable'||this.issue==='write_failed')this.status(null);return true;}catch(error){this.lastError=error instanceof Error?error.name+':'+error.message:'storage_error';this.available=false;this.status('unavailable');return false;}
  }
  private read(key:string){return new Promise<unknown>((resolve,reject)=>{const tx=this.db!.transaction('records','readonly'),r=tx.objectStore('records').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error);});}
  async loadModeData(key:'records.v1'|'challenges.v1'|'relay.v1'):Promise<{ok:boolean;value?:unknown}>{
    if(!await this.connect())return{ok:false};
    try{return{ok:true,value:await this.read(key)};}catch(error){this.lastError=error instanceof Error?error.name+':'+error.message:'storage_read_error';this.available=false;this.status('unavailable');return{ok:false};}
  }
  async saveModeData(key:'records.v1'|'challenges.v1'|'relay.v1',value:unknown){
    if(!this.available&&!await this.connect())return false;
    return Boolean(await this.put(key,value));
  }
  async load(locale:'en'|'ru'){
    if(!await this.connect())return{campaign:null,settings:defaults(locale)};
    try{const [record,rawSettings,rawCareer]=await Promise.all([this.read('campaign'),this.read('settings'),this.read('career')]);const settings=validateSettings(rawSettings,locale);if(rawCareer===undefined)this.careerRuns=[];else if(object(rawCareer)&&rawCareer.version===1&&Array.isArray(rawCareer.runs)&&rawCareer.runs.every((r:unknown)=>object(r)&&typeof r.campaign_id==='string'&&typeof r.content_version==='string'&&typeof r.completed_at==='string'&&Number.isFinite(r.active_ms)&&Number.isInteger(r.deaths)&&Number.isInteger(r.score)&&Array.isArray(r.nodes)&&r.nodes.every((n:unknown)=>nodeIds.includes(n as NodeId))&&['service','press',null].includes(r.foundry_route)&&r.difficulty==='standard'&&['standard','assisted'].includes(r.assistance)&&typeof r.history_complete==='boolean'))this.careerRuns=rawCareer.runs as CompletedRun[];else{this.careerRuns=[];this.careerValid=false;}try{const mirror=localStorage.getItem('cinder-shift-language-v1');if(mirror==='en'||mirror==='ru')settings.locale=mirror;}catch{/* IndexedDB locale remains available. */}if(record===undefined)return{campaign:null,settings};const issue=validateSave(record);if(issue){this.blocked=true;this.status(issue);return{campaign:null,settings};}const envelope=migrateSave(record);this.savedAt=envelope.saved_at;return{campaign:{...envelope.campaign,character_id:'mira' as const},settings};}catch{this.available=false;this.status('unavailable');return{campaign:null,settings:defaults(locale)};}
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
  async recordCampaign(campaign:CampaignData){if(!this.available||this.blocked||!this.careerValid||campaign.stage!=='campaign_complete'||campaign.result?.result!=='victory')return false;if(this.careerRuns.some(run=>run.campaign_id===campaign.campaign_id))return true;const run:CompletedRun={ruleset_id:campaign.run_stats.ruleset_id||'legacy-rc1',campaign_id:campaign.campaign_id,content_version:contentVersion,completed_at:new Date().toISOString(),active_ms:campaign.run_stats.active_ms,deaths:campaign.run_stats.deaths,score:campaign.run_stats.score,foundry_route:campaign.run_stats.foundry_route,nodes:[...campaign.nodes],difficulty:'standard',assistance:campaign.run_stats.assisted?'assisted':'standard',history_complete:campaign.run_stats.history_complete},runs=[...this.careerRuns,run];const saved=Boolean(await this.put('career',{version:1,runs}));if(saved)this.careerRuns=runs;return saved;}
  async retry(campaign:CampaignData|null,settings:Settings){if(!await this.connect())return false;await this.saveSettings(settings);return campaign?this.saveCampaign(campaign):true;}
}
