import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {state} from './helpers';
import {encounter} from './encounter-helpers';
import {ground,to,jump,clear,counterRam,next,until} from './route-helpers';
import {archiveCampaignSeed} from './archive-seeds';

for(const choice of ['scout','health','salvage'] as const)test(`base suit completes all nine Archive rooms with ${choice}`,async({page},info)=>{
 test.setTimeout(240000);const rooms:any[]=[];let activeRoom='',roomStart=0,hpStart=6;const wallStart=Date.now();let beaconEffect:any=null;
 const campaignSeed=archiveCampaignSeed(choice!=='salvage');
 async function mark(){const s=await state(page);if(activeRoom)rooms.push({room:activeRoom,active_seconds:s.activeSeconds-roomStart,hp_in:hpStart,hp_out:s.hp});activeRoom=s.room;roomStart=s.activeSeconds;hpStart=s.hp;console.log('Archive entry',choice,s.room,'HP',s.hp,'time',s.activeSeconds);}
 try{
  await encounter(page,{mission:'archive',room:'M4A',seed:campaignSeed});await mark();
  expect((await state(page)).loadout.nodes).toEqual([]);const entry=(await state(page)).campaign.entry;
  await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await clear(page,['m4a-walker']);await to(page,510);await page.keyboard.up('s');await next(page,'M4E',552);await mark();
  await jump(page,114,172);await ground(page,288);await jump(page,178,292);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m4e-drone']);await page.keyboard.up('s');
  await jump(page,326,432);await ground(page,224);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).archiveCarrierCollected).toBe(true);
  await to(page,510);await ground(page,320);await next(page,'M4B',552);await mark();
  await jump(page,114,208);await ground(page,320);
  if(choice==='health'){
   // Permit one actual guard hit to exercise a real repair, never a fixture HP edit.
   const hp=(await state(page)).hp;expect(hp).toBeGreaterThan(1);
   await until(page,hp=>(window as any).__CINDER__().hp<hp,hp,'guard hit before health choice',10000);
  }
  await page.keyboard.down('s');await clear(page,['m4b-security']);await to(page,476);await page.keyboard.up('s');
  const beforeChoice=await state(page);await page.keyboard.press('e');
  if(choice!=='salvage'){await page.getByTestId('event-'+choice).click();await page.getByTestId('confirm-event').click();}
  await expect.poll(async()=>(await state(page)).roomStates.M4B.cacheUsed).toBe(true);
  const afterChoice=await state(page);beaconEffect={choice,hp_before:beforeChoice.hp,hp_after:afterChoice.hp,score_before:beforeChoice.score,score_after:afterChoice.score};
  expect(afterChoice.scoutedArchive).toBe(choice==='scout');if(choice==='health')expect(afterChoice.hp).toBe(beforeChoice.hp+1);
  await to(page,510);await ground(page,320);await next(page,'M4F',552);await mark();
  expect((await state(page)).solids.some((s:any)=>s.id==='archive-scout-screen')).toBe(choice!=='scout');
  await jump(page,114,208);await ground(page,320);
  if(choice!=='scout'){await jump(page,316,400);await ground(page,320);}
  await page.keyboard.down('s');await clear(page,['m4f-security']);await to(page,510);await page.keyboard.up('s');await next(page,'M4G',552);await mark();
  await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await clear(page,['m4g-walker']);await to(page,550);await page.keyboard.up('s');
  await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).archiveUploadPowered).toBe(true);await next(page,'M4H');await mark();
  await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await clear(page,['m4h-security']);await page.keyboard.up('s');
  await jump(page,212,172);await ground(page,288);await jump(page,178,292);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m4h-drone']);await page.keyboard.up('s');await to(page,510);await ground(page,320);await next(page,'M4C',552);await mark();
  await jump(page,226,324);await ground(page,320);await to(page,550);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().dataUploaded,null,'data upload');await page.keyboard.up('e');
  await to(page,512);await ground(page,320);
  if((await state(page)).hp<(await state(page)).maxHp){await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();}
  await next(page,'M4I');await mark();
  await jump(page,106,200);await ground(page,320);await counterRam(page,'m4i-ram');await next(page,'M4D',552);await mark();
  await jump(page,130,224);await ground(page,320);await page.keyboard.down('s');await clear(page,['m4d-walker']);await page.keyboard.up('s');
  await jump(page,224,184);await ground(page,288);await jump(page,194,300);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m4d-drone']);await page.keyboard.up('s');
  await jump(page,330,450);await ground(page,320);await jump(page,522,600);await ground(page,320);
  await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().powered,null,'Archive exit confirmation');await page.keyboard.up('e');
  await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().state==='complete',null,'Archive result');await page.keyboard.up('d');
  const won=await state(page);rooms.push({room:activeRoom,active_seconds:won.activeSeconds-roomStart,hp_in:hpStart,hp_out:won.hp});
  expect(won.campaign.result.result).toBe('victory');expect(won.archiveCarrierCollected&&won.archiveUploadPowered&&won.dataUploaded).toBe(true);expect(won.hp).toBeGreaterThan(0);
  expect(Object.values(won.roomStates).filter((r:any)=>r.visited)).toHaveLength(9);
  const report={status:'AUTOMATED_INPUT_ONLY',build:won.build,source_sha:won.sha,choice,campaign_seed:campaignSeed,nodes:[],event_plan:won.eventPlan,beacon_effect:beaconEffect,r04_used:won.roomStates.M4C.repairUsed,active_seconds:won.activeSeconds,wall_seconds:(Date.now()-wallStart)/1000,hp:won.hp,rooms,hits:won.eventLog.filter((e:any)=>e.name==='hit_received'),human_duration_target_verified:false};
  console.log('Archive route report',JSON.stringify(report));await writeFile(info.outputPath('archive-route.json'),JSON.stringify(report,null,2));await page.screenshot({path:info.outputPath('archive-complete.png')});
  await page.getByTestId('retry').click();await expect.poll(async()=>{const s=await state(page);return s.state==='playing'&&s.room==='M4A'&&s.attemptId!==won.attemptId;}).toBe(true);
  const retry=await state(page);expect(retry.hp).toBe(6);expect(retry.campaign.entry).toEqual(entry);expect(retry.archiveCarrierCollected||retry.archiveUploadPowered||retry.dataUploaded||retry.scoutedArchive).toBe(false);expect(retry.campaign.reward_ledger).toEqual(won.campaign.reward_ledger);
 }catch(error){const s=await state(page);console.log('Archive route failure',JSON.stringify({choice,rooms,state:s.state,room:s.room,hp:s.hp,player:s.player,enemies:s.enemies,solids:s.solids,archiveCarrierCollected:s.archiveCarrierCollected,archiveUploadPowered:s.archiveUploadPowered,dataUploaded:s.dataUploaded,scoutedArchive:s.scoutedArchive,exitOpen:s.exitOpen}));await writeFile(info.outputPath('failure-state.json'),JSON.stringify(s,null,2));throw error;}
});
