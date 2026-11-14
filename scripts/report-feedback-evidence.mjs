import {readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

async function files(root){
 const entries=await readdir(root,{withFileTypes:true});
 return(await Promise.all(entries.map(entry=>entry.isDirectory()?files(path.join(root,entry.name)):[path.join(root,entry.name)]))).flat();
}
const paths=await files('test-results');
const layers=[];
for(const [i,mode]of ['base','shield','reduced'].entries()){
 for(const [column,event]of ['before','impact'].entries()){
  const file=paths.find(p=>p.endsWith('/'+mode+'-'+event+'.png'));
  if(!file)throw Error('Missing real-input evidence: '+mode+' '+event);
  layers.push({input:Buffer.from(`<svg width="480" height="24"><rect width="480" height="24" fill="#101823"/><text x="12" y="17" fill="#f1d8ae" font-family="sans-serif" font-size="14">${mode}: ${event==='before'?'before ram impact':'actual ram impact'}</text></svg>`),left:column*480,top:i*294});
  layers.push({input:await sharp(file).resize(480,270,{fit:'contain',background:'#101823'}).png().toBuffer(),left:column*480,top:i*294+24});
 }
}
const png=await sharp({create:{width:960,height:882,channels:4,background:'#101823'}}).composite(layers).png({compressionLevel:9}).toBuffer();
await writeFile('test-results/feedback-review.png',png);
// A bounded, game-only contact sheet is also available through UTF-8 CI logs.
// This lets review inspect the exact candidate when local browser launch is denied.
const base64=png.toString('base64');
for(let i=0;i<base64.length;i+=6000)console.log('CINDER_SCREENSHOT_'+String(i/6000).padStart(3,'0')+':'+base64.slice(i,i+6000));
console.log('CINDER_SCREENSHOT_END bytes='+png.length+' source='+process.env.GITHUB_SHA);
