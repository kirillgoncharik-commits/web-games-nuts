# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sprint2-media.spec.ts >> RW2 audible fresh-profile C01 journey
- Location: tests/sprint2-media.spec.ts:17:1

# Error details

```
Error: expect(received).toMatchObject(expected)

- Expected  - 1
+ Received  + 1

@@ -4,7 +4,7 @@
    "deaths": 0,
    "difficulty": "easy",
    "foundry_route": "service",
    "history_complete": true,
    "nodes": Array [],
-   "ruleset_id": "campaign-arcade1",
+   "ruleset_id": "campaign-pressure-v1",
  }
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - link "Nuts Games" [ref=e4] [cursor=pointer]:
        - /url: /games/
        - text: NUTS
        - generic [ref=e5]: GAMES
      - generic [ref=e6]: CINDER SHIFT 64
      - generic [ref=e7]:
        - 'button "Звук: вкл" [disabled] [ref=e8]'
        - button "Настройки" [disabled] [ref=e9]
        - button "Пауза" [disabled] [ref=e10]
    - region "Cinder Shift 64" [ref=e11]:
      - generic [ref=e12]:
        - application "Игровое поле. Управление доступно в настройках." [ref=e14]
        - dialog [ref=e16]:
          - generic [ref=e17]:
            - generic [ref=e18]:
              - paragraph [ref=e19]: ЗАДАНИЕ ВЫПОЛНЕНО
              - heading "Кампания завершена" [level=2] [ref=e20]
            - generic [ref=e21]:
              - paragraph [ref=e22]: Очки · 2 775
              - paragraph [ref=e23]: Бой 875 · Комнаты 900 · Находки 0 · Эвакуация 1 000
              - generic [aria-hidden] [ref=e24]: ✓
              - status [ref=e25]:
                - paragraph [ref=e32]: Регулятор затих. Мира добралась до эвакуационного челнока.
              - generic [ref=e33]:
                - paragraph [ref=e34]: "Активное время: 405,3 с"
                - paragraph [ref=e35]: "Смертей: 0"
                - paragraph [ref=e36]: Итог кампании · 12 700
                - paragraph [ref=e37]: "Сборка: Базовый костюм"
                - paragraph [ref=e38]: "Активный слот: Не установлен"
                - paragraph [ref=e39]: "Маршрут Литейной: Выбрать Сервис"
              - paragraph [ref=e40]: "Лучший счёт кампании для этой версии: 12 700"
            - generic [ref=e41]:
              - button "Выбрать новую кампанию" [active] [ref=e42] [cursor=pointer]
              - button "Начать новую кампанию" [ref=e43] [cursor=pointer]
              - button "Испытания" [ref=e44] [cursor=pointer]
              - button "В меню" [ref=e45] [cursor=pointer]
  - generic "Build version": v0.8.0-alpha.17 · rev d852103 · build verify.45794563225.a1
  - paragraph [ref=e46]: Cinder Shift 64 is a browser action game by Nuts Games. Prepare Mira, explore five sectors of Caldera 7, choose a route through the foundry, and reach the evacuation platform. Twelve research technologies and six campaign events shape each run. Keyboard, touch and gamepad controls; English and Russian interface. No account required.
```

# Test source

