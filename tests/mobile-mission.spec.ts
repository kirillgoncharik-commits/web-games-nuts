import {airlockExtension,airlockDriver} from './airlock-gameplay';
import {nativeTouch} from './native-touch';
import {test,expect,Page} from '@playwright/test';
import {seedsForPlans} from '../games/cinder-shift/src/session/events';
const state=(page:Page)=>page.evaluate(()=>(window as any).__CINDER__());
test('complete mission with native touch input and at most two touches',async({browser},info)=>{
  test.setTimeout(180000);
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'ru-RU'});const page=await context.newPage();const cdp=await context.newCDPSession(page);
  async function dead(id:string){await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id===id)?.hp,{timeout:10000}).toBe(0);}
  await page.goto('/games/cinder-shift/?seed='+seedsForPlans().none);await page.getByTestId('new-shift').tap();await page.getByTestId('map-prepare').tap();await page.getByTestId('briefing').tap();if(await page.getByTestId('skip-arrival').isVisible())await page.getByTestId('skip-arrival').tap();await expect.poll(async()=>Boolean((await state(page)).player)).toBe(true);await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.simMs>0&&s.player?.vy===0;});
  const touch=await nativeTouch(page,cdp),action=touch.action,driver=airlockDriver(page,action),jump=driver.jump,moveTo=driver.move;
  await jump(143,242);await moveTo(294);await action('crouch',true);await moveTo(442);await action('crouch',false);await expect.poll(async()=>(await state(page)).combatRemaining).toBe(0);
  await moveTo(546);await action('interact',true);await page.waitForTimeout(80);await action('interact',false);await expect.poll(async()=>(await state(page)).powered).toBe(true);
  await action('right',true);await page.waitForFunction(()=>(window as any).__CINDER__().transition);await action('right',false);await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.room==='B'&&s.state==='playing'&&s.player?.x<100;});
  await jump(194,350);await dead('b-walker');await dead('b-drone');await jump(492,556);await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return p?.vy===0&&p.y+22>303;});
  if((await state(page)).hp<(await state(page)).maxHp){await action('interact',true);await expect.poll(async()=>(await state(page)).state).toBe('event');await action('interact',false);await page.getByTestId('event-repair').tap();await page.getByTestId('confirm-event').tap();}
  await airlockExtension(page,action);
  await jump(130,224);await action('crouch',true);await dead('c-walker-1');await action('crouch',false);
  await jump(318,368);await dead('c-drone');await moveTo(408);await dead('c-walker-2');
  await jump(492,556);await page.waitForFunction(()=>(window as any).__CINDER__().player?.vy===0);await action('interact',true);await expect.poll(async()=>(await state(page)).objective).toBe(true);await action('interact',false);
  await page.screenshot({path:info.outputPath('mobile-power.png')});await action('right',true);await expect.poll(async()=>(await state(page)).state).toBe('complete');await action('right',false);
  expect(touch.maxTouches()).toBeLessThanOrEqual(2);expect((await state(page)).campaign.result).toMatchObject({result:"victory",hp:expect.any(Number)});expect((await state(page)).campaign.result.hp).toBeGreaterThan(0);await context.close();
});

test('movement stays comparable at real 30 and 60 render limits, including a long frame',async({page})=>{
  const distances:number[]=[];
  for(const fps of [30,60]){
    await page.goto(`/games/cinder-shift/?fps=${fps}`);await page.getByTestId('training').click();await expect.poll(async()=>Boolean((await state(page)).player)).toBe(true);const before=await state(page);
    await page.keyboard.down('d');await page.waitForTimeout(450);await page.keyboard.up('d');await page.waitForTimeout(100);const after=await state(page);distances.push(after.player.x-before.player.x);
    const sim=after.simMs;await page.evaluate(()=>{const start=performance.now();while(performance.now()-start<180){/* simulate a long frame */}});await page.waitForTimeout(100);const end=await state(page);expect(end.simMs-sim).toBeGreaterThan(180);expect(end.simMs-sim).toBeLessThan(450);expect(end.state).toBe('playing');
  }
  expect(Math.abs(distances[0]-distances[1])).toBeLessThan(7);
});
