import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source='art/world-production/source',out='games/cinder-shift/public/assets/world-production';
await mkdir(out,{recursive:true});await mkdir('art/world-production/previews',{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
export const sectors=['SW01','SW02','SW03','SW04','SW05','YU01','YU02','YU03','YU04','YU05'];
const names=[['mug','plates','drawer','breadbin','dock','kettle'],['keys','cable','printer','books','lamp','fan'],['basket','cloth','line','strap','duct','damper'],['pot','leaves','towel','flag','gutter','vane'],['books','clips','router','conductor','beacon','phase'],['balcony','stairs','exchange','telephone','antenna','laundry'],['gate','container','crane','bollard','lamp','transmitter'],['canopy','timetable','train','door','niche','substation'],['lathe','conveyor','catwalk','distributor','screen','flywheel'],['hill','gallery','relay','antenna','crt','rift']];
const mechanisms=['lid','spool','block','conductor','contact','scanner','switch','door','bridge','transmitter','signal','repair'];
const mechanismStates=[...Array(4).fill(['ground','held','thrown','landed','installed']),['inactive','empty','ready','locked','disabled'],['idle','warning','active','exposed','disabled'],['off','A','switching','B','locked'],['closed','opening','open','warning','blocked'],['folded','moving','extended','blocked','disabled'],['offline','ready','transmitting','restored','disabled'],['safe','warning','active','recovery','disabled'],['ready','interact','used','protected','disabled']];
const enemyNames=['crumb-rover','lint-rotor','lidar-guardian','relay-crawler','induction-orb','signal-watcher'];
const enemyStates=['idle','warning','attack','recovery','destroyed'];
const cell=100,padding=2,step=cell+padding*2,cols=10,entries=[],sources={};
function bounds(data,width,height){let x0=width,y0=height,x1=-1,y1=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x1<0)throw Error('empty_sprite');return{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1};}
async function sheet(file,columns,rows,ids){
 const input=await readFile(source+'/'+file),{width,height}=await sharp(input).metadata();sources[file]={sha256:hash(input),width,height};
 for(let row=0;row<rows.length-1;row++)for(let col=0;col<columns;col++){
  const left=Math.round(col*width/columns),right=Math.round((col+1)*width/columns),top=rows[row],bottom=rows[row+1];
  const {data,info}=await sharp(input).extract({left,top,width:right-left,height:bottom-top}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Standard sprite export: remove semitransparent matte pixels and establish
  // hard alpha before nearest-neighbour sampling. Source art stays untouched.
  for(let n=0;n<data.length;n+=4){data[n+3]=data[n+3]>=160?255:0;if(!data[n+3])data[n]=data[n+1]=data[n+2]=0;}
  const ink=bounds(data,info.width,info.height),scale=Math.min(88/ink.width,88/ink.height),w=Math.max(1,Math.round(ink.width*scale)),h=Math.max(1,Math.round(ink.height*scale));
  const sprite=await sharp(data,{raw:info}).extract({left:ink.x,top:ink.y,width:ink.width,height:ink.height}).resize(w,h,{kernel:'nearest'}).png().toBuffer();
  const x=Math.floor((cell-w)/2),y=cell-6-h;
  const rgba=await sharp({create:{width:cell,height:cell,channels:4,background:'#00000000'}}).composite([{input:sprite,left:x,top:y}]).raw().toBuffer();
  entries.push({id:ids(row,col),buffer:await sharp(rgba,{raw:{width:cell,height:cell,channels:4}}).png().toBuffer(),bounds:bounds(rgba,cell,cell),source:file,source_rect:{left,top,width:right-left,height:bottom-top}});
 }
}
await sheet('props-master.png',6,[0,172,345,496,664,817,986,1139,1285,1408,1536],(r,c)=>sectors[r]+'-'+names[r][c]);
await sheet('mechanisms-master.png',5,[0,131,262,380,510,646,769,904,1026,1153,1292,1415,1536],(r,c)=>mechanisms[r]+'-'+mechanismStates[r][c]);
await sheet('enemies-master.png',5,[0,291,526,770,995,1245,1536],(r,c)=>enemyNames[r]+'-'+enemyStates[c]);
await sheet('base-enemies-master.png',5,[0,255,512,768,1024],(r,c)=>['base-walker','base-drone','base-ram','regulator-core'][r]+'-'+enemyStates[c]);
for(const [index,pose]of ['idle','walk','jump','pickup','throw','drop'].entries()){
 const bend=[0,1,-1,2,-2,1][index];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" shape-rendering="crispEdges"><g id="armored-sleeve"><path fill="#142331" d="M20 48h13v-2h13v3h14v${10+bend}H43v-2H20z"/><path fill="#405c70" d="M22 50h11v-2h11v3h15v5H43v-2H22z"/><path fill="#81b3c3" d="M23 49h8v2h-8zM35 48h7v3h-7zM45 51h12v2H45z"/></g><g id="wrist-joint"><path fill="#142331" d="M57 49h7v11h-7z"/><path fill="#dfa568" d="M59 51h3v7h-3z"/></g><g id="glove"><path fill="#142331" d="M63 49h11v3h3v7H63z"/><path fill="#efd6a4" d="M64 51h8v3h3v3H64z"/><path fill="#9b6456" d="M65 57h9v1h-9z"/></g></svg>`;
 await writeFile(source+'/carry-'+pose+'.svg',svg);const buffer=await sharp(Buffer.from(svg)).png().toBuffer(),rgba=await sharp(buffer).ensureAlpha().raw().toBuffer();entries.push({id:'carry-'+pose,buffer,bounds:bounds(rgba,100,100),source:'carry-'+pose+'.svg',source_rect:{left:0,top:0,width:100,height:100}});
}
const frames={},metadata={},composites=[];
for(const [i,e]of entries.entries()){const x=i%cols*step+padding,y=Math.floor(i/cols)*step+padding;frames[e.id]={frame:{x,y,w:cell,h:cell},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:cell,h:cell},sourceSize:{w:cell,h:cell}};metadata[e.id]={bounds:e.bounds,canvas:[cell,cell],source:e.source,source_rect:e.source_rect};composites.push({input:e.buffer,left:x,top:y});}
const width=cols*step,height=Math.ceil(entries.length/cols)*step;
const atlas=await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(composites).png({palette:true,colors:256,dither:0}).toBuffer();
await writeFile(out+'/objects.png',atlas);await writeFile(out+'/objects.json',JSON.stringify({frames,meta:{image:'objects.png',size:{w:width,h:height},scale:'1'}}));
const bg=await readFile(source+'/backgrounds-master.png'),bgInfo=await sharp(bg).metadata();sources['backgrounds-master.png']={sha256:hash(bg),width:bgInfo.width,height:bgInfo.height};
const backgrounds={};for(let row=0;row<5;row++)for(let col=0;col<2;col++){
 const mission=col===0?'SW0'+(row+1):'YU0'+(row+1),left=Math.round(col*bgInfo.width/2)+2,top=Math.round(row*bgInfo.height/5)+2,right=Math.round((col+1)*bgInfo.width/2)-2,bottom=Math.round((row+1)*bgInfo.height/5)-2;
 const bytes=await sharp(bg).extract({left,top,width:right-left,height:bottom-top}).resize(320,140,{fit:'fill',kernel:'nearest'}).png({palette:true,colors:256,dither:0}).toBuffer();await writeFile(out+'/'+mission+'.png',bytes);backgrounds[mission]={file:mission+'.png',sha256:hash(bytes),bytes:bytes.length};
}
// Pixel material kits are editable SVG source, repeated only within actual colliders.
const materialPatterns=["<path d=\"M1 3v10M31 3v10\" stroke=\"#efd6a4\"/><path d=\"M6 5h9v1H6z\" fill=\"#efd6a4\"/>","<path d=\"M2 7h28M2 10h28\" stroke=\"#142331\"/>","<path d=\"M1 4v10M5 4v10M9 4v10M13 4v10M17 4v10M21 4v10M25 4v10M29 4v10M0 6h32M0 10h32\" stroke=\"#9d9696\" opacity=\".6\"/>","<path d=\"M0 8h32M16 3v5M8 8v6M24 8v6\" stroke=\"#663f32\"/>","<path d=\"M2 5h9v4h10v3h9M4 12h8\" fill=\"none\" stroke=\"#91d2b8\"/>","<path d=\"M16 3v11M0 9h32\" stroke=\"#182a34\"/>","<path d=\"M4 3v11M12 3v11M20 3v11M28 3v11\" stroke=\"#182a34\" stroke-width=\"2\"/>","<path d=\"M24 3v11M4 8h3M14 12h3\" stroke=\"#b8c4ac\" opacity=\".5\"/>","<path d=\"M2 12l8-8 8 8 8-8\" fill=\"none\" stroke=\"#182a34\" stroke-width=\"2\"/>","<path d=\"M6 5h20v5H6z\" fill=\"#182a34\"/><path d=\"M9 6h2v3H9zM15 6h2v3h-2zM21 6h2v3h-2z\" fill=\"#91d2b8\"/>"];
const materials={};for(const [i,mission]of sectors.entries()){
 const p=i<5?['#302d35','#7d5c46','#bb9262','#dfc88f']:['#182a34','#4b6268','#79928f','#b8c4ac'];
 const grain=Array.from({length:8},(_,n)=>`<path d="M${n*5%32} ${5+n%3*3}h${5+n%4}" stroke="${p[n%2]}"/>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16" shape-rendering="crispEdges"><path fill="${p[1]}" d="M0 0h32v16H0z"/><path fill="${p[2]}" d="M0 0h32v3H0z"/><path fill="${p[3]}" d="M0 0h32v1H0z"/>${grain}${materialPatterns[i]}<path fill="${p[0]}" d="M0 14h32v2H0z"/><path fill="${p[3]}" d="M3 5h2v2H3zM27 5h2v2h-2z"/></svg>`;
 await writeFile(source+'/material-'+mission+'.svg',svg);const bytes=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/material-'+mission+'.png',bytes);materials[mission]='material-'+mission+'.png';
}
const baseMaster=await readFile(source+'/base-backgrounds-master.png'),baseInfo=await sharp(baseMaster).metadata();sources['base-backgrounds-master.png']={sha256:hash(baseMaster),width:baseInfo.width,height:baseInfo.height};
const baseBackgrounds={};for(const [i,sector]of ['airlock','cargo','foundry','archive','reactor','regulator'].entries()){
 const left=Math.round(i%2*baseInfo.width/2)+2,top=Math.round(Math.floor(i/2)*baseInfo.height/3)+2,right=Math.round((i%2+1)*baseInfo.width/2)-2,bottom=Math.round((Math.floor(i/2)+1)*baseInfo.height/3)-2;
 const bytes=await sharp(baseMaster).extract({left,top,width:right-left,height:bottom-top}).resize(320,140,{fit:'fill',kernel:'nearest'}).png({palette:true,colors:256,dither:0}).toBuffer();await writeFile(out+'/base-'+sector+'.png',bytes);baseBackgrounds[sector]={file:'base-'+sector+'.png',sha256:hash(bytes),bytes:bytes.length};
}
const manifest={version:1,provenance:'Original imagegen masters; untouched sources plus reproducible atlas extraction and pixel material SVGs',sources,atlas:{file:'objects.png',json:'objects.json',sha256:hash(atlas),width,height,padding},frames:metadata,baseBackgrounds,sectors:Object.fromEntries(sectors.map((m,i)=>[m,names[i].map(n=>m+'-'+n)])),backgrounds,materials,enemies:enemyNames,mechanisms:Object.fromEntries(mechanisms.map((m,i)=>[m,mechanismStates[i]]))};
await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('art/world-production/manifest.json',JSON.stringify(manifest,null,2)+'\n');
await sharp(atlas).flatten({background:'#142331'}).png().toFile('art/world-production/previews/contact-sheet.png');
console.log(`World art exported: ${entries.length} sprites; ${Object.keys(backgrounds).length} backgrounds; ${Object.keys(materials).length} material kits; ${(atlas.length/1024).toFixed(0)} KiB atlas`);
