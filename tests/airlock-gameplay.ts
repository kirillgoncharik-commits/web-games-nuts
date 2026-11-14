import {expect,type Page} from '@playwright/test';
export type AirlockAction='right'|'left'|'jump'|'crouch'|'fire'|'interact';
export type RouteInput=(action:AirlockAction,down:boolean)=>Promise<void>;
const read=(page:Page)=>page.evaluate(()=>(window as any).__CINDER__());

/** The same route drives keyboard and native touch; it never edits simulation state. */
export async function airlockExtension(page:Page,input?:RouteInput,{salvage=false}:{salvage?:boolean}={}){
 const keys={right:'d',left:'a',jump:'Space',crouch:'s',fire:'j',interact:'e'};
 const action:RouteInput=input||((name,down)=>down?page.keyboard.down(keys[name]):page.keyboard.up(keys[name]));
 async function wait<T>(predicate:(arg:T)=>unknown,arg:T,label:string,timeout=12000){
  try{await page.waitForFunction(predicate as any,arg,{timeout});}catch{const s=await read(page);throw Error(label+' '+JSON.stringify({room:s.room,hp:s.hp,player:s.player,enemies:s.enemies,exitOpen:s.exitOpen}));}
 }
 async function ground(feet=320){await wait(feet=>{const p=(window as any).__CINDER__().player;return p?.vy===0&&Math.abs(p.vx)<1&&Math.abs(p.y+22-feet)<2;},feet,'ground');}
 async function move(x:number){const right=(await read(page)).player.x<x,key=right?'right':'left';await action(key,true);await wait(({x,right})=>{const p=(window as any).__CINDER__().player;return right?p.x>=x:p.x<=x;},{x,right},'move');await action(key,false);}
 async function jump(from:number,to:number){const right=to>from,key=right?'right':'left';await action(key,true);await wait(({from,right})=>{const p=(window as any).__CINDER__().player;return right?p.x>=from:p.x<=from;},{from,right},'jump launch');await action('jump',true);await wait(({to,right})=>{const p=(window as any).__CINDER__().player;return right?p.x>=to:p.x<=to;},{to,right},'jump landing');await action('jump',false);await action(key,false);}
 async function clear(ids:string[]){await action('fire',true);await wait(ids=>{const s=(window as any).__CINDER__();return s.hp<=0||ids.every((id:string)=>s.enemies.find((e:any)=>e.id===id)?.hp<=0);},ids,'clear '+ids.join(','),18000);await action('fire',false);expect((await read(page)).hp).toBeGreaterThan(0);}
 async function next(room:string,cover=false){expect((await read(page)).combatRemaining).toBe(0);if(cover){await jump(522,600);await ground();}await action('right',true);await wait(room=>{const s=(window as any).__CINDER__();return s.room===room&&s.state==='playing'&&s.player?.x<100;},room,'enter '+room);await action('right',false);await ground();}

 await next('M1A');
 await jump(114,172);await ground(288);await jump(178,292);await ground(256);
 await action('crouch',true);await clear(['m1a-drone']);await action('crouch',false);
 await move(510);await ground();await next('M1B',true);

 await jump(114,208);await ground();await action('crouch',true);await clear(['m1b-security']);await action('crouch',false);
 if(salvage){
  await move(212);await jump(212,172);await ground(288);await jump(178,292);await ground(256);await jump(326,432);await ground(224);
  await action('interact',true);await wait(()=>(window as any).__CINDER__().roomStates.M1B.cacheUsed,null,'upper salvage');await action('interact',false);
 }else{await action('crouch',true);await move(380);await action('crouch',false);}
 await move(510);await ground();await next('M1C',true);

 await jump(130,224);await ground();await action('crouch',true);await clear(['m1c-security','m1c-turret']);await action('crouch',false);
 await next('C',true);
}
