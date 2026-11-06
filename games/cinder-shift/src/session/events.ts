import config from '../../game.config.json' with {type:'json'};
import {rooms} from '../room-data';
export type EventId='E02'|'E03';
export type EventEntry={event_id:EventId;definition_version:1;room_id:'B';variant:'upper-shutter'|'repair-cache'};
export type EventPlan=EventEntry[];
export const eventConfig={E02:{probability:config.m04.event_probabilities.E02,version:1},E03:{probability:config.m04.event_probabilities.E03,version:1},repairHp:config.m04.repair_hp,salvageScore:config.m04.salvage_score} as const;
export const repairPosition={x:84,y:320,radius:24};
export const shutter={x:320,y:40,width:64,height:216};
export function randomStream(seed:number){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export const eventDefinitions={E02:{version:1,room:'B',variants:['upper-shutter']},E03:{version:1,room:'B',variants:['repair-cache']}} as const;
export function eventAllowed(id:EventId,variant:string){
  const room=rooms.B,floor=room.solids.find(s=>s.y===320&&s.x===0&&s.width===640);
  if(!floor||room.next!=='C')return false;
  if(id==='E02'&&variant==='upper-shutter'){
    const overlapping=room.solids.filter(s=>s.y<320&&s.x<shutter.x+shutter.width&&s.x+s.width>shutter.x);
    const underside=Math.max(shutter.y+shutter.height,...overlapping.map(s=>s.y+s.height));
    return shutter.x>112&&shutter.x+shutter.width<620&&320-underside>=44&&underside<292;
  }
  if(id==='E03'&&variant==='repair-cache')return repairPosition.x-repairPosition.radius>20&&repairPosition.x+repairPosition.radius<Math.min(...room.enemies.map(e=>e.activateX))&&!room.solids.some(s=>s.y<320&&s.x<repairPosition.x+16&&s.x+s.width>repairPosition.x-16&&s.y+s.height>298);
  return false;
}
export function planEvents(seed:number):EventPlan{
  const random=randomStream(seed),plan:EventPlan=[];
  for(const event_id of ['E02','E03'] as const){const candidates=[...eventDefinitions[event_id].variants].filter(v=>eventAllowed(event_id,v));const roll=random();if(candidates.length&&roll<eventConfig[event_id].probability)plan.push({event_id,definition_version:1,room_id:'B',variant:candidates[0] as EventEntry['variant']});}
  return plan;
}
export const hasEvent=(plan:EventPlan,id:EventId)=>plan.some(e=>e.event_id===id);
export function validPlan(value:unknown):value is EventPlan{
  if(!Array.isArray(value)||value.length>2)return false;const ids=new Set<string>();
  return value.every(e=>e&&['E02','E03'].includes(e.event_id)&&e.definition_version===1&&e.room_id==='B'&&eventAllowed(e.event_id,e.variant)&&!ids.has(e.event_id)&&Boolean(ids.add(e.event_id)));
}
export function seedsForPlans(){const found:Record<string,number>={};for(let seed=0;Object.keys(found).length<4&&seed<10000;seed++){const key=planEvents(seed).map(e=>e.event_id).join('+')||'none';found[key]??=seed;}return found;}
