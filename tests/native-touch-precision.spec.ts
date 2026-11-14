import {test,expect} from '@playwright/test';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {nativeTouch} from './native-touch';
import {airlockDriver} from './airlock-gameplay';

for(const viewport of [{width:844,height:390},{width:390,height:844}])test(`native shelf climb tolerates 80 ms input delay at ${viewport.width}x${viewport.height}`,async({browser},info)=>{
 test.setTimeout(60000);
 const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,locale:'ru-RU'}),page=await context.newPage(),cdp=await context.newCDPSession(page);
 try{
  await encounter(page,{mission:'airlock',room:'M1A'});
  const touch=await nativeTouch(page,cdp,80),driver=airlockDriver(page,touch.action);
  await driver.jump(114,172);await driver.ground(288);await driver.jump(178,292);await driver.ground(256);
  expect((await state(page)).hp).toBeGreaterThan(0);expect(touch.maxTouches()).toBe(2);
  await page.screenshot({path:info.outputPath('touch-shelf.png')});
  console.log('Native touch shelf report',JSON.stringify({source:(await state(page)).sha,viewport,transport_delay_ms:80,max_touches:touch.maxTouches(),player:(await state(page)).player}));
 }finally{await context.close();}
});
