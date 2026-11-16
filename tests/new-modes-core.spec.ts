import {test,expect} from '@playwright/test';
import {RunClock,RunSession} from '../games/cinder-shift/src/session/run-clock';
import {challengeKey,makeChallengeSpec} from '../games/cinder-shift/src/session/challenge-spec';
import {ScoreLedger} from '../games/cinder-shift/src/session/score-ledger';
import {dailyTemplates,selectDailyTemplate} from '../games/cinder-shift/src/session/daily';
import {missionSeed} from '../games/cinder-shift/src/session/missions';
import {planEvents} from '../games/cinder-shift/src/session/events';
import {decodeCode,encodeCode} from '../games/cinder-shift/src/session/challenge-code';
import {emptyChallengeRecords,recordChallengeRun,sampleGhostTrace,validateChallengeRecords} from '../games/cinder-shift/src/session/challenge-records';
import {MissionAttempt} from '../games/cinder-shift/src/mission';
import {medalForTime} from '../games/cinder-shift/src/session/time-attack-medals';
import {makeRelayReceipt,relayStageBEntry,relayEventPlanId,relayTeamKey,validateRelayHandoff,validateRelayReceipt} from '../games/cinder-shift/src/session/relay';

const baseSpec=()=>makeChallengeSpec({mode_id:'time_attack',mission_ids:['airlock'],ruleset_id:'manual-standard-v1',content_hash:'airlock-m06-content-v1',simulation_version:'phaser-60hz-v1',preset_id:'base-mira-6hp-no-modules',event_plan_id:'E02-v1_E03-v2',seed:4,timing_policy:'standard',scoring_version:'none-v1',comparison_metric:'elapsed_ms',assist_profile:'standard-manual',duration_limit_ms:900_000});

test('sports clock uses monotonic wall time and excludes the union of overlapping pauses',()=>{
  let now=0;const clock=new RunClock(()=>now);expect(clock.start()).toBe(true);now=10_000;expect(clock.pause('manual')).toBe(true);now=15_000;expect(clock.pause('hidden')).toBe(true);now=20_000;expect(clock.resume('manual')).toBe(true);expect(clock.elapsedMs()).toBe(10_000);now=30_000;expect(clock.resume('hidden')).toBe(true);now=120_000;expect(clock.elapsedMs()).toBe(100_000);expect(clock.pauseCount).toBe(1);
});

test('standard container time keeps running; other interruptions become Practice',()=>{
  let now=0;const session=new RunSession('run-1','key-1','time_attack','standard',new RunClock(()=>now));expect(session.ready()).toBe(true);expect(session.start()).toBe(true);now=1000;expect(session.interrupt('container')).toBe(true);expect(session.eligibility).toBe('standard');now=1500;expect(session.interrupt('manual')).toBe(true);expect(session.eligibility).toBe('practice');now=3000;expect(session.resume('manual')).toBe(true);expect(session.clock.elapsedMs()).toBe(3000);expect(session.resume('container')).toBe(true);now=4500;const result=session.finish({outcome:'victory',simMs:2500,score:1000});expect(result?.elapsed_ms).toBe(4500);expect(result?.eligibility).toBe('practice');expect(result?.pause_count).toBe(1);expect(session.finish({outcome:'victory',simMs:2500,score:1000})).toBeNull();
});

test('personal timing pauses the clock for containers and excludes overlapping pause time once',()=>{
  let now=0;const session=new RunSession('run-personal','key-personal','time_attack','personal',new RunClock(()=>now));session.ready();session.start();now=1000;session.interrupt('container');now=2000;session.interrupt('hidden');now=3000;session.resume('container');now=4000;session.resume('hidden');now=5000;const result=session.finish({outcome:'victory',simMs:1000,score:0});expect(result?.elapsed_ms).toBe(2000);expect(result?.pause_count).toBe(1);
});

test('score ledger deduplicates rewards and matches the reference total',()=>{
  const score=new ScoreLedger();expect(score.goal('goal:1')).toBe(true);expect(score.goal('goal:1')).toBe(false);expect(score.goal('goal:2')).toBe(true);expect(score.kill('walker:1','walker')).toBe(true);expect(score.kill('walker:1','walker')).toBe(false);score.kill('walker:2','walker');score.kill('walker:3','walker');score.kill('drone:1','drone');score.kill('turret:1','turret');expect(score.finish(130_000,'victory')).toMatchObject({victory:1000,optional_goals:500,walkers:150,drones:75,turrets:150,time_bonus:940,clean_bonus:400,total:3215,harm_events:0});
});

test('challenge keys use canonical JSON while gameplay conditions change the key',async()=>{
  const first=baseSpec(),second=makeChallengeSpec({...first,timing_policy:'personal'});expect(await challengeKey(first)).toBe(await challengeKey(makeChallengeSpec({...first})));expect(await challengeKey(first)).not.toBe(await challengeKey(second));
});

test('daily selection is stable for a UTC day and comes from the fixed catalogue',async()=>{
  const first=await selectDailyTemplate('2026-11-08'),again=await selectDailyTemplate('2026-11-08');expect(first).toEqual(again);expect(['airlock','cargo']).toContain(first.template.mission_id);
  for(const template of dailyTemplates){const plan=planEvents(missionSeed(template.seed,template.mission_id),template.mission_id).map(e=>`${e.event_id}-v${e.definition_version}`).join('_')||'none';expect(plan).toBe(template.event_plan_id);}
});

