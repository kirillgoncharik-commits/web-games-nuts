import {expect} from '@playwright/test';
import {newCampaign} from '../games/cinder-shift/src/session/campaign';
import {missionIds,missions,type PlayableMissionId} from '../games/cinder-shift/src/session/missions';
import {loadout,type ActiveSkill,type NodeId} from '../games/cinder-shift/src/session/research';

// Compare the same seed, route and keyboard strategy with purchases that are
// affordable on the first visit. Later sectors must not receive free modules.
export function routeBuild(mission:PlayableMissionId){
 const id=process.env.RW1_ROUTE_BUILD||'base';
 if(!['base','weapon','movement','defence'].includes(id))throw Error('Unknown route build '+id);
 let budget=newCampaign(4).points;
 for(const previous of missionIds){if(previous===mission)break;budget+=missions[previous].researchReward;}
 const prefix=id==='weapon'?'W':id==='movement'?'M':'D';
 const nodes:NodeId[]=id==='base'?[]:Array.from({length:Math.min(4,budget)},(_,i)=>`${prefix}${i+1}` as NodeId);
 const active:ActiveSkill=nodes.includes('M1')?'M1':nodes.includes('W4')?'W4':null;
 return{id,nodes,active,budget,maxHp:loadout(nodes,active).maxHp};
}

export function verifyRouteEntry(s:any,build:ReturnType<typeof routeBuild>){
 expect(s.loadout.nodes).toEqual(build.nodes);
 expect(s.loadout.active).toBe(build.active);
 expect(s.hp).toBe(build.maxHp);
 expect(s.campaign.points).toBe(build.budget-build.nodes.length);
}

export function routeBuildEvidence(s:any,build:ReturnType<typeof routeBuild>){
 return{loadout_id:build.id,nodes:build.nodes,active:build.active,research_budget:build.budget,
  points_after_route:s.campaign.points,max_hp:s.maxHp,
  comparison_strategy:'same keyboard route; no build-specific shortcut or active-skill optimization',
  shield_absorptions:s.eventLog.filter((e:any)=>e.name==='shield_absorbed'),
  abilities:s.eventLog.filter((e:any)=>e.name==='ability_used'),
  death_preventions:s.eventLog.filter((e:any)=>e.name==='death_prevented')};
}
