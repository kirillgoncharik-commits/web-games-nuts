import {test,expect,type Page} from '@playwright/test';
import {startMission,state} from './helpers';
test.skip(process.env.CINDER_TARGET!=='yandex','Yandex build and SDK mock required');
const sdkScript=`
window.__HOST_TEST={calls:[],events:{},pause(){this.events.game_api_pause()},resume(){this.events.game_api_resume()}};
window.YaGames={init:async()=>({
 environment:{i18n:{lang:'en'}},
 features:{LoadingAPI:{ready(){window.__HOST_TEST.calls.push('ready')}},GameplayAPI:{start(){window.__HOST_TEST.calls.push('start')},stop(){window.__HOST_TEST.calls.push('stop')}}},
 getStorage:async()=>localStorage,
 on(name,fn){window.__HOST_TEST.events[name]=fn},
 adv:{showFullscreenAdv({callbacks}){window.__HOST_TEST.calls.push('ad');callbacks.onClose(false)}}
})};
`;
async function mock(page:Page,body=sdkScript){await page.route('**/sdk.js',route=>route.fulfill({status:200,contentType:'text/javascript',body}));}
test('host language, single ready and gameplay markup match the actual app state',async({page})=>{
 await mock(page);await page.goto('/games/cinder-shift/');
 await expect(page.getByTestId('new-shift')).toBeVisible();
 expect((await state(page)).locale).toBe('en');expect((await state(page)).platform.readySent).toBe(true);
 expect(await page.evaluate(()=>(window as any).__HOST_TEST.calls)).toEqual(['ready']);
 await startMission(page,{locale:'en'});expect((await state(page)).platform.playing).toBe(true);
 await page.keyboard.down('d');await page.waitForTimeout(120);
 await page.evaluate(()=>(window as any).__HOST_TEST.pause());
 const paused=await state(page);expect(paused.state).toBe('paused');expect(paused.audioStatus.hidden).toBe(true);expect(paused.platform.playing).toBe(false);
 await page.waitForTimeout(200);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).player).toEqual(paused.player);
 await page.keyboard.up('d');await page.evaluate(()=>(window as any).__HOST_TEST.resume());
 await expect.poll(async()=>(await state(page)).state).toBe('playing');
 await page.locator('#hud-pause').click();await expect.poll(async()=>(await state(page)).state).toBe('paused');await page.evaluate(()=>(window as any).__HOST_TEST.pause());await page.evaluate(()=>(window as any).__HOST_TEST.resume());
 expect((await state(page)).state).toBe('paused');expect((await state(page)).platform.playing).toBe(false);
});
test('host storage restores workshop progress and an intentional locale after reload',async({page})=>{
 await mock(page);await startMission(page,{locale:'ru',node:'W1'});
 await page.locator('#hud-pause').click();await expect.poll(async()=>(await state(page)).state).toBe('paused');await page.getByTestId('pause-menu').click();
 const before=await state(page);expect(before.campaign.nodes).toContain('W1');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cinder-shift-records.v1')||'{}').records?.campaign?.campaign?.nodes||[])).toContain('W1');
 await page.reload();await expect(page.getByTestId('continue')).toBeVisible();
 const after=await state(page);expect(after.campaign.nodes).toContain('W1');expect(after.campaign.campaign_id).toBe(before.campaign.campaign_id);expect(after.locale).toBe('ru');expect(after.save.available).toBe(true);
});
test('SDK startup failure displays a retry screen and never reports ready',async({page})=>{
 await mock(page,"window.YaGames={init:async()=>{throw Error('offline')}};");
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('reload')).toBeVisible();
 const s=await state(page);expect(s.state).toBe('error');expect(s.platform.readySent).toBe(false);expect(s.platform.initialized).toBe(false);
});
