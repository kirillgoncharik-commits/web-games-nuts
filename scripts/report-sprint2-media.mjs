import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
async function files(root){try{return(await Promise.all((await readdir(root,{withFileTypes:true})).map(e=>e.isDirectory()?files(path.join(root,e.name)):[path.join(root,e.name)]))).flat();}catch{return[];}}
await mkdir('test-results',{recursive:true});
const paths=await files('test-results/media'),rooms=[];
for(const file of paths.filter(p=>p.endsWith('/room.json'))){const r=JSON.parse(await readFile(file,'utf8'));rooms.push({mission:r.mission,room:r.room,hp:r.snapshot.hp,audio:r.audio,sha:r.snapshot.sha,build:r.snapshot.build,fixture:r.fixture,image:path.join(path.dirname(file),'room.png'),clip:path.join(path.dirname(file),'runtime.webm')});}
for(const mission of ['airlock','cargo','foundry','archive','reactor']){
 const group=rooms.filter(r=>r.mission===mission);if(!group.length)continue;const layers=[];
 for(const [i,r]of group.entries()){const left=i%2*480,top=Math.floor(i/2)*294;layers.push({input:Buffer.from('<svg width="480" height="24"><rect width="480" height="24" fill="#101823"/><text x="8" y="17" fill="#f1d8ae" font-family="sans-serif" font-size="12">'+mission+' / '+r.room+' / HP '+r.hp+'</text></svg>'),left,top});layers.push({input:await sharp(r.image).resize(480,270,{fit:'contain',background:'#101823'}).png().toBuffer(),left,top:top+24});}
 const png=await sharp({create:{width:960,height:Math.ceil(group.length/2)*294,channels:4,background:'#101823'}}).composite(layers).png({palette:true,colours:256}).toBuffer();await writeFile('test-results/media-'+mission+'.png',png);const base64=png.toString('base64');
 for(let n=0;n<base64.length;n+=6000)console.log('CINDER_RW2_ATLAS_'+mission.toUpperCase()+'_'+String(n/6000).padStart(3,'0')+':'+base64.slice(n,n+6000));
 console.log('CINDER_RW2_ATLAS_'+mission.toUpperCase()+'_END rooms='+group.length+' bytes='+png.length);
}
const summary={source:process.env.GITHUB_SHA,variant:process.env.MEDIA_VARIANT,rooms};await writeFile('test-results/media-index.json',JSON.stringify(summary,null,2));console.log('CINDER_RW2_MEDIA '+JSON.stringify({variant:summary.variant,rooms:rooms.length,ids:rooms.map(r=>r.room),audible:rooms.filter(r=>r.audio.peakRms>.0001).length}));
