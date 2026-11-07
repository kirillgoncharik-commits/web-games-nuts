import config from '../../game.config.json' with {type:'json'};
import {rooms,type RoomId} from '../room-data';
import type {PlayableMissionId} from './missions';
export type EventId='E01'|'E02'|'E03';
export type EventEntry={event_id:EventId;definition_version:1|2;room_id:'B'|'E';variant:'upper-shutter'|'repair-cache'|'emergency-power'};
export type EventPlan=EventEntry[];
export const eventConfig={E01:{probability:.5,version:1},E02:{probability:config.m04.event_probabilities.E02,version:1},E03:{probability:config.m04.event_probabilities.E03,version:2},repairHp:config.m04.repair_hp,salvageScore:config.m04.salvage_score} as const;
export const repairPosition={x:568,y:320,radius:24};
export const repairBaffle={x:520,y:272,width:16,height:48};
const previousRepairPosition={x:84,radius:24,firstThreatX:112};
export const shutter={x:320,y:40,width:64,height:216};
export const cargoShutter={id:'e-power-gate',x:300,y:40,width:20,height:212};
export function randomStream(seed:number){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export const eventDefinitions={E01:{version:1,room:'E',mission:'cargo',variants:['emergency-power']},E02:{version:1,room:'B',mission:'airlock',variants:['upper-shutter']},E03:{version:2,room:'B',mission:'airlock',variants:['repair-cache']}} as const;
export function eventAllowed(id:EventId,variant:string){
 if(id==='E01')return variant==='emergency-power'&&rooms.E.terminalKind==='restore'&&rooms.E.enemies.some(e=>e.kind==='turret')&&320-(cargoShutter.y+cargoShutter.height)>=44;
 const room=rooms.B,floor=room.solids.find(s=>s.y===320&&s.x===0&&s.width===640);if(!floor||room.next!=='C')return false;
 if(id==='E02'&&variant==='upper-shutter'){const overlapping=room.solids.filter(s=>s.y<320&&s.x<shutter.x+shutter.width&&s.x+s.width>shutter.x);const underside=Math.max(shutter.y+shutter.height,...overlapping.map(s=>s.y+s.height));return shutter.x>112&&shutter.x+shutter.width<620&&320-underside>=44&&underside<292;}
 if(id==='E03'&&variant==='repair-cache'){
  const floor=room.solids.find(s=>s.y===320&&s.x===0&&s.width===640);
  const pocket=room.safeZones?.find(s=>repairPosition.x-repairPosition.radius>=s.x&&repairPosition.x+repairPosition.radius<=s.x+s.width&&s.y+s.height===320);
  const baffle=room.solids.find(s=>s.x===repairBaffle.x&&s.y===repairBaffle.y&&s.width===repairBaffle.width&&s.height===repairBaffle.height);
  const lastThreat=Math.max(...room.enemies.map(e=>Math.max(e.x,e.end.x)));
  const occupied=pocket&&room.solids.some(s=>s.y<320&&s.x<pocket.x+pocket.width&&s.x+s.width>pocket.x&&s.y<pocket.y+pocket.height&&s.y+s.height>pocket.y);
  return Boolean(floor&&room.next==='C'&&pocket&&baffle&&!occupied&&repairPosition.x-repairPosition.radius>lastThreat+24&&repairPosition.x+repairPosition.radius<620&&320-repairBaffle.y<=48);
 }
 return false;
}
export function planEvents(seed:number,mission:PlayableMissionId='airlock'):EventPlan{
 const random=randomStream(seed),plan:EventPlan=[];
 for(const event_id of (mission==='airlock'?['E02','E03']:['E01']) as EventId[]){const def=eventDefinitions[event_id],candidates=[...def.variants].filter(v=>eventAllowed(event_id,v));const roll=random();if(candidates.length&&roll<eventConfig[event_id].probability)plan.push({event_id,definition_version:def.version,room_id:def.room,variant:candidates[0] as EventEntry['variant']});}return plan;
}
export const hasEvent=(plan:EventPlan,id:EventId)=>plan.some(e=>e.event_id===id);
export function validPlan(value:unknown,mission:PlayableMissionId='airlock'):value is EventPlan{
 if(!Array.isArray(value)||value.length>(mission==='airlock'?2:1))return false;const used=new Set<string>();
 return value.every(e=>{
  if(!e||!Object.hasOwn(eventDefinitions,e.event_id)||eventDefinitions[e.event_id as EventId].mission!==mission||e.room_id!==eventDefinitions[e.event_id as EventId].room||used.has(e.event_id))return false;
  const current=e.definition_version===eventDefinitions[e.event_id as EventId].version&&eventAllowed(e.event_id,e.variant);
  // M04/M05A stored E03 at the old entrance. Accept it only as a migration input.
  const previous=e.event_id==='E03'&&e.definition_version===1&&e.variant==='repair-cache'&&e.room_id==='B'&&previousRepairPosition.x-previousRepairPosition.radius>20&&previousRepairPosition.x+previousRepairPosition.radius<previousRepairPosition.firstThreatX;
  used.add(e.event_id);return current||previous;
 });
}
export function migrateEventPlan(value:EventPlan):EventPlan{return value.map(e=>e.event_id==='E03'&&e.definition_version===1?{...e,definition_version:2}:structuredClone(e)) as EventPlan;}
export function seedsForPlans(){const found:Record<string,number>={};for(let seed=0;Object.keys(found).length<4&&seed<10000;seed++){const key=planEvents(seed).map(e=>e.event_id).join('+')||'none';found[key]??=seed;}return found;}
