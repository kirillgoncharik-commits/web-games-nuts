import {expect,type Page} from '@playwright/test';

// Holds position and uses the normal jump control to evade approaching enemy shots.
export async function fireFromCover(page:Page, targets:readonly string[]) {
  const start=await page.evaluate(()=>(window as any).__CINDER__());
  const crouched=start.player.crouching,feet=start.player.y+22;
  await page.keyboard.down('j');
  try {
    const deadline=Date.now()+25000;
    while(Date.now()<deadline){
      const state=await page.evaluate(()=>(window as any).__CINDER__());
      expect(state.hp,'combat in '+state.room).toBeGreaterThan(0);
      const dangerous=state.projectiles.filter((shot:{team:string;x:number;y:number;vx:number;vy:number})=>{
        const seconds=(state.player.x-shot.x)/shot.vx;
        const y=shot.y+shot.vy*seconds;
        return shot.team==='enemy' && seconds>0 && seconds<3 && y>=feet-44 && y<=feet+3;
      });
      if(!dangerous.length && targets.every(id=>state.enemies.find((enemy:{id:string})=>enemy.id===id)?.hp<=0))return;
      const shouldJump=dangerous.some((shot:{x:number;vx:number})=>(state.player.x-shot.x)/shot.vx<0.40);
      if(shouldJump && state.player.vy===0){
        await page.keyboard.up('s');
        await page.keyboard.down('Space');
        await page.waitForTimeout(65);
        await page.keyboard.up('Space');
        if(crouched)await page.keyboard.down('s');
      }else{
        await page.waitForTimeout(50);
      }
    }
    throw Error('No safe clear in '+start.room+' for '+targets.join(', '));
  } finally {
    await page.keyboard.up('j');
    if(crouched)await page.keyboard.down('s');
  }
}
