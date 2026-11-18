import {test,expect,type Page} from '@playwright/test';
import {state,roomA,x} from './helpers';
import {airlockDriver} from './airlock-gameplay';
import {installMediaCapture,startMedia,finishMedia} from './runtime-media';
import {writeFile} from 'node:fs/promises';

test.afterEach(async({page},info)=>{
 if(info.status!==info.expectedStatus)console.error('C01 failure state',JSON.stringify({url:page.url(),state:await state(page).catch(()=>null),body:await page.locator('body').innerText().catch(()=>null)}));
});

async function start(page:Page,variant:'a'|'b',navigate=true){
 if(navigate)await page.goto(`/${variant}/games/cinder-shift/?seed=4`);
 await page.getByTestId('new-shift').click();
 if(await page.getByTestId('confirm-new').isVisible())await page.getByTestId('confirm-new').click();
 await page.getByTestId('map-prepare').click();await page.getByTestId('briefing').click();await page.getByTestId('skip-arrival').click();
 await expect.poll(async()=>(await state(page)).state).toBe('playing');
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.room==='A'&&s.player?.vy===0;});
}
for(const variant of ['a','b'] as const)test(`${variant.toUpperCase()}: ordinary menu, first gate, next room and reload`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const media=process.env.CINDER_C01_MEDIA==='1';if(media)await installMediaCapture(page);
 await start(page,variant);expect((await state(page)).playtest.active).toBe(variant==='b');
 if(variant==='b')await expect(page.locator('#objective')).toContainText('питание');
 await page.screenshot({path:info.outputPath(`${variant}-entry.png`)});
 if(media)await startMedia(page);
 await roomA(page);const s=await state(page);
 expect(s.hp).toBeGreaterThan(0);expect(s.playtest.active).toBe(false);
 expect(s.eventLog.filter((e:any)=>e.name==='playtest_gate')).toHaveLength(1);
 expect(s.eventLog.find((e:any)=>e.name==='playtest_gate').params.active_ms).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath(`${variant}-gate.png`)});
 if(media)console.log('C01 audible clip',variant,JSON.stringify(await finishMedia(page,info,variant+'-first-gate')));
 await writeFile(info.outputPath(variant+'-observations.json'),JSON.stringify({variant,build:s.buildMetadata,loadMs:s.loadMs,timeToMenuMs:s.timeToMenuMs,fps:s.fps,gate:s.eventLog.find((e:any)=>e.name==='playtest_gate'),viewport:page.viewportSize()},null,2));
 // One real traversal inside the next room proves physics and base combat still run.
 const driver=airlockDriver(page);await driver.jump(194,350);expect((await state(page)).room).toBe('B');expect((await state(page)).player.x).toBeGreaterThan(340);
 await page.keyboard.press('Escape');await expect.poll(async()=>(await state(page)).state).toBe('paused');
 await page.reload();await page.getByTestId('continue').click();
 await expect(page.getByTestId('restart-entry')).toBeVisible();await page.getByTestId('restart-entry').click();
 await expect.poll(async()=>(await state(page)).state).toBe('playing');
 expect((await state(page)).room).toBe('A');expect(errors).toEqual([]);
});

test('B: real combat death and retry restore the experimental encounter',async({page})=>{
 await start(page,'b');
 await page.keyboard.down('d');await x(page,143);await page.keyboard.down('Space');await x(page,242);await page.keyboard.up('Space');await x(page,294);await page.keyboard.up('d');
 await page.keyboard.down('s');await page.keyboard.down('d');await x(page,442);await page.keyboard.up('d');await page.keyboard.up('s');
 await airlockDriver(page).move(472);
 await expect.poll(async()=>(await state(page)).state,{timeout:20000}).toBe('dead');
 const dead=await state(page);expect(dead.hp).toBe(0);
 await page.getByTestId('retry').click();
 await expect.poll(async()=>{const s=await state(page);return s.state==='playing'&&s.attemptId!==dead.attemptId;}).toBe(true);
 const fresh=await state(page);expect(fresh.hp).toBe(fresh.maxHp);expect(fresh.room).toBe('A');expect(fresh.playtest.active).toBe(true);expect(fresh.playtest.repairUsed).toBe(false);expect(fresh.enemies.every((e:any)=>e.hp>0)).toBe(true);
});

test('B: landscape native multitouch and reduced effects fit both layouts',async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,locale:'ru-RU'});
 try{
  const page=await context.newPage(),client=await context.newCDPSession(page);
  await page.goto('/b/games/cinder-shift/?seed=4');
  for(const layout of ['dock','sides']){
   await page.getByTestId('menu-settings').tap();await page.locator('#touch-mode').selectOption('on');await page.locator('#touch-layout').selectOption(layout);
   await page.locator('#autofire').uncheck();await page.locator('#reduced-motion').check();await page.locator('#reduced-flashes').check();await page.getByTestId('settings-back').tap();
   await start(page,'b',false);
   const before=await state(page);expect(before.playtest.active).toBe(true);expect(before.settings.reducedMotion).toBe(true);expect(before.settings.reducedFlashes).toBe(true);
   async function press(second:string){
    const points=await Promise.all(['right',second].map(async(action,id)=>{const box=(await page.locator(`[data-action="${action}"]`).boundingBox())!;expect(box.y+box.height).toBeLessThanOrEqual(390);return{id,x:box.x+box.width/2,y:box.y+box.height/2};}));
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
   }
   await press('fire');await expect.poll(async()=>(await state(page)).projectiles.filter((p:any)=>p.team==='player').length).toBeGreaterThan(0);await expect.poll(async()=>(await state(page)).player.x).toBeGreaterThan(before.player.x+8);
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const middle=await state(page);
   await press('jump');await expect.poll(async()=>(await state(page)).player.y).toBeLessThan(middle.player.y-12);await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
   await page.screenshot({path:info.outputPath('b-touch-'+layout+'.png')});
   await page.locator('#hud-pause').tap();await page.getByTestId('pause-menu').tap();
  }
 }finally{await context.close();}
});

test('A and B use independent databases and preview never sends production analytics',async({page})=>{
 const external:string[]=[];page.on('request',r=>{if(/google-analytics|googletagmanager/.test(r.url()))external.push(r.url());});
 await page.addInitScript(()=>localStorage.setItem('nuts_analytics_consent_v1','granted'));
 await test.step('create A progress',async()=>{await start(page,'a');console.log('C01 isolation: A started');});
 await test.step('B has no A progress',async()=>{
  await page.goto('/b/games/cinder-shift/?seed=4');await expect(page.getByTestId('new-shift')).toBeVisible();
  expect((await state(page)).campaign).toBe(null);console.log('C01 isolation: B is fresh');
 });
 await test.step('A retains its progress',async()=>{
  await page.goto('/a/games/cinder-shift/?seed=4');await expect(page.getByTestId('continue')).toBeVisible();
  expect(external).toEqual([]);console.log('C01 isolation: A retained');
 });
 await test.step('fresh profile resets A',async()=>{
  await page.locator('#playtest-reset').click({timeout:10000});console.log('C01 isolation: reset clicked');
  await expect(page.getByTestId('new-shift')).toBeVisible();expect((await state(page)).campaign).toBe(null);
 });
});
