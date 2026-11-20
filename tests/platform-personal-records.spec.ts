import {test,expect,type Page} from '@playwright/test';
import {state} from './helpers';
test.skip(process.env.CINDER_TARGET!=='yandex','Yandex target and controlled host storage required');
const sdkScript=`
const rawGet=Storage.prototype.getItem.bind(localStorage),rawSet=Storage.prototype.setItem.bind(localStorage);
window.__RECORDS_HOST={events:{},fail:false,read:()=>JSON.parse(rawGet('cinder-shift-records.v1')||'{}'),
 pause(){this.events.game_api_pause()},resume(){this.events.game_api_resume()}};
window.YaGames={init:async()=>({
 environment:{i18n:{lang:'en'}},features:{LoadingAPI:{ready(){}},GameplayAPI:{start(){},stop(){}}},
 getStorage:async()=>({getItem:key=>rawGet(key),setItem(key,value){if(window.__RECORDS_HOST.fail)throw Error('host_quota');rawSet(key,value)}}),
 on(name,fn){window.__RECORDS_HOST.events[name]=fn},adv:{showFullscreenAdv({callbacks}){callbacks.onClose(false)}}
})};
`;
async function open(page:Page){await page.route('**/sdk.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:sdkScript}));await page.goto('/games/cinder-shift/');await expect(page.getByTestId('menu-records')).toBeVisible();}
async function shoot(page:Page){await page.getByTestId('training').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');await page.keyboard.down('j');await expect.poll(async()=>(await state(page)).personalStatistics.totals.shots).toBeGreaterThan(0);await page.keyboard.up('j');await page.keyboard.press('Escape');await page.getByTestId('pause-menu').click();}

test('actual application writes counters and backup to host storage, then reloads the same profile',async({page})=>{
 await open(page);await shoot(page);const shots=(await state(page)).personalStatistics.totals.shots;await page.getByTestId('menu-records').click();
 await expect(page.getByTestId('records-shots')).toHaveText(String(shots));await expect(page.locator('.panel-content')).toContainText('Saved in this platform profile');
 const envelope=await page.evaluate(()=>(window as any).__RECORDS_HOST.read());expect(envelope.records['personal-records.v1']).toEqual(envelope.records['personal-records.backup.v1']);
 expect(Object.values(envelope.records['personal-records.v1'].sessions).reduce((sum:number,row:any)=>sum+row.shots,0)).toBe(shots);
 await page.reload();await page.getByTestId('menu-records').click();await expect(page.getByTestId('records-shots')).toHaveText(String(shots));
});

test('host pause excludes foreground and mission time without restarting the statistics session',async({page})=>{
 await open(page);await page.getByTestId('training').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');await page.waitForTimeout(300);
 await page.evaluate(()=>(window as any).__RECORDS_HOST.pause());await expect.poll(async()=>(await state(page)).state).toBe('paused');await page.waitForTimeout(100);
 const before=(await state(page)).personalStatistics.totals;await page.waitForTimeout(1200);const after=(await state(page)).personalStatistics.totals;
 expect(after.total_ms).toBe(before.total_ms);expect(after.mission_ms).toBe(before.mission_ms);
 await page.evaluate(()=>(window as any).__RECORDS_HOST.resume());await expect.poll(async()=>(await state(page)).state).toBe('playing');await expect.poll(async()=>(await state(page)).personalStatistics.totals.mission_ms).toBeGreaterThan(after.mission_ms+100);
});

test('host quota failure reports temporary counters and retry preserves the last complete host profile',async({page})=>{
 await open(page);await expect.poll(()=>page.evaluate(()=>(window as any).__RECORDS_HOST.read().records?.['personal-records.v1'])).toBeTruthy();const before=await page.evaluate(()=>(window as any).__RECORDS_HOST.read());
 await page.evaluate(()=>(window as any).__RECORDS_HOST.fail=true);await shoot(page);await page.getByTestId('menu-records').click();await expect(page.locator('.panel-content')).toContainText('Session only');
 const failed=await page.evaluate(()=>(window as any).__RECORDS_HOST.read());expect(failed.records['personal-records.v1']).toEqual(before.records['personal-records.v1']);
 const shots=(await state(page)).personalStatistics.totals.shots;await page.evaluate(()=>(window as any).__RECORDS_HOST.fail=false);await page.keyboard.press('Escape');await page.getByTestId('menu-records').click();await expect(page.getByTestId('records-shots')).toHaveText(String(shots));await expect(page.locator('.panel-content')).not.toContainText('Session only');
});
