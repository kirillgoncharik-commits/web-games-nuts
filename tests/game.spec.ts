import { test, expect, Page } from '@playwright/test';
async function snapshot(page: Page) { return page.evaluate(() => (window as any).__CINDER__()); }
async function start(page: Page) {
  await page.goto('/games/cinder-shift/');
  if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches))await page.getByTestId('training').tap();else await page.getByTestId('training').click();
  await expect.poll(async()=> (await snapshot(page)).state).toBe('playing');
}
async function untilX(page: Page,x:number){await page.waitForFunction(x=>(window as any).__CINDER__().player.x>=x,x);}

test('keyboard completes the actual route and replay creates one room',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const bad:string[]=[];page.on('response',r=>{if(r.status()>=400)bad.push(`${r.status()} ${r.url()}`);});
  await page.goto('/games/cinder-shift/');
  await page.getByTestId('training').waitFor();
  await page.screenshot({path:info.outputPath('menu.png'),fullPage:true});
  await page.getByTestId('training').click();
  await page.keyboard.down('d');await untilX(page,143);
  await page.keyboard.down('Space');await untilX(page,240);await page.keyboard.up('Space');
  await untilX(page,294);await page.keyboard.up('d');
  await page.keyboard.down('s');await page.keyboard.down('d');await untilX(page,442);
  await page.keyboard.up('d');await page.keyboard.up('s');
  await expect.poll(async()=> (await snapshot(page)).player.crouching).toBe(false);
  await page.keyboard.down('j');await expect.poll(async()=> (await snapshot(page)).targetHp).toBe(0);await page.keyboard.up('j');
  await page.screenshot({path:info.outputPath('room.png'),fullPage:true});
  await page.keyboard.down('d');await untilX(page,546);await page.keyboard.up('d');
  await page.keyboard.press('e');await expect.poll(async()=> (await snapshot(page)).powered).toBe(true);
  await page.keyboard.down('d');await expect.poll(async()=> (await snapshot(page)).state).toBe('complete');await page.keyboard.up('d');
  await expect(page.getByRole('heading',{name:'Системы костюма в норме'})).toBeVisible();
  await page.getByTestId('retry').click();
  await expect.poll(async()=> (await snapshot(page)).activeScenes).toEqual(['Room']);
  expect((await snapshot(page)).targetHp).toBe(3);
  expect(errors).toEqual([]);expect(bad).toEqual([]);
});

test('focus pause freezes the world and requires explicit resume',async({page})=>{
  await start(page);await page.keyboard.down('d');await untilX(page,105);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('d');
  await expect.poll(async()=> (await snapshot(page)).state).toBe('paused');
  const before=await snapshot(page);await page.waitForTimeout(450);const after=await snapshot(page);
  expect(after.player).toEqual(before.player);expect(after.activeSeconds).toBe(before.activeSeconds);expect(after.audio).toBe('suspended');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));expect((await snapshot(page)).state).toBe('paused');
  await page.getByTestId('resume').click();
  await expect.poll(async()=> (await snapshot(page)).state).toBe('playing');
  await page.keyboard.press('Escape');await expect.poll(async()=> (await snapshot(page)).state).toBe('paused');
  await page.getByTestId('pause-menu').click();
  await page.getByTestId('training').click();expect((await snapshot(page)).targetHp).toBe(3);
});

test('crouch stays forced below roof; module hits solid wall',async({page})=>{
  await start(page);await page.keyboard.down('d');await untilX(page,143);await page.keyboard.down('Space');await untilX(page,240);await page.keyboard.up('Space');await untilX(page,294);await page.keyboard.up('d');
  await page.keyboard.down('s');await page.keyboard.down('d');await untilX(page,363);await page.keyboard.up('d');await page.keyboard.up('s');
  await page.waitForTimeout(150);expect((await snapshot(page)).player.crouching).toBe(true);
  await page.keyboard.down('d');await untilX(page,442);await page.keyboard.up('d');await expect.poll(async()=> (await snapshot(page)).player.crouching).toBe(false);
  await page.keyboard.down('a');await page.keyboard.press('k');await page.waitForTimeout(220);await page.keyboard.up('a');
  expect((await snapshot(page)).player.x).toBeGreaterThanOrEqual(430);
});

test('iframe boots under site CSP, without external requests or storage access',async({page},info)=>{
  const origin=new URL(String(info.project.use.baseURL||'http://127.0.0.1:4175')).origin;const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith(origin+'/'))external.push(r.url());});
  await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('storage denied');}});Object.defineProperty(window,'indexedDB',{get(){throw new Error('storage denied');}});});
  await page.goto('/iframe-test.html');const frame=page.frameLocator('iframe');
  await frame.getByTestId('training').click();
  await expect(frame.locator('#pause')).toBeEnabled();
  expect(external).toEqual([]);
});

test('touch is cancel-safe, both layouts fit, portrait pauses',async({browser},info)=>{
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'ru-RU'});const page=await context.newPage();
  await start(page);const right=page.getByRole('button',{name:'Вправо',exact:true});
  const client=await context.newCDPSession(page),box=(await right.boundingBox())!;await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});await page.waitForTimeout(300);await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForTimeout(200);const x=(await snapshot(page)).player.x;expect(x).toBeGreaterThan(70);
  await page.waitForTimeout(200);expect(Math.abs((await snapshot(page)).player.x-x)).toBeLessThan(2);
  await expect(page.locator('.masthead')).toBeHidden();
  await page.screenshot({path:info.outputPath('mobile-dock.png')});
  await page.locator('#settings-open').tap();await page.locator('#touch-layout').selectOption('sides');await page.getByTestId('settings-back').tap();await page.getByTestId('resume').tap();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('mobile-sides.png')});
  await page.setViewportSize({width:390,height:844});await expect(page.getByText(/Поверните телефон/)).toBeVisible();expect((await snapshot(page)).state).toBe('paused');
  await page.setViewportSize({width:844,height:390});expect((await snapshot(page)).state).toBe('paused');
  await context.close();
});

test('gamepad actions use the same movement and pause path',async({page})=>{
  await page.addInitScript(()=>{
    (window as any).__pad={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[{connected:true,...(window as any).__pad}]});
  });
  await start(page);await page.evaluate(()=>(window as any).__pad.axes[0]=1);await untilX(page,115);
  expect((await snapshot(page)).device).toBe('gamepad');
  await page.evaluate(()=>{(window as any).__pad.axes[0]=0;(window as any).__pad.buttons[9].pressed=true;});
  await expect.poll(async()=> (await snapshot(page)).state).toBe('paused');
  await page.evaluate(()=>(window as any).__pad.buttons[9].pressed=false);await page.waitForTimeout(50);
  await page.evaluate(()=>(window as any).__pad.buttons[9].pressed=true);await expect.poll(async()=> (await snapshot(page)).state).toBe('playing');
});

test('failed game bundle offers a working reload',async({page})=>{
  await page.route('**/assets/*.js',route=>route.abort());
  await page.goto('/games/cinder-shift/');
  await expect(page.getByRole('heading',{name:'Нужен перезапуск'})).toBeVisible({timeout:18000});
  await page.unroute('**/assets/*.js');
  await page.getByRole('button',{name:'Повторить загрузку',exact:true}).click();
  await expect(page.getByTestId('training')).toBeVisible();
});

test('graphics context loss explains that restart resets the mission',async({page})=>{
  await start(page);await page.locator('#game canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(page.getByText(/Браузер потерял графический контекст/)).toBeVisible();await expect(page.getByRole('button',{name:'Повторить загрузку',exact:true})).toBeVisible();
});
