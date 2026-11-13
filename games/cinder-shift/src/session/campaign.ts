import {loadout,purchase,type Loadout,type NodeId,type ActiveSkill} from './research';
import {planEvents,type EventPlan} from './events';
import {missions,missionSeed,unlocked,type PlayableMissionId} from './missions';
export const campaignRuleset='campaign-rework6';
export const contentVersion='campaign-m05b3.0';
export type Stage='map'|'research'|'briefing'|'mission'|'result'|'campaign_checkpoint'|'campaign_complete';
export type RelaySupport='none'|'power'|'repair';
export type MissionEntry={mission_id:PlayableMissionId;seed:number;build:Loadout;max_hp:number;initial_hp:number;initial_score:number;event_plan:EventPlan;relay_template?:string;relay_leg?:'A'|'B';relay_support?:RelaySupport};
export type AttemptResult={attempt_id:string;mission_id:PlayableMissionId;result:'victory'|'death';reason:string;hp:number;max_hp:number;score:number;active_ms:number;screen_ms:number;nodes:NodeId[];reward_granted:boolean;applied:boolean};
export type RunStats={ruleset_id?:string;active_ms:number;deaths:number;score:number;foundry_route:'service'|'press'|null;history_complete:boolean;assisted:boolean};
export type CampaignData={character_id:'mira';campaign_id:string;campaign_seed:number;mission_id:PlayableMissionId;location_id:PlayableMissionId;stage:Stage;nodes:NodeId[];active:ActiveSkill;points:number;completed_missions:PlayableMissionId[];reward_ledger:string[];processed_attempts:string[];run_stats:RunStats;entry:MissionEntry|null;result:AttemptResult|null};
export function newCampaign(seed:number):CampaignData{return{character_id:'mira',campaign_id:crypto.randomUUID(),campaign_seed:seed>>>0,mission_id:'airlock',location_id:'airlock',stage:'map',nodes:[],active:null,points:1,completed_missions:[],reward_ledger:[],processed_attempts:[],run_stats:{ruleset_id:campaignRuleset,active_ms:0,deaths:0,score:0,foundry_route:null,history_complete:true,assisted:false},entry:null,result:null};}
export class Campaign{
 constructor(readonly data:CampaignData){}
 buy(id:NodeId){if(this.data.stage!=='research'&&this.data.stage!=='map')return false;return purchase(this.data,id);}
 selectMission(id:PlayableMissionId){if(!unlocked(id,this.data.completed_missions)||this.data.stage==='mission')return false;this.data.mission_id=id;this.data.stage='research';return true;}
 selectActive(id:ActiveSkill){if(this.data.stage!=='research'||id!==null&&!this.data.nodes.includes(id))return false;this.data.active=id;return true;}
 prepare(){const d=this.data,build=loadout(d.nodes,d.active),seed=missionSeed(d.campaign_seed,d.mission_id),event_plan=d.entry?.mission_id===d.mission_id?structuredClone(d.entry.event_plan):planEvents(seed,d.mission_id);d.entry={mission_id:d.mission_id,seed,build,max_hp:build.maxHp,initial_hp:build.maxHp,initial_score:0,event_plan};d.result=null;d.stage='briefing';return structuredClone(d.entry);}
 begin(){if(!this.data.entry)return false;if(this.data.run_stats.ruleset_id!==campaignRuleset)this.data.run_stats.ruleset_id=this.data.processed_attempts.length?'mixed-legacy-rework':campaignRuleset;this.data.mission_id=this.data.entry.mission_id;this.data.location_id=this.data.mission_id;this.data.stage='mission';return true;}
 advance(){const d=this.data;if(d.result?.result!=='victory')return false;const next=missions[d.result.mission_id].next;if(next&&missions[next].implemented){d.mission_id=next as PlayableMissionId;d.stage='map';return true;}if(next){d.stage='campaign_checkpoint';return false;}d.stage='campaign_complete';return true;}
 applyResult(input:Omit<AttemptResult,'reward_granted'|'applied'>&{foundry_route?:'service'|'press'|null}){
  const d=this.data;if(d.processed_attempts.includes(input.attempt_id)||input.mission_id!==d.entry?.mission_id)return false;
  d.processed_attempts.push(input.attempt_id);const key=d.campaign_id+':'+input.mission_id,firstVictory=input.result==='victory'&&!d.completed_missions.includes(input.mission_id),reward=firstVictory&&missions[input.mission_id].researchReward>0;
  d.run_stats.active_ms+=input.active_ms;if(input.result==='death')d.run_stats.deaths++;if(firstVictory)d.run_stats.score+=input.score;if(input.mission_id==='foundry'&&input.foundry_route)d.run_stats.foundry_route=input.foundry_route;
  if(firstVictory)d.completed_missions.push(input.mission_id);if(reward){d.reward_ledger.push(key);d.points+=missions[input.mission_id].researchReward;}
  d.mission_id=input.mission_id;d.result={...structuredClone(input),reward_granted:reward,applied:true};d.stage='result';return true;
 }
 snapshot(){return structuredClone(this.data);}
}
