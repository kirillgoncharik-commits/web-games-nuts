import{test,expect}from'@playwright/test';
import{Campaign,newCampaign}from'../games/cinder-shift/src/session/campaign';
import{loadout,shotVelocities}from'../games/cinder-shift/src/session/research';
import{planEvents,seedsForPlans,validPlan,hasEvent}from'../games/cinder-shift/src/session/events';
import{validateSave}from'../games/cinder-shift/src/session/save';
import{contentVersion}from'../games/cinder-shift/src/session/campaign';
import{MissionAttempt}from'../games/cinder-shift/src/mission';
const result=(id:string)=>({attempt_id:id,mission_id:'airlock' as const,result:'victory' as const,reason:'',hp:4,max_hp:6,score:0,active_ms:25000,screen_ms:10000,nodes:[]});
const envelope=(campaign:ReturnType<typeof newCampaign>)=>({schema_version:1,content_version:contentVersion,game_id:'r01',build_id:'test',saved_at:new Date().toISOString(),campaign});
test('research purchase and campaign reward are idempotent, including replay',()=>{
  const c=new Campaign(newCampaign(0));expect(c.buy('W1')).toBe(true);expect(c.buy('W1')).toBe(false);expect(c.data.points).toBe(0);expect(c.buy('M1')).toBe(false);
  c.prepare();expect(c.applyResult(result('first'))).toBe(true);expect(c.applyResult(result('first'))).toBe(false);expect(c.data.points).toBe(1);expect(c.data.reward_ledger).toHaveLength(1);
  c.data.stage='research';expect(c.buy('D1')).toBe(true);expect(c.data.points).toBe(0);c.prepare();expect(c.applyResult({...result('replay'),nodes:['W1','D1'],max_hp:8,hp:8})).toBe(true);expect(c.data.points).toBe(0);expect(c.data.result?.reward_granted).toBe(false);expect(validateSave(envelope(c.data))).toBeNull();
});
test('W1 preserves speed, rate input and independent projectile directions',()=>{
  const rays=shotVelocities(-1,440,true);expect(rays).toHaveLength(3);expect(rays[0]).toEqual({x:-440,y:0});for(const v of rays)expect(Math.hypot(v.x,v.y)).toBeCloseTo(440);expect(rays[1].y).toBeCloseTo(-rays[2].y);expect(shotVelocities(1,440,false)).toEqual([{x:440,y:0}]);
});
test('all four event plans are seeded, validated, isolated to B and stable on retry',()=>{
  const seeds=seedsForPlans();expect(Object.keys(seeds)).toHaveLength(4);
  for(const [key,seed]of Object.entries(seeds)){const plan=planEvents(seed);expect(planEvents(seed)).toEqual(plan);expect(validPlan(plan)).toBe(true);expect(plan.map(p=>p.event_id).join('+')||'none').toBe(key);const c=new Campaign(newCampaign(seed));const entry=c.prepare();const one=new MissionAttempt('mission',entry),two=new MissionAttempt('mission',entry);expect(one.eventPlan).toEqual(two.eventPlan);expect(one.definition('A').solids).toEqual(two.definition('A').solids);expect(one.definition('B').solids.length).toBe(hasEvent(plan,'E02')?5:4);}
});
test('container choice is one per attempt, repair caps at dynamic maximum and retry resets score',()=>{
  const c=new Campaign(newCampaign(seedsForPlans()['E03']));c.buy('D1');const entry=c.prepare();const a=new MissionAttempt('mission',entry);a.current='B';expect(a.hp).toBe(8);expect(a.chooseContainer('repair')).toBe(false);a.damage(0,'walker-shot');expect(a.hp).toBe(7);expect(a.chooseContainer('repair')).toBe(true);expect(a.hp).toBe(8);expect(a.chooseContainer('salvage')).toBe(false);
  const retry=new MissionAttempt('mission',entry);retry.current='B';expect(retry.room().containerUsed).toBe(false);expect(retry.chooseContainer('salvage')).toBe(true);expect(retry.score).toBe(150);expect(retry.chooseContainer('salvage')).toBe(false);const fresh=new MissionAttempt('mission',entry);expect(fresh.score).toBe(0);expect(fresh.hp).toBe(8);expect(fresh.eventPlan).toEqual(a.eventPlan);
});
test('save validation keeps incompatible, corrupt and unknown-node records distinct',()=>{
  const c=newCampaign(1),record=envelope(c);expect(validateSave(record)).toBeNull();expect(validateSave({...record,schema_version:2})).toBe('incompatible');expect(validateSave({...record,campaign:{...c,nodes:['X1']}})).toBe('unknown_nodes');expect(validateSave({...record,campaign:{...c,points:10}})).toBe('corrupt');expect(validateSave(null)).toBe('corrupt');
});
