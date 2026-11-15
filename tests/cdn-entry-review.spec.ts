import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
test('RW2 public CDN cold and warm entry',async({browser},info)=>{
 test.setTimeout(120000);const report:any[]=[];
 for(const [variant,origin,source] of [['production-B6','https://nuts.bid','a390b80e4488e0cde4596ba64631098c030843d4'],['candidate-C2','https://codex-cinder-shift-rw2-a1-pr.nuts-games.pages.dev','77a44fec74af3a00a0fc9e3a78b0ff2ae016759f']]){
  const context=await browser.newContext({viewport:{width:1280,height:844},locale:'ru-RU'}),page=await context.newPage();
  try{
   for(const cache of ['fresh-context','same-context-reload']){
    const responses:any[]=[];const listener=async(response:any)=>{if(response.url().includes('/assets/')){const headers=await response.allHeaders();responses.push({url:response.url(),status:response.status(),cacheControl:headers['cache-control'],cfCacheStatus:headers['cf-cache-status']});}};page.on('response',listener);
    const started=Date.now();if(cache==='fresh-context')await page.goto(origin+'/games/cinder-shift/',{waitUntil:'domcontentloaded'});else await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.getByTestId('new-shift')).toBeVisible();await expect.poll(()=>page.evaluate(()=>(window as any).__CINDER__().timeToMenuMs)).not.toBeNull();
    const snapshot=await page.evaluate(()=>(window as any).__CINDER__());expect(snapshot.sha).toBe(source);
    const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter((r:any)=>r.name.includes('/assets/')).map((r:any)=>({url:r.name,duration:r.duration,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize})));
    const row={variant,origin,cache,source:snapshot.sha,build:snapshot.build,wallToMenuMs:Date.now()-started,technicalLoadMs:snapshot.technicalLoadMs,timeToMenuMs:snapshot.timeToMenuMs,introVisibleMs:snapshot.introVisibleMs,resources,responses};report.push(row);console.log('CINDER_RW2_CDN '+JSON.stringify(row));page.off('response',listener);
   }
  }finally{await context.close();}
 }
 await writeFile(info.outputPath('public-cdn-entry.json'),JSON.stringify({conditions:'one Ubuntu runner; fresh browser context then ordinary same-context reload per origin; origins differ; no network or CPU throttling',report},null,2));
});
