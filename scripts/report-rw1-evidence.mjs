import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
async function files(root){return(await Promise.all((await readdir(root,{withFileTypes:true})).map(e=>e.isDirectory()?files(path.join(root,e.name)):[path.join(root,e.name)]))).flat();}
const paths=(await files('test-results')).filter(p=>/\/rw1-.*\.png$/.test(p)).sort();
if(!paths.length)throw Error('No RW1 renderer frames captured');
const layers=[];
for(const [i,file]of paths.entries()){
 const left=(i%3)*320,top=Math.floor(i/3)*204,label=path.basename(file,'.png');const state=JSON.parse(await readFile(file.replace('.png','.json'),'utf8'));
 console.log('CINDER_RW1_FRAME '+JSON.stringify({label,sha:state.sha,build:state.build,hp:state.hp}));
 layers.push({input:Buffer.from(`<svg width="320" height="24"><rect width="320" height="24" fill="#101823"/><text x="6" y="17" fill="#f1d8ae" font-family="sans-serif" font-size="12">${label} | HP ${state.hp}/${state.maxHp}</text></svg>`),left,top});
 layers.push({input:await sharp(file).resize(320,180,{fit:'contain',background:'#101823'}).png().toBuffer(),left,top:top+24});
}
const png=await sharp({create:{width:960,height:Math.ceil(paths.length/3)*204,channels:4,background:'#101823'}}).composite(layers).png({compressionLevel:9}).toBuffer();await writeFile('test-results/rw1-review.png',png);
const base64=png.toString('base64');for(let i=0;i<base64.length;i+=6000)console.log('CINDER_RW1_SCREENSHOT_'+String(i/6000).padStart(3,'0')+':'+base64.slice(i,i+6000));
console.log('CINDER_RW1_SCREENSHOT_END bytes='+png.length+' source='+process.env.GITHUB_SHA);
