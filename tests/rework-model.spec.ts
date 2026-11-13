import {archiveCampaignSeed} from './archive-seeds';
import {test,expect} from '@playwright/test';
import config from '../games/cinder-shift/game.config.json' with {type:'json'};
import {rooms} from '../games/cinder-shift/src/room-data';
import {roomThreatCanActivate} from '../games/cinder-shift/src/session/threat-activation';
import {MissionAttempt} from '../games/cinder-shift/src/mission';
import {Campaign,newCampaign} from '../games/cinder-shift/src/session/campaign';
import {makeChallengeSpec,challengeKey,trialContentId,trialSimulationVersion,trialRuleset} from '../games/cinder-shift/src/session/challenge-spec';
import {RegulatorEncounter,regulatorPattern,regulatorRules,regulatorBody,regulatorHitboxes,regulatorImpact} from '../games/cinder-shift/src/boss';
import {machineState} from '../games/cinder-shift/src/hazards';
import {conveyorSurfaceSpeed} from '../games/cinder-shift/src/cargo-equipment';
import {createEnemy,stepEnemy,ramVulnerable,alertEnemyOnHit,suspendEnemy} from '../games/cinder-shift/src/enemies';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {missions} from '../games/cinder-shift/src/session/missions';
import {makeRelaySpec,relayStageBEntry} from '../games/cinder-shift/src/session/relay';

test('live enemies lock forward exits before detection; a cleared revisit stays cleared',()=>{
 const a=new MissionAttempt('mission');
 expect(a.combatRemaining()).toBe(1);expect(a.room().enemies[0].active).toBe(false);
 a.room().terminal=true;expect(a.forwardExitOpen()).toBe(false);
 a.room().enemies[0].hp=0;expect(a.forwardExitOpen()).toBe(true);
 a.current='B';expect(a.combatRemaining()).toBe(2);expect(a.forwardExitOpen()).toBe(false);
 a.current='A';expect(a.combatRemaining()).toBe(0);expect(a.forwardExitOpen()).toBe(true);
});

test('all five sectors require a cleared encounter and preserve their own objectives',()=>{
 for(const mission of ['airlock','cargo','foundry','archive','reactor'] as const){
  const c=new Campaign(newCampaign(4));c.data.mission_id=mission;
  const a=new MissionAttempt('mission',c.prepare());
  expect(a.combatRemaining(),mission).toBeGreaterThan(0);expect(a.forwardExitOpen(),mission).toBe(false);
  a.room().enemies.forEach(enemy=>enemy.hp=0);
  if(mission==='airlock'||mission==='reactor'){expect(a.forwardExitOpen()).toBe(false);a.room().terminal=true;}
  expect(a.forwardExitOpen(),mission).toBe(true);
 }
});

test('unpowered event turret does not deadlock Cargo; restoring power adds the threat',()=>{
 const a=new MissionAttempt('mission',relayStageBEntry('none'));a.current='F';a.cellCollected=true;
 a.room().enemies.find(enemy=>enemy.id==='f-service')!.hp=0;
 expect(a.combatRemaining()).toBe(0);expect(a.forwardExitOpen()).toBe(true);
 a.room().terminal=true;expect(a.combatRemaining()).toBe(1);expect(a.forwardExitOpen()).toBe(false);
 a.room().enemies.find(enemy=>enemy.id==='f-event-turret')!.hp=0;expect(a.forwardExitOpen()).toBe(true);
 const supported=new MissionAttempt('mission',relayStageBEntry('power'));supported.current='F';supported.cellCollected=true;
 supported.room().enemies.find(enemy=>enemy.id==='f-service')!.hp=0;
 expect(supported.forwardExitOpen()).toBe(true);
});

