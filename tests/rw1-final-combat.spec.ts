import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {jump,ground,until,standingJump} from './route-helpers';
import {routeCapture} from './route-capture';

test.use({video:'on'});
for(const depth of [1,2,3])test(`W${depth} real boss volley respects armor and ${depth===3?'reflects into':'directly hits'} the open core`,async({page},info)=>{
 test.setTimeout(45000);const nodes=['W1','W2','W3'].slice(0,depth);
 await encounter(page,{mission:'reactor',room:'M5D',nodes});
 await jump(page,106,180);await ground(page,288);await standingJump(page,272);await ground(page,256);
 await until(page,()=>(window as any).__CINDER__().boss.pattern.phase==='core',null,'core opens');
 const before=await state(page);await page.keyboard.press('j');
 if(depth===3){await until(page,()=>(window as any).__CINDER__().projectiles.some((p:any)=>p.hitIds.includes('solid:regulator-ricochet')&&p.vy>0),null,'actual reflected pellet');await routeCapture(page,info.outputPath('boss-reflected-pellet.png'));}
 await until(page,t=>(window as any).__CINDER__().simMs>t+1000,before.simMs,'volley resolves');
 const first=await state(page);console.log('Boss volley diagnostics',JSON.stringify({nodes,origin:before.player,boss_hp:first.bossHp,remaining:first.projectiles}));expect(first.bossHp).toBe(depth===3?30:31);
 // A second real volley against closed shutters cannot spend piercing on armor.
 await until(page,()=>(window as any).__CINDER__().boss.pattern.phase!=='core',null,'shutters close');
 const closed=await state(page);await page.keyboard.press('j');await until(page,t=>(window as any).__CINDER__().simMs>t+800,closed.simMs,'armored volley resolves');
 const end=await state(page);expect(end.bossHp).toBe(first.bossHp);expect(end.audioStatus.played.hit_armour||0).toBeGreaterThan(0);
 const report={source_sha:end.sha,build:end.build,nodes,hp_after_open:first.bossHp,hp_after_closed:end.bossHp,reflected:depth===3,fixture:'single boss entry, then trusted input only'};
 console.log('Boss ballistics report',JSON.stringify(report));await writeFile(info.outputPath('ballistics.json'),JSON.stringify(report,null,2));
});

test('open core still rejects the floor firing line',async({page})=>{
 await encounter(page,{mission:'reactor',room:'M5D',nodes:['W1','W2','W3']});await jump(page,106,208);await ground(page,320);
 await until(page,()=>(window as any).__CINDER__().boss.pattern.phase==='core',null,'floor core window');const before=await state(page);await page.keyboard.press('j');await until(page,t=>(window as any).__CINDER__().simMs>t+1000,before.simMs,'floor volley resolves');expect((await state(page)).bossHp).toBe(32);
});

test('full defensive build absorbs once but later aimed shots still cost HP',async({page},info)=>{
 test.setTimeout(30000);await encounter(page,{mission:'archive',room:'M4H',nodes:['D1','D2','D3','D4'],clearedEnemyIds:['m4h-drone']});await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');
 await until(page,()=>(window as any).__CINDER__().hp<8,null,'later shot after room shield',15000);await page.keyboard.up('s');const s=await state(page);
 expect(s.hp).toBe(7);expect(s.eventLog.filter((e:any)=>e.name==='shield_absorbed')).toHaveLength(1);expect(s.eventLog.some((e:any)=>e.name==='hit_received'&&e.params.reason==='security-aimed-shot')).toBe(true);expect(s.d4Used).toBe(false);
 await routeCapture(page,info.outputPath('defence-risk.png'));console.log('Defence risk report',JSON.stringify({source_sha:s.sha,nodes:s.loadout.nodes,hp:s.hp,max_hp:s.maxHp,shield_absorbed:1,death_save:s.d4Used,fixture:'no fire or dodge after lane entry'}));
});
