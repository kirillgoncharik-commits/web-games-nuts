import {loadout,purchase,type Loadout,type NodeId,type ActiveSkill} from './research';
import {planEvents,type EventPlan} from './events';
import {missions,missionSeed,unlocked,type PlayableMissionId} from './missions';
export const contentVersion='campaign-m05b1.3';
export type Stage='map'|'research'|'briefing'|'mission'|'result'|'campaign_checkpoint'|'campaign_complete';
export type MissionEntry={mission_id:PlayableMissionId;seed:number;build:Loadout;max_hp:number;initial_hp:number;initial_score:number;event_plan:EventPlan};
export type AttemptResult={attempt_id:string;mission_id:PlayableMissionId;result:'victory'|'death';reason:string;hp:number;max_hp:number;score:number;active_ms:number;screen_ms:number;nodes:NodeId[];reward_granted:boolean;applied:boolean};
export type CampaignData={character_id:'mira';campaign_id:string;campaign_seed:number;mission_id:PlayableMissionId;location_id:PlayableMissionId;stage:Stage;nodes:NodeId[];active:ActiveSkill;points:number;completed_missions:PlayableMissionId[];reward_ledger:string[];processed_attempts:string[];entry:MissionEntry|null;result:AttemptResult|null};
export function newCampaign(seed:number):CampaignData{return{character_id:'mira',campaign_id:crypto.randomUUID(),campaign_seed:seed>>>0,mission_id:'airlock',location_id:'airlock',stage:'map',nodes:[],active:null,points:1,completed_missions:[],reward_ledger:[],processed_attempts:[],entry:null,result:null};}
export class Campaign{
 constructor(readonly data:CampaignData){}
 buy(id:NodeId){if(this.data.stage!=='research'&&this.data.stage!=='map')return false;return purchase(this.data,id);}
 selectMission(id:PlayableMissionId){if(!unlocked(id,this.data.completed_missions)||this.data.stage==='mission')return false;this.data.mission_id=id;this.data.stage='research';return true;}
 selectActive(id:ActiveSkill){if(this.data.stage!=='research'||id!==null&&!this.data.nodes.includes(id))return false;this.data.active=id;return true;}
 prepare(){const d=this.data,build=loadout(d.nodes,d.active),seed=missionSeed(d.campaign_seed,d.mission_id),event_plan=d.entry?.mission_id===d.mission_id?structuredClone(d.entry.event_plan):planEvents(seed,d.mission_id);d.entry={mission_id:d.mission_id,seed,build,max_hp:build.maxHp,initial_hp:build.maxHp,initial_score:0,event_plan};d.result=null;d.stage='briefing';return structuredClone(d.entry);}
 begin(){if(!this.data.entry)return false;this.data.mission_id=this.data.entry.mission_id;this.data.location_id=this.data.mission_id;this.data.stage='mission';return true;}
 advance(){const d=this.data;if(d.result?.result!=='victory')return false;const next=missions[d.result.mission_id].next;if(next&&missions[next].implemented){d.mission_id=next as PlayableMissionId;d.stage='map';return true;}if(next){d.stage='campaign_checkpoint';return false;}d.stage='campaign_complete';return true;}
 applyResult(input:Omit<AttemptResult,'reward_granted'|'applied'>){
  const d=this.data;if(d.processed_attempts.includes(input.attempt_id)||input.mission_id!==d.entry?.mission_id)return false;
  d.processed_attempts.push(input.attempt_id);const key=d.campaign_id+':'+input.mission_id,firstVictory=input.result==='victory'&&!d.completed_missions.includes(input.mission_id),reward=firstVictory&&missions[input.mission_id].researchReward>0;
  if(firstVictory)d.completed_missions.push(input.mission_id);if(reward){d.reward_ledger.push(key);d.points+=missions[input.mission_id].researchReward;}
  d.mission_id=input.mission_id;d.result={...structuredClone(input),reward_granted:reward,applied:true};d.stage='result';return true;
 }
 snapshot(){return structuredClone(this.data);}
}
