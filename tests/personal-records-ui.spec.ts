import {test,expect,type Page} from '@playwright/test';
import {state} from './helpers';
import {emptyPersonalRecords,emptyFragment,statisticsTotals,type PersonalRecords} from '../games/cinder-shift/src/session/personal-records';

async function put(page:Page,key:string,value:unknown){await page.evaluate(({key,value})=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('cinder-shift-r01',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('records','readwrite');tx.objectStore('records').put(value,key);tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};}),{key,value});}
async function read(page:Page,key:string){return page.evaluate(key=>new Promise<any>((resolve,reject)=>{const request=indexedDB.open('cinder-shift-r01',1);request.onsuccess=()=>{const db=request.result,r=db.transaction('records','readonly').objectStore('records').get(key);r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);};}),key);}

test('clean profile opens in one step, shows zero shots, returns focus and accepts all five mode filters',async({page},info)=>{
 await page.goto('/games/cinder-shift/');await page.getByTestId('menu-records').click();
 await expect(page.getByTestId('records-shots')).toHaveText('0');await expect(page.getByTestId('records-hits')).toHaveText('0');await expect(page.getByTestId('records-accuracy')).toHaveText('—');
 await page.getByTestId('records-campaigns').click();await expect(page.locator('.records-card')).toHaveCount(3);
 await page.getByTestId('records-challenges').click();for(const mode of ['time_attack','score_attack','daily','duel','relay'])await page.locator('#records-mode').selectOption(mode);
 await page.keyboard.press('Escape');await expect(page.getByTestId('records-shots')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByTestId('menu-records')).toBeFocused();
 await page.setViewportSize({width:390,height:844});await page.getByTestId('menu-records').click();await expect(page.getByTestId('records-back')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('records-mobile-summary.png')});
});

test('actual training fire accumulates and persists after leaving, reopening and reload',async({page},info)=>{
 await page.goto('/games/cinder-shift/');await page.getByTestId('training').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');
 await page.keyboard.down('j');await page.waitForTimeout(1100);await page.keyboard.up('j');await page.keyboard.press('Escape');await page.getByTestId('pause-menu').click();
 const after=await state(page),shots=after.personalStatistics.totals.shots;expect(shots).toBeGreaterThanOrEqual(3);
 await page.getByTestId('menu-records').click();await expect(page.getByTestId('records-shots')).toHaveText(String(shots));await page.screenshot({path:info.outputPath('records-after-fire.png')});
 const saved=await read(page,'personal-records.v1');expect(statisticsTotals(saved).shots).toBe(shots);await page.reload();await page.getByTestId('menu-records').click();await expect(page.getByTestId('records-shots')).toHaveText(String(shots));
 expect((await state(page)).personalStatistics.totals.mission_ms).toBeGreaterThan(1000);
});

test('published-format challenge PB is immediately readable and its older history is retained',async({page})=>{
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('menu-records')).toBeVisible();
 const key='CS64-legacy',run={run_id:'legacy-run',challenge_key:key,mode:'time_attack',state:'finished',eligibility:'standard',elapsed_ms:10000,sim_ms:9500,score:100,outcome:'victory',pause_count:0,finished_at:Date.now()};
 const old={version:1,best:[{challenge_key:key,mode:'time_attack',metric:'elapsed_ms',value:10000,run_id:run.run_id,updated_at:run.finished_at}],recent:{[key]:[run]},traces:[]};
 await put(page,'records.v1',old);await page.reload();await page.getByTestId('menu-records').click();await page.getByTestId('records-challenges').click();
 await expect(page.locator('.records-card')).toHaveCount(1);await expect(page.locator('.records-card')).toContainText(/10/);expect(await read(page,'records.v1')).toEqual(old);
});

test('future statistics remain intact and the screen reports session-only values',async({page})=>{
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('menu-records')).toBeVisible();const future={version:2,valuable:'preserve'};await put(page,'personal-records.v1',future);await page.reload();
 await page.getByTestId('menu-records').click();await expect(page.locator('.panel-content')).toContainText(/Только за эту сессию|Session only/);expect(await read(page,'personal-records.v1')).toEqual(future);
});

test('a damaged current statistics record recovers its last complete backup without discarding the original',async({page})=>{
 await page.goto('/games/cinder-shift/');await page.getByTestId('training').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');await page.keyboard.down('j');await expect.poll(async()=>(await state(page)).personalStatistics.totals.shots).toBeGreaterThan(0);await page.keyboard.up('j');await page.keyboard.press('Escape');await page.getByTestId('pause-menu').click();await page.getByTestId('menu-records').click();
 const saved=await read(page,'personal-records.v1'),shots=statisticsTotals(saved).shots,damaged={version:1,sessions:'damaged'};await put(page,'personal-records.v1',damaged);await page.reload();await page.getByTestId('menu-records').click();
 await expect(page.getByTestId('records-shots')).toHaveText(String(shots));expect(await read(page,'personal-records.quarantine.v1')).toEqual(damaged);expect(statisticsTotals(await read(page,'personal-records.v1')).shots).toBe(shots);
});

