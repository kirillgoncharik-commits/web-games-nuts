import {enemyScore,type EnemyKind} from './score-ledger';

export type CampaignTally={combat:number;rooms:number;salvage:number;extraction:number};
export const attachmentPrices={accelerator:200,cycler:450} as const;
export type Attachment=keyof typeof attachmentPrices;
export function isAttachment(value:unknown):value is Attachment{
 return value==='accelerator'||value==='cycler';
}

/** A room, enemy or cache can pay at most once per attempt, even after backtracking. */
export class CampaignScore{
 private readonly events=new Set<string>();
 private readonly tally:CampaignTally={combat:0,rooms:0,salvage:0,extraction:0};
 private recovered=0;
 private ended=false;

 private award(id:string,category:keyof CampaignTally,points:number){
  if(this.ended||this.events.has(id))return false;
  this.events.add(id);
  this.tally[category]+=points;
  return true;
 }
 kill(id:string,kind:EnemyKind){this.award('enemy:'+id,'combat',enemyScore[kind]);}
 room(id:string){this.award('exit:'+id,'rooms',100);}
 patrol(id:string,points:number){this.award('patrol:'+id,'combat',points);}
 cache(id:string,value:number){if(this.award('cache:'+id,'salvage',value))this.recovered++;}
 finish(outcome:'victory'|'death'|'abandoned'){
  if(outcome==='victory')this.award('finish','extraction',1000+200*this.recovered);
  this.ended=true;
 }
 checkpoint(){return {events:[...this.events],tally:{...this.tally},recovered:this.recovered};}
 restore(checkpoint:ReturnType<CampaignScore['checkpoint']>){
  this.events.clear();
  for(const event of checkpoint.events)this.events.add(event);
  Object.assign(this.tally,checkpoint.tally);
  this.recovered=checkpoint.recovered;
 }
 get total(){const t=this.tally;return t.combat+t.rooms+t.salvage+t.extraction;}
 breakdown(){return {...this.tally};}
}
