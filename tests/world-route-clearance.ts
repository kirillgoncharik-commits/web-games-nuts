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

// Narrow contact shelves need finer candidates than the old 10/20px offsets.
export function contextCandidates(x:number){return[...new Set([x,x-20,x+20,x-10,x+10,...Array.from({length:28},(_,i)=>[x-i-1,x+i+1]).flat()])];}
