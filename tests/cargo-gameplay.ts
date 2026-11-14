import {expect,type Page} from '@playwright/test';
import {state} from './helpers';
import {jump,ground,to,clear,next,until} from './route-helpers';
export async function playCargo(page:Page,options:{circuit?:'conveyor'|'security';power?:boolean;piercing?:boolean;buffer?:boolean;info?:any}={}){
 const circuit=options.circuit??'conveyor';
  await jump(page,148,240);await ground(page,320);await page.keyboard.down('s');await clear(page,['d-security']);await next(page,'M2A');await page.keyboard.up('s');
  await jump(page,114,172);await ground(page,288);await jump(page,178,280);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m2a-drone']);await to(page,490);await page.keyboard.up('s');await ground(page,320);await next(page,'E',536);
  await jump(page,130,224);await ground(page,320);await page.keyboard.down('s');await clear(page,['e-turret']);if(options.piercing){await page.keyboard.up('s');await to(page,398);await page.keyboard.down('Space');await page.waitForTimeout(170);await page.keyboard.down('j');await expect.poll(async()=>(await state(page)).roomStates.E.brokenPanels).toContain('e-sheet');await page.keyboard.up('j');await page.keyboard.up('Space');await ground(page,320);await page.keyboard.down('s');}await next(page,'M2B');await page.keyboard.up('s');
  await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await clear(page,['m2b-walker']);await page.keyboard.up('s');
  // Demonstrate the optional shelf once; the other run leaves it unclaimed.
  if(circuit==='security'){
   await ground(page,320);await jump(page,212,172);await ground(page,288);
   await jump(page,178,280);await ground(page,256);await jump(page,320,432);await ground(page,224);
   await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).roomStates.M2B.cacheUsed).toBe(true);
  }
  await to(page,510);await ground(page,320);await next(page,'M2C',552);
  await to(page,100);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).cargoCircuit).toBe('conveyor');
  if(circuit==='security'){await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).cargoCircuit).toBe('security');}
  await jump(page,236,332);await ground(page,320);await next(page,'M2D');
  expect((await state(page)).conveyor.enabled).toBe(circuit==='conveyor');
  await jump(page,114,172);await ground(page,288);await jump(page,178,300);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m2d-drone']);await page.keyboard.up('s');await to(page,380);await ground(page,320);
  if(circuit==='security'){await page.keyboard.down('s');await clear(page,['m2d-routed-turret']);await page.keyboard.up('s');}
  await next(page,'F',552);
  // E01's upper shortcut stays optional. The lower cell route works with its turret off.
  if(options.power){await to(page,86);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);}
  await jump(page,178,272);await ground(page,320);await page.keyboard.down('s');await clear(page,options.power?['f-service','f-event-turret']:['f-service']);await to(page,520);await page.keyboard.up('s');
  await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).cellCollected).toBe(true);
  await next(page,'M2E');
  await to(page,112);await ground(page,320);
  if((await state(page)).hp<(await state(page)).maxHp){await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();}
  await jump(page,226,324);await ground(page,320);await to(page,550);
  await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().cellInstalled,null,'cell installation');await page.keyboard.up('e');
  await next(page,'G');
  await jump(page,130,224);await ground(page,320);await page.keyboard.down('s');await clear(page,['g-security','g-turret']);await page.keyboard.up('s');
  await jump(page,522,600);await ground(page,320);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().powered,null,'checkpoint confirmation');await page.keyboard.up('e');
  await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().state==='complete',null,'Cargo result');await page.keyboard.up('d');
 const won=await state(page);expect(won.campaign.completed_missions).toEqual(['airlock','cargo']);expect(won.campaign.reward_ledger).toHaveLength(2);expect(Object.values(won.roomStates).filter((r:any)=>r.visited)).toHaveLength(9);if(options.buffer)expect(Object.values(won.roomStates).some((r:any)=>r.bufferUsed)).toBe(true);return won;
}
