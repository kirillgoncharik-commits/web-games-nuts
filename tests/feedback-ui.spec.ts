import {test,expect} from '@playwright/test';
import {encounter} from './encounter-helpers';
import {state,x} from './helpers';
import {ground,to} from './route-helpers';
test.use({video:'on'});

for(const mode of ['base','shield','reduced'] as const)test(`real ram impact produces ${mode} feedback and pause clears the impulse`,async({page},info)=>{
 test.setTimeout(45000);
 await encounter(page,{mission:'foundry',room:'M3A',nodes:mode==='shield'?['D1','D2']:[],reduced:mode==='reduced'});
 await page.keyboard.down('d');await x(page,148);await page.keyboard.down('Space');await x(page,250);await page.keyboard.up('d');await page.keyboard.up('Space');await ground(page,320);
 await page.locator('#viewport').screenshot({path:info.outputPath(mode+'-before.png')});
 await page.waitForFunction(shield=>{const s=(window as any).__CINDER__();return shield?s.bufferUsed&&s.feedback.shieldAlpha>0:s.hp<s.maxHp&&(s.feedback.damageAlpha>0||s.settings.reducedMotion);},mode==='shield',{timeout:12000});
 const impact=await state(page);expect(impact.hp).toBe(mode==='shield'?8:5);
 if(mode==='shield'){expect(impact.feedback.damageAlpha).toBe(0);expect(impact.feedback.shieldAlpha).toBeGreaterThan(0);expect(impact.audioStatus.played.hurt_player||0).toBe(0);}
 if(mode==='reduced'){expect(impact.feedback.damageAlpha).toBe(0);expect(impact.feedback.offsetX).toBe(0);expect(impact.feedback.offsetY).toBe(0);}
 if(mode==='base'){expect(impact.feedback.damageAlpha).toBeGreaterThan(0);expect(impact.audioStatus.played.hurt_player).toBeGreaterThan(0);}
 await page.locator('#viewport').screenshot({path:info.outputPath(mode+'-impact.png')});await page.keyboard.press('Escape');
 await expect.poll(async()=>(await state(page)).state).toBe('paused');
 expect((await state(page)).feedback).toEqual({damageAlpha:0,shieldAlpha:0,repairAlpha:0,offsetX:0,offsetY:0});
 await page.getByTestId('resume').click();expect((await state(page)).feedback.damageAlpha).toBe(0);
});

test('effect intensity persists through settings and a full reload',async({page})=>{
 await page.goto('/games/cinder-shift/');await page.getByTestId('menu-settings').click();
 await page.locator('#effects-intensity').focus();await page.keyboard.press('Home');await page.keyboard.press('Tab');
 await expect.poll(async()=>(await state(page)).settings.effectsIntensity).toBe(0);
 await page.getByTestId('settings-back').click();await page.reload();
 await expect.poll(async()=>(await state(page)).settings.effectsIntensity).toBe(0);
});

test('repair removes critical HP and Retry clears all temporary effects',async({page})=>{
 await encounter(page,{mission:'reactor',room:'M5C',hp:1});await expect(page.locator('#critical-vignette')).toBeVisible();
 await to(page,120);await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.hp===3&&s.feedback.repairAlpha>0;});
 await expect(page.locator('#critical-vignette')).toBeHidden();expect((await state(page)).feedback.damageAlpha).toBe(0);
 await page.keyboard.press('Escape');await page.getByTestId('pause-menu').click();await page.getByTestId('continue').click();await page.getByTestId('restart-entry').click();
 await expect.poll(async()=>(await state(page)).hp).toBe(6);expect((await state(page)).feedback).toEqual({damageAlpha:0,shieldAlpha:0,repairAlpha:0,offsetX:0,offsetY:0});
 await expect(page.locator('#critical-vignette')).toBeHidden();
});
