import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {encounter} from './encounter-helpers';
import {state} from './helpers';

test.use({video:'on'});
const sectors=[['airlock','A'],['cargo','M2C'],['foundry','M3E'],['archive','M4H'],['reactor','M5D']] as const;
for(const [mission,room] of sectors)for(const reduced of [false,true])test(`RW2 presentation ${mission} ${reduced?'reduced':'normal'}`,async({page},info)=>{
 test.setTimeout(45000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await encounter(page,{mission,room,reduced});
 const before=await state(page);
 const frames=await page.evaluate(()=>new Promise<number[]>(resolve=>{
  const samples:number[]=[];let last=performance.now();
  function sample(now:number){samples.push(now-last);last=now;if(samples.length>=120)resolve(samples.slice(10));else requestAnimationFrame(sample);}
  requestAnimationFrame(sample);
 }));
 await page.screenshot({path:info.outputPath('sector.png')});
 const after=await state(page);
 await page.keyboard.press('Escape');
 await expect.poll(async()=>(await state(page)).state).toBe('paused');
 const paused=await state(page);await page.waitForTimeout(150);
 expect((await state(page)).simMs).toBe(paused.simMs);
 expect(errors).toEqual([]);expect(after.hp).toBe(before.hp);
 const sorted=frames.slice().sort((a,b)=>a-b);
 await writeFile(info.outputPath('measurement.json'),JSON.stringify({mission,room,reduced,browser:info.project.name,viewport:page.viewportSize(),seed:4,cache:'warm',cpu:'native; unthrottled',frames:frames.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],snapshot:after},null,2));
});

for(const width of [1280,667,390])test(`RW2 map and workshop input ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===667?375:844});
 await page.goto('/games/cinder-shift/?seed=4');await page.getByTestId('new-shift').click();
 const initial=(await state(page)).campaign;
 await page.getByTestId('map-pin-foundry').click();expect((await state(page)).campaign).toEqual(initial);
 await page.screenshot({path:info.outputPath('map.png')});await page.getByTestId('map-pin-airlock').click();
 await page.getByTestId('map-prepare').click();
 await page.screenshot({path:info.outputPath('workshop.png')});
 const targets=await page.locator('.map-pin,.module-inspect,.module-purchase,.workshop-buttons button').evaluateAll(els=>els.map(el=>({id:el.getAttribute('data-testid'),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
 expect(targets.every(t=>t.width>=48&&t.height>=48)).toBe(true);
 expect(await page.locator('.panel-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.getByTestId('buy-D1').click();await page.getByTestId('confirm-buy').dblclick();
 await expect.poll(async()=>(await state(page)).campaign.nodes).toEqual(['D1']);expect((await state(page)).campaign.points).toBe(0);
 await writeFile(info.outputPath('input.json'),JSON.stringify({targets,technicalLoadMs:(await state(page)).loadMs},null,2));
});
