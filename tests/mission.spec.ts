import {writeFile} from 'node:fs/promises';
import {test,expect,Page} from '@playwright/test';
import {MissionAttempt,SimulationClock} from '../games/cinder-shift/src/mission';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {clearLine} from '../games/cinder-shift/src/geometry';
test.use({video:'on'});
const state=(page:Page)=>page.evaluate(()=>(window as any).__CINDER__());
async function untilX(page:Page,x:number){await page.waitForFunction(x=>(window as any).__CINDER__().player?.x>=x,x,{timeout:8000}).catch(async()=>{throw Error('Movement stopped: '+JSON.stringify(await state(page)));});}
async function start(page:Page){await page.goto('/games/cinder-shift/');await page.getByRole('button',{name:'Начать миссию'}).click();await page.getByRole('button',{name:'Войти в шлюз'}).click();await expect.poll(async()=>Boolean((await state(page)).player)).toBe(true);}
async function roomA(page:Page){
  await page.keyboard.down('d');await untilX(page,143);await page.keyboard.down('Space');await untilX(page,242);await page.keyboard.up('Space');await untilX(page,294);await page.keyboard.up('d');
  await page.keyboard.down('s');await page.keyboard.down('d');await untilX(page,442);await page.keyboard.up('d');await page.keyboard.up('s');
  await page.keyboard.down('j');await expect.poll(async()=>(await state(page)).targetHp).toBe(0);await page.keyboard.up('j');
  await page.keyboard.down('d');await untilX(page,546);await page.keyboard.up('d');await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).powered).toBe(true);
  await page.keyboard.down('d');await page.waitForFunction(()=>(window as any).__CINDER__().state==='transition');await page.keyboard.up('d');await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.room==='B'&&s.state==='playing'&&s.player?.x<100;});
}
async function forwardJump(page:Page,from:number,to:number){
  await page.keyboard.down('d');await untilX(page,from);await page.keyboard.down('Space');await untilX(page,to);await page.keyboard.up('Space');await page.keyboard.up('d');
}

test('damage window, room memory, objective and ten fresh attempts',()=>{
  const a=new MissionAttempt('mission');expect(a.damage(0,'test')).toBe(true);expect(a.hp).toBe(5);expect(a.damage(699,'test')).toBe(false);expect(a.damage(700,'test')).toBe(true);
  const b=a.room('B');b.enemies[0].hp=0;a.current='C';a.room().terminal=true;a.objective=true;a.current='B';expect(a.room().enemies[0].hp).toBe(0);a.current='C';expect(a.room().terminal).toBe(true);
  expect(a.finish('victory')).toBe(true);expect(a.finish('death')).toBe(false);
  const ids=new Set<string>();for(let i=0;i<10;i++){const fresh=new MissionAttempt('mission');ids.add(fresh.id);expect(fresh.hp).toBe(6);expect(fresh.room().targetHp).toBe(3);expect(fresh.objective).toBe(false);}expect(ids.size).toBe(10);
});
test('30/60 FPS and long frame advance the same simulation clock',()=>{
  const sixty=new SimulationClock(),thirty=new SimulationClock(),long=new SimulationClock();let ticksA=0,ticksB=0,ticksC=0;
  for(let i=0;i<60;i++)sixty.advance(1000/60,()=>{ticksA++;});for(let i=0;i<30;i++)thirty.advance(1000/30,()=>{ticksB++;});for(let i=0;i<4;i++)long.advance(250,()=>{ticksC++;});
  expect(ticksA).toBe(60);expect(ticksB).toBe(60);expect(ticksC).toBe(60);expect(thirty.now).toBeCloseTo(sixty.now);expect(long.now).toBeCloseTo(sixty.now);
});
test('cover blocks both projectile teams and line of sight',()=>{
  const wall={x:100,y:280,width:16,height:40},shots=new Projectiles();let hits=0;
  shots.fire({x:90,y:292},{x:440,y:0},'player','test');shots.fire({x:125,y:292},{x:-150,y:0},'enemy','test');shots.step(100,[wall],()=>{hits++;return true;});expect(shots.shots).toHaveLength(0);expect(hits).toBe(0);expect(clearLine({x:20,y:292},{x:200,y:292},[wall])).toBe(false);
});
test('focus returns from page controls without Space activating two actions',async({page})=>{
  await start(page);
  for(const id of ['mute','diagnostics-toggle']){await page.locator('#'+id).click();const before=(await state(page)).player.x;await page.keyboard.down('d');await page.waitForTimeout(180);await page.keyboard.up('d');expect((await state(page)).player.x).toBeGreaterThan(before+8);}
  await page.locator('.settings summary').click();await page.locator('#touch-mode').focus();await page.keyboard.press('ArrowDown');expect(await page.locator('#touch-mode').evaluate(el=>el===document.activeElement)).toBe(true);
  await page.locator('.settings summary').click();await expect.poll(async()=>page.locator('#game').evaluate(el=>el===document.activeElement)).toBe(true);
  await page.locator('#mute').focus();const y=(await state(page)).player.y;await page.keyboard.press('Space');await page.waitForTimeout(100);expect((await state(page)).player.y).toBeCloseTo(y,0);
});
test('returning to A preserves target and terminal, and removes old bullets',async({page})=>{
  await start(page);await roomA(page);await page.keyboard.down('a');await page.waitForFunction(()=>(window as any).__CINDER__().state==='transition');await page.keyboard.up('a');await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.room==='A'&&s.state==='playing'&&s.player?.x>500;});const s=await state(page);expect(s.targetHp).toBe(0);expect(s.powered).toBe(true);expect(s.projectiles).toEqual([]);expect(s.hp).toBe(6);
});
test('ten browser restarts keep one scene and full initial state',async({page})=>{
  await start(page);const ids=new Set<string>();
  for(let i=0;i<10;i++){
    await expect.poll(async()=>Boolean((await state(page)).player)).toBe(true);const s=await state(page);ids.add(s.attemptId);expect(s.activeScenes).toEqual(['Room']);expect(s.hp).toBe(6);expect(s.targetHp).toBe(3);
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'В меню',exact:true}).click();await page.getByRole('button',{name:'Начать миссию'}).click();await page.getByRole('button',{name:'Войти в шлюз'}).click();
  }
  expect(ids.size).toBe(10);
  const log=(await state(page)).eventLog;
  for(const id of ids)expect(log.filter((e:any)=>e.name==='mission_end'&&e.params.attempt_id===id)).toHaveLength(1);
});

