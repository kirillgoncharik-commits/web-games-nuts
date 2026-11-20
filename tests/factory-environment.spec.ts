import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {jump,standingJump,to,ground} from './route-helpers';

test('factory first show offers the resource walkway and the stopped-belt shortcut at base movement',async({page},info)=>{
 test.setTimeout(45000);await encounter(page,{mission:'YU04',room:'YU04-A',cleared:true});
 const before=await state(page);expect(before.enemies.map((e:any)=>[e.kind,e.hp])).toEqual([['walker',0],['drone',0]]);
 await jump(page,124,176);await ground(page,288);await to(page,196);await ground(page,288);await standingJump(page,280);await ground(page,256);
 await to(page,328);await ground(page,256);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).roomStates['YU04-A'].cacheUsed).toBe(true);
 await page.screenshot({path:info.outputPath('factory-upper-walkway-A.png')});
 await to(page,568);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);
 const final=await state(page);expect(final.hp).toBe(6);expect(final.exitOpen).toBe(true);await page.screenshot({path:info.outputPath('factory-belt-stopped-B.png')});
 await writeFile(info.outputPath('factory-entry.json'),JSON.stringify({fixture:'one YU04-A entry; base jumps, salvage and far switch use ordinary keyboard',before,final},null,2));
});

for(const reduced of [false,true])test(`factory hoist requires its lowered contact and restores the far exit, ${reduced?'reduced':'normal'}`,async({page},info)=>{
 test.setTimeout(60000);await encounter(page,{mission:'YU04',room:'YU04-B',reduced});
 await to(page,112);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 await jump(page,124,176);await ground(page,288);await to(page,196);await ground(page,288);await standingJump(page,300);await ground(page,280);
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);await page.screenshot({path:info.outputPath('factory-hoist-feed.png')});
 await to(page,328);await ground(page,280);await standingJump(page,400);await ground(page,256);await standingJump(page,440);await ground(page,224);
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).roomStates['YU04-B'].cacheUsed).toBe(true);
 await to(page,480);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('A');
 expect((await state(page)).solids.some((r:any)=>r.id==='world-power:hoist-door-B')).toBe(false);
 await to(page,552);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(2);
 const final=await state(page);expect(final.hp).toBe(6);expect(final.exitOpen).toBe(true);await page.screenshot({path:info.outputPath('factory-hoist-exit.png')});
 await writeFile(info.outputPath('factory-hoist.json'),JSON.stringify({fixture:'one YU04-B entry; all subsequent hoist, salvage, switching and contact actions use ordinary keyboard',reduced,final},null,2));
});

test('factory distributor earns the upper feed and returns to its separate ground feed',async({page},info)=>{
 test.setTimeout(60000);await encounter(page,{mission:'YU04',room:'YU04-C',cleared:true});
 await to(page,112);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 await jump(page,124,184);await ground(page,288);await standingJump(page,264);await ground(page,288);await standingJump(page,340);await ground(page,244);
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);await page.screenshot({path:info.outputPath('factory-distributor-upper.png')});
 await to(page,432);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('A');
 await jump(page,452,552);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(2);
 const final=await state(page);expect(final.hp).toBe(6);expect(final.exitOpen).toBe(true);await page.screenshot({path:info.outputPath('factory-distributor-linked.png')});
 await writeFile(info.outputPath('factory-distributor.json'),JSON.stringify({fixture:'one cleared YU04-C entry for geometry; the complete C03 route retains the real scanner. Subsequent actions use ordinary keyboard.',final},null,2));
});

async function drivePixels(page:import('@playwright/test').Page){
 const frame=await page.evaluate(()=>(window as any).__ENCOUNTER__.capture());
 const png=Buffer.from(frame.png.split(',')[1],'base64');const pixels=await sharp(png).extract({left:416,top:65,width:160,height:104}).raw().toBuffer();
 return createHash('sha256').update(pixels).digest('hex');
}
for(const reduced of [false,true])test(`factory drive changes physical phases, stops after reset and secures the radio feed, ${reduced?'reduced':'normal'}`,async({page},info)=>{
 test.setTimeout(60000);await encounter(page,{mission:'YU04',room:'YU04-D',reduced});
 expect((await state(page)).worldPulse).toBe('safe');expect((await state(page)).solids.filter((r:any)=>r.id?.startsWith('world-phase:'))).toHaveLength(2);
 await to(page,112);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 await jump(page,124,184);await ground(page,288);await standingJump(page,256);await ground(page,288);
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);
 expect((await state(page)).worldPulse).toBe('warning');expect((await state(page)).solids.filter((r:any)=>r.id?.startsWith('world-phase:'))).toHaveLength(1);await page.screenshot({path:info.outputPath('factory-drive-first-warning.png')});
 await page.locator('#hud-pause').click();const paused=await state(page);await page.waitForTimeout(250);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).world).toEqual(paused.world);await page.getByTestId('resume').click();
 await standingJump(page,344);await ground(page,244);await to(page,416);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('A');await to(page,408);await ground(page,320);
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.worldPulse==='safe'&&s.worldPulseElapsed%4600<3400;});
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(2);
 expect((await state(page)).solids.some((r:any)=>r.id?.startsWith('world-phase:'))).toBe(false);expect((await state(page)).worldPulse).toBe('safe');
 const first=await drivePixels(page),now=(await state(page)).simMs;await page.waitForFunction(t=>(window as any).__CINDER__().simMs>=t+640,now);const stopped=await drivePixels(page);expect(stopped).toBe(first);await page.screenshot({path:info.outputPath('factory-drive-reset.png')});
 await to(page,416);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 await jump(page,432,520);await ground(page,320);await to(page,552);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(3);
 await to(page,584);await ground(page,320);await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);await page.keyboard.up('e');
 const final=await state(page);expect(final.hp).toBe(6);expect(final.world.ledger).toEqual(['drive:phase-0','drive:phase-1','drive:phase-2']);await page.screenshot({path:info.outputPath('factory-radio-feed-restored.png')});
 await writeFile(info.outputPath('factory-drive.json'),JSON.stringify({fixture:'one YU04-D entry; all later phase, pause, jump, reset and transmission actions use ordinary keyboard/UI. Native renderer pixels verify the stopped flywheel.',reduced,first,stopped,final},null,2));
});
