import type {Page,CDPSession} from '@playwright/test';
import type {AirlockAction,RouteInput} from './airlock-gameplay';

/** Stable pointer IDs and cached fixed-layout bounds; only real touch input. */
export async function nativeTouch(page:Page,cdp:CDPSession,delayMs=0){
 const held=new Map<AirlockAction,{id:number;x:number;y:number}>();
 const points=new Map<AirlockAction,{x:number;y:number}>();let nextId=1,maxTouches=0;
 const names:AirlockAction[]=['left','right','jump','crouch','fire','interact'];
 await Promise.all(names.map(async name=>{const b=await page.locator(`[data-action="${name}"]`).boundingBox();if(!b)throw Error('Touch control missing: '+name);points.set(name,{x:b.x+b.width/2,y:b.y+b.height/2});}));
 async function dispatch(type:'touchStart'|'touchEnd'){
  maxTouches=Math.max(maxTouches,held.size);if(held.size>2)throw Error('Route requires more than two touches');
  if(delayMs)await page.waitForTimeout(delayMs);
  await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[...held.values()]});
 }
 async function set(changes:Partial<Record<AirlockAction,boolean>>){
  let removed=false;for(const name of names)if(changes[name]===false)removed=held.delete(name)||removed;
  if(removed)await dispatch('touchEnd');
  let added=false;for(const name of names)if(changes[name]===true&&!held.has(name)){held.set(name,{id:nextId++,...points.get(name)!});added=true;}
  if(added)await dispatch('touchStart');
 }
 const action:RouteInput=(name,down)=>set({[name]:down});action.set=set;
 return{action,maxTouches:()=>maxTouches};
}
