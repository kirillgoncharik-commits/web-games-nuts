import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {startMission,state,roomA,completeFromB} from './helpers';
import {playCargo} from './cargo-gameplay';
import {campaignFoundry,campaignArchive,campaignReactor,campaignRegulator} from './campaign-gameplay';

test('a fresh profile completes five sectors, saves the real campaign record and reloads it once',async({page},info)=>{
 test.setTimeout(900000);page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);const sectors:any[]=[];const started=Date.now();let id='';let boss:any;
 async function record(){const s=await state(page);expect(s.state).toBe('complete');expect(s.campaign.campaign_id).toBe(id);expect(s.campaign.result.result).toBe('victory');sectors.push({mission:s.missionId,hp:s.hp,max_hp:s.maxHp,active_seconds:s.activeSeconds,score:s.score,visited:Object.values(s.roomStates).filter((r:any)=>r.visited).length,repair:Object.entries(s.roomStates).filter(([,r]:any)=>r.repairUsed).map(([id])=>id),events:s.eventPlan,damage:s.eventLog.filter((e:any)=>e.name==='hit_received')});console.log('Campaign sector complete',JSON.stringify(sectors.at(-1)));}
 async function advance(mission:string){await page.getByTestId('result-research').click();await expect(page.getByTestId('map-pin-'+mission)).toHaveAttribute('aria-pressed','true');await page.getByTestId('map-prepare').click();expect((await state(page)).campaign.nodes).toEqual([]);await page.getByTestId('briefing').click();await page.waitForFunction(mission=>{const s=(window as any).__CINDER__();return s.state==='playing'&&s.missionId===mission&&s.simMs>0&&s.player?.vy===0;},mission);}
 async function career(){return page.evaluate(()=>new Promise<any>((resolve,reject)=>{const open=indexedDB.open('cinder-shift-r01',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('records','readonly'),r=tx.objectStore('records').get('career');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();};}));}
 try{
  await startMission(page,{seed:4});id=(await state(page)).campaign.campaign_id;await roomA(page);await completeFromB(page);await record();
  await advance('cargo');await playCargo(page);await record();
  await advance('foundry');await campaignFoundry(page);await record();
  await advance('archive');await campaignArchive(page);await record();
  await advance('reactor');await campaignReactor(page);boss=await campaignRegulator(page);await record();
  const end=await state(page);expect(end.campaign.completed_missions).toEqual(['airlock','cargo','foundry','archive','reactor']);expect(end.campaign.nodes).toEqual([]);expect(end.campaign.points).toBe(5);expect(end.campaign.reward_ledger).toHaveLength(4);expect(sectors.reduce((n,s)=>n+s.visited,0)).toBe(41);
  await page.getByTestId('result-research').click();await expect(page.getByTestId('new-campaign')).toBeVisible();await expect.poll(async()=>(await state(page)).campaign.stage).toBe('campaign_complete');await expect.poll(async()=>(await career())?.runs.length).toBe(1);
  const saved=await career();expect(saved.runs[0]).toMatchObject({campaign_id:id,ruleset_id:'campaign-rework7',deaths:0,nodes:[],foundry_route:'service',assistance:'standard',history_complete:true});expect(saved.runs[0].active_ms/1000).toBeCloseTo(sectors.reduce((n,s)=>n+s.active_seconds,0),1);
  await page.reload();await page.getByTestId('continue').click();await expect(page.getByTestId('new-campaign')).toBeVisible();expect((await career()).runs).toEqual(saved.runs);expect((await state(page)).campaign.points).toBe(5);expect((await state(page)).campaign.reward_ledger).toEqual(end.campaign.reward_ledger);
  const report={status:'FRESH_PROFILE_FULL_CAMPAIGN_TRUSTED_INPUT',build:end.build,source_sha:end.sha,seed:4,nodes:[],sectors,boss,career_record:saved.runs[0],wall_seconds:(Date.now()-started)/1000,human_duration_target_verified:false,physical_device_verified:false};console.log('Campaign route report',JSON.stringify(report));await writeFile(info.outputPath('campaign-route.json'),JSON.stringify(report,null,2));await page.screenshot({path:info.outputPath('campaign-final-reloaded.png')});
 }catch(error){const s=await state(page);console.log('Campaign route failure',JSON.stringify({sectors:sectors.map(s=>({mission:s.mission,hp:s.hp,seconds:s.active_seconds})),state:s.state,room:s.room,hp:s.hp,player:s.player,enemies:s.enemies,boss:s.boss,campaign:s.campaign}));await writeFile(info.outputPath('failure-state.json'),JSON.stringify(s,null,2));throw error;}
});
