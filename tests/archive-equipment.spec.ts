import {test,expect} from '@playwright/test';
import config from '../games/cinder-shift/game.config.json' with {type:'json'};
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {ground,to,jump,next,until} from './route-helpers';
import {archiveCampaignSeed} from './archive-seeds';

test('a base-suit shelf climb collects the physical carrier and opens its room gate',async({page},info)=>{
 await encounter(page,{mission:'archive',room:'M4E',cleared:true});
 expect((await state(page)).exitOpen).toBe(false);
 await jump(page,114,172);await ground(page,288);await jump(page,178,292);await ground(page,256);
 await jump(page,326,432);await ground(page,224);await page.keyboard.press('e');
 await expect.poll(async()=>(await state(page)).archiveCarrierCollected).toBe(true);
 expect((await state(page)).exitOpen).toBe(true);
 await page.screenshot({path:info.outputPath('archive-carrier-collected.png')});
});

test('the real E05 scout choice opens the next physical screen and lengthens an actual warning',async({page},info)=>{
 await encounter(page,{mission:'archive',room:'M4B',seed:archiveCampaignSeed(true),hp:4,cleared:true,archiveState:{carrier:true}});
 await jump(page,114,208);await ground(page,320);await to(page,476);await page.keyboard.press('e');
 await page.getByTestId('event-scout').click();await page.getByTestId('confirm-event').click();
 await expect.poll(async()=>(await state(page)).scoutedArchive).toBe(true);
 expect((await state(page)).roomStates.M4B.cacheUsed).toBe(true);
 await next(page,'M4F',552);
 expect((await state(page)).solids.some((s:any)=>s.id==='archive-scout-screen')).toBe(false);
 await jump(page,114,208);await ground(page,320);await page.keyboard.down('d');
 await until(page,()=>{const e=(window as any).__CINDER__().enemies[0];return e.phase==='telegraph';},null,'scouted warning');await page.keyboard.up('d');
 const s=await state(page);expect(s.enemyTelegraphScale).toBe(1.5);
 expect(s.enemies[0].remaining).toBeGreaterThan(config.combat.walker.telegraph_ms);
 await page.screenshot({path:info.outputPath('archive-scout-warning.png')});
});

test('a carrier without upload power cannot transmit or open the service exit',async({page})=>{
 await encounter(page,{mission:'archive',room:'M4C',archiveState:{carrier:true}});
 await jump(page,226,324);await ground(page,320);await to(page,550);
 const before=(await state(page)).simMs;await page.keyboard.down('e');
 await until(page,start=>(window as any).__CINDER__().simMs>=start+800,before,'unpowered upload');await page.keyboard.up('e');
 const s=await state(page);expect(s.dataUploaded).toBe(false);expect(s.exitOpen).toBe(false);expect(s.powered).toBe(false);
});

test('real upload enables the one-use R04 repair only after transmission',async({page},info)=>{
 // Entry represents carrier and power acquired earlier; full route tests perform both.
 await encounter(page,{mission:'archive',room:'M4C',hp:4,archiveState:{carrier:true,power:true}});
 await jump(page,226,324);await ground(page,320);await to(page,512);await page.keyboard.press('e');
 expect((await state(page)).hp).toBe(4);await expect(page.getByTestId('event-repair')).toHaveCount(0);
 await to(page,550);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().dataUploaded,null,'archive transmission');await page.keyboard.up('e');
 await to(page,512);await ground(page,320);await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();
 await expect.poll(async()=>(await state(page)).hp).toBe(6);expect((await state(page)).roomStates.M4C.repairUsed).toBe(true);
 await page.keyboard.press('e');await expect(page.getByTestId('event-repair')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('archive-upload-r04-used.png')});
});
