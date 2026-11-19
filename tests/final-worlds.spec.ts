import {test,expect,type Page} from '@playwright/test';
import {Campaign,newCampaign,newWorldCampaign,contentVersion} from '../games/cinder-shift/src/session/campaign';
import {missionIds,missions,missionChain} from '../games/cinder-shift/src/session/missions';
import {rooms} from '../games/cinder-shift/src/room-data';
import {newCampaignRegistry,newCampaignIds,newCampaignMissions,type WorldMissionId} from '../games/cinder-shift/src/session/new-campaign-content';
import {MissionAttempt} from '../games/cinder-shift/src/mission';
import {loadout} from '../games/cinder-shift/src/session/research';
import {createEnemy,enemyRect} from '../games/cinder-shift/src/enemies';
import {intersects} from '../games/cinder-shift/src/geometry';
import {createWorldState,actWorld,stepWorld,worldReady,worldContext,powerTarget,worldSolids,stepWorldEnvironment,worldPulse} from '../games/cinder-shift/src/session/world-runtime';
import {validateWorldSave,validateSave} from '../games/cinder-shift/src/session/save';
import {state} from './helpers';

function entry(id:WorldMissionId){return{mission_id:id,seed:4,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:[]};}
function baseCompleted(){const c=new Campaign(newCampaign(4));for(const id of missionIds){c.prepare();c.begin();c.applyResult({attempt_id:'fixture-'+id,mission_id:id,result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:1,screen_ms:0,nodes:[]});c.advance();}return{schema_version:1,content_version:contentVersion,game_id:'r01',build_id:'legacy-fixture',saved_at:new Date().toISOString(),campaign:c.snapshot()};}
async function put(page:Page,key:string,value:unknown){await page.evaluate(({key,value})=>new Promise<void>((resolve,reject)=>{const r=indexedDB.open('cinder-shift-r01',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('records','readwrite');tx.objectStore('records').put(value,key);tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};}),{key,value});}
async function ready(page:Page){await page.goto('/games/cinder-shift/');await expect(page.getByTestId('new-shift')).toBeVisible();}
async function unlockFixture(page:Page){await ready(page);await put(page,'campaign',baseCompleted());await page.reload();if(await page.getByTestId('notes-close').isVisible())await page.getByTestId('notes-close').click();await expect(page.getByTestId('continue')).toBeVisible();}
async function startWorld(page:Page,id:string){await unlockFixture(page);await page.getByTestId('menu-campaigns').click();await page.getByTestId('world-'+id).click();await page.getByTestId('map-prepare').click();await page.getByTestId('briefing').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');}
async function move(page:Page,x:number){const s=await state(page),direction=s.player.x<x?'d':'a';await page.keyboard.down(direction);await page.waitForFunction(({x,direction})=>{const s=(window as any).__CINDER__();return s.player&&(direction==='d'?s.player.x>=x:s.player.x<=x);},{x,direction},{timeout:8000});await page.keyboard.up(direction);await expect.poll(async()=>Math.abs((await state(page)).player.vx)).toBeLessThan(1);}
async function settle(page:Page){await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.player&&s.player.vy===0;});}

