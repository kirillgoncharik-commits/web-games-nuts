import {expect} from '@playwright/test';
import {state} from './helpers';

export async function encounter(page:import('@playwright/test').Page,input:{mission:'foundry'|'reactor'|'archive'|'cargo';room:string;seed?:number;hp?:number;active?:'M1'|'W4'|null;reactorCircuit?:'cooling'|'isolation';archiveState?:{carrier?:boolean;power?:boolean;uploaded?:boolean};cargoCircuit?:'conveyor'|'security';cleared?:boolean;debug?:boolean;reduced?:boolean;nodes?:string[]}){
 await page.addInitScript(()=>{
  const errors:string[]=(window as any).__AUDIO_PROBE__=[],Base=window.AudioContext as any;
  (window as any).AudioContext=class extends Base{
   constructor(...args:any[]){try{super(...args);errors.push('created:'+this.state);this.addEventListener('statechange',()=>errors.push('state:'+this.state));}catch(error){errors.push('context:'+String(error));throw error;}}
   resume(){errors.push('resume:'+this.state+':active='+navigator.userActivation?.isActive);return super.resume().catch((error:unknown)=>{errors.push('resume:'+String(error));throw error;});}
   decodeAudioData(bytes:ArrayBuffer){return super.decodeAudioData(bytes).catch((error:unknown)=>{errors.push('decode:'+String(error));throw error;});}
  };
 });
 await page.goto('/__encounter__/');await expect(page.getByTestId('new-shift')).toBeVisible();
 // Fixtures bypass normal mission buttons; retain the real gesture/decode contract.
 await page.getByTestId('menu-settings').click();
 await expect.poll(async()=>(await state(page)).audioStatus.ready).toBe(true);
 await expect.poll(async()=>(await state(page)).audio).toBe('running');
 await page.getByTestId('settings-back').click();
 await page.evaluate(input=>(window as any).__ENCOUNTER__.start(input),input);
 await expect.poll(async()=>(await state(page)).room).toBe(input.room);
 await page.waitForFunction(()=>{const s=(window as any).__CINDER__();return s.state==='playing'&&s.simMs>0&&s.player?.vy===0;});
}
