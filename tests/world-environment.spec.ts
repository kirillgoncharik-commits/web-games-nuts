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

test('drawer contact opens its real gate through normal carry and throw input',async({page},info)=>{
 await encounter(page,{mission:'SW01',room:'SW01-A'});
 expect((await state(page)).solids.some((r:any)=>r.id?.startsWith('world-latch:'))).toBe(true);
 await to(page,108);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');
 await page.keyboard.down('s');await to(page,240);await ground(page,320);await page.keyboard.up('s');await expect.poll(async()=>(await state(page)).player.crouching).toBe(false);
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.latch.open).toBe(true);
 const after=await state(page);expect(after.world.carry.ledger).toEqual(['drawer-lock-01']);expect(after.solids.some((r:any)=>r.id?.startsWith('world-latch:'))).toBe(false);expect(after.hp).toBe(6);
 await page.screenshot({path:info.outputPath('drawer-gate-open.png')});await writeFile(info.outputPath('drawer-gate-evidence.json'),JSON.stringify({fixture:'one SW01-A entry; gate earned through ordinary input',world:after.world,solids:after.solids,player:after.player,hp:after.hp},null,2));
});

test('kitchen lower shelter protects crouching Mira during the same live steam pulse that hits a standing Mira',async({page},info)=>{
 await encounter(page,{mission:'SW01',room:'SW01-B',cleared:true});await to(page,248);await ground(page,320);await page.keyboard.down('s');await to(page,304);await ground(page,320);
 await page.waitForFunction(()=>{const t=(window as any).__CINDER__().simMs%5400;return t>=1400&&t<1550;});const before=await state(page);
 await page.waitForFunction(t=>(window as any).__CINDER__().simMs>=t+250,before.simMs);const protectedState=await state(page);expect(protectedState.hp).toBe(6);expect(protectedState.player.crouching).toBe(true);
 await page.screenshot({path:info.outputPath('steam-lower-shelter.png')});await page.keyboard.up('s');await expect.poll(async()=>(await state(page)).hp).toBeLessThan(6);
 await writeFile(info.outputPath('steam-shelter-evidence.json'),JSON.stringify({fixture:'one SW01-B entry with combat cleared; ordinary movement, crouch and release afterwards',before:{time:before.simMs,hp:before.hp,player:before.player},protected:{time:protectedState.simMs,hp:protectedState.hp,player:protectedState.player},standing:{time:(await state(page)).simMs,hp:(await state(page)).hp}},null,2));
});

for(const mission of ['SW01','SW05'] as const)test(mission+' has three earned scan/contact phases with changing physical cover and a working exit',async({page},info)=>{
 test.setTimeout(75000);await encounter(page,{mission,room:mission+'-D'});const samples:any[]=[];
 const capture=async(label:string)=>{const s=await state(page);samples.push({label,simMs:s.simMs,hp:s.hp,player:s.player,world:s.world,solids:s.solids,timing:s.worldEncounter});await page.screenshot({path:info.outputPath(label+'.png')});};
 await to(page,108);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');
 for(let stage=0;stage<3;stage++){
  const launch=mission==='SW01'?[212,356,496][stage]:[188,452,496][stage];
  if(stage>0){await to(page,mission==='SW05'&&stage===2?424:mission==='SW01'?[0,264,408][stage]:240);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.carry.item.state).toBe('held');}
  if(mission==='SW05'&&stage===1){await jump(page,284,374);await ground(page,320);}
  await to(page,launch);await ground(page,320);
  if(mission==='SW05'&&stage===1){await page.keyboard.down('a');await page.waitForFunction(()=>(window as any).__CINDER__().player.facing===-1);await page.keyboard.up('a');await ground(page,320);}
  await page.waitForFunction(()=>(window as any).__CINDER__().worldEncounter?.phase==='scan');const coveredHp=(await state(page)).hp;await capture('phase-'+stage+'-scan');
  if(stage===0){await page.locator('#hud-pause').click();const paused=await state(page);await page.waitForTimeout(250);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).world.encounter).toEqual(paused.world.encounter);await page.getByTestId('resume').click();}
  await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.worldEncounter?.phase==='open'&&s.worldEncounter.remaining>1200&&s.world.carry.contacts.find((c:any)=>!c.active)?.open;});
  expect((await state(page)).hp).toBe(coveredHp);await capture('phase-'+stage+'-open');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(stage+1);
  expect((await state(page)).world.encounter.stage).toBe(stage+1);
 }
 await expect.poll(async()=>(await state(page)).solids.filter((r:any)=>r.id?.startsWith('world-encounter:')).length).toBe(0);
 await to(page,584);await ground(page,320);await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);await page.keyboard.up('e');
 const final=await state(page);expect(final.world.carry.ledger).toEqual(mission==='SW01'?['dock-phase-01','dock-phase-02','dock-phase-03']:['beacon-final-01','beacon-final-02','beacon-final-03']);expect(final.hp).toBeGreaterThan(0);await capture('phase-final-exit');
 await writeFile(info.outputPath('phased-encounter-evidence.json'),JSON.stringify({fixture:'one labelled mission finale entry; carry, every phase and exit earned through ordinary input',mission,samples},null,2));
});

