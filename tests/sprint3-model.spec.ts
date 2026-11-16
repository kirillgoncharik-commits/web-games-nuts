import {test,expect} from '@playwright/test';
import {ReleaseNotesSession,compareReleases} from '../games/cinder-shift/src/session/release-notes';
import {auditNewCampaignRegistry,estimateBaseJumpEnvelope,newCampaignIds} from '../games/cinder-shift/src/session/new-campaign-content';
import {canFire,carryAction,createCarryRoom,stepCarry,settleCarry,resetMandatoryItem,absorbLidHit,createPowerRoom,switchCircuit,powerGraphSafe} from '../games/cinder-shift/src/session/world-mechanics';
import {baseWorldId,worldAvailability,newWorldProgress,finishWorldRoom,validateWorldProgress,fragmentIds,isCompleteBaseCampaign} from '../games/cinder-shift/src/session/world-progress';
import {Campaign,newCampaign} from '../games/cinder-shift/src/session/campaign';

test('release order ignores artifact metadata and handles numeric prereleases and stable',()=>{
 expect(compareReleases('0.8.0-alpha.10','0.8.0-alpha.9')).toBe(1);
 expect(compareReleases('0.8.0-beta.1','0.8.0-alpha.100')).toBe(1);
 expect(compareReleases('0.8.0-rc.1','0.8.0-beta.20')).toBe(1);
 expect(compareReleases('0.8.0','0.8.0-rc.9')).toBe(1);
 expect(compareReleases('0.8.0-alpha.1+build.1','0.8.0-alpha.1+build.2')).toBe(0);
 expect(compareReleases('0.8.0-alpha.1','0.7.0-rw2.c3')).toBe(1);
 expect(compareReleases('bad','0.8.0')).toBeNull();
});
test('fresh install establishes a baseline without a fake update or acknowledgement',()=>{
 const n=new ReleaseNotesSession('0.8.0-alpha.1',undefined,false);expect(n.pending).toBe(false);expect(n.marker.acknowledged_release).toBeNull();
 expect(new ReleaseNotesSession('0.8.0-alpha.2',n.marker,true).pending).toBe(true);
});
test('legacy update is pending until close; rebuild, reload and rollback never repeat it',()=>{
 const n=new ReleaseNotesSession('0.8.0-alpha.1',undefined,true);expect(n.pending).toBe(true);expect(n.marker.acknowledged_release).toBeNull();
 const marker=n.acknowledge();expect(n.pending).toBe(false);
 expect(new ReleaseNotesSession('0.8.0-alpha.1',marker,true).pending).toBe(false);
 const rollback=new ReleaseNotesSession('0.7.0-rw2.c3',marker,true);expect(rollback.pending).toBe(false);expect(rollback.acknowledge()?.acknowledged_release).toBe('0.8.0-alpha.1');
});
test('skipped releases aggregate only the intervening catalog; history remains available',()=>{
 const catalog=['1.0.0','1.1.0','1.2.0','1.3.0'].map(id=>({id,date:'2026-11-16',en:{summary:id,changes:[]},ru:{summary:id,changes:[]}}));
 const n=new ReleaseNotesSession('1.2.0',{schema:1,installed_release:'1.0.0',acknowledged_release:'1.0.0'},true,catalog);
 expect(n.updates.map(x=>x.id)).toEqual(['1.1.0','1.2.0']);expect(n.history.map(x=>x.id)).toEqual(['1.2.0','1.1.0','1.0.0']);
});
test('future and corrupt markers are retained and are not silently overwritten',()=>{
 for(const raw of [{schema:2},{schema:1,installed_release:'broken',acknowledged_release:null},null]){const n=new ReleaseNotesSession('0.8.0-alpha.1',raw,true);expect(n.writable).toBe(false);expect(n.pending).toBe(false);expect(n.acknowledge()).toBeNull();}
});
test('approved registry retains 40 room IDs and the 22-minute design budget',()=>{expect(auditNewCampaignRegistry()).toEqual([]);expect(estimateBaseJumpEnvelope().maxRisePx).toBeGreaterThan(60);});
test('availability distinguishes earned access, missing content and failed loads',()=>{
 expect(baseWorldId).toBe('r01');expect(worldAvailability('r01',false,true)).toBe('available');
 for(const id of newCampaignIds){expect(worldAvailability(id,false,true)).toBe('locked_by_progress');expect(worldAvailability(id,true,false)).toBe('not_in_build');expect(worldAvailability(id,true,true,false)).toBe('load_failed');expect(worldAvailability(id,true,true)).toBe('available');}
});
test('an isolated reactor mission win is not a completed C01',()=>{const c=new Campaign(newCampaign(4));c.data.stage='campaign_complete';expect(isCompleteBaseCampaign(c.data)).toBe(false);expect(isCompleteBaseCampaign(null)).toBe(false);});
test('worlds keep independent namespaces, ordered rooms and their own rewards',()=>{
 for(const id of newCampaignIds){let p=newWorldProgress(id,4);expect(finishWorldRoom(p,p.mission_id+'-D')).toBeNull();const untouched=newWorldProgress(id==='c02-small-world'?'c03-adriatic-1986':'c02-small-world',8);
  const rooms:string[]=[];for(let i=0;i<20;i++){rooms.push(p.room_id);const next=finishWorldRoom(p,p.room_id);expect(next,rooms.join(',')).not.toBeNull();p=next!;expect(validateWorldProgress(p,id)).toBe(true);}
  expect(new Set(rooms).size).toBe(20);expect(p.completed).toBe(true);expect(p.wallet).toBe(6);expect(finishWorldRoom(p,p.room_id)).toBeNull();expect(untouched.completed_rooms).toEqual([]);
  expect(p.fragments).toEqual(id==='c02-small-world'?[...fragmentIds]:[]);
 }
});
test('unknown future progress and impossible completion are rejected without mutation',()=>{
 const p=newWorldProgress('c02-small-world',4),before=structuredClone(p);expect(validateWorldProgress({...p,schema_version:2},p.campaign_id)).toBe(false);expect(validateWorldProgress({...p,completed:true},p.campaign_id)).toBe(false);expect(validateWorldProgress({...p,fragments:[fragmentIds[0]]},p.campaign_id)).toBe(false);expect(p).toEqual(before);
});
function carry(){return createCarryRoom('SW01-A','lid',{x:112,y:292},[{id:'c02-small-world:SW01-A:contact:drawer-lock-01',rect:{x:260,y:278,width:24,height:28},active:false,open:true}]);}
test('one context action handles pickup, carry, throw and drop with no pickup farming',()=>{
 const r=carry();expect(carryAction(r,{x:112,y:292},1)).toBe('pickup');expect(canFire(r)).toBe(false);expect(r.ledger).toEqual([]);
 expect(carryAction(r,{x:190,y:292},1)).toBe('throw');expect(canFire(r)).toBe(true);for(let i=0;i<30;i++)stepCarry(r,1000/60,[]);expect(r.contacts[0].active).toBe(true);expect(r.ledger).toHaveLength(1);
 resetMandatoryItem(r);carryAction(r,{x:112,y:292},1);carryAction(r,{x:190,y:292},1);for(let i=0;i<30;i++)stepCarry(r,1000/60,[]);expect(r.ledger).toHaveLength(1);
});
test('throw collisions respect walls, facing and closed vulnerability windows',()=>{
 const r=carry();carryAction(r,{x:112,y:292},1);carryAction(r,{x:190,y:292},1);for(let i=0;i<30;i++)stepCarry(r,1000/60,[{x:230,y:240,width:10,height:80}]);expect(r.contacts[0].active).toBe(false);
 const closed=carry();closed.contacts[0].open=false;carryAction(closed,{x:112,y:292},1);carryAction(closed,{x:190,y:292},1);stepCarry(closed,500,[]);expect(closed.contacts[0].active).toBe(false);
 const left=carry();carryAction(left,{x:112,y:292},-1);carryAction(left,{x:320,y:292},-1);for(let i=0;i<30;i++)stepCarry(left,1000/60,[]);expect(left.contacts[0].active).toBe(true);
});
test('mandatory items recover safely and a lid absorbs only one hit before reset',()=>{
 const r=carry();carryAction(r,{x:112,y:292},1);expect(absorbLidHit(r)).toBe(true);carryAction(r,{x:112,y:292},1);expect(absorbLidHit(r)).toBe(false);
 r.item.state='resting';r.item.position={x:-20,y:400};settleCarry(r,{x:0,y:0},[]);expect(r.item.position).toEqual(r.item.spawn);expect(r.ledger).toEqual([]);
});
test('crouch plus context drops the item onto a reachable support',()=>{const r=carry();carryAction(r,{x:112,y:292},1);expect(carryAction(r,{x:190,y:292},1,true)).toBe('drop');settleCarry(r,{x:190,y:292},[{x:0,y:320,width:640,height:40}]);expect(r.item.position.y).toBe(312);expect(r.item.state).toBe('resting');});
test('power switching cannot close geometry inside Mira or clear the ledger',()=>{
 const r=createPowerRoom([{id:'bridge',solidOn:'B',rect:{x:200,y:280,width:80,height:20}}]);r.ledger.push('transmission');expect(switchCircuit(r,{x:210,y:260,width:22,height:44})).toBe(false);expect(r.circuit).toBe('A');expect(switchCircuit(r,{x:60,y:276,width:22,height:44})).toBe(true);expect(r.circuit).toBe('B');expect(r.ledger).toEqual(['transmission']);
});
test('power state graphs require an exit and return to a switch in both circuits',()=>{
 const edges=[{from:'entry',to:'switch'},{from:'switch',to:'exit',circuit:'A' as const},{from:'switch',to:'bridge',circuit:'B' as const},{from:'bridge',to:'exit',circuit:'B' as const}];expect(powerGraphSafe(edges,['switch'],'entry','exit')).toBe(true);expect(powerGraphSafe(edges.filter(e=>e.from!=='bridge'),['switch'],'entry','exit')).toBe(false);
});
