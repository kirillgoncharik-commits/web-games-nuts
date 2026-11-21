// Full-campaign trusted-input driver. No fixture imports or simulation writes.
import {expect,type Page} from '@playwright/test';
import {fireFromCover} from './defensive-fire';
import {state} from './helpers';
import {alignOnLedge,ground,to,jump,clear,counterRam,drone,cross,next,until,standingJump} from './route-helpers';

export async function clearFoundryGuard(page:Page){
 await page.keyboard.down('j');
 await jump(page,160,248);await page.keyboard.down('s');await ground(page,320);
 try {await fireFromCover(page,['m3f-security'],'crouch');}
 finally {await page.keyboard.up('s');}
}

export async function clearFoundryServiceRoom(page:Page){
 await page.keyboard.down('j');
 await jump(page,124,180);await ground(page,288);
 await standingJump(page,264);await ground(page,256);
 await page.keyboard.down('s');await clear(page,['m3b-drone']);
 // Keep crouch through the descent. The service walker's horizontal shot
 // passes above the crouched suit but can hit during a standing landing.
 await to(page,220);await ground(page,320);
 await to(page,231);await ground(page,320);
 await fireFromCover(page,['m3b-walker'],'crouch');await page.keyboard.up('s');
 await jump(page,324,401);await ground(page,320);
}

export async function crossFoundryDroneRoom(page:Page){
 // Shoot over the left edge of the gantry from the gap after the entry crate.
 await page.keyboard.down('j');await jump(page,140,228);await ground(page,320);
 await to(page,245);await ground(page,320);
 if((await state(page)).campaign.difficulty==='nightmare'){
  // The middle platform screens muzzle heights 254.5..273.5. The stock
  // cutter can hit the moving drone through the open lane on either side.
  for(let volley=0;volley<8;volley++){
   const current=await state(page),enemy=current.enemies.find((e:any)=>e.id==='m3g-drone-low');
   if(enemy.hp<=0)break;
   const y=enemy.y>264?Math.max(277,enemy.y):Math.min(252,enemy.y);
   await page.keyboard.up('j');await page.keyboard.down('Space');
   try{
    await until(page,y=>{const s=(window as any).__CINDER__();return s.hp<=0||s.player.y+22-28<=y+4;},y,'upper or lower firing slit');
    await page.keyboard.down('j');
    await until(page,()=>{const s=(window as any).__CINDER__();return s.hp<=0||s.player.vy>=0;},null,'patrol jump apex');
    await page.keyboard.up('j');
    await until(page,y=>{const s=(window as any).__CINDER__();return s.hp<=0||s.player.y+22-28>=y-3;},y,'descending firing slit');
    await page.keyboard.down('j');await ground(page,320);
   }finally{await page.keyboard.up('j');await page.keyboard.up('Space');}
   expect((await state(page)).hp,'low patrol in M3G').toBeGreaterThan(0);
  }
  expect((await state(page)).enemies.find((e:any)=>e.id==='m3g-drone-low').hp).toBeLessThanOrEqual(0);
 }else{
  await drone(page,'m3g-drone-low');
 }
 for(let approach=0;approach<2;approach++){
  await to(page,232);await ground(page,320);
  await standingJump(page,191);await ground(page,288);
  await to(page,approach===0?205:198);await ground(page);
  if((await state(page)).player.y+22>290)continue;
  await standingJump(page,303);await ground(page);
  if(Math.abs((await state(page)).player.y+22-256)<2)break;
 }
 await ground(page,256);
 await page.keyboard.down('j');await to(page,345);await ground(page,256);
 await standingJump(page,426);await ground(page,224);
 await fireFromCover(page,['m3g-drone-high']);await to(page,510);await ground(page,320);await next(page,'M3H',552);
}

