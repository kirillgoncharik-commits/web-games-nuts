import {test,expect} from '@playwright/test';
import {encounter} from './encounter-helpers';
import {clearCargoDrone,playCargo} from './cargo-gameplay';
import {state} from './helpers';
import {campaignPressure,campaignVisits} from './campaign-pressure';
import {writeFile} from 'node:fs/promises';
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
