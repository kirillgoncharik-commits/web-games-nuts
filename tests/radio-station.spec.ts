import {test,expect} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {Campaign,newWorldCampaign} from '../games/cinder-shift/src/session/campaign';
import {newCampaignMissions} from '../games/cinder-shift/src/session/new-campaign-content';
import {createWorldState,actWorld,powerTarget,worldPulse,worldPulseHits,worldSolids,worldReady} from '../games/cinder-shift/src/session/world-runtime';
import {radioLinkIds,restoreRadioLinks,validRadioLinks} from '../games/cinder-shift/src/session/radio-links';
import {validateWorldSave} from '../games/cinder-shift/src/session/save';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {to,ground,jump,until} from './route-helpers';

test('model radio link checkpoints are ordered, bounded and restore only confirmed contacts',()=>{
 const spec=rooms['YU05-C'].world!;
 for(let count=0;count<=3;count++){
  const links=radioLinkIds.slice(0,count),s=createWorldState('YU05-C',spec);
  restoreRadioLinks(s,links);expect(s.phase).toBe(count);expect(s.ledger).toEqual(links);
  expect(worldReady(spec,s)).toBe(count===3);
  expect(powerTarget(spec,s)).toEqual(count===3?null:{x:[264,408,552][count],y:320});
 }
 for(const invalid of [null,{},['antenna:phase-1'],['antenna:phase-0','antenna:phase-0'],[...radioLinkIds,'future']])expect(validRadioLinks(invalid)).toBe(false);
});

test('model old world saves remain valid and malformed radio checkpoints are rejected',()=>{
 const c=new Campaign(newWorldCampaign('c03-adriatic-1986',4));
 for(const id of newCampaignMissions['c03-adriatic-1986'].slice(0,4)){
  c.prepare();c.begin();c.applyResult({attempt_id:'fixture-'+id,mission_id:id as any,result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:1,screen_ms:0,nodes:[]});c.advance();
 }
 c.prepare();c.begin();
 const envelope=()=>({schema_version:1,content_version:'worlds-rw3.1',game_id:'c03-adriatic-1986',build_id:'radio-model',saved_at:new Date().toISOString(),campaign:c.snapshot()});
 expect(validateWorldSave(envelope(),'c03-adriatic-1986')).toBeNull();
 c.data.radio_links=radioLinkIds.slice(0,2);expect(validateWorldSave(envelope(),'c03-adriatic-1986')).toBeNull();
 c.data.radio_links=['antenna:phase-2'];expect(validateWorldSave(envelope(),'c03-adriatic-1986')).toBe('corrupt');
 expect(newWorldCampaign('c03-adriatic-1986',4).radio_links).toBeUndefined();
});

test('model radio finale arms a fresh warning, provides real shelter, gates the window and stops on closure',()=>{
 const spec=rooms['YU05-D'].world!,s=createWorldState('YU05-D',spec);
 const body=(x:number)=>({x:x-11,y:276,width:22,height:44});
 expect(worldPulse(spec,50000,s)).toBe('safe');
 actWorld(spec,s,{x:112,y:320},body(112),1,50000);expect(s.power?.circuit).toBe('B');
 expect(actWorld(spec,s,{x:264,y:320},body(264),1,50000)?.action).toBe('activate');
 expect(worldPulse(spec,50000,s)).toBe('warning');expect(worldPulse(spec,51799,s)).toBe('warning');
 expect(worldPulse(spec,51800,s)).toBe('active');expect(worldPulseHits(spec,body(264),51800,s)).toBe(true);
 expect(worldPulseHits(spec,body(348),51800,s)).toBe(false);
 actWorld(spec,s,{x:432,y:320},body(432),1,51800);expect(s.power?.circuit).toBe('A');
 expect(actWorld(spec,s,{x:408,y:320},body(408),1,51800)).toBeNull();
 expect(worldSolids(spec,s).some(r=>r.id==='world-phase:rift-containment')).toBe(true);
 expect(actWorld(spec,s,{x:408,y:320},body(408),1,52700)).toMatchObject({action:'activate',geometry:true});
 expect(worldSolids(spec,s).some(r=>r.id==='world-phase:rift-containment')).toBe(false);
 actWorld(spec,s,{x:432,y:320},body(432),1,52700);
 expect(actWorld(spec,s,{x:552,y:320},body(552),1,52700)?.action).toBe('activate');
 expect(worldReady(spec,s)).toBe(true);expect(worldPulse(spec,57800,s)).toBe('safe');
 expect(actWorld(spec,s,{x:552,y:320},body(552),1,57800)).toBeNull();expect(s.ledger).toHaveLength(3);
});

