import {loadout,purchase,type Loadout,type NodeId} from './research';
import {planEvents,type EventPlan} from './events';
export const contentVersion='airlock-m04.1';
export type Stage='research'|'briefing'|'mission'|'result'|'preview_complete';
export type MissionEntry={mission_id:'airlock';seed:number;build:Loadout;max_hp:number;initial_hp:number;initial_score:number;event_plan:EventPlan};
export type AttemptResult={attempt_id:string;mission_id:'airlock';result:'victory'|'death';reason:string;hp:number;max_hp:number;score:number;active_ms:number;screen_ms:number;nodes:NodeId[];reward_granted:boolean;applied:boolean};
export type CampaignData={campaign_id:string;campaign_seed:number;mission_id:'airlock';stage:Stage;nodes:NodeId[];active:'M1'|null;points:number;completed_missions:string[];reward_ledger:string[];processed_attempts:string[];entry:MissionEntry|null;result:AttemptResult|null};
export function newCampaign(seed:number):CampaignData{return{campaign_id:crypto.randomUUID(),campaign_seed:seed>>>0,mission_id:'airlock',stage:'research',nodes:[],active:null,points:1,completed_missions:[],reward_ledger:[],processed_attempts:[],entry:null,result:null};}
export class Campaign{
  constructor(readonly data:CampaignData){}
  buy(id:NodeId){if(this.data.stage!=='research')return false;return purchase(this.data,id);}
  prepare(){const d=this.data,build=loadout(d.nodes);d.entry={mission_id:'airlock',seed:d.campaign_seed,build,max_hp:build.maxHp,initial_hp:build.maxHp,initial_score:0,event_plan:planEvents(d.campaign_seed)};d.stage='briefing';return structuredClone(d.entry);}
  applyResult(input:Omit<AttemptResult,'reward_granted'|'applied'>){
    const d=this.data;if(d.processed_attempts.includes(input.attempt_id))return false;
    d.processed_attempts.push(input.attempt_id);const key=d.campaign_id+':'+input.mission_id;
    const reward=input.result==='victory'&&!d.reward_ledger.includes(key);
    if(reward){d.reward_ledger.push(key);d.completed_missions.push(input.mission_id);d.points++;}
    d.result={...structuredClone(input),reward_granted:reward,applied:true};d.stage='result';return true;
  }
  snapshot(){return structuredClone(this.data);}
}
