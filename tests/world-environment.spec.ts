import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {jump,standingJump,to,ground,until} from './route-helpers';

for(const touch of [false,true])test(`SW02 keyboard moves real colliders and waits for Mira, ${touch?'two-touch':'keyboard'} input`,async({page,browserName},info)=>{
 test.skip(touch&&browserName!=='chromium','Two-contact CDP emulation is Chromium-only; physical devices remain a separate gate.');test.setTimeout(45000);
 // One labelled SW02 entry fixture. The safe first key is before scanner activation.
 await encounter(page,{mission:'SW02',room:'SW02-A',touch});
 const target=async()=>(await state(page)).solids.find((r:any)=>r.id==='world-key:c02-small-world:SW02-A:key-pair-01:target');
 expect((await target()).y).toBe(272);const samples:any[]=[];
 const capture=async(label:string)=>{samples.push({label,state:await state(page)});await page.screenshot({path:info.outputPath(label+'.png')});};
 const session=touch?await page.context().newCDPSession(page):null;
 const point=(b:{x:number;y:number;width:number;height:number},id:number)=>({x:b.x+b.width/2,y:b.y+b.height/2,id});
 const fingers=async(jump:boolean)=>{const [right,up]=await Promise.all([page.locator('[data-action="right"]').boundingBox(),page.locator('[data-action="jump"]').boundingBox()]);return session!.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(right!,1),...(jump?[point(up!,2)]:[])]});};
 const release=async()=>session!.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 if(touch){await fingers(false);await until(page,()=>(window as any).__CINDER__().player.x>=132,null,'touch key approach');await fingers(true);await until(page,()=>(window as any).__CINDER__().player.x>=183,null,'two-contact key landing');await release();}
 else await jump(page,132,183);
 await ground(page,300);expect((await state(page)).world.keyboard.pressed).toBe(true);expect((await target()).y).toBe(288);await capture('key-pressed');
 await page.locator('#hud-pause').click();const paused=await state(page);await page.waitForTimeout(250);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).world.keyboard).toEqual(paused.world.keyboard);await page.getByTestId('resume').click();
 if(touch){await fingers(true);await until(page,()=>(window as any).__CINDER__().player.x>=304,null,'touch second key');await release();}else await standingJump(page,304);
 await ground(page,288);const deadline=(await state(page)).world.keyboard.releaseAt;
 await until(page,deadline=>(window as any).__CINDER__().simMs>deadline+250,deadline,'key return deadline');
 expect((await target()).y).toBe(288);expect((await state(page)).player.y+22).toBe(288);await capture('return-waits-for-mira');
 if(touch){await fingers(false);await until(page,()=>(window as any).__CINDER__().player.x>=370,null,'touch step off key');await release();}else await to(page,370);
 await ground(page,320);await expect.poll(async()=>(await target()).y).toBe(272);expect((await state(page)).hp).toBe(6);await capture('key-restored');
 await writeFile(info.outputPath('keyboard-evidence.json'),JSON.stringify({fixture:'one SW02-A entry; all subsequent input is trusted keyboard or at most two touch contacts',touch,samples},null,2));await session?.detach();
});

test('printer platform warns, carries Mira through return, pauses and preserves its lower route',async({page},info)=>{
 await encounter(page,{mission:'SW02',room:'SW02-C'});
 const samples:any[]=[];const capture=async(label:string)=>{samples.push({label,state:await state(page)});await page.screenshot({path:info.outputPath(label+'.png')});};
 await capture('printer-entry');await jump(page,108,176);await ground(page,276);
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__(),p=s.world.paper;return p.visible&&(s.simMs-p.startedAt)%4800<2500;});
 await to(page,208);await ground(page,276);await standingJump(page,288);await ground(page,244);await capture('paper-rider');
 await page.locator('#hud-pause').click();const paused=await state(page);await page.waitForTimeout(250);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).world.paper).toEqual(paused.world.paper);await page.getByTestId('resume').click();
 await page.waitForFunction(()=>(window as any).__CINDER__().world.paper.waitingForMira);expect((await state(page)).player.y+22).toBe(244);await capture('paper-return-held');
 await to(page,394);await ground(page,320);expect((await state(page)).hp).toBe(6);
 await page.keyboard.down('s');await to(page,230);await page.keyboard.up('s');await ground(page,320);expect((await state(page)).hp).toBe(6);await capture('printer-lower-bypass');
 await writeFile(info.outputPath('paper-evidence.json'),JSON.stringify({fixture:'one labelled SW02-C entry; ordinary keyboard input afterwards',samples},null,2));
});

