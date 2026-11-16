import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';

const checkout=process.env.CINDER_MENU_BASELINE_CHECKOUT;
if(!checkout)throw Error('CINDER_MENU_BASELINE_CHECKOUT is required');
const output=resolve('test-results/menu-before');await mkdir(output,{recursive:true});
const manifest=JSON.parse(await readFile(resolve(checkout,'dist/cinder-shift/build-manifest.json'),'utf8'));
if(manifest.source_sha!=='469f9483925fd3126fedd4d905c1754e3e3bcf17'||manifest.source_dirty)throw Error('Unexpected menu baseline');
const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:checkout,env:{...process.env,PORT:'4176',CINDER_QA_MUTE:'1'},stdio:'inherit'});
let browser;
try{
 for(let n=0;;n++){
  if(await fetch('http://127.0.0.1:4176/games/cinder-shift/').then(r=>r.ok).catch(()=>false))break;
  if(n>=100)throw Error('Baseline server did not start');await new Promise(r=>setTimeout(r,100));
 }
 browser=await chromium.launch({headless:true});
 const captures=[];
 for(const size of [{width:1440,height:900},{width:390,height:844},{width:667,height:300}])for(const locale of ['ru','en']){
  const context=await browser.newContext({viewport:size,locale:'ru-RU'}),page=await context.newPage();
  await page.goto('http://127.0.0.1:4176/games/cinder-shift/');await page.getByTestId('menu-settings').click();await page.getByTestId('locale').selectOption(locale);await page.getByTestId('settings-back').click();
  await page.getByTestId('new-shift').waitFor();await page.evaluate(()=>document.fonts.ready);
  const file=`menu-before-${size.width}x${size.height}-${locale}.png`;await page.screenshot({path:resolve(output,file)});captures.push({size,locale,file});await context.close();
 }
 await writeFile(resolve(output,'baseline.json'),JSON.stringify({manifest,captures,note:'Actual alpha.3 source built separately; these are before images, not reconstructed CSS.'},null,2));
}finally{await browser?.close();server.kill('SIGTERM');}
