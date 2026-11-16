import {powerTarget,worldContext} from '../games/cinder-shift/src/session/world-runtime';
import {rooms} from '../games/cinder-shift/src/room-data';
import {test,expect,type Page} from '@playwright/test';
import {Campaign,newCampaign,contentVersion} from '../games/cinder-shift/src/session/campaign';
import {missionIds} from '../games/cinder-shift/src/session/missions';
import {clearLine} from '../games/cinder-shift/src/geometry';
import {state} from './helpers';

// The unlock is a labelled legacy fixture; every action inside C02/C03 uses ordinary input.
async function unlocked(page:Page){
 await page.goto('/games/cinder-shift/');await expect(page.getByTestId('new-shift')).toBeVisible();const c=new Campaign(newCampaign(4));
 for(const id of missionIds){c.prepare();c.begin();c.applyResult({attempt_id:'legacy-'+id,mission_id:id,result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:1,screen_ms:0,nodes:[]});c.advance();}
 const record={schema_version:1,content_version:contentVersion,game_id:'r01',build_id:'legacy-completion-fixture',saved_at:new Date().toISOString(),campaign:c.snapshot()};
 await page.evaluate(record=>new Promise<void>((resolve,reject)=>{const r=indexedDB.open('cinder-shift-r01',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('records','readwrite');tx.objectStore('records').put(record,'campaign');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};}),record);
 await page.reload();await expect(page.getByTestId('continue')).toBeVisible();
}
async function walk(page:Page,target:number,allowExit=false){
 const origin=(await state(page)).room;let previous=NaN;for(let n=0;n<120;n++){
  const s=await state(page);if(allowExit&&(s.state==='complete'||s.room!==origin)){await page.keyboard.up('a');await page.keyboard.up('d');await page.keyboard.up('s');await page.keyboard.up('Space');return;}if(s.state!=='playing'||s.room!==origin)throw Error('walk interrupted '+JSON.stringify(s));const p=s.player;if(Math.abs(p.x-target)<5){await page.keyboard.up('a');await page.keyboard.up('d');await page.keyboard.up('s');await page.keyboard.up('Space');await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return Math.abs(p.vx)<1&&p.vy===0;});
   // Releasing direction mid-jump still carries horizontal momentum until the
   // next ticks. Validate the landing, rather than accepting the airborne x.
   if(Math.abs((await state(page)).player.x-target)<7)return;
   previous=NaN;continue;
  }
  if(allowExit&&s.exitOpen&&p.x>=584&&p.vy===0){await Promise.all([page.keyboard.up('a'),page.keyboard.up('d'),page.keyboard.up('s'),page.keyboard.up('Space')]);return;}
  const f=target>p.x?1:-1,dir=f>0?'d':'a';
  const pulse=rooms[s.room as keyof typeof rooms].world?.pulse,feetNow=p.y+22;
  if(pulse&&feetNow>274){const approaching=f>0?p.x<pulse.x-12&&pulse.x-p.x<60:p.x>pulse.x+pulse.width+12&&p.x-pulse.x-pulse.width<60;const crossing=(pulse.width+64)/115*1000+250,phase=s.simMs%pulse.cycle;
   if(approaching&&(phase<pulse.warning+pulse.active||phase>pulse.cycle-crossing)){await page.keyboard.up('a');await page.keyboard.up('d');await page.waitForFunction(({cycle,start,end})=>{const s=(window as any).__CINDER__(),p=s.simMs%cycle;return p>=start&&p<=end;},{cycle:pulse.cycle,start:pulse.warning+pulse.active,end:pulse.cycle-crossing});continue;}
  }
  const feet=p.y+22;
  const head=s.solids.some((r:any)=>r.y<feet-40&&r.y+r.height>feet-44&&r.y+r.height<=feet-26&&r.x<p.x+f*24+12&&r.x+r.width>p.x+f*24-12);
  const obstacle=s.solids.some((r:any)=>r.y<feet&&r.y+r.height>feet-20&&r.x<p.x+f*32+12&&r.x+r.width>p.x+f*32-12);
  const precise=p.vy===0&&!obstacle&&Math.abs(target-p.x)<40;
  await Promise.all([page.keyboard.up(f>0?'a':'d'),page.keyboard.down(dir),head||precise?page.keyboard.down('s'):page.keyboard.up('s')]);
  if(!head&&p.vy===0&&(obstacle||Math.abs(p.x-previous)<1)){await page.keyboard.down('Space');await page.waitForTimeout(180);await page.keyboard.up('Space');}
  previous=p.x;await page.waitForTimeout(Math.abs(target-p.x)<48?20:80);
 }throw Error('walk blocked '+target+' '+JSON.stringify(await state(page)));
}
async function face(page:Page,f:number){const key=f>0?'d':'a';await page.keyboard.down(key);await page.waitForTimeout(70);await page.keyboard.up(key);await expect.poll(async()=>(await state(page)).player.facing).toBe(f);await page.waitForFunction(()=>{const p=(window as any).__CINDER__().player;return Math.abs(p.vx)<1&&p.vy===0;});}
function contextPoint(s:any,action:'pickup'|'switch'|'activate'|'repair',point:{x:number;y:number}){
 const spec=rooms[s.room as keyof typeof rooms].world!,y=point.y;
 const x=[point.x,point.x-20,point.x+20,point.x-10,point.x+10].find(x=>x>32&&x<610
  &&s.solids.some((r:any)=>Math.abs(r.y-y)<1&&x-11>=r.x&&x+11<=r.x+r.width)
  &&!s.solids.some((r:any)=>r.y<y&&r.y+r.height>y-44&&r.x<x+20&&r.x+r.width>x-20)
  // Plan the standing point separately from waiting for the actual safe phase.
  &&worldContext({...spec,pulse:undefined},s.world,{x,y},s.simMs,s.hp<s.maxHp)===action);
 if(x===undefined)throw Error('no '+action+' standing point '+JSON.stringify({room:s.room,point,player:s.player,world:s.world}));return x;
}
async function combat(page:Page){
 for(let n=0;n<12;n++){
  const s=await state(page),en=s.enemies.find((e:any)=>e.hp>0);if(!en)return;
  const pulse=rooms[s.room as keyof typeof rooms].world?.pulse;
  const fallback=Array.from({length:69},(_,i)=>48+i*8).sort((a,b)=>Math.abs(Math.abs(a-en.x)-90)-Math.abs(Math.abs(b-en.x)-90));
  const blocked=s.solids.filter((r:any)=>r.y<320&&r.y+r.height>200).map((r:any)=>[r.x,r.x+r.width]).sort((a:number[],b:number[])=>a[0]-b[0]);
  const gapCenters:number[]=[];let edge=24;for(const [left,right]of blocked){if(left-edge>=40)gapCenters.push((edge+left)/2);edge=Math.max(edge,right);}if(616-edge>=40)gapCenters.push((edge+616)/2);
  const candidates=[s.player.x,...gapCenters,en.x-90,en.x+90,en.x-120,en.x+120,en.x-60,en.x+60,...fallback].filter(x=>x>40&&x<600&&Math.abs(x-en.x)>=(en.kind==='turret'?64:40)&&(!pulse||x+20<pulse.x||x-20>pulse.x+pulse.width)&&!s.solids.some((r:any)=>r.y<320&&r.y+r.height>200&&r.x<x+20&&r.x+r.width>x-20)).sort((a,b)=>Math.abs(a-s.player.x)-Math.abs(b-s.player.x));
  const at=candidates.find(x=>clearLine({x:x+Math.sign(en.x-x)*19,y:292},{x:en.x,y:en.y},s.solids));if(at===undefined)throw Error('no baseline firing lane '+JSON.stringify(s));
  await walk(page,at);await expect.poll(async()=>(await state(page)).player.y+22).toBe(320);await face(page,en.x>at?1:-1);await page.keyboard.down('j');
  await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id===en.id)?.hp,{timeout:18000}).toBeLessThanOrEqual(0);await page.keyboard.up('j');
 }
}
async function solveRoom(page:Page){
 await combat(page);let s=await state(page);
 if(s.world.carry){for(let n=0;n<12;n++){
  s=await state(page);const contact=s.world.carry.contacts.find((c:any)=>!c.active);if(!contact)break;
  const spec=rooms[s.room as keyof typeof rooms].world!,pickup=contextPoint(s,'pickup',{x:s.world.carry.item.position.x,y:320});
  await walk(page,pickup);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');const ground=(await state(page)).solids,pulse=spec.pulse;const launch=[contact.rect.x-52,contact.rect.x+52,contact.rect.x-92,contact.rect.x+92].find(x=>x>32&&x<610&&(!pulse||x+16<pulse.x||x-16>pulse.x+pulse.width)&&!ground.some((r:any)=>r.y<320&&r.y+r.height>276&&r.x<x+20&&r.x+r.width>x-20));if(launch===undefined)throw Error('no grounded throw lane '+contact.id);await walk(page,launch);await face(page,launch<contact.rect.x?1:-1);if((await state(page)).world.carry.item.state!=='held')continue;
  const flightMs=Math.abs(contact.rect.x-launch)/220*1000+220;
  await page.waitForFunction(({pulse,flightMs})=>{const s=(window as any).__CINDER__();return s.world.carry.contacts.find((c:any)=>!c.active)?.open&&(!pulse||pulse.cycle-s.simMs%pulse.cycle>flightMs);},{pulse,flightMs});if((await state(page)).world.carry.item.state!=='held')continue;await page.keyboard.press('e');
  await expect.poll(async()=>(await state(page)).world.carry.item.state).not.toBe('held');await page.waitForFunction(()=>(window as any).__CINDER__().world.carry.item.state!=='thrown');
 }await expect.poll(async()=>(await state(page)).world.carry.contacts.every((c:any)=>c.active)).toBe(true);}
 s=await state(page);if(s.world.power){
  // The fixed contact markers are the same visible one/two-lamp goals as the HUD.
  const sequences:Record<string,string[]>={'A':['B'],'B':['B','A'],'C':['B'],'D':['B','A','B']};const room=s.room;let sequence=sequences[room.at(-1)];if(room==='YU04-C')sequence=['B','A'];if(room==='YU05-C')sequence=['B','A','B'];
  for(let phase=0;phase<sequence.length;phase++){
   s=await state(page);if(s.world.power.circuit!==sequence[phase]){
    const switches=rooms[s.room as keyof typeof rooms].world!.switches!;
    const point=[...switches].sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];
    await walk(page,contextPoint(s,'switch',point));await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe(sequence[phase]);
   }
   const current=await state(page),target=powerTarget(rooms[current.room as keyof typeof rooms].world!,current.world);if(!target)throw Error('missing visible power contact');
   // Reuse the local switch on the current side of an A wall. Returning to the
   // entrance switch can close the route before reaching the next contact.
   await walk(page,contextPoint(current,'activate',target));await page.waitForFunction(()=>(window as any).__CINDER__().worldPulse==='safe');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(phase+1);
  }
 }
 s=await state(page);if(s.room.endsWith('-D')){await walk(page,584);await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);await page.keyboard.up('e');}
 s=await state(page);const repair=rooms[s.room as keyof typeof rooms].world?.repair;if(repair&&s.hp<s.maxHp&&!s.world.repaired){await walk(page,contextPoint(s,'repair',repair));await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.repaired).toBe(true);}
 const before=s.room;await walk(page,600,true);s=await state(page);if(s.state==='complete'||s.room!==before)return;await page.keyboard.down('d');await page.waitForFunction(before=>{const s=(window as any).__CINDER__();return s.room!==before||s.state==='complete';},before,{timeout:10000});await page.keyboard.up('d');
}
for(const world of ['c02-small-world','c03-adriatic-1986'])test(`real input full ${world}: 20 rooms, 5 missions, final fact and persisted result`,async({page},info)=>{
 test.setTimeout(600000);await unlocked(page);await page.getByTestId('menu-campaigns').click();await page.getByTestId('world-'+world).click();const visited:string[]=[];
 for(let mission=1;mission<=5;mission++){
  await page.getByTestId('map-prepare').click();await page.getByTestId('briefing').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');
  for(let room=0;room<4;room++){
   await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.state==='playing'&&s.player?.vy===0;});const before=await state(page);visited.push(before.room);try{await solveRoom(page);}catch(error){const failed=await state(page);console.error('ROUTE_FAILURE '+JSON.stringify({visited,room:failed.room,state:failed.state,player:failed.player,hp:failed.hp,world:failed.world,solids:failed.solids,enemies:failed.enemies}));await info.attach('route-failure.json',{body:JSON.stringify(await state(page),null,2),contentType:'application/json'});throw error;}
  }
  await expect(page.getByTestId('result-research')).toBeVisible();await page.getByTestId('result-research').click();
 }
 await expect.poll(async()=>(await state(page)).campaign.stage).toBe('campaign_complete');await expect(page.locator('.result-grid')).toContainText('5');const final=(await state(page)).campaign;expect(final.completed_missions).toHaveLength(5);expect(new Set(visited).size).toBe(20);expect(final.world_facts).toHaveLength(world==='c02-small-world'?3:5);await page.reload();await page.getByTestId('continue').click();expect((await state(page)).campaign).toEqual(final);await info.attach('input-route.json',{body:JSON.stringify({source:'legacy C01 unlock fixture; all world input real',visited,final},null,2),contentType:'application/json'});
});
