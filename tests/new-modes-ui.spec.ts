import {test,expect,type Page} from '@playwright/test';
import {completeFromB,roomA,state} from './helpers';

async function openChallenges(page:Page){await page.goto('/games/cinder-shift/?seed=4');await page.getByTestId('menu-challenges').click();await expect.poll(async()=>(await state(page)).screen).toBe('challenges');}
async function startMode(page:Page,id:'mode-time-attack'|'mode-score-attack'){await openChallenges(page);await page.getByTestId(id).click();await expect.poll(async()=>(await state(page)).state,{timeout:8_000}).toBe('playing');}

test('Time Attack finishes an isolated Airlock run and records stable first-entry splits',async({page})=>{
  test.setTimeout(90_000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await startMode(page,'mode-time-attack');await roomA(page);await completeFromB(page);
  await expect.poll(async()=>(await state(page)).screen).toBe('result');const result=await state(page);expect(result.campaign).toBeNull();expect(result.challengeResult.mode).toBe('time_attack');expect(result.challengeResult.outcome).toBe('victory');expect(result.challengeKey).toContain('CS64-');expect(result.events).toContain('challenge_finish');expect(errors).toEqual([]);
  await expect(page.getByText(/First-entry splits|Сплиты при первом входе/)).toBeVisible();await expect(page.getByText(/Medals will appear|Медали появятся/)).toBeVisible();
});

test('Score Attack uses its own score ledger and campaign remains untouched',async({page})=>{
  test.setTimeout(90_000);await startMode(page,'mode-score-attack');await roomA(page);await completeFromB(page);await expect.poll(async()=>(await state(page)).screen).toBe('result');const result=await state(page);expect(result.campaign).toBeNull();expect(result.challengeResult.mode).toBe('score_attack');expect(result.challengeResult.score).toBeGreaterThan(1000);await expect(page.getByText(/Score breakdown|Разбор очков/)).toBeVisible();
});

test('Daily, Duel, and Relay have explicit local entry and manual code paths',async({page})=>{
  await openChallenges(page);for(const id of ['mode-time-attack','mode-score-attack','mode-daily','mode-relay'])await expect(page.getByTestId(id)).toBeVisible();
  await page.getByTestId('challenge-create-duel').click();const codeField=page.locator('#challenge-code');await expect.poll(()=>codeField.inputValue()).toMatch(/^CS64-C1\./);await page.getByTestId('challenge-import-code').click();await expect(page.getByTestId('challenge-accept-duel')).toBeVisible();await page.getByTestId('challenge-accept-duel').click();await expect.poll(async()=>(await state(page)).state).toBe('countdown');await page.getByTestId('challenge-cancel').click();await expect.poll(async()=>(await state(page)).screen).toBe('challenges');
  await page.getByTestId('mode-daily').click();await expect.poll(async()=>(await state(page)).challengeMode).toBe('daily');await expect.poll(async()=>(await state(page)).state).toBe('countdown');await page.getByTestId('challenge-cancel').click();
  await page.getByTestId('mode-relay').click();await expect.poll(async()=>(await state(page)).challengeMode).toBe('relay');await expect.poll(async()=>(await state(page)).state).toBe('countdown');await page.getByTestId('challenge-cancel').click();
});

test('Relay completes Stage A, collects Intel, exports H1, and starts Stage B',async({page})=>{
  test.setTimeout(120_000);await openChallenges(page);await page.getByTestId('mode-relay').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');await roomA(page);await completeFromB(page,{collectRelayIntel:true});await expect.poll(async()=>(await state(page)).screen).toBe('relay-support');await expect.poll(async()=>(await state(page)).challengeResult?.outcome).toBe('victory');await page.getByTestId('relay-support-power').click();const handoff=page.locator('#relay-handoff-code');await expect.poll(()=>handoff.inputValue()).toMatch(/^CS64-H1\./);await page.getByTestId('relay-start-stage-b').click();await expect.poll(async()=>(await state(page)).relayLeg).toBe('B');await expect.poll(async()=>(await state(page)).state).toBe('countdown');await page.getByTestId('challenge-cancel').click();await expect.poll(async()=>(await state(page)).screen).toBe('challenges');
});
