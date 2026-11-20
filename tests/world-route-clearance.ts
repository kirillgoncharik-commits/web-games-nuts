import {intersects} from '../games/cinder-shift/src/geometry';
import type {Rect} from '../games/cinder-shift/src/room-data';

// walk() accepts a settled x within seven pixels. Reserve that error plus one
// pixel at each side when choosing a place to stand, rather than planning a
// theoretical 22px body one pixel beside a raised ledge.
export const approachError=7;
export const standingHalfWidth=11+approachError+1;
export function standingLaneClear(solids:readonly Rect[],x:number,feet=320){
 return !solids.some(r=>intersects({x:x-standingHalfWidth,y:feet-44,width:standingHalfWidth*2,height:44},r));
}
