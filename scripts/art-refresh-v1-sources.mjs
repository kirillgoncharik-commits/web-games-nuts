import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const defs=[
 ['ART-01','turret','art01_turret-master.png',3,2,['off','armored','warning','burst','exposed','destroyed']],
 ['ART-02','security-walker','art02_security_walker-master.png',3,2,['patrol','notice','warning','fire','recovery','destroyed']],
 ['ART-03','ram-charger','art03_ram_charger-master.png',3,2,['idle','windup','charge','recovery','destroyed']],
 ['ART-04','energy-cell','art04_energy_cell-master.png',2,2,['uncollected','carried','installed','socket']],
 ['ART-05','repair-station','art05_repairs-master.png',3,1,['ready','used','protected']],
 ['ART-06','service-cache','art06_caches-master.png',3,3,['salvage-available','salvage-interact','salvage-used','archive-available','archive-interact','archive-used','beacon-available','beacon-interact','beacon-used']],
 ['ART-07','press','art07_press-master.png',2,2,['safe','warning','strike','recovery']],
 ['ART-08','heat-emitter','art08_heat_emitter-master.png',2,2,['cool','warning','active','recovery']],
 ['ART-09','thin-sheet','art09_thin_sheet-master.png',2,1,['intact','broken']],
 ['ART-10','magnetic-wall','art10_magnetic_wall-master.png',2,1,['idle','pass-ripple']],
 ['ART-11','phase-curtain','art11_phase_curtain-master.png',3,1,['active','passable','restore']],
 ['ART-12','ricochet-panel','art12_ricochet_panel-master.png',2,1,['normal','impact']],
 ['ART-13','power-shutter','art13_power_shutter-master.png',4,1,['closed','opening','open','warning']],
 ['ART-14','terminal','art14_terminals-master.png',4,4,['power-off','cell-off','data-off','exit-off','power-ready','cell-ready','data-ready','exit-ready','power-hold','cell-hold','data-hold','exit-hold','power-done','cell-done','data-done','exit-done']],
 ['ART-15','buffer-discharge','art15_buffer_discharge-master.png',4,1,['ready','absorbed','discharge','spent']],
 ['ART-16','regulator','art16_regulator_boss-master.png',4,2,['armored','warning','attack','exposed','phase-two','hit','shutdown','destroyed']],
 ['ART-17','window-view','art17_window_views-master.png',2,1,['reactor-view','evacuation-view']],
 ['ART-18','cargo-landmark','art18_cargo_landmarks-master.png',2,2,['container','rail-crane','power-junction']],
 ['ART-19','foundry-landmark','art19_foundry_landmarks-master.png',2,2,['furnace','process-pipes','press-line']],
 ['ART-20','archive-landmark','art20_archive_landmarks-master.png',2,2,['data-racks','archive-cabinet','transfer-bus']],
 ['ART-21','reactor-landmark','art21_reactor_landmarks-master.png',2,2,['power-bus','cooling-manifold','beacon-mast']],
];
const sourceDir='art/art-refresh-v1/source/generated',dest='art/art-refresh-v1/source/editable';
await mkdir(dest,{recursive:true});
for(const [family,id,file,cols,rows,states] of defs){
 const bytes=await readFile(join(sourceDir,file)),meta=await sharp(bytes).metadata(),tmp=await mkdtemp(join(tmpdir(),'cinder-ora-')),count=Math.min(cols*rows,states.length);
 try{
  await mkdir(join(tmp,'data'),{recursive:true});const layers=[];let firstLayer;
  for(let i=0;i<count;i++){
   const col=i%cols,row=Math.floor(i/cols),left=Math.floor(meta.width*col/cols),top=Math.floor(meta.height*row/rows),right=Math.floor(meta.width*(col+1)/cols),bottom=Math.floor(meta.height*(row+1)/rows),crop=await sharp(bytes).extract({left,top,width:right-left,height:bottom-top}).png().toBuffer(),name='frame-'+String(i+1).padStart(2,'0')+'.png';
   await writeFile(join(tmp,'data',name),crop);
   if(i===0)firstLayer={input:crop,left,top};
   layers.push('<layer name=\"'+family+' '+states[i]+'\" src=\"data/'+name+'\" opacity=\"1.0\" visibility=\"'+(i===0?'visible':'hidden')+'\" composite-op=\"svg:src-over\" x=\"'+left+'\" y=\"'+top+'\"/>');
  }
  const xml='<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<image version=\"0.0.1\" w=\"'+meta.width+'\" h=\"'+meta.height+'\" name=\"'+family+' '+id+'\">\n  <stack>\n    '+layers.reverse().join('\n    ')+'\n  </stack>\n</image>\n';
  await writeFile(join(tmp,'stack.xml'),xml);await writeFile(join(tmp,'mimetype'),'image/openraster');
  const merged=await sharp({create:{width:meta.width,height:meta.height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([firstLayer]).png().toBuffer();
  await writeFile(join(tmp,'mergedimage.png'),merged);
  await sharp(merged).resize({width:256,fit:'inside',kernel:'nearest'}).png().toFile(join(tmp,'thumbnail.png'));
  const ora=resolve(dest,family+'.ora');await rm(ora,{force:true});execFileSync('zip',['-q','-0',ora,'mimetype'],{cwd:tmp});execFileSync('zip',['-q','-r',ora,'.','-x','mimetype'],{cwd:tmp});
  console.log(family+': '+count+' editable state layers ('+meta.width+'x'+meta.height+' source canvas)');
 }finally{await rm(tmp,{recursive:true,force:true});}
}
