import {expect,type Page} from '@playwright/test';
import {state} from './helpers';

// One sector-entry fixture, followed only by trusted keyboard/UI input. No enemy,
// HP, position, clock or room mutations are permitted after that entry.
export async function until<T>(page:Page,condition:(arg:T)=>unknown,arg:T,label:string,timeout=10000){
 try{await page.waitForFunction(condition as any,arg,{timeout});}
 catch{const s=await state(page);throw Error(label+' '+JSON.stringify({state:s.state,room:s.room,hp:s.hp,player:s.player,enemies:s.enemies,hazards:s.hazards,powered:s.powered,exitOpen:s.exitOpen}));}
}
export async function ground(page:Page,feet?:number){await until(page,feet=>{const p=(window as any).__CINDER__().player;return p?.vy===0&&Math.abs(p.vx)<1&&(feet===null||Math.abs(p.y+22-feet)<2);},feet??null,'ground');}
export async function to(page:Page,x:number){
 const before=(await state(page)).player.x,right=before<x,key=right?'d':'a';
 await page.keyboard.down(key);await until(page,({x,right})=>{const p=(window as any).__CINDER__().player;return p&&(right?p.x>=x:p.x<=x);},{x,right},'move '+x);await page.keyboard.up(key);
}
export async function jump(page:Page,from:number,toX:number){
 const right=toX>from,key=right?'d':'a';await page.keyboard.down(key);
 await until(page,({from,right})=>{const p=(window as any).__CINDER__().player;return right?p.x>=from:p.x<=from;},{from,right},'jump launch '+from);
 await page.keyboard.down('Space');await until(page,({toX,right})=>{const p=(window as any).__CINDER__().player;return right?p.x>=toX:p.x<=toX;},{toX,right},'jump landing '+toX);
 await page.keyboard.up(key);await page.keyboard.up('Space');
}
export async function clear(page:Page,ids:string[]){
 await page.keyboard.down('j');await until(page,ids=>{const s=(window as any).__CINDER__();return s.hp<=0||ids.every((id:string)=>s.enemies.find((e:any)=>e.id===id)?.hp<=0);},ids,'clear '+ids.join(','),14000);await page.keyboard.up('j');expect((await state(page)).hp).toBeGreaterThan(0);
}
export async function counterRam(page:Page,id:string){
 await page.keyboard.down('j');await until(page,id=>{const s=(window as any).__CINDER__(),e=s.enemies.find((e:any)=>e.id===id);return s.hp<=0||e?.hp<=0||e?.phase==='telegraph'&&e.remaining<220;},id,'ram warning '+id);
 await page.keyboard.down('Space');await until(page,id=>{const s=(window as any).__CINDER__();return s.hp<=0||s.enemies.find((e:any)=>e.id===id)?.hp<=0;},id,'ram counter '+id,12000);await page.keyboard.up('Space');await page.keyboard.up('j');expect((await state(page)).hp).toBeGreaterThan(0);
}
export async function drone(page:Page,id:string,feet=320){
 for(let pass=0;pass<8;pass++){
  const entry=await state(page);
  if(entry.enemies.find((e:any)=>e.id===id)?.hp<=0)break;
  await ground(page,feet);
  const started=(await state(page)).simMs;
  await page.keyboard.down('Space');
  try{
   await until(page,({id,started})=>{
    const s=(window as any).__CINDER__(),e=s.enemies.find((e:any)=>e.id===id);
    // Hold fire through the return crossing even if a frame skipped the exact ascent height.
    return s.hp<=0||e?.hp<=0||s.player.y+22-28<=e.y+8||s.simMs-started>700;
   },{id,started},'drone firing lane '+id);
   await page.keyboard.down('j');
   await until(page,started=>{const s=(window as any).__CINDER__();return s.hp<=0||s.simMs>started+250&&s.player.vy===0;},started,'drone landing '+id);
  }finally{await Promise.all([page.keyboard.up('j'),page.keyboard.up('Space')]);}
  expect((await state(page)).hp).toBeGreaterThan(0);
 }
 expect((await state(page)).enemies.find((e:any)=>e.id===id)?.hp,id).toBeLessThanOrEqual(0);
}
export async function cross(page:Page,id:string,end?:number){
 let s=await state(page),h=s.hazards.find((h:any)=>h.id===id);if(!h)return;
 // Keep an already safe landing beside cover instead of backtracking into it.
 if(s.player.x<h.x-24)await to(page,h.x-24);await ground(page,320);
 // Stop before reading the final position. Momentum or knockback can carry
 // the suit over the near edge after the approach key has been released.
 if((await state(page)).player.x+11>h.x){await to(page,h.x-22);await ground(page,320);}
 expect((await state(page)).player.x+11,'wait outside the machine footprint').toBeLessThanOrEqual(h.x);
 const target=end??h.x+h.width+28,travel=(target-(await state(page)).player.x)/115*1000+180;
 await until(page,({id,travel})=>{const s=(window as any).__CINDER__(),h=s.hazards.find((h:any)=>h.id===id);if(!h||h.enabled===false)return true;const t=(s.simMs+(h.offset_ms||0))%h.cycle_ms;return t<h.warning_ms?h.warning_ms-t>travel:t>=h.warning_ms+h.active_ms&&h.cycle_ms-t+h.warning_ms>travel;},{id,travel},'machine window '+id,12000);
 await to(page,target);expect((await state(page)).hp).toBeGreaterThan(0);
}
export async function next(page:Page,id:string,cover?:number){
 expect((await state(page)).combatRemaining).toBe(0);
 if(cover!==undefined){await jump(page,cover-30,cover+48);await ground(page,320);}
 await page.keyboard.down('d');await until(page,id=>{const s=(window as any).__CINDER__();return s.room===id&&s.state==='playing'&&s.player?.x<100;},id,'exit to '+id);await page.keyboard.up('d');await ground(page,320);
}


// Dispatch both trusted key events before awaiting either transport round trip.
// Call only after stopping on the launch ledge, so delayed direction input cannot
// walk the player off it while the jump command is still in flight.
export async function standingJump(page:Page,toX:number){
 const p=(await state(page)).player;expect(Math.abs(p.vy)).toBe(0);expect(Math.abs(p.vx)).toBeLessThan(1);
 const right=toX>p.x,key=right?'d':'a';
 await Promise.all([page.keyboard.down('Space'),page.keyboard.down(key)]);
 await until(page,({toX,right})=>{const p=(window as any).__CINDER__().player;return right?p.x>=toX:p.x<=toX;},{toX,right},'standing jump landing');
 await Promise.all([page.keyboard.up(key),page.keyboard.up('Space')]);
}


export async function alignOnLedge(page:Page,target:number,feet:number){
 await page.keyboard.down('s');
 try{
  for(let adjustment=0;adjustment<8;adjustment++){
   const current=await state(page),distance=target-current.player.x;
   if(Math.abs(distance)<=4)return;
   const delay=Math.max(35,Math.min(100,(Math.abs(distance)-2)*1000/58));
   await page.keyboard.press(distance>0?'d':'a',{delay});await ground(page,feet);
  }
  expect(Math.abs((await state(page)).player.x-target),'standing jump launch position').toBeLessThanOrEqual(4);
 }finally{await page.keyboard.up('s');}
}