test('boss shutdown releases its lock and final evacuation still needs the terminal',()=>{
 const c=new Campaign(newCampaign(1));c.data.mission_id='reactor';
 const a=new MissionAttempt('mission',c.prepare());a.current='M5D';
 expect(a.forwardExitOpen()).toBe(false);a.bossHp=0;expect(a.forwardExitOpen()).toBe(true);
 a.current='M5E';expect(a.forwardExitOpen()).toBe(false);a.room().terminal=true;expect(a.forwardExitOpen()).toBe(false);
 a.objective=true;expect(a.forwardExitOpen()).toBe(true);
});

test('training keeps its nonlethal target and does not acquire a mandatory enemy',()=>{
 const a=new MissionAttempt('training');expect(a.combatRemaining()).toBe(0);expect(a.room().targetHp).toBe(3);
 expect(a.forwardExitOpen()).toBe(false);a.room().terminal=true;expect(a.forwardExitOpen()).toBe(true);
});

test('new combat rules isolate challenge records and relay keys from the audited release',async()=>{
 const current=makeRelaySpec('none');expect(current.content_hash).toBe(trialContentId('relay-airlock-cargo'));
 const old=makeChallengeSpec({...current,ruleset_id:'relay-base-manual-v1',content_hash:'relay-airlock-cargo-release-rc1',simulation_version:'phaser-60hz-rc1'});
 expect(await challengeKey(current)).not.toBe(await challengeKey(old));
 expect(trialRuleset).toBe('combat-clear-v5');expect(trialSimulationVersion).not.toBe('phaser-60hz-rc1');
});

test('purchase is atomic across duplicate callbacks and preserves the installed active slot',()=>{
 const c=new Campaign(newCampaign(1));expect(c.buy('M1')).toBe(true);expect(c.buy('M1')).toBe(false);
 expect(c.data.nodes).toEqual(['M1']);expect(c.data.points).toBe(0);expect(c.data.active).toBe('M1');
});


test('continuing a legacy campaign preserves totals and separates mixed-rule career runs',()=>{
 const data=newCampaign(4);delete data.run_stats.ruleset_id;data.processed_attempts.push('historical-attempt');
 data.run_stats.active_ms=12345;data.run_stats.score=321;const c=new Campaign(data);c.prepare();c.begin();
 expect(c.data.run_stats).toMatchObject({ruleset_id:'mixed-legacy-rework',active_ms:12345,score:321});
 const fresh=newCampaign(4);delete fresh.run_stats.ruleset_id;const empty=new Campaign(fresh);empty.prepare();empty.begin();
 expect(empty.data.run_stats.ruleset_id).toBe('campaign-rework6');
});


function foundry(){const c=new Campaign(newCampaign(4));c.data.mission_id='foundry';return new MissionAttempt('mission',c.prepare());}
for(const route of ['service','press'] as const)test(`Foundry ${route} route has eight distinct encounters, a locked fork and R03 before the final fight`,()=>{
 const a=foundry(),seen:string[]=[];
 while(true){
  seen.push(a.current);a.room().enemies.forEach(enemy=>enemy.hp=0);
  if(a.current==='M3F'){expect(a.definition().next).toBeUndefined();expect(a.chooseFoundryRoute(route)).toBe(false);a.room().terminal=true;expect(a.chooseFoundryRoute(route)).toBe(true);expect(a.chooseFoundryRoute(route==='service'?'press':'service')).toBe(false);}
  if(a.current==='M3K'){expect(a.definition().repair?.slot).toBe('R03');expect(a.forwardExitOpen()).toBe(false);a.room().terminal=true;}
  if(a.current==='M3D')break;
  expect(a.forwardExitOpen()).toBe(true);a.current=a.definition().next!;
 }
 expect(seen).toHaveLength(8);expect(new Set(seen).size).toBe(8);expect(seen.at(-2)).toBe('M3K');
 expect(seen).toEqual(route==='service'?['M3A','M3E','M3F','M3B','M3G','M3H','M3K','M3D']:['M3A','M3E','M3F','M3C','M3I','M3J','M3K','M3D']);
 a.current='M3K';expect(a.definition().previous).toBe(route==='service'?'M3H':'M3J');expect(missions.foundry.rooms).toContain(a.definition().previous);
});

