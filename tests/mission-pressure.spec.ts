import {expect,test} from '@playwright/test';
import {MissionPressure} from '../games/cinder-shift/src/session/mission-pressure';
import {state} from './helpers';
import {MissionAttempt} from "../games/cinder-shift/src/mission";

test('life loss is idempotent and charging is bounded by capacity and group',()=>{
 for(const [difficulty,lives] of [['easy',3],['hard',2],['nightmare',1]] as const){
  const pressure=new MissionPressure(100,difficulty);
  pressure.spendTime(10_000);
  expect(pressure.energy).toBeCloseTo(100-pressure.preset.drain*10);
  pressure.spendVolley(true);
  expect(pressure.energy).toBeCloseTo(100-pressure.preset.drain*10-3*pressure.preset.volley);
  expect(pressure.charge('shared')).toBeGreaterThan(0);
  expect(pressure.energy).toBe(100);
  pressure.spendTime(20_000);
  expect(pressure.charge('shared')).toBe(0);
  expect(pressure.lives).toBe(lives);
  for(let remaining=lives-1;remaining>=0;remaining--){
   pressure.loseLife();
   pressure.loseLife();
   expect(pressure.lives).toBe(remaining);
   expect(pressure.retry()).toBe(remaining>0);
   expect(pressure.retry()).toBe(false);
  }
  pressure.spendTime(100_000);
  expect(pressure.energy).toBe(0);
  expect(pressure.charge('next')).toBe(0);
 }
});

test('fresh Play reaches the airlock and only active simulation and actual volleys spend energy',async({page},info)=>{
 await page.setViewportSize({width:960,height:540});
 await page.goto('/games/cinder-shift/?seed=0');
 await page.getByTestId('quick-start').click();
 await expect.poll(async()=>Boolean((await state(page)).pressure)).toBe(true);
 const started=await state(page);
 expect(started.room).toBe('A');
 await page.keyboard.press('j');
 await expect.poll(async()=>(await state(page)).pressure.energy).toBeLessThan(started.pressure.energy-0.5);
 await page.keyboard.press('Escape');
 await expect(page.getByTestId('resume')).toBeVisible();
 const paused=await state(page);
 const seconds=paused.activeSeconds;
 expect(paused.pressure.energy).toBeCloseTo(paused.pressure.capacity-seconds-0.5,5);
 await page.waitForTimeout(300);
 expect((await state(page)).pressure.energy).toBe(paused.pressure.energy);
 await page.getByTestId('resume').click();
 await expect.poll(async()=>(await state(page)).pressure.energy).toBeLessThan(paused.pressure.energy);
 await page.screenshot({path:info.outputPath('first-run-hud.png')});
});

test('room retry rolls back resources and world state together while preserving death statistics',()=>{
 const attempt=new MissionAttempt('mission');
 attempt.room('A').terminal=true;
 attempt.campaignScore!.room('A');
 attempt.current='B';
 attempt.clock.now=1000;
 const pressure=attempt.pressure!;
 pressure.spendTime(5000);
 const entry=pressure.energy;
 attempt.captureRoomEntry('right');
 attempt.room().enemies[0].hp=0;
 attempt.campaignScore!.kill('b-enemy','walker');
 attempt.cellCollected=true;
 attempt.regulator.hp=2;
 attempt.d4Used=true;
 attempt.hp=0;
 attempt.activeMs=6000;
 pressure.spendVolley();
 expect(pressure.charge('shared')).toBeGreaterThan(0);
 pressure.loseLife();
 expect(attempt.retryRoom()).toBe('right');
 expect(attempt.retryRoom()).toBeNull();
 expect(pressure.energy).toBe(entry);
 expect(pressure.charges.size).toBe(0);
 expect(pressure.lives).toBe(2);
 expect(pressure.volleyCount).toBe(1);
 expect(attempt.score).toBe(100);
 expect(attempt.room('A').terminal).toBe(true);
 expect(attempt.room('B').enemies[0].hp).toBeGreaterThan(0);
 expect(attempt.cellCollected).toBe(false);
 expect(attempt.regulator.hp).toBeGreaterThan(2);
 expect(attempt.d4Used).toBe(true);
 expect(attempt.activeMs).toBe(6000);
 expect(attempt.hp).toBe(attempt.maxHp);
});
