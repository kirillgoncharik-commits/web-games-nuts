import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {state} from './helpers';
import {ground,to,jump,clear,next,until} from './route-helpers';
import {encounter} from './encounter-helpers';

for(const circuit of ['conveyor','security'] as const)test(`base suit completes all nine Cargo rooms with ${circuit} power`,async({page},info)=>{
 test.setTimeout(240000);const rooms:any[]=[];let activeRoom='',roomStart=0,hpStart=6;const wallStart=Date.now();
 async function mark(){const s=await state(page);if(activeRoom)rooms.push({room:activeRoom,active_seconds:s.activeSeconds-roomStart,hp_in:hpStart,hp_out:s.hp});activeRoom=s.room;roomStart=s.activeSeconds;hpStart=s.hp;console.log('Cargo entry',circuit,s.room,'HP',s.hp,'time',s.activeSeconds);}
 try{
  await encounter(page,{mission:'cargo',room:'D'});await mark();
  expect((await state(page)).loadout.nodes).toEqual([]);
  const entry=(await state(page)).campaign.entry;
  await jump(page,148,240);await ground(page,320);await page.keyboard.down('s');await clear(page,['d-security']);await next(page,'M2A');await page.keyboard.up('s');await mark();
  await jump(page,114,172);await ground(page,288);await jump(page,178,280);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m2a-drone']);await to(page,490);await page.keyboard.up('s');await ground(page,320);await next(page,'E',536);await mark();
  await jump(page,130,224);await ground(page,320);await page.keyboard.down('s');await clear(page,['e-turret']);await next(page,'M2B');await page.keyboard.up('s');await mark();
  await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await clear(page,['m2b-walker']);await page.keyboard.up('s');
  // Demonstrate the optional shelf once; the other run leaves it unclaimed.
  if(circuit==='security'){
   await ground(page,320);await jump(page,212,172);await ground(page,288);
   await jump(page,178,280);await ground(page,256);await jump(page,320,432);await ground(page,224);
   await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).roomStates.M2B.cacheUsed).toBe(true);
  }
  await to(page,510);await ground(page,320);await next(page,'M2C',552);await mark();
  await to(page,100);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).cargoCircuit).toBe('conveyor');
  if(circuit==='security'){await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).cargoCircuit).toBe('security');}
  await jump(page,236,332);await ground(page,320);await next(page,'M2D');await mark();
  expect((await state(page)).conveyor.enabled).toBe(circuit==='conveyor');
  await jump(page,114,172);await ground(page,288);await jump(page,178,300);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m2d-drone']);await page.keyboard.up('s');await to(page,380);await ground(page,320);
  if(circuit==='security'){await page.keyboard.down('s');await clear(page,['m2d-routed-turret']);await page.keyboard.up('s');}
  await next(page,'F',552);await mark();
  // E01's upper shortcut stays optional. The lower cell route works with its turret off.
  await jump(page,178,272);await ground(page,320);await page.keyboard.down('s');await clear(page,['f-service']);await to(page,520);await page.keyboard.up('s');
  await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).cellCollected).toBe(true);
  await next(page,'M2E');await mark();
  await to(page,112);await ground(page,320);
  if((await state(page)).hp<(await state(page)).maxHp){await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();}
  await jump(page,226,324);await ground(page,320);await to(page,550);
  await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().cellInstalled,null,'cell installation');await page.keyboard.up('e');
  await next(page,'G');await mark();
  await jump(page,130,224);await ground(page,320);await page.keyboard.down('s');await clear(page,['g-security','g-turret']);await page.keyboard.up('s');
  await jump(page,522,600);await ground(page,320);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().powered,null,'checkpoint confirmation');await page.keyboard.up('e');
  await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().state==='complete',null,'Cargo result');await page.keyboard.up('d');
  const won=await state(page);rooms.push({room:activeRoom,active_seconds:won.activeSeconds-roomStart,hp_in:hpStart,hp_out:won.hp});
  expect(won.campaign.result.result).toBe('victory');expect(won.cellInstalled).toBe(true);expect(won.hp).toBeGreaterThan(0);
  expect(Object.values(won.roomStates).filter((r:any)=>r.visited)).toHaveLength(9);
  expect(won.roomStates.M2B.cacheUsed).toBe(circuit==='security');
  const report={status:'AUTOMATED_INPUT_ONLY',build:won.build,source_sha:won.sha,environment:process.env.CI?'CI_CHECKOUT':'DEVELOPMENT_WORKTREE',circuit,campaign_seed:4,nodes:[],event_plan:won.eventPlan,active_seconds:won.activeSeconds,wall_seconds:(Date.now()-wallStart)/1000,hp:won.hp,optional_salvage:circuit==='security',rooms,hits:won.eventLog.filter((e:any)=>e.name==='hit_received'),human_duration_target_verified:false};
  console.log('Cargo route report',JSON.stringify(report));await writeFile(info.outputPath('cargo-route.json'),JSON.stringify(report,null,2));await page.screenshot({path:info.outputPath('cargo-complete.png')});
  await page.getByTestId('retry').click();await expect.poll(async()=>{const s=await state(page);return s.state==='playing'&&s.room==='D'&&s.attemptId!==won.attemptId;}).toBe(true);
  const retry=await state(page);expect(retry.hp).toBe(6);expect(retry.campaign.entry).toEqual(entry);expect(retry.cargoRerouted).toBe(false);expect(retry.cellCollected||retry.cellInstalled).toBe(false);expect(retry.campaign.reward_ledger).toEqual(won.campaign.reward_ledger);
 }catch(error){const s=await state(page);console.log('Cargo route failure',JSON.stringify({circuit,rooms,state:s.state,room:s.room,hp:s.hp,player:s.player,enemies:s.enemies,cargoCircuit:s.cargoCircuit,cellCollected:s.cellCollected,cellInstalled:s.cellInstalled,exitOpen:s.exitOpen}));await writeFile(info.outputPath('failure-state.json'),JSON.stringify(s,null,2));throw error;}
});
