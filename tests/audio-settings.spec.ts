import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {encounter} from './encounter-helpers';
import {state} from './helpers';

test('zero music volume takes effect on a suspended audio clock and cannot restore the old warning level',async({page},info)=>{
 await encounter(page,{mission:'airlock',room:'A'});
 const warning=await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer({warning:true}));
 expect(warning.snapshot.played.warn_turret).toBeGreaterThan(0);
 const stopped=await page.evaluate(()=>(window as any).__ENCOUNTER__.audioClock('suspend'));
 await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer({musicVolume:0}));
 const zero=await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer());
 await writeFile(info.outputPath('zero-on-stopped-clock.json'),JSON.stringify({warning,stopped,zero},null,2));
 expect(zero.context).toBe('suspended');expect(zero.snapshot.levels.musicVolume).toBe(0);expect(zero.gain).toBeLessThan(.00001);
 await page.evaluate(()=>(window as any).__ENCOUNTER__.audioClock('resume'));await page.waitForTimeout(650);
 const resumed=await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer());expect(resumed.context).toBe('running');expect(resumed.gain).toBeLessThan(.00001);
 await writeFile(info.outputPath('zero-after-resume.json'),JSON.stringify({warning,stopped,zero,resumed},null,2));
});

test('the real music slider preserves silence through pause and warnings, then restores a chosen positive level',async({page},info)=>{
 await encounter(page,{mission:'airlock',room:'A'});await page.keyboard.press('Escape');await page.getByTestId('pause-settings').click();
 const slider=page.locator('#music-volume');await slider.focus();await page.keyboard.press('Home');await page.keyboard.press('Tab');
 await expect.poll(async()=>(await state(page)).settings.musicVolume).toBe(0);await page.getByTestId('settings-back').click();await page.getByTestId('resume').click();
 const warning=await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer({warning:true}));expect(warning.snapshot.played.warn_turret).toBeGreaterThan(0);await page.waitForTimeout(650);
 const silent=await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer());expect(silent.gain).toBeLessThan(.00001);expect(silent.snapshot.levels.musicVolume).toBe(0);
 await page.keyboard.press('Escape');await page.getByTestId('pause-settings').click();await slider.focus();await page.keyboard.press('End');await page.keyboard.press('Tab');
 await expect.poll(async()=>(await state(page)).settings.musicVolume).toBe(1);await page.getByTestId('settings-back').click();await page.getByTestId('resume').click();
 await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer({warning:true}));await page.waitForTimeout(650);
 const audible=await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer());expect(audible.gain).toBeGreaterThan(.9);expect(audible.snapshot.levels.musicVolume).toBe(1);
 await writeFile(info.outputPath('real-slider.json'),JSON.stringify({silent,audible,settings:(await state(page)).settings},null,2));
});
