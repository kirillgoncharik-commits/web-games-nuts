import {test,expect} from '@playwright/test';
import {MissionAttempt} from '../games/cinder-shift/src/mission';
import {MissionPressure,pressureCapacity,energyRules} from '../games/cinder-shift/src/session/mission-pressure';
import {Campaign,newCampaign} from '../games/cinder-shift/src/session/campaign';
import {trialRuleset,trialContentId} from '../games/cinder-shift/src/session/challenge-spec';
import {migrateSave,validateSave} from '../games/cinder-shift/src/session/save';
import {readFile} from 'node:fs/promises';
import {state,startMission,roomA,jump} from './helpers';
import {encounter} from './encounter-helpers';

for(const difficulty of ['easy','hard','nightmare'] as const){
 test(`one battery pays for time, own fire and enemy hits on ${difficulty}`,()=>{
  const p=new MissionPressure(100,difficulty);p.enterRoom('A');
  p.spendTime(2000);p.spendVolley();
  const remaining=100-2*p.preset.drain-p.preset.volley;
  expect(p.energy).toBeCloseTo(remaining);
  p.spendHit('walker-shot');
  expect(p.energy).toBeCloseTo(remaining-85);
  expect(p.damageSpent).toBe(85);
  expect(p.segments[0].damage).toBe(85);
  p.spendHit('turret-shot');expect(p.energy).toBe(0);
  p.loseLife();p.loseLife();expect(p.deaths).toBe(1);
  const attempts=p.preset.lives-1;expect(p.lives).toBe(attempts);
  expect(p.restore(1)).toBe(0);expect(p.charge('never')).toBe(0);
  expect(p.retry()).toBe(attempts>0);
 });
}

test('purchased D1 stops a projectile, cannot stop time/fire, and is retained on revisits',()=>{
 const c=new Campaign(newCampaign(4));expect(c.buy('D1')).toBe(true);
 const a=new MissionAttempt('mission',c.prepare());
 const initial=a.energy;
 expect(a.damage(0,'walker-shot')).toBe(true);
 expect(a.lastDamageAbsorbed).toBe(true);expect(a.energy).toBe(initial);expect(a.room().shieldUsed).toBe(true);
 a.pressure!.spendTime(1000);a.pressure!.spendVolley();
 expect(a.energy).toBeCloseTo(initial-1.5);
 a.current='B';expect(a.room().shieldUsed).toBe(false);
 a.current='A';expect(a.room().shieldUsed).toBe(true);
 expect(a.damage(2000,'walker-shot')).toBe(true);
 expect(a.lastDamageAbsorbed).toBe(false);expect(a.energy).toBeCloseTo(initial*.15-1.5);
 // No second health resource exists: old serialized HP is a derived view only.
 expect(Object.hasOwn(a,'hp')).toBe(false);
});

test('a projectile shield does not stop hazards; invulnerability prevents double debit',()=>{
 const c=new Campaign(newCampaign(4));c.buy('D1');const a=new MissionAttempt('mission',c.prepare());
 a.damage(0,'press');expect(a.energy).toBeCloseTo(a.energyCapacity*(1-energyRules.heavyHit));
 expect(a.room().shieldUsed).toBe(false);const energy=a.energy;
 expect(a.damage(1,'walker-shot')).toBe(false);expect(a.energy).toBe(energy);
 a.damage(2000,'walker-shot');expect(a.energy).toBe(energy);expect(a.room().shieldUsed).toBe(true);
});

test('room death restores the B entry battery, shield, enemies and resources without extra rewards',()=>{
 const c=new Campaign(newCampaign(4));c.buy('D1');const a=new MissionAttempt('mission',c.prepare());
 a.room('A').terminal=true;a.campaignScore!.room('A');a.current='B';a.pressure!.spendTime(20_000);
 a.captureRoomEntry('left');a.pressure!.enterRoom('B');const energy=a.energy,score=a.score;
 a.damage(0,'walker-shot');a.damage(2000,'walker-shot');expect(a.energy).toBe(0);
 a.room().enemies[0].hp=0;a.campaignScore!.kill('fixture','walker');a.cellCollected=true;
 a.pressure!.loseLife();a.pressure!.loseLife();expect(a.pressure!.lives).toBe(2);
 expect(a.retryRoom()).toBe('left');expect(a.energy).toBe(energy);expect(a.current).toBe('B');
 expect(a.room().shieldUsed).toBe(false);expect(a.room().enemies[0].hp).toBeGreaterThan(0);
 expect(a.cellCollected).toBe(false);expect(a.score).toBe(score);expect(a.room('A').terminal).toBe(true);
 expect(a.retryRoom()).toBeNull();expect(a.pressure!.deaths).toBe(1);
});

test('repair caches recharge the same battery once, bounded by capacity',()=>{
 const a=new MissionAttempt('mission');a.current='B';a.energy=a.energyCapacity*.1;
 expect(a.claimRepair('R01')).toBe(true);expect(a.energy).toBeCloseTo(a.energyCapacity*(.1+energyRules.repair));
 expect(a.claimRepair('R01')).toBe(false);a.energy=a.energyCapacity-1;
 expect(a.recharge()).toBe(1);expect(a.energy).toBe(a.energyCapacity);
 a.energy=0;expect(a.recharge()).toBe(0);
});

