import {test,expect,type Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {state} from './helpers';

// One sector-entry fixture, followed only by trusted keyboard/UI input. No enemy,
// HP, position, clock or room mutations are permitted after that entry.
async function until<T>(page:Page,condition:(arg:T)=>unknown,arg:T,label:string,timeout=10000){
 try{await page.waitForFunction(condition as any,arg,{timeout});}
 catch{const s=await state(page);throw Error(label+' '+JSON.stringify({state:s.state,room:s.room,hp:s.hp,player:s.player,enemies:s.enemies,hazards:s.hazards,powered:s.powered,exitOpen:s.exitOpen}));}
}
async function ground(page:Page,feet?:number){await until(page,feet=>{const p=(window as any).__CINDER__().player;return p?.vy===0&&Math.abs(p.vx)<1&&(feet===null||Math.abs(p.y+22-feet)<2);},feet??null,'ground');}
async function to(page:Page,x:number){
 const before=(await state(page)).player.x,right=before<x,key=right?'d':'a';
 await page.keyboard.down(key);await until(page,({x,right})=>{const p=(window as any).__CINDER__().player;return p&&(right?p.x>=x:p.x<=x);},{x,right},'move '+x);await page.keyboard.up(key);
}
async function jump(page:Page,from:number,toX:number){
 const right=toX>from,key=right?'d':'a';await page.keyboard.down(key);
 await until(page,({from,right})=>{const p=(window as any).__CINDER__().player;return right?p.x>=from:p.x<=from;},{from,right},'jump launch '+from);
 await page.keyboard.down('Space');await until(page,({toX,right})=>{const p=(window as any).__CINDER__().player;return right?p.x>=toX:p.x<=toX;},{toX,right},'jump landing '+toX);
 await page.keyboard.up(key);await page.keyboard.up('Space');
}
async function clear(page:Page,ids:string[]){
 await page.keyboard.down('j');await until(page,ids=>{const s=(window as any).__CINDER__();return s.hp<=0||ids.every((id:string)=>s.enemies.find((e:any)=>e.id===id)?.hp<=0);},ids,'clear '+ids.join(','),14000);await page.keyboard.up('j');expect((await state(page)).hp).toBeGreaterThan(0);
}
async function counterRam(page:Page,id:string){
 await page.keyboard.down('j');await until(page,id=>{const s=(window as any).__CINDER__(),e=s.enemies.find((e:any)=>e.id===id);return s.hp<=0||e?.hp<=0||e?.phase==='telegraph'&&e.remaining<220;},id,'ram warning '+id);
 await page.keyboard.down('Space');await until(page,id=>{const s=(window as any).__CINDER__();return s.hp<=0||s.enemies.find((e:any)=>e.id===id)?.hp<=0;},id,'ram counter '+id,12000);await page.keyboard.up('Space');await page.keyboard.up('j');expect((await state(page)).hp).toBeGreaterThan(0);
}
async function drone(page:Page,id:string){
 for(let shot=0;shot<8&&(await state(page)).enemies.find((e:any)=>e.id===id)?.hp>0;shot++){
  await ground(page,320);await page.keyboard.down('Space');
  await until(page,id=>{const s=(window as any).__CINDER__(),p=s.player,e=s.enemies.find((e:any)=>e.id===id);return s.hp<=0||e?.hp<=0||p.vy<0&&Math.abs(p.y+22-28-e.y)<6;},id,'drone firing line '+id,1800);
  const before=(await state(page)).simMs;await page.keyboard.down('j');await until(page,before=>(window as any).__CINDER__().simMs>=before+50,before,'shot');await page.keyboard.up('j');await page.keyboard.up('Space');
 }
 expect((await state(page)).enemies.find((e:any)=>e.id===id)?.hp,id).toBeLessThanOrEqual(0);expect((await state(page)).hp).toBeGreaterThan(0);
}
async function cross(page:Page,id:string,end?:number){
 let s=await state(page),h=s.hazards.find((h:any)=>h.id===id);if(!h)return;
 // Keep an already safe landing beside cover instead of backtracking into it.
 if(s.player.x<h.x-24)await to(page,h.x-24);await ground(page,320);
 expect((await state(page)).player.x+11,'wait outside the machine footprint').toBeLessThanOrEqual(h.x);
 const target=end??h.x+h.width+28,travel=(target-(await state(page)).player.x)/115*1000+180;
 await until(page,({id,travel})=>{const s=(window as any).__CINDER__(),h=s.hazards.find((h:any)=>h.id===id);if(!h||h.enabled===false)return true;const t=(s.simMs+(h.offset_ms||0))%h.cycle_ms;return t<h.warning_ms?h.warning_ms-t>travel:t>=h.warning_ms+h.active_ms&&h.cycle_ms-t+h.warning_ms>travel;},{id,travel},'machine window '+id,12000);
 await to(page,target);expect((await state(page)).hp).toBeGreaterThan(0);
}
async function next(page:Page,id:string,cover?:number){
 expect((await state(page)).combatRemaining).toBe(0);
 if(cover!==undefined){await jump(page,cover-30,cover+48);await ground(page,320);}
 await page.keyboard.down('d');await until(page,id=>{const s=(window as any).__CINDER__();return s.room===id&&s.state==='playing'&&s.player?.x<100;},id,'exit to '+id);await page.keyboard.up('d');await ground(page,320);
}

for(const route of ['service','press'] as const)test(`base suit completes the full eight-room Foundry ${route} route`,async({page},info)=>{
 test.setTimeout(240000);const measurements:any[]=[];let activeRoom='',roomStart=0,hpStart=6;const started=Date.now();
 async function mark(){const s=await state(page);if(activeRoom)measurements.push({room:activeRoom,active_seconds:s.activeSeconds-roomStart,hp_in:hpStart,hp_out:s.hp});activeRoom=s.room;roomStart=s.activeSeconds;hpStart=s.hp;console.log('Route entry',route,activeRoom,'HP',hpStart,'time',roomStart);}
 try{
  await page.goto('/__encounter__/');await page.getByTestId('new-shift').waitFor();
  await page.getByTestId('menu-settings').click();await expect.poll(async()=>(await state(page)).audioStatus.ready).toBe(true);await page.getByTestId('settings-back').click();
  await page.evaluate(()=>(window as any).__ENCOUNTER__.start({mission:'foundry',seed:4}));await ground(page,320);await mark();
  expect((await state(page)).loadout.nodes).toEqual([]);
  await jump(page,148,250);await ground(page,320);await counterRam(page,'m3a-ram');await next(page,'M3E',520);await mark();
  await to(page,100);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).powerCircuit).toBe('furnace');
  await jump(page,148,250);await ground(page,320);await counterRam(page,'m3e-ram');
  await to(page,384);await drone(page,'m3e-drone');await cross(page,'m3e-furnace');await next(page,'M3F',560);await mark();
  await jump(page,160,270);await ground(page,320);await clear(page,['m3f-security']);await to(page,556);await ground(page,320);
  await page.keyboard.press('e');await page.getByTestId('fork-'+route).click();await next(page,route==='service'?'M3B':'M3C');await mark();
  if(route==='service'){
   await jump(page,124,216);await ground(page,320);await clear(page,['m3b-walker']);await jump(page,324,410);await ground(page,320);await drone(page,'m3b-drone');await next(page,'M3G',536);await mark();
   // The lower drone is screened by the middle platform from floor fire.
   // Climb the real cover/platform steps, then use the crouched firing line.
   await jump(page,140,190);await ground(page,288);await jump(page,205,306);await ground(page,256);
   await page.keyboard.down('s');await clear(page,['m3g-drone-low']);await page.keyboard.up('s');
   await jump(page,350,446);await ground(page,224);await clear(page,['m3g-drone-high']);await to(page,510);await ground(page,320);await next(page,'M3H',552);await mark();
   await jump(page,130,216);await ground(page,320);await clear(page,['m3h-security','m3h-turret']);await page.keyboard.down('s');await to(page,384);await page.keyboard.up('s');await ground(page,320);await next(page,'M3K',520);await mark();
  }else{
   await jump(page,114,208);await ground(page,320);await to(page,280);await clear(page,['m3c-ram']);await cross(page,'m3c-press');await cross(page,'m3c-heat');await next(page,'M3I',552);await mark();
   // Fire from the actual shelf: standing under its edge forces crouch and blocks jumping.
   await jump(page,130,190);await ground(page,288);await jump(page,215,310);await ground(page,248);
   await page.keyboard.down('s');await clear(page,['m3i-drone']);await page.keyboard.up('s');
   await to(page,380);await ground(page,320);await clear(page,['m3i-security']);await next(page,'M3J',552);await mark();
   await jump(page,130,216);await ground(page,320);await cross(page,'m3j-press-a',300);await clear(page,['m3j-ram']);await cross(page,'m3j-press-b',507);await next(page,'M3K',520);await mark();
  }
  await to(page,112);await ground(page,320);if((await state(page)).hp<(await state(page)).maxHp){await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();}
  await jump(page,226,332);await ground(page,320);await to(page,556);await page.keyboard.press('e');await next(page,'M3D');await mark();
  await jump(page,154,250);await ground(page,320);await counterRam(page,'m3d-ram');await to(page,380);await drone(page,'m3d-drone');await jump(page,490,568);await ground(page,320);
  await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().objective,null,'final terminal');await page.keyboard.up('e');await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().state==='complete',null,'Foundry result');await page.keyboard.up('d');
  const end=await state(page);measurements.push({room:activeRoom,active_seconds:end.activeSeconds-roomStart,hp_in:hpStart,hp_out:end.hp});
  expect(Object.values(end.roomStates).filter((r:any)=>r.visited)).toHaveLength(8);expect(end.campaign.result.result).toBe('victory');expect(end.campaign.run_stats.foundry_route).toBe(route);
  const report={status:'AUTOMATED_INPUT_ONLY',build:end.build,source_sha:end.sha,route,nodes:[],seed:4,active_seconds:end.activeSeconds,wall_seconds:(Date.now()-started)/1000,hp:end.hp,rooms:measurements,hits:end.eventLog.filter((e:any)=>e.name==='hit_received'),human_duration_target_verified:false};
  console.log('Foundry route report',JSON.stringify(report));await writeFile(info.outputPath('foundry-route.json'),JSON.stringify(report,null,2));await page.screenshot({path:info.outputPath('foundry-complete.png')});
 }catch(error){const s=await state(page);console.log('Foundry route failure',JSON.stringify({route,measurements,state:s.state,room:s.room,hp:s.hp,player:s.player,enemies:s.enemies,hazards:s.hazards,roomStates:s.roomStates}));await writeFile(info.outputPath('failure-state.json'),JSON.stringify(s,null,2));throw error;}
});
