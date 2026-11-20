import {encounter} from './encounter-helpers';
import {playSector,type RouteLoss} from './campaign-retry';
import {fireFromCover} from './defensive-fire';
import {campaignPressure,campaignVisits} from './campaign-pressure';
import {powerTarget,worldContext} from '../games/cinder-shift/src/session/world-runtime';
import {rooms} from '../games/cinder-shift/src/room-data';
import {test,expect,type Page} from '@playwright/test';
import {Campaign,newCampaign,contentVersion} from '../games/cinder-shift/src/session/campaign';
import {missionIds} from '../games/cinder-shift/src/session/missions';
import {clearLine,expand,intersects} from '../games/cinder-shift/src/geometry';
import {state} from './helpers';
import {writeFile} from 'node:fs/promises';
import {standingJump,ground} from './route-helpers';
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
async function walk(page:Page,target:number,{exitFrom,enemyId}:{exitFrom?:string;enemyId?:string}={}){
 const origin=exitFrom??(await state(page)).room;let previous=NaN;for(let n=0;n<120;n++){
  const s=await state(page);
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
  const pulse=rooms[s.room as keyof typeof rooms].world?.pulse,feetNow=p.y+22;
  if(pulse&&feetNow>274&&(pulse.fromPhase===undefined||s.world.phase>=pulse.fromPhase)){const approaching=f>0?p.x<pulse.x-12&&pulse.x-p.x<60:p.x>pulse.x+pulse.width+12&&p.x-pulse.x-pulse.width<60;const crossing=(pulse.width+64)/115*1000+250,phase=(s.worldPulseElapsed??s.simMs)%pulse.cycle;
   if(approaching&&(phase<pulse.warning+pulse.active||phase>pulse.cycle-crossing)){await page.keyboard.up('a');await page.keyboard.up('d');await page.waitForFunction(({cycle,start,end})=>{const s=(window as any).__CINDER__(),p=(s.worldPulseElapsed??s.simMs)%cycle;return p>=start&&p<=end;},{cycle:pulse.cycle,start:pulse.warning+pulse.active,end:pulse.cycle-crossing});continue;}
  }
  const feet=p.y+22;
  const head=s.solids.some((r:any)=>r.y<feet-40&&r.y+r.height>feet-44&&r.y+r.height<=feet-26&&r.x<p.x+f*24+12&&r.x+r.width>p.x+f*24-12);
  // A shelf whose underside is below the crouched head blocks the approach too.
  // The old 20px test missed YU04-C's 288..300 entry ledge, selected precision
  // crouching, and then tried to jump while crouch was held forever.
  const obstacle=s.solids.some((r:any)=>r.y<feet&&r.y+r.height>feet-26&&r.x<p.x+f*32+12&&r.x+r.width>p.x+f*32-12);
  const precise=p.vy===0&&!obstacle&&Math.abs(target-p.x)<40;
  await Promise.all([page.keyboard.up(f>0?'a':'d'),page.keyboard.down(dir),head||precise?page.keyboard.down('s'):page.keyboard.up('s')]);
  if(!head&&p.vy===0&&(obstacle||Math.abs(p.x-previous)<1)){await page.keyboard.down('Space');await page.waitForTimeout(180);await page.keyboard.up('Space');}
  previous=p.x;await page.waitForTimeout(Math.abs(target-p.x)<48?20:80);
 }throw Error('walk blocked '+target+' '+JSON.stringify(await state(page)));
}
async function face(page:Page,f:number){const key=f>0?'d':'a';await page.keyboard.down(key);await page.waitForTimeout(70);await page.keyboard.up(key);await expect.poll(async()=>(await state(page)).player.facing).toBe(f);await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return Math.abs(p.vx)<1&&p.vy===0;});}
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
 if(entry.room==='YU01-B'&&point.y===280&&entry.player.y+22>282){
  await walk(page,196);await ground(page,288);await standingJump(page,284);await ground(page,280);
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
 for(let n=0;n<12;n++){
  const s=await state(page),alive=s.enemies.filter((e:any)=>e.hp>0);if(!alive.length)return;
  const en=alive.filter((e:any)=>!e.afterEnemy||!alive.some((lead:any)=>lead.id===e.afterEnemy)).sort((a:any,b:any)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];
  if(!en)throw Error('Cyclic reinforcement dependency in '+s.room);
  const pulse=rooms[s.room as keyof typeof rooms].world?.pulse;
  const fallback=Array.from({length:69},(_,i)=>48+i*8).sort((a,b)=>Math.abs(Math.abs(a-en.x)-90)-Math.abs(Math.abs(b-en.x)-90));
  const blocked=s.solids.filter((r:any)=>r.y<320&&r.y+r.height>276).map((r:any)=>[r.x,r.x+r.width]).sort((a:number[],b:number[])=>a[0]-b[0]);
  const gapCenters:number[]=[];let edge=24;for(const [left,right]of blocked){if(left-edge>=40)gapCenters.push((edge+left)/2);edge=Math.max(edge,right);}if(616-edge>=40)gapCenters.push((edge+616)/2);
  const candidates=[s.player.x,...gapCenters,en.x-90,en.x+90,en.x-120,en.x+120,en.x-60,en.x+60,...fallback].filter(x=>x>40&&x<600&&Math.abs(x-en.x)>=(en.kind==='turret'?64:40)&&(!pulse||x+20<pulse.x||x-20>pulse.x+pulse.width)&&standingLaneClear(s.solids,x)).sort((a,b)=>Math.abs(a-s.player.x)-Math.abs(b-s.player.x));
  // The cutter fires horizontally. A diagonal visibility ray to the enemy's centre
  // can pass under a shelf that actually stops every standing shot.
  const walls=s.solids.map((rect:any)=>expand(rect,4,1.5));
  const lane=candidates.flatMap(x=>(en.kind==='drone'?[292]:[292,305]).map(y=>({x,y})))
   .find(({x,y})=>clearLine({x:x+Math.sign(en.x-x)*19,y},{x:en.x,y},walls));
  if(!lane)throw Error('no baseline firing lane '+JSON.stringify(s));
  const at=lane.x;
  // Fire while approaching cover, especially when a switchback crosses a patrol.
  await page.keyboard.down('j');
  await standAtHeight(page,{x:at,y:320},en.id);
  if((await state(page)).enemies.find((e:any)=>e.id===en.id)?.hp<=0){await page.keyboard.up('j');continue;}
  await face(page,en.x>at?1:-1);if(lane.y===305)await page.keyboard.down('s');await page.keyboard.down('j');
  try{await fireFromCover(page,[en.id]);}finally{await page.keyboard.up('s');}
 }
}
async function solveRoom(page:Page){
 let s=await state(page);
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
  await walk(page,pickup);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');const ground=(await state(page)).solids,pulse=spec.pulse;const launch=[contact.rect.x-52,contact.rect.x+52,contact.rect.x-92,contact.rect.x+92].find(x=>x>32&&x<610&&(!pulse||x+16<pulse.x||x-16>pulse.x+pulse.width)&&!ground.some((r:any)=>r.y<320&&r.y+r.height>276&&r.x<x+20&&r.x+r.width>x-20));if(launch===undefined)throw Error('no grounded throw lane '+contact.id);await walk(page,launch);await face(page,launch<contact.rect.x?1:-1);if((await state(page)).world.carry.item.state!=='held')continue;
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
   // Reuse the local switch on the current side of an A wall. Returning to the
   // entrance switch can close the route before reaching the next contact.
   await approachContext(page,'activate',target);const pulse=rooms[current.room as keyof typeof rooms].world!.pulse;
   await page.waitForFunction(pulse=>{const s=(window as any).__CINDER__();return s.worldPulse==='safe'&&(!pulse||pulse.cycle-(s.worldPulseElapsed??s.simMs)%pulse.cycle>600);},pulse);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(phase+1);
  }
 }
 s=await state(page);if(s.room.endsWith('-D')){await walk(page,584);await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);await page.keyboard.up('e');}
 s=await state(page);const repair=rooms[s.room as keyof typeof rooms].world?.repair;if(repair&&s.hp<s.maxHp&&!s.world.repaired){await walk(page,contextPoint(s,'repair',repair));await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.repaired).toBe(true);}
 const before=s.room;await walk(page,600,{exitFrom:before});s=await state(page);if(s.state==='complete'||s.room!==before)return;await page.keyboard.down('d');await page.waitForFunction(before=>{const s=(window as any).__CINDER__();return s.room!==before||s.state==='complete';},before,{timeout:10000});await page.keyboard.up('d');
}
for(const world of ['c02-small-world','c03-adriatic-1986'])test(`real input full ${world}: 20 rooms, 5 missions, final fact and persisted result`,async({page},info)=>{
 // Allow five full sectors and their real retries on a hosted browser.
 // Individual movement, combat and interaction timeouts still identify stalls.
 test.setTimeout(25*60_000);await unlocked(page);await page.getByTestId('menu-campaigns').click();const difficulty=info.project.metadata.difficulty??'easy';await page.getByTestId('campaign-difficulty').selectOption(difficulty);await page.getByTestId('world-'+world).click();expect((await state(page)).campaign.difficulty).toBe(difficulty);const visited:string[]=[],losses:RouteLoss[]=[],pressure:ReturnType<typeof campaignPressure>=[];
 for(let mission=1;mission<=5;mission++){
  await page.getByTestId('map-prepare').click();await page.getByTestId('briefing').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');
  await playSector(page,info,losses,async()=>{
  for(let room=0;room<4;room++){
   await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.state==='playing'&&s.player?.vy===0;});const before=await state(page);visited.push(before.room);try{await solveRoom(page);}catch(error){const failed=await state(page);console.error('ROUTE_FAILURE '+JSON.stringify({visited,room:failed.room,state:failed.state,player:failed.player,hp:failed.hp,world:failed.world,solids:failed.solids,enemies:failed.enemies}));await info.attach('route-failure.json',{body:JSON.stringify(await state(page),null,2),contentType:'application/json'});throw error;}
  }
  });
  const cleared=await state(page),result=cleared.campaign.result,sectorPressure=campaignPressure(cleared.roomStates);
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
for(const [mission,room] of [['YU01','YU01-A'],['YU02','YU02-B'],['YU03','YU03-B'],['YU01','YU01-B'],['SW02','SW02-D']] as const){
 test('focused room entry '+room,async({page},info)=>{
  test.skip(!process.env.CINDER_QA_HARNESS,'Requires isolated encounter fixture build');
  test.setTimeout(100000);
  const difficulty=info.project.metadata.difficulty??'easy';
  // Nightmare route evidence in the exchange records an entry with two HP.
  const hp=room==='YU01-B'&&difficulty==='nightmare'?2:undefined;
  await encounter(page,{mission,room,difficulty,hp,seed:4});
  expect((await state(page)).campaign.difficulty).toBe(difficulty);
  if(hp!==undefined)expect((await state(page)).hp).toBe(hp);
  await solveRoom(page);
  const end=await state(page);
  expect(end.hp).toBeGreaterThan(0);expect(end.score).toBeGreaterThan(100);
  if(room.endsWith('-D'))expect(end.state).toBe('complete');else expect(end.room).not.toBe(room);
 });
}