test('D4 restores battery once and stays spent after retry',()=>{
 const c=new Campaign(newCampaign(4));c.data.points=4;
 for(const id of ['D1','D2','D3','D4'] as const)c.buy(id);
 const a=new MissionAttempt('mission',c.prepare());a.current='B';a.energy=10;a.captureRoomEntry('left');
 a.room().shieldUsed=true;a.room().bufferUsed=true;
 a.damage(0,'walker-shot');expect(a.lastDeathSaved).toBe(true);expect(a.energy).toBe(a.energyCapacity*.25);
 a.damage(2000,'walker-shot');expect(a.energy).toBe(0);a.pressure!.loseLife();a.retryRoom();
 expect(a.d4Used).toBe(true);expect(a.energy).toBe(10);
});

test('old D1 save retains purchases and valid result while adopting energy rules',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/personal-records/alpha12-web.json',import.meta.url),'utf8'));
 const save=migrateSave(fixture.records.campaign);const c=new Campaign(save.campaign);
 const a=new MissionAttempt('mission',c.data.entry!);
 expect(a.energy).toBe(pressureCapacity[a.missionId]);expect(a.build.nodes).toContain('D1');
 c.applyResult({attempt_id:a.id,mission_id:a.missionId,result:'death',reason:'energy',hp:0,max_hp:a.maxHp,energy:0,energy_capacity:a.energyCapacity,score:0,active_ms:10,screen_ms:0,nodes:[...a.build.nodes]},3);
 expect(validateSave(save)).toBeNull();
 save.campaign.result!.energy=999;expect(validateSave(save)).toBe('corrupt');
 expect(trialRuleset).toBe('energy-v2');expect(trialContentId('airlock')).toContain('energy-v2');
});

test('browser: workshop shield purchase, one battery HUD, pause and reload',async({page},info)=>{
 await startMission(page,{node:'D1'});
 await expect(page.locator('#energy-meter')).toBeVisible();await expect(page.locator('#hp-segments')).toHaveCount(0);
 await expect(page.locator('#hud-pressure')).toContainText('Попытки');await expect(page.locator('#buffer-status')).toHaveText('Щит: 1');
 await page.screenshot({path:info.outputPath('battery-hud.png')});
 const before=await state(page);await page.keyboard.press('j');await expect.poll(async()=>(await state(page)).pressure.fireSpent).toBe(.5);await page.keyboard.press('Escape');
 await expect(page.getByTestId('resume')).toBeVisible();const paused=await state(page);
 expect(paused.pressure.fireSpent).toBe(.5);expect(paused.energy).toBeLessThan(before.energy);
 await page.waitForTimeout(250);expect((await state(page)).energy).toBe(paused.energy);
 await page.screenshot({path:info.outputPath('battery-pause.png')});
 await page.getByTestId('pause-menu').click();await page.reload();await expect(page.getByTestId('continue')).toBeVisible();
 expect((await state(page)).campaign.nodes).toContain('D1');expect((await state(page)).save.issue).toBeFalsy();
});


test('browser: purchased shield absorbs a real enemy shot and remains readable on mobile',async({page},info)=>{
 test.setTimeout(45000);
 await startMission(page,{node:'D1'});await roomA(page);await jump(page,194,296);
 await expect.poll(async()=>(await state(page)).shieldUsed,{timeout:20000,intervals:[50]}).toBe(true);
 await page.keyboard.press('Escape');const s=await state(page);
 expect(s.pressure.deaths).toBe(0);expect(s.pressure.damageSpent).toBe(0);
 expect(s.eventLog.some((e:any)=>e.name==='shield_absorbed'&&e.params.room_id==='B')).toBe(true);
 await expect(page.locator('#buffer-status')).toHaveText('Щит: 0');
 await page.setViewportSize({width:844,height:390});await page.getByTestId('resume').click();
 const meter=await page.locator('#energy-meter').boundingBox();expect(meter!.width).toBeGreaterThan(0);
 const attempts=await page.locator('#hud-pressure').boundingBox();expect(attempts!.x).toBeGreaterThan(meter!.x+meter!.width);
 await page.screenshot({path:info.outputPath('battery-mobile-shield.png')});
});

test('browser: empty battery spends attempts once and ends after the last screen restart',async({page})=>{
 await encounter(page,{mission:'airlock',room:'B',cleared:true,energy:1.2});
 await expect.poll(async()=>(await state(page)).state,{timeout:10000}).toBe('dead');
 const s=await state(page);expect(s.room).toBe('B');expect(s.pressure.lives).toBe(0);expect(s.pressure.deaths).toBe(3);
 expect(s.campaign.result.reason).toBe('energy');expect(s.campaign.result.energy).toBe(0);
 expect(s.campaign.run_stats.deaths).toBe(3);expect(s.eventLog.filter((e:any)=>e.name==='mission_end')).toHaveLength(1);
 await page.reload();await expect(page.getByTestId('continue')).toBeVisible();expect((await state(page)).save.issue).toBeFalsy();
});
