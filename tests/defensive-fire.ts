import {expect,type Page} from '@playwright/test';

// Holds position and uses the normal jump control to evade approaching enemy shots.
export async function fireFromCover(page:Page, targets:readonly string[]) {
  const start=await page.evaluate(()=>(window as any).__CINDER__());
  const crouched=start.player.crouching,feet=start.player.y+22;
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
      // The lidar turret fixes its aim 300 ms before the burst. Jump while
      // tracking is still active so its fan passes above the landing point.
      const drawAimHigh=state.enemies.some((enemy:{mob?:string;phase:string;remaining:number;aimLocked:boolean})=>
        enemy.mob==='lidar-guardian' && enemy.phase==='telegraph' && !enemy.aimLocked &&
        enemy.remaining>350 && enemy.remaining<660);
      const shouldJump=drawAimHigh || dangerous.some((shot:{x:number;vx:number})=>(state.player.x-shot.x)/shot.vx<0.31);
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