test('two tabs atomically retain both session fragments and reject a stale overwrite',async({page,context})=>{
 await page.goto('/__encounter__/');await expect(page.getByTestId('new-shift')).toBeVisible();const second=await context.newPage();await second.goto('/__encounter__/');await expect(second.getByTestId('new-shift')).toBeVisible();
 const a=emptyPersonalRecords(),b=emptyPersonalRecords();a.sessions['tab-a']={...emptyFragment(),shots:9,hits:3};b.sessions['tab-b']={...emptyFragment(),shots:7,hits:2};
 await Promise.all([page.evaluate(value=>(window as any).__ENCOUNTER__.writeStatistics(value),a),second.evaluate(value=>(window as any).__ENCOUNTER__.writeStatistics(value),b)]);
 a.sessions['tab-a'].shots=1;a.sessions['tab-a'].hits=0;await page.evaluate(value=>(window as any).__ENCOUNTER__.writeStatistics(value),a);
 const totals=statisticsTotals(await read(page,'personal-records.v1') as PersonalRecords);expect(totals.shots).toBe(16);expect(totals.hits).toBe(5);await second.close();
});

test('write failure leaves the last saved copy intact and retry preserves the unsaved shots',async({page})=>{
 await page.addInitScript(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if((window as any).__FAIL_STATISTICS__&&key==='personal-records.v1')throw new DOMException('Injected quota fault','QuotaExceededError');return key===undefined?put.call(this,value):put.call(this,value,key);};});
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('training')).toBeVisible();const previous=await read(page,'personal-records.v1');
 await page.evaluate(()=>(window as any).__FAIL_STATISTICS__=true);await page.getByTestId('training').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');await page.keyboard.down('j');await expect.poll(async()=>(await state(page)).personalStatistics.totals.shots).toBeGreaterThan(0);await page.keyboard.up('j');
 await page.keyboard.press('Escape');await page.getByTestId('pause-menu').click();await page.getByTestId('menu-records').click();await expect(page.locator('.panel-content')).toContainText(/Только за эту сессию|Session only/);
 expect(await read(page,'personal-records.v1')).toEqual(previous);const shots=(await state(page)).personalStatistics.totals.shots;expect(shots).toBeGreaterThan(0);
 await page.evaluate(()=>(window as any).__FAIL_STATISTICS__=false);await page.keyboard.press('Escape');await page.getByTestId('menu-records').click();await expect(page.getByTestId('records-shots')).toHaveText(String(shots));expect(statisticsTotals(await read(page,'personal-records.v1')).shots).toBe(shots);
});

test('a completed automatic checkpoint survives closing the playing page',async({page,context})=>{
 test.setTimeout(30000);await page.goto('/games/cinder-shift/');await page.getByTestId('training').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');await page.keyboard.down('j');await expect.poll(async()=>(await state(page)).personalStatistics.totals.shots).toBeGreaterThan(0);await page.keyboard.up('j');
 await expect.poll(async()=>{const saved=await read(page,'personal-records.v1');return saved?statisticsTotals(saved).shots:0;},{timeout:20000,intervals:[500]}).toBeGreaterThan(0);
 const shots=statisticsTotals(await read(page,'personal-records.v1')).shots;await page.close();const next=await context.newPage();await next.goto('/games/cinder-shift/');await next.getByTestId('menu-records').click();await expect(next.getByTestId('records-shots')).toHaveText(String(shots));await next.close();
});

for(const kind of ['guest','bridge'] as const)test(kind+': real tabs share one locked envelope during overlapping read/merge/write',async({page,context})=>{
 await page.goto('/__encounter__/');await expect(page.getByTestId('new-shift')).toBeVisible();const second=await context.newPage();await second.goto('/__encounter__/');await expect(second.getByTestId('new-shift')).toBeVisible();
 expect(await page.evaluate(()=>Boolean(navigator.locks))).toBe(true);
 const key='records-lock-'+crypto.randomUUID(),a=emptyPersonalRecords(),b=emptyPersonalRecords();a.sessions['tab-a']={...emptyFragment(),shots:10,hits:4};b.sessions['tab-b']={...emptyFragment(),shots:7,hits:2};
 const results=await Promise.all([page.evaluate(input=>(window as any).__ENCOUNTER__.transportStatistics(input),{kind,key,incoming:a}),second.evaluate(input=>(window as any).__ENCOUNTER__.transportStatistics(input),{kind,key,incoming:b})]);expect(results.every(Boolean)).toBe(true);
 const envelope=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);expect(statisticsTotals(envelope.records['personal-records.v1'])).toMatchObject({shots:17,hits:6});expect(envelope.records['personal-records.backup.v1']).toEqual(envelope.records['personal-records.v1']);await second.close();
});
