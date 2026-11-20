import {test,expect,type Page} from '@playwright/test';
import {startMission,state} from './helpers';
test.skip(process.env.CINDER_TARGET!=='playgama','Playgama build and controlled Bridge required');
const sdkScript=`
const rawGet=Storage.prototype.getItem.bind(localStorage),rawSet=Storage.prototype.setItem.bind(localStorage);
window.__BRIDGE_TEST={calls:[],events:{},violations:[],read:()=>JSON.parse(rawGet('pg:cinder-shift-records.v1')||'{}'),
 pause(){this.events.pause_state_changed(true)},resume(){this.events.pause_state_changed(false)},audio(value){this.events.audio_state_changed(value)}};
Storage.prototype.getItem=function(){window.__BRIDGE_TEST.violations.push('getItem');throw Error('direct storage forbidden')};
Storage.prototype.setItem=function(){window.__BRIDGE_TEST.violations.push('setItem');throw Error('direct storage forbidden')};
indexedDB.open=function(){window.__BRIDGE_TEST.violations.push('indexedDB');throw Error('direct storage forbidden')};
window.bridge={
 initialize:async()=>{},
 platform:{language:'en',isPaused:false,isAudioEnabled:true,sendMessage:async message=>{window.__BRIDGE_TEST.calls.push(message)},on(name,fn){window.__BRIDGE_TEST.events[name]=fn}},
 storage:{get:async(key,parse)=>{if(parse!==false)throw Error('raw envelope required');return rawGet('pg:'+key)},set:async(key,value)=>rawSet('pg:'+key,value)},
 advertisement:{isInterstitialSupported:true,interstitialState:'closed',rewardedState:'closed',showInterstitial(){window.__BRIDGE_TEST.events.interstitial_state_changed('failed')},on(name,fn){window.__BRIDGE_TEST.events[name]=fn}}
};
`;
test.beforeEach(async({page})=>{page.on('pageerror',error=>console.log('PAGEERROR',error.message));});
test.afterEach(async({page},info)=>{
 if(info.status===info.expectedStatus)return;
 const diagnostic=await page.evaluate(()=>{
  const s=(window as any).__CINDER__?.();return{state:s?.state,screen:s?.screen,platform:s?.platform,audio:s?.audioStatus,host:(window as any).__BRIDGE_TEST,body:document.body.innerText.slice(0,1800)};
 }).catch(error=>({diagnostic:String(error)}));
 console.log('BRIDGE_FAILURE',JSON.stringify(diagnostic));
});
async function mock(page:Page,body=sdkScript){await page.route('https://bridge.playgama.com/**/playgama-bridge.js',route=>route.fulfill({status:200,contentType:'text/javascript',body}));}
test('Bridge alone supplies locale and storage; game readiness and host pause follow actual play',async({page})=>{
 await mock(page);await page.goto('/games/cinder-shift/');await expect(page.getByTestId('new-shift')).toBeVisible();
 expect((await state(page)).locale).toBe('en');expect(await page.evaluate(()=>(window as any).__BRIDGE_TEST.calls)).toEqual(['game_ready']);
 await startMission(page,{locale:'en'});expect((await state(page)).platform.playing).toBe(true);
 await page.keyboard.down('d');await page.waitForTimeout(120);await page.evaluate(()=>(window as any).__BRIDGE_TEST.pause());
 const paused=await state(page);expect(paused.state).toBe('paused');expect(paused.platform.playing).toBe(false);expect(paused.audioStatus.hidden).toBe(true);
 await page.waitForTimeout(200);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).player).toEqual(paused.player);await page.keyboard.up('d');
 await page.evaluate(()=>(window as any).__BRIDGE_TEST.resume());await expect.poll(async()=>(await state(page)).state).toBe('playing');
 await page.locator('#hud-pause').click();await expect.poll(async()=>(await state(page)).state).toBe('paused');await page.evaluate(()=>{(window as any).__BRIDGE_TEST.pause();(window as any).__BRIDGE_TEST.resume()});expect((await state(page)).state).toBe('paused');
 expect(await page.evaluate(()=>(window as any).__BRIDGE_TEST.violations)).toEqual([]);
});
test('Bridge envelope restores purchased progress, with startup language always from Bridge',async({page})=>{
 await mock(page);await startMission(page,{locale:'ru',node:'W1'});await page.locator('#hud-pause').click();await expect.poll(async()=>(await state(page)).state).toBe('paused');await page.getByTestId('pause-menu').click();
 const before=await state(page);expect(before.campaign.nodes).toContain('W1');
 await expect.poll(()=>page.evaluate(()=>(window as any).__BRIDGE_TEST.read().records?.campaign?.campaign?.nodes||[])).toContain('W1');
 await page.reload();await expect(page.getByTestId('continue')).toBeVisible();const after=await state(page);
 expect(after.campaign.nodes).toContain('W1');expect(after.campaign.campaign_id).toBe(before.campaign.campaign_id);expect(after.save.available).toBe(true);expect(after.locale).toBe('en');
 expect(await page.evaluate(()=>(window as any).__BRIDGE_TEST.violations)).toEqual([]);
});
test('platform audio mute applies at startup, during play, and again after reload',async({page})=>{
 await mock(page,sdkScript.replace('isAudioEnabled:true','isAudioEnabled:false'));
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('new-shift')).toBeVisible();expect((await state(page)).audioStatus.hostMuted).toBe(true);
 await startMission(page,{locale:'en'});await page.evaluate(()=>(window as any).__BRIDGE_TEST.audio(true));await page.keyboard.press('d');
 await expect.poll(async()=>(await state(page)).audioStatus.ready).toBe(true);
 await page.evaluate(()=>(window as any).__BRIDGE_TEST.audio(false));const muted=await state(page);
 expect(muted.audioStatus.hostMuted).toBe(true);expect(muted.audioStatus.music).toBe(null);expect(muted.audioStatus.voices).toBe(0);
 await page.reload();await expect(page.getByTestId('continue')).toBeVisible();expect((await state(page)).audioStatus.hostMuted).toBe(true);
});
test('Bridge initialization failure shows retry and never reports game ready',async({page})=>{
 await mock(page,"window.bridge={initialize:async()=>{throw Error('offline')}};");
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('reload')).toBeVisible();const s=await state(page);
 expect(s.state).toBe('error');expect(s.platform.readySent).toBe(false);expect(s.platform.initialized).toBe(false);
});
