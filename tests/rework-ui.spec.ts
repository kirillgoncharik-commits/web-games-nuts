import {test,expect} from '@playwright/test';
import {state,startMission,roomA} from './helpers';

test('menu has one action group; language and analytics remain reachable in Settings',async({page})=>{
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('new-shift')).toBeVisible();
 await expect(page.getByTestId('menu-locale')).toHaveCount(0);await expect(page.getByTestId('menu-privacy')).toHaveCount(0);
 expect((await state(page)).introVisibleMs).toBe(0);
 await page.getByTestId('menu-settings').click();await page.getByTestId('locale').selectOption('en');
 await page.getByTestId('settings-privacy').click();await page.getByTestId('analytics-decline').click();
 await expect(page.getByTestId('settings-privacy')).toBeFocused();await page.getByTestId('settings-back').click();
 await expect(page.getByTestId('new-shift')).toBeVisible();
});

for(const width of [1280,667,390])test(`facility inspection and inline module purchase preserve progress at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:width===667?300:800});
 await page.goto('/games/cinder-shift/?seed=4');await page.getByTestId('new-shift').click();
 await expect(page.getByTestId('map-prepare')).toBeVisible();const initial=(await state(page)).campaign;
 await page.getByTestId('map-pin-reactor').click();expect((await state(page)).campaign).toEqual(initial);
 await expect(page.getByTestId('map-prepare')).toBeDisabled();await page.getByTestId('map-pin-airlock').click();
 await page.screenshot({path:info.outputPath('facility-map.png')});await page.getByTestId('map-prepare').click();
 await page.getByTestId('buy-D1').click();await expect(page.getByTestId('confirm-buy')).toBeVisible();
 expect((await state(page)).campaign.points).toBe(1);await page.getByTestId('cancel-buy').click();
 expect((await state(page)).campaign.nodes).toEqual([]);await page.getByTestId('buy-D1').click();
 await page.getByTestId('confirm-buy').click();await expect.poll(async()=>(await state(page)).campaign.nodes).toEqual(['D1']);
 await expect(page.locator('[data-module="D1"]')).toHaveCount(0);await expect(page.locator('.installed-modules li')).toHaveCount(1);
 expect((await state(page)).campaign.points).toBe(0);await expect(page.getByTestId('buy-W1')).toBeDisabled();
 await page.screenshot({path:info.outputPath('workshop.png')});
 expect(await page.locator('.panel-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});

test('arrival is immediately skippable and the first live enemy opens the powered exit',async({page},info)=>{
 test.setTimeout(45000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await startMission(page);expect((await state(page)).arrivalMs).toBeLessThan(6500);
 expect((await state(page)).combatRemaining).toBe(1);expect((await state(page)).exitOpen).toBe(false);
 await roomA(page);expect((await state(page)).room).toBe('B');
 await page.screenshot({path:info.outputPath('first-combat-complete.png')});expect(errors).toEqual([]);
});
