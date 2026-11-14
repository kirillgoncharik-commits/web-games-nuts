import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
async function files(root){const entries=await readdir(root,{withFileTypes:true});return(await Promise.all(entries.map(e=>e.isDirectory()?files(join(root,e.name)):[join(root,e.name)]))).flat();}
const paths=await files('test-results'),layers=[];
for(const [i,name] of ['boss-reflected-pellet.png','defence-risk.png'].entries()){
 const file=paths.find(p=>p.endsWith('/'+name));if(!file)throw Error('Missing final combat evidence '+name);
 layers.push({input:await sharp(await readFile(file)).resize(640,360).png().toBuffer(),left:0,top:i*360});
}
const png=await sharp({create:{width:640,height:720,channels:4,background:'#101823'}}).composite(layers).png().toBuffer(),base64=png.toString('base64');
for(let i=0;i<base64.length;i+=6000)console.log('CINDER_FINAL_'+String(i/6000).padStart(3,'0')+':'+base64.slice(i,i+6000));
console.log('CINDER_FINAL_END bytes='+png.length+' source='+process.env.GITHUB_SHA);
