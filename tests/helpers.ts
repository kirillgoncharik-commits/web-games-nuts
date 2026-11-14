import {airlockExtension} from './airlock-gameplay';
import {expect,type Page} from '@playwright/test';
import {seedsForPlans} from '../games/cinder-shift/src/session/events';
import type {NodeId} from '../games/cinder-shift/src/session/research';
export const state=(page:Page)=>page.evaluate(()=>(window as any).__CINDER__());
export async function x(page:Page,value:number){await page.waitForFunction(x=>(window as any).__CINDER__().player?.x>=x,value,{timeout:8000}).catch(async()=>{throw Error('Movement stopped '+JSON.stringify(await state(page)));});}
export async function startMission(page:Page,{seed=seedsForPlans().none,node,locale='ru'}:{seed?:number;node?:NodeId;locale?:'ru'|'en'}={}){
  await page.goto('/games/cinder-shift/?seed='+seed);await page.getByTestId('menu-settings').click();await page.getByTestId('locale').selectOption(locale);await page.getByTestId('settings-back').click();await page.getByTestId('new-shift').click();
  if(await page.getByTestId('confirm-new').isVisible())await page.getByTestId('confirm-new').click();await page.getByTestId('map-prepare').click();
  await expect.poll(async()=>(await state(page)).screen).toBe('research');
  if(node){await page.getByTestId('buy-'+node).click();await page.getByTestId('confirm-buy').click();await expect.poll(async()=>(await state(page)).campaign.nodes).toContain(node);}
  await page.getByTestId('briefing').click();await page.getByTestId('skip-arrival').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');await expect.poll(async()=>Boolean((await state(page)).player)).toBe(true);await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.simMs>0&&s.player?.vy===0;});
}
export async function roomA(page:Page){
  await page.keyboard.down('d');await x(page,143);await page.keyboard.down('Space');await x(page,242);await page.keyboard.up('Space');await x(page,294);await page.keyboard.up('d');
  await page.keyboard.down('s');await page.keyboard.down('d');await x(page,442);await page.keyboard.up('d');await page.keyboard.up('s');
  await page.keyboard.down('j');await expect.poll(async()=>(await state(page)).combatRemaining).toBe(0).catch(async()=>{throw Error('Target route stalled '+JSON.stringify(await state(page)));});await page.keyboard.up('j');
  await page.keyboard.down('d');await x(page,546);await page.keyboard.up('d');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);
  await page.keyboard.down('d');await page.waitForFunction(()=>(window as any).__CINDER__().room==='B',null,{timeout:8000});await page.keyboard.up('d');await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.room==='B'&&s.state==='playing'&&s.player?.x<100;});
}
export async function jump(page:Page,from:number,to:number){await page.keyboard.down('d');await x(page,from);await page.keyboard.down('Space');await x(page,to);await page.keyboard.up('Space');await page.keyboard.up('d');}
export async function completeFromB(page:Page,{collectRelayIntel=false,verifyHold=false,salvage=false}:{collectRelayIntel?:boolean;verifyHold?:boolean;salvage?:boolean}={}){
  await page.keyboard.down('j');await jump(page,194,350);await expect.poll(async()=>(await state(page)).enemies.filter((e:any)=>e.hp>0).length,{timeout:12000}).toBe(0);await page.keyboard.up('j');
  await jump(page,496,556);await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return p?.vy===0&&p.y+22>303;});if(collectRelayIntel){await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return p?.vy===0&&p.y+22>303;});await page.keyboard.press('e');await page.getByTestId('event-take-intel').click();await page.getByTestId('confirm-event').click();await expect.poll(async()=>(await state(page)).relayIntelCollected).toBe(true);}if((await state(page)).hp<(await state(page)).maxHp&&!(await state(page)).containerUsed){await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();}await airlockExtension(page,undefined,{salvage});
  await page.keyboard.down('j');await jump(page,130,224);await page.keyboard.down('s');await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id==='c-walker-1').hp,{timeout:10000}).toBe(0);await page.keyboard.up('s');
  await jump(page,318,368);
  await page.waitForFunction(()=>(window as any).__CINDER__().player?.vy===0);
  // Clear the landing-control drone from the raised firing line before passing it.
  // The combat gate deliberately prevents the old route from leaving threats behind.
  await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id==='c-drone')?.hp,{timeout:12000}).toBeLessThanOrEqual(0);
  await page.keyboard.down('d');await x(page,408);await page.keyboard.up('d');
  await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return p?.vy===0&&p.y+22>318;});
  await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id==='c-walker-2')?.hp,{timeout:12000}).toBeLessThanOrEqual(0);
  expect((await state(page)).combatRemaining).toBe(0);
  await jump(page,492,556);await page.keyboard.up('j');await page.waitForFunction(()=>(window as any).__CINDER__().player?.vy===0);if(verifyHold){await page.keyboard.down('e');await page.waitForTimeout(250);await page.keyboard.up('e');expect((await state(page)).objective).toBe(false);await expect.poll(async()=>(await state(page)).holdMs).toBe(0);}await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).objective).toBe(true);await page.keyboard.up('e');await page.keyboard.down('d');await expect.poll(async()=>(await state(page)).state).toBe('complete');await page.keyboard.up('d');
}
