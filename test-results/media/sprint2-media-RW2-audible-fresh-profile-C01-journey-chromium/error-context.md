# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sprint2-media.spec.ts >> RW2 audible fresh-profile C01 journey
- Location: tests/sprint2-media.spec.ts:17:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('retry')
Expected: visible
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByTestId('retry') with timeout 12000ms
  - waiting for getByTestId('retry')

```

```yaml
- main:
  - region "Cinder Shift 64":
    - application "Игровое поле. Управление доступно в настройках."
    - text: ЭНЕРГИЯ
    - progressbar "Заряд батареи"
    - strong: 76%
    - strong: "Попытки: 2"
    - text: Смени высоту огня и уничтожь вентиляционный дрон. Очки · 375
    - strong: СЕКТОР 1 · M1A
    - button "Пауза игры": Ⅱ
- text: v0.8.0-alpha.18 · rev f0fffc9 · build verify.45828323324.a1
- paragraph: Cinder Shift 64 is a browser action game by Nuts Games. Prepare Mira, explore five sectors of Caldera 7, choose a route through the foundry, and reach the evacuation platform. Twelve research technologies and six campaign events shape each run. Keyboard, touch and gamepad controls; English and Russian interface. No account required.
```

# Test source

```ts
  1  | import {expect,type Page,type TestInfo} from '@playwright/test';
  2  | import {writeFile} from 'node:fs/promises';
  3  | import {state} from './helpers';
  4  | import {campaignPressure,campaignVisits} from './campaign-pressure';
  5  | 
  6  | export type RouteLoss={mission:string;room:string;reason:string;seconds:number};
  7  | 
  8  | export async function playSector(page:Page,info:TestInfo,losses:RouteLoss[],play:()=>Promise<void>){
  9  |   const retries=info.project.metadata.difficulty ? 2 : 0;
  10 |   let controlRestarts=0;
  11 |   for(let attempt=0;;attempt++){
  12 |     try{await play();return;}catch(error){
  13 |       const failed=await state(page);
  14 |       // A transient Phaser asset-load screen is a test-control interruption,
  15 |       // not a route loss. Reload the persisted sector entrance and continue
  16 |       // without consuming one of the two real-death retries.
  17 |       if(failed.state==='error'&&controlRestarts<2){
  18 |         controlRestarts++;
  19 |         await writeFile(info.outputPath('control-restarts.json'),JSON.stringify({
  20 |           source_sha:failed.sha,seed:4,difficulty:info.project.metadata.difficulty,
  21 |           kind:'asset-load',count:controlRestarts,losses,
  22 |         },null,2));
  23 |         await page.getByTestId('reload').click();
  24 |         await expect(page.getByTestId('continue')).toBeVisible();
  25 |         await page.getByTestId('continue').click();
  26 |         await expect(page.getByTestId('restart-entry')).toBeVisible();
  27 |         await page.getByTestId('restart-entry').click();
  28 |         await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.state==='playing'&&s.simMs>0&&s.player?.vy===0;});
  29 |         attempt--;
  30 |         continue;
  31 |       }
  32 |       if(failed.hp!==0 && failed.pressure?.energy!==0 || !['dying','dead'].includes(failed.state)){
  33 |         const snapshot={source_sha:failed.sha,seed:failed.campaign.campaign_seed,difficulty:failed.campaign.difficulty,mission:failed.missionId,room:failed.room,active_seconds:failed.activeSeconds,score:failed.score,hp:failed.hp,player:failed.player,enemies:failed.enemies,visits:campaignVisits(failed),pressure:campaignPressure(failed.roomStates),losses};
  34 |         await writeFile(info.outputPath('route-stop.json'),JSON.stringify(snapshot,null,2));
  35 |         throw error;
  36 |       }
> 37 |       await expect(page.getByTestId('retry')).toBeVisible();
     |                                               ^ Error: expect(locator).toBeVisible() failed
  38 |       const result=await state(page);
  39 |       const loss={mission:result.missionId,room:result.room,reason:result.campaign.result?.reason??(result.pressure?.energy===0?'energy':'combat'),seconds:result.activeSeconds};
  40 |       losses.push(loss);
  41 |       await writeFile(info.outputPath('losses.json'),JSON.stringify(losses,null,2));
  42 |       await writeFile(info.outputPath('attempt-'+losses.length+'.json'),JSON.stringify({loss,source_sha:result.sha,difficulty:result.campaign.difficulty,seed:result.campaign.campaign_seed,score:result.score,visits:campaignVisits(result),pressure:campaignPressure(result.roomStates)},null,2));
  43 |       if(attempt>=retries)throw error;
  44 |       for(const key of ['a','d','s','Space','j','e'])await page.keyboard.up(key);
  45 |       await page.getByTestId(result.screen==='room-retry'?'restart-mission':'retry').click();
  46 |       await page.waitForFunction((mission)=>{const s=(window as any).__CINDER__();return s.state==='playing'&&s.missionId===mission&&s.simMs>0&&s.player?.vy===0;},loss.mission);
  47 |     }
  48 |   }
  49 | }
  50 | 
```