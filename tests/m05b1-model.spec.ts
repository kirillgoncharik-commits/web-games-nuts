import{test,expect}from'@playwright/test';
import{Campaign,newCampaign,contentVersion,type MissionEntry}from'../games/cinder-shift/src/session/campaign';
import{missions,missionIds,missionSeed}from'../games/cinder-shift/src/session/missions';
import{loadout}from'../games/cinder-shift/src/session/research';
import{planEvents,validPlan}from'../games/cinder-shift/src/session/events';
import{migrateSave,validateSave}from'../games/cinder-shift/src/session/save';
import{MissionAttempt,SimulationClock,rooms}from'../games/cinder-shift/src/mission';
import{createEnemy,stepEnemy,suspendEnemy,enemyRect}from'../games/cinder-shift/src/enemies';
import{Projectiles}from'../games/cinder-shift/src/projectiles';
import{intersects}from'../games/cinder-shift/src/geometry';
const envelope=(c:Campaign)=>({schema_version:1,content_version:contentVersion,game_id:'r01',build_id:'0.6.0-m05b1.2',saved_at:'2026-11-07T08:00:00Z',campaign:c.snapshot()});
function win(c:Campaign,id:string){c.prepare();c.begin();return c.applyResult({attempt_id:id,mission_id:c.data.mission_id,result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:60000,screen_ms:1000,nodes:[...c.data.nodes]});}
const cargoEntry=(nodes:Parameters<typeof loadout>[0]=[]):MissionEntry=>({mission_id:'cargo',seed:missionSeed(3,'cargo'),build:loadout(nodes),max_hp:loadout(nodes).maxHp,initial_hp:loadout(nodes).maxHp,initial_score:0,event_plan:planEvents(missionSeed(3,'cargo'),'cargo')});

