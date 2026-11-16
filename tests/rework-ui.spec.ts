import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {state,startMission,roomA,x} from './helpers';

test.afterEach(async({page},info)=>{
 if(info.status===info.expectedStatus||page.isClosed())return;
 const snapshot=await state(page).catch(error=>({snapshot_error:String(error)}));
 console.log('Encounter failure state',JSON.stringify({state:snapshot.state,room:snapshot.room,hp:snapshot.hp,player:snapshot.player,audioStatus:snapshot.audioStatus,probe:await page.evaluate(()=>(window as any).__AUDIO_PROBE__||[])}));
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

for(const size of [{width:1440,height:900},{width:390,height:844},{width:667,height:300}])for(const locale of ['ru','en'])test(`ART-01 robot and glow stay clear of controls, ${size.width}x${size.height} ${locale}`,async({page},info)=>{
 await page.setViewportSize(size);await page.goto('/games/cinder-shift/');await expect(page.getByTestId('new-shift')).toBeVisible();
 await page.getByTestId('menu-settings').click();await page.getByTestId('locale').selectOption(locale);await page.getByTestId('settings-back').click();
 const inspect=async()=>{
  await expect(page.getByTestId('menu-art')).toBeVisible();await expect(page.getByTestId('menu-robot-glow')).toBeVisible();
  const result=await page.locator('.main-menu').evaluate(panel=>{
   const svg=panel.querySelector('svg')!,matrix=svg.getScreenCTM()!;
   const p=(x:number,y:number)=>{const point=svg.createSVGPoint();point.x=x;point.y=y;return point.matrixTransform(matrix);};
   const top=p(980,85),bottom=p(1385,875),robot={left:top.x,top:top.y,right:bottom.x,bottom:bottom.y};
   const overlaps=[...panel.querySelectorAll(':scope>header,:scope>.panel-content,:scope>.panel-actions')].some(el=>{const r=el.getBoundingClientRect();return r.left<robot.right&&r.right>robot.left&&r.top<robot.bottom&&r.bottom>robot.top;});
   const buttons=[...panel.querySelectorAll('button')].map(el=>{const r=el.getBoundingClientRect();return {id:el.id,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,clickable:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
   const image=svg.querySelector('image')!;return {robot,overlaps,buttons,artWidth:svg.clientWidth,href:image.getAttribute('href'),horizontalOverflow:panel.scrollWidth>panel.clientWidth+1};
  });
  console.log('Menu geometry',JSON.stringify({size,locale,...result}));
  expect(result.robot.left).toBeGreaterThan(0);expect(result.robot.top).toBeGreaterThan(0);expect(result.robot.right).toBeLessThan(size.width);expect(result.robot.bottom).toBeLessThan(size.height);
  expect(result.overlaps).toBe(false);expect(result.horizontalOverflow).toBe(false);expect(result.buttons.every(b=>b.inside&&b.clickable)).toBe(true);
  const response=await page.request.get('/games/cinder-shift/'+result.href);expect(response.ok()).toBe(true);return result;
 };
 const normal=await inspect();await page.screenshot({path:info.outputPath('menu-normal.png')});
 await page.getByTestId('menu-settings').click();await page.locator('#reduced-motion').check();await page.locator('#reduced-flashes').check();await page.locator('#effects-intensity').focus();await page.locator('#effects-intensity').press('Home');await page.getByTestId('settings-back').click();
 const reduced=await inspect();await page.screenshot({path:info.outputPath('menu-reduced.png')});
 // Reduced settings must preserve the readable silhouette, not identical SVG grid sizing.
 for(const view of [normal,reduced]){expect(view.robot.right-view.robot.left).toBeGreaterThanOrEqual(72);expect(view.robot.bottom-view.robot.top).toBeGreaterThanOrEqual(150);}await writeFile(info.outputPath('menu-art-evidence.json'),JSON.stringify({size,locale,normal,reduced},null,2));
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
 await expect(page.getByTestId('workshop-menu')).toHaveCount(0);
 const prepared=(await state(page)).campaign;await page.getByTestId('research-close').click();
 await expect(page.getByTestId('continue')).toBeVisible();await page.getByTestId('continue').click();
 expect((await state(page)).campaign).toEqual(prepared);await expect(page.getByTestId('briefing')).toBeVisible();
});

test('arrival is immediately skippable and the first live enemy opens the powered exit',async({page},info)=>{
 test.setTimeout(45000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await startMission(page);expect((await state(page)).arrivalMs).toBeLessThan(6500);
 expect((await state(page)).combatRemaining).toBe(1);expect((await state(page)).exitOpen).toBe(false);
 await roomA(page);expect((await state(page)).room).toBe('B');
 await page.screenshot({path:info.outputPath('first-combat-complete.png')});expect(errors).toEqual([]);
});


import {encounter} from './encounter-helpers';
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


test('a real long-range shot alerts the Archive drone before the player reaches its activation line',async({page},info)=>{
 await encounter(page,{mission:'archive',room:'M4E'});
 await page.keyboard.down('Space');
 await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return p.vy<0&&p.y+22-28<250;});
 await page.keyboard.down('j');const start=(await state(page)).simMs;
 await page.waitForFunction(start=>(window as any).__CINDER__().simMs>=start+50,start);
 await page.keyboard.up('j');await page.keyboard.up('Space');
 await page.waitForFunction(()=>{const e=(window as any).__CINDER__().enemies[0];return e.hp===1&&e.active;});
 const s=await state(page),e=s.enemies[0];
 expect(s.player.x).toBeLessThan(e.activateX);expect(e.provoked).toBe(true);
 expect(e.phase).toBe('telegraph');expect(e.remaining).toBeGreaterThan(0);expect(e.warnings).toBe(1);
 expect(s.audioStatus.played.warn_drone).toBeGreaterThan(0);expect(s.hp).toBe(6);
 await page.screenshot({path:info.outputPath('distant-hit-drone-warning.png')});
});


test('the first press has a base-suit landing pocket that stays safe through a complete machine cycle',async({page},info)=>{
 await encounter(page,{mission:'foundry',room:'M3J'});
 await page.keyboard.down('d');await x(page,106);await page.keyboard.down('Space');await x(page,200);
 await page.keyboard.up('d');await page.keyboard.up('Space');
 await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return p?.vy===0&&Math.abs(p.vx)<1&&p.y+22>318;});
 const start=await state(page),press=start.hazards.find((h:any)=>h.id==='m3j-press-a');
 expect(start.player.x-11).toBeGreaterThan(176);expect(start.player.x+11).toBeLessThan(press.x);expect(start.hp).toBe(6);
 await page.waitForFunction(before=>(window as any).__CINDER__().simMs>=before+6100,start.simMs);
 const end=await state(page);expect(end.hp).toBe(6);expect(end.player.y+22).toBeCloseTo(320,0);
 await page.screenshot({path:info.outputPath('first-press-safe-landing.png')});
});
