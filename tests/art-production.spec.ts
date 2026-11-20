import {test,expect} from '@playwright/test';
import {resolve,extname,sep} from 'node:path';
import {stat,readFile} from 'node:fs/promises';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {rooms,type RoomId} from '../games/cinder-shift/src/room-data';
import {missionIds,missions,type PlayableMissionId} from '../games/cinder-shift/src/session/missions';
import {productionArt} from '../games/cinder-shift/src/art/production-art';

// Offline response routing serves the exact built files. No listening socket,
// remote website, fabricated game clock or network data is needed.
test.beforeEach(async({page})=>{
 await page.route('http://cinder.local/**',async route=>{
  const path=new URL(route.request().url()).pathname,harness=path.startsWith('/__encounter__/'),root=resolve(harness?'qa-work/rework-harness':'dist/cinder-shift'),relative=harness?path.slice('/__encounter__/'.length):path.slice('/games/cinder-shift/'.length);
  let file=resolve(root,relative||'index.html');if(file!==root&&!file.startsWith(root+sep))return route.abort();
  try{if((await stat(file)).isDirectory())file=resolve(file,'index.html');const type:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav'};await route.fulfill({body:await readFile(file),contentType:type[extname(file)]??'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Missing built art'});}
 });
});
const worldMissions=Object.keys(productionArt.sectors) as PlayableMissionId[];
const entries=[...missionIds,...worldMissions].flatMap(m=>missions[m].rooms.map(room=>({mission:m,room}))).filter((value,index,list)=>list.findIndex(v=>v.room===value.room)===index);
for(const group of ['base','small','adriatic'])test(`${group}: every room renders installed art without missing assets or changed collision`,async({page},info)=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+':'+r.url());});
 const selected=entries.filter(e=>group==='base'?!String(e.room).includes('-'):String(e.room).startsWith(group==='small'?'SW':'YU'));
 for(const e of selected){await encounter(page,{mission:e.mission,room:e.room as RoomId,cleared:true});const current=await state(page);expect(current.room).toBe(e.room);expect(current.hp).toBe(6);for(const solid of rooms[e.room as RoomId].solids.filter(r=>!r.id))expect(current.solids).toContainEqual(solid);await page.screenshot({path:info.outputPath(String(e.room)+'.png')});}
 expect(errors).toEqual([]);expect(selected.length).toBe(group==='base'?44:20);
});
test('six world enemy families and the real boss aperture have readable live states',async({page},info)=>{
 for(const [mission,room]of [['SW02','SW02-B'],['SW01','SW01-B'],['SW02','SW02-D'],['YU01','YU01-C'],['YU02','YU02-C'],['YU03','YU03-C']] as const){await encounter(page,{mission,room});expect((await state(page)).enemies.some((e:any)=>e.mob)).toBe(true);await page.screenshot({path:info.outputPath(room+'-mob.png')});}
 await encounter(page,{mission:'reactor',room:'M5D'});await page.waitForFunction(()=>(window as any).__CINDER__().boss.pattern.phase==='core');await page.screenshot({path:info.outputPath('regulator-open-core.png')});await page.keyboard.press('Escape');await expect(page.getByTestId('resume')).toBeVisible();
});
