import {intersects,segmentRect,expand} from '../geometry';
import type {Rect,Point} from '../room-data';

export type CarryKind='lid'|'spool'|'block'|'conductor';
export type CarryItem={id:string;kind:CarryKind;spawn:Point;position:Point;state:'ready'|'held'|'thrown'|'resting';facing:1|-1;flightMs:number;shieldAvailable:boolean};
export type Contact={id:string;rect:Rect;active:boolean;open:boolean};
export type CarryRoom={item:CarryItem;contacts:Contact[];ledger:string[]};
export const carryContract={context:'interact',dropModifier:'crouch',move:true,jump:true,fire:false,throwSpeed:220,maxFlightMs:700} as const;
export function createCarryRoom(roomId:string,kind:CarryKind,spawn:Point,contacts:Contact[],ledger:string[]=[]):CarryRoom{
 return {item:{id:`c02-small-world:${roomId}:item:${kind}-01`,kind,spawn:{...spawn},position:{...spawn},state:'ready',facing:1,flightMs:0,shieldAvailable:true},contacts:contacts.map(c=>({...c,active:ledger.includes(c.id)})),ledger:[...ledger]};
}
export function canPickUp(room:CarryRoom,player:Point){return ['ready','resting'].includes(room.item.state)&&Math.abs(player.x-room.item.position.x)<=30&&Math.abs(player.y-room.item.position.y)<=28;}
export function canFire(room:CarryRoom){return room.item.state!=='held';}
export function carryAction(room:CarryRoom,player:Point,facing:1|-1,crouch=false):'pickup'|'throw'|'drop'|null{
 const item=room.item;if(item.state!=='held'){if(!canPickUp(room,player))return null;item.state='held';item.flightMs=0;item.facing=facing;return'pickup';}
 item.position={x:player.x+facing*20,y:player.y};item.facing=facing;item.flightMs=0;item.state=crouch?'resting':'thrown';return crouch?'drop':'throw';
}
export function resetMandatoryItem(room:CarryRoom){room.item.position={...room.item.spawn};room.item.state='ready';room.item.flightMs=0;}
export function absorbLidHit(room:CarryRoom){const i=room.item;if(i.state!=='held'||i.kind!=='lid'||!i.shieldAvailable)return false;i.shieldAvailable=false;i.state='resting';i.position={...i.spawn};return true;}
export function settleCarry(room:CarryRoom,player:Point,solids:readonly Rect[]){
 const item=room.item;if(item.state==='held'){item.position={...player};return;}
 if(!Number.isFinite(item.position.x)||!Number.isFinite(item.position.y)||item.position.x<8||item.position.x>632||item.position.y>320){resetMandatoryItem(room);return;}
 if(item.state==='resting'){
  const floor=solids.filter(s=>s.x<=item.position.x&&s.x+s.width>=item.position.x&&s.y>=item.position.y-8).sort((a,b)=>a.y-b.y)[0];
  if(floor)item.position.y=floor.y-8;else resetMandatoryItem(room);
 }
}
// Called by the existing fixed simulation tick. Swept tests avoid tunnelling.
export function stepCarry(room:CarryRoom,ms:number,solids:readonly Rect[]):string[]{
 const item=room.item;if(item.state!=='thrown'||ms<=0||!Number.isFinite(ms))return[];
 const from={...item.position},to={x:from.x+carryContract.throwSpeed*ms/1000*item.facing,y:from.y},hitContacts=room.contacts.filter(c=>!c.active&&c.open&&segmentRect(from,to,expand(c.rect,8,8)));
 const hitWall=solids.map(rect=>({rect,distance:item.facing===1?rect.x-from.x:from.x-rect.x-rect.width})).filter(s=>segmentRect(from,to,expand(s.rect,7,7))).sort((a,b)=>a.distance-b.distance)[0];
 const awarded:string[]=[];
 for(const c of hitContacts){const distance=item.facing===1?c.rect.x-from.x:from.x-c.rect.x-c.rect.width;if(hitWall&&hitWall.distance<distance)continue;c.active=true;if(!room.ledger.includes(c.id)){room.ledger.push(c.id);awarded.push(c.id);}}
 item.position=to;item.flightMs+=ms;if(hitWall){item.position.x=item.facing===1?hitWall.rect.x-9:hitWall.rect.x+hitWall.rect.width+9;item.state='resting';}
 if(awarded.length||item.flightMs>=carryContract.maxFlightMs)item.state='resting';
 if(to.x<8||to.x>632)resetMandatoryItem(room);return awarded;
}

export type Circuit='A'|'B';
export type PowerObject={id:string;rect:Rect;solidOn:Circuit;role?:'door'};
export type PowerRoom={circuit:Circuit;switches:number;objects:PowerObject[];ledger:string[]};
export function createPowerRoom(objects:PowerObject[],circuit:Circuit='A',ledger:string[]=[]):PowerRoom{return{objects:structuredClone(objects),circuit,switches:0,ledger:[...ledger]};}
export function circuitSolids(room:PowerRoom){return room.objects.filter(o=>o.solidOn===room.circuit).map(o=>({...o.rect,id:'world-power:'+o.id}));}
export function switchCircuit(room:PowerRoom,player:Rect):boolean{
 const next=room.circuit==='A'?'B':'A';if(room.objects.some(o=>o.solidOn===next&&intersects(player,o.rect)))return false;
 // A manual switch waits until its rider has left the changing surface.
 if(room.objects.some(o=>o.solidOn===room.circuit&&Math.abs(player.y+player.height-o.rect.y)<3&&player.x<o.rect.x+o.rect.width&&player.x+player.width>o.rect.x))return false;
 room.circuit=next;room.switches++;return true;
}
export function powerReadout(room:PowerRoom){return{lever:room.circuit==='A'?'left':'right',label:room.circuit,lamps:room.circuit==='A'?1:2,wiring:room.circuit==='A'?'solid':'double'} as const;}
export type PowerEdge={from:string;to:string;circuit?:Circuit};
export function reachablePowerNodes(edges:readonly PowerEdge[],circuit:Circuit,from:string){const seen=new Set([from]),todo=[from];while(todo.length){const node=todo.pop()!;for(const e of edges){if(e.circuit&&e.circuit!==circuit)continue;const to=e.from===node?e.to:e.to===node?e.from:null;if(to&&!seen.has(to)){seen.add(to);todo.push(to);}}}return seen;}
export function powerGraphSafe(edges:readonly PowerEdge[],switches:readonly string[],entry:string,exit:string){return(['A','B'] as const).every(circuit=>{const nodes=reachablePowerNodes(edges,circuit,entry);return nodes.has(exit)&&[...nodes].every(node=>switches.some(s=>reachablePowerNodes(edges,circuit,node).has(s)));});}