test('traction disconnect removes its real gate and makes the service crossing safe through ordinary input',async({page},info)=>{
 await encounter(page,{mission:'YU03',room:'YU03-A'});await page.waitForFunction(()=>(window as any).__CINDER__().worldPowerField==='live');
 const live=await state(page);expect(live.hp).toBe(6);expect(live.solids.some((r:any)=>r.id==='world-power:traction-A')).toBe(true);await page.screenshot({path:info.outputPath('traction-live-entry.png')});
 await to(page,112);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 const isolated=await state(page);expect(isolated.worldPowerField).toBe('isolated');expect(isolated.solids.some((r:any)=>r.id==='world-power:traction-A')).toBe(false);
 await page.locator('#hud-pause').click();const paused=await state(page);await page.waitForTimeout(250);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).world).toEqual(paused.world);await page.getByTestId('resume').click();
 await page.keyboard.down('s');await to(page,552);await ground(page,320);await page.keyboard.up('s');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);
 const crossed=await state(page);expect(crossed.hp).toBe(6);expect(crossed.exitOpen).toBe(true);expect(crossed.world.ledger).toEqual(['traction:phase-0']);await page.screenshot({path:info.outputPath('traction-safe-crossing.png')});
 await writeFile(info.outputPath('traction-evidence.json'),JSON.stringify({fixture:'one YU03-A entry; power, crossing and contact use ordinary keyboard input',live,isolated,crossed},null,2));
});

test('a warned live traction section really damages Mira when she enters without disconnecting it',async({page},info)=>{
 await encounter(page,{mission:'YU03',room:'YU03-A'});await to(page,220);await ground(page,320);
 await page.waitForFunction(()=>(window as any).__CINDER__().worldPowerField==='live');const before=await state(page);expect(before.hp).toBe(6);
 await page.keyboard.down('d');await expect.poll(async()=>(await state(page)).hp).toBeLessThan(6);await page.keyboard.up('d');const hit=await state(page);
 expect(hit.world.power.circuit).toBe('A');expect(hit.hp).toBeGreaterThan(0);await page.screenshot({path:info.outputPath('traction-live-hit.png')});
 await writeFile(info.outputPath('traction-hit-evidence.json'),JSON.stringify({fixture:'one YU03-A entry; wait for warning, then ordinary movement into live rails',before,hit},null,2));
});

test('train doors, light and actual supports follow both earned circuit states without moving the world',async({page},info)=>{
 test.setTimeout(45000);await encounter(page,{mission:'YU03',room:'YU03-B'});const samples:any[]=[];
 const capture=async(label:string)=>{samples.push({label,state:await state(page)});await page.screenshot({path:info.outputPath(label+'.png')});};await capture('train-A-entry');
 await to(page,112);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 expect((await state(page)).solids.some((r:any)=>r.id==='world-power:train-door-A')).toBe(false);expect((await state(page)).solids.some((r:any)=>r.id==='world-power:train-door-B')).toBe(true);
 await jump(page,120,184);await ground(page,288);await to(page,210);await ground(page,288);await standingJump(page,300);await ground(page,288);await capture('train-B-bridge');
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);
 await page.locator('#hud-pause').click();const paused=await state(page);await page.waitForTimeout(250);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).solids).toEqual(paused.solids);await page.getByTestId('resume').click();
 await to(page,320);await ground(page,288);await standingJump(page,384);await ground(page,288);await to(page,436);await ground(page,288);await standingJump(page,500);await ground(page,244);await to(page,584);await ground(page,320);
 await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('A');
 expect((await state(page)).solids.some((r:any)=>r.id==='world-power:train-door-A')).toBe(true);expect((await state(page)).solids.some((r:any)=>r.id==='world-power:train-door-B')).toBe(false);
 await to(page,552);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(2);await capture('train-A-return');
 expect((await state(page)).world.ledger).toEqual(['train:phase-0','train:phase-1']);expect((await state(page)).hp).toBe(6);
 await writeFile(info.outputPath('train-evidence.json'),JSON.stringify({fixture:'one YU03-B entry; both switches, bridge crossing and contacts earned with keyboard',samples},null,2));
});

