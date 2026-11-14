// Full-campaign trusted-input driver. No fixture imports or simulation writes.
import {expect,type Page} from '@playwright/test';
import {state} from './helpers';
import {ground,to,jump,clear,counterRam,drone,cross,next,until} from './route-helpers';

export async function campaignFoundry(page:Page,route:'service'|'press'='service'){
  await jump(page,148,250);await ground(page,320);await counterRam(page,'m3a-ram');await next(page,'M3E',520);
  await to(page,100);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).powerCircuit).toBe('furnace');
  await jump(page,148,250);await ground(page,320);await counterRam(page,'m3e-ram');
  await to(page,384);await drone(page,'m3e-drone');await cross(page,'m3e-furnace');await next(page,'M3F',560);
  await jump(page,160,270);await ground(page,320);await clear(page,['m3f-security']);await to(page,556);await ground(page,320);
  await page.keyboard.press('e');await page.getByTestId('fork-'+route).click();await next(page,route==='service'?'M3B':'M3C');
  if(route==='service'){
   await jump(page,124,216);await ground(page,320);await clear(page,['m3b-walker']);await jump(page,324,410);await ground(page,320);await drone(page,'m3b-drone');await next(page,'M3G',536);
   // The lower drone is screened by the middle platform from floor fire.
   // Climb the real cover/platform steps, then use the crouched firing line.
   await jump(page,140,190);await ground(page,288);await jump(page,205,306);await ground(page,256);
   await page.keyboard.down('s');await clear(page,['m3g-drone-low']);await page.keyboard.up('s');
   await jump(page,350,446);await ground(page,224);await clear(page,['m3g-drone-high']);await to(page,510);await ground(page,320);await next(page,'M3H',552);
   await jump(page,130,216);await ground(page,320);await clear(page,['m3h-security','m3h-turret']);await page.keyboard.down('s');await to(page,384);await page.keyboard.up('s');await ground(page,320);await next(page,'M3K',520);
  }else{
   await jump(page,114,208);await ground(page,320);await to(page,280);await clear(page,['m3c-ram']);await cross(page,'m3c-press');await cross(page,'m3c-heat');await next(page,'M3I',552);
   // Fire from the actual shelf: standing under its edge forces crouch and blocks jumping.
   await jump(page,130,190);await ground(page,288);await jump(page,215,310);await ground(page,248);
   await page.keyboard.down('s');await clear(page,['m3i-drone']);await page.keyboard.up('s');
   await to(page,380);await ground(page,320);await clear(page,['m3i-security']);await next(page,'M3J',552);
   await jump(page,106,200);await ground(page,320);await cross(page,'m3j-press-a',300);await clear(page,['m3j-ram']);await cross(page,'m3j-press-b',507);await next(page,'M3K',520);
  }
  await to(page,112);await ground(page,320);if((await state(page)).hp<(await state(page)).maxHp){await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();}
  await jump(page,226,332);await ground(page,320);await to(page,556);await page.keyboard.press('e');await next(page,'M3D');
  await jump(page,154,250);await ground(page,320);await counterRam(page,'m3d-ram');await to(page,380);await drone(page,'m3d-drone');await jump(page,490,568);await ground(page,320);
  await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().objective,null,'final terminal');await page.keyboard.up('e');await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().state==='complete',null,'Foundry result');await page.keyboard.up('d');

}

