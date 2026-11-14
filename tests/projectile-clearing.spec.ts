import {test,expect} from '@playwright/test';
import {Projectiles} from '../games/cinder-shift/src/projectiles';

test('shield clearing during a hit removes earlier and later enemy survivors while preserving player shots',()=>{
 const p=new Projectiles();p.fire({x:100,y:100},{x:0,y:0},'enemy','earlier');p.fire({x:200,y:100},{x:0,y:0},'enemy','impact');p.fire({x:300,y:100},{x:0,y:0},'enemy','later');p.fire({x:400,y:100},{x:0,y:0},'player','cutter');const visited:string[]=[];
 p.step(16,[],s=>{visited.push(s.source);if(s.source==='impact'){p.clearTeam('enemy');return true;}return false;});
 expect(visited).toEqual(['earlier','impact','cutter']);expect(p.shots.map(s=>s.source)).toEqual(['cutter']);
 p.fire({x:100,y:100},{x:0,y:0},'enemy','next-burst');p.step(16,[],()=>false);expect(p.shots.map(s=>s.source)).toEqual(['cutter','next-burst']);
});

test('lethal clearing inside collision cannot resurrect any already processed or pending projectile',()=>{
 const p=new Projectiles();for(const [x,source]of [[100,'earlier'],[200,'impact'],[300,'later']] as const)p.fire({x,y:100},{x:0,y:0},'enemy',source);p.fire({x:400,y:100},{x:0,y:0},'player','cutter');const visited:string[]=[];
 p.step(16,[],s=>{visited.push(s.source);if(s.source==='impact')p.clear();return false;});expect(visited).toEqual(['earlier','impact']);expect(p.shots).toEqual([]);
 p.fire({x:400,y:100},{x:0,y:0},'player','new-attempt');p.step(16,[],()=>false);expect(p.shots.map(s=>s.source)).toEqual(['new-attempt']);
});

test('ordinary collisions retain unrelated shots when no team is cleared',()=>{
 const p=new Projectiles();p.fire({x:100,y:100},{x:100,y:0},'enemy','accepted');p.fire({x:200,y:100},{x:100,y:0},'enemy','unrelated');
 p.step(100,[],s=>s.source==='accepted');expect(p.shots).toHaveLength(1);expect(p.shots[0]).toMatchObject({source:'unrelated',x:210});
});