test('reflector waits for two lamp scans and opens the desktop exit through ordinary input',async({page},info)=>{
 // A labelled room-entry fixture clears combat only; all reflector/scan/exit state is earned.
 await encounter(page,{mission:'SW02',room:'SW02-D',cleared:true});
 const samples:any[]=[];const capture=async(label:string)=>{samples.push({label,state:await state(page)});await page.screenshot({path:info.outputPath(label+'.png')});};
 await to(page,108);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');
 await jump(page,128,224);await ground(page,320);await to(page,328);
 const open=async()=>page.waitForFunction(()=>{const s=(window as any).__CINDER__(),w=s.world;return w.carry.contacts.find((c:any)=>!c.active)?.open&&(s.simMs-w.lamp.startedAt)%5000<4000;});
 await open();await capture('lamp-first-contact-open');await page.locator('#hud-pause').click();const paused=await state(page);await page.waitForTimeout(250);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).world.lamp).toEqual(paused.world.lamp);await page.getByTestId('resume').click();
 await open();await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);expect((await state(page)).exitOpen).toBe(false);
 await to(page,380);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');
 await jump(page,404,504);await ground(page,320);await open();await capture('lamp-second-contact-open');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(2);
 await to(page,584);await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);await page.keyboard.up('e');expect((await state(page)).world.carry.ledger).toEqual(['desktop-line-01','desktop-line-02']);await capture('lamp-exit-ready');
 await writeFile(info.outputPath('lamp-evidence.json'),JSON.stringify({fixture:'one labelled SW02-D entry with combat cleared; reflector, scans and exit use ordinary input; full campaign routes test combat separately',samples},null,2));
});

test('moving towel carries a rider, pauses with the game and leaves the lower bypass open',async({page},info)=>{
 await encounter(page,{mission:'SW04',room:'SW04-B'});
 await jump(page,120,184);await ground(page,280);await to(page,210);await ground(page,280);
 // Launch near the fixed ledge; the cloth is reachable with the base jump.
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.world.cloth.offset<12;});
 await standingJump(page,322);await ground(page,248);
 const first=await state(page),start=first.simMs;await page.waitForFunction(start=>(window as any).__CINDER__().simMs>start+350,start);
 const moved=await state(page);expect(Math.abs(moved.player.x-first.player.x)).toBeGreaterThan(1);expect(moved.player.y+22).toBe(248);expect(moved.hp).toBe(6);
 await page.screenshot({path:info.outputPath('towel-rider.png')});
 await page.locator('#hud-pause').click();const paused=await state(page);await page.waitForTimeout(250);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).world.cloth).toEqual(paused.world.cloth);await page.getByTestId('resume').click();
 await page.keyboard.down('s');await to(page,244);await ground(page,320);await page.keyboard.up('s');expect((await state(page)).hp).toBe(6);
 await writeFile(info.outputPath('towel-evidence.json'),JSON.stringify({fixture:'one SW04-B entry, ordinary keyboard afterwards',first,moved,paused,lower:await state(page)},null,2));
});

test('vent flag warns before physical drift and crouch protects the waiting pocket',async({page},info)=>{
 await encounter(page,{mission:'SW03',room:'SW03-C'});await page.keyboard.down('s');await to(page,258);await ground(page,320);await page.keyboard.up('s');await expect.poll(async()=>(await state(page)).player.crouching).toBe(false);
 await page.waitForFunction(()=>{const t=(window as any).__CINDER__().simMs%5200;return t>=2600&&t<2900;});
 const first=await state(page);await page.waitForFunction(t=>(window as any).__CINDER__().simMs>=t+300,first.simMs);const gust=await state(page);
 expect(gust.player.x-first.player.x).toBeGreaterThan(3);expect(gust.player.y+22).toBe(320);expect(gust.hp).toBe(6);
 await page.keyboard.down('s');await expect.poll(async()=>(await state(page)).player.crouching).toBe(true);const sheltered=await state(page);
 await page.waitForFunction(t=>(window as any).__CINDER__().simMs>=t+300,sheltered.simMs);expect(Math.abs((await state(page)).player.x-sheltered.player.x)).toBeLessThan(.5);
 await page.screenshot({path:info.outputPath('vent-shelter.png')});await page.keyboard.up('s');
 await writeFile(info.outputPath('vent-evidence.json'),JSON.stringify({fixture:'one SW03-C entry, ordinary keyboard afterwards',first,gust,sheltered},null,2));
});

test('the laundry damper closes through a carried weight before the fragment contact opens',async({page},info)=>{
 await encounter(page,{mission:'SW03',room:'SW03-D'});await to(page,108);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');
 await to(page,228);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);
 const closed=await state(page);expect(closed.world.damperClosedAt).not.toBeNull();expect(closed.world.carry.contacts[1].open).toBe(false);
 await page.screenshot({path:info.outputPath('damper-closed.png')});
 await to(page,276);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');
 await jump(page,284,380);await ground(page,320);await to(page,496);await ground(page,320);
 await page.waitForFunction(()=>(window as any).__CINDER__().world.carry.contacts[1].open);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(2);
 await to(page,584);await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);await page.keyboard.up('e');
 expect((await state(page)).world.carry.ledger).toEqual(['damper-close-01','vent-fragment-02']);
 await writeFile(info.outputPath('damper-evidence.json'),JSON.stringify({fixture:'one SW03-D entry, all contacts and exit earned with keyboard',closed,final:await state(page)},null,2));
});