test('power rerouting changes the actual active machine and survives revisits, while Retry resets it',()=>{
 const a=foundry();a.current='M3E';
 const power=()=>a.definition().hazards!.filter(h=>h.enabled).map(h=>h.kind);
 expect(power()).toEqual(['press']);expect(a.toggleFoundryPower()).toBe(true);expect(power()).toEqual(['heat']);
 for(const now of [0,1500,2500,9000])expect(machineState(a.definition().hazards![0],now)).toBe('off');
 a.current='M3F';a.current='M3E';expect(power()).toEqual(['heat']);expect(a.toggleFoundryPower()).toBe(true);expect(power()).toEqual(['press']);
 const retry=foundry();retry.current='M3E';expect(retry.room().powerCircuit).toBe('press');
});

test('R03 is a one-use repair at the cooling stop and cannot be consumed by the final room',()=>{
 const a=foundry();a.current='M3K';expect(a.claimRepair('R03')).toBe(false);expect(a.room().repairUsed).toBe(false);
 a.hp=3;expect(a.claimRepair('R03')).toBe(true);expect(a.hp).toBe(5);expect(a.claimRepair('R03')).toBe(false);
 a.current='M3D';expect(a.claimRepair('R03')).toBe(false);
});

test('the ram exposes its engine only after a real charge instead of dying before the teaching pattern',()=>{
 const a=foundry(),e=createEnemy(a.definition().enemies[0]),shots=new Projectiles();expect(ramVulnerable(e)).toBe(false);
 let charged=false,opened=false;
 for(let frame=0;frame<240;frame++){
  stepEnemy(e,1000/60,{x:268,y:292},a.definition().solids,shots,()=>{});
  if(e.attackPhase==='fire'){charged=true;expect(ramVulnerable(e)).toBe(false);}
  if(e.attackPhase==='recovery'){opened=true;expect(ramVulnerable(e)).toBe(true);break;}
 }
 expect(charged&&opened).toBe(true);
});

test('Regulator locks each aimed lane during its warning and retargets the second strike',()=>{
 const boss=new RegulatorEncounter();boss.advance(16,260);expect(boss.pattern().rects[0].x).toBe(236);
 boss.advance(400,420);expect(boss.pattern().rects[0].x).toBe(236);
 boss.advance(1600,420);expect(boss.pattern().phase).toBe('warning');expect(boss.pattern().rects[0].x).toBe(396);
});

for(const damage of [1,3,4,1000])test(`Regulator ${damage}-damage shots reveal both phases and require repeated attack windows without extra HP`,()=>{
 const boss=new RegulatorEncounter();let accepted=0,phases=new Set<string>(),windows=new Set<string>(),nextShot=0;
 for(let ms=0;ms<180000&&boss.hp>0;ms+=1000/60){
  boss.advance(1000/60,260);const p=boss.pattern();phases.add(p.stage);
  if(p.phase==='core'&&ms>=nextShot){windows.add(p.stage+':'+p.cycle);accepted+=boss.hit(damage);nextShot=ms+250;}
 }
 expect(boss.hp).toBe(0);expect(accepted).toBe(32);expect(phases.has('lanes')&&phases.has('transition')&&phases.has('sweep')).toBe(true);
 expect(windows.size).toBeGreaterThanOrEqual(4);expect(boss.elapsedMs).toBeGreaterThan(25000);
 expect(boss.pattern()).toMatchObject({stage:'shutdown',phase:'idle',rects:[]});expect(boss.hit(100)).toBe(0);
});

test('boss armor, chest aperture and empty leg gap agree with the collision model',()=>{
 const body=regulatorBody(472,232,192,176),{core}=regulatorHitboxes(body),y=core.y+core.height/2;
 expect(regulatorImpact(body,{x:300,y},{x:600,y},false)).toBe('armor');expect(regulatorImpact(body,{x:300,y},{x:600,y},true)).toBe('core');
 expect(regulatorImpact(body,{x:body.x-1,y},{x:core.x-1,y},true)).toBeNull();
 expect(regulatorImpact(body,{x:472,y:280},{x:472,y:320},true)).toBeNull();
 expect(regulatorImpact(body,{x:300,y:292},{x:600,y:292},true)).toBe('armor');
 expect(regulatorImpact(body,{x:300,y:80},{x:600,y:80},true)).toBeNull();
});