export async function campaignArchive(page:Page){
 const choice:string=(await state(page)).eventPlan.some((e:any)=>e.event_id==='E05')?'scout':'salvage';let beaconEffect:any;
  await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await clear(page,['m4a-walker']);await to(page,510);await page.keyboard.up('s');await next(page,'M4E',552);
  await jump(page,114,172);await ground(page,288);await jump(page,178,292);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m4e-drone']);await page.keyboard.up('s');
  await jump(page,326,432);await ground(page,224);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).archiveCarrierCollected).toBe(true);
  await to(page,510);await ground(page,320);await next(page,'M4B',552);
  await jump(page,114,208);await ground(page,320);
  if(choice==='health'&&(await state(page)).hp===(await state(page)).maxHp){
   // Earlier real damage normally supplies the repair case. If none was taken,
   // walk into the guard's attack radius, without editing HP or the encounter.
   await to(page,320);await ground(page,320);const hp=(await state(page)).hp;
   await until(page,hp=>(window as any).__CINDER__().hp<hp,hp,'guard hit before health choice',10000);
  }
  await page.keyboard.down('s');await clear(page,['m4b-security']);await to(page,476);await page.keyboard.up('s');
  const beforeChoice=await state(page);await page.keyboard.press('e');
  if(choice!=='salvage'){await page.getByTestId('event-'+choice).click();await page.getByTestId('confirm-event').click();}
  await expect.poll(async()=>(await state(page)).roomStates.M4B.cacheUsed).toBe(true);
  const afterChoice=await state(page);beaconEffect={choice,hp_before:beforeChoice.hp,hp_after:afterChoice.hp,score_before:beforeChoice.score,score_after:afterChoice.score};
  expect(afterChoice.scoutedArchive).toBe(choice==='scout');if(choice==='health')expect(afterChoice.hp).toBe(beforeChoice.hp+1);
  await to(page,510);await ground(page,320);await next(page,'M4F',552);
  expect((await state(page)).solids.some((s:any)=>s.id==='archive-scout-screen')).toBe(choice!=='scout');
  await jump(page,114,208);await ground(page,320);
  if(choice!=='scout'){await jump(page,316,400);await ground(page,320);}
  await page.keyboard.down('s');await clear(page,['m4f-security']);await to(page,510);await page.keyboard.up('s');await next(page,'M4G',552);
  await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await clear(page,['m4g-walker']);await to(page,550);await page.keyboard.up('s');
  await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).archiveUploadPowered).toBe(true);await next(page,'M4H');
  await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await clear(page,['m4h-security']);await page.keyboard.up('s');
  await jump(page,212,172);await ground(page,288);await jump(page,178,292);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m4h-drone']);await page.keyboard.up('s');await to(page,510);await ground(page,320);await next(page,'M4C',552);
  await jump(page,226,324);await ground(page,320);await to(page,550);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().dataUploaded,null,'data upload');await page.keyboard.up('e');
  await to(page,512);await ground(page,320);
  if((await state(page)).hp<(await state(page)).maxHp){await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();}
  await next(page,'M4I');
  await jump(page,106,200);await ground(page,320);await counterRam(page,'m4i-ram');await next(page,'M4D',552);
  await jump(page,130,224);await ground(page,320);await page.keyboard.down('s');await clear(page,['m4d-walker']);await page.keyboard.up('s');
  await jump(page,224,184);await ground(page,288);await jump(page,194,300);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m4d-drone']);await page.keyboard.up('s');
  await jump(page,330,450);await ground(page,320);await jump(page,522,600);await ground(page,320);
  await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().powered,null,'Archive exit confirmation');await page.keyboard.up('e');
  await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().state==='complete',null,'Archive result');await page.keyboard.up('d');

}

