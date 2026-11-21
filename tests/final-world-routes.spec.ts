import {encounter} from './encounter-helpers';
import {playSector,type RouteLoss} from './campaign-retry';
import {fireFromCover} from './defensive-fire';
import {campaignPressure,campaignVisits} from './campaign-pressure';
import {powerTarget,worldContext} from '../games/cinder-shift/src/session/world-runtime';
import {rooms} from '../games/cinder-shift/src/room-data';
import {newCampaignRegistry,isWorldMission} from '../games/cinder-shift/src/session/new-campaign-content';
import {test,expect,type Page} from '@playwright/test';
import {Campaign,newCampaign,contentVersion} from '../games/cinder-shift/src/session/campaign';
import {missionIds} from '../games/cinder-shift/src/session/missions';
import {clearLine,expand,intersects} from '../games/cinder-shift/src/geometry';
import {state} from './helpers';
import {writeFile} from 'node:fs/promises';
import {standingJump,ground,jump,to,clear} from './route-helpers';
import {standingLaneClear,standingHalfWidth,contextCandidates} from './world-route-clearance';

// The unlock is a labelled legacy fixture; every action inside C02/C03 uses ordinary input.
async function unlocked(page:Page){
 // Seed IndexedDB at this origin before the game's first boot, so a fresh
 // profile checkpoint cannot overwrite the unlock while the page reloads.
 await page.goto('/games/cinder-shift/build-manifest.json');const c=new Campaign(newCampaign(4));
 for(const id of missionIds){c.prepare();c.begin();c.applyResult({attempt_id:'legacy-'+id,mission_id:id,result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:1,screen_ms:0,nodes:[]});c.advance();}
 const record={schema_version:1,content_version:contentVersion,game_id:'r01',build_id:'legacy-completion-fixture',saved_at:new Date().toISOString(),campaign:c.snapshot()};
 await page.evaluate(record=>new Promise<void>((resolve,reject)=>{const r=indexedDB.open('cinder-shift-r01',1);r.onerror=()=>reject(r.error);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>{const db=r.result,tx=db.transaction('records','readwrite');tx.objectStore('records').put(record,'campaign');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};}),record);
 await page.goto('/games/cinder-shift/?seed=4');
 const notes=page.getByTestId('notes-close'),resume=page.getByTestId('continue');
 await expect(notes.or(resume).first()).toBeVisible();
 if(await notes.isVisible())await notes.click();
 await expect(resume).toBeVisible();
}
function routePulse(s:any){
 const pulse=rooms[s.room as keyof typeof rooms].world?.pulse;
 if(!pulse||s.world.phase>=(pulse.untilPhase??Infinity))return;
 if(pulse.fromPhase!==undefined&&(s.world.pulseStartedAt==null||s.world.phase<pulse.fromPhase))return;
 return pulse;
}
async function walk(page:Page,target:number,{exitFrom,enemyId,pickup}:{exitFrom?:string;enemyId?:string;pickup?:boolean}={}){
 const origin=exitFrom??(await state(page)).room;let previous=NaN;for(let n=0;n<120;n++){
  const s=await state(page);
  if(pickup&&s.state==='playing'&&s.room===origin&&s.player.vy===0){
   const canPickup=(snapshot:typeof s)=>worldContext(rooms[snapshot.room as keyof typeof rooms].world!,
    snapshot.world,{x:snapshot.player.x,y:snapshot.player.y+22},snapshot.simMs,snapshot.hp<snapshot.maxHp)==='pickup';
   if(canPickup(s)){
    await Promise.all(['a','d','s','Space'].map(key=>page.keyboard.up(key)));
    await ground(page);
    if(canPickup(await state(page)))return;
   }
  }
  if(enemyId&&s.state==='playing'&&s.room===origin&&s.enemies.find((e:any)=>e.id===enemyId)?.hp<=0){
   await Promise.all(['a','d','s','Space'].map(key=>page.keyboard.up(key)));
   await ground(page);
   return;
  }
  if(exitFrom&&s.state==='transition'){
   await page.waitForFunction(origin=>{const s=(window as any).__CINDER__();return s.state==='complete'||s.state==='playing'&&s.room!==origin;},origin);
  }
  if(exitFrom&&(s.state==='transition'||s.state==='complete'||s.room!==origin)){await page.keyboard.up('a');await page.keyboard.up('d');await page.keyboard.up('s');await page.keyboard.up('Space');return;}if(s.state!=='playing'||s.room!==origin)throw Error('walk interrupted '+JSON.stringify(s));const p=s.player;if(Math.abs(p.x-target)<5){await page.keyboard.up('a');await page.keyboard.up('d');await page.keyboard.up('s');await page.keyboard.up('Space');await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return Math.abs(p.vx)<1&&p.vy===0;});
   // Releasing direction mid-jump still carries horizontal momentum until the
   // next ticks. Validate the landing, rather than accepting the airborne x.
   if(Math.abs((await state(page)).player.x-target)<7)return;
   previous=NaN;continue;
  }
  if(exitFrom&&s.exitOpen&&p.x>=584&&p.vy===0){await Promise.all([page.keyboard.up('a'),page.keyboard.up('d'),page.keyboard.up('s'),page.keyboard.up('Space')]);return;}
  const f=target>p.x?1:-1,dir=f>0?'d':'a';
  const pulse=routePulse(s),feetNow=p.y+22;
  if(pulse&&feetNow>274){const approaching=f>0?p.x<pulse.x-12&&pulse.x-p.x<60:p.x>pulse.x+pulse.width+12&&p.x-pulse.x-pulse.width<60;const crossing=(pulse.width+64)/115*1000+250,phase=(s.worldPulseElapsed??s.simMs)%pulse.cycle;
   if(approaching&&(phase<pulse.warning+pulse.active||phase>pulse.cycle-crossing)){
    await Promise.all([page.keyboard.up('a'),page.keyboard.up('d')]);
    await page.waitForFunction(({cycle,start,end})=>{
     const s=(window as any).__CINDER__(),elapsed=(s.worldPulseElapsed??s.simMs)%cycle;
     return s.hp<=0||elapsed>=start&&elapsed<=end;
    },{cycle:pulse.cycle,start:pulse.warning+pulse.active,end:pulse.cycle-crossing});
    expect((await state(page)).hp,'waiting for pulse in '+origin).toBeGreaterThan(0);
    continue;
   }
  }
  const feet=p.y+22;
  const head=s.solids.some((r:any)=>r.y<feet-40&&r.y+r.height>feet-44&&r.y+r.height<=feet-26&&r.x<p.x+f*24+12&&r.x+r.width>p.x+f*24-12);
  // A shelf whose underside is below the crouched head blocks the approach too.
  // The old 20px test missed YU04-C's 288..300 entry ledge, selected precision
  // crouching, and then tried to jump while crouch was held forever.
  // A crate beyond the requested contact must not trigger a jump at the switch.
  const probe=p.x+f*Math.min(32,Math.abs(target-p.x));
  const obstacle=s.solids.some((r:any)=>r.y<feet&&r.y+r.height>feet-26&&r.x<probe+12&&r.x+r.width>probe-12);
  const precise=p.vy===0&&!obstacle&&Math.abs(target-p.x)<40;
  await Promise.all([page.keyboard.up(f>0?'a':'d'),page.keyboard.down(dir),head||precise?page.keyboard.down('s'):page.keyboard.up('s')]);
  if(precise&&!enemyId&&!exitFrom&&!s.enemies.some((enemy:any)=>enemy.hp>0&&enemy.active)){
   // Release before querying the whole room again. At low frame rates a
   // held direction could carry Mira back and forth across a valid contact.
   const duration=Math.min(150,Math.max(40,(Math.abs(target-p.x)-4)/58*1000));
   await page.waitForTimeout(duration);await page.keyboard.up(dir);
   await ground(page);previous=NaN;
   continue;
  }
  if(!head&&p.vy===0&&(obstacle||Math.abs(p.x-previous)<1)){await page.keyboard.down('Space');await page.waitForTimeout(180);await page.keyboard.up('Space');}
  previous=p.x;await page.waitForTimeout(Math.abs(target-p.x)<48?20:80);
  // Releasing the key before the snapshot prevents a long pickup approach
  // from carrying Mira through a cleared doorway while the browser responds.
  if(pickup)await page.keyboard.up(dir);
 }throw Error('walk blocked '+target+' '+JSON.stringify(await state(page)));
}
async function face(page:Page,direction:number){
 const key=direction>0?'d':'a';
 await page.keyboard.up(direction>0?'a':'d');
 await page.keyboard.down(key);
 try{
  await page.waitForFunction(direction=>{
   const s=(window as any).__CINDER__();
   return s.hp<=0||s.player.facing===direction;
  },direction);
 }finally{await page.keyboard.up(key);}
 await page.waitForFunction(()=>{
  const s=(window as any).__CINDER__();
  return s.hp<=0||Math.abs(s.player.vx)<1&&s.player.vy===0;
 });
 const end=await state(page);
 expect(end.hp,'turning in '+end.room).toBeGreaterThan(0);
 expect(end.player.facing).toBe(direction);
}
function contextPoint(s:any,action:'pickup'|'switch'|'activate'|'repair',point:{x:number;y:number}){
 const spec=rooms[s.room as keyof typeof rooms].world!,y=point.y;
 const x=contextCandidates(point.x).find(x=>x>32&&x<610
  &&s.solids.some((r:any)=>Math.abs(r.y-y)<1&&x-standingHalfWidth>=r.x&&x+standingHalfWidth<=r.x+r.width)
  &&standingLaneClear(s.solids,x,y)
  // Plan the standing point separately from waiting for the actual safe phase.
  &&worldContext({...spec,pulse:undefined},s.world,{x,y},s.simMs,s.hp<s.maxHp)===action);
 if(x===undefined)throw Error('no '+action+' standing point '+JSON.stringify({room:s.room,point,player:s.player,world:s.world}));return x;
}
async function standAtHeight(page:Page,point:{x:number;y:number},enemyId?:string){
 const x=point.x;await walk(page,x,{enemyId});
 if(enemyId&&(await state(page)).enemies.find((e:any)=>e.id===enemyId)?.hp<=0)return;
 const landed=await state(page),feet=landed.player.y+22;
 if(feet<point.y-2){
  // Reaching the right x on an optional upper shelf is not reaching its ground target.
  // Walk around a real edge, descend through clear space, then return below it.
  const drops=Array.from({length:139},(_,i)=>40+i*4).filter(at=>at<=600
   &&landed.solids.some((r:any)=>Math.abs(r.y-point.y)<1&&at-20>=r.x&&at+20<=r.x+r.width)
   // Descend on the target side of ground walls; walking back across one
   // would jump onto the shelf again instead of returning underneath it.
   &&!landed.solids.some((r:any)=>intersects({x:Math.min(at,x)-11,y:point.y-44,width:Math.abs(at-x)+22,height:44},r))
   &&!landed.solids.some((r:any)=>r.y>=feet-1&&r.y<point.y&&r.x<at+20&&r.x+r.width>at-20))
   .sort((a,b)=>Math.abs(a-landed.player.x)+Math.abs(a-x)/4-Math.abs(b-landed.player.x)-Math.abs(b-x)/4);
  if(!drops.length)throw Error('no physical descent to target '+JSON.stringify({room:landed.room,point,player:landed.player}));
  await walk(page,drops[0]);await walk(page,x);
 }
 const actual=await state(page);expect(Math.abs(actual.player.y+22-point.y),'actual standing height '+JSON.stringify({room:actual.room,target:point,player:actual.player})).toBeLessThan(2);
}
async function approachContext(page:Page,action:'switch'|'activate',point:{x:number;y:number}){
 // This contact now sits on a working bridge above a crouchable underpass.
 // Follow its visible entry ledge; horizontal walking alone stays below it.
 const entry=await state(page);
 if(entry.room==='YU05-A'&&point.x===112&&entry.player.x<90){
  // The first radio switch sits beside a 20px book. Mira can operate it
  // standing on the book, within the switch's normal interaction reach.
  await jump(page,66,104);await ground(page,300);
  const at=await state(page);
  expect(worldContext(rooms['YU05-A'].world!,at.world,{x:at.player.x,y:at.player.y+22},at.simMs)).toBe(action);
  return;
 }
 if(entry.room==='YU01-B'&&point.y===280&&entry.player.y+22>282){
  await walk(page,196);await ground(page,288);await standingJump(page,284);await ground(page,280);
 }
 if(entry.room==='YU01-B'&&entry.world.power.circuit==='A'&&point.x>456&&entry.player.x<416){
  // The lower aperture is only a firing slit. Climb the two powered stairs
  // from the entry crate before crossing the housing to the far contact.
  await walk(page,196);await ground(page,288);
  await standingJump(page,272);await ground(page,288);
  await standingJump(page,352);await ground(page,256);
  await standingJump(page,432);await ground(page,280);
 }
 if(entry.room==='YU02-B'&&point.y===276&&entry.player.y+22>278){
  await walk(page,204);await ground(page,288);await standingJump(page,328);await ground(page,276);
 }
 if(entry.room==='YU02-D'&&point.y===288&&entry.player.y+22>290){
  if(entry.player.x>296){await walk(page,316);await ground(page,320);}
  else{await walk(page,176);await ground(page,288);}
  await standingJump(page,264);await ground(page,288);
 }
 if(entry.room==='YU04-B'&&point.y===280&&entry.player.y+22>282){
  await walk(page,196);await ground(page,288);await standingJump(page,300);await ground(page,280);
 }
 if(entry.room==='YU04-C'&&point.y===244&&entry.player.y+22>246){
  await walk(page,264);await ground(page,288);await standingJump(page,340);await ground(page,244);
 }
 if(entry.room==='YU04-D'&&point.y===288&&entry.player.y+22>290){
  await walk(page,184);await ground(page,288);await standingJump(page,256);await ground(page,288);
 }
 if(entry.room==='YU05-D'&&action==='activate'&&entry.world.phase===1){
  // The first feed arms the real warning. Read the pulse from the marked
  // canopy, then leave shelter only while the second contact's window is open.
  await walk(page,348);
  await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.worldPulse==='safe'&&6000-s.worldPulseElapsed%6000>1200;});
 }
 const x=contextPoint(await state(page),action,point);await standAtHeight(page,{x,y:point.y});
}
async function combat(page:Page){
 const entry=await state(page);
 if(entry.room==='SW02-A'){
  // From the gap between the keys, standing shots clear the low housing.
  // The guard fires horizontally at head height. Duck until its bolt passes.
  await page.keyboard.down('j');await walk(page,360);await ground(page,320);
  await face(page,1);await page.keyboard.down('j');
  try{
   await expect.poll(async()=>{
    const s=await state(page);
    expect(s.hp,'keyboard quarter firing lane').toBeGreaterThan(0);
    const bolt=s.projectiles.some((p:any)=>p.team==='enemy'&&p.vx<0&&p.x>s.player.x-16&&p.x<s.player.x+112);
    if(bolt)await page.keyboard.down('s');else await page.keyboard.up('s');
    return s.enemies.every((e:any)=>e.hp<=0)&&!s.projectiles.some((p:any)=>p.team==='enemy'&&p.x>s.player.x-16);
   },{intervals:[35],timeout:20000}).toBe(true);
  }finally{await page.keyboard.up('s');await page.keyboard.up('j');}
  return;
 }
 if(entry.room==='YU03-C'){
  // Use the rear repair pocket and face the firing squad from outside the patrol.
  await page.keyboard.down('j');await walk(page,310);await ground(page,288);
  await to(page,329);await ground(page,288);await standingJump(page,405);
  await to(page,585);await ground(page,320);
  const pocket=await state(page),spec=rooms['YU03-C'].world!;
  if(worldContext(spec,pocket.world,{x:pocket.player.x,y:320},pocket.simMs,pocket.hp<pocket.maxHp)==='repair'){
   await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.repaired).toBe(true);
  }
  await face(page,-1);await page.keyboard.down('s');
  await fireFromCover(page,['yu03c-drone','yu03c-track'],'crouch');await page.keyboard.up('s');return;
 }
 if(entry.room==='YU04-A'){
  // Cross the factory gantry and drop at its far edge, then fire back
  // beneath the platform instead of trying to descend between two ledges.
  await page.keyboard.down('j');await walk(page,554);await ground(page,320);
  await face(page,-1);await fireFromCover(page,['yu04a-factory','yu04a-gantry']);return;
 }
 if(entry.room==='YU02-C'){
  // Use the quay steps to cross the water above the arc of the ground fire.
  await page.keyboard.down('j');await jump(page,103,145);await ground(page,288);
  await standingJump(page,200);await ground(page,248);
  await to(page,248);await ground(page,248);await standingJump(page,342);await ground(page,288);
  await to(page,355);await ground(page,288);await standingJump(page,425);await ground(page,320);
  await fireFromCover(page,['yu02c-drone']);await face(page,-1);
  await page.keyboard.down('s');await fireFromCover(page,['yu02c-quay'],'crouch');
  await page.keyboard.up('s');return;
 }
 if(entry.room==='YU01-D'){
  await clear(page,['yu01d-relay']);
  await page.waitForFunction(()=>{
   const s=(window as any).__CINDER__();
   const incoming=s.projectiles.filter((p:any)=>p.team==='enemy'&&p.vx<0);
   return s.hp<=0||!incoming.length||incoming.some((p:any)=>p.x>s.player.x&&p.x-s.player.x<70);
  });
  await page.keyboard.down('j');
  const start=(await state(page)).simMs;
  await Promise.all([page.keyboard.down('Space'),page.keyboard.down('d')]);
  // Knockback can leave Mira on the floor against the left edge of the footing.
  // Recognise that landing and jump again from the edge using the normal controls.
  await page.waitForFunction(start=>{
   const s=(window as any).__CINDER__(),p=s.player;
   return s.hp<=0||p.x>=180||(s.simMs-start>900&&p.vy===0&&p.y+22>=319&&p.x>=155);
  },start,{timeout:8000});
  await Promise.all([page.keyboard.up('d'),page.keyboard.up('Space')]);
  await ground(page);
  const landing=await state(page);
  expect(landing.hp,'transmitter footing').toBeGreaterThan(0);
  if(landing.player.y+22>302)await standingJump(page,180);
  await ground(page,300);
  // Let the tracking bolts pass under the footing before dropping into the patrol lane.
  await page.waitForFunction(()=>{
   const s=(window as any).__CINDER__();
   return s.hp<=0||!s.projectiles.some((p:any)=>p.source==='induction-orb-shot'&&p.vx<0&&p.x>s.player.x-20);
  });
  await to(page,230);await ground(page,320);
  await fireFromCover(page,['yu01d-feed','yu01d-relief']);return;
 }
 if(entry.room==='YU01-C'){
  await jump(page,100,148);await ground(page,264);
  await to(page,201);await ground(page,320);
  await jump(page,312,363);await ground(page,288);await page.keyboard.down('s');
  await page.waitForFunction(()=>{const e=(window as any).__CINDER__().enemies.find((e:any)=>e.id==='yu01c-anomaly');return e.aimLocked&&e.aim.y<=275;},undefined,{timeout:8000});
  await page.keyboard.down('j');
  await to(page,391);await ground(page,320);
  await clear(page,['yu01c-anomaly']);
  await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.hp<=0||!s.projectiles.some((p:any)=>p.team==='enemy'&&p.vx<0&&p.x>s.player.x-20);});
  await page.keyboard.up('s');return;
 }
 if(entry.room==='SW05-A'){
  // Draw the rotor's fan toward the lectern, then drop to the floor behind it.
  await jump(page,66,102);await ground(page,300);
  await standingJump(page,188);await ground(page,280);
  await page.waitForFunction(()=>{
   const s=(window as any).__CINDER__();
   return s.hp<=0||s.projectiles.some((p:any)=>p.source==='lint-rotor-shot'&&p.vx<0);
  },undefined,{timeout:6500});
  await page.keyboard.down('j');await to(page,236);
  await page.keyboard.down('s');await ground(page,320);
  await fireFromCover(page,['sw05a-books'],'crouch');await page.keyboard.up('s');
  await page.waitForFunction(()=>!(window as any).__CINDER__().player.crouching);
  await fireFromCover(page,['sw05a-spine']);return;
 }
 if(entry.room==='SW05-B'){
  // Use the low lane under the reserve rotor to clear the patrol behind it.
  await page.keyboard.down('j');await jump(page,267,349);
  await page.keyboard.down('s');await ground(page,320);
  await fireFromCover(page,['sw05b-service'],'crouch');
  await page.keyboard.up('s');
  await page.waitForFunction(()=>!(window as any).__CINDER__().player.crouching);
  await fireFromCover(page,['sw05b-router']);return;
 }
 if(entry.room==='SW04-D'){
  await page.keyboard.down('j');await jump(page,116,208);await ground(page,320);
  await fireFromCover(page,['sw04d-vane']);
  // Cross the vane base during the clear interval. The patrol guards the far side.
  await jump(page,418,465);await ground(page,288);
  await page.waitForFunction(()=>{
   const s=(window as any).__CINDER__(),phase=s.worldPulseElapsed%5000;
   return s.hp<=0||phase>=2300&&phase<3500;
  });
  await page.keyboard.down('j');await standingJump(page,585);await ground(page,320);
  await face(page,-1);await page.keyboard.down('s');
  await fireFromCover(page,['sw04d-tail'],'crouch');await page.keyboard.up('s');return;
 }
 if(entry.room==='SW04-B'){
  await page.keyboard.down('s');await fireFromCover(page,['sw04b-rail'],'crouch');
  // Crawl underneath the drying rack. Its 28px ground clearance lets
  // Mira reach the open firing lane even when the wind pushes against her.
  await to(page,519);await ground(page,320);await page.keyboard.up('s');
  await page.waitForFunction(()=>!(window as any).__CINDER__().player.crouching);
  await fireFromCover(page,['sw04b-cloth']);return;
 }
 if(entry.room==='SW04-A'){
  await page.keyboard.down('j');await jump(page,119,231);
  await page.keyboard.down('s');await ground(page,320);
  // The low shot passes under the rotor to the ground patrol behind it.
  await fireFromCover(page,['sw04a-pot'],'crouch');
  await page.keyboard.up('s');
  await page.waitForFunction(()=>!(window as any).__CINDER__().player.crouching);
  await fireFromCover(page,['sw04a-garden']);return;
 }
 if(entry.room==='SW02-D'){
  // Cross the keyboard housing once. The guard and its relief turret share
  // a ground lane; moving to aim again exposes Mira to the guard's last burst.
  await page.keyboard.down('j');
  await jump(page,124,215);
  await page.keyboard.down('s');
  await ground(page,320);
  try{await fireFromCover(page,['sw02d-lamp','sw02d-turret']);}
  finally{await page.keyboard.up('s');}
  return;
 }
 for(let n=0;n<12;n++){
  const s=await state(page),alive=s.enemies.filter((e:any)=>e.hp>0);
  if(!alive.length){
   // A target may die during the approach before its tracking volley arrives.
   // Hold the firing position until the remaining shots pass or can be dodged.
   if(s.projectiles.some((p:any)=>p.team==='enemy'))await fireFromCover(page,[]);
   return;
  }
  const en=alive.filter((e:any)=>!e.afterEnemy||!alive.some((lead:any)=>lead.id===e.afterEnemy)).sort((a:any,b:any)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];
  if(!en)throw Error('Cyclic reinforcement dependency in '+s.room);
  const pulse=routePulse(s);
  const fallback=Array.from({length:69},(_,i)=>48+i*8).sort((a,b)=>Math.abs(Math.abs(a-en.x)-90)-Math.abs(Math.abs(b-en.x)-90));
  const blocked=s.solids.filter((r:any)=>r.y<320&&r.y+r.height>276).map((r:any)=>[r.x,r.x+r.width]).sort((a:number[],b:number[])=>a[0]-b[0]);
  const gapCenters:number[]=[];let edge=24;for(const [left,right]of blocked){if(left-edge>=40)gapCenters.push((edge+left)/2);edge=Math.max(edge,right);}if(616-edge>=40)gapCenters.push((edge+616)/2);
  const candidates=[s.player.x,...gapCenters,en.x-90,en.x+90,en.x-120,en.x+120,en.x-60,en.x+60,...fallback].filter(x=>x>40&&x<600&&Math.abs(x-en.x)>=(en.kind==='turret'?64:40)&&(!pulse||x+20<pulse.x||x-20>pulse.x+pulse.width)&&standingLaneClear(s.solids,x)).sort((a,b)=>Math.abs(a-s.player.x)-Math.abs(b-s.player.x));
  // The cutter fires horizontally. A diagonal visibility ray to the enemy's centre
  // can pass under a shelf that actually stops every standing shot.
  const walls=s.solids.map((rect:any)=>expand(rect,4,1.5));
  const lane=candidates.flatMap(x=>(en.kind==='drone'?[292]:[305,292]).map(y=>({x,y})))
   .find(({x,y})=>clearLine({x:x+Math.sign(en.x-x)*19,y},{x:en.x,y},walls));
  if(!lane)throw Error('no baseline firing lane '+JSON.stringify(s));
  const at=lane.x;
  // Fire while approaching cover, especially when a switchback crosses a patrol.
  await page.keyboard.down('j');
  await standAtHeight(page,{x:at,y:320},en.id);
  if((await state(page)).enemies.find((e:any)=>e.id===en.id)?.hp<=0){await page.keyboard.up('j');continue;}
  await face(page,en.x>at?1:-1);if(lane.y===305){await page.keyboard.down('s');await page.waitForFunction(()=>(window as any).__CINDER__().player.crouching);}await page.keyboard.down('j');
  try{await fireFromCover(page,[en.id]);}finally{await page.keyboard.up('s');}
 }
}
async function solveRoom(page:Page){
 let s=await state(page);
 if(s.room==='YU01-C'){
  // The parapet slit covers the near orb while the A shutter screens the patrol.
  await page.keyboard.down('j');await to(page,94);await ground(page,320);
  await clear(page,['yu01c-aerial']);
  const after=await state(page);
  if(after.projectiles.some((p:any)=>p.team==='enemy'&&p.vx<0&&p.x>after.player.x)){
   await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.hp<=0||s.projectiles.some((p:any)=>p.team==='enemy'&&p.vx<0&&p.x-s.player.x>0&&p.x-s.player.x<68);});
   await standingJump(page,151);await ground(page,264);
   await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return !s.projectiles.some((p:any)=>p.team==='enemy'&&p.vx<0&&p.x>s.player.x-20);});
   await to(page,98);await ground(page,320);
  }
  s=await state(page);
 }
 if(s.room==='YU01-D')await page.keyboard.down('j');
 const entrance=rooms[s.room as keyof typeof rooms].world!;
 if(s.world.power&&entrance.switches?.length&&entrance.sequence?.[0]!==s.world.power.circuit){
  const first=entrance.switches[0];
  await approachContext(page,'switch',first);await page.keyboard.press('e');
  await expect.poll(async()=>(await state(page)).world.power.circuit).toBe(entrance.sequence?.[0]);
 }
 await combat(page);s=await state(page);
 if(s.world.carry){for(let n=0;n<12;n++){
  s=await state(page);const contact=s.world.carry.contacts.find((c:any)=>!c.active);if(!contact)break;
  const spec=rooms[s.room as keyof typeof rooms].world!,pickup=contextPoint(s,'pickup',{x:s.world.carry.item.position.x,y:320});
  await walk(page,pickup,{pickup:true});await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');const ground=(await state(page)).solids,pulse=spec.pulse;const launch=[contact.rect.x-52,contact.rect.x+52,contact.rect.x-92,contact.rect.x+92].find(x=>x>32&&x<610&&(!pulse||x+16<pulse.x||x-16>pulse.x+pulse.width)&&!ground.some((r:any)=>r.y<320&&r.y+r.height>276&&r.x<x+20&&r.x+r.width>x-20));if(launch===undefined)throw Error('no grounded throw lane '+contact.id);await walk(page,launch);await face(page,launch<contact.rect.x?1:-1);if((await state(page)).world.carry.item.state!=='held')continue;
  const flightMs=Math.abs(contact.rect.x-launch)/220*1000+220;
  await page.waitForFunction(({pulse,flightMs})=>{const s=(window as any).__CINDER__();return s.world.carry.contacts.find((c:any)=>!c.active)?.open&&(!pulse||pulse.cycle-s.simMs%pulse.cycle>flightMs);},{pulse,flightMs});if((await state(page)).world.carry.item.state!=='held')continue;await page.keyboard.press('e');
  await expect.poll(async()=>(await state(page)).world.carry.item.state).not.toBe('held');await page.waitForFunction(()=>(window as any).__CINDER__().world.carry.item.state!=='thrown');
 }await expect.poll(async()=>(await state(page)).world.carry.contacts.every((c:any)=>c.active)).toBe(true);}
 s=await state(page);if(s.world.power){
  // The fixed contact markers are the same visible one/two-lamp goals as the HUD.
  const sequences:Record<string,string[]>={'A':['B'],'B':['B','A'],'C':['B'],'D':['B','A','B']};const room=s.room;let sequence=sequences[room.at(-1)];if(room==='YU04-C')sequence=['B','A'];if(room==='YU05-C')sequence=['B','A','B'];
  for(let phase=s.world.phase;phase<sequence.length;phase++){
   s=await state(page);if(s.world.power.circuit!==sequence[phase]){
    const switches=rooms[s.room as keyof typeof rooms].world!.switches!;
    const point=[...switches].sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];
    await approachContext(page,'switch',point);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe(sequence[phase]);
   }
   const current=await state(page),target=powerTarget(rooms[current.room as keyof typeof rooms].world!,current.world);if(!target)throw Error('missing visible power contact');
   if(room==='YU01-D'&&phase===2){
    // The last transmission contact is inside the pulse. Read the warning at
    // the left marker, trigger the contact in passing and finish in shelter.
    await walk(page,460);
    await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.worldPulse==='safe'&&5200-s.worldPulseElapsed%5200>1900;});
    await page.keyboard.down('d');
    try{
     await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.player.x>=540&&s.worldPulse==='safe';});
     await page.keyboard.press('e');
     await page.waitForFunction(()=>(window as any).__CINDER__().player.x>=585);
    }finally{await page.keyboard.up('d');}
    await expect.poll(async()=>(await state(page)).world.phase).toBe(phase+1);
    continue;
   }
   // Reuse the local switch on the current side of an A wall. Returning to the
   // entrance switch can close the route before reaching the next contact.
   await approachContext(page,'activate',target);const pulse=rooms[current.room as keyof typeof rooms].world!.pulse;
   await page.waitForFunction(pulse=>{const s=(window as any).__CINDER__();return s.worldPulse==='safe'&&(!pulse||pulse.cycle-(s.worldPulseElapsed??s.simMs)%pulse.cycle>600);},pulse);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(phase+1);
  }
 }
 s=await state(page);if(s.room.endsWith('-D')){await walk(page,584);await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);await page.keyboard.up('e');}
 s=await state(page);const repair=rooms[s.room as keyof typeof rooms].world?.repair;if(repair&&s.hp<s.maxHp&&!s.world.repaired){await walk(page,contextPoint(s,'repair',repair));await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.repaired).toBe(true);}
 const before=s.room;
 await walk(page,600,{exitFrom:before});
 s=await state(page);
 if(s.state==='complete')return;
 if(s.room===before&&s.state==='playing'){
  await page.keyboard.down('d');
  try {await page.waitForFunction(before=>{const s=(window as any).__CINDER__();return s.room!==before||s.state!=='playing';},before);}
  finally {await page.keyboard.up('d');}
 }
 // The room id changes before the destination scene finishes mounting.
 // Let the ordinary forward transition place Mira at the new left entrance.
 await page.waitForFunction(before=>{const s=(window as any).__CINDER__();return s.state==='complete'||
  s.state==='playing'&&s.room!==before&&s.player?.x<128&&s.player.vy===0;},before);

}
for(const world of ['c02-small-world','c03-adriatic-1986'])test(`real input full ${world}: 20 rooms, 5 missions, final fact and persisted result`,async({page},info)=>{
 // Allow five full sectors and their real retries on a hosted browser.
 // Individual movement, combat and interaction timeouts still identify stalls.
 test.setTimeout(25*60_000);
 page.setDefaultTimeout(15_000);page.setDefaultNavigationTimeout(30_000);
 await unlocked(page);await page.getByTestId('menu-campaigns').click();const difficulty=info.project.metadata.difficulty??'easy';await page.getByTestId('campaign-difficulty').selectOption(difficulty);await page.getByTestId('world-'+world).click();expect((await state(page)).campaign.difficulty).toBe(difficulty);const visited:string[]=[],losses:RouteLoss[]=[],pressure:ReturnType<typeof campaignPressure>=[];
 for(let mission=1;mission<=5;mission++){
  await page.getByTestId('map-prepare').click();await page.getByTestId('briefing').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');
  await playSector(page,info,losses,async()=>{
  for(let room=0;room<4;room++){
   await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.state==='playing'&&s.player?.vy===0;});const before=await state(page);visited.push(before.room);try{await solveRoom(page);}catch(error){const failed=await state(page);console.error('ROUTE_FAILURE '+JSON.stringify({visited,room:failed.room,state:failed.state,player:failed.player,hp:failed.hp,world:failed.world,solids:failed.solids,enemies:failed.enemies}));await info.attach('route-failure.json',{body:JSON.stringify(await state(page),null,2),contentType:'application/json'});throw error;}
  }
  });
  const cleared=await state(page),result=cleared.campaign.result,sectorPressure=campaignPressure(cleared.roomStates);
  expect(result.reason).toBe('objective_complete');
  expect(result.score_breakdown.rooms).toBe(400);
  expect(result.score_breakdown.combat).toBeGreaterThan(0);
  expect(result.score_breakdown.extraction).toBeGreaterThanOrEqual(1000);
  pressure.push(...sectorPressure);
  await writeFile(info.outputPath('sector-'+result.mission_id+'.json'),JSON.stringify({difficulty,seed:4,source_sha:cleared.sha,visits:campaignVisits(cleared),result,pressure:sectorPressure,losses:losses.filter(loss=>loss.mission===result.mission_id)},null,2));
  await expect(page.getByTestId('result-research')).toBeVisible();await page.getByTestId('result-research').click();
 }
 await expect.poll(async()=>(await state(page)).campaign.stage).toBe('campaign_complete');await expect(page.locator('.result-grid')).toContainText('5');const final=(await state(page)).campaign;expect(final.completed_missions).toHaveLength(5);expect(new Set(visited).size).toBe(20);expect(final.world_facts).toHaveLength(world==='c02-small-world'?3:5);await page.reload();await page.getByTestId('continue').click();expect((await state(page)).campaign).toEqual(final);
 // Body-only attachments are not retained by the CI list reporter on success.
 // Keep the actual result file in the directory uploaded by the workflow.
 const report=info.outputPath('input-route.json');await writeFile(report,JSON.stringify({source:'legacy C01 unlock fixture; all world input real',source_sha:(await state(page)).sha,difficulty,seed:4,visited,losses,pressure,final},null,2));await info.attach('input-route.json',{path:report,contentType:'application/json'});
});

