import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {state} from './helpers';
import {ground,to,jump,clear,counterRam,cross,next,until} from './route-helpers';

for(const circuit of ['cooling','isolation'] as const)for(const acceptE06 of [false,true])test(`base suit reaches R05 through Reactor ${circuit}, E06 ${acceptE06?'accepted':'declined'}`,async({page},info)=>{
 test.setTimeout(210000);const rooms:any[]=[];let last:any;const started=Date.now();
 async function mark(){const s=await state(page);if(last)rooms.push({room:last.room,active_seconds:s.activeSeconds-last.activeSeconds,hp_in:last.hp,hp_out:s.hp});last=s;console.log('Reactor route entry',s.room,s.hp,s.activeSeconds);}
 try{
  await page.goto('/__encounter__/');await page.getByTestId('new-shift').waitFor();await page.getByTestId('menu-settings').click();await expect.poll(async()=>(await state(page)).audioStatus.ready).toBe(true);await page.getByTestId('settings-back').click();
  await page.evaluate(()=>(window as any).__ENCOUNTER__.start({mission:'reactor',seed:4}));await ground(page,320);await mark();
  await jump(page,130,224);await ground(page,320);await clear(page,['m5a-security']);await jump(page,338,404);await ground(page,320);await clear(page,['m5a-turret']);
  await jump(page,426,500);await ground(page,320);await page.keyboard.down('s');await to(page,576);await page.keyboard.up('s');await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().roomStates.M5A.terminal,null,'outer power');await page.keyboard.up('e');await next(page,'M5F');await mark();
  await jump(page,130,188);await ground(page,288);await jump(page,204,306);await ground(page,256);await page.keyboard.down('s');await clear(page,['m5f-drone']);await page.keyboard.up('s');await to(page,400);await ground(page,320);await clear(page,['m5f-security']);await next(page,'M5B',552);await mark();
  await jump(page,122,180);await ground(page,288);await jump(page,204,280);await ground(page,272);await clear(page,['m5b-drone']);
  await until(page,()=>{const s=(window as any).__CINDER__(),t=s.simMs%9000;return t>=6000&&t<6800;},null,'transit heat window',12000);await jump(page,308,400);await ground(page,320);await jump(page,386,484);await ground(page,320);await to(page,520);
  if(acceptE06){await page.keyboard.press('e');await page.getByTestId('event-challenge').click();await page.getByTestId('confirm-event').click();await counterRam(page,'m5b-e06-ram');}
  await next(page,'M5G');await mark();
  await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await clear(page,['m5g-security']);await page.keyboard.up('s');await to(page,212);await jump(page,212,172);await ground(page,288);await jump(page,178,292);await ground(page,256);await jump(page,326,432);await ground(page,224);await clear(page,['m5g-drone']);await to(page,510);await ground(page,320);await next(page,'M5H',552);await mark();
  await to(page,112);await page.keyboard.press('e');if(circuit==='isolation')await page.keyboard.press('e');expect((await state(page)).reactorCircuit).toBe(circuit);await jump(page,242,336);await ground(page,320);await next(page,'M5I');await mark();
  await jump(page,106,200);await ground(page,320);await to(page,244);await counterRam(page,'m5i-ram');if(circuit==='cooling'){await page.keyboard.down('s');await clear(page,['m5i-turret']);await page.keyboard.up('s');await to(page,526);}else await cross(page,'m5i-heat',526);
  await next(page,'M5C',552);await mark();await to(page,120);await ground(page,320);const before=(await state(page)).hp;
  if(before<(await state(page)).maxHp){await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();expect((await state(page)).hp).toBe(Math.min(before+2,(await state(page)).maxHp));}
  const s=await state(page);expect(s.state).toBe('playing');expect(s.hp).toBeGreaterThan(0);expect(s.loadout.nodes).toEqual([]);expect(s.s05Accepted).toBe(acceptE06);
  const report={status:'AUTOMATED_INPUT_PREBOSS_ONLY',source_sha:s.sha,build:s.build,circuit,acceptE06,seed:4,nodes:[],active_seconds:s.activeSeconds,wall_seconds:(Date.now()-started)/1000,hp:s.hp,rooms,hits:s.eventLog.filter((e:any)=>e.name==='hit_received'),human_duration_target_verified:false,boss_and_evacuation_verified:false};console.log('Reactor route report',JSON.stringify(report));await writeFile(info.outputPath('reactor-route.json'),JSON.stringify(report,null,2));await page.screenshot({path:info.outputPath('reactor-r05.png')});
 }catch(error){const s=await state(page);console.log('Reactor route failure',JSON.stringify({circuit,acceptE06,rooms,state:s.state,room:s.room,hp:s.hp,player:s.player,enemies:s.enemies,hazards:s.hazards,roomStates:s.roomStates}));await writeFile(info.outputPath('failure-state.json'),JSON.stringify(s,null,2));throw error;}
});
