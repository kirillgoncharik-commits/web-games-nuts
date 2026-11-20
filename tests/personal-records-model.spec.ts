import {test,expect} from '@playwright/test';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {PersonalStatistics,emptyPersonalRecords,emptyFragment,mergePersonalRecords,statisticsTotals,accuracy,validatePersonalRecords,type PersonalRecords} from '../games/cinder-shift/src/session/personal-records';
import {newCampaign} from '../games/cinder-shift/src/session/campaign';

function memory(){let value:unknown;let fail=false;return{get value(){return value;},set value(v:unknown){value=v;},set fail(v:boolean){fail=v;},async loadModeData(){return{ok:true,value};},async updatePersonalRecords(incoming:PersonalRecords){if(fail)return null;value=mergePersonalRecords(value,incoming);return structuredClone(value as PersonalRecords);}};}

test('ten actual projectiles and four accepted hits give 40.0 percent, including one piercing double hit',async()=>{
 const store=memory(),stats=new PersonalStatistics(store);await stats.load();const shots=new Projectiles();shots.onPlayerShot=()=>stats.combat('shots');shots.onPlayerHit=()=>stats.combat('hits');
 for(let n=0;n<10;n++)expect(shots.fire({x:10,y:100},{x:100,y:0},'player','cutter',n===3?1:0)).toBe(true);
 for(const shot of shots.shots.slice(0,4))shots.recordDamage(shot,1);
 shots.recordDamage(shots.shots[3],1);shots.recordDamage(shots.shots[4],0);
 shots.fire({x:20,y:100},{x:100,y:0},'enemy','turret-shot');shots.recordDamage(shots.shots.at(-1)!,1);
 expect(statisticsTotals(stats.snapshot())).toMatchObject({shots:10,hits:4});expect(accuracy(10,4)).toBe(40);expect(accuracy(0,0)).toBeNull();
 await stats.flush();await stats.flush();expect(statisticsTotals(store.value as PersonalRecords)).toMatchObject({shots:10,hits:4});
});

test('only successfully created pellets count: spread, charged fire, full pool and ricochet identity',()=>{
 const shots=new Projectiles();let fired=0,hits=0;shots.onPlayerShot=()=>fired++;shots.onPlayerHit=()=>hits++;
 for(let n=0;n<3;n++)shots.fire({x:90,y:100},{x:100,y:0},'player','cutter');
 shots.fire({x:90,y:100},{x:100,y:0},'player','W4');expect(fired).toBe(4);
 shots.clear();shots.fire({x:90,y:100},{x:100,y:0},'player','cutter',0,1);const reflected=shots.shots[0];
 shots.step(200,[{id:'reflector',material:'ricochet',x:100,y:80,width:12,height:60}],()=>false);expect(shots.shots[0]).toBe(reflected);expect(reflected.vx).toBeLessThan(0);
 shots.recordDamage(reflected,1);shots.recordDamage(reflected,1);expect(hits).toBe(1);
 while(shots.shots.length<64)shots.fire({x:10,y:100},{x:10,y:0},'enemy','enemy');const count=fired;
 expect(shots.fire({x:10,y:100},{x:10,y:0},'player','W4')).toBe(false);expect(fired).toBe(count);
});

test('control clock: 39 seconds foreground, 25 seconds in missions; pauses, background and sleep excluded',async()=>{
 const stats=new PersonalStatistics(memory());await stats.load();let now=0;
 const interval=(seconds:number,active:boolean,mission=false)=>{stats.tick(now,active,mission);for(let n=0;n<seconds;n++)stats.tick(now+=1000,active,mission);};
 interval(10,true);interval(20,true,true);interval(15,false);interval(30,false);interval(5,true,true);interval(4,true);
 stats.tick(now,false,false);expect(statisticsTotals(stats.snapshot())).toMatchObject({total_ms:39000,mission_ms:25000});
 stats.tick(now+=3600000,true,true);expect(statisticsTotals(stats.snapshot()).total_ms).toBe(39000);
 await stats.flush();
});

test('stale and repeated session checkpoints merge monotonically without losing another tab',()=>{
 const a=emptyPersonalRecords(),b=emptyPersonalRecords();a.sessions.a={...emptyFragment(),shots:10,hits:4,total_ms:39000,mission_ms:25000};b.sessions.b={...emptyFragment(),shots:3,hits:1,total_ms:7000,mission_ms:7000};
 const saved=mergePersonalRecords(mergePersonalRecords(undefined,a),b),stale=structuredClone(a);stale.sessions.a.shots=2;stale.sessions.a.hits=0;
 const replay=mergePersonalRecords(mergePersonalRecords(saved,stale),a);expect(statisticsTotals(replay)).toEqual({shots:13,hits:5,total_ms:46000,mission_ms:32000});
});

test('write failure recovers, a new process reads the checkpoint and future or damaged schemas remain intact',async()=>{
 const store=memory(),stats=new PersonalStatistics(store);await stats.load();stats.combat('shots');store.fail=true;expect(await stats.flush()).toBe(false);expect(stats.saveFailed).toBe(true);
 store.fail=false;expect(await stats.flush()).toBe(true);expect(stats.saveFailed).toBe(false);const next=new PersonalStatistics(store);await next.load();expect(statisticsTotals(next.snapshot()).shots).toBe(1);
 for(const invalid of [{version:2},{...emptyPersonalRecords(),sessions:{a:{...emptyFragment(),shots:1,hits:2}}}]){store.value=invalid;const protectedStats=new PersonalStatistics(store);await protectedStats.load();expect(protectedStats.writable).toBe(false);expect(await protectedStats.flush()).toBe(false);expect(store.value).toEqual(invalid);expect(()=>mergePersonalRecords(invalid,emptyPersonalRecords())).toThrow();}
});

test('campaign ID distinguishes Continue from Replay, retains unfinished time and records four completions',async()=>{
 const stats=new PersonalStatistics(memory());await stats.load();let now=0;
 for(const [index,world]of ['r01','c02-small-world','c03-adriatic-1986','r01'].entries()){
  const c=newCampaign(index);stats.registerCampaign(c);stats.tick(now,true,true,c.campaign_id);stats.tick(now+=1000,false,false);
  await stats.flush();
  stats.tick(now,true,true,c.campaign_id);stats.tick(now+=1000,false,false);c.stage='campaign_complete';
  stats.complete(c,world,'test-content');stats.complete(c,world,'test-content');
 }
 const result=stats.snapshot();expect(result.completed).toHaveLength(4);expect(result.completed.every(r=>r.active_ms===2000)).toBe(true);expect(validatePersonalRecords(result)).toBe(true);
});
