import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {ground,to,jump,next,until} from './route-helpers';

const builds=[{id:'base',nodes:[],active:null},{id:'weapon',nodes:['W1','W2','W3','W4'],active:'W4'},{id:'movement',nodes:['M1','M2','M3','M4'],active:'M1'},{id:'defence',nodes:['D1','D2','D3','D4'],active:null}] as const;
for(const build of builds)test(`Regulator ${build.id} survives both phases and confirms evacuation with trusted input`,async({page},info)=>{
 test.setTimeout(210000);const phases=new Set<string>(),windows=new Set<string>();let lastWarning='',firing=false,climbed=false;const started=Date.now();
 async function fire(on:boolean){if(on!==firing){await page.keyboard[on?'down':'up']('j');firing=on;}}
 async function climb(){await jump(page,106,180);await ground(page,288);await jump(page,176,272);await ground(page,256);climbed=true;}
 try{
  await encounter(page,{mission:'reactor',room:'M5D',seed:4,nodes:[...build.nodes],active:build.active});await climb();
  for(let i=0;i<2200;i++){
   const s=await state(page),p=s.boss.pattern;phases.add(p.stage);if(s.hp<=0||s.state!=='playing')throw Error('Boss run ended before shutdown');if(s.bossHp<=0)break;
   if(p.stage==='lanes'){
    if(p.phase==='warning'&&p.warningId!==lastWarning){await fire(false);lastWarning=p.warningId;await to(page,s.boss.aimX<266?300:232);await ground(page,256);}
    if(p.phase==='core'){windows.add(p.stage+':'+p.cycle);await fire(true);if(build.active==='W4')await page.keyboard.press('k');}else await fire(false);
   }else if(p.stage==='transition'||p.stage==='sweep'){
    if(p.stage==='transition'||p.phase==='warning'){
     await fire(false);if(s.player.x>110){await to(page,100);await ground(page,320);}climbed=false;
    }else if(p.phase==='active'){
     await fire(false);if(!climbed&&p.rects[0].x>330)await climb();
    }else if(p.phase==='core'){
     if(!climbed)await climb();windows.add(p.stage+':'+p.cycle);await fire(true);if(build.active==='W4')await page.keyboard.press('k');
    }else await fire(false);
   }
   await page.waitForTimeout(45);
  }
  await fire(false);const down=await state(page);expect(down.bossHp).toBe(0);expect(phases.has('lanes')&&phases.has('transition')&&phases.has('sweep')).toBe(true);expect(windows.size).toBeGreaterThanOrEqual(4);expect(down.eventLog.filter((e:any)=>e.name==='boss_defeated')).toHaveLength(1);await next(page,'M5E');
  await jump(page,194,300);await ground(page,320);await jump(page,354,474);await ground(page,320);await to(page,568);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().objective,null,'evacuation terminal');await page.keyboard.up('e');await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().state==='complete',null,'campaign result');await page.keyboard.up('d');
  const end=await state(page);expect(end.campaign.result.result).toBe('victory');expect(end.campaign.completed_missions).toContain('reactor');expect(end.hp).toBeGreaterThan(0);
  const report={status:'AUTOMATED_BOSS_AND_EVACUATION_FROM_SECTOR_FIXTURE',source_sha:end.sha,build:end.build,loadout:build,phases:[...phases],windows:[...windows],active_seconds:end.activeSeconds,wall_seconds:(Date.now()-started)/1000,hp:end.hp,damage:end.eventLog.filter((e:any)=>e.name==='hit_received'),full_campaign_verified:false,human_duration_target_verified:false};console.log('Regulator route report',JSON.stringify(report));await writeFile(info.outputPath('regulator-route.json'),JSON.stringify(report,null,2));await page.screenshot({path:info.outputPath('evacuation-result.png')});
 }catch(error){const s=await state(page);console.log('Regulator route failure',JSON.stringify({build:build.id,state:s.state,hp:s.hp,player:s.player,boss:s.boss,room:s.room,phases:[...phases],windows:[...windows]}));await writeFile(info.outputPath('failure-state.json'),JSON.stringify(s,null,2));throw error;}
});
