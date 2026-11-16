import type {CampaignData} from './campaign';
import {missionIds} from './missions';
import {newCampaignRegistry,newCampaignMissions,newCampaignIds,type NewCampaignId} from './new-campaign-content';

// r01 is the existing game/save ID. campaign_id in C01 is a run UUID, not a world ID.
export const baseWorldId='r01' as const;
export type Availability='available'|'locked_by_progress'|'not_in_build'|'load_failed';
export function worldAvailability(id:string,completed:boolean|null,included:boolean,loaded=true):Availability{
 if(id!==baseWorldId&&!newCampaignIds.includes(id as NewCampaignId))return'not_in_build';
 if(id!==baseWorldId&&completed===null)return'load_failed';
 if(id!==baseWorldId&&!completed)return'locked_by_progress';
 if(!included)return'not_in_build';if(!loaded)return'load_failed';return'available';
}
export function isCompleteBaseCampaign(c:CampaignData|null){return Boolean(c&&c.stage==='campaign_complete'&&c.mission_id==='reactor'&&c.result?.mission_id==='reactor'&&c.result.result==='victory'&&missionIds.every(id=>c.completed_missions.includes(id)));}
export type CompletionProfile={schema_version:1;base_game_id:'r01';completion_ids:string[]};
export function validateCompletionProfile(raw:unknown):raw is CompletionProfile{
 if(!raw||typeof raw!=='object')return false;const r=raw as CompletionProfile;
 return r.schema_version===1&&r.base_game_id===baseWorldId&&Array.isArray(r.completion_ids)&&r.completion_ids.every(id=>typeof id==='string'&&id.length>=8&&id.length<=100)&&new Set(r.completion_ids).size===r.completion_ids.length;
}
export const fragmentIds=['c02-small-world:beacon:SW01-fragment-01','c02-small-world:beacon:SW03-fragment-02','c02-small-world:beacon:SW04-fragment-03'] as const;
export type WorldProgress={schema_version:1;campaign_id:NewCampaignId;seed:number;mission_id:string;room_id:string;completed_rooms:string[];completed_missions:string[];fragments:string[];reward_ledger:string[];wallet:number;completed:boolean};
export const worldStorageKey=(id:NewCampaignId)=>`world.${id}.v1` as const;
export function newWorldProgress(id:NewCampaignId,seed:number):WorldProgress{const mission_id=newCampaignMissions[id][0];return{schema_version:1,campaign_id:id,seed:seed>>>0,mission_id,room_id:mission_id+'-A',completed_rooms:[],completed_missions:[],fragments:[],reward_ledger:[],wallet:1,completed:false};}
export function validateWorldProgress(raw:unknown,id:NewCampaignId):raw is WorldProgress{
 if(!newCampaignIds.includes(id)||!raw||typeof raw!=='object')return false;const p=raw as WorldProgress,validRooms=newCampaignRegistry.rooms.filter(r=>r.campaign_id===id).map(r=>r.room_id),missions=newCampaignMissions[id];
 const unique=(v:unknown,allowed:readonly string[]):v is string[]=>Array.isArray(v)&&v.every(i=>typeof i==='string'&&allowed.includes(i))&&new Set(v).size===v.length;
 return p.schema_version===1&&p.campaign_id===id&&Number.isInteger(p.seed)&&p.seed>=0&&p.seed<=0xffffffff&&missions.includes(p.mission_id)&&validRooms.includes(p.room_id)&&p.room_id.startsWith(p.mission_id+'-')&&unique(p.completed_rooms,validRooms)&&unique(p.completed_missions,missions)&&unique(p.fragments,id==='c02-small-world'?fragmentIds:[])&&Array.isArray(p.reward_ledger)&&p.reward_ledger.every(k=>typeof k==='string'&&k.startsWith(id+':'))&&new Set(p.reward_ledger).size===p.reward_ledger.length&&Number.isInteger(p.wallet)&&p.wallet>=0&&p.wallet<=20&&typeof p.completed==='boolean'&&(!p.completed||missions.every(m=>p.completed_missions.includes(m)))&&p.completed_missions.every(m=>['A','B','C','D'].every(r=>p.completed_rooms.includes(m+'-'+r)))&&p.fragments.every((f,i)=>p.completed_missions.includes(f.includes('SW01')?'SW01':f.includes('SW03')?'SW03':'SW04'));
}
export function finishWorldRoom(progress:WorldProgress,roomId:string):WorldProgress|null{
 if(!validateWorldProgress(progress,progress.campaign_id)||progress.completed||roomId!==progress.room_id)return null;
 const p=structuredClone(progress),mission=p.mission_id,all=newCampaignMissions[p.campaign_id];
 if(!p.completed_rooms.includes(roomId))p.completed_rooms.push(roomId);
 const nextRoom=roomId.endsWith('-D')?null:mission+'-'+String.fromCharCode(roomId.charCodeAt(roomId.length-1)+1);
 if(nextRoom){p.room_id=nextRoom;return p;}
 if(!['A','B','C','D'].every(r=>p.completed_rooms.includes(mission+'-'+r)))return null;
 if(!p.completed_missions.includes(mission))p.completed_missions.push(mission);
 const key=p.campaign_id+':mission:'+mission;if(!p.reward_ledger.includes(key)){p.reward_ledger.push(key);p.wallet++;}
 const fragment=fragmentIds.find(f=>f.includes(':'+mission+'-'));
 if(p.campaign_id==='c02-small-world'&&fragment&&!p.fragments.includes(fragment)){p.fragments.push(fragment);p.reward_ledger.push(fragment);}
 const nextMission=all[all.indexOf(mission)+1];if(nextMission){p.mission_id=nextMission;p.room_id=nextMission+'-A';}else{
  if(p.campaign_id==='c02-small-world'&&!fragmentIds.every(id=>p.fragments.includes(id)))return null;p.completed=true;
 }
 return p;
}