test('two-sector progression freezes entries, rewards once, preserves the last result and records a campaign checkpoint',()=>{
 const c=new Campaign(newCampaign(45));expect(c.selectMission('cargo')).toBe(false);expect(c.data.points).toBe(1);expect(win(c,'airlock-1')).toBe(true);expect(c.data.points).toBe(2);expect(validateSave(envelope(c))).toBeNull();
 const airlockEntry=structuredClone(c.data.entry);expect(c.advance()).toBe(true);expect(c.data).toMatchObject({mission_id:'cargo',location_id:'airlock',stage:'map',points:2});expect(c.data.entry).toEqual(airlockEntry);expect(validateSave(envelope(c))).toBeNull();
 c.selectMission('cargo');const next=c.prepare();expect(next.seed).toBe(missionSeed(45,'cargo'));expect(next.seed).not.toBe(45);expect(validPlan(next.event_plan,'cargo')).toBe(true);c.begin();expect(c.data.location_id).toBe('cargo');
 expect(c.applyResult({attempt_id:'cargo-1',mission_id:'cargo',result:'victory',reason:'',hp:4,max_hp:6,score:0,active_ms:100000,screen_ms:0,nodes:[]})).toBe(true);expect(c.data.points).toBe(3);expect(c.advance()).toBe(false);expect(c.data.stage).toBe('campaign_checkpoint');expect(validateSave(envelope(c))).toBeNull();
 expect(c.selectMission('airlock')).toBe(true);win(c,'airlock-replay');expect(c.data.points).toBe(3);expect(c.data.result?.reward_granted).toBe(false);expect(c.data.reward_ledger).toHaveLength(2);expect(c.applyResult(c.data.result!)).toBe(false);
});
test('all seven room IDs, preset bodies and mission-specific event plans are consistent',()=>{
 const ids=missionIds.filter(id=>missions[id].implemented).flatMap(id=>[...missions[id].rooms]);expect(ids).toHaveLength(7);expect(new Set(ids).size).toBe(7);
 for(const id of ids){expect(rooms[id].id).toBe(id);for(const enemy of rooms[id].enemies){expect(()=>createEnemy(enemy)).not.toThrow();expect(rooms[id].solids.some(s=>intersects(enemyRect(createEnemy(enemy)),s)),enemy.id+' spawn intersects geometry').toBe(false);}}
 for(let seed=0;seed<32;seed++){expect(validPlan(planEvents(seed),'airlock')).toBe(true);expect(validPlan(planEvents(seed,'cargo'),'cargo')).toBe(true);expect(planEvents(seed,'cargo').every(e=>e.room_id==='E')).toBe(true);expect(planEvents(seed).every(e=>e.room_id==='B')).toBe(true);}
 expect(validPlan([{event_id:'E01',definition_version:1,room_id:'B',variant:'emergency-power'}],'cargo')).toBe(false);
 expect(()=>createEnemy({...rooms.E.enemies[0],preset:'walker_security'})).toThrow('invalid_enemy_preset');
});
test('dependencies and a selectable active slot preserve the campaign budget',()=>{
 const c=new Campaign(newCampaign(7));c.selectMission('airlock');expect(c.buy('W2')).toBe(false);expect(c.data.points).toBe(1);expect(c.buy('M1')).toBe(true);expect(c.data.active).toBe('M1');expect(c.selectActive(null)).toBe(true);expect(loadout(c.data.nodes,c.data.active).dash).toBe(false);
 c.prepare();c.begin();c.applyResult({attempt_id:'one-point',mission_id:'airlock',result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:1,screen_ms:0,nodes:['M1']});c.advance();c.selectMission('cargo');expect(c.buy('M2')).toBe(true);expect(c.data.active).toBeNull();expect(loadout(c.data.nodes,c.data.active)).toMatchObject({airDash:true,dash:false});expect(c.buy('D1')).toBe(false);expect(validateSave(envelope(c))).toBeNull();
 expect(c.selectActive('M1')).toBe(true);expect(loadout(c.data.nodes,c.data.active)).toMatchObject({airDash:true,dash:true});
});
for(const stage of ['research','briefing','mission','death','result','preview_complete'])test('legacy migration preserves purchases, seed and ledger from '+stage,()=>{
 const c=new Campaign(newCampaign(17));c.buy('D1');c.prepare();if(stage==='death'||stage==='result'||stage==='preview_complete')c.applyResult({attempt_id:'legacy-attempt',mission_id:'airlock',result:stage==='death'?'death':'victory',reason:stage==='death'?'drone-shot':'',hp:stage==='death'?0:6,max_hp:8,score:150,active_ms:40000,screen_ms:2000,nodes:['D1']});
 const record:any=envelope(c);record.content_version='airlock-m04.1';record.campaign.stage=stage==='death'?'result':stage;delete record.campaign.character_id;delete record.campaign.location_id;const b=record.campaign.entry.build;record.campaign.entry.build={nodes:b.nodes,maxHp:b.maxHp,spread:b.spread,dash:b.dash,active:b.active};
 const original=structuredClone(record);expect(validateSave(record)).toBeNull();const migrated=migrateSave(record);expect(record).toEqual(original);expect(migrated.campaign).toMatchObject({campaign_id:original.campaign.campaign_id,campaign_seed:17,nodes:['D1'],points:original.campaign.points,reward_ledger:original.campaign.reward_ledger,location_id:'airlock'});expect(migrated.campaign.entry?.seed).toBe(17);expect(migrated.campaign.entry?.event_plan).toEqual(original.campaign.entry.event_plan);expect(migrated.campaign.stage).toBe(stage==='briefing'?'research':stage==='preview_complete'?'map':stage==='death'?'result':stage);expect(validateSave(migrated)).toBeNull();
});
test('future and corrupt progress never migrate as a new campaign',()=>{
 const record:any=envelope(new Campaign(newCampaign(5)));record.content_version='future-999';expect(validateSave(record)).toBe('incompatible');expect(()=>migrateSave(record)).toThrow('incompatible');record.content_version=contentVersion;record.campaign.points=999;expect(validateSave(record)).toBe('corrupt');
});
test('D2 is one shield per room and per attempt, with shared hit invulnerability',()=>{
 const entry=cargoEntry(['D1','D2']),a=new MissionAttempt('mission',entry);expect(a.damage(0,'walker-shot')).toBe(true);expect(a.hp).toBe(8);expect(a.lastDamageAbsorbed).toBe(true);expect(a.damage(100,'walker-shot')).toBe(false);a.damage(1000,'walker-shot');expect(a.hp).toBe(7);a.current='E';a.damage(2000,'turret-shot');expect(a.hp).toBe(7);a.current='D';a.damage(3000,'walker-shot');expect(a.hp).toBe(6);const retry=new MissionAttempt('mission',entry);retry.damage(0,'walker-shot');expect(retry.hp).toBe(8);expect(retry.eventPlan).toEqual(a.eventPlan);
});
test('W2 consumes exactly one marked sheet; ordinary shots stop, and a second sheet still blocks',()=>{
 const first={id:'one',material:'thin' as const,x:20,y:80,width:4,height:40},second={id:'two',material:'thin' as const,x:40,y:80,width:4,height:40};
 for(const penetration of [0,1]){const p=new Projectiles(),broken:string[]=[];p.fire({x:0,y:100},{x:100,y:0},'player','cutter',penetration);p.step(250,[first],()=>false,s=>broken.push(s.id!));expect(broken).toEqual(penetration?['one']:[]);expect(p.shots.length).toBe(penetration);if(penetration){p.step(250,[second],()=>false,s=>broken.push(s.id!));expect(p.shots).toHaveLength(0);expect(broken).toEqual(['one']);}}
});
const floor=[{x:0,y:320,width:640,height:40}];
function ticks(enemy:ReturnType<typeof createEnemy>,ms:number,player={x:280,y:295},solids=floor,shots=new Projectiles()){for(let t=0;t<ms;t+=1000/60)stepEnemy(enemy,1000/60,player,solids,shots,()=>{});return shots;}
test('passive walkers keep their route and cycle when the target moves closer',()=>{
 const a=createEnemy(rooms.F.enemies[0]),b=createEnemy(rooms.F.enemies[0]);a.activateX=b.activateX=0;const pa=new Projectiles(),pb=new Projectiles(),transitionsA:string[]=[],transitionsB:string[]=[];
 for(let step=0;step<600;step++){stepEnemy(a,1000/60,{x:180,y:295},floor,pa,()=>{});stepEnemy(b,1000/60,{x:390,y:295},floor,pb,()=>{});transitionsA.push(a.state+':'+a.attackPhase);transitionsB.push(b.state+':'+b.attackPhase);}
 expect(transitionsA).toEqual(transitionsB);expect(a.x).toBe(b.x);expect(a.x).toBeGreaterThanOrEqual(a.home.x);expect(a.state).not.toBe('chase');
});
test('security walkers require sight, chase within their leash and return without healing',()=>{
 const e=createEnemy(rooms.D.enemies[0]);e.activateX=0;const wall={x:350,y:260,width:16,height:60};ticks(e,400,{x:300,y:295},[...floor,wall]);expect(e.state).not.toBe('chase');expect(e.warnings).toBe(0);
 ticks(e,500,{x:240,y:295});expect(e.state).toBe('chase');expect(e.x).toBeLessThan(e.home.x);expect(e.x).toBeGreaterThanOrEqual(e.leash!.min);e.hp=2;stepEnemy(e,1000/60,{x:0,y:295},floor,new Projectiles(),()=>{});expect(e.state).toBe('return');for(let t=0;e.state==='return'&&t<2000;t+=1000/60)stepEnemy(e,1000/60,{x:0,y:295},floor,new Projectiles(),()=>{});expect(e.hp).toBe(2);expect(Math.abs(e.x-e.home.x)).toBeLessThan(1.01);
});
test('hidden targets cancel aggressive warnings, dead and inactive enemies cannot fire',()=>{
 const e=createEnemy(rooms.D.enemies[0]);e.activateX=0;const shots=ticks(e,250,{x:320,y:295});expect(e.attackPhase).toBe('telegraph');const wall={x:350,y:260,width:16,height:60};ticks(e,100,{x:320,y:295},[...floor,wall],shots);expect(e.attackPhase).toBe('recovery');expect(e.cooldown).toBeGreaterThan(1500);expect(shots.shots).toHaveLength(0);
 const hp=e.hp;suspendEnemy(e);expect(e.hp).toBe(hp);expect(e.active).toBe(false);expect(e.lastSeen).toBeNull();e.hp=0;ticks(e,4000,{x:320,y:295},floor,shots);expect(e.state).toBe('dead');expect(shots.shots).toHaveLength(0);
});
test('enemy decisions and cooldowns match at 30 and 60 rendered FPS under the same simulation inputs',()=>{
 const run=(fps:number)=>{const enemy=createEnemy(rooms.D.enemies[0]),clock=new SimulationClock(),shots=new Projectiles();enemy.activateX=0;for(let f=0;f<fps*8;f++)clock.advance(1000/fps,ms=>{stepEnemy(enemy,ms,{x:320,y:295},floor,shots,()=>{});});return{enemy,shots:shots.shots,now:clock.now};};expect(run(30)).toEqual(run(60));
});