```ts
  1  | import {playSector,type RouteLoss} from './campaign-retry';
  2  | import {campaignPressure,campaignVisits} from './campaign-pressure';
  3  | import {test,expect,type Page,type TestInfo} from '@playwright/test';
  4  | import {writeFile} from 'node:fs/promises';
  5  | import {startMission,state,roomA,completeFromB} from './helpers';
  6  | import {playCargo} from './cargo-gameplay';
  7  | import {campaignFoundry,campaignArchive,campaignReactor,campaignRegulator} from './campaign-gameplay';
  8  | 
  9  | export async function campaignJourney(page:Page,info:TestInfo,hooks:{started?:()=>Promise<void>;beforeReload?:()=>Promise<void>}={}){
  10 |  test.setTimeout(900000);page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);const sectors:any[]=[],losses:RouteLoss[]=[];const started=Date.now();let id='';let boss:any;
  11 |  async function record(){const s=await state(page);expect(s.state).toBe('complete');expect(s.campaign.campaign_id).toBe(id);expect(s.campaign.result.result).toBe('victory');await expect(page.locator('.sector-consequence')).toBeVisible();await expect(page.locator('.sector-power i.live')).toHaveCount(sectors.length+1);sectors.push({mission:s.missionId,hp:s.hp,max_hp:s.maxHp,active_seconds:s.activeSeconds,score:s.score,visits:campaignVisits(s),pressure:campaignPressure(s.roomStates),visited:Object.values(s.roomStates).filter((r:any)=>r.visited).length,repair:Object.entries(s.roomStates).filter(([,r]:any)=>r.repairUsed).map(([id])=>id),events:s.eventPlan,damage:s.eventLog.filter((e:any)=>e.name==='hit_received')});await writeFile(info.outputPath('sector-'+s.missionId+'.json'),JSON.stringify({source_sha:s.sha,seed:s.campaign.campaign_seed,difficulty:s.campaign.difficulty,losses:losses.filter(loss=>loss.mission===s.missionId),...sectors.at(-1)},null,2));console.log('Campaign sector complete',JSON.stringify(sectors.at(-1)));}
  12 |  async function advance(mission:string){await page.getByTestId('result-research').click();await expect(page.getByTestId('map-pin-'+mission)).toHaveAttribute('aria-pressed','true');await page.getByTestId('map-prepare').click();expect((await state(page)).campaign.nodes).toEqual([]);await page.getByTestId('briefing').click();await page.waitForFunction(mission=>{const s=(window as any).__CINDER__();return s.state==='playing'&&s.missionId===mission&&s.simMs>0&&s.player?.vy===0;},mission);}
  13 |  async function career(){return page.evaluate(()=>new Promise<any>((resolve,reject)=>{const open=indexedDB.open('cinder-shift-r01',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('records','readonly'),r=tx.objectStore('records').get('career');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();};}));}
  14 |  try{
  15 |   await startMission(page,{seed:4,difficulty:info.project.metadata.difficulty});await hooks.started?.();id=(await state(page)).campaign.campaign_id;const coveringFire=Boolean(info.project.metadata.difficulty);
  16 |   await playSector(page,info,losses,async()=>{await roomA(page,coveringFire);await completeFromB(page,{coveringFire});});await record();
  17 |   await advance('cargo');await playSector(page,info,losses,()=>playCargo(page));await record();
  18 |   await advance('foundry');await playSector(page,info,losses,()=>campaignFoundry(page));await record();
  19 |   await advance('archive');await playSector(page,info,losses,()=>campaignArchive(page));await record();
  20 |   await advance('reactor');await playSector(page,info,losses,async()=>{await campaignReactor(page);boss=await campaignRegulator(page);});await record();
  21 |   const end=await state(page);expect(end.campaign.completed_missions).toEqual(['airlock','cargo','foundry','archive','reactor']);expect(end.campaign.nodes).toEqual([]);expect(end.campaign.points).toBe(5);expect(end.campaign.reward_ledger).toHaveLength(4);expect(sectors.reduce((n,s)=>n+s.visited,0)).toBe(41);
  22 |   await page.getByTestId('result-research').click();await expect(page.getByTestId('new-campaign')).toBeVisible();await expect.poll(async()=>(await state(page)).campaign.stage).toBe('campaign_complete');await expect.poll(async()=>(await career())?.runs.length).toBe(1);
> 23 |   const saved=await career();expect(saved.runs[0]).toMatchObject({campaign_id:id,ruleset_id:'campaign-arcade1',deaths:losses.length,nodes:[],difficulty:info.project.metadata.difficulty??'easy',foundry_route:'service',assistance:'standard',history_complete:true});expect(saved.runs[0].active_ms/1000).toBeCloseTo(sectors.reduce((n,s)=>n+s.active_seconds,losses.reduce((total,loss)=>total+loss.seconds,0)),1);
     |                                                    ^ Error: expect(received).toMatchObject(expected)
  24 |   await hooks.beforeReload?.();await page.reload();await page.getByTestId('continue').click();await expect(page.getByTestId('new-campaign')).toBeVisible();expect((await career()).runs).toEqual(saved.runs);expect((await state(page)).campaign.points).toBe(5);expect((await state(page)).campaign.reward_ledger).toEqual(end.campaign.reward_ledger);
  25 |   const report={status:'FRESH_PROFILE_FULL_CAMPAIGN_TRUSTED_INPUT',build:end.build,source_sha:end.sha,seed:4,nodes:[],sectors,losses,boss,career_record:saved.runs[0],wall_seconds:(Date.now()-started)/1000,human_duration_target_verified:false,physical_device_verified:false};console.log('Campaign route report',JSON.stringify(report));await writeFile(info.outputPath('campaign-route.json'),JSON.stringify(report,null,2));await page.screenshot({path:info.outputPath('campaign-final-reloaded.png')});
  26 |  }catch(error){const s=await state(page);console.log('Campaign route failure',JSON.stringify({sectors:sectors.map(s=>({mission:s.mission,hp:s.hp,seconds:s.active_seconds})),state:s.state,room:s.room,hp:s.hp,player:s.player,enemies:s.enemies,boss:s.boss,campaign:s.campaign}));await writeFile(info.outputPath('failure-state.json'),JSON.stringify(s,null,2));throw error;}
  27 | }
  28 | 
```