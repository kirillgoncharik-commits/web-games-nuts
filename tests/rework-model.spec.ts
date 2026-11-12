import {test,expect} from '@playwright/test';
import {MissionAttempt} from '../games/cinder-shift/src/mission';
import {Campaign,newCampaign} from '../games/cinder-shift/src/session/campaign';
import {makeChallengeSpec,challengeKey,trialContentId,trialSimulationVersion,trialRuleset} from '../games/cinder-shift/src/session/challenge-spec';
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
  if(mission==='foundry'){expect(a.forwardExitOpen()).toBe(false);a.room().terminal=true;a.chooseFoundryRoute('service');}
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
 expect(trialRuleset).toBe('combat-clear-v2');expect(trialSimulationVersion).not.toBe('phaser-60hz-rc1');
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
 expect(empty.data.run_stats.ruleset_id).toBe('combat-clear-v2');
});
