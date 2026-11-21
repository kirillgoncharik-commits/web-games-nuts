import {test,expect} from '@playwright/test';
import {encounter} from './encounter-helpers';
import {clearCargoDrone,playCargo} from './cargo-gameplay';
import {state} from './helpers';
import {campaignPressure,campaignVisits} from './campaign-pressure';
import {writeFile} from 'node:fs/promises';
import {campaignFoundry,clearFoundryGate,clearFoundryGuard,campaignReactor,campaignRegulator,leaveRegulatorShelf} from './campaign-gameplay';
import {jump,ground,to} from './route-helpers';
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
 await encounter(page,{mission:'foundry',room:'M3H',difficulty:info.project.metadata.difficulty,seed:4});
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
 expect((await state(page)).state).toBe('complete');
});