test('40 authored runtime rooms retain stable IDs, distinct geometry and complete mission chains',()=>{
 expect(newCampaignRegistry.rooms).toHaveLength(40);const geometries=new Set<string>();
 for(const design of newCampaignRegistry.rooms){const room=rooms[design.room_id as keyof typeof rooms];expect(room.id).toBe(design.room_id);expect(room.world).toBeTruthy();expect(room.nameKey).toBe('worlds.room.'+design.room_id);expect(room.solids[0]).toMatchObject({x:0,y:320,width:640});geometries.add(JSON.stringify(room.solids));}
 expect(geometries.size).toBeGreaterThanOrEqual(35);
 for(const id of newCampaignIds)for(const mission of newCampaignMissions[id]){expect(missions[mission as WorldMissionId].rooms).toHaveLength(4);expect(missionChain(mission as WorldMissionId)).toEqual(newCampaignMissions[id]);}
});
test('world enemy spawns clear fixed geometry and ground units rest on a surface',()=>{
 for(const design of newCampaignRegistry.rooms){const room=rooms[design.room_id as keyof typeof rooms];for(const definition of room.enemies){
  const enemy=createEnemy(definition);expect(room.solids.some(solid=>intersects(enemyRect(enemy),solid)),room.id+':'+enemy.id+' spawn overlap').toBe(false);
  if(enemy.kind!=='drone')expect(room.solids.some(solid=>Math.abs(solid.y-enemy.y-15)<1&&enemy.x>solid.x&&enemy.x<solid.x+solid.width),room.id+':'+enemy.id+' ground support').toBe(true);
 }}
});
for(const design of newCampaignRegistry.rooms)test(`model contract ${design.room_id}: reachable actions, bounded ledger and objective`,()=>{
 const room=rooms[design.room_id as keyof typeof rooms],spec=room.world!,s=createWorldState(room.id,spec);
 const tick=(x:number,now:number)=>{stepWorldEnvironment(spec,s,{x:x-11,y:276,width:22,height:44},320,now,[...room.solids,...worldSolids(spec,s)]);return stepWorld(spec,s,{x,y:320},1,now,16,[]);};
 if(s.carry){let now=3500;for(const target of spec.carry!.contacts){const c=s.carry.contacts.find(c=>c.id===target.id)!;const stageCover=spec.encounter?.stages.find(stage=>stage.contactId===target.id)?.cover,blockers=[...room.solids,...(stageCover?[stageCover]:[])];const x=[target.rect.x-54,target.rect.x+54].find(x=>blockers.every(r=>!intersects({x:x-11,y:276,width:22,height:44},r)))!;expect(x).toBeDefined();const facing=x<target.rect.x?1:-1; // Same swept flight as runtime; no direct activation.
   // Model time follows the authored warning/scan; contacts are never forced open.
   tick(x,now);for(let n=0;n<400&&!c.open;n++){now+=16;tick(x,now);}expect(c.open).toBe(true);
   s.carry.item.state='resting';s.carry.item.position={x,y:312};expect(actWorld(spec,s,{x,y:320},{x:x-11,y:276,width:22,height:44},facing,now)?.action).toBe('pickup');expect(actWorld(spec,s,{x,y:320},{x:x-11,y:276,width:22,height:44},facing,now)?.action).toBe('throw');
   for(let i=0;i<60&&!c.active;i++){now+=16;tick(x,now);}expect(c.active).toBe(true);
  }expect(new Set(s.carry.ledger).size).toBe(spec.carry!.contacts.length);}
 if(s.power){let now=3500;for(const [phase,wanted] of spec.sequence!.entries()){const switchPoint=spec.switches![0];if(s.power.circuit!==wanted)expect(actWorld(spec,s,switchPoint,{x:switchPoint.x-11,y:276,width:22,height:44},1,now)?.action).toBe('switch');const target=powerTarget(spec,s)!;for(let n=0;n<500&&worldPulse(spec,now,s)!=='safe';n++)now+=16;expect(worldPulse(spec,now,s)).toBe('safe');expect(actWorld(spec,s,target,{x:target.x-11,y:target.y-44,width:22,height:44},1,now)?.action).toBe('activate');}expect(s.ledger).toHaveLength(spec.sequence!.length);}
 expect(worldReady(spec,s)).toBe(true);const before=JSON.stringify(s.ledger);stepWorld(spec,s,{x:64,y:320},1,10000,16,[]);expect(JSON.stringify(s.ledger)).toBe(before);
});
for(const world of newCampaignIds)test(`${world}: isolated economy, entry, Retry and completed-save validation`,()=>{
 const c=new Campaign(newWorldCampaign(world,5)),first=newCampaignMissions[world][0] as WorldMissionId;c.data.mission_id=c.data.location_id=first;
 const envelope=()=>({schema_version:1,content_version:'worlds-rw3.1',game_id:world,build_id:'test',saved_at:new Date().toISOString(),campaign:c.snapshot()});
 expect(validateWorldSave(envelope(),world)).toBeNull();expect(validateSave(envelope())).toBe('corrupt');
 for(const id of newCampaignMissions[world]){const e=c.prepare();expect(e.mission_id).toBe(id);expect(e.event_plan).toEqual([]);expect(e.initial_hp).toBe(e.max_hp);c.begin();expect(validateWorldSave(envelope(),world)).toBeNull();const a=new MissionAttempt('mission',e),b=new MissionAttempt('mission',e);expect(b.entry).toEqual(a.entry);expect(b.current).toBe(id+'-A');c.applyResult({attempt_id:'model-'+id,mission_id:id as WorldMissionId,result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:2,screen_ms:0,nodes:[]});const points=c.data.points;expect(c.applyResult({attempt_id:'model-'+id,mission_id:id as WorldMissionId,result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:2,screen_ms:0,nodes:[]})).toBe(false);expect(c.data.points).toBe(points);c.advance();expect(validateWorldSave(envelope(),world)).toBeNull();}
 expect(c.data.stage).toBe('campaign_complete');expect(c.data.points).toBe(5);const wrong=envelope();wrong.campaign.location_id=world==='c02-small-world'?'YU01':'SW01';expect(validateWorldSave(wrong,world)).toBe('corrupt');
});

