import {isWorldMission,newCampaignMissions,worldForMission,type WorldMissionId} from './new-campaign-content';
import type {RoomId} from '../room-data';
import config from '../../game.config.json' with {type:'json'};
export const missionIds=['airlock','cargo','foundry','archive','reactor'] as const;
export type BaseMissionId=typeof missionIds[number];
export type MissionId=BaseMissionId|WorldMissionId;
export type PlayableMissionId=MissionId;
export const missionChain=(id:MissionId):readonly MissionId[]=>isWorldMission(id)?newCampaignMissions[worldForMission(id)] as readonly WorldMissionId[]:missionIds;
export type MissionDefinition={id:MissionId;number:number;implemented:boolean;researchReward:number;nameKey:string;goalKey:string;routeKey:string;rooms:readonly RoomId[];next:MissionId|null;events:readonly string[];map:{x:number;y:number}};
const researchReward=(number:number)=>config.campaign.research_rewards_after_missions.includes(number)?1:0;
const worldDefinitions=Object.fromEntries((['SW01','SW02','SW03','SW04','SW05','YU01','YU02','YU03','YU04','YU05'] as WorldMissionId[]).map((id):[WorldMissionId,MissionDefinition]=>{const chain=missionChain(id),n=chain.indexOf(id);return[id,{id,number:n+1,implemented:true,researchReward:n<4?1:0,nameKey:'worlds.'+id+'.name',goalKey:'worlds.'+id+'.goal',routeKey:'worlds.'+id+'.route',rooms:['A','B','C','D'].map(r=>(id+'-'+r) as RoomId),next:chain[n+1]||null,events:[],map:{x:170+n*200,y:220}}];})) as Record<WorldMissionId,MissionDefinition>;
export const missions:Record<MissionId,MissionDefinition>={
 ...worldDefinitions,
 airlock:{id:'airlock',number:1,implemented:true,researchReward:researchReward(1),nameKey:'mission.name',goalKey:'mission.goal',routeKey:'mission.route',rooms:['A','B','M1A','M1B','M1C','C'],next:'cargo',events:['E02','E03'],map:{x:170,y:144}},
 cargo:{id:'cargo',number:2,implemented:true,researchReward:researchReward(2),nameKey:'cargo.name',goalKey:'cargo.goal',routeKey:'cargo.route',rooms:['D','M2A','E','M2B','M2C','M2D','F','M2E','G'],next:'foundry',events:['E01'],map:{x:440,y:144}},
 foundry:{id:'foundry',number:3,implemented:true,researchReward:researchReward(3),nameKey:'map.foundry',goalKey:'map.foundryGoal',routeKey:'map.foundryRoute',rooms:['M3A','M3E','M3F','M3B','M3G','M3H','M3C','M3I','M3J','M3K','M3D'],next:'archive',events:['E04'],map:{x:710,y:144}},
 archive:{id:'archive',number:4,implemented:true,researchReward:researchReward(4),nameKey:'map.archive',goalKey:'map.archiveGoal',routeKey:'map.archiveRoute',rooms:['M4A','M4E','M4B','M4F','M4G','M4H','M4C','M4I','M4D'],next:'reactor',events:['E05'],map:{x:710,y:380}},
 reactor:{id:'reactor',number:5,implemented:true,researchReward:researchReward(5),nameKey:'map.reactor',goalKey:'map.reactorGoal',routeKey:'map.reactorRoute',rooms:['M5A','M5F','M5B','M5G','M5H','M5I','M5C','M5D','M5E'],next:null,events:['E06'],map:{x:1020,y:380}},
};
export const playableMissionIds:readonly MissionId[]=[...missionIds,...Object.keys(worldDefinitions) as WorldMissionId[]];
export const isBaseMission=(id:unknown):id is BaseMissionId=>typeof id==='string'&&(missionIds as readonly string[]).includes(id);
export const isPlayableMission=(id:unknown):id is PlayableMissionId=>typeof id==='string'&&playableMissionIds.includes(id as PlayableMissionId);
export function unlocked(id:MissionId,completed:readonly string[]){const chain=missionChain(id),index=chain.indexOf(id);return index>=0&&missions[id].implemented&&(index===0||completed.includes(chain[index-1]));}
// Keep every legacy Airlock seed; other sectors have independent reproducible streams.
export function missionSeed(seed:number,id:MissionId){if(id==='airlock')return seed>>>0;let value=(seed^0x811c9dc5)>>>0;for(const c of id)value=Math.imul(value^c.charCodeAt(0),16777619)>>>0;return value;}
