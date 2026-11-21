import {expect,type Page} from '@playwright/test';

// Holds position and uses the normal jump control to evade approaching enemy shots.
export async function fireFromCover(page:Page, targets:readonly string[],stance?:'crouch') {
  if(stance==='crouch')await page.waitForFunction(()=>(window as any).__CINDER__().player.crouching);
  const start=await page.evaluate(()=>(window as any).__CINDER__());
  const crouched=start.player.crouching,feet=start.player.y+22;
  const turretLane=start.enemies.some((enemy:{id:string;kind:string;mob?:string})=>
    targets.includes(enemy.id)&&enemy.kind==='turret'&&!enemy.mob);
  // Give the radio commander's volleys enough lead to clear the cabinet slot.
  const jumpLead=turretLane?0.46:start.room==='YU05-D'?0.43:0.31;
  let jumping=false;
  await page.keyboard.down('j');
  try {
    const deadline=Date.now()+25000;
    while(Date.now()<deadline){
      const state=await page.evaluate(()=>(window as any).__CINDER__());
      expect(state.hp,'combat in '+state.room).toBeGreaterThan(0);
      if(jumping && state.player.vy>=0){
        await page.keyboard.up('Space');
        if(crouched)await page.keyboard.down('s');
        jumping=false;
      }
      const dangerous=state.projectiles.filter((shot:{team:string;x:number;y:number;vx:number;vy:number})=>{
        const seconds=(state.player.x-shot.x)/shot.vx;
        const y=shot.y+shot.vy*seconds;
        const top=feet-(crouched?26:44)-3;
        return shot.team==='enemy' && seconds>0 && seconds<3 && y>=top && y<=feet+3;
      });
      // A shot that currently passes over a crouched player can still hit
      // when the next movement releases crouch. Let the entire volley pass.
      const incoming=state.projectiles.some((shot:{team:string;x:number;vx:number})=>
        shot.team==='enemy' && (state.player.x-shot.x)*Math.sign(shot.vx)>=-16);
      if(!incoming && state.player.vy===0 && targets.every(id=>state.enemies.find((enemy:{id:string})=>enemy.id===id)?.hp<=0))return;
      // Draw the fan above the landing point before the turret finishes aiming.
      const drawAimHigh=state.enemies.some((enemy:{kind:string;mob?:string;guardian?:string;phase:string;remaining:number;aimLocked:boolean})=>{
        if(enemy.phase!=='telegraph'||enemy.aimLocked)return false;
        if(enemy.guardian==='beacon-warden'&&start.campaign.difficulty!=='easy')return enemy.remaining>210&&enemy.remaining<410;
        const drawTrackedAim=start.room==='YU03-C'||
          (start.room==='YU05-A'&&start.campaign.difficulty!=='easy')||
          (start.room==='YU05-B'&&start.campaign.difficulty==='nightmare')||
          (start.room==='YU04-C'&&start.campaign.difficulty==='nightmare')||
          (start.room==='YU03-D'&&start.campaign.difficulty!=='easy');
        const trackedVolley=drawTrackedAim&&(enemy.mob==='signal-watcher'||enemy.mob==='relay-crawler'||enemy.mob==='induction-orb');
        const warehouseVolley=start.room==='YU02-A'&&start.campaign.difficulty==='nightmare'&&
          (enemy.mob==='relay-crawler'||enemy.mob==='induction-orb');
        if(trackedVolley||warehouseVolley)return enemy.remaining>520&&enemy.remaining<800;
        if(enemy.kind!=='turret')return false;
        if(enemy.mob==='lidar-guardian')return enemy.remaining>350 && enemy.remaining<660;
        return !enemy.mob && enemy.remaining>140 && enemy.remaining<380;
      });
      const shouldJump=drawAimHigh || dangerous.some((shot:{x:number;vx:number})=>(state.player.x-shot.x)/shot.vx<jumpLead);
      if(shouldJump && !jumping && state.player.vy===0){
        await page.keyboard.up('s');
        await page.keyboard.down('Space');
        // Releasing during ascent cuts the jump and lands inside the same burst.
        jumping=true;
      }
      await page.waitForTimeout(35);
    }
    throw Error('No safe clear in '+start.room+' for '+targets.join(', '));
  } finally {
    await page.keyboard.up('Space');
    await page.keyboard.up('j');
    if(crouched)await page.keyboard.down('s');
  }
}
