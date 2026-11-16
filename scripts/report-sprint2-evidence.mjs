import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
async function files(root){return(await Promise.all((await readdir(root,{withFileTypes:true})).map(e=>e.isDirectory()?files(path.join(root,e.name)):[path.join(root,e.name)]))).flat();}
const paths=await files('test-results/sprint2');
async function sheet(name,images,height){
 const layers=[];
 for(const [i,file] of images.entries()){
  const left=i%2*480,top=Math.floor(i/2)*(height+24),label=path.basename(path.dirname(file)).replace('sprint2-presentation-RW2-','').replace('-chromium','')+' / '+path.basename(file);
  layers.push({input:Buffer.from(`<svg width="480" height="24"><rect width="480" height="24" fill="#101823"/><text x="8" y="17" fill="#f1d8ae" font-family="sans-serif" font-size="12">${label}</text></svg>`),left,top});
  layers.push({input:await sharp(file).resize(480,height,{fit:'contain',background:'#101823'}).png().toBuffer(),left,top:top+24});
 }
 const png=await sharp({create:{width:960,height:Math.ceil(images.length/2)*(height+24),channels:4,background:'#101823'}}).composite(layers).png({palette:true,colours:256}).toBuffer();
 await writeFile('test-results/rw2-'+name+'.png',png);
 const base64=png.toString('base64');for(let n=0;n<base64.length;n+=6000)console.log('CINDER_RW2_'+name.toUpperCase()+'_'+String(n/6000).padStart(3,'0')+':'+base64.slice(n,n+6000));
 console.log('CINDER_RW2_'+name.toUpperCase()+'_END bytes='+png.length+' source='+process.env.GITHUB_SHA);
}
const sectors=paths.filter(p=>p.endsWith('/sector.png')).sort();
const ui=paths.filter(p=>p.endsWith('/map.png')||p.endsWith('/workshop.png')).sort();
if(sectors.length)await sheet('sectors',sectors,317);
if(ui.length)await sheet('ui',ui,400);
for(const file of paths.filter(p=>p.endsWith('/measurement.json'))){const m=JSON.parse(await readFile(file));console.log('CINDER_RW2_METRIC '+JSON.stringify({mission:m.mission,room:m.room,reduced:m.reduced,p50:m.p50,p95:m.p95,hp:m.snapshot.hp,technicalLoadMs:m.snapshot.technicalLoadMs,sha:m.snapshot.sha}));}