test('overload closes the core in the same simulation event; extra Splitter hits cause no phantom damage',()=>{
 const boss=new RegulatorEncounter();boss.advance(2*(regulatorRules.laneWarningMs+regulatorRules.laneStrikeMs)+16,260);
 expect(boss.pattern().phase).toBe('core');expect(boss.hit(8)).toBe(8);expect(boss.pattern()).toMatchObject({phase:'idle',overloaded:true});expect(boss.hit(8)).toBe(0);expect(boss.hp).toBe(24);
});


test('mission boundaries prevent backtracking into another sector and bypassing the Regulator',()=>{
 for(const mission of ['airlock','cargo','foundry','archive','reactor'] as const){
  const c=new Campaign(newCampaign(4));c.data.mission_id=mission;const a=new MissionAttempt('mission',c.prepare());
  for(const room of missions[mission].rooms){const def=a.definition(room);if(def.next)expect(missions[mission].rooms).toContain(def.next);if(def.previous)expect(missions[mission].rooms).toContain(def.previous);}
 }
 const c=new Campaign(newCampaign(4));c.data.mission_id='reactor';const a=new MissionAttempt('mission',c.prepare());expect(a.definition('M5A').previous).toBeUndefined();
});


test('a powered impact before the proximity threshold starts the full warning, never an instant shot',()=>{
 const e=createEnemy(rooms.M4E.enemies[0]),shots=new Projectiles(),player={x:64,y:295},solids=[{x:0,y:320,width:640,height:40}],step=1000/60,warnings:string[]=[];
 stepEnemy(e,step,player,solids,shots,k=>warnings.push(k));expect(e.active).toBe(false);
 alertEnemyOnHit(e,true);stepEnemy(e,step,player,solids,shots,k=>warnings.push(k));
 expect(player.x).toBeLessThan(e.activateX);expect(e.active).toBe(true);expect(e.attackPhase).toBe('telegraph');
 expect(e.phaseMs).toBe(config.combat.drone.telegraph_ms);expect(warnings).toEqual(['drone']);expect(shots.shots).toHaveLength(0);
 for(let ms=0;ms<config.combat.drone.telegraph_ms-step*2;ms+=step)stepEnemy(e,step,player,solids,shots,()=>{});
 expect(shots.shots).toHaveLength(0);
 for(let frame=0;frame<6;frame++)stepEnemy(e,step,player,solids,shots,()=>{});
 expect(shots.shots.length).toBeGreaterThan(0);
});

test('provoked enemies keep the staged Airlock drone and two-threat room budget',()=>{
 const player={x:64,y:295},shots=new Projectiles();
 for(const id of ['B','C'] as const){
  const roster=rooms[id].enemies.map(createEnemy),candidate=roster[id==='B'?1:2];
  if(id==='C'){roster[0].active=true;roster[1].active=true;}
  alertEnemyOnHit(candidate,true);
  stepEnemy(candidate,1000/60,player,rooms[id].solids,shots,()=>{},1,roomThreatCanActivate(id,candidate,roster,player,rooms[id].solids));
  expect(candidate.active).toBe(false);expect(candidate.provoked).toBe(true);expect(candidate.warnings).toBe(0);
  roster[0].hp=0;
  stepEnemy(candidate,1000/60,player,rooms[id].solids,shots,()=>{},1,roomThreatCanActivate(id,candidate,roster,player,rooms[id].solids));
  expect(candidate.active).toBe(true);expect(candidate.attackPhase).toBe('telegraph');
  expect(roster.filter(e=>e.active&&e.hp>0).length).toBeLessThanOrEqual(2);
 }
});

