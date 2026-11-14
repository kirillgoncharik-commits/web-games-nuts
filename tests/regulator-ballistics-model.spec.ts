import {test,expect} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {regulatorBody,regulatorImpact} from '../games/cinder-shift/src/boss';
import {shotVelocities} from '../games/cinder-shift/src/session/research';

// Actual room solids and projectile integrator, rather than a direct core hit.
function volley(bounce:boolean,open:boolean,y=228){
 const d=rooms.M5D,b=d.boss!,body=regulatorBody(b.x,b.y,b.width,b.height),shots=new Projectiles();
 const hits:{impact:string;reflected:boolean}[]=[];
 for(const velocity of shotVelocities(1,400,true))shots.fire({x:291,y},velocity,'player','cutter',1,bounce?1:0);
 for(let i=0;i<120;i++)shots.step(1000/60,d.solids,(s,from,to)=>{const impact=regulatorImpact(body,from,to,open);if(impact){hits.push({impact,reflected:s.hitIds.includes('solid:regulator-ricochet')});return true;}return false;});
 return hits;
}
test('arena reflector gives W3 one real additional core path; W2 cannot pierce it',()=>{
 const w2=volley(false,true),w3=volley(true,true);
 expect(w2.filter(h=>h.impact==='core')).toHaveLength(1);
 expect(w3.filter(h=>h.impact==='core')).toHaveLength(2);
 expect(w3.filter(h=>h.impact==='core'&&h.reflected)).toHaveLength(1);
});
test('reflected and piercing shots still respect closed core armor and floor height',()=>{
 expect(volley(true,false).every(h=>h.impact==='armor')).toBe(true);
 expect(volley(true,true,292).every(h=>h.impact==='armor')).toBe(true);
});
