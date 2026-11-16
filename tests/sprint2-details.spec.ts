import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {encounter} from './encounter-helpers';
import {state,jump,x} from './helpers';
import {planEvents} from '../games/cinder-shift/src/session/events';
import {missionSeed} from '../games/cinder-shift/src/session/missions';

test('RW2 changing music volume cancels a pending warning restore',async({page},info)=>{
 await encounter(page,{mission:'airlock',room:'A'});
 const before=await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer({warning:true}));
 expect(before.context).toBe('running');expect(before.snapshot.played.warn_turret).toBeGreaterThan(0);
 await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer({musicVolume:0}));
 await page.waitForTimeout(650);
 const after=await page.evaluate(()=>(window as any).__ENCOUNTER__.audioMixer());
 expect(after.snapshot.levels.musicVolume).toBe(0);expect(after.gain).toBeLessThan(.00001);
 await writeFile(info.outputPath('actual-music-gain.json'),JSON.stringify({before,after},null,2));
});

test('RW2 actual rebound interact key appears in the objective',async({page})=>{
 await encounter(page,{mission:'airlock',room:'A'});
 await page.keyboard.press('Escape');await page.getByTestId('pause-settings').click();
 await page.getByTestId('rebind-interact').click();await page.keyboard.press('f');
 await expect(page.getByTestId('rebind-interact')).toHaveText('F');
 await page.getByTestId('settings-back').click();await page.getByTestId('resume').click();
 // One new entry establishes the same build with the saved Controls bindings.
 await page.evaluate(()=>(window as any).__ENCOUNTER__.start({mission:'airlock',room:'A',cleared:true}));
 await page.waitForFunction(()=>(window as any).__CINDER__().simMs>0);
 await page.keyboard.down('d');await x(page,143);await page.keyboard.down('Space');await x(page,242);await page.keyboard.up('Space');await x(page,294);await page.keyboard.up('d');
 await page.keyboard.down('s');await page.keyboard.down('d');await x(page,442);await page.keyboard.up('d');await page.keyboard.up('s');
 await page.keyboard.down('d');await x(page,550);await page.keyboard.up('d');
 await expect(page.locator('#hud-objective')).toContainText('F');
 await page.keyboard.press('f');await expect.poll(async()=>(await state(page)).powered).toBe(true);
});

test('RW2 full-HP R01 explains no repair and does not open a pointless modal',async({page})=>{
 let seed=0;while(planEvents(missionSeed(seed,'airlock'),'airlock').some(e=>e.event_id==='E03'))seed++;
 await encounter(page,{mission:'airlock',room:'B',cleared:true,seed,touch:true});
 await jump(page,194,350);await jump(page,496,556);
 await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return p?.vy===0&&p.y+22>303;});
 const before=await state(page);expect(before.hp).toBe(before.maxHp);
 await expect(page.locator('#hud-objective')).toContainText(/Ремонт не требуется|Repair not needed/);
 await expect(page.locator('#touch-context')).toBeDisabled();
 await page.keyboard.press('e');expect((await state(page)).state).toBe('playing');
 expect((await state(page)).containerUsed).toBe(false);
});

for(const width of [1280,667,390])test('RW2 challenge choices precede code tools '+width,async({page},info)=>{
 await page.setViewportSize({width,height:width===667?375:844});
 await page.goto('/games/cinder-shift/');await page.getByTestId('menu-challenges').click();
 const ids=['mode-time-attack','mode-score-attack','mode-daily','mode-relay'];
 const boxes=await Promise.all(ids.map(id=>page.getByTestId(id).boundingBox()));expect(boxes.every(b=>b&&b.width>=48&&b.height>=48)).toBe(true);
 expect(boxes.every(b=>b!.y>=0&&b!.y+b!.height<=page.viewportSize()!.height)).toBe(true);
 await expect(page.locator('#challenge-code')).toBeHidden();await page.getByTestId('challenge-codes-toggle').focus();await page.keyboard.press('Enter');await expect(page.locator('#challenge-code')).toBeVisible();await page.keyboard.press('Enter');await expect(page.locator('#challenge-code')).toBeHidden();
 await expect.poll(async()=>{const boxes=await Promise.all(ids.map(id=>page.getByTestId(id).boundingBox()));return boxes.every(b=>b&&b.y>=0&&b.y+b.height<=page.viewportSize()!.height);}).toBe(true);
 for(const id of ids)await expect(page.getByTestId(id).locator('small')).not.toBeEmpty();
 expect(await page.locator('.panel-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('challenges.png')});
});

test('RW2 technical readiness measures cold and warm navigation without intro wait',async({page},info)=>{
 const measurements=[];
 for(const cache of ['cold-context','warm-reload']){
  if(cache==='cold-context')await page.goto('/games/cinder-shift/');else await page.reload();
  await expect(page.getByTestId('new-shift')).toBeVisible();await expect.poll(async()=>(await state(page)).timeToMenuMs).not.toBeNull();
  const s=await state(page);expect(s.arrivalMs).toBe(0);expect(s.timeToMenuMs-s.technicalLoadMs).toBeLessThan(3000);
  measurements.push({cache,technicalLoadMs:s.technicalLoadMs,timeToMenuMs:s.timeToMenuMs,introVisibleMs:s.introVisibleMs});
 }
 console.log('CINDER_RW2_LOAD '+JSON.stringify(measurements));await writeFile(info.outputPath('cold-warm-load.json'),JSON.stringify(measurements,null,2));
});
