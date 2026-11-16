import sharp from 'sharp';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
const root=resolve('test-results/menu-art'),before=resolve('test-results/menu-before');
async function walk(dir){const out=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=join(dir,item.name);if(item.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const files=(await walk(root)).filter(p=>p.endsWith('menu-art-evidence.json')),metadata=JSON.parse(await readFile(join(before,'baseline.json'),'utf8'));
const records=await Promise.all(files.map(async file=>({...JSON.parse(await readFile(file,'utf8')),dir:dirname(file)})));
const output=resolve('test-results/menu-comparison');await mkdir(output,{recursive:true});
for(const locale of ['ru','en']){
 const layers=[],cells=[],width=1200,rowHeight=430;let row=0;
 for(const viewport of [1440,390,667]){
  const record=records.find(r=>r.locale===locale&&r.size.width===viewport);
  const old=metadata.captures.find(r=>r.locale===locale&&r.size.width===viewport);
  if(!record||!old)throw Error('Missing exact-source menu evidence '+locale+' '+viewport);
  const label=Buffer.from('<svg width="1200" height="30"><rect width="1200" height="30" fill="#142731"/><text x="16" y="21" fill="#edf1ec" font-family="sans-serif" font-size="16">'+viewport+' x '+record.size.height+' / '+locale.toUpperCase()+' / alpha.3 BEFORE (left) / alpha.4 AFTER (right)</text></svg>');
  layers.push({input:label,left:0,top:row*rowHeight});
  for(const [col,file]of [join(before,old.file),join(record.dir,'menu-normal.png')].entries()){
   const img=await sharp(file).resize({width:590,height:390,fit:'inside'}).png().toBuffer(),size=await sharp(img).metadata();
   layers.push({input:img,left:col*600+Math.round((600-size.width)/2),top:row*rowHeight+35});cells.push({viewport,locale,file});
  }row++;
 }
 const png=await sharp({create:{width,height:rowHeight*row,channels:4,background:'#0e1823'}}).composite(layers).png().toBuffer();
 await writeFile(join(output,'menu-'+locale+'.png'),png);
 if(locale==='ru'){
  console.log('MENU_ART_PNG_BEGIN');const data=png.toString('base64');for(let n=0;n<data.length;n+=6000)console.log(data.slice(n,n+6000));console.log('MENU_ART_PNG_END');
 }
 await writeFile(join(output,'menu-'+locale+'.json'),JSON.stringify({baseline:metadata.manifest,cells,normalAndReducedGeometryVerified:records.filter(r=>r.locale===locale)},null,2));
}
