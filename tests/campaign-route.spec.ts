import {test,expect} from '@playwright/test';
import {encounter} from './encounter-helpers';
import {clearCargoDrone,playCargo} from './cargo-gameplay';
import {state} from './helpers';
import {campaignPressure,campaignVisits} from './campaign-pressure';
import {writeFile} from 'node:fs/promises';
import {crossReactorTransit,crossReactorHeatRoom,clearReactorEntrance,clearReactorPatrol,crossFoundryDroneRoom,clearFoundryServiceRoom,campaignFoundry,clearFoundryGate,clearFoundryGuard,campaignReactor,campaignRegulator,leaveRegulatorShelf} from './campaign-gameplay';
import {jump,ground,to,next} from './route-helpers';
import {campaignJourney} from './campaign-journey';
test.use({video:'on'});
test('a fresh profile completes five sectors, saves the real campaign record and reloads it once',async({page},info)=>{await campaignJourney(page,info);});


test('focused room entry M2D stock drone shelf',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires isolated encounter fixture');
 await encounter(page,{mission:'cargo',room:'M2D',difficulty:info.project.metadata.difficulty,seed:4,cargoCircuit:'conveyor'});
 await clearCargoDrone(page);
 const end=await state(page);
 expect(end.enemies.find((enemy:{id:string})=>enemy.id==='m2d-drone').hp).toBeLessThanOrEqual(0);
 expect(end.hp).toBe(end.maxHp);
});

test('focused sector entry Cargo on stock equipment',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires isolated sector entry fixture');
 test.setTimeout(210_000);
 const difficulty=info.project.metadata.difficulty;
 await encounter(page,{mission:'cargo',room:'D',difficulty,seed:4});
 const end=await playCargo(page);
 await writeFile(info.outputPath('focused-sector.json'),JSON.stringify({
  fixture:'Cargo sector entry D',source_sha:end.sha,seed:4,difficulty,
  result:end.campaign.result,visits:campaignVisits(end),pressure:campaignPressure(end.roomStates),
 },null,2));
});

test('focused regulator entry recovers from the floor and completes evacuation',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires isolated encounter fixture');
 test.setTimeout(180_000);
 await encounter(page,{mission:'reactor',room:'M5D',difficulty:info.project.metadata.difficulty,seed:4});
 await jump(page,106,157);await ground(page,288);
 await jump(page,173,267);await ground(page,256);
 await to(page,374);await ground(page,320);
 await leaveRegulatorShelf(page);
 const returned=await state(page);
 expect(returned.player.x).toBeLessThan(112);
 expect(returned.bossHp).toBeGreaterThan(0);
 await campaignRegulator(page);
 expect((await state(page)).state).toBe('complete');
});

test('focused sector entry Reactor on stock equipment',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires isolated sector entry fixture');
 test.setTimeout(270_000);
 const difficulty=info.project.metadata.difficulty;
 await encounter(page,{mission:'reactor',room:'M5A',difficulty,seed:4});
 await campaignReactor(page);
 await campaignRegulator(page);
 const end=await state(page);
 expect(end.state).toBe('complete');
 await writeFile(info.outputPath('focused-sector.json'),JSON.stringify({
  fixture:'Reactor sector entry M5A',source_sha:end.sha,seed:4,difficulty,
  result:end.campaign.result,visits:campaignVisits(end),pressure:campaignPressure(end.roomStates),
 },null,2));
});

test('focused room entry M3F security patrol',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires isolated encounter fixture');
 await encounter(page,{mission:'foundry',room:'M3F',difficulty:info.project.metadata.difficulty,seed:4});
 await clearFoundryGuard(page);
 const end=await state(page);
 expect(end.hp).toBe(end.maxHp);
 expect(end.enemies.find((enemy:{id:string})=>enemy.id==='m3f-security').hp).toBeLessThanOrEqual(0);
});

