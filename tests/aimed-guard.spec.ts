import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {jump,ground,until} from './route-helpers';
import {routeCapture} from './route-capture';

const builds=[{id:'base',nodes:[],active:null},{id:'weapon',nodes:['W1','W2','W3','W4'],active:'W4'},{id:'movement',nodes:['M1','M2','M3','M4'],active:'M1'},{id:'defence',nodes:['D1','D2','D3','D4'],active:null}] as const;
for(const build of builds)test(`marksman armor, locked shot and jump counter work for ${build.id}`,async({page},info)=>{
 test.setTimeout(60000);
 await encounter(page,{mission:'archive',room:'M4H',nodes:[...build.nodes],active:build.active,clearedEnemyIds:['m4h-drone']});
 await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await page.keyboard.down('j');
 await until(page,()=>{const e=(window as any).__CINDER__().enemies[0];return e.aimLocked&&e.phase==='telegraph';},null,'marksman aim lock');
 const locked=await state(page);expect(locked.enemies[0].hp).toBe(3);expect(locked.enemies[0].aim.y).toBeGreaterThan(300);expect(locked.audioStatus.played.hit_armour||0).toBeGreaterThan(0);
 if(build.id==='base')await routeCapture(page,info.outputPath('guard-armor-lock.png'));
 await until(page,()=>(window as any).__CINDER__().projectiles.some((s:any)=>s.source==='security-aimed-shot'),null,'committed aimed shot');
 // Evade the projectile when its actual remaining travel is one jump response.
 await until(page,()=>{const s=(window as any).__CINDER__(),p=s.projectiles.find((p:any)=>p.source==='security-aimed-shot');return p&&(s.player.x-p.x)/p.vx<=.30;},null,'incoming shot response');
 await page.keyboard.up('s');await page.keyboard.down('Space');
 const started=(await state(page)).simMs;
 await until(page,start=>{const s=(window as any).__CINDER__();return s.simMs>start+340;},started,'jump clears locked line');
 await page.keyboard.up('Space');await ground(page,320);
 await until(page,()=>(window as any).__CINDER__().enemies[0].hp<=0,null,'marksman counterattack');await page.keyboard.up('j');
 const end=await state(page);expect(end.hp).toBe(end.maxHp);expect(end.eventLog.filter((e:any)=>e.name==='shield_absorbed')).toHaveLength(0);expect(end.exitOpen).toBe(true);
 if(build.id==='base')await routeCapture(page,info.outputPath('guard-counter.png'));
 const report={source_sha:end.sha,build:end.build,loadout:build.id,locked_aim:locked.enemies[0].aim,warning_remaining_ms:locked.enemies[0].remaining,hp:end.hp,max_hp:end.maxHp,armour_cues:end.audioStatus.played.hit_armour||0,damage:end.eventLog.filter((e:any)=>e.name==='hit_received'),fixture:'sector entry; drone cleared to isolate the marksman',human_acceptance:false};
 console.log('Marksman report',JSON.stringify(report));await writeFile(info.outputPath('marksman.json'),JSON.stringify(report,null,2));
});

test('remaining crouched on the open floor no longer avoids the locked shot',async({page})=>{
 test.setTimeout(45000);await encounter(page,{mission:'archive',room:'M4H',clearedEnemyIds:['m4h-drone']});
 await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');
 await until(page,()=>(window as any).__CINDER__().hp<6,null,'crouched aimed hit',15000);await page.keyboard.up('s');
 const s=await state(page);expect(s.eventLog.some((e:any)=>e.name==='hit_received'&&e.params.reason==='security-aimed-shot')).toBe(true);
});