test('hits preserve attack and recovery timing; unpowered, destroyed and suspended enemies do not retain an alert',()=>{
 const e=createEnemy(rooms.M4E.enemies[0]);
 alertEnemyOnHit(e,false);expect(e.provoked).toBe(false);
 e.state='attack';e.attackPhase='telegraph';e.phaseMs=400;e.cooldown=125;
 alertEnemyOnHit(e,true);expect(e).toMatchObject({state:'attack',attackPhase:'telegraph',phaseMs:400,cooldown:125});
 e.attackPhase='recovery';e.phaseMs=0;e.cooldown=1600;
 alertEnemyOnHit(e,true);expect(e).toMatchObject({attackPhase:'recovery',phaseMs:0,cooldown:1600});
 suspendEnemy(e);expect(e.provoked).toBe(false);expect(e.active).toBe(false);
 e.hp=0;alertEnemyOnHit(e,true);expect(e.provoked).toBe(false);
});

function cargo(){const c=new Campaign(newCampaign(4));c.data.mission_id='cargo';return new MissionAttempt('mission',c.prepare());}
test('Cargo has nine connected episodes with a required power decision and installation before its checkpoint',()=>{
 const a=cargo(),seen:string[]=[];
 while(true){
  seen.push(a.current);a.room().enemies.forEach(e=>e.hp=0);
  if(a.current==='M2C'){expect(a.forwardExitOpen()).toBe(false);expect(a.toggleCargoPower()).toBe(true);}
  if(a.current==='F'){expect(a.forwardExitOpen()).toBe(false);a.cellCollected=true;}
  if(a.current==='M2E'){expect(a.forwardExitOpen()).toBe(false);expect(a.terminalReady()).toBe(true);a.cellInstalled=true;a.room().terminal=true;}
  if(a.current==='G')break;
  expect(a.forwardExitOpen(),a.current).toBe(true);a.current=a.definition().next!;
 }
 expect(seen).toEqual(['D','M2A','E','M2B','M2C','M2D','F','M2E','G']);
 expect(a.forwardExitOpen()).toBe(false);a.room().terminal=true;expect(a.forwardExitOpen()).toBe(true);
 a.cellInstalled=false;a.objective=true;expect(a.forwardExitOpen()).toBe(false);
});

test('Cargo circuit selection persists across rooms and exchanges the actual belt for the powered turret',()=>{
 const a=cargo();expect(a.toggleCargoPower()).toBe(false);a.current='M2C';expect(a.toggleCargoPower()).toBe(true);
 a.current='M2D';const turret=a.room().enemies.find(e=>e.id==='m2d-routed-turret')!;
 expect(a.definition().conveyor?.enabled).toBe(true);expect(a.enemyPowered(turret)).toBe(false);expect(a.combatRemaining()).toBe(1);
 a.current='M2C';expect(a.cargoCircuit).toBe('conveyor');a.toggleCargoPower();a.current='M2D';
 expect(a.definition().conveyor?.enabled).toBe(false);expect(a.enemyPowered(turret)).toBe(true);expect(a.combatRemaining()).toBe(2);
 expect(a.toggleCargoPower()).toBe(false);const retry=cargo();expect(retry.cargoRerouted).toBe(false);expect(retry.cargoCircuit).toBe('security');
});

test('R02 is now a separate post-cell service stop and cannot be consumed in the storage fight',()=>{
 const a=cargo();a.current='F';a.hp=3;a.cellCollected=true;expect(a.claimRepair('R02')).toBe(false);
 a.current='M2E';a.cellCollected=false;expect(a.claimRepair('R02')).toBe(false);expect(a.terminalReady()).toBe(false);
 a.cellCollected=true;expect(a.claimRepair('R02')).toBe(true);expect(a.hp).toBe(5);expect(a.claimRepair('R02')).toBe(false);
 a.current='G';a.room().enemies.forEach(e=>e.hp=0);expect(a.terminalReady()).toBe(false);a.cellInstalled=true;expect(a.terminalReady()).toBe(true);
});