test('tunnel signals permit a warned crossing between dry pockets in either power circuit',async({page},info)=>{
 await encounter(page,{mission:'YU03',room:'YU03-C',cleared:true});await to(page,112);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 await to(page,216);await ground(page,320);await page.waitForFunction(()=>(window as any).__CINDER__().worldPulse==='active');const waiting=await state(page);expect(waiting.hp).toBe(6);await page.screenshot({path:info.outputPath('tunnel-red-signal.png')});
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.worldPulse==='safe'&&s.worldPulseElapsed%5000<2800;});await standingJump(page,312);await ground(page,288);
 await page.waitForFunction(()=>(window as any).__CINDER__().worldPulse==='active');const pocket=await state(page);expect(pocket.hp).toBe(6);await page.screenshot({path:info.outputPath('tunnel-dry-pocket.png')});
 await to(page,556);await ground(page,320);await page.waitForFunction(()=>(window as any).__CINDER__().worldPulse==='safe');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);
 expect((await state(page)).world.repaired).toBe(false);expect((await state(page)).hp).toBe(6);
 await writeFile(info.outputPath('tunnel-evidence.json'),JSON.stringify({fixture:'one labelled YU03-C entry with its drone cleared; real combat remains in full C03 route; ordinary power and crossing input',waiting,pocket,final:await state(page)},null,2));
});

test('substation earns traction isolation before its fresh pulse warning and confirms all three original contacts',async({page},info)=>{
 test.setTimeout(45000);await encounter(page,{mission:'YU03',room:'YU03-D'});const samples:any[]=[];
 const capture=async(label:string)=>{samples.push({label,state:await state(page)});await page.screenshot({path:info.outputPath(label+'.png')});};
 expect((await state(page)).worldPulse).toBe('safe');expect((await state(page)).world.pulseStartedAt).toBeNull();
 await to(page,112);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 await jump(page,136,224);await ground(page,320);await to(page,264);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);
 const armed=await state(page);expect(armed.worldPowerField).toBe('isolated');expect(armed.worldPulse).toBe('warning');expect(armed.world.pulseStartedAt).not.toBeNull();await capture('substation-crossing-secured');
 await page.locator('#hud-pause').click();const paused=await state(page);await page.waitForTimeout(250);expect((await state(page)).simMs).toBe(paused.simMs);expect((await state(page)).world.pulseStartedAt).toBe(paused.world.pulseStartedAt);await page.getByTestId('resume').click();
 await to(page,304);await ground(page,320);await to(page,448);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('A');expect((await state(page)).worldPowerField).toBe('isolated');
 await to(page,408);await ground(page,320);await page.waitForFunction(()=>(window as any).__CINDER__().worldPulse==='safe');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(2);await capture('substation-isolator-set');
 await to(page,448);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 await to(page,552);await ground(page,320);await page.waitForFunction(()=>(window as any).__CINDER__().worldPulse==='safe');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(3);
 await to(page,584);await ground(page,320);await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);await page.keyboard.up('e');await capture('substation-transmission');
 expect((await state(page)).world.ledger).toEqual(['isolator:phase-0','isolator:phase-1','isolator:phase-2']);expect((await state(page)).hp).toBe(6);
 await writeFile(info.outputPath('substation-evidence.json'),JSON.stringify({fixture:'one YU03-D entry; all switching, preparation and transmission use ordinary keyboard input',samples},null,2));
});

test('a closed transmitter contact beside a lever keeps the selected circuit when interact is pressed',async({page},info)=>{
 test.setTimeout(45000);await encounter(page,{mission:'YU02',room:'YU02-D'});
 await to(page,112);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('B');
 await jump(page,128,216);await ground(page,320);await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.worldPulse==='safe'&&s.worldPulseElapsed%4800<3000;});
 await to(page,264);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(1);
 await to(page,416);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.power.circuit).toBe('A');
 await to(page,408);await ground(page,320);await page.waitForFunction(()=>(window as any).__CINDER__().worldPulse==='warning');
 const before=await state(page);await page.keyboard.press('e');const blocked=await state(page);expect(blocked.world.phase).toBe(1);expect(blocked.world.power.circuit).toBe('A');expect(blocked.world.power.switches).toBe(2);await page.screenshot({path:info.outputPath('closed-contact-preserves-circuit.png')});
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.worldPulse==='safe'&&s.worldPulseElapsed%4800<3400;});await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).world.phase).toBe(2);expect((await state(page)).world.power.circuit).toBe('A');
 await writeFile(info.outputPath('closed-contact-evidence.json'),JSON.stringify({fixture:'one YU02-D entry; real switching and confirmation, including a deliberate press during a closed window',before,blocked,confirmed:await state(page)},null,2));
});
