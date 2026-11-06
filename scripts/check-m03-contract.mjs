import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {checkM04} from './check-m04-contract.mjs';
import {methodText} from './m03-contract-utils.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
const read=p=>readFile(p,'utf8'),root='games/cinder-shift/';
const baseline=JSON.parse(await read('art/m03/animation-contract.json'));
let m04=null;try{m04=JSON.parse(await read('art/m04/mechanics-contract.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(m04)await checkM04(m04);else{
for(const [file,sha] of Object.entries(baseline.core_hashes))assert.equal(digest(await read(root+file)),sha,'M02 core changed: '+file);
const scene=await read(root+'src/room-scene.ts');
for(const [method,sha] of Object.entries(baseline.room_method_hashes))assert.equal(digest(methodText(scene,method)),sha,'M02 simulation changed: '+method);
}
const config=JSON.parse(await read(root+'game.config.json'));
for(const [key,value] of Object.entries(baseline.mechanics))assert.deepEqual(config[key],value,'M02 mechanics changed: '+key);
const dir=root+'public/assets/m03/',index=JSON.parse(await read(dir+'asset-index.json'));
let bytes=0;
for(const item of [...Object.values(index.backgrounds),...Object.values(index.atlases).flatMap(a=>[a.image,a.json])]){
 const buffer=await readFile(dir+item.file);assert.equal(digest(buffer),item.sha256);bytes+=buffer.length;
}
assert.ok(bytes<5*1024*1024,'Added art budget');
for(const [name,atlas] of Object.entries(index.atlases)){
 const json=JSON.parse(await read(dir+atlas.json.file));const {data,info}=await sharp(dir+atlas.image.file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const occupied=[];
 for(const [id,value] of Object.entries(json.frames)){
  const f=value.frame;assert.equal(value.rotated,false);assert.equal(value.trimmed,false);assert.ok(f.x>=2&&f.y>=2&&f.x+f.w<=info.width-2&&f.y+f.h<=info.height-2);
  for(const other of occupied)assert.ok(f.x+f.w+2<=other.x||other.x+other.w+2<=f.x||f.y+f.h+2<=other.y||other.y+other.h+2<=f.y,'Atlas padding '+id);
  occupied.push(f);assert.deepEqual([f.w,f.h],index.frames[id].source_canvas);
 }
 for(let i=0;i<data.length;i+=4){assert.ok(data[i+3]===0||data[i+3]===255,'Alpha halo '+name);if(!data[i+3])assert.equal(data[i]+data[i+1]+data[i+2],0,'Transparent RGB halo');}
}
const render=await read(root+'src/render.ts'),styles=await read(root+'src/style.css')+await read(root+'src/ui.css');
assert.ok(!/tweens?\.|add\.sprite|\.anims\.|crossfade|motion.blur/i.test(render));assert.ok(!/\btransition\s*:|\banimation\s*:/i.test(styles));
assert.ok(render.indexOf(m04?'if(this.debugEnabled())':'if((document.querySelector(\'#debug-bodies\')')<render.indexOf('strokeRect'));
console.log(`Art/animation contract OK; baseline balance preserved; ${Object.keys(index.frames).length} frames; ${bytes} art bytes.`);
