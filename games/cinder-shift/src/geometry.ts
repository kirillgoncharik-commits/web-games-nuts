import type {Point,Rect} from './mission';
export function intersects(a:Rect,b:Rect){return a.x<b.x+b.width && a.x+a.width>b.x && a.y<b.y+b.height && a.y+a.height>b.y;}
export function expand(r:Rect,x:number,y:number):Rect{return {x:r.x-x,y:r.y-y,width:r.width+2*x,height:r.height+2*y};}
// Slab intersection also catches fast projectiles crossing thin cover in one tick.
export function segmentRect(a:Point,b:Point,r:Rect){
  let lo=0,hi=1;
  for(const [p,d,min,max] of [[a.x,b.x-a.x,r.x,r.x+r.width],[a.y,b.y-a.y,r.y,r.y+r.height]]){
    if(Math.abs(d)<1e-8){if(p<min || p>max)return false;}
    else{const t1=(min-p)/d,t2=(max-p)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;}
  }
  return true;
}
export function clearLine(a:Point,b:Point,solids:Rect[]){return !solids.some(s=>segmentRect(a,b,s));}
