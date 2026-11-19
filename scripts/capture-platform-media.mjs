import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdir,writeFile,readFile,copyFile,stat} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const game=resolve(process.argv[2]||'capture-game');
const out=resolve(process.argv[3]||'platform-media');
const require=createRequire(join(game,'package.json'));
const {chromium}=require('playwright');
const sharp=require('sharp');
const source='003ffa91cec7f64b5b4c29c464c216bf5fd49865';
const base='836a04fbc8dc1cdb0d8dbbcba1ec0fc5b64034a5';
const origin='http://127.0.0.1:4197';
const records=[];
const errors=[];
const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:game,env:{...process.env,PORT:'4197',CINDER_QA_HARNESS:'1',CINDER_QA_MUTE:'1'},stdio:'inherit'});
const saveJson=(file,data)=>writeFile(join(out,file),JSON.stringify(data,null,2)+'\n');
const ffmpeg=args=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});
const probe=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],{encoding:'utf8'}));
const ffArgs=['-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart','-an'];
const state=page=>page.evaluate(()=>window.__CINDER__());
const settle=page=>page.waitForFunction(()=>{const s=window.__CINDER__();return s.state==='playing'&&s.simMs>0&&s.player?.vy===0;});
const x=async(page,value)=>page.waitForFunction(v=>window.__CINDER__().player?.x>=v,value,{timeout:8000});

async function setup(page,locale='en',fixture=true){
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+(fixture?'/__encounter__/':'/games/cinder-shift/')+'?seed=4');
 await page.getByTestId('menu-settings').click();
 await page.getByTestId('locale').selectOption(locale);
 await page.getByTestId('settings-back').click();
}
async function enter(page,input){
 await page.evaluate(input=>window.__ENCOUNTER__.start(input),input);
 await settle(page);
 assert.equal((await state(page)).room,input.room);
}
async function firstRoomMovement(page,{recordShot=false}={}){
 await page.keyboard.down('d');await x(page,143);await page.keyboard.down('Space');await x(page,242);await page.keyboard.up('Space');await x(page,294);await page.keyboard.up('d');
 await page.keyboard.down('s');await page.keyboard.down('d');await x(page,442);await page.keyboard.up('d');await page.keyboard.up('s');
 await page.keyboard.down('j');
 if(recordShot){await page.waitForTimeout(120);return;}
 await page.waitForFunction(()=>window.__CINDER__().combatRemaining===0);await page.keyboard.up('j');
 await page.keyboard.down('d');await x(page,546);await page.keyboard.up('d');await page.keyboard.press('e');
 await page.waitForFunction(()=>window.__CINDER__().powered);
 await page.keyboard.down('d');await page.waitForFunction(()=>{const s=window.__CINDER__();return s.room==='B'&&s.state==='playing'&&s.player?.x<100;});await page.keyboard.up('d');
}
async function recordImage(page,name,locale,fixture,kind='gameplay'){
 const s=await state(page);
 assert(s.hp>0||kind==='ui');
 const bytes=kind==='gameplay'?await page.locator('#viewport').screenshot():await page.screenshot();
 const original=join(out,'source',name+'.png');await writeFile(original,bytes);
 const meta=await sharp(bytes).metadata();
 const filename=name+(kind==='gameplay'?'-1280x720':`-${meta.width}x${meta.height}`)+'.png';
 const file=join(out,'screenshots',filename);
 if(kind==='gameplay')await sharp(bytes).resize(1280,720,{fit:'cover',kernel:'nearest'}).png({compressionLevel:9}).toFile(file);
 else await writeFile(file,bytes);
 if(kind==='gameplay'){
  const cropWidth=Math.min(meta.width,Math.round(meta.height*4/3));
  const center=(s.room==='M5D'?320:Math.max(160,Math.min(480,(s.player?.x||80)+60)))/640*meta.width;
  const left=Math.max(0,Math.min(meta.width-cropWidth,Math.round(center-cropWidth/2)));
  await sharp(bytes).extract({left,top:0,width:cropWidth,height:meta.height}).resize(760,570,{kernel:'nearest'}).png({compressionLevel:9}).toFile(join(out,'y8',name+'-760x570.png'));
 }
 records.push({file:'screenshots/'+filename,name,locale,kind,source_sha:source,gameplay_base_sha:base,fixture,room:s.room,hp:s.hp,player:s.player,width:kind==='gameplay'?1280:meta.width,height:kind==='gameplay'?720:meta.height,raw_size:[meta.width,meta.height],source_file:'source/'+name+'.png',raw_sha256:createHash('sha256').update(bytes).digest('hex')});
}

