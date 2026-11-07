import {expect,type Page} from '@playwright/test';
import {seedsForPlans} from '../games/cinder-shift/src/session/events';
import type {NodeId} from '../games/cinder-shift/src/session/research';
export const state=(page:Page)=>page.evaluate(()=>(window as any).__CINDER__());
export async function x(page:Page,value:number){await page.waitForFunction(x=>(window as any).__CINDER__().player?.x>=x,value,{timeout:8000}).catch(async()=>{throw Error('Movement stopped '+JSON.stringify(await state(page)));});}
export async function startMission(page:Page,{seed=seedsForPlans().none,node,locale='ru'}:{seed?:number;node?:NodeId;locale?:'ru'|'en'}={}){
  await page.goto('/games/cinder-shift/?seed='+seed);await page.getByTestId('menu-locale').selectOption(locale);await page.getByTestId('new-shift').click();
  if(await page.getByTestId('confirm-new').isVisible())await page.getByTestId('confirm-new').click();await page.getByTestId('choose-mira').click();
  await expect.poll(async()=>(await state(page)).screen).toBe('research');
  if(node){await page.getByTestId('research-'+node).click();await page.getByTestId('purchase').click();await page.getByTestId('confirm-buy').click();await expect.poll(async()=>(await state(page)).campaign.nodes).toContain(node);}
  await page.getByTestId('briefing').click();await page.getByTestId('start-mission').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');await expect.poll(async()=>Boolean((await state(page)).player)).toBe(true);await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.simMs>0&&s.player?.vy===0;});
}
export async function roomA(page:Page){
  await page.keyboard.down('d');await x(page,143);await page.keyboard.down('Space');await x(page,242);await page.keyboard.up('Space');await x(page,294);await page.keyboard.up('d');
  await page.keyboard.down('s');await page.keyboard.down('d');await x(page,442);await page.keyboard.up('d');await page.keyboard.up('s');
  await page.keyboard.down('j');await expect.poll(async()=>(await state(page)).targetHp).toBe(0).catch(async()=>{throw Error('Target route stalled '+JSON.stringify(await state(page)));});await page.keyboard.up('j');
  await page.keyboard.down('d');await x(page,546);await page.keyboard.up('d');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);
  await page.keyboard.down('d');await page.waitForFunction(()=>(window as any).__CINDER__().state==='transition');await page.keyboard.up('d');await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.room==='B'&&s.state==='playing'&&s.player?.x<100;});
}
export async function jump(page:Page,from:number,to:number){await page.keyboard.down('d');await x(page,from);await page.keyboard.down('Space');await x(page,to);await page.keyboard.up('Space');await page.keyboard.up('d');}
export async function completeFromB(page:Page){
  await page.keyboard.down('j');await jump(page,194,350);await expect.poll(async()=>(await state(page)).enemies.filter((e:any)=>e.hp>0).length,{timeout:12000}).toBe(0);await page.keyboard.up('j');
  await page.keyboard.down('d');await page.waitForFunction(()=>(window as any).__CINDER__().state==='transition');await page.keyboard.up('d');await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.room==='C'&&s.state==='playing'&&s.player?.x<100;});
  await page.keyboard.down('j');await jump(page,130,224);await page.keyboard.down('s');await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id==='c-walker-1').hp,{timeout:10000}).toBe(0);await page.keyboard.up('s');
  await jump(page,318,368);await page.keyboard.down('s');await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id==='c-drone').hp,{timeout:10000}).toBe(0);await page.keyboard.up('s');
  await page.keyboard.down('d');await x(page,420);await page.keyboard.up('d');await page.keyboard.down('s');await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id==='c-walker-2').hp,{timeout:10000}).toBe(0);await page.keyboard.up('s');
  await jump(page,496,556);await page.keyboard.up('j');await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).objective).toBe(true);await page.keyboard.up('e');await page.keyboard.down('d');await expect.poll(async()=>(await state(page)).state).toBe('complete');await page.keyboard.up('d');
}
