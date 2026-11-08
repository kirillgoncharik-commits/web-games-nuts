import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = 'art/art-refresh-v1';
const sourceDir = `${root}/source/generated`;
const runtimeDir = 'games/cinder-shift/public/assets/art-refresh-v1';
const previewDir = `${root}/previews`;
const cellSize = 96;
const padding = 2;

// The grid describes the generated source sheet; empty cells are omitted from states.
const families = [
  ['ART-01','turret','art01_turret-master.png',3,2,['off','armored','warning','burst','exposed','destroyed'],'bottom'],
  ['ART-02','security-walker','art02_security_walker-master.png',3,2,['patrol','notice','warning','fire','recovery','destroyed'],'bottom'],
  ['ART-03','ram-charger','art03_ram_charger-master.png',3,2,['idle','windup','charge','recovery','destroyed'],'bottom'],
  ['ART-04','energy-cell','art04_energy_cell-master.png',2,2,['uncollected','carried','installed','socket'],'bottom'],
  ['ART-05','repair-station','art05_repairs-master.png',3,1,['ready','used','protected'],'bottom'],
  ['ART-06','service-cache','art06_caches-master.png',3,3,['salvage-available','salvage-interact','salvage-used','archive-available','archive-interact','archive-used','beacon-available','beacon-interact','beacon-used'],'bottom'],
  ['ART-07','press','art07_press-master.png',2,2,['safe','warning','strike','recovery'],'bottom'],
  ['ART-08','heat-emitter','art08_heat_emitter-master.png',2,2,['cool','warning','active','recovery'],'bottom'],
  ['ART-09','thin-sheet','art09_thin_sheet-master.png',2,1,['intact','broken'],'center'],
  ['ART-10','magnetic-wall','art10_magnetic_wall-master.png',2,1,['idle','pass-ripple'],'center'],
  ['ART-11','phase-curtain','art11_phase_curtain-master.png',3,1,['active','passable','restore'],'center'],
  ['ART-12','ricochet-panel','art12_ricochet_panel-master.png',2,1,['normal','impact'],'center'],
  ['ART-13','power-shutter','art13_power_shutter-master.png',4,1,['closed','opening','open','warning'],'bottom'],
  ['ART-14','terminal','art14_terminals-master.png',4,4,['power-off','cell-off','data-off','exit-off','power-ready','cell-ready','data-ready','exit-ready','power-hold','cell-hold','data-hold','exit-hold','power-done','cell-done','data-done','exit-done'],'bottom'],
  ['ART-15','buffer-discharge','art15_buffer_discharge-master.png',4,1,['ready','absorbed','discharge','spent'],'center'],
  ['ART-16','regulator','art16_regulator_boss-master.png',4,2,['armored','warning','attack','exposed','phase-two','hit','shutdown','destroyed'],'bottom'],
  ['ART-17','window-view','art17_window_views-master.png',2,1,['reactor-view','evacuation-view'],'top'],
  ['ART-18','cargo-landmark','art18_cargo_landmarks-master.png',2,2,['container','rail-crane','power-junction'],'bottom'],
  ['ART-19','foundry-landmark','art19_foundry_landmarks-master.png',2,2,['furnace','process-pipes','press-line'],'bottom'],
  ['ART-20','archive-landmark','art20_archive_landmarks-master.png',2,2,['data-racks','archive-cabinet','transfer-bus'],'bottom'],
  ['ART-21','reactor-landmark','art21_reactor_landmarks-master.png',2,2,['power-bus','cooling-manifold','beacon-mast'],'bottom'],
];

