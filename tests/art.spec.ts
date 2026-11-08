import {test,expect} from '@playwright/test';
import {miraRigPose} from '../games/cinder-shift/src/art/rig';
import assets from '../games/cinder-shift/src/art/assets.generated.json' with {type:'json'};

test('M03 rig preserves every sampled M02 leg position and muzzle anchor',()=>{
  for(let now=0;now<6000;now+=7)for(const vx of [0,5,6,-115])for(const crouch of [true,false]){
    const feet=320,step=Math.sin(now/75)*3*(Math.abs(vx)>5?1:0),q=Math.round(step),p=miraRigPose(now,vx,feet,crouch);
    expect([p.frontLegY,p.frontLegHeight,p.backLegY,p.backLegHeight,p.frontBootY,p.backBootY]).toEqual([feet-12+q,12-q,feet-12-q,12+q,feet-4+q,feet-4-q]);
    expect(p.height).toBe(crouch?26:44);
  }
  expect(assets.frames['mira-cutter'].muzzle).toEqual([21,4]);
  expect(assets.frames.walker.muzzle!.map((v,i)=>v-assets.frames.walker.foot![i])).toEqual([17,-32]);
  expect(assets.frames.drone.muzzle).toEqual(assets.frames.drone.pivot);
});

test('raster assets load locally, HUD stays legible, poses and debug are separate',async({page},info)=>{
  const errors:string[]=[];const missing:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{
    // Linux software WebGL reports screenshot readback stalls; keep asset/CSP warnings fatal.
    const screenshotReadback=/^\[\.WebGL-0x[0-9a-f]+\]GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/i;
    if(m.type()==='error'||(m.type()==='warning'&&!screenshotReadback.test(m.text())))errors.push(m.text());
  });page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('/games/cinder-shift/');await page.getByTestId('training').click();
  await page.waitForFunction(()=>Boolean((window as any).__CINDER__().player));
  await page.locator('#viewport').screenshot({path:info.outputPath('room-a-1x.png')});
  await page.keyboard.down('s');await page.waitForTimeout(100);await page.locator('#viewport').screenshot({path:info.outputPath('crouching.png')});await page.keyboard.up('s');
  await expect(page.locator('#hp-segments i')).toHaveCount(6);expect(await page.locator('#hp-value').innerText()).toBe('6/6');
  expect(await page.locator('#hud').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  const pause=await page.locator('#hud-pause').boundingBox();expect(pause!.width).toBeGreaterThanOrEqual(48);expect(pause!.height).toBeGreaterThanOrEqual(48);
  await page.locator('#settings-open').click();await page.locator('.technical summary').click();await page.locator('#debug-bodies').check();await page.getByTestId('settings-back').click();await page.getByTestId('resume').click();await page.locator('#viewport').screenshot({path:info.outputPath('body-overlay.png')});await page.locator('#settings-open').click();await page.locator('.technical summary').click();await page.locator('#debug-bodies').uncheck();await page.getByTestId('settings-back').click();await page.getByTestId('resume').click();
  expect(errors).toEqual([]);expect(missing).toEqual([]);
});

test('phone UI uses readable text, real touch regions, and a recoverable asset error',async({browser},info)=>{
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2,locale:'ru-RU'});const page=await context.newPage();
  await page.goto('/games/cinder-shift/');await page.getByTestId('training').tap();await page.waitForFunction(()=>Boolean((window as any).__CINDER__().player));
  await page.screenshot({path:info.outputPath('phone-a.png')});
  for(const selector of ['#hud','#objective','.touch-controls button span'])expect(await page.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  for(const box of await page.locator('#touch-controls button:not([hidden]),#hud-pause').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,x:r.x,right:r.right};}))){expect(box.w).toBeGreaterThanOrEqual(48);expect(box.h).toBeGreaterThanOrEqual(48);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(844);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(844);
  await page.locator('#hud-pause').tap();await expect(page.locator('[data-action=right]')).toBeDisabled();await page.screenshot({path:info.outputPath('phone-pause.png')});
  await context.close();
  const broken=await browser.newPage({locale:'ru-RU'});await broken.route('**/assets/m03/*.png',route=>route.abort());await broken.goto('/games/cinder-shift/');await expect(broken.getByRole('heading',{name:'Нужен перезапуск'})).toBeVisible();await expect(broken.getByRole('button',{name:'Повторить загрузку'})).toBeVisible();await broken.close();
});
