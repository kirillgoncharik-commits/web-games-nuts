import sharp from 'sharp';import{mkdir,readFile,writeFile,rm,readdir}from'node:fs/promises';import{createHash}from'node:crypto';
const directory='games/cinder-shift/public/assets/m05b1';await mkdir(directory,{recursive:true});const result={};
for(const name of ['loading','menu']){
 const input='art/m05b1/'+name+'-master.png',meta=await sharp(input).metadata();let bytes=await sharp(input).resize({width:1672,withoutEnlargement:true}).webp({quality:82,effort:6}).toBuffer();
 if(bytes.length>384*1024)bytes=await sharp(input).resize({width:1440,withoutEnlargement:true}).webp({quality:74,effort:6}).toBuffer();
 if(bytes.length>384*1024)throw Error('promo_budget');const sha=createHash('sha256').update(bytes).digest('hex'),file=name+'-'+sha.slice(0,10)+'.webp';
 for(const old of await readdir(directory))if(old.startsWith(name+'-')&&old!==file)await rm(directory+'/'+old);
 await writeFile(directory+'/'+file,bytes);result[name]={file,bytes:bytes.length,sha256:sha,master_width:meta.width,master_height:meta.height,source:'Supplied DOCX revision 0.4, word/media/image'+(name==='loading'?'1':'2')+'.png'};
}
await writeFile('games/cinder-shift/src/art/promo.generated.json',JSON.stringify(result,null,2)+'\n');
await rm('games/cinder-shift/public/promo.css',{force:true});
console.log(JSON.stringify(result,null,2));
