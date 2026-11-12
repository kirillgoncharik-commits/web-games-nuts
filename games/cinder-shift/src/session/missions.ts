import type {RoomId} from '../room-data';
import config from '../../game.config.json' with {type:'json'};
export const missionIds=['airlock','cargo','foundry','archive','reactor'] as const;
export type MissionId=typeof missionIds[number];
export type PlayableMissionId='airlock'|'cargo'|'foundry'|'archive'|'reactor';
export type MissionDefinition={id:MissionId;number:number;implemented:boolean;researchReward:number;nameKey:string;goalKey:string;routeKey:string;rooms:readonly RoomId[];next:MissionId|null;events:readonly string[];map:{x:number;y:number}};
const researchReward=(number:number)=>config.campaign.research_rewards_after_missions.includes(number)?1:0;
export const missions:Record<MissionId,MissionDefinition>={
 airlock:{id:'airlock',number:1,implemented:true,researchReward:researchReward(1),nameKey:'mission.name',goalKey:'mission.goal',routeKey:'mission.route',rooms:['A','B','C'],next:'cargo',events:['E02','E03'],map:{x:170,y:144}},
 cargo:{id:'cargo',number:2,implemented:true,researchReward:researchReward(2),nameKey:'cargo.name',goalKey:'cargo.goal',routeKey:'cargo.route',rooms:['D','E','F','G'],next:'foundry',events:['E01'],map:{x:440,y:144}},
 foundry:{id:'foundry',number:3,implemented:true,researchReward:researchReward(3),nameKey:'map.foundry',goalKey:'map.foundryGoal',routeKey:'map.foundryRoute',rooms:['M3A','M3B','M3C','M3D'],next:'archive',events:['E04'],map:{x:710,y:144}},
 archive:{id:'archive',number:4,implemented:true,researchReward:researchReward(4),nameKey:'map.archive',goalKey:'map.archiveGoal',routeKey:'map.archiveRoute',rooms:['M4A','M4B','M4C','M4D'],next:'reactor',events:['E05'],map:{x:710,y:380}},
 reactor:{id:'reactor',number:5,implemented:true,researchReward:researchReward(5),nameKey:'map.reactor',goalKey:'map.reactorGoal',routeKey:'map.reactorRoute',rooms:['M5A','M5B','M5C','M5D','M5E'],next:null,events:['E06'],map:{x:1020,y:380}},
};
export const playableMissionIds=['airlock','cargo','foundry','archive','reactor'] as const;
export const isPlayableMission=(id:unknown):id is PlayableMissionId=>typeof id==='string'&&playableMissionIds.includes(id as PlayableMissionId);
export function unlocked(id:MissionId,completed:readonly string[]){const index=missionIds.indexOf(id);return missions[id].implemented&&(index===0||completed.includes(missionIds[index-1]));}
// Keep every legacy Airlock seed; other sectors have independent reproducible streams.
export function missionSeed(seed:number,id:MissionId){if(id==='airlock')return seed>>>0;let value=(seed^0x811c9dc5)>>>0;for(const c of id)value=Math.imul(value^c.charCodeAt(0),16777619)>>>0;return value;}
