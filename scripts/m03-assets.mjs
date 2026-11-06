import{readFile,writeFile,mkdir,readdir,rm}from'node:fs/promises';
import{join}from'node:path';import{createHash}from'node:crypto';
import sharp from'sharp';import{writePsdBuffer,readPsd,initializeCanvas}from'ag-psd';
initializeCanvas(()=>{throw Error('Canvas conversion is not used in this exporter');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
const layout=JSON.parse(await readFile('art/m03/source-layout.json','utf8'));
const source='art/m03/source',out='games/cinder-shift/public/assets/m03',previews='art/m03/previews';
await mkdir(out,{recursive:true});await mkdir(previews,{recursive:true});await mkdir(source+'/frames',{recursive:true});await mkdir('games/cinder-shift/src/art',{recursive:true});
const colors=['111823','1B2939','213747','30495C','456171','72909C','332C4A','494163','655978','775361','A76B70','F1D8AE','C4AD8C','DFA15C','A8784E','76DCC8','3A9A92','FFB65B','F36D76','B4485B','EDF1EC'].map(hex=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)));
function image(data,width,height){return{width,height,data:new Uint8ClampedArray(data)};}
function quantize(data,threshold=128){
  const memo=new Map();
  for(let i=0;i<data.length;i+=4){if(data[i+3]<threshold){data[i]=data[i+1]=data[i+2]=data[i+3]=0;continue;}data[i+3]=255;
    const key=(data[i]<<16)|(data[i+1]<<8)|data[i+2];let rgb=memo.get(key);
    if(!rgb){let min=Infinity;for(const c of colors){const d=(data[i]-c[0])**2+(data[i+1]-c[1])**2+(data[i+2]-c[2])**2;if(d<min){min=d;rgb=c;}}memo.set(key,rgb);}data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];
  }return data;
}
async function png(pixel){return sharp(Buffer.from(pixel.data),{raw:{width:pixel.width,height:pixel.height,channels:4}}).png({compressionLevel:9}).toBuffer();}
async function raw(buffer){const{data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});return image(data,info.width,info.height);}
async function normalized(def,sheet){
  const meta=await sharp(sheet).metadata();let rect;
  if(def.crop)rect={left:def.crop[0],top:def.crop[1],width:def.crop[2],height:def.crop[3]};
  else{const[x,y,cols,rows]=def.cell;const left=Math.floor(x*meta.width/cols),top=Math.floor(y*meta.height/rows);rect={left,top,width:Math.floor((x+1)*meta.width/cols)-left,height:Math.floor((y+1)*meta.height/rows)-top};}
  let cut=await raw(await sharp(sheet).extract(rect).png().toBuffer());quantize(cut.data,def.id==='mira-shadow'?16:128);
  if(!def.noTrim){let x0=cut.width,y0=cut.height,x1=-1,y1=-1;for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++)if(cut.data[(y*cut.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x1<0)throw Error('Empty sprite '+def.id);cut=await raw(await sharp(await png(cut)).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).png().toBuffer());}
  const size=def.fit||def.size;const resized=await raw(await sharp(await png(cut)).resize(size[0],size[1],{kernel:'nearest',fit:'fill'}).png().toBuffer());
  let paste=def.paste||[0,0];
  if(def.sensor_align){let total=0,sx=0,sy=0;for(let y=0;y<resized.height;y++)for(let x=0;x<resized.width;x++){const i=(y*resized.width+x)*4;if(resized.data[i+3]&&resized.data[i]>resized.data[i+1]*1.25&&resized.data[i]>140){sx+=x;sy+=y;total++;}}if(!total)throw Error('Drone sensor not found');paste=[def.sensor_align[0]-Math.round(sx/total),def.sensor_align[1]-Math.round(sy/total)];}
  const result=await raw(await sharp({create:{width:def.size[0],height:def.size[1],channels:4,background:'#00000000'}}).composite([{input:await png(resized),left:paste[0],top:paste[1]}]).png().toBuffer());
  return result;
}
function frameDefs(){return{
  mira:layout.hero,
  enemies:layout.enemies,
  props:layout.props.map(d=>({...d,sheet:d.sheet||'props'})).concat([{id:'signal-coral',size:[1,1],position:[140,70],slot:'telegraph.line',pivot:[0,0],color:layout.palette.coral},{id:'signal-mint',size:[1,1],position:[145,70],slot:'interaction.progress',pivot:[0,0],color:layout.palette.mint}]),
  environment:layout.tiles.map((d,i)=>({...d,sheet:'tiles',noTrim:true,size:[16,16],position:[(i%3)*20,Math.floor(i/3)*20],pivot:[0,0]})),
};}
async function writeSourcePSD(name,defs,pixels,width,height){
  const layers=defs.map((d,i)=>({name:d.id,left:d.position?.[0]||0,top:d.position?.[1]||0,right:(d.position?.[0]||0)+pixels[i].width,bottom:(d.position?.[1]||0)+pixels[i].height,imageData:pixels[i],hidden:d.id==='mira-body-crouch'}));
  const composite=await raw(await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(await Promise.all(layers.filter(l=>!l.hidden).map(async l=>({input:await png(l.imageData),left:l.left,top:l.top})))).png().toBuffer());
  const psd=writePsdBuffer({width,height,children:layers,imageData:composite},{generateThumbnail:false,trimImageData:false});await writeFile(source+'/'+name+'.psd',psd);
}
async function importSources(){
  const all=frameDefs();const cache={};for(const n of ['hero','hero-m04','hero-m05a','repair-cache-m04','enemies','props','tiles'])cache[n]=await readFile(source+'/generated/'+n+'.png');
  const pixels={};for(const[group,defs]of Object.entries(all)){pixels[group]=[];for(const def of defs){if(def.color){const rgb=def.color.slice(1).match(/../g).map(s=>parseInt(s,16));pixels[group].push(image([...rgb,255],1,1));}else pixels[group].push(await normalized(def,cache[def.sheet]));}}
  if(process.argv.includes('--hero-only')){await writeSourcePSD('mira',all.mira,pixels.mira,48,64);return;}
  // A separate raised cutter layer keeps the walker's original M02 muzzle at (+17,-32).
  const gun=pixels.mira[layout.hero.findIndex(d=>d.id==='mira-cutter')];const walkerIndex=all.enemies.findIndex(d=>d.id==='walker');
  pixels.enemies[walkerIndex]=await raw(await sharp(await png(pixels.enemies[walkerIndex])).composite([{input:await png(gun),left:20,top:2}]).png().toBuffer());
  for(const[group,defs]of Object.entries(all))await writeSourcePSD(group,defs,pixels[group],group==='mira'?48:group==='props'?168:144,group==='mira'?64:group==='props'?168:64);
  const far=await raw(await sharp(source+'/generated/far.png').resize(640,320,{kernel:'nearest',fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true}).then(({data,info})=>sharp(quantize(data),{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer()));
  for(const id of ['A','B','C']){
    const arch=await raw(await sharp(source+'/generated/arch'+id+'.png').resize(640,320,{kernel:'nearest',fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true}).then(({data,info})=>sharp(quantize(data),{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer()));
    await writeSourcePSD('room-'+id,[{id:'landscape',position:[0,0]},{id:'architecture',position:[0,0]}],[far,arch],640,320);
  }
  console.log('Created editable PSD sources. Subsequent art:export reads these PSDs.');
}
const hash=b=>createHash('sha256').update(b).digest('hex');
async function saveHashed(base,ext,data){const name=base+'-'+hash(data).slice(0,10)+'.'+ext;await writeFile(out+'/'+name,data);return{file:name,sha256:hash(data),bytes:data.length};}
async function readPSD(name){return readPsd(await readFile(source+'/'+name+'.psd'),{useImageData:true,skipCompositeImageData:true,skipThumbnail:true});}
async function exportSources(){
  for(const file of await readdir(out))await rm(join(out,file),{force:true,recursive:true});
  const manifest={version:'m05a.1',palette:layout.palette,atlases:{},backgrounds:{},frames:{},source:'layered PSDs in art/m03/source',module_anchors:layout.module_anchors};
  for(const[group,defs]of Object.entries(frameDefs())){
    const psd=await readPSD(group),regions={},items=[];let x=2,y=2,rowH=0;const atlasW=256;
    for(const d of defs){const l=psd.children.find(l=>l.name===d.id);if(!l?.imageData)throw Error('PSD layer missing: '+d.id);const pixel=l.imageData;if(pixel.width!==d.size[0]||pixel.height!==d.size[1])throw Error('Unexpected frame dimensions: '+d.id);
      const buffer=await png(pixel);await writeFile(source+'/frames/'+d.id+'.png',buffer);
      if(x+pixel.width+2>atlasW){x=2;y+=rowH+4;rowH=0;}regions[d.id]={frame:{x,y,w:pixel.width,h:pixel.height},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:pixel.width,h:pixel.height},sourceSize:{w:pixel.width,h:pixel.height}};items.push({input:buffer,left:x,top:y});
      manifest.frames[d.id]={asset_id:d.id,state_id:d.slot,slot_id:d.slot,atlas:group,source_canvas:d.size,pivot:d.pivot||[0,0],foot:d.foot||null,muzzle:d.muzzle||null,source_psd:group+'.psd',source_layer:d.id,source_position:d.position,offset:[0,0]};x+=pixel.width+4;rowH=Math.max(rowH,pixel.height);
    }
    const atlasH=Math.pow(2,Math.ceil(Math.log2(y+rowH+2)));const buffer=await sharp({create:{width:atlasW,height:atlasH,channels:4,background:'#00000000'}}).composite(items).png({compressionLevel:9}).toBuffer();const imageFile=await saveHashed(group+'-atlas','png',buffer);
    const json=Buffer.from(JSON.stringify({frames:regions,meta:{app:'Cinder Shift PSD exporter',image:imageFile.file,format:'RGBA8888',size:{w:atlasW,h:atlasH},scale:'1',padding:2,rotation:false}},null,2)+'\n');const atlasFile=await saveHashed(group+'-atlas','json',json);manifest.atlases[group]={image:imageFile,json:atlasFile};
    await writeFile(previews+'/'+group+'-atlas-8x.png',await sharp(buffer).resize(atlasW*8,atlasH*8,{kernel:'nearest'}).png().toBuffer());
  }
  for(const id of ['A','B','C']){const psd=await readPSD('room-'+id);const layers=[];for(const name of ['landscape','architecture']){const layer=psd.children.find(l=>l.name===name);if(!layer?.imageData)throw Error('Room PSD layer missing');const buffer=await png(layer.imageData);layers.push(buffer);if(name==='landscape'&&!manifest.backgrounds.far)manifest.backgrounds.far=await saveHashed('bg-far','png',buffer);if(name==='architecture')manifest.backgrounds[id]=await saveHashed('architecture-'+id.toLowerCase(),'png',buffer);}
    await writeFile(previews+'/bg-'+id.toLowerCase()+'.png',await sharp(layers[0]).composite([{input:layers[1]}]).png().toBuffer());}
  manifest.tile_map={grid:16,rooms:JSON.parse(await readFile('art/m03/animation-contract.json','utf8')).mechanics.viewport,placement:'RoomDefinition solids, cropped at unchanged boundaries'};
  await writeFile('games/cinder-shift/src/art/assets.generated.json',JSON.stringify(manifest,null,2)+'\n');await writeFile(out+'/asset-index.json',JSON.stringify(manifest,null,2)+'\n');
  console.log('Exported raster atlases and static background layers from editable PSDs.');
}
if(process.argv.includes('--import'))await importSources();
await exportSources();
