import {test,expect} from '@playwright/test';
import {startMission,state,roomA,completeFromB} from './helpers';
import type {NodeId} from '../games/cinder-shift/src/session/research';

for(const node of [undefined,'W1','M1','D1'] as (NodeId|undefined)[])test(`combat-clear Airlock ${node||'base'} reaches reward and keeps Retry entry`,async({page},info)=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await startMission(page,{node});
 const entry=(await state(page)).campaign.entry;
 expect((await state(page)).combatRemaining).toBe(1);
 await roomA(page);await completeFromB(page);
 await expect.poll(async()=>(await state(page)).screen).toBe('result');
 const won=await state(page);
 expect(won.campaign.result).toMatchObject({result:'victory',reward_granted:true});
 expect(won.campaign.completed_missions).toEqual(['airlock']);
 expect(won.campaign.reward_ledger).toHaveLength(1);
 expect(won.campaign.points).toBe(node?1:2);
 expect(won.campaign.result.hp).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath('airlock-victory.png')});
 // Retry keeps the purchased build, seed and event plan, while restoring mission HP.
 await page.getByTestId('retry').click();
 await expect.poll(async()=>{const s=await state(page);return s.state==='playing'&&!!s.player&&s.attemptId!==won.attemptId;}).toBe(true);
 const retry=await state(page);
 expect(retry.screen).not.toBe('arrival');
 expect(retry.campaign.entry).toEqual(entry);
 expect(retry.hp).toBe(node==='D1'?8:6);
 expect(retry.combatRemaining).toBe(1);
 expect(retry.campaign.reward_ledger).toEqual(won.campaign.reward_ledger);
 // Reloading the retried entry must retain earned progress and never re-award it.
 await page.keyboard.press('Escape');await page.getByTestId('pause-menu').click();
 await page.reload();await page.getByTestId('continue').click();
 await expect(page.getByTestId('restart-entry')).toBeVisible();
 expect((await state(page)).campaign.completed_missions).toEqual(['airlock']);
 expect((await state(page)).campaign.reward_ledger).toEqual(won.campaign.reward_ledger);
 expect(errors).toEqual([]);
 await info.attach('combat-run',{body:JSON.stringify({build:won.build,source_sha:won.sha,node:node||'base',active_seconds:won.activeSeconds,hp:won.campaign.result.hp,ledger:won.campaign.reward_ledger}),contentType:'application/json'});
});

test('first Airlock victory opens Cargo without buying a module',async({page})=>{
 test.setTimeout(100000);await startMission(page);await roomA(page);await completeFromB(page);
 await page.getByTestId('result-research').click();
 await expect(page.getByTestId('map-pin-cargo')).toHaveAttribute('aria-pressed','true');
 await expect(page.getByTestId('map-prepare')).toBeEnabled();
 await page.getByTestId('map-prepare').click();
 expect((await state(page)).campaign.mission_id).toBe('cargo');
 await page.getByTestId('briefing').click();
 await expect.poll(async()=>(await state(page)).missionId).toBe('cargo');
 expect((await state(page)).hp).toBe(6);
});
