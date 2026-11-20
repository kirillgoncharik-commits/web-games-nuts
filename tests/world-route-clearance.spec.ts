import {test,expect} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {intersects} from '../games/cinder-shift/src/geometry';
import {approachError,standingLaneClear} from './world-route-clearance';

test('SW03-B floor firing points reserve the actual approach error at the raised ledge',()=>{
 const solids=rooms['SW03-B'].solids;
 expect(standingLaneClear(solids,248)).toBe(false);
 expect(intersects({x:242.5-11,y:276,width:22,height:44},solids.find(r=>r.x===212)!)).toBe(true);
 const safe=[256,264,272].find(x=>standingLaneClear(solids,x))!;expect(safe).toBeDefined();
 for(let delta=-approachError;delta<=approachError;delta++)expect(solids.some(r=>intersects({x:safe+delta-11,y:276,width:22,height:44},r))).toBe(false);
});
