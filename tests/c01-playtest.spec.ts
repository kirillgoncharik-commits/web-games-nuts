import {test,expect,type Page} from '@playwright/test';
import {state,roomA} from './helpers';
import {airlockDriver} from './airlock-gameplay';

test.afterEach(async({page},info)=>{
 if(info.status!==info.expectedStatus)console.error('C01 failure state',JSON.stringify({url:page.url(),state:await state(page).catch(()=>null),body:await page.locator('body').innerText().catch(()=>null)}));
});

async function start(page:Page,variant:'a'|'b'){
 await page.goto(`/${variant}/games/cinder-shift/?seed=4`);
 await page.getByTestId('new-shift').click();
 if(await page.getByTestId('confirm-new').isVisible())await page.getByTestId('confirm-new').click();
 await page.getByTestId('map-prepare').click();await page.getByTestId('briefing').click();await page.getByTestId('skip-arrival').click();
 await expect.poll(async()=>(await state(page)).state).toBe('playing');
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.room==='A'&&s.player?.vy===0;});
}
for(const variant of ['a','b'] as const)test(`${variant.toUpperCase()}: ordinary menu, first gate, next room and reload`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await start(page,variant);expect((await state(page)).playtest.active).toBe(variant==='b');
 if(variant==='b')await expect(page.locator('#objective')).toContainText('питание');
 await page.screenshot({path:info.outputPath(`${variant}-entry.png`)});
 await roomA(page);const s=await state(page);
 expect(s.hp).toBeGreaterThan(0);expect(s.playtest.active).toBe(false);
 expect(s.eventLog.filter((e:any)=>e.name==='playtest_gate')).toHaveLength(1);
 expect(s.eventLog.find((e:any)=>e.name==='playtest_gate').params.active_ms).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath(`${variant}-gate.png`)});
 // One real traversal inside the next room proves physics and base combat still run.
 const driver=airlockDriver(page);await driver.jump(194,350);expect((await state(page)).room).toBe('B');expect((await state(page)).player.x).toBeGreaterThan(340);
 await page.keyboard.press('Escape');await expect.poll(async()=>(await state(page)).state).toBe('paused');
 await page.reload();await page.getByTestId('continue').click();
 await expect(page.getByTestId('restart-entry')).toBeVisible();await page.getByTestId('restart-entry').click();
 await expect.poll(async()=>(await state(page)).state).toBe('playing');
 expect((await state(page)).room).toBe('A');expect(errors).toEqual([]);
});

test('A and B use independent databases and preview never sends production analytics',async({page})=>{
 const external:string[]=[];page.on('request',r=>{if(/google-analytics|googletagmanager/.test(r.url()))external.push(r.url());});
 await page.addInitScript(()=>localStorage.setItem('nuts_analytics_consent_v1','granted'));
 await test.step('create A progress',async()=>{await start(page,'a');console.log('C01 isolation: A started');});
 await test.step('B has no A progress',async()=>{
  await page.goto('/b/games/cinder-shift/?seed=4');await expect(page.getByTestId('new-shift')).toBeVisible();
  expect((await state(page)).campaign).toBe(null);console.log('C01 isolation: B is fresh');
 });
 await test.step('A retains its progress',async()=>{
  await page.goto('/a/games/cinder-shift/?seed=4');await expect(page.getByTestId('continue')).toBeVisible();
  expect(external).toEqual([]);console.log('C01 isolation: A retained');
 });
 await test.step('fresh profile resets A',async()=>{
  await page.locator('#playtest-reset').click({timeout:10000});console.log('C01 isolation: reset clicked');
  await expect(page.getByTestId('new-shift')).toBeVisible();expect((await state(page)).campaign).toBe(null);
 });
});
