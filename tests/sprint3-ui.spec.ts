import {test,expect,type Page} from '@playwright/test';
import {state} from './helpers';
import {Campaign,newCampaign,contentVersion} from '../games/cinder-shift/src/session/campaign';
import {missionIds} from '../games/cinder-shift/src/session/missions';
import packageInfo from '../package.json' with {type:'json'};
async function db(page:Page,action:'get'|'put'|'delete',key:string,value?:unknown){return page.evaluate(({action,key,value})=>new Promise<any>((resolve,reject)=>{const r=indexedDB.open('cinder-shift-r01',1);r.onsuccess=()=>{const database=r.result,tx=database.transaction('records',action==='get'?'readonly':'readwrite'),store=tx.objectStore('records');const request=action==='get'?store.get(key):action==='delete'?store.delete(key):store.put(value,key);let result:any;request.onsuccess=()=>result=request.result;tx.oncomplete=()=>{database.close();resolve(result);};tx.onabort=()=>reject(tx.error);};r.onerror=()=>reject(r.error);}),{action,key,value});}
async function ready(page:Page){await page.goto('/games/cinder-shift/');await expect(page.getByTestId('new-shift')).toBeVisible();expect((await state(page)).build).toBe(packageInfo.version);}
test('fresh entry has no update modal; embedded and artifact metadata match',async({page})=>{
 await ready(page);expect((await state(page)).screen).toBe('menu');expect((await state(page)).releaseNotesPending).toBe(false);
 const manifest=await page.request.get('/games/cinder-shift/build-manifest.json').then(r=>r.json()),running=(await state(page)).buildMetadata;
 for(const key of ['version','release_id','source_sha','build_id','built_at_utc','channel','notes_id'])expect(running[key]).toBe(manifest[key]);
 await expect(page.locator('#build-label')).toContainText(`v${packageInfo.version} · rev`);expect((await db(page,'get','release-notes.v1')).acknowledged_release).toBeNull();
});
test('legacy profile sees one update, preserves its campaign and acknowledges only on close',async({page})=>{
 await ready(page);await page.getByTestId('new-shift').click();await expect(page.getByTestId('map-prepare')).toBeVisible();const campaign=(await state(page)).campaign;
 await expect.poll(async()=>(await db(page,'get','campaign'))?.campaign?.campaign_id).toBe(campaign.campaign_id);await db(page,'delete','release-notes.v1');await page.reload();
 await expect(page.getByTestId('notes-close')).toBeVisible();expect((await state(page)).campaign).toEqual(campaign);expect(await db(page,'get','release-notes.v1')).toBeUndefined();
 await page.keyboard.press('Escape');await expect(page.getByTestId('continue')).toBeVisible();await expect.poll(async()=>(await db(page,'get','release-notes.v1'))?.acknowledged_release).toBe(packageInfo.version);
 await page.reload();await expect(page.getByTestId('continue')).toBeVisible();expect((await state(page)).screen).toBe('menu');expect((await state(page)).campaign).toEqual(campaign);
});
test('manual notes return keyboard focus and language changes do not re-open acknowledged notes',async({page})=>{
 await ready(page);await page.getByTestId('menu-whats-new').click();await expect(page.getByTestId('notes-close')).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByTestId('menu-whats-new')).toBeFocused();
 await page.getByTestId('menu-settings').click();await page.getByTestId('locale').selectOption('en');await page.getByTestId('settings-back').click();await expect(page.getByTestId('menu-whats-new')).toHaveText('What’s new');expect((await state(page)).screen).toBe('menu');
});
test('rollback marker remains monotonic and future markers are preserved',async({page})=>{
 await ready(page);const marker={schema:1,installed_release:'0.9.0',acknowledged_release:'0.9.0'};await db(page,'put','release-notes.v1',marker);await page.reload();await expect(page.getByTestId('new-shift')).toBeVisible();await page.getByTestId('menu-whats-new').click();await page.getByTestId('notes-close').click();expect(await db(page,'get','release-notes.v1')).toEqual(marker);
 const future={schema:8,opaque:'preserve me'};await db(page,'put','release-notes.v1',future);await page.reload();await expect(page.getByTestId('new-shift')).toBeVisible();await page.getByTestId('menu-whats-new').click();await page.getByTestId('notes-close').click();expect(await db(page,'get','release-notes.v1')).toEqual(future);
});
test('blocked storage keeps fresh entry and manual history usable',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('Denied','SecurityError');}}));await ready(page);await page.getByTestId('menu-whats-new').click();await page.getByTestId('notes-close').click();await page.getByTestId('new-shift').click();if(await page.getByTestId('confirm-new').isVisible())await page.getByTestId('confirm-new').click();await expect(page.getByTestId('map-prepare')).toBeVisible();
});
for(const [width,height] of [[1280,900],[667,375],[390,844]])test(`signature stays outside controls and notes are usable at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height});await ready(page);await page.getByTestId('menu-whats-new').click();await expect(page.getByTestId('notes-close')).toBeInViewport();const signature=await page.locator('#build-label').boundingBox(),button=await page.getByTestId('notes-close').boundingBox();expect(signature!.y).toBeGreaterThanOrEqual(button!.y+button!.height);await page.screenshot({path:info.outputPath(`notes-${width}.png`)});await page.getByTestId('notes-close').click();
 await page.getByTestId('menu-settings').click();await page.locator('.technical summary').click();await expect(page.getByTestId('copy-build')).toBeVisible();await expect(page.locator('.build-diagnostics')).toContainText('source_sha');
});
function completedFixture(){const campaign=new Campaign(newCampaign(4));for(const id of missionIds){campaign.prepare();campaign.begin();campaign.applyResult({attempt_id:'fixture-'+id,mission_id:id,result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:1,screen_ms:0,nodes:[]});campaign.advance();}return{schema_version:1,content_version:contentVersion,game_id:'r01',build_id:'0.7.0-rw2.c3',saved_at:new Date().toISOString(),campaign:campaign.snapshot()};}
test('completed legacy fixture migrates to a durable completion fact; resetting C01 does not relock worlds',async({page},info)=>{
 await ready(page);await db(page,'put','campaign',completedFixture());await page.reload();await expect(page.getByTestId('continue')).toBeVisible();expect((await state(page)).baseCampaignCompleted).toBe(true);await expect.poll(async()=>(await db(page,'get','world-profile.v1'))?.completion_ids?.length).toBe(1);
 await page.getByTestId('menu-campaigns').click();await expect(page.locator('[data-campaign=c02-small-world]')).toContainText('Доступна');await expect(page.locator('[data-campaign=c03-adriatic-1986]')).toContainText('Доступна');await page.screenshot({path:info.outputPath('selector-earned-fixture.png')});await page.getByTestId('campaigns-back').click();
 await page.getByTestId('new-shift').click();await page.getByTestId('confirm-new').click();await expect(page.getByTestId('map-prepare')).toBeVisible();await page.reload();await expect(page.getByTestId('continue')).toBeVisible();expect((await state(page)).baseCampaignCompleted).toBe(true);expect((await state(page)).campaign.completed_missions).toEqual([]);
});
test('an unconfirmed C01 final and unknown future profile do not invent completion or overwrite data',async({page},info)=>{
 await ready(page);const record=completedFixture();record.campaign.stage='result';await db(page,'put','campaign',record);await page.reload();await expect(page.getByTestId('continue')).toBeVisible();expect((await state(page)).baseCampaignCompleted).toBe(false);await page.getByTestId('menu-campaigns').click();await expect(page.locator('[data-campaign=c02-small-world]')).toContainText('Завершите первую кампанию');await expect(page.getByTestId('world-c02-small-world')).toBeDisabled();await page.screenshot({path:info.outputPath('selector-locked-fixture.png')});
 const future={schema_version:9,opaque:'keep'};await db(page,'put','world-profile.v1',future);await page.reload();await expect(page.getByTestId('continue')).toBeVisible();expect((await state(page)).completionProfileValid).toBe(false);await page.getByTestId('menu-campaigns').click();await expect(page.locator('[data-campaign=c02-small-world]')).toContainText('Не удалось загрузить прогресс');expect(await db(page,'get','world-profile.v1')).toEqual(future);
});