test('conveyors transport only grounded feet on the enabled surface and do not pull jumps or dashes',()=>{
 const belt={x:232,y:304,width:280,height:16,speed:-32,enabled:true},body={x:350,y:276,width:22,height:44};
 expect(conveyorSurfaceSpeed(belt,body,320,true,0)).toBe(-32);
 expect(conveyorSurfaceSpeed({...belt,enabled:false},body,320,true,0)).toBe(0);
 expect(conveyorSurfaceSpeed(belt,body,320,false,0)).toBe(0);
 expect(conveyorSurfaceSpeed(belt,body,320,true,-330)).toBe(0);
 expect(conveyorSurfaceSpeed(belt,body,320,true,0,true)).toBe(0);
 expect(conveyorSurfaceSpeed(belt,body,256,true,0)).toBe(0);
 expect(conveyorSurfaceSpeed(belt,{...body,x:530},320,true,0)).toBe(0);
});

function makeArchiveAttempt(beacon=true){const c=new Campaign(newCampaign(archiveCampaignSeed(beacon)));c.data.mission_id='archive';return new MissionAttempt('mission',c.prepare());}

test('Archive connects nine episodes with a physical carrier, upload circuit and transmitted-data exit',()=>{
 const a=makeArchiveAttempt(),seen:string[]=[];
 while(true){
  seen.push(a.current);a.room().enemies.forEach(e=>e.hp=0);
  if(a.current==='M4E'){expect(a.forwardExitOpen()).toBe(false);expect(a.collectArchiveCarrier()).toBe(true);}
  if(a.current==='M4G'){expect(a.forwardExitOpen()).toBe(false);expect(a.connectArchivePower()).toBe(true);}
  if(a.current==='M4C'){expect(a.forwardExitOpen()).toBe(false);expect(a.terminalReady()).toBe(true);a.dataUploaded=true;a.room().terminal=true;a.objective=true;}
  if(a.current==='M4D')break;
  expect(a.forwardExitOpen(),a.current).toBe(true);a.current=a.definition().next!;
 }
 expect(seen).toEqual(['M4A','M4E','M4B','M4F','M4G','M4H','M4C','M4I','M4D']);
 expect(a.forwardExitOpen()).toBe(false);a.room().terminal=true;expect(a.forwardExitOpen()).toBe(true);
 a.dataUploaded=false;expect(a.forwardExitOpen()).toBe(false);
});

test('carrier collection and upload power cannot be acquired in the wrong room or through live guards',()=>{
 const a=makeArchiveAttempt();expect(a.collectArchiveCarrier()).toBe(false);expect(a.connectArchivePower()).toBe(false);
 a.current='M4G';a.room().enemies.forEach(e=>e.hp=0);expect(a.connectArchivePower()).toBe(false);
 a.current='M4E';expect(a.collectArchiveCarrier()).toBe(true);expect(a.collectArchiveCarrier()).toBe(false);
 a.current='M4G';expect(a.connectArchivePower()).toBe(true);expect(a.connectArchivePower()).toBe(false);
 const b=makeArchiveAttempt();b.current='M4E';b.collectArchiveCarrier();b.current='M4G';expect(b.connectArchivePower()).toBe(false);
 b.room().enemies.forEach(e=>e.hp=0);expect(b.connectArchivePower()).toBe(true);
});