for(const reduced of [false,true])test(`radio links persist after real activation and reload, reduced ${reduced}`,async({page},info)=>{
 test.setTimeout(60000);await encounter(page,{mission:'YU05',room:'YU05-C',reduced});
 // The only initial fixture is world entry with C01 unlocked. No position,
 // contact or time writes occur once play starts.
 await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
  localStorage.setItem('cinder-active-world-v1','c03-adriatic-1986');
  const request=indexedDB.open('cinder-shift-r01',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('records','readwrite');tx.objectStore('records').put({schema_version:1,base_game_id:'r01',completion_ids:['legacy-c01-unlocked']},'world-profile.v1');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};
 }));
 const before=await state(page);await to(page,112);await ground(page,320);await page.keyboard.press('e');
 await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 await to(page,264);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);
 await to(page,400);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('A');
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(2);
 await page.screenshot({path:info.outputPath('radio-antenna-two-links.png')});
 await page.keyboard.press('Escape');await page.getByTestId('pause-menu').click();
 await expect.poll(async()=>{const s=await state(page);return s.campaign.radio_links;}).toEqual(radioLinkIds.slice(0,2));
 await page.reload();await expect(page.getByTestId('continue')).toBeVisible();await page.getByTestId('continue').click();await page.getByTestId('restart-entry').click();
 await expect.poll(async()=>(await state(page)).state).toBe('playing');
 const after=await state(page);expect(after.campaign.campaign_id).toBe(before.campaign.campaign_id);expect(after.campaign.points).toBe(before.campaign.points);
 expect(after.roomStates['YU05-C'].world.phase).toBe(2);expect(after.roomStates['YU05-C'].world.ledger).toEqual(radioLinkIds.slice(0,2));
 await page.screenshot({path:info.outputPath('radio-links-reloaded.png')});
});

test('radio finale ordinary input: canopy shelters the pulse, pause freezes it and closure stops it',async({page},info)=>{
 test.setTimeout(45000);await encounter(page,{mission:'YU05',room:'YU05-D'});const hp=(await state(page)).hp;
 await to(page,112);await ground(page,320);await page.keyboard.press('e');await jump(page,130,240);await ground(page,320);await to(page,264);await ground(page,320);await page.keyboard.press('e');
 await expect.poll(async()=>(await state(page)).world.phase).toBe(1);await to(page,348);await ground(page,320);
 await until(page,()=>(window as any).__CINDER__().worldPulse==='active',null,'rift pulse under real canopy');expect((await state(page)).hp).toBe(hp);await page.screenshot({path:info.outputPath('radio-rift-shelter.png')});
 await page.keyboard.press('Escape');const paused=(await state(page)).worldPulseElapsed;await page.waitForTimeout(300);expect((await state(page)).worldPulseElapsed).toBe(paused);await page.getByTestId('resume').click();
 await until(page,()=>{const s=(window as any).__CINDER__();return s.worldPulse==='safe'&&6000-s.worldPulseElapsed%6000>2000;},null,'rift safe action window');
 await to(page,432);await ground(page,320);await page.keyboard.press('e');await to(page,408);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(2);
 await to(page,432);await ground(page,320);await page.keyboard.press('e');await jump(page,450,540);await ground(page,320);await to(page,552);await ground(page,320);await page.keyboard.press('e');
 await expect.poll(async()=>(await state(page)).world.phase).toBe(3);expect((await state(page)).worldPulse).toBe('safe');expect((await state(page)).hp).toBe(hp);await page.screenshot({path:info.outputPath('radio-rift-closed.png')});
});
