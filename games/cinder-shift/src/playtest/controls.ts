import {playtestVariant} from './profile';
import {buildMetadata} from '../build';

export function mountPlaytestControls(snapshot:()=>unknown,reset:()=>Promise<void>){
 const bar=document.createElement('nav');bar.id='playtest-controls';bar.setAttribute('aria-label','C01 A/B');
 const root=location.pathname.replace(/\/[ab]\/games\/cinder-shift\/?$/,'/');
 bar.innerHTML=`<strong><span data-i18n="playtest.title">C01 PLAYTEST</span> ${playtestVariant}</strong><a href="${root}a/games/cinder-shift/?seed=4">A</a><a href="${root}b/games/cinder-shift/?seed=4">B</a><button type="button" id="playtest-reset" data-i18n="playtest.reset">Fresh profile</button><button type="button" id="playtest-export" data-i18n="playtest.export">Export observations</button>`;
 document.querySelector('.toolbar')!.after(bar);
 document.getElementById('playtest-reset')!.addEventListener('click',async event=>{
  const button=event.currentTarget as HTMLButtonElement;button.disabled=true;
  try{await reset();location.href=location.pathname+'?seed=4';}catch(error){button.disabled=false;button.textContent=String(error);}
 });
 document.getElementById('playtest-export')!.addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({experiment:'c01-gate-v1',variant:playtestVariant,build:buildMetadata,recorded_at:new Date().toISOString(),conditions:{viewport:{width:innerWidth,height:innerHeight},pixel_ratio:devicePixelRatio},observation:snapshot()},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`cinder-c01-${playtestVariant}-${Date.now()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
}