export async function clearFoundryGate(page:Page){
 await page.keyboard.down('j');await jump(page,130,182);await ground(page,288);
 await page.keyboard.down('s');
 // Let both low shots strike the face of the crate before stepping off.
 await page.waitForFunction(()=>{
  const s=(window as any).__CINDER__(),guard=s.enemies.find((e:any)=>e.id==='m3h-security');
  return s.hp<=0||guard?.phase==='recovery'&&!s.projectiles.some((p:any)=>p.source==='walker-shot'&&p.vx<0&&p.x>s.player.x);
 });
 await to(page,224);await ground(page,320);
 try {await fireFromCover(page,['m3h-security','m3h-turret'],'crouch');}
 finally {await page.keyboard.up('s');}
}

export async function clearFoundryFurnace(page:Page){
  await jump(page,148,250);await ground(page,320);await counterRam(page,'m3e-ram');
  await to(page,384);await drone(page,'m3e-drone');await cross(page,'m3e-furnace');await next(page,'M3F',560);
}

export async function campaignFoundry(page:Page,route:'service'|'press'='service'){
  // Land beyond the crate but outside the ram's charge lane.
  await jump(page,148,237);await ground(page,320);await counterRam(page,'m3a-ram');await next(page,'M3E',520);
  await page.keyboard.down('s');
  await to(page,112);
  await page.keyboard.up('s');
  await ground(page,320);
  await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).powerCircuit).toBe('furnace');
  await clearFoundryFurnace(page);
  await clearFoundryGuard(page);await to(page,556);await ground(page,320);
  await page.keyboard.press('e');await page.getByTestId('fork-'+route).click();await next(page,route==='service'?'M3B':'M3C');
  if(route==='service'){
   await clearFoundryServiceRoom(page);await next(page,'M3G',536);
   await crossFoundryDroneRoom(page);
   await clearFoundryGate(page);await page.keyboard.down('s');await to(page,384);await page.keyboard.up('s');await ground(page,320);await next(page,'M3K',520);
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
  await jump(page,154,250);await ground(page,320);await counterRam(page,'m3d-ram');
  // Return to the first crate, then shoot across the bay from the high shelf.
  await ground(page,320);await standingJump(page,203);await ground(page,288);await jump(page,218,312);await ground(page,256);
  await page.keyboard.down('s');await clear(page,['m3d-drone']);await page.keyboard.up('s');
  await jump(page,490,568);await ground(page,320);
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

export async function clearReactorPatrol(page:Page){
 // A full jump from the entry crate puts a stock shot above both gantries.
 await jump(page,116,165);await ground(page,288);await drone(page,'m5g-drone',288);
 await page.keyboard.down('j');await page.keyboard.down('s');await to(page,214);await ground(page,320);
 await fireFromCover(page,['m5g-security'],'crouch');await page.keyboard.up('s');
 await next(page,'M5H',552);
}

export async function clearReactorEntrance(page:Page){
  await page.keyboard.down('j');await jump(page,130,224);await page.keyboard.down('s');await ground(page,320);
  await fireFromCover(page,['m5a-security'],'crouch');await to(page,338);await page.keyboard.up('s');
  if((await state(page)).campaign.difficulty==='nightmare'){
    await page.keyboard.down('j');await jump(page,338,396);await page.keyboard.down('s');await ground(page,320);
    try{await fireFromCover(page,['m5a-turret'],'crouch');}finally{await page.keyboard.up('s');}
  }else{
    await jump(page,338,404);await ground(page,320);await clear(page,['m5a-turret']);
  }
  await jump(page,426,500);await ground(page,272);await to(page,580);await ground(page,320);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().roomStates.M5A.terminal,null,'outer power');await page.keyboard.up('e');await next(page,'M5F');
}

export async function crossReactorHeatRoom(page:Page){
  // The left gap is outside the heat strip. Shoot the overhead drone from
  // the entrance, then crouch in the gap to counter the security walker's fire.
  await drone(page,'m5f-drone');await fireFromCover(page,[]);
  await page.keyboard.down('j');await jump(page,138,219);
  await page.keyboard.down('s');await ground(page,320);
  await fireFromCover(page,['m5f-security'],'crouch');await page.keyboard.up('s');
  await cross(page,'m5f-heat');await next(page,'M5B',552);
}