test('E05 scout removes a real screen while the one-use health choice preserves its base route',()=>{
 const a=makeArchiveAttempt();a.current='M4B';expect(a.cacheReady()).toBe(false);expect(a.chooseCache('scout')).toBe(false);
 a.room().enemies.forEach(e=>e.hp=0);expect(a.chooseCache('scout')).toBe(true);expect(a.chooseCache('health')).toBe(false);
 a.current='M4F';expect(a.definition().solids.some(s=>s.id==='archive-scout-screen')).toBe(false);expect(a.enemyTelegraphScale()).toBe(1.5);
 const b=makeArchiveAttempt();b.current='M4B';b.hp=4;b.room().enemies.forEach(e=>e.hp=0);
 expect(b.chooseCache('health')).toBe(true);expect(b.hp).toBe(5);b.hp=4;expect(b.chooseCache('health')).toBe(false);expect(b.chooseCache('scout')).toBe(false);
 b.current='M4F';expect(b.definition().solids.some(s=>s.id==='archive-scout-screen')).toBe(true);expect(b.enemyTelegraphScale()).toBe(1);
 const retry=new MissionAttempt('mission',a.entry);expect(retry.scoutedArchive||retry.archiveCarrierCollected||retry.archiveUploadPowered||retry.dataUploaded).toBe(false);
});

test('Archive without E05 retains optional salvage instead of granting the beacon choices',()=>{
 const a=makeArchiveAttempt(false);a.current='M4B';a.room().enemies.forEach(e=>e.hp=0);a.hp=4;
 expect(a.chooseCache('scout')).toBe(false);expect(a.chooseCache('health')).toBe(false);
 const score=a.score;expect(a.chooseCache('salvage')).toBe(true);expect(a.score).toBeGreaterThan(score);expect(a.chooseCache('salvage')).toBe(false);
});

test('upload needs carrier and power; R04 and the final terminal stay gated until transmission',()=>{
 const a=makeArchiveAttempt();a.current='M4C';a.hp=4;
 expect(a.terminalReady()).toBe(false);expect(a.claimRepair('R04')).toBe(false);
 a.archiveCarrierCollected=true;expect(a.terminalReady()).toBe(false);a.archiveUploadPowered=true;expect(a.terminalReady()).toBe(true);
 expect(a.claimRepair('R04')).toBe(false);a.dataUploaded=true;a.room().terminal=true;expect(a.claimRepair('R04')).toBe(true);expect(a.hp).toBe(6);
 a.hp=5;expect(a.claimRepair('R04')).toBe(false);
 a.current='M4D';a.room().enemies.forEach(e=>e.hp=0);expect(a.terminalReady()).toBe(true);a.dataUploaded=false;a.objective=true;expect(a.terminalReady()).toBe(false);expect(a.forwardExitOpen()).toBe(false);
});

test('Archive scouting lengthens the actual ram warning without changing its HP or skipping the attack',()=>{
 const a=makeArchiveAttempt();a.current='M4B';a.room().enemies.forEach(e=>e.hp=0);a.chooseCache('scout');
 const e=createEnemy(rooms.M4I.enemies[0]),plain=createEnemy(rooms.M4I.enemies[0]),player={x:200,y:295};
 stepEnemy(e,1000/60,player,rooms.M4I.solids,new Projectiles(),()=>{},a.enemyTelegraphScale());
 stepEnemy(plain,1000/60,player,rooms.M4I.solids,new Projectiles(),()=>{});
 expect(e.attackPhase).toBe('telegraph');expect(e.phaseMs).toBe(plain.phaseMs*1.5);expect(e.hp).toBe(plain.hp);expect(e.shots).toBe(0);
});

test('the Archive perimeter drone cannot bypass its staged guard response even when provoked',()=>{
 const roster=rooms.M4D.enemies.map(createEnemy),drone=roster[1],player={x:64,y:295},shots=new Projectiles();
 alertEnemyOnHit(drone,true);
 stepEnemy(drone,1000/60,player,rooms.M4D.solids,shots,()=>{},1,roomThreatCanActivate('M4D',drone,roster,player,rooms.M4D.solids));
 expect(drone.active).toBe(false);expect(drone.warnings).toBe(0);
 roster[0].hp=0;
 stepEnemy(drone,1000/60,player,rooms.M4D.solids,shots,()=>{},1,roomThreatCanActivate('M4D',drone,roster,player,rooms.M4D.solids));
 expect(drone.active).toBe(true);expect(drone.attackPhase).toBe('telegraph');expect(shots.shots).toHaveLength(0);
});
