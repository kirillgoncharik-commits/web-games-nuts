import {test,expect} from '@playwright/test';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {ground,to,jump,until} from './route-helpers';

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