// Diagnostic entries into individual rooms. These do not count as campaign completions.
for(const {mission_id:mission,room_id:room} of newCampaignRegistry.rooms){
 if(!isWorldMission(mission))throw Error('Unknown mission '+mission);
 test('focused room entry '+room,async({page},info)=>{
  test.skip(!process.env.CINDER_QA_HARNESS,'Requires isolated encounter fixture build');
  test.setTimeout(100000);
  const difficulty=info.project.metadata.difficulty??'easy';
  // Nightmare route evidence in the exchange records an entry with two HP.
  const hp=room==='SW03-C'||(['SW04-B','YU01-B','YU01-C','YU01-D'].includes(room)&&difficulty==='nightmare')?2:undefined;
  await encounter(page,{mission,room,difficulty,hp,seed:4});
  expect((await state(page)).campaign.difficulty).toBe(difficulty);
  if(hp!==undefined)expect((await state(page)).hp).toBe(hp);
  await solveRoom(page);
  const end=await state(page);
  expect(end.hp).toBeGreaterThan(0);
  if(room==='SW03-C'){
   expect(end.score).toBe(100);
   expect(end.roomStates[room].world.repaired).toBe(true);
   expect(end.hp).toBeGreaterThan(2);
  }else expect(end.score).toBeGreaterThan(100);
  if(room.endsWith('-D'))expect(end.state).toBe('complete');else expect(end.room).not.toBe(room);
  await writeFile(info.outputPath('focused-room.json'),JSON.stringify({
   fixture:'room entry '+room,source_sha:end.sha,seed:4,difficulty,
   hp_start:hp??end.maxHp,hp_end:end.hp,score:end.score,active_seconds:end.activeSeconds,
   route:campaignVisits(end),pressure:campaignPressure(end.roomStates).filter(r=>r.room===room),
  },null,2));
 });
}

for(const mission of new Set(newCampaignRegistry.rooms.map(room=>room.mission_id).filter(isWorldMission)))test('focused sector entry '+mission+' on stock equipment',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires isolated sector entry fixture');
 test.setTimeout(240_000);
 const difficulty=info.project.metadata.difficulty??'easy';
 await encounter(page,{mission,room:mission+'-A',difficulty,seed:4});
 for(const letter of ['A','B','C','D']){
  const room=mission+'-'+letter;
  await expect.poll(async()=>(await state(page)).room).toBe(room);
  await solveRoom(page);
 }
 const end=await state(page);
 expect(end.state).toBe('complete');
 expect(end.campaign.result.score_breakdown.rooms).toBe(400);
 await writeFile(info.outputPath('focused-sector.json'),JSON.stringify({
  fixture:'sector entry '+mission+'-A',source_sha:end.sha,seed:4,difficulty,
  result:end.campaign.result,visits:campaignVisits(end),pressure:campaignPressure(end.roomStates),
 },null,2));
});
