import {test,expect,type Page} from '@playwright/test';
import {Campaign,newWorldCampaign,contentVersion} from '../games/cinder-shift/src/session/campaign';
import {CampaignScore} from '../games/cinder-shift/src/session/campaign-score';
import {ScoreLedger} from '../games/cinder-shift/src/session/score-ledger';
import {MissionAttempt,rooms} from '../games/cinder-shift/src/mission';
import {validateWorldSave} from '../games/cinder-shift/src/session/save';
import {roomThreatCanActivate} from '../games/cinder-shift/src/session/threat-activation';
import {createEnemy} from '../games/cinder-shift/src/enemies';
import {startMission,roomA,completeFromB,state} from './helpers';

test('each scoring event is paid once and only extraction delivers the optional cargo',()=>{
 for(const outcome of ['victory','death','abandoned'] as const){
  const score=new CampaignScore();
  for(const [kind,award] of [['walker',50],['drone',75],['turret',150]] as const){
   const before=score.total;
   score.kill(kind,kind);expect(score.total).toBe(before+award);
   score.kill(kind,kind);expect(score.total).toBe(before+award);
  }
  for(let repeat=0;repeat<2;repeat++){
   score.room('SW01-A');score.cache('c',150);score.patrol('elite',250);
  }
  expect(score.total).toBe(775);
  score.finish(outcome);score.finish('victory');score.room('late');
  expect(score.breakdown()).toEqual({combat:525,rooms:100,salvage:150,extraction:outcome==='victory'?1200:0});
  expect(score.total).toBe(outcome==='victory'?1975:775);
 }
});

test('each attachment unlocks at its exact price in the pre-run shop',()=>{
 for(const [item,price] of [['accelerator',200],['cycler',450]] as const){
  const campaign=new Campaign(newWorldCampaign('c02-small-world',4));
  campaign.data.stage='research';
  expect(campaign.chooseAttachment(null)).toBe(true);
  expect(campaign.chooseAttachment(item)).toBe(false);
  campaign.data.loadout_budget=price-1;
  expect(campaign.chooseAttachment(item)).toBe(false);
  campaign.data.loadout_budget=price;
  expect(campaign.chooseAttachment(item)).toBe(true);
  campaign.prepare();campaign.begin();
  expect(campaign.data.entry?.attachment).toBe(item);
  expect(campaign.data.loadout_budget).toBe(0);
  expect(campaign.chooseAttachment(item)).toBe(false);
 }
});

test('prior attempt funds one attachment and retries cannot spend the same score twice',()=>{
 const c=new Campaign(newWorldCampaign('c02-small-world',4));
 c.prepare();c.begin();
 const entry=c.data.entry!,a=new MissionAttempt('mission',entry);
 a.recordKill(createEnemy(rooms['SW01-A'].enemies[0]));
 a.campaignScore!.room('SW01-A');a.campaignScore!.cache('test',150);a.finish('death');
 const result={attempt_id:a.id,mission_id:a.missionId,result:'death' as const,reason:'test',hp:0,max_hp:a.maxHp,active_ms:2000,screen_ms:50,nodes:[],score:a.score,score_breakdown:a.campaignScore!.breakdown()};
 expect(c.applyResult(result)).toBe(true);expect(c.applyResult(result)).toBe(false);
 expect(c.data.run_stats.score).toBe(0);expect(c.data.loadout_budget).toBe(300);
 c.data.stage='research';expect(c.chooseAttachment('cycler')).toBe(false);
 expect(c.chooseAttachment('accelerator')).toBe(true);
 const resumed=new Campaign(c.snapshot());resumed.prepare();resumed.begin();
 const actual=new MissionAttempt('mission',resumed.data.entry!);
 expect(actual.profile.projectileSpeed).toBe(a.profile.projectileSpeed*1.25);
 expect(actual.score).toBe(0);expect(resumed.data.loadout_budget).toBe(0);
 const envelope={schema_version:1,content_version:'worlds-rw3.1',game_id:'c02-small-world',build_id:contentVersion,saved_at:new Date().toISOString(),campaign:resumed.snapshot()};
 expect(validateWorldSave(envelope,'c02-small-world')).toBeNull();
 resumed.begin();expect(resumed.data.entry?.attachment).toBeUndefined();
 const trial=new MissionAttempt('mission',entry,new ScoreLedger(),false);
 expect(trial.campaignScore).toBeUndefined();expect(new MissionAttempt('training').campaignScore).toBeUndefined();
});

