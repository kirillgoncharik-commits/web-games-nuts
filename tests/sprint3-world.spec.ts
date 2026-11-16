import {test,expect,type Page} from '@playwright/test';
async function snapshot(page:Page){await page.waitForFunction(()=>typeof (window as any).__WORLD_SAMPLE__==='function'&&(window as any).__WORLD_SAMPLE__().player);return page.evaluate(()=>(window as any).__WORLD_SAMPLE__());}
async function enter(page:Page,world:string){await page.goto((process.env.CINDER_WORLD_URL||'http://127.0.0.1:4177')+'/?world='+world);await expect.poll(async()=>(await snapshot(page))?.player?.x).toBe(64);}
async function move(page:Page,to:number){await page.keyboard.down('d');await page.waitForFunction(x=>(window as any).__WORLD_SAMPLE__().player.x>=x,to);await page.keyboard.up('d');await expect.poll(async()=>Math.abs((await snapshot(page)).player.vx)).toBeLessThan(1);}
test('SW01-A fixture: real pickup and throw activate a physical contact; reload retains its ledger',async({page},info)=>{
 await enter(page,'small-world');await move(page,106);await page.keyboard.press('e');await expect.poll(async()=>(await snapshot(page)).carry.item.state).toBe('held');expect((await snapshot(page)).canFire).toBe(false);
 await page.keyboard.down('s');await move(page,216);await page.keyboard.up('s');await expect.poll(async()=>(await snapshot(page)).player.crouching).toBe(false);await page.keyboard.press('e');await expect.poll(async()=>(await snapshot(page)).carry.contacts[0].active).toBe(true);expect((await snapshot(page)).carry.ledger).toHaveLength(1);await page.screenshot({path:info.outputPath('sw01-a-contact-graybox.png')});
 await move(page,580);await expect.poll(async()=>(await snapshot(page)).completed).toBe(true);await page.reload();await expect.poll(async()=>(await snapshot(page)).carry.contacts[0].active).toBe(true);expect((await snapshot(page)).carry.ledger).toHaveLength(1);
});
test('YU01-B fixture: real A/B switching changes colliders, visual shape and persisted state',async({page},info)=>{
 await enter(page,'adriatic');await move(page,106);const before=(await snapshot(page)).solids;await page.keyboard.press('e');await expect.poll(async()=>(await snapshot(page)).power.circuit).toBe('B');expect((await snapshot(page)).solids).not.toEqual(before);await page.screenshot({path:info.outputPath('yu01-b-circuit-b-graybox.png')});
 await page.reload();await expect.poll(async()=>(await snapshot(page)).power.circuit).toBe('B');await move(page,106);await page.keyboard.press('e');await expect.poll(async()=>(await snapshot(page)).power.circuit).toBe('A');
 await page.keyboard.press('Escape');const stopped=(await snapshot(page)).player;await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');expect((await snapshot(page)).player.x).toBe(stopped.x);await page.keyboard.press('Escape');await expect.poll(async()=>(await snapshot(page)).paused).toBe(false);
});
test('touch fixture uses the same context action for pickup and throw',async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:667,height:375},hasTouch:true,isMobile:true});const page=await context.newPage();await enter(page,'small-world');
 const right=page.locator('[data-action=right]');await right.hover();await page.mouse.down();await page.waitForFunction(()=>(window as any).__WORLD_SAMPLE__().player.x>106);await page.mouse.up();await expect.poll(async()=>Math.abs((await snapshot(page)).player.vx)).toBeLessThan(1);
 await page.locator('[data-action=interact]').tap();await expect.poll(async()=>(await snapshot(page)).carry.item.state).toBe('held');await page.locator('[data-action=interact]').tap();await expect.poll(async()=>(await snapshot(page)).carry.item.state).not.toBe('held');await page.screenshot({path:info.outputPath('sw01-a-touch-graybox.png')});await context.close();
});
