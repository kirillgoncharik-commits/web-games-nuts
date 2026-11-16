import {test,expect} from '@playwright/test';
import {Campaign,newCampaign} from '../games/cinder-shift/src/session/campaign';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {jump,ground,to,clear,until} from './route-helpers';

function seedForPowerEvent(enabled:boolean){
 for(let seed=0;seed<100;seed++){
  const campaign=new Campaign(newCampaign(seed));campaign.data.mission_id='cargo';
  if(campaign.prepare().event_plan.some(e=>e.event_id==='E01')===enabled)return seed;
 }
 throw Error('Missing Cargo event fixture');
}

for(const event of [false,true])test(`Cargo E fires and can be destroyed, E01 ${event?'present':'absent'}`,async({page},info)=>{
 await encounter(page,{mission:'cargo',room:'E',seed:seedForPowerEvent(event),nodes:['D1','D2']});
 await jump(page,130,224);await ground(page,320);
 await until(page,()=>{const s=(window as any).__CINDER__();return s.projectiles.some((p:any)=>p.team==='enemy'&&p.source==='turret-shot');},null,'E turret fires a real projectile');
 await page.keyboard.down('s');await clear(page,['e-turret']);await page.keyboard.up('s');
 const s=await state(page);expect(s.enemies.find((e:any)=>e.id==='e-turret').turret.state).toBe('destroyed');expect(s.exitOpen).toBe(true);
 await info.attach('turret-state.json',{body:JSON.stringify(s,null,2),contentType:'application/json'});await page.screenshot({path:info.outputPath('cargo-E-destroyed.png')});
});

test('Cargo F restoration powers the turret and opens its damage window',async({page},info)=>{
 await encounter(page,{mission:'cargo',room:'F',seed:seedForPowerEvent(true),nodes:['D1','D2']});
 const before=await state(page);expect(before.enemies.find((e:any)=>e.id==='f-event-turret').turret.state).toBe('off');
 await to(page,88);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);
 await jump(page,178,272);await ground(page,320);await page.keyboard.down('s');await clear(page,['f-service']);await to(page,360);
 await until(page,()=>{const s=(window as any).__CINDER__();return s.projectiles.some((p:any)=>p.team==='enemy'&&p.source==='turret-shot');},null,'restored F turret fires');
 await clear(page,['f-event-turret']);await page.keyboard.up('s');
 const s=await state(page);expect(s.enemies.find((e:any)=>e.id==='f-event-turret').turret.state).toBe('destroyed');
 await info.attach('turret-state.json',{body:JSON.stringify(s,null,2),contentType:'application/json'});await page.screenshot({path:info.outputPath('cargo-F-destroyed.png')});
});

test('Cargo F without E01 has an inactive turret and allows the cell route',async({page},info)=>{
 await encounter(page,{mission:'cargo',room:'F',seed:seedForPowerEvent(false),nodes:['D1','D2']});
 await jump(page,178,272);await ground(page,320);await page.keyboard.down('s');await clear(page,['f-service']);await to(page,520);await page.keyboard.up('s');
 const s=await state(page),turret=s.enemies.find((e:any)=>e.id==='f-event-turret');expect(turret.powered).toBe(false);expect(turret.activated).toBe(false);expect(turret.warnings).toBe(0);expect(s.combatRemaining).toBe(0);
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).exitOpen).toBe(true);
 await info.attach('turret-state.json',{body:JSON.stringify(await state(page),null,2),contentType:'application/json'});await page.screenshot({path:info.outputPath('cargo-F-off.png')});
});

test('Airlock penultimate room activates its staged turret after the guard',async({page},info)=>{
 await encounter(page,{mission:'airlock',room:'M1C',nodes:['D1']});
 await jump(page,130,224);await ground(page,320);await page.keyboard.down('s');await clear(page,['m1c-security']);await to(page,360);
 await until(page,()=>{const s=(window as any).__CINDER__();return s.projectiles.some((p:any)=>p.team==='enemy'&&p.source==='turret-shot');},null,'Airlock turret fires after its guard');
 await clear(page,['m1c-turret']);await page.keyboard.up('s');expect((await state(page)).exitOpen).toBe(true);
 await page.screenshot({path:info.outputPath('airlock-turret-destroyed.png')});
});