let browser;
try{
 await mkdir(out,{recursive:true});
 for(const dir of ['source','screenshots','y8','crazygames','video-raw','evidence'])await mkdir(join(out,dir),{recursive:true});
 for(let n=0;n<100;n++){try{if((await fetch(origin+'/games/cinder-shift/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const manifest=JSON.parse(await readFile(join(game,'dist/cinder-shift/build-manifest.json'),'utf8'));
 assert.equal(manifest.source_sha,source);assert.equal(manifest.gameplay_base_sha,base);
 await saveJson('runtime-manifest.json',manifest);
 browser=await chromium.launch({headless:true,args:['--mute-audio']});
 const scenes=[
  {name:'01-airlock-fire',mission:'airlock',room:'A',action:'airlock'},
  {name:'02-cargo',mission:'cargo',room:'M2A'},
  {name:'03-foundry',mission:'foundry',room:'M3A'},
  {name:'04-archive',mission:'archive',room:'M4A'},
  {name:'05-regulator',mission:'reactor',room:'M5D'},
  {name:'06-small-world',mission:'SW01',room:'SW01-A',action:'carry'},
  {name:'07-adriatic',mission:'YU01',room:'YU01-A',action:'power'}
 ];
 for(const locale of ['en','ru'])for(const scene of scenes){
  if(locale==='ru'&&!['airlock','reactor'].includes(scene.mission))continue;
  const context=await browser.newContext({viewport:{width:1920,height:1080},locale:locale==='en'?'en-US':'ru-RU'});
  const page=await context.newPage();
  try{
   await setup(page,locale);await enter(page,{mission:scene.mission,room:scene.room,seed:4});
   if(scene.action==='airlock')await firstRoomMovement(page,{recordShot:true});
   else if(scene.action==='carry'||scene.action==='power'){
    await page.keyboard.down('d');await x(page,108);await page.keyboard.up('d');await settle(page);await page.keyboard.press('e');await page.waitForTimeout(200);
   }else{
    await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');await page.keyboard.down('Space');await page.keyboard.down('j');await page.waitForTimeout(200);
   }
   await recordImage(page,scene.name+'-'+locale,locale,'one_room_entry_only; normal keyboard input afterwards');
   await page.keyboard.up('j');await page.keyboard.up('Space');
  }catch(error){await page.screenshot({path:join(out,'evidence',scene.name+'-'+locale+'-failed.png')});throw error;}
  finally{await context.close();}
 }
 // UI captures come from the production entry, without the test-only entry fixture.
 {
  const context=await browser.newContext({viewport:{width:1280,height:900},locale:'en-US'});const page=await context.newPage();
  await setup(page,'en',false);await page.getByTestId('new-shift').click();
  await recordImage(page,'08-campaign-map-en','en','none; normal production UI','ui');
  await page.getByTestId('map-prepare').click();
  await recordImage(page,'09-workshop-en','en','none; normal production UI','ui');
  await context.close();
 }
 // One continuous real-time recording. No HP, enemy, position or clock mutations.
 {
  const context=await browser.newContext({viewport:{width:1920,height:1080},locale:'en-US',recordVideo:{dir:join(out,'video-raw'),size:{width:1920,height:1080}}});
  const page=await context.newPage();await setup(page,'en');await enter(page,{mission:'airlock',room:'A',seed:4});
  const box=await page.locator('#viewport').boundingBox();const started=Date.now();const trace=[];let sampling=false;
  const timer=setInterval(async()=>{if(sampling)return;sampling=true;try{const s=await state(page);trace.push({t:(Date.now()-started)/1000,x:s.player?.x,room:s.room,hp:s.hp,state:s.state});}catch{}finally{sampling=false;}},250);
  try{
   await firstRoomMovement(page);
   await page.keyboard.down('d');await x(page,194);await page.keyboard.down('Space');await page.keyboard.down('j');await x(page,350);await page.keyboard.up('d');await page.keyboard.up('Space');
   await page.waitForFunction(()=>window.__CINDER__().combatRemaining===0,null,{timeout:10000});await page.keyboard.up('j');
   await page.keyboard.down('a');await page.waitForTimeout(300);await page.keyboard.up('a');await page.keyboard.down('Space');await page.waitForTimeout(350);await page.keyboard.up('Space');
   const remaining=20000-(Date.now()-started);if(remaining>0)await page.waitForTimeout(remaining);
   assert((await state(page)).hp>0);
  }finally{clearInterval(timer);}
  const end=Date.now();const raw=await page.video().path();await context.close();
  const duration=Number(probe(raw).format.duration);const length=(end-started)/1000;const start=Math.max(0,duration-length);
  const crop=[Math.floor(box.width/2)*2,Math.floor(box.height/2)*2,Math.floor(box.x/2)*2,Math.floor(box.y/2)*2].join(':');
  const continuous=join(out,'y8','gameplay-continuous-1920x1080.mp4');
  ffmpeg(['-ss',String(start),'-i',raw,'-t','20','-vf',`crop=${crop},scale=1920:1080:flags=neighbor,fps=30`,...ffArgs,continuous]);
  const points=trace.filter((v,i)=>i===0||i%4===0).filter(v=>Number.isFinite(v.x));
  let expression=String(Math.round(Math.max(0,Math.min(1200,((points.at(-1)?.x||80)+60)*3-360))));
  for(let n=points.length-2;n>=0;n--){const a=points[n],b=points[n+1];const ax=Math.round(Math.max(0,Math.min(1200,(a.x+60)*3-360))),bx=Math.round(Math.max(0,Math.min(1200,(b.x+60)*3-360)));expression=`if(lt(t,${b.t.toFixed(3)}),${ax}+(${bx-ax})*clip((t-${a.t.toFixed(3)})/${Math.max(.01,b.t-a.t).toFixed(3)},0,1),${expression})`;}
  const portrait=join(out,'source','gameplay-portrait-1080x1620.mp4');
  ffmpeg(['-i',continuous,'-vf',`crop=720:1080:x='${expression}':y=0,scale=1080:1620:flags=neighbor`,...ffArgs,portrait]);
  for(const [name,video,cover,width,height]of [
   ['landscape',continuous,'landscape.jpg',1920,1080],['portrait',portrait,'portrait-video-opening.jpg',1080,1620]
  ]){
   ffmpeg(['-loop','1','-t','0.2','-i',resolve('art/platform-release-2026-11-19',cover),'-i',video,'-filter_complex',`[0:v]scale=${width}:${height},fps=30,trim=duration=0.2,setpts=PTS-STARTPTS,setsar=1[c];[1:v]trim=duration=19.8,setpts=PTS-STARTPTS,setsar=1[g];[c][g]concat=n=2:v=1:a=0,format=yuv420p[v]`,'-map','[v]',...ffArgs,join(out,'crazygames',`preview-${name}.mp4`)]);
  }
  await saveJson('evidence/video-trace.json',{source_sha:source,fixture:'one initial room entry; ordinary input and wall-clock recording thereafter',unmodified_simulation:true,clip_box:box,raw_duration:duration,recorded_seconds:length,trim_start:start,portrait:'desktop footage with camera crop following Mira; not physical mobile evidence',trace});
 }
 assert.equal(errors.length,0,errors.join('\n'));
 const videoFiles=['y8/gameplay-continuous-1920x1080.mp4','crazygames/preview-landscape.mp4','crazygames/preview-portrait.mp4'];
 const videos=[];
 for(const relative of videoFiles){const file=join(out,relative),p=probe(file),v=p.streams.find(s=>s.codec_type==='video');const bytes=(await stat(file)).size;assert.equal(p.streams.some(s=>s.codec_type==='audio'),false);assert(bytes<=50000000);assert(Number(p.format.duration)>=15&&Number(p.format.duration)<=20.1);videos.push({file:relative,width:v.width,height:v.height,seconds:Number(p.format.duration),bytes,codec:v.codec_name,sound:false,source_sha:source});}
 await saveJson('capture-manifest.json',{source_sha:source,gameplay_base_sha:base,capture_head:process.env.GITHUB_SHA,created_at_utc:new Date().toISOString(),screenshots:records,videos,errors,physical_mobile_verified:false,full_campaign_playtest_verified:false,ui_screenshots_not_for_y8_gameplay_slots:true});
 console.log(JSON.stringify({screenshots:records.length,videos,source_sha:source}));
}catch(error){await mkdir(out,{recursive:true});await saveJson('capture-failure.json',{error:String(error),stack:error.stack,errors,completed:records});throw error;}
finally{await browser?.close();server.kill('SIGTERM');}