test.describe('full mission demonstration',()=>{

  test('A to B to C, held terminal, victory and retry',async({page},info)=>{
    test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await start(page);await roomA(page);
    await page.keyboard.down('j');await forwardJump(page,194,350);
    await expect.poll(async()=>(await state(page)).enemies.filter((e:any)=>e.hp>0).length,{timeout:10000}).toBe(0);await page.keyboard.up('j');
    await page.screenshot({path:info.outputPath('corridor.png')});
    await page.keyboard.down('d');await page.waitForFunction(()=>(window as any).__CINDER__().state==='transition');await page.keyboard.up('d');await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.room==='C'&&s.state==='playing'&&s.player?.x<100;});
    await page.keyboard.down('j');await forwardJump(page,130,224);await page.keyboard.down('s');
    await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id==='c-walker-1').hp,{timeout:8000}).toBe(0);await page.keyboard.up('s');
    await forwardJump(page,318,368);await page.keyboard.down('s');await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id==='c-drone').hp,{timeout:8000}).toBe(0);await page.keyboard.up('s');
    await page.keyboard.down('d');await untilX(page,420);await page.keyboard.up('d');await page.keyboard.down('s');await expect.poll(async()=>(await state(page)).enemies.find((e:any)=>e.id==='c-walker-2').hp,{timeout:8000}).toBe(0);await page.keyboard.up('s');
    await forwardJump(page,496,556);await page.keyboard.up('j');
    await page.keyboard.down('e');await page.waitForTimeout(250);await page.keyboard.up('e');expect((await state(page)).objective).toBe(false);await expect.poll(async()=>(await state(page)).holdMs).toBe(0);
    await page.keyboard.down('e');await expect.poll(async()=>(await state(page)).objective).toBe(true);await page.keyboard.up('e');await page.screenshot({path:info.outputPath('power-restored.png')});
    await page.keyboard.down('d');await expect.poll(async()=>(await state(page)).state).toBe('complete');await page.keyboard.up('d');const end=await state(page);
    await writeFile(info.outputPath('measurement.json'),JSON.stringify({build:end.build,source_sha:end.sha,active_seconds:end.activeSeconds,hp:end.hp,fps:end.fps,frames:end.frames,long_frames:end.longFrames,load_ms:end.loadMs},null,2));
    expect(end.eventLog.filter((e:any)=>e.name==='mission_end'&&e.params.attempt_id===end.attemptId)).toHaveLength(1);expect(errors).toEqual([]);
    await page.screenshot({path:info.outputPath('victory.png')});
    await page.getByRole('button',{name:'Пройти ещё раз'}).click();await expect.poll(async()=>(await state(page)).attemptId).not.toBe(end.attemptId);expect((await state(page)).hp).toBe(6);
  });
});

test('actual combat death stops input, emits one result and retry resets the mission',async({page})=>{
  test.setTimeout(35000);await start(page);await roomA(page);await forwardJump(page,194,370);
  await expect.poll(async()=>(await state(page)).state,{timeout:15000}).toBe('dead');
  const dead=await state(page);expect(dead.hp).toBe(0);const end=dead.eventLog.filter((e:any)=>e.name==='mission_end');expect(end).toHaveLength(1);expect(end[0].params.result).toBe('death');expect(end[0].params.reason).toBeTruthy();
  await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');expect((await state(page)).player).toEqual(dead.player);
  await page.getByRole('button',{name:'Повторить',exact:true}).click();await expect.poll(async()=>(await state(page)).attemptId).not.toBe(dead.attemptId);const fresh=await state(page);expect(fresh.hp).toBe(6);expect(fresh.room).toBe('A');expect(fresh.powered).toBe(false);expect(fresh.targetHp).toBe(3);
});
