import{test,expect,type Page}from'@playwright/test';
import{state}from'./helpers';
import{Campaign,newCampaign,contentVersion}from'../games/cinder-shift/src/session/campaign';
import{characterProfile,previewProfile}from'../games/cinder-shift/src/session/profile';
import{MissionAttempt}from'../games/cinder-shift/src/mission';

test('one profile computes previews and actual mission values without changing the build',()=>{
 const nodes:('W1'|'M1'|'D1')[]=[];expect(characterProfile(nodes)).toMatchObject({maxHp:6,projectileDamage:1,projectilesPerShot:1,shotsPerSecond:4,projectileSpeed:440,walkSpeed:115,active:null});
 expect(previewProfile(nodes,'D1').maxHp).toBe(8);expect(nodes).toEqual([]);
 for(const id of ['W1','M1','D1']as const){const c=new Campaign(newCampaign(0));c.buy(id);const a=new MissionAttempt('mission',c.prepare());expect(a.profile).toEqual(previewProfile([],id));expect(a.maxHp).toBe(a.profile.maxHp);}
 expect(characterProfile(['W1','M1','D1'])).toMatchObject({maxHp:8,projectileDamage:1,projectilesPerShot:3,active:'M1',dashDistance:80,dashSeconds:.16,dashCooldown:3});
});

for(const [width,height]of [[1280,720],[800,600],[800,360]])for(const locale of ['ru','en']as const)test(`M05A preview, purchase and operator return ${locale} ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.goto('/games/cinder-shift/');await page.getByTestId('menu-locale').selectOption(locale);await page.getByTestId('new-shift').click();
 expect((await state(page)).campaign).toBeNull();expect(await page.locator('.character-slot.locked[aria-disabled="true"]').count()).toBe(2);await page.getByTestId('choose-mira').click();
 const id=(await state(page)).campaign.campaign_id;await page.getByTestId('research-D1').click();await expect(page.getByTestId('current-maxHp')).toHaveText('6');await expect(page.getByTestId('preview-maxHp')).toContainText('8');expect((await state(page)).campaign.points).toBe(1);expect((await state(page)).campaign.nodes).toEqual([]);
 await page.screenshot({path:info.outputPath('workshop-preview.png')});await page.getByTestId('purchase').click();await expect(page.getByTestId('current-maxHp')).toHaveText('6');await expect(page.getByTestId('preview-maxHp')).toContainText('8');await page.screenshot({path:info.outputPath('purchase-confirmation.png')});await page.getByTestId('confirm-buy').click();
 await expect.poll(async()=>(await state(page)).campaign.nodes).toEqual(['D1']);await expect(page.getByTestId('profile-integrity')).toContainText('8/8');await expect(page.getByTestId('briefing')).toBeFocused();
 await page.getByTestId('character-select').click();await page.getByTestId('character-back').click();expect((await state(page)).campaign).toMatchObject({campaign_id:id,character_id:'mira',nodes:['D1'],points:0});
 for(const action of ['briefing','research-menu','research-settings','character-select']){const r=await page.getByTestId(action).boundingBox();expect(r!.height).toBeGreaterThanOrEqual(48);expect(r!.y+r!.height).toBeLessThanOrEqual(height+1);}
 expect(await page.locator('.panel-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.getByTestId('briefing').click();await expect(page.getByTestId('current-maxHp')).toHaveText('8');await page.getByTestId('start-mission').click();await expect.poll(async()=>(await state(page)).maxHp).toBe(8);
});

async function putLegacy(page:Page,campaign:any,settings:any){await page.evaluate(({campaign,settings})=>new Promise<void>((resolve,reject)=>{const r=indexedDB.open('cinder-shift-r01',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('records','readwrite'),store=tx.objectStore('records');store.put(campaign,'campaign');store.put(settings,'settings');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};r.onerror=()=>reject(r.error);}),{campaign,settings});}
for(const stage of ['research','briefing','result']as const)test(`real M04 record migrates Mira while preserving ${stage}, entry and reward ledger`,async({page},info)=>{
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('new-shift')).toBeVisible();const c=new Campaign(newCampaign(0));c.buy('D1');c.prepare();c.applyResult({attempt_id:'m04-win-preserved',mission_id:'airlock',result:'victory',reason:'',hp:5,max_hp:8,score:150,active_ms:75000,screen_ms:30000,nodes:['D1']});c.data.stage=stage;const old:any=c.snapshot();delete old.character_id;
 const record={schema_version:1,content_version:contentVersion,game_id:'r01',build_id:'0.4.0-m04.1',saved_at:'2026-11-06T12:00:00Z',campaign:old};const settings={locale:'en',muted:true,touchMode:'on',layout:'sides',autofire:false,debugBodies:false};await putLegacy(page,record,settings);await page.reload();
 await expect(page.getByTestId('continue')).toBeVisible();const s=await state(page);expect(s.campaign).toEqual({...old,stage:stage==='result'?'preview_complete':stage,character_id:'mira'});expect(s.settings).toEqual({...settings,musicVolume:.18,sfxVolume:.75,uiVolume:.6});await page.getByTestId('continue').click();expect((await state(page)).screen).toBe(stage);expect((await state(page)).campaign).toMatchObject({campaign_id:old.campaign_id,nodes:['D1'],points:1,reward_ledger:old.reward_ledger,processed_attempts:old.processed_attempts,entry:old.entry});expect((await state(page)).audioStatus.played.mission_win||0).toBe(0);await page.screenshot({path:info.outputPath('legacy-'+stage+'.png')});
});
for(const locale of ['en','ru']as const)test(`restored death has a small symbol, clear cause and retry ${locale}`,async({page},info)=>{
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('new-shift')).toBeVisible();const c=new Campaign(newCampaign(0));c.prepare();c.applyResult({attempt_id:'legacy-death',mission_id:'airlock',result:'death',reason:'drone-shot',hp:0,max_hp:6,score:0,active_ms:20000,screen_ms:10000,nodes:[]});await putLegacy(page,{schema_version:1,content_version:contentVersion,game_id:'r01',build_id:'0.4.0-m04.1',saved_at:new Date().toISOString(),campaign:c.snapshot()},{locale});await page.reload();await page.getByTestId('continue').click();
 const icon=await page.locator('.result-icon.failure').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{width:r.width,height:r.height,bg:s.backgroundColor};});expect(icon).toEqual({width:52,height:52,bg:'rgba(0, 0, 0, 0)'});await expect(page.getByTestId('retry')).toBeFocused();await expect(page.locator('.salvage-note')).toBeVisible();expect((await state(page)).audioStatus.played.mission_death||0).toBe(0);await page.screenshot({path:info.outputPath('death-'+locale+'.png')});
});
