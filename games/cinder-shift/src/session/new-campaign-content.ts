import config from '../../game.config.json' with {type:'json'};
import sourceRegistry from '../../content/new-campaigns/rooms_40.json' with {type:'json'};

export type WorldMissionId='SW01'|'SW02'|'SW03'|'SW04'|'SW05'|'YU01'|'YU02'|'YU03'|'YU04'|'YU05';
export type WorldRoomId=`${WorldMissionId}-${'A'|'B'|'C'|'D'}`;
export const isWorldMission=(id:string):id is WorldMissionId=>/^(SW|YU)0[1-5]$/.test(id);
export const worldForMission=(id:WorldMissionId):NewCampaignId=>id.startsWith('SW')?'c02-small-world':'c03-adriatic-1986';
export type NewCampaignId='c02-small-world'|'c03-adriatic-1986';
export type NewCampaignRoom={
 campaign_id:string;
 mission_id:string;
 room_id:string;
 name:string;
 target_seconds:number;
 intent:string;
 choice_and_acceptance:string;
 art_sector:string;
 music_cue:string;
 status:string;
};
export type NewCampaignRoomRegistry={version:string;duration_target_minutes_per_campaign:number[];budget_seconds_per_campaign:number;rooms:NewCampaignRoom[]};

export const newCampaignRegistry=sourceRegistry as NewCampaignRoomRegistry;
export const newCampaignIds:readonly NewCampaignId[]=['c02-small-world','c03-adriatic-1986'];
export const newCampaignMissions:Readonly<Record<NewCampaignId,readonly string[]>>={
 'c02-small-world':['SW01','SW02','SW03','SW04','SW05'],
 'c03-adriatic-1986':['YU01','YU02','YU03','YU04','YU05'],
};
const missionBudgets=[240,255,270,270,285] as const;

export function auditNewCampaignRegistry(registry:NewCampaignRoomRegistry=newCampaignRegistry):string[]{
 const issues:string[]=[],rooms=registry.rooms,seen=new Set<string>();
 if(registry.version!=='1.0')issues.push(`unsupported_registry_version:${registry.version}`);
 if(registry.duration_target_minutes_per_campaign.length!==2||registry.duration_target_minutes_per_campaign[0]!==20||registry.duration_target_minutes_per_campaign[1]!==25)issues.push('campaign_duration_target_must_be_20_to_25_minutes');
 if(rooms.length!==40)issues.push(`expected_40_rooms:${rooms.length}`);
 if(registry.budget_seconds_per_campaign!==22*60)issues.push('campaign_budget_must_be_22_minutes');
 for(const id of newCampaignIds){
  const campaignRooms=rooms.filter(room=>room.campaign_id===id),expected=newCampaignMissions[id];
  if(campaignRooms.length!==20)issues.push(`${id}:expected_20_rooms:${campaignRooms.length}`);
  const missionIds=[...new Set(campaignRooms.map(room=>room.mission_id))];
  if(missionIds.join(',')!==expected.join(','))issues.push(`${id}:mission_order_mismatch`);
  for(const [index,missionId] of expected.entries()){
   const missionRooms=campaignRooms.filter(room=>room.mission_id===missionId);
   if(missionRooms.length!==4)issues.push(`${missionId}:expected_4_rooms:${missionRooms.length}`);
   const budget=missionRooms.reduce((sum,room)=>sum+room.target_seconds,0);
   if(budget!==missionBudgets[index])issues.push(`${missionId}:budget_mismatch:${budget}`);
  }
  const total=campaignRooms.reduce((sum,room)=>sum+room.target_seconds,0);
  if(total!==registry.budget_seconds_per_campaign)issues.push(`${id}:budget_mismatch:${total}`);
 }
 for(const room of rooms){
  if(!newCampaignIds.includes(room.campaign_id as NewCampaignId))issues.push(`unknown_campaign:${room.campaign_id}`);
  if(!room.room_id||seen.has(room.room_id))issues.push(`duplicate_or_empty_room_id:${room.room_id}`);
  seen.add(room.room_id);
  if(!room.intent||!room.choice_and_acceptance||!room.art_sector||!room.music_cue)issues.push(`incomplete_design_record:${room.room_id}`);
  if(!Number.isInteger(room.target_seconds)||room.target_seconds<=0)issues.push(`invalid_budget:${room.room_id}`);
 }
 return issues;
}

export function estimateBaseJumpEnvelope(){
 const velocity=Math.abs(config.initial_balance.jump_velocity),gravity=config.initial_balance.gravity,walkSpeed=config.initial_balance.walk_speed,acceleration=config.movement.acceleration;
 const airtimeSeconds=2*velocity/gravity,maxRisePx=velocity*velocity/(2*gravity),accelerationSeconds=Math.min(walkSpeed/acceleration,airtimeSeconds);
 const accelerationDistance=0.5*acceleration*accelerationSeconds*accelerationSeconds;
 const horizontalFromRestPx=accelerationDistance+Math.max(0,airtimeSeconds-accelerationSeconds)*walkSpeed;
 return{airtimeSeconds,maxRisePx,horizontalFromRestPx,horizontalAtRunPx:airtimeSeconds*walkSpeed,bodyWidthPx:config.movement.body_width,standingHeightPx:config.movement.standing_height};
}
