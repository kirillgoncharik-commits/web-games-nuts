import sharp from'sharp';
import{mkdir,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';

const directory='games/cinder-shift/public/assets/m06';
const sourceDirectory='art/m06';
await mkdir(directory,{recursive:true});
const result={};
for(const name of ['loading','menu']){
 const input=sourceDirectory+'/'+name+'-master.png';
 const master=await readFile(input),meta=await sharp(master).metadata();
 let bytes=await sharp(master).resize({width:1672,withoutEnlargement:true}).webp({quality:82,effort:6}).toBuffer();
 if(bytes.length>384*1024)bytes=await sharp(master).resize({width:1440,withoutEnlargement:true}).webp({quality:74,effort:6}).toBuffer();
 if(bytes.length>384*1024)throw Error(name+'_art_exceeds_384KiB');
 const sha=createHash('sha256').update(bytes).digest('hex');
 const file=name+'-'+sha.slice(0,10)+'.webp';
 await writeFile(directory+'/'+file,bytes);
 result[name]={file,bytes:bytes.length,sha256:sha,master_sha256:createHash('sha256').update(master).digest('hex'),master_width:meta.width,master_height:meta.height,source:'Cinder_Shift_64_Remaining_Blocks_Work.zip: assets/'+name+'-master.png'};
}
await writeFile('games/cinder-shift/src/art/promo.generated.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