test('focused room entry M3H mixed patrol',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires room entry fixture');
 await encounter(page,{mission:'foundry',room:'M3H',difficulty:info.project.metadata.difficulty,seed:4,hp:2});
 await clearFoundryGate(page);
 const end=await state(page);
 expect(end.hp).toBeGreaterThan(0);
 expect(end.enemies.every((e:{hp:number})=>e.hp<=0)).toBe(true);
});
test('focused sector entry Foundry stock service route',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires sector entry fixture');
 test.setTimeout(240000);
 await encounter(page,{mission:'foundry',room:'M3A',difficulty:info.project.metadata.difficulty,seed:4});
 await campaignFoundry(page);
 const end=await state(page);
 expect(end.state).toBe('complete');
 await writeFile(info.outputPath('focused-sector.json'),JSON.stringify({
  fixture:'Foundry sector entry M3A',source_sha:end.sha,seed:4,difficulty:info.project.metadata.difficulty,
  result:end.campaign.result,visits:campaignVisits(end),pressure:campaignPressure(end.roomStates),
 },null,2));
});

test('focused service wall exit M3B from low health',async({page},info)=>{
 test.setTimeout(90_000);
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires room entry fixture');
 await encounter(page,{mission:'foundry',room:'M3B',difficulty:info.project.metadata.difficulty,seed:4,hp:2});
 await clearFoundryServiceRoom(page);
 await next(page,'M3G',536);
 const end=await state(page);
 expect(end.room).toBe('M3G');
 expect(end.hp).toBeGreaterThan(0);
});

test('focused room entry M3G overhead patrols',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires room entry fixture');
 test.setTimeout(90_000);
 await encounter(page,{mission:'foundry',room:'M3G',difficulty:info.project.metadata.difficulty,seed:4});
 await crossFoundryDroneRoom(page);
 const end=await state(page);
 expect(end.room).toBe('M3H');
 expect(end.hp).toBeGreaterThan(0);
});

test('focused room entry M5G reactor security and drone',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires room entry fixture');
 test.setTimeout(90_000);
 await encounter(page,{mission:'reactor',room:'M5G',difficulty:info.project.metadata.difficulty,seed:4,hp:1});
 await clearReactorPatrol(page);
 const end=await state(page);
 expect(end.hp).toBe(1);
 expect(end.room).toBe('M5H');
});


test('focused room entry M5A phase wall and reactor gun',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires isolated room entry');
 await encounter(page,{mission:'reactor',room:'M5A',difficulty:info.project.metadata.difficulty,seed:4});
 await clearReactorEntrance(page);
 const end=await state(page);
 expect(end.room).toBe('M5F');
 expect(end.hp).toBeGreaterThan(0);
 await writeFile(info.outputPath('focused-room.json'),JSON.stringify({fixture:'room entry M5A',source_sha:end.sha,seed:4,difficulty:info.project.metadata.difficulty,hp_start:end.maxHp,hp_end:end.hp,visits:campaignVisits(end),pressure:campaignPressure(end.roomStates)},null,2));
});

test('focused room entry M5F heat room after heavy damage',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires documented room entry');
 await encounter(page,{mission:'reactor',room:'M5F',difficulty:info.project.metadata.difficulty,seed:4,hp:1});
 await crossReactorHeatRoom(page);
 const end=await state(page); expect(end.room).toBe('M5B');expect(end.hp).toBe(1);
 await writeFile(info.outputPath('focused-room.json'),JSON.stringify({fixture:'M5F entry at one HP',source_sha:end.sha,seed:4,difficulty:info.project.metadata.difficulty,hp_start:1,hp_end:end.hp,active_seconds:end.activeSeconds,score:end.score,pressure:campaignPressure(end.roomStates),visits:campaignVisits(end)},null,2));
});

test('focused room entry M5B optional patrol at one HP',async({page},info)=>{
 test.skip(!process.env.CINDER_QA_HARNESS,'Requires isolated M5B entry with the real seed-four event');
 await encounter(page,{mission:'reactor',room:'M5B',difficulty:info.project.metadata.difficulty,seed:4,hp:1});
 await crossReactorTransit(page,true);
 const end=await state(page);expect(end.room).toBe('M5G');expect(end.hp).toBe(1);
 await writeFile(info.outputPath('focused-room.json'),JSON.stringify({fixture:'M5B entry at one HP with the E06 patrol',source_sha:end.sha,seed:4,difficulty:info.project.metadata.difficulty,hp_start:1,hp_end:end.hp,active_seconds:end.activeSeconds,score:end.score,pressure:campaignPressure(end.roomStates),visits:campaignVisits(end)},null,2));
});