export async function crossReactorTransit(page:Page,acceptE06:boolean){
  await drone(page,'m5b-drone');await fireFromCover(page,[]);
  await jump(page,122,180);await ground(page,288);await jump(page,204,280);await ground(page,272);
  await until(page,()=>{const s=(window as any).__CINDER__(),t=s.simMs%9000;return t>=6000&&t<6800;},null,'transit heat window',12000);await jump(page,308,400);await ground(page,320);await jump(page,386,484);await ground(page,320);await to(page,503);await ground(page,320);
  if(acceptE06){await page.keyboard.press('e');await page.getByTestId('event-challenge').click();await page.getByTestId('confirm-event').focus();await page.keyboard.press('Enter');
    await Promise.all([page.keyboard.down('Space'),page.keyboard.down('a')]);
    try{await until(page,()=>{const s=(window as any).__CINDER__();return s.hp<=0||s.player.x<=463;},null,'back away from the optional charge');}finally{await page.keyboard.up('a');await page.keyboard.up('Space');}
    await ground(page);await page.keyboard.down('s');
    // The retreat jump may land on the lip of the previous crate. Step into
    // the ground firing lane while remaining outside the ram's 500px limit.
    if((await state(page)).player.y+22<319)await to(page,466);
    await ground(page,320);
    await page.keyboard.down('j');
    await page.keyboard.press('d',{delay:45});await ground(page,320);
    const firing=await state(page);
    expect(firing.player.facing,'face the E06 patrol').toBe(1);
    expect(firing.player.x+11,'remain outside the charge').toBeLessThan(500);
    await clear(page,['m5b-e06-ram']);await page.keyboard.up('s');}
  await next(page,'M5G');
}

export async function campaignReactor(page:Page){
 const circuit:string='isolation',acceptE06=(await state(page)).eventPlan.some((e:any)=>e.event_id==='E06');
  await clearReactorEntrance(page);
  await crossReactorHeatRoom(page);
  await crossReactorTransit(page,acceptE06);
  await clearReactorPatrol(page);
  await to(page,112);await ground(page,320);await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).reactorCircuit).toBe('cooling');if(circuit==='isolation'){await page.keyboard.press('e');await expect.poll(async()=>(await state(page)).reactorCircuit).toBe('isolation');}await jump(page,242,336);await ground(page,320);await next(page,'M5I');
  await jump(page,106,200);await ground(page,320);await to(page,244);await counterRam(page,'m5i-ram');if(circuit==='cooling'){await page.keyboard.down('s');await clear(page,['m5i-turret']);await page.keyboard.up('s');await to(page,526);}else await cross(page,'m5i-heat',526);
  await next(page,'M5C',552);await to(page,120);await ground(page,320);const before=(await state(page)).hp;
  if(before<(await state(page)).maxHp){await page.keyboard.press('e');await page.getByTestId('event-repair').click();await page.getByTestId('confirm-event').click();expect((await state(page)).hp).toBe(Math.min(before+2,(await state(page)).maxHp));}

 await jump(page,178,272);await ground(page,320);await jump(page,370,474);await ground(page,320);await to(page,568);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().powered,null,'preboss terminal');await page.keyboard.up('e');await next(page,'M5D');
}

// Recover after a knockback to either side of the firing shelf.
export async function leaveRegulatorShelf(page:Page){
 await ground(page);
 let p=(await state(page)).player;
 if(p.x>=314&&p.y+22>258){
  if(p.x>390){await to(page,384);await ground(page);}
  p=(await state(page)).player;
  if(Math.abs(p.y+22-288)>2){await standingJump(page,326);await ground(page,288);}
  else if(p.x>334){await to(page,326);await ground(page,288);}
  await standingJump(page,290);await ground(page,256);
 }
 p=(await state(page)).player;
 if((await state(page)).campaign.difficulty==='nightmare'&&Math.abs(p.y+22-256)<2){
  // Cross the gap from the firing shelf onto the entry crate before the sweep.
  await to(page,244);await ground(page,256);await standingJump(page,155);await ground(page,288);
  await to(page,98);await ground(page,320);return;
 }
 if(p.x>200){await to(page,200);await ground(page);}
 p=(await state(page)).player;
 if(p.x>110){
  if(p.y+22>300&&p.x>=185)await standingJump(page,100);
  else await to(page,100);
  await ground(page,320);
 }
}