test('every relief unit follows an existing reachable lead in its own room',()=>{
 for(const room of Object.values(rooms).filter(r=>r.world)){
  const enemies=room.enemies.map(createEnemy);
  expect(new Set(enemies.map(e=>e.id)).size).toBe(enemies.length);
  for(const unit of enemies.filter(e=>e.afterEnemy)){
   let current=unit;
   const seen=new Set([unit.id]);
   while(current.afterEnemy){
    const lead=enemies.find(e=>e.id===current.afterEnemy);
    expect(lead,unit.id).toBeDefined();expect(seen.has(lead!.id)).toBe(false);
    current=lead!;seen.add(current.id);
   }
   const leader=enemies.find(e=>e.id===unit.afterEnemy)!;
   expect(roomThreatCanActivate(room.id,unit,enemies,{x:600,y:300},room.solids)).toBe(false);
   leader.hp=0;
   expect(roomThreatCanActivate(room.id,unit,enemies,{x:600,y:300},room.solids)).toBe(true);
   leader.hp=1;
  }
 }
});

async function measureFire(page:Page){
 await page.keyboard.down('j');
 try{
  return await page.evaluate(()=>new Promise<{speed:number;interval:number}>((resolve,reject)=>{
   const deadline=performance.now()+5000,times:number[]=[];
   let lastX=Infinity;
   function observe(){
    const s=(window as any).__CINDER__();
    const central=s.projectiles.filter((p:any)=>p.team==='player'&&p.vx>0&&Math.abs(p.vy)<0.01);
    const newest=central.sort((a:any,b:any)=>a.x-b.x)[0];
    if(newest&&newest.x<lastX){
     // Correct for distance already travelled between input and the observed frame.
     times.push(s.simMs-(newest.x-s.player.x-19)/newest.vx*1000);
     if(times.length===9){resolve({speed:newest.vx,interval:(times[8]-times[0])/8});return;}
    }
    lastX=newest?.x??Infinity;
    if(performance.now()>deadline){reject(Error('No nine observable cutter volleys'));return;}
    requestAnimationFrame(observe);
   }
   observe();
  }));
 }finally{await page.keyboard.up('j');}
}

for(const attachment of ['accelerator','cycler'] as const)test('Airlock banks score and measures real volleys with '+attachment,async({page})=>{
 test.setTimeout(180000);
 await startMission(page,{seed:4,node:'W1',locale:'en'});
 await expect(page.locator('#hud-score')).toHaveText('Score · 0');
 const stock=await measureFire(page);
 await roomA(page,true);
 await expect(page.locator('#hud-score')).toHaveText('Score · 150');
 await completeFromB(page,{coveringFire:true});
 await expect(page.getByTestId('arcade-total')).toBeVisible();
 const result=(await state(page)).campaign.result;
 expect(result.score_breakdown).toEqual({combat:675,rooms:600,salvage:0,extraction:1000});
 expect(result.score).toBe(2275);
 await page.reload();await page.getByTestId('continue').click();
 await expect(page.getByTestId('arcade-total')).toBeVisible();
 await page.getByTestId('retry-loadout').click();
 await page.getByTestId('run-attachment').selectOption(attachment);
 await page.getByTestId('briefing').click();
 if(await page.getByTestId('skip-arrival').isVisible())await page.getByTestId('skip-arrival').click();
 await expect.poll(async()=>(await state(page)).campaign.entry?.attachment).toBe(attachment);
 await expect(page.locator('#hud-score')).toHaveText('Score · 0');
 expect((await state(page)).campaign.loadout_budget).toBe(0);
 await expect.poll(async()=>(await state(page)).state).toBe('playing');
 const equipped=await measureFire(page);
 expect(equipped.speed/stock.speed).toBeCloseTo(attachment==='accelerator'?1.25:1,3);
 const expected=attachment==='cycler'?stock.interval/1.15:stock.interval;
 expect(Math.abs(equipped.interval-expected)).toBeLessThan(5);
 console.log('Cutter volleys',JSON.stringify({attachment,stock,equipped}));
});