test('manual code round trip verifies the digest and rejects tampering',async()=>{
  const spec=baseSpec(),key=await challengeKey(spec),code=await encodeCode('challenge',{schema:'CS64-C1',challenge_key:key,spec});const decoded=await decodeCode(code,'challenge');expect(decoded.payload.challenge_key).toBe(key);await expect(decodeCode(code.slice(0,-1)+'0','challenge')).rejects.toThrow();
});

test('result writes are idempotent and only standard victories update PB',()=>{
  const spec=baseSpec(),key='CS64-test',run={run_id:'run-2',challenge_key:key,mode:'time_attack' as const,state:'finished' as const,eligibility:'standard' as const,elapsed_ms:100_000,sim_ms:98_000,score:1000,outcome:'victory' as const,pause_count:0,finished_at:1000};
  const first=recordChallengeRun(emptyChallengeRecords(),spec,run,1000);expect(first.isPersonalBest).toBe(true);const duplicate=recordChallengeRun(first.records,spec,run,2000);expect(duplicate.duplicate).toBe(true);expect(duplicate.records.recent[key]).toHaveLength(1);
  const practice=recordChallengeRun(first.records,spec,{...run,run_id:'run-3',eligibility:'practice',elapsed_ms:80_000},3000);expect(practice.isPersonalBest).toBe(false);expect(practice.records.best[0]?.value).toBe(100_000);
});

test('Time Attack medal thresholds use the accepted reference D and remain unset before calibration',()=>{
  const reference=100_000;expect(medalForTime(115_000,reference)).toBe('gold');expect(medalForTime(115_001,reference)).toBe('silver');expect(medalForTime(140_000,reference)).toBe('silver');expect(medalForTime(140_001,reference)).toBe('bronze');expect(medalForTime(180_000,reference)).toBe('bronze');expect(medalForTime(180_001,reference)).toBeNull();expect(medalForTime(10_000,null)).toBeNull();
});

test('ghost traces interpolate within a room, respect room boundaries, and validate pose metadata',()=>{
  const points=[{t:0,x:0,y:300,room:'A',facing:1 as const,animation_id:'run' as const},{t:100,x:20,y:280,room:'A',facing:-1 as const,animation_id:'jump' as const,event:'room_enter' as const},{t:200,x:40,y:300,room:'B',event:'room_enter' as const}];expect(sampleGhostTrace(points,50,'A')).toMatchObject({x:10,y:290,room:'A'});expect(sampleGhostTrace(points,250,'A')).toBeNull();expect(sampleGhostTrace(points,200,'B')).toMatchObject({x:40,room:'B'});const records=emptyChallengeRecords();expect(validateChallengeRecords({...records,traces:[{challenge_key:'k',run_id:'r',sampled_at:1,points}]})).toBe(true);expect(validateChallengeRecords({...records,traces:[{challenge_key:'k',run_id:'r',sampled_at:1,points:[{...points[0],animation_id:'exploit' as never}]}]})).toBe(false);
});

test('Relay POWER disables the late Cargo turret but preserves the tutorial turret; REPAIR is separate and one-use',()=>{
  const power=new MissionAttempt('mission',relayStageBEntry('power'));power.current='F';expect(power.room('F').terminal).toBe(true);expect(power.enemyPowered(power.room('F').enemies.find(enemy=>enemy.id==='f-event-turret'))).toBe(false);power.current='E';expect(power.enemyPowered(power.room('E').enemies.find(enemy=>enemy.id==='e-turret'))).toBe(true);
  const repair=new MissionAttempt('mission',relayStageBEntry('repair'));repair.current='F';repair.cellCollected=true;repair.hp=2;expect(repair.claimRelayRepair()).toBe(true);expect(repair.hp).toBe(4);expect(repair.claimRelayRepair()).toBe(false);repair.current='M2E';expect(repair.claimRepair('R02')).toBe(true);expect(repair.hp).toBe(6);const retry=new MissionAttempt('mission',relayStageBEntry('repair'));retry.current='F';retry.cellCollected=true;retry.hp=2;expect(retry.claimRelayRepair()).toBe(true);expect(retry.hp).toBe(4);
});

test('Relay handoff binds support and Stage A; receipt sums are recomputed and linked',async()=>{
  const support='power' as const,key=await relayTeamKey(support),stageA={run_id:'stage-a',score:2100,elapsed_ms:80_000,outcome:'victory' as const};const handoff={schema:'CS64-H1',handoff_id:'handoff-1',template_id:'relay_airlock_cargo_v1',team_challenge_key:key,stage_a:stageA,intel:true,support,event_plan_id:relayEventPlanId(),seed:4};const code=await encodeCode('handoff',handoff),decoded=await decodeCode(code,'handoff'),checked=await validateRelayHandoff(decoded.payload);expect(checked.team_challenge_key).toBe(key);
  const stageB={run_id:'stage-b',score:1800,elapsed_ms:70_000,outcome:'victory' as const},receipt=makeRelayReceipt({handoffDigest:decoded.digest,teamChallengeKey:key,stageA,stageB,solo:false});expect(receipt.team_score).toBe(3900);expect(receipt.team_elapsed_ms).toBe(150_000);expect(await validateRelayReceipt(receipt,checked,decoded.digest)).toEqual(receipt);await expect(validateRelayReceipt({...receipt,stage_a:{...stageA,run_id:'other'}},checked,decoded.digest)).rejects.toThrow();
});
