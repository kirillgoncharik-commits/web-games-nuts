import {test,expect} from '@playwright/test';
import config from '../games/cinder-shift/game.config.json' with {type:'json'};
import {rooms} from '../games/cinder-shift/src/room-data';
import {roomThreatCanActivate} from '../games/cinder-shift/src/session/threat-activation';
import {MissionAttempt} from '../games/cinder-shift/src/mission';
import {Campaign,newCampaign} from '../games/cinder-shift/src/session/campaign';
import {makeChallengeSpec,challengeKey,trialContentId,trialSimulationVersion,trialRuleset} from '../games/cinder-shift/src/session/challenge-spec';
import {RegulatorEncounter,regulatorPattern,regulatorRules,regulatorBody,regulatorHitboxes,regulatorImpact} from '../games/cinder-shift/src/boss';
import {machineState} from '../games/cinder-shift/src/hazards';
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
 expect(trialRuleset).toBe('combat-clear-v3');expect(trialSimulationVersion).not.toBe('phaser-60hz-rc1');
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
 expect(empty.data.run_stats.ruleset_id).toBe('campaign-rework4');
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
 const e=createEnemy(rooms.M4B.enemies[0]),shots=new Projectiles(),player={x:64,y:295},solids=[{x:0,y:320,width:640,height:40}],step=1000/60,warnings:string[]=[];
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
 const e=createEnemy(rooms.M4B.enemies[0]);
 alertEnemyOnHit(e,false);expect(e.provoked).toBe(false);
 e.state='attack';e.attackPhase='telegraph';e.phaseMs=400;e.cooldown=125;
 alertEnemyOnHit(e,true);expect(e).toMatchObject({state:'attack',attackPhase:'telegraph',phaseMs:400,cooldown:125});
 e.attackPhase='recovery';e.phaseMs=0;e.cooldown=1600;
 alertEnemyOnHit(e,true);expect(e).toMatchObject({attackPhase:'recovery',phaseMs:0,cooldown:1600});
 suspendEnemy(e);expect(e.provoked).toBe(false);expect(e.active).toBe(false);
 e.hp=0;alertEnemyOnHit(e,true);expect(e.provoked).toBe(false);
});