export async function campaignRegulator(page:Page,onRoom?:()=>Promise<void>){
 const entry=await state(page),precise=entry.campaign.difficulty==='nightmare';
 const phases=new Set<string>(),windows=new Set<string>(),build=entry.loadout;let lastWarning='',firing=false,climbed=false;
 async function fire(on:boolean){if(on&&!firing&&(await state(page)).player.facing<0){await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().player.facing===1,null,'face the core');await page.keyboard.up('d');}if(on!==firing){await page.keyboard[on?'down':'up']('j');firing=on;}}
 async function climb(){
  if((await state(page)).player.x>112)await leaveRegulatorShelf(page);
  await jump(page,106,157);await ground(page,288);
  if(precise){
   await alignOnLedge(page,172,288);
   await ground(page,288);await standingJump(page,249);
  }else await jump(page,173,267);
  await ground(page,256);climbed=true;
 }

 // The first pair of strikes tracks the player before the shelf is reachable.
 // Wait beyond the left edge of both marked lanes, then climb in the core window.
 if(precise&&entry.boss.pattern.stage==='lanes'){
  await to(page,34);await ground(page,320);
  await until(page,()=>{const s=(window as any).__CINDER__();return s.hp<=0||s.boss.pattern.phase==='core';},null,'first safe climb to the core',12000);
 }
 await climb();
  for(let i=0;i<2200;i++){
   const s=await state(page),p=s.boss.pattern;phases.add(p.stage);if(s.hp<=0||s.state!=='playing')throw Error('Boss run ended before shutdown');if(s.bossHp<=0)break;
   if(p.stage==='lanes'){
    // A real hit can knock Mira off the firing shelf. Recover with ordinary
    // movement instead of waiting forever at a height she no longer occupies.
    if(s.player.y+22>270){await fire(false);await leaveRegulatorShelf(page);await climb();lastWarning='';continue;}
    if(p.phase==='warning'&&p.warningId!==lastWarning){await fire(false);lastWarning=p.warningId;const aim=s.boss.aimX;
     if(!precise){await to(page,aim<272?307:237);await ground(page);}
     else if(Math.abs(s.player.x-aim)<39){
      const target=aim<=272?Math.max(300,aim+37):Math.min(245,aim-37);
      await page.keyboard.down('s');await to(page,target);await page.keyboard.up('s');
      await ground(page);
     }}
    if(p.phase==='core'){windows.add(p.stage+':'+p.cycle);await fire(true);if(build.active==='W4')await page.keyboard.press('k');}else await fire(false);
   }else if(p.stage==='transition'||p.stage==='sweep'){
    if(p.stage==='transition'||p.phase==='warning'){
     await fire(false);await leaveRegulatorShelf(page);climbed=false;
    }else if(p.phase==='active'){
     await fire(false);if(!climbed&&p.rects[0].x>330)await climb();
    }else if(p.phase==='core'){
     if(!climbed)await climb();windows.add(p.stage+':'+p.cycle);await fire(true);if(build.active==='W4')await page.keyboard.press('k');
    }else await fire(false);
   }
   await page.waitForTimeout(45);
  }
  await fire(false);const down=await state(page);expect(down.bossHp).toBe(0);expect(phases.has('lanes')&&phases.has('transition')&&phases.has('sweep')).toBe(true);expect(windows.size).toBeGreaterThanOrEqual(4);expect(down.eventLog.filter((e:any)=>e.name==='boss_defeated')).toHaveLength(1);await next(page,'M5E');if(onRoom)await onRoom();
  await jump(page,194,300);await ground(page,320);await jump(page,354,474);await ground(page,320);await to(page,568);await page.keyboard.down('e');await until(page,()=>(window as any).__CINDER__().powered,null,'evacuation terminal');await page.keyboard.up('e');await page.keyboard.down('d');await until(page,()=>(window as any).__CINDER__().state==='complete',null,'campaign result');await page.keyboard.up('d');

 return{phases:[...phases],windows:[...windows]};
}