const sha = data => createHash('sha256').update(data).digest('hex');
const loaded = [];
for (const [family,id,file,cols,rows,states,anchor] of families) {
  const path = `${sourceDir}/${file}`;
  const original = await readFile(path);
  const source = sharp(original).ensureAlpha();
  const meta = await source.metadata();
  const frameCount = Math.min(cols * rows, states.length);
  for (let index=0; index<frameCount; index++) {
    const col=index%cols,row=Math.floor(index/cols);
    const left=Math.floor(meta.width*col/cols),top=Math.floor(meta.height*row/rows);
    const right=Math.floor(meta.width*(col+1)/cols),bottom=Math.floor(meta.height*(row+1)/rows);
    const crop=await sharp(original).extract({left,top,width:right-left,height:bottom-top}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let minX=crop.info.width,minY=crop.info.height,maxX=-1,maxY=-1;
    for(let y=0;y<crop.info.height;y++)for(let x=0;x<crop.info.width;x++)if(crop.data[(y*crop.info.width+x)*4+3]>0){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    if(maxX<minX||maxY<minY)throw Error(`empty source frame: ${id}/${states[index]}`);
    const extracted=await sharp(original).extract({left:left+minX,top:top+minY,width:maxX-minX+1,height:maxY-minY+1}).ensureAlpha().resize({width:cellSize-16,height:cellSize-16,fit:'inside',kernel:'nearest'}).png().toBuffer();
    const em=await sharp(extracted).metadata();
    const placedX=Math.floor((cellSize-em.width)/2);
    const placedY=anchor==='center'?Math.floor((cellSize-em.height)/2):anchor==='top'?4:cellSize-em.height-4;
    const rgba=await sharp({create:{width:cellSize,height:cellSize,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:extracted,left:placedX,top:placedY}]).raw().toBuffer();
    // Generated edge antialiasing is snapped to hard alpha; transparent RGB is cleared.
    for(let p=0;p<rgba.length;p+=4){rgba[p+3]=rgba[p+3]>=128?255:0;if(!rgba[p+3])rgba[p]=rgba[p+1]=rgba[p+2]=0;}
    loaded.push({family,id,state:states[index],anchor,source:path,sourceSha256:sha(original),rgba,sourceCanvas:[cellSize,cellSize],pivot:anchor==='center'?[48,48]:anchor==='top'?[48,0]:[48,96]});
  }
}

const columns=8,step=cellSize+padding*2,rows=Math.ceil(loaded.length/columns);
const atlasWidth=columns*step+padding,atlasHeight=rows*step+padding;
const comps=[],frames={},manifestFrames={};
for(let i=0;i<loaded.length;i++){
 const frame=loaded[i],x=padding+(i%columns)*step+padding,y=padding+Math.floor(i/columns)*step+padding;
 const name=`${frame.id}_${frame.state}`;
 comps.push({input:frame.rgba,raw:{width:cellSize,height:cellSize,channels:4},left:x,top:y});
 frames[name]={frame:{x,y,w:cellSize,h:cellSize},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:cellSize,h:cellSize},sourceSize:{w:cellSize,h:cellSize},pivot:{x:frame.pivot[0]/cellSize,y:frame.pivot[1]/cellSize}};
 manifestFrames[name]={family:frame.family,state:frame.state,source:frame.source,source_sha256:frame.sourceSha256,source_canvas:frame.sourceCanvas,pivot:frame.pivot,anchor:frame.anchor};
}
await mkdir(runtimeDir,{recursive:true}); await mkdir(previewDir,{recursive:true});
const atlasPath=`${runtimeDir}/art-refresh-v1.png`;
await sharp({create:{width:atlasWidth,height:atlasHeight,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(comps).png({compressionLevel:9}).toFile(atlasPath);
const atlas=await readFile(atlasPath);
const atlasJsonPath=`${runtimeDir}/art-refresh-v1.json`;
await writeFile(atlasJsonPath,JSON.stringify({frames,meta:{app:'Cinder Shift 64 art-refresh-v1',version:'1.0',image:'art-refresh-v1.png',format:'RGBA8888',size:{w:atlasWidth,h:atlasHeight},scale:'1'}},null,2)+'\n');
const atlasJson=await readFile(atlasJsonPath);
const inventory=await Promise.all(families.map(async ([family,id,file,cols,rows,states])=>{const b=await readFile(`${sourceDir}/${file}`);const m=await sharp(b).metadata();return{family,id,source:`source/generated/${file}`,source_sha256:sha(b),source_size:[m.width,m.height],grid:[cols,rows],states:states.slice(),exported_frames:states.length};}));
const manifest={version:'art-refresh-v1',frame_size:[cellSize,cellSize],padding,atlas:{image:'art-refresh-v1.png',image_sha256:sha(atlas),json:'art-refresh-v1.json',json_sha256:sha(atlasJson),width:atlasWidth,height:atlasHeight},frames:manifestFrames,families:Object.fromEntries(inventory.map(item=>[item.family,{id:item.id,states:item.states,source:item.source,source_sha256:item.source_sha256}]))};
await writeFile(`${runtimeDir}/runtime-manifest.json`,JSON.stringify(manifest,null,2)+'\n');
await writeFile(`${root}/previews/master-inventory.json`,JSON.stringify({version:'art-refresh-v1',generated_at:'2026-11-08',families:inventory},null,2)+'\n');
const thumbW=190,thumbH=128,thumbCols=5,thumbGap=8,thumbRows=Math.ceil(loaded.length/thumbCols);
const sheetW=thumbCols*(thumbW+thumbGap)+thumbGap,sheetH=thumbRows*(thumbH+thumbGap)+thumbGap;
const tileComps=[];
for(let i=0;i<loaded.length;i++){
 const frame=loaded[i],x=thumbGap+(i%thumbCols)*(thumbW+thumbGap),y=thumbGap+Math.floor(i/thumbCols)*(thumbH+thumbGap),name=`${frame.id}_${frame.state}`;
 const rect=frames[name].frame;
 const cropped=await sharp(atlas).extract({left:rect.x,top:rect.y,width:rect.w,height:rect.h}).resize({width:96,height:96,fit:'contain',kernel:'nearest'}).png().toBuffer();
 const label=Buffer.from(`<svg width="${thumbW}" height="24"><rect width="100%" height="100%" fill="#213747"/><text x="6" y="17" fill="#edf1ec" font-family="monospace" font-size="9">${name}</text></svg>`);
 tileComps.push({input:cropped,left:x+Math.floor((thumbW-96)/2),top:y});
 tileComps.push({input:label,left:x,top:y+thumbH-24});
}
const previewPath=`${previewDir}/runtime-contact-sheet-1x.png`;
await sharp({create:{width:sheetW,height:sheetH,channels:4,background:'#111823'}}).composite(tileComps).png().toFile(previewPath);
await sharp(previewPath).resize({width:sheetW*2,height:sheetH*2,kernel:'nearest'}).png().toFile(`${previewDir}/runtime-contact-sheet-2x.png`);
console.log(`Exported ${loaded.length} frames (${atlasWidth}x${atlasHeight}), atlas ${atlas.length} bytes, sha256 ${sha(atlas)}`);
