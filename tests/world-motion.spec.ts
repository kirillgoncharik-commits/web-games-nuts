import {test,expect,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {motionRigs} from '../games/cinder-shift/src/art/motion-atlas';
import type {PlayableMissionId} from '../games/cinder-shift/src/session/missions';

// Compare pixels from the actual Phaser renderer, rather than the SVG preview.
// This fixed background crop excludes the HUD, player and lower gameplay signals.
async function capture(page:Page){
 const frame=await page.evaluate(()=>(window as any).__ENCOUNTER__.capture());
 const png=Buffer.from(frame.png.split(',')[1],'base64');
 const pixels=await sharp(png).extract({left:416,top:65,width:160,height:104}).raw().toBuffer();
 return{png,hash:createHash('sha256').update(pixels).digest('hex')};
}
async function advance(page:Page,ms:number){
 const before=(await state(page)).simMs;
 await page.waitForFunction(({before,ms})=>(window as any).__CINDER__().simMs>=before+ms,{before,ms});
}
for(const rig of motionRigs)test(`${rig.mission} rendered art moves, freezes on pause and respects the real reduced-motion setting`,async({page},info)=>{
 test.setTimeout(45000);
 // One labelled room entry; no clock, position or graphics mutations afterwards.
 await encounter(page,{mission:rig.mission as PlayableMissionId,room:rig.mission+'-A',cleared:true});
 const before=await capture(page);await advance(page,640);const moving=await capture(page);
 expect(moving.hash,'the installed rig must change rendered pixels').not.toBe(before.hash);
 await page.locator('#hud-pause').click();const pausedAt=(await state(page)).simMs;
 const paused=await capture(page);await page.waitForTimeout(320);const pausedAgain=await capture(page);
 expect((await state(page)).simMs).toBe(pausedAt);expect(pausedAgain.hash).toBe(paused.hash);
 await page.getByTestId('pause-settings').click();await page.locator('#reduced-motion').check();
 await page.getByTestId('settings-back').click();await page.getByTestId('resume').click();
 await advance(page,100);const reduced=await capture(page);const reducedAt=(await state(page)).simMs;
 await advance(page,640);const reducedAgain=await capture(page);
 expect((await state(page)).simMs).toBeGreaterThan(reducedAt);
 expect(reducedAgain.hash,'static resting art while gameplay time still advances').toBe(reduced.hash);
 expect((await state(page)).settings.reducedMotion).toBe(true);expect((await state(page)).hp).toBe(6);
 await writeFile(info.outputPath(rig.mission+'-normal.png'),moving.png);
 await writeFile(info.outputPath(rig.mission+'-reduced.png'),reduced.png);
 await writeFile(info.outputPath(rig.mission+'-motion.json'),JSON.stringify({rig:rig.id,fixture:'one cleared entry; trusted pause and settings UI; pixels captured from Phaser',before:before.hash,moving:moving.hash,paused:paused.hash,pausedAgain:pausedAgain.hash,reduced:reduced.hash,reducedAgain:reducedAgain.hash,pausedAt,reducedAt,final:await state(page)},null,2));
});
