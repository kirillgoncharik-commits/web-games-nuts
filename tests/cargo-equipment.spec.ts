import {test,expect} from '@playwright/test';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {ground,to,jump,next,until} from './route-helpers';

test('the Cargo console powers the next real bay and opens its decision lock',async({page},info)=>{
 await encounter(page,{mission:'cargo',room:'M2C'});
 expect((await state(page)).exitOpen).toBe(false);
 await to(page,100);await page.keyboard.press('e');
 await expect.poll(async()=>(await state(page)).cargoCircuit).toBe('conveyor');
 expect((await state(page)).exitOpen).toBe(true);
 await jump(page,236,332);await ground(page,320);await next(page,'M2D');
 const s=await state(page);expect(s.conveyor.enabled).toBe(true);
 expect(s.enemies.find((e:any)=>e.id==='m2d-routed-turret').powered).toBe(false);
 await page.screenshot({path:info.outputPath('cargo-powered-conveyor.png')});
});

for(const circuit of ['conveyor','security'] as const)test(`Cargo ${circuit} power applies the correct physical surface transport`,async({page},info)=>{
 // Isolate transport after combat; the full route suite defeats the real threats.
 await encounter(page,{mission:'cargo',room:'M2D',cargoCircuit:circuit,cleared:true});
 await jump(page,114,208);await ground(page,320);await to(page,380);await ground(page,320);
 const before=await state(page);
 await until(page,start=>(window as any).__CINDER__().simMs>=start+600,before.simMs,'conveyor movement');
 const after=await state(page),drift=after.player.x-before.player.x;
 if(circuit==='conveyor'){expect(drift).toBeLessThan(-15);expect(drift).toBeGreaterThan(-26);}
 else expect(Math.abs(drift)).toBeLessThan(2);
 expect(after.hp).toBe(6);expect(Math.abs(after.player.vx)).toBeLessThan(1);
 await page.screenshot({path:info.outputPath('cargo-'+circuit+'-transport.png')});
});
