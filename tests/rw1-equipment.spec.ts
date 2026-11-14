import {test,expect} from '@playwright/test';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {ground,to,jump,cross,until} from './route-helpers';

test('W3 reflects a real spread pellet off the Archive panel and consumes its bounce',async({page})=>{
 await encounter(page,{mission:'archive',room:'M4G',nodes:['W1','W2','W3'],cleared:true});await jump(page,114,208);await ground(page,320);
 await page.keyboard.down('j');await until(page,()=>{const s=(window as any).__CINDER__();return s.projectiles.some((p:any)=>p.team==='player'&&p.ricochets===0&&p.vy>0&&p.hitIds.includes('solid:m4g-ricochet'));},null,'reflected pellet');await page.keyboard.up('j');
 expect((await state(page)).roomStates.M4G.brokenPanels).toEqual([]);
});

for(const wallMove of [false,true])test(`M${wallMove?3:2} ${wallMove?'crosses':'stops at'} the marked Archive wall`,async({page})=>{
 await encounter(page,{mission:'archive',room:'M4F',nodes:wallMove?['M1','M2','M3']:['M1','M2'],cleared:true});await jump(page,114,208);await ground(page,320);await to(page,320);await ground(page,320);
 const before=(await state(page)).simMs;await page.keyboard.press('k');await until(page,before=>(window as any).__CINDER__().simMs>before+400,before,'dash completion');
 const s=await state(page);expect(s.player.x)[wallMove?'toBeGreaterThan':'toBeLessThanOrEqual'](wallMove?384:341);expect(s.solids.some((r:any)=>r.id==='archive-scout-screen')).toBe(true);expect(s.eventLog.some((e:any)=>e.name==='ability_used'&&e.params.ability==='M1')).toBe(true);
});

for(const phaseDash of [false,true])test(`M${phaseDash?4:3} ${phaseDash?'crosses':'stops at'} the marked Reactor phase barrier`,async({page})=>{
 await encounter(page,{mission:'reactor',room:'M5A',nodes:phaseDash?['M1','M2','M3','M4']:['M1','M2','M3'],cleared:true});await jump(page,130,224);await ground(page,320);await page.keyboard.down('s');await to(page,340);await page.keyboard.up('s');await ground(page,320);
 const before=(await state(page)).simMs;await page.keyboard.press('k');await until(page,before=>(window as any).__CINDER__().simMs>before+400,before,'phase dash completion');const s=await state(page);expect(s.player.x)[phaseDash?'toBeGreaterThan':'toBeLessThanOrEqual'](phaseDash?400:357);expect(s.roomStates.M5A.brokenPanels).toEqual([]);
});

test('D4 prevents one real lethal contact after the room shield, then a second lethal hit ends the attempt',async({page})=>{
 test.setTimeout(45000);await encounter(page,{mission:'reactor',room:'M5I',nodes:['D1','D2','D3','D4'],hp:1,reactorCircuit:'isolation'});await jump(page,106,200);await ground(page,320);await to(page,290);await ground(page,320);
 await until(page,()=>{const s=(window as any).__CINDER__();return s.d4Used;},null,'D4 rescue');const rescued=await state(page);expect(rescued.hp).toBe(2);expect(rescued.bufferUsed).toBe(true);expect(rescued.eventLog.filter((e:any)=>e.name==='death_prevented')).toHaveLength(1);
 await until(page,()=>(window as any).__CINDER__().state==='dead',null,'second lethal contact',20000);const dead=await state(page);expect(dead.hp).toBe(0);expect(dead.eventLog.filter((e:any)=>e.name==='death_prevented')).toHaveLength(1);
});

import {hasEvent,planEvents} from '../games/cinder-shift/src/session/events';
import {missionSeed} from '../games/cinder-shift/src/session/missions';
import {routeCapture} from './route-capture';

