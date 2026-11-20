import {expect,type Page,type TestInfo} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {state} from './helpers';
import {campaignPressure} from './campaign-pressure';

export type RouteLoss={mission:string;room:string;reason:string;seconds:number};

export async function playSector(page:Page,info:TestInfo,losses:RouteLoss[],play:()=>Promise<void>){
  const retries=info.project.metadata.difficulty ? 2 : 0;
  for(let attempt=0;;attempt++){
    try{await play();return;}catch(error){
      const failed=await state(page);
      if(failed.hp!==0 || !['dying','dead'].includes(failed.state))throw error;
      await expect(page.getByTestId('retry')).toBeVisible();
      const result=await state(page);
      const loss={mission:result.missionId,room:result.room,reason:result.campaign.result.reason,seconds:result.activeSeconds};
      losses.push(loss);
      await writeFile(info.outputPath('losses.json'),JSON.stringify(losses,null,2));
      await writeFile(info.outputPath('attempt-'+losses.length+'.json'),JSON.stringify({loss,pressure:campaignPressure(result.roomStates)},null,2));
      if(attempt>=retries)throw error;
      for(const key of ['a','d','s','Space','j','e'])await page.keyboard.up(key);
      await page.getByTestId('retry').click();
      await page.waitForFunction((mission)=>{const s=(window as any).__CINDER__();return s.state==='playing'&&s.missionId===mission&&s.simMs>0&&s.player?.vy===0;},loss.mission);
    }
  }
}
