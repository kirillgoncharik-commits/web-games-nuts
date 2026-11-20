import {test,expect} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {intersects} from '../games/cinder-shift/src/geometry';
import {approachError,standingLaneClear,standingHalfWidth,contextCandidates} from './world-route-clearance';

test('SW03-B floor firing points reserve the actual approach error at the raised ledge',()=>{
 const solids=rooms['SW03-B'].solids;
 expect(standingLaneClear(solids,248)).toBe(false);
 expect(intersects({x:242.5-11,y:276,width:22,height:44},solids.find(r=>r.x===212)!)).toBe(true);
 const safe=[256,264,272].find(x=>standingLaneClear(solids,x))!;expect(safe).toBeDefined();
 for(let delta=-approachError;delta<=approachError;delta++)expect(solids.some(r=>intersects({x:safe+delta-11,y:276,width:22,height:44},r))).toBe(false);
});

test('YU04-D narrow activation shelf has a supported contact point with the same seven pixel approach margin',()=>{
 const solids=rooms['YU04-D'].solids,point={x:264,y:288};
 const valid=(x:number)=>solids.some(r=>r.y===point.y&&x-standingHalfWidth>=r.x&&x+standingHalfWidth<=r.x+r.width)&&standingLaneClear(solids,x,point.y);
 expect([264,244,284,254,274].some(valid)).toBe(false);
 const at=contextCandidates(point.x).find(valid)!;expect(at).toBeDefined();expect(Math.abs(at-point.x)).toBeLessThanOrEqual(28);
 const shelf=solids.find(r=>r.x===232&&r.y===288)!;
 for(let delta=-approachError;delta<=approachError;delta++){expect(at+delta-11).toBeGreaterThanOrEqual(shelf.x);expect(at+delta+11).toBeLessThanOrEqual(shelf.x+shelf.width);}
});
