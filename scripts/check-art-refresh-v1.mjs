import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const root='art/art-refresh-v1/',runtime='games/cinder-shift/public/assets/art-refresh-v1/';
const manifest=JSON.parse(await readFile(runtime+'runtime-manifest.json','utf8'));
const atlasJsonBytes=await readFile(runtime+manifest.atlas.json),atlasJson=JSON.parse(atlasJsonBytes.toString('utf8'));
const atlasBytes=await readFile(runtime+manifest.atlas.image);
assert.equal(digest(atlasBytes),manifest.atlas.image_sha256,'art refresh atlas hash');
assert.equal(digest(atlasJsonBytes),manifest.atlas.json_sha256,'art refresh frame map hash');
const {data,info}=await sharp(atlasBytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
assert.deepEqual([info.width,info.height],[manifest.atlas.width,manifest.atlas.height]);
const render=await readFile('games/cinder-shift/src/render.ts','utf8');
const expectedFamilies=Array.from({length:21},(_,i)=>`ART-${String(i+1).padStart(2,'0')}`);
assert.deepEqual(Object.keys(manifest.families).sort(),expectedFamilies,'all 21 art families');
let frameTotal=0;
const occupied=[];
for(const [family,details] of Object.entries(manifest.families)){
 const source=await readFile(root+details.source);
 assert.equal(digest(source),details.source_sha256,`${family} source hash`);
 assert.ok(render.includes(details.id.replaceAll('-','-')),`${family} runtime binding ${details.id}`);
 for(const state of details.states){
  const name=`${details.id}_${state}`,meta=manifest.frames[name],entry=atlasJson.frames[name];
  assert.ok(meta&&entry,`${family} frame ${name}`);
  assert.equal(entry.rotated,false);assert.equal(entry.trimmed,false);
  assert.deepEqual([entry.frame.w,entry.frame.h],[...manifest.frame_size]);
  const {x,y,w,h}=entry.frame;
  assert.ok(x>=manifest.padding&&y>=manifest.padding&&x+w<=info.width-manifest.padding&&y+h<=info.height-manifest.padding,`${name} frame bounds`);
  for(const other of occupied)assert.ok(x+w+manifest.padding<=other.x||other.x+other.w+manifest.padding<=x||y+h+manifest.padding<=other.y||other.y+other.h+manifest.padding<=y,`${name} has atlas padding`);
  occupied.push({x,y,w,h});frameTotal++;
 }
}
for(let i=0;i<data.length;i+=4){assert.ok(data[i+3]===0||data[i+3]===255,'hard alpha');if(!data[i+3])assert.equal(data[i]+data[i+1]+data[i+2],0,'transparent pixels have clean RGB');}
assert.ok(atlasBytes.length<5*1024*1024,'runtime art budget under 5 MiB');
const map=await readFile('games/cinder-shift/src/ui/world-map.ts','utf8'),mapCss=await readFile('games/cinder-shift/src/ui-art.css','utf8');
assert.doesNotMatch(map,/style\s*:/,'mission pins must not emit inline style');
for(const [id,left,top] of [['airlock','10%','42.3077%'],['cargo','30%','73.0769%'],['foundry','50%','42.3077%'],['archive','70%','73.0769%'],['reactor','90%','42.3077%']])assert.ok(mapCss.includes(`map-pin-${id}{left:${left};top:${top}}`),`map pin ${id} coordinate class`);
const mobile=await readFile('games/cinder-shift/src/ui/mobile-layout.ts','utf8'),ui=await readFile('games/cinder-shift/src/ui.css','utf8');
assert.match(mobile,/width:196,height:60/);assert.match(mobile,/width:264,height:60/);
assert.match(ui,/\.hud-pause\{width:48px;min-width:48px;height:48px;min-height:48px/);
assert.match(ui,/\.touch-controls \.directions,\.touch-controls \.actions\{gap:8px\}/);
assert.match(render,/energy-cell_socket/);assert.match(render,/magnetic-wall_\$\{crossing\?['"]pass-ripple/);assert.match(render,/phase-curtain_\$\{frame\}/);assert.match(render,/regulator_\$\{bossState\}/);
const coverage=JSON.parse(await readFile(root+'coverage.json','utf8')),provenance=JSON.parse(await readFile(root+'provenance.json','utf8'));
assert.deepEqual(coverage.families.map(f=>f.family).sort(),expectedFamilies,'coverage includes all art families');
assert.deepEqual(coverage.visual_fixes.map(f=>f.id).sort(),Array.from({length:10},(_,i)=>`V${String(i+1).padStart(2,'0')}`).sort(),'coverage includes V01-V10');
for(const f of coverage.families){assert.deepEqual([f.generated,f.processed,f.exported,f.automated_verified],[true,true,true,true],`${f.family} production flags`);assert.equal(f.visually_verified,false);assert.equal(f.published,false);assert.equal(f.frames.length,manifest.families[f.family].states.length);for(const state of f.frames)assert.equal(state.frame,`${f.id}_${state.state}`);}
for(const f of coverage.visual_fixes){for(const flag of ['generated','processed','exported','integrated','automated_verified','visually_verified','published'])assert.equal(typeof f[flag],'boolean',`${f.id} ${flag} flag`);assert.equal(f.published,false);}
assert.equal(provenance.selected.length,21);assert.ok(provenance.prompt_recovery_note.includes('reconstruction'));
for(const item of provenance.selected){assert.equal(item.sha256,manifest.families[item.family].source_sha256,`${item.family} provenance hash`);const ora=await readFile(`art/art-refresh-v1/source/editable/${item.family}.ora`);assert.equal(ora.subarray(0,2).toString(),'PK',`${item.family} editable OpenRaster source`);}
console.log(`Art refresh contract OK: ${frameTotal} frames, ${(atlasBytes.length/1024).toFixed(1)} KiB runtime atlas; source, alpha, padding, provenance, coverage, map and touch contracts verified.`);