test('ordinary selector enforces locks and the same resolver rejects early entry',async({page})=>{
 await ready(page);await page.getByTestId('menu-campaigns').click();for(const id of newCampaignIds)await expect(page.getByTestId('world-'+id)).toBeDisabled();expect((await state(page)).activeWorld).toBe('r01');
});
test('ordinary SW01-A real input: carry, crouch, throw, physical contact and room transition',async({page},info)=>{
 await startWorld(page,'c02-small-world');await settle(page);await move(page,108);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');
 await page.keyboard.down('s');await move(page,270);await page.keyboard.up('s');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.contacts[0].active).toBe(true);await page.screenshot({path:info.outputPath('sw01-a-production.png')});
 await page.keyboard.down('d');await expect.poll(async()=>(await state(page)).room).toBe('SW01-B');await page.keyboard.up('d');await expect.poll(async()=>(await state(page)).state).toBe('playing');await page.keyboard.press('Escape');await page.getByTestId('pause-menu').click();await page.reload();await expect(page.getByTestId('continue')).toBeVisible();expect((await state(page)).activeWorld).toBe('c02-small-world');await page.getByTestId('continue').click();await page.getByTestId('restart-entry').click();await expect.poll(async()=>(await state(page)).room).toBe('SW01-A');expect((await state(page)).world.carry.ledger).toHaveLength(0);
});
test('ordinary YU01-A real input: circuit changes real collision geometry and activates line',async({page},info)=>{
 await startWorld(page,'c03-adriatic-1986');await settle(page);await move(page,108);const before=(await state(page)).solids;await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');expect((await state(page)).solids).not.toEqual(before);
 await page.keyboard.down('d');await page.waitForFunction(()=>(window as any).__CINDER__().player.x>150);await page.keyboard.press('Space',{delay:500});await page.waitForFunction(()=>(window as any).__CINDER__().player.x>250);await page.keyboard.up('d');await settle(page);await move(page,550);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);await page.screenshot({path:info.outputPath('yu01-a-production.png')});
});

test('all authored power contacts have a standing position outside fixed and active circuit solids',()=>{
 for(const design of newCampaignRegistry.rooms){
  const room=rooms[design.room_id as keyof typeof rooms],spec=room.world!;if(!spec.sequence)continue;const world=createWorldState(room.id,spec);
  for(let phase=0;phase<spec.sequence.length;phase++){world.phase=phase;const target=powerTarget(spec,world)!;const body={x:target.x-11,y:target.y-44,width:22,height:44};const solidTargets=[...room.solids.filter(r=>r.y<320),...(spec.powerObjects||[]).filter(o=>o.solidOn===spec.sequence![phase]).map(o=>o.rect)];expect(solidTargets.some(r=>body.x<r.x+r.width&&body.x+body.width>r.x&&body.y<r.y+r.height&&body.y+body.height>r.y),room.id+':phase-'+phase).toBe(false);}
 }
});

test('repair pockets have an unobstructed standing position',()=>{
 for(const design of newCampaignRegistry.rooms){const room=rooms[design.room_id as keyof typeof rooms],p=room.world?.repair;if(!p)continue;const body={x:p.x-11,y:p.y-44,width:22,height:44};expect(room.solids.filter(r=>r.y<320).some(r=>body.x<r.x+r.width&&body.x+body.width>r.x&&body.y<r.y+r.height&&body.y+body.height>r.y),room.id).toBe(false);}
});
test('world storage retry recovers its own namespace and preserves the C01 record',async({page})=>{
 await page.addInitScript(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if((window as any).__FAIL_WORLD_WRITE__&&key==='world.c02-small-world.v1'){(window as any).__FAIL_WORLD_WRITE__=false;throw new DOMException('Injected quota fault','QuotaExceededError');}return key===undefined?put.call(this,value):put.call(this,value,key);};});
 await startWorld(page,'c02-small-world');const worldId=(await state(page)).campaign.campaign_id;
 const read=(key:string)=>page.evaluate(key=>new Promise<any>((resolve,reject)=>{const r=indexedDB.open('cinder-shift-r01',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('records','readonly'),request=tx.objectStore('records').get(key);request.onsuccess=()=>{db.close();resolve(request.result);};request.onerror=()=>reject(request.error);};}),key);
 const base=await read('campaign');await page.evaluate(()=>(window as any).__FAIL_WORLD_WRITE__=true);await page.keyboard.press('Escape');await expect.poll(async()=>(await state(page)).save.issue).toBe('write_failed');await page.getByTestId('pause-settings').click();await page.getByTestId('retry-save').click();await expect.poll(async()=>(await state(page)).eventLog.filter((e:any)=>e.name==='save_result'&&e.params.kind==='campaign').at(-1)?.params.success).toBe(1);await expect.poll(async()=>(await state(page)).save.issue).toBeNull();expect(await read('campaign')).toEqual(base);expect((await read('world.c02-small-world.v1')).campaign.campaign_id).toBe(worldId);
});
