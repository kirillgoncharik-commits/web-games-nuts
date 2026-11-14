import {writeFile} from 'node:fs/promises';
import {test,expect,Page} from '@playwright/test';
import {startMission,roomA as currentRoomA,completeFromB} from './helpers';
import {MissionAttempt,SimulationClock} from '../games/cinder-shift/src/mission';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {clearLine} from '../games/cinder-shift/src/geometry';
test.use({video:'off'});
const state=(page:Page)=>page.evaluate(()=>(window as any).__CINDER__());
async function untilX(page:Page,x:number){await page.waitForFunction(x=>(window as any).__CINDER__().player?.x>=x,x,{timeout:8000}).catch(async()=>{throw Error('Movement stopped: '+JSON.stringify(await state(page)));});}
async function start(page:Page){await startMission(page);}
const roomA=currentRoomA;
async function forwardJump(page:Page,from:number,to:number){
  await page.keyboard.down('d');await untilX(page,from);await page.keyboard.down('Space');await untilX(page,to);await page.keyboard.up('Space');await page.keyboard.up('d');
}

test('damage window, room memory, objective and ten fresh attempts',()=>{
  const a=new MissionAttempt('mission');expect(a.damage(0,'test')).toBe(true);expect(a.hp).toBe(5);expect(a.damage(699,'test')).toBe(false);expect(a.damage(700,'test')).toBe(true);
  const b=a.room('B');b.enemies[0].hp=0;a.current='C';a.room().terminal=true;a.objective=true;a.current='B';expect(a.room().enemies[0].hp).toBe(0);a.current='C';expect(a.room().terminal).toBe(true);
  expect(a.finish('victory')).toBe(true);expect(a.finish('death')).toBe(false);
  const ids=new Set<string>();for(let i=0;i<10;i++){const fresh=new MissionAttempt('mission');ids.add(fresh.id);expect(fresh.hp).toBe(6);expect(fresh.room().targetHp).toBe(0);expect(fresh.objective).toBe(false);}expect(ids.size).toBe(10);
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
  test.setTimeout(60000);
  await start(page);
  const pause=page.locator('#hud-pause');
  await pause.click();await page.getByTestId('pause-settings').click();
  const paused=await state(page);
  await page.locator('#touch-mode').focus();await page.keyboard.press('ArrowDown');
  await expect(page.locator('#touch-mode')).toBeFocused();
  expect((await state(page)).player).toEqual(paused.player);
  await page.getByTestId('settings-back').click();await page.getByTestId('resume').click();
  await expect(page.locator('#game')).toBeFocused();
  await pause.focus();
  const y=(await state(page)).player.y;
  await page.keyboard.press('Space');
  await expect(page.getByTestId('resume')).toBeFocused();
  expect((await state(page)).player.y).toBeCloseTo(y,0);
});
test('returning to A preserves target and terminal, and removes old bullets',async({page})=>{
  await start(page);await roomA(page);await page.keyboard.down('a');await page.waitForFunction(()=>(window as any).__CINDER__().transition);await page.keyboard.up('a');await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.room==='A'&&s.state==='playing'&&s.player?.x>500;});const s=await state(page);expect(s.targetHp).toBe(0);expect(s.powered).toBe(true);expect(s.projectiles).toEqual([]);expect(s.hp).toBeGreaterThan(0);expect(s.roomStates.A.enemies.every((e:any)=>e.hp<=0)).toBe(true);
});
test('ten browser restarts keep one scene and full initial state',async({page})=>{
  await start(page);const ids=new Set<string>();
  for(let i=0;i<10;i++){
    await expect.poll(async()=>Boolean((await state(page)).player)).toBe(true);const s=await state(page);ids.add(s.attemptId);expect(s.activeScenes).toEqual(['Room']);expect(s.hp).toBe(6);expect(s.targetHp).toBe(0);
    await page.keyboard.press('Escape');await page.getByTestId('pause-menu').click();await page.getByTestId('continue').click();await page.getByTestId('restart-entry').click();await expect.poll(async()=>(await state(page)).state).toBe('playing');
  }
  expect(ids.size).toBe(10);
  const log=(await state(page)).eventLog;
  for(const id of ids)expect(log.filter((e:any)=>e.name==='mission_end'&&e.params.attempt_id===id)).toHaveLength(1);
});

test.describe('full mission demonstration',()=>{

  test('A to B to C, held terminal, victory and retry',async({page},info)=>{
    test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await start(page);await page.screenshot({path:info.outputPath('airlock-live.png')});await roomA(page);
    await page.screenshot({path:info.outputPath('corridor-live.png')});
    await completeFromB(page,{verifyHold:true});const end=await state(page);
    await writeFile(info.outputPath('measurement.json'),JSON.stringify({build:end.build,source_sha:end.sha,active_seconds:end.activeSeconds,hp:end.hp,fps:end.fps,frames:end.frames,long_frames:end.longFrames,load_ms:end.loadMs},null,2));
    expect(end.eventLog.filter((e:any)=>e.name==='mission_end'&&e.params.attempt_id===end.attemptId)).toHaveLength(1);expect(errors).toEqual([]);
    await page.screenshot({path:info.outputPath('victory.png')});
    await page.getByTestId('retry').click();await expect.poll(async()=>{const s=await state(page);return s.state==='playing'&&Boolean(s.player)&&s.attemptId!==end.attemptId;}).toBe(true);expect((await state(page)).hp).toBe(6);
  });
});

test('actual combat death stops input, emits one result and retry resets the mission',async({page},info)=>{
  test.setTimeout(35000);await start(page);await roomA(page);await forwardJump(page,194,370);
  await page.waitForFunction(()=>(window as any).__CINDER__().enemies.some((e:any)=>e.phase==='telegraph'));await page.screenshot({path:info.outputPath('attack-warning.png')});
  await expect.poll(async()=>(await state(page)).state,{timeout:15000}).toBe('dead');
  const dead=await state(page);expect(dead.hp).toBe(0);const end=dead.eventLog.filter((e:any)=>e.name==='mission_end');expect(end).toHaveLength(1);expect(end[0].params.result).toBe('death');expect(end[0].params.reason).toBeTruthy();
  await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');expect((await state(page)).player).toEqual(dead.player);
  await page.getByTestId('retry').click();await expect.poll(async()=>{const s=await state(page);return s.state==='playing'&&Boolean(s.player)&&s.attemptId!==dead.attemptId;}).toBe(true);const fresh=await state(page);expect(fresh.hp).toBe(6);expect(fresh.room).toBe('A');expect(fresh.powered).toBe(false);expect(fresh.targetHp).toBe(0);
});