export async function campaignReactor(page:Page){
 const circuit:string='isolation',acceptE06=(await state(page)).eventPlan.some((e:any)=>e.event_id==='E06');
  await jump(page,130,224);await ground(page,320);await clear(page,['m5a-security']);await page.keyboard.down('s');await to(page,338);await page.keyboard.up('s');await jump(page,338,404);await ground(page,320);await clear(page,['m5a-turret']);
  await jump(page,426,500);await ground(page,272);await to(page,580);await ground(page,320);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().roomStates.M5A.terminal,null,'outer power');await page.keyboard.up('e');await next(page,'M5F');
  await jump(page,130,188);await ground(page,288);await jump(page,204,306);await ground(page,256);await page.keyboard.down('s');await clear(page,['m5f-drone']);await page.keyboard.up('s');await to(page,400);await ground(page,320);await page.keyboard.down('s');await clear(page,['m5f-security']);await page.keyboard.up('s');await next(page,'M5B',552);
  await jump(page,122,180);await ground(page,288);await jump(page,204,280);await ground(page,272);await clear(page,['m5b-drone']);
  await until(page,()=>{const s=(window as any).__CINDER__(),t=s.simMs%9000;return t>=6000&&t<6800;},null,'transit heat window',12000);await jump(page,308,400);await ground(page,320);await jump(page,386,484);await ground(page,320);await to(page,520);
  if(acceptE06){await page.keyboard.press('e');await page.getByTestId('event-challenge').click();await page.getByTestId('confirm-event').click();await to(page,472);await ground(page,320);await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().player.facing===1,null,'face optional patrol');await page.keyboard.up('d');await clear(page,['m5b-e06-ram']);}
  await next(page,'M5G');
  await jump(page,114,208);await ground(page,320);await page.keyboard.down('s');await clear(page,['m5g-security']);await page.keyboard.up('s');await to(page,212);await jump(page,212,172);await ground(page,288);await jump(page,178,292);await ground(page,256);await jump(page,326,432);await ground(page,224);await clear(page,['m5g-drone']);await to(page,510);await ground(page,320);await next(page,'M5H',552);
  await to(page,112);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).reactorCircuit).toBe('cooling');if(circuit==='isolation'){await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).reactorCircuit).toBe('isolation');}await jump(page,242,336);await ground(page,320);await next(page,'M5I');
  await jump(page,106,200);await ground(page,320);await to(page,244);await counterRam(page,'m5i-ram');if(circuit==='cooling'){await page.keyboard.down('s');await clear(page,['m5i-turret']);await page.keyboard.up('s');await to(page,526);}else await cross(page,'m5i-heat',526);
  await next(page,'M5C',552);await to(page,120);await ground(page,320);const before=(await state(page)).hp;
  if(before<(await state(page)).maxHp){await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();expect((await state(page)).hp).toBe(Math.min(before+2,(await state(page)).maxHp));}

 await jump(page,178,272);await ground(page,320);await jump(page,370,474);await ground(page,320);await to(page,568);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().powered,null,'preboss terminal');await page.keyboard.up('e');await next(page,'M5D');
}

export async function campaignRegulator(page:Page){
 const phases=new Set<string>(),windows=new Set<string>(),build:{active:string|null}={active:null};let lastWarning='',firing=false,climbed=false;
 async function fire(on:boolean){if(on&&!firing&&(await state(page)).player.facing<0){await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().player.facing===1,null,'face the core');await page.keyboard.up('d');}if(on!==firing){await page.keyboard[on?'down':'up']('j');firing=on;}}
 async function climb(){await jump(page,106,180);await ground(page,288);await jump(page,176,272);await ground(page,256);climbed=true;}

 await climb();
  for(let i=0;i<2200;i++){
   const s=await state(page),p=s.boss.pattern;phases.add(p.stage);if(s.hp<=0||s.state!=='playing')throw Error('Boss run ended before shutdown');if(s.bossHp<=0)break;
   if(p.stage==='lanes'){
    if(p.phase==='warning'&&p.warningId!==lastWarning){await fire(false);lastWarning=p.warningId;await to(page,s.boss.aimX<272?307:237);await ground(page,256);}
    if(p.phase==='core'){windows.add(p.stage+':'+p.cycle);await fire(true);if(build.active==='W4')await page.keyboard.press('k');}else await fire(false);
   }else if(p.stage==='transition'||p.stage==='sweep'){
    if(p.stage==='transition'||p.phase==='warning'){
     await fire(false);if(s.player.x>110){if(s.player.x>200){await to(page,200);await ground(page,320);}await jump(page,(await state(page)).player.x,100);await ground(page,320);}climbed=false;
    }else if(p.phase==='active'){
     await fire(false);if(!climbed&&p.rects[0].x>330)await climb();
    }else if(p.phase==='core'){
     if(!climbed)await climb();windows.add(p.stage+':'+p.cycle);await fire(true);if(build.active==='W4')await page.keyboard.press('k');
    }else await fire(false);
   }
   await page.waitForTimeout(45);
  }
  await fire(false);const down=await state(page);expect(down.bossHp).toBe(0);expect(phases.has('lanes')&&phases.has('transition')&&phases.has('sweep')).toBe(true);expect(windows.size).toBeGreaterThanOrEqual(4);expect(down.eventLog.filter((e:any)=>e.name==='boss_defeated')).toHaveLength(1);await next(page,'M5E');
  await jump(page,194,300);await ground(page,320);await jump(page,354,474);await ground(page,320);await to(page,568);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().powered,null,'evacuation terminal');await page.keyboard.up('e');await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().state==='complete',null,'campaign result');await page.keyboard.up('d');

 return{phases:[...phases],windows:[...windows]};
}
