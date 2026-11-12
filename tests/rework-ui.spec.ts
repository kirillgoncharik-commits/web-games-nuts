import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {state,startMission,roomA,x} from './helpers';

test.afterEach(async({page},info)=>{
 if(info.status===info.expectedStatus||page.isClosed())return;
 const snapshot=await state(page).catch(error=>({snapshot_error:String(error)}));
 await writeFile(info.outputPath('runtime-state.json'),JSON.stringify(snapshot,null,2));
 await page.screenshot({path:info.outputPath('failure.png')}).catch(()=>{});
});

test('menu has one action group; language and analytics remain reachable in Settings',async({page})=>{
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('new-shift')).toBeVisible();
 await expect(page.getByTestId('menu-locale')).toHaveCount(0);await expect(page.getByTestId('menu-privacy')).toHaveCount(0);
 expect((await state(page)).introVisibleMs).toBe(0);
 await page.getByTestId('menu-settings').click();await page.getByTestId('locale').selectOption('en');
 await page.getByTestId('settings-privacy').click();await page.getByTestId('analytics-decline').click();
 await expect(page.getByTestId('settings-privacy')).toBeFocused();await page.getByTestId('settings-back').click();
 await expect(page.getByTestId('new-shift')).toBeVisible();
});

for(const width of [1280,667,390])test(`facility inspection and inline module purchase preserve progress at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:width===667?300:800});
 await page.goto('/games/cinder-shift/?seed=4');await page.getByTestId('new-shift').click();
 await expect(page.getByTestId('map-prepare')).toBeVisible();const initial=(await state(page)).campaign;
 await page.getByTestId('map-pin-reactor').click();expect((await state(page)).campaign).toEqual(initial);
 await expect(page.getByTestId('map-prepare')).toBeDisabled();await page.getByTestId('map-pin-airlock').click();
 await page.screenshot({path:info.outputPath('facility-map.png')});await page.getByTestId('map-prepare').click();
 await page.getByTestId('buy-D1').click();await expect(page.getByTestId('confirm-buy')).toBeVisible();
 expect((await state(page)).campaign.points).toBe(1);await page.getByTestId('cancel-buy').click();
 expect((await state(page)).campaign.nodes).toEqual([]);await page.getByTestId('buy-D1').click();
 await page.getByTestId('confirm-buy').click();await expect.poll(async()=>(await state(page)).campaign.nodes).toEqual(['D1']);
 await expect(page.locator('[data-module="D1"]')).toHaveCount(0);await expect(page.locator('.installed-modules li')).toHaveCount(1);
 expect((await state(page)).campaign.points).toBe(0);await expect(page.getByTestId('buy-W1')).toBeDisabled();
 await page.screenshot({path:info.outputPath('workshop.png')});
 expect(await page.locator('.panel-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});

test('arrival is immediately skippable and the first live enemy opens the powered exit',async({page},info)=>{
 test.setTimeout(45000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await startMission(page);expect((await state(page)).arrivalMs).toBeLessThan(6500);
 expect((await state(page)).combatRemaining).toBe(1);expect((await state(page)).exitOpen).toBe(false);
 await roomA(page);expect((await state(page)).room).toBe('B');
 await page.screenshot({path:info.outputPath('first-combat-complete.png')});expect(errors).toEqual([]);
});


async function encounter(page:import('@playwright/test').Page,input:{mission:'foundry'|'reactor';room:string;cleared?:boolean;debug?:boolean;reduced?:boolean;nodes?:string[]}){
 await page.goto('/__encounter__/');await expect(page.getByTestId('new-shift')).toBeVisible();
 // Fixtures bypass normal mission buttons; retain the real gesture/decode contract.
 await page.getByTestId('menu-settings').click();
 await expect.poll(async()=>(await state(page)).audioStatus.ready).toBe(true);
 await expect.poll(async()=>(await state(page)).audio).toBe('running');
 await page.getByTestId('settings-back').click();
 await page.evaluate(input=>(window as any).__ENCOUNTER__.start(input),input);
 await expect.poll(async()=>(await state(page)).room).toBe(input.room);
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.state==='playing'&&s.simMs>0&&s.player?.vy===0;});
}
async function climbBossPlatform(page:import('@playwright/test').Page){
 await page.keyboard.down('d');await x(page,108);await page.keyboard.down('Space');await x(page,168);await page.keyboard.up('d');await page.keyboard.up('Space');
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.player?.vy===0&&s.player.y+22<290;});
 await page.keyboard.down('d');await page.keyboard.down('Space');await x(page,268);await page.keyboard.up('d');await page.keyboard.up('Space');
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.player?.vy===0&&s.player.y+22<260;});
}

test('Foundry console changes real equipment power and keeps the inactive machine harmless',async({page},info)=>{
 await encounter(page,{mission:'foundry',room:'M3E'});
 expect((await state(page)).hazards.filter((h:any)=>h.enabled).map((h:any)=>h.kind)).toEqual(['press']);
 await page.keyboard.down('d');await x(page,100);await page.keyboard.up('d');await page.keyboard.press('e');
 await expect.poll(async()=>(await state(page)).powerCircuit).toBe('furnace');
 expect((await state(page)).hazards.find((h:any)=>h.kind==='press').phase).toBe('off');expect((await state(page)).hp).toBe(6);
 await page.screenshot({path:info.outputPath('foundry-power-furnace.png')});await page.keyboard.press('e');
 await expect.poll(async()=>(await state(page)).powerCircuit).toBe('press');
 expect((await state(page)).hazards.find((h:any)=>h.kind==='heat').phase).toBe('off');
});

test('first Foundry ram requires the charge/recovery pattern and can be defeated by the base weapon',async({page},info)=>{
 test.setTimeout(45000);await encounter(page,{mission:'foundry',room:'M3A'});
 await page.keyboard.down('d');await x(page,148);await page.keyboard.down('Space');await x(page,250);await page.keyboard.up('d');await page.keyboard.up('Space');
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.player?.vy===0&&s.player.y+22>318;});
 await page.keyboard.down('j');await page.waitForFunction(()=>{const e=(window as any).__CINDER__().enemies[0];return e.phase==='telegraph'&&e.remaining<240;});
 expect((await state(page)).enemies[0].hp).toBe(3);expect((await state(page)).audioStatus.played.hit_armour).toBeGreaterThan(0);
 await page.keyboard.down('Space');await expect.poll(async()=>(await state(page)).combatRemaining,{timeout:12000}).toBe(0);await page.keyboard.up('Space');await page.keyboard.up('j');
 expect((await state(page)).hp).toBeGreaterThan(0);expect((await state(page)).exitOpen).toBe(true);await page.screenshot({path:info.outputPath('foundry-ram-counterattack.png')});
});

for(const route of ['service','press'] as const)test(`Foundry ${route} selection opens the matching corridor after isolation`,async({page})=>{
 test.setTimeout(45000);
 // This fixture represents security already defeated; it tests the actual terminal and fork flow.
 await encounter(page,{mission:'foundry',room:'M3F',cleared:true});expect((await state(page)).exitOpen).toBe(false);
 await page.keyboard.down('d');await x(page,166);await page.keyboard.down('Space');await x(page,270);await page.keyboard.up('Space');await x(page,556);await page.keyboard.up('d');
 await page.keyboard.press('e');await page.getByTestId('fork-'+route).click();await expect.poll(async()=>(await state(page)).foundryRoute).toBe(route);
 await page.keyboard.down('d');await expect.poll(async()=>(await state(page)).room).toBe(route==='service'?'M3B':'M3C');await page.keyboard.up('d');
});

test('robot chest core takes real base-weapon hits from the raised firing platform',async({page},info)=>{
 test.setTimeout(45000);await encounter(page,{mission:'reactor',room:'M5D',debug:true});await climbBossPlatform(page);
 await page.keyboard.down('j');await expect.poll(async()=>(await state(page)).bossHp,{timeout:12000}).toBeLessThan(32);await page.keyboard.up('j');
 expect((await state(page)).boss.pattern.stage).toBe('lanes');expect((await state(page)).loadout.nodes).toEqual([]);
 expect((await state(page)).bossHitboxes.core.y).toBeGreaterThan(200);await page.screenshot({path:info.outputPath('regulator-core-hitboxes.png')});
});

test('floor fire strikes the robot armor even when the chest core is open',async({page},info)=>{
 test.setTimeout(45000);await encounter(page,{mission:'reactor',room:'M5D',reduced:true});await climbBossPlatform(page);
 await page.keyboard.down('d');await x(page,330);await page.keyboard.up('d');await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.player?.vy===0&&s.player.y+22>318;});
 await page.keyboard.down('j');await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.boss.pattern.phase==='core'&&s.audioStatus.played.hit_armour>0;});
 expect((await state(page)).bossHp).toBe(32);await page.keyboard.up('j');await page.screenshot({path:info.outputPath('regulator-floor-armor-reduced.png')});
});