for(const shieldClear of [false,true])test(`D${shieldClear?3:2} ${shieldClear?'clears':'preserves'} other in-flight turret shots after absorption`,async({page},info)=>{
 await encounter(page,{mission:'reactor',room:'M5I',reactorCircuit:'cooling',clearedEnemyIds:['m5i-ram'],nodes:shieldClear?['D1','D2','D3']:['D1','D2']});await jump(page,106,200);await ground(page,320);await to(page,368);await ground(page,320);
 await until(page,()=>{const s=(window as any).__CINDER__();return s.bufferUsed&&s.feedback.shieldAlpha>0;},null,'turret shield absorption');const s=await state(page);expect(s.hp).toBe(8);const remaining=s.projectiles.filter((p:any)=>p.team==='enemy');expect(remaining.length)[shieldClear?'toBe':'toBeGreaterThan'](0);expect(s.audioStatus.played.power_restore||0).toBeGreaterThan(0);if(shieldClear)await routeCapture(page,info.outputPath('rw1-D3-absorption.png'));
});

for(const enabled of [false,true])test(`E04 ${enabled?'enables':'omits'} the real Foundry heat cycle`,async({page},info)=>{
 test.setTimeout(45000);const seed=Array.from({length:256},(_,i)=>i).find(seed=>hasEvent(planEvents(missionSeed(seed,'foundry'),'foundry'),'E04')===enabled);if(seed===undefined)throw Error('Missing E04 seed');
 await encounter(page,{mission:'foundry',room:'M3C',seed,cleared:true});expect((await state(page)).eventPlan.some((e:any)=>e.event_id==='E04')).toBe(enabled);await jump(page,114,208);await ground(page,320);await cross(page,'m3c-press');await to(page,448);await ground(page,320);
 expect((await state(page)).hazards.some((h:any)=>h.id==='m3c-heat')).toBe(enabled);
 if(enabled){await until(page,()=>(window as any).__CINDER__().hazards.find((h:any)=>h.id==='m3c-heat')?.phase==='active',null,'live E04 heat',12000);expect((await state(page)).hp).toBe(6);expect((await state(page)).audioStatus.played.warn_drone||0).toBeGreaterThan(0);await routeCapture(page,info.outputPath('rw1-E04-active.png'));await cross(page,'m3c-heat',536);}else await to(page,536);expect((await state(page)).hp).toBe(6);
});

test('selected W4 applies four real core damage and rejects a second activation during cooldown',async({page},info)=>{
 test.setTimeout(45000);await encounter(page,{mission:'reactor',room:'M5D',nodes:['W1','W2','W3','W4'],active:'W4'});await jump(page,106,180);await ground(page,288);await jump(page,176,272);await ground(page,256);
 await until(page,()=>(window as any).__CINDER__().boss.pattern.phase==='core',null,'first W4 core');const before=await state(page);await page.keyboard.press('k');await until(page,()=>(window as any).__CINDER__().bossHp===28,null,'four core damage');const first=await state(page);expect(first.player.chargeReady-before.simMs).toBeGreaterThanOrEqual(4900);expect(first.player.chargeReady-before.simMs).toBeLessThanOrEqual(5100);
 await page.keyboard.press('k');await until(page,before=>(window as any).__CINDER__().simMs>before+600,first.simMs,'cooldown rejection');expect((await state(page)).bossHp).toBe(28);expect((await state(page)).player.chargeReady).toBe(first.player.chargeReady);await routeCapture(page,info.outputPath('rw1-W4-core.png'));
 await until(page,cycle=>{const s=(window as any).__CINDER__();return s.boss.pattern.phase==='core'&&s.boss.pattern.cycle>cycle;},before.boss.pattern.cycle,'next W4 core',12000);await page.keyboard.press('k');await until(page,()=>(window as any).__CINDER__().bossHp===24,null,'second charged hit');const end=await state(page),used=end.eventLog.filter((e:any)=>e.name==='ability_used'&&e.params.ability==='W4');expect(used).toHaveLength(2);expect(used[1].params.active_duration-used[0].params.active_duration).toBeGreaterThanOrEqual(5);expect(end.hp).toBeGreaterThan(0);
});
