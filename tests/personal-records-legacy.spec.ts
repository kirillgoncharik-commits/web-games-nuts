import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {state} from './helpers';

async function menu(page:Page){
 await page.waitForFunction(()=>typeof(window as any).__CINDER__==='function'&&['menu','whats-new'].includes((window as any).__CINDER__().screen));
 if(await page.getByTestId('notes-close').isVisible())await page.getByTestId('notes-close').click();
}

for(const target of ['web','itch'])test(`captured published alpha.12 ${target} save keeps its purchase and earned PB through new play and reload`,async({page},info)=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/personal-records/alpha12-'+target+'.json',import.meta.url),'utf8'));
 expect(fixture.version).toBe('0.8.0-alpha.12');expect(fixture.target).toBe(target);
 // Install the captured profile before the first game boot, so a running
 // statistics checkpoint cannot race with fixture installation.
 await page.goto('/games/cinder-shift/build-manifest.json');
 await page.evaluate(records=>new Promise<void>((resolve,reject)=>{
  const request=indexedDB.open('cinder-shift-r01',1);request.onerror=()=>reject(request.error);
  request.onupgradeneeded=()=>request.result.createObjectStore('records');
  request.onsuccess=()=>{const db=request.result,tx=db.transaction('records','readwrite'),store=tx.objectStore('records');for(const [key,value]of Object.entries(records))store.put(value,key);tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};
 }),fixture.records);
 await page.goto('/games/cinder-shift/');await menu(page);
 await page.getByTestId('menu-records').click();await expect(page.getByTestId('records-shots')).toHaveText('0');await expect(page.getByTestId('records-accuracy')).toHaveText('—');
 await page.getByTestId('records-challenges').click();await expect(page.locator('.records-card')).toHaveCount(1);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.getByTestId('continue').click();await page.getByTestId('restart-entry').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');
 const savedCampaign=fixture.records.campaign.campaign,c=(await state(page)).campaign;
 expect(c.campaign_id).toBe(savedCampaign.campaign_id);expect(c.nodes).toEqual(['D1']);expect(c.entry).toEqual(savedCampaign.entry);expect(c.points).toBe(0);expect((await state(page)).maxHp).toBe(8);
 await page.keyboard.down('j');await expect.poll(async()=>(await state(page)).personalStatistics.totals.shots).toBeGreaterThan(0);await page.keyboard.up('j');await page.keyboard.press('Escape');await page.getByTestId('pause-menu').click();await page.getByTestId('menu-records').click();
 const shots=(await state(page)).personalStatistics.totals.shots;await expect(page.getByTestId('records-shots')).toHaveText(String(shots));
 await page.screenshot({path:info.outputPath('alpha14-from-'+target+'.png')});await page.reload();await menu(page);await page.getByTestId('menu-records').click();await expect(page.getByTestId('records-shots')).toHaveText(String(shots));
 const oldRecords=await page.evaluate(()=>new Promise<unknown>((resolve,reject)=>{
  const request=indexedDB.open('cinder-shift-r01',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('records','readonly'),get=tx.objectStore('records').get('records.v1');get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close();};
 }));
 expect(oldRecords).toEqual(fixture.records['records.v1']);
 expect((await state(page)).campaign.campaign_id).toBe(savedCampaign.campaign_id);expect((await state(page)).campaign.nodes).toEqual(['D1']);
});
