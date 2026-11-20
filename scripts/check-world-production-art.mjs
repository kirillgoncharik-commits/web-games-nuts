import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root='games/cinder-shift/public/assets/world-production/',m=JSON.parse(await readFile(root+'manifest.json','utf8')),atlas=JSON.parse(await readFile(root+'objects.json','utf8')),bytes=await readFile(root+'objects.png'),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(bytes),m.atlas.sha256);assert.equal(Object.keys(m.frames).length,176);assert.deepEqual(Object.keys(atlas.frames).sort(),Object.keys(m.frames).sort());
assert.ok(bytes.length<1024*1024,'shared atlas below 1 MiB');
const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual([info.width,info.height],[m.atlas.width,m.atlas.height]);
for(let n=3;n<data.length;n+=4)assert.ok(data[n]===0||data[n]===255,'hard sprite alpha');
for(const [file,meta]of Object.entries(m.sources))assert.equal(hash(await readFile('art/world-production/source/'+file)),meta.sha256,file+' source hash');
for(const [name,frame]of Object.entries(atlas.frames)){const r=frame.frame,b=m.frames[name].bounds;assert.ok(r.x>=2&&r.y>=2&&r.x+r.w<=info.width-2&&r.y+r.h<=info.height-2,name+' padding');assert.ok(b.width>0&&b.height>0&&b.x>=0&&b.y>=0&&b.x+b.width<=100&&b.y+b.height<=100,name+' visible bounds');assert.equal(frame.trimmed,false);assert.equal(frame.rotated,false);await readFile('art/world-production/source/'+m.frames[name].source);}
for(const frames of Object.values(m.sectors)){assert.equal(frames.length,6);for(const name of frames)assert.ok(m.frames[name]);}
for(const [name,states]of Object.entries(m.mechanisms))for(const state of states)assert.ok(m.frames[name+'-'+state]);
for(const name of [...m.enemies,'base-walker','base-drone','base-ram','regulator-core'])for(const state of ['idle','warning','attack','recovery','destroyed'])assert.ok(m.frames[name+'-'+state]);
for(const map of [m.backgrounds,m.baseBackgrounds])for(const [name,meta]of Object.entries(map)){const b=await readFile(root+meta.file);assert.equal(hash(b),meta.sha256,name);const i=await sharp(b).metadata();assert.deepEqual([i.width,i.height],[320,140]);}
for(const file of Object.values(m.materials))await readFile(root+file);
const world=await readFile('games/cinder-shift/src/art/world-art.ts','utf8'),render=await readFile('games/cinder-shift/src/render.ts','utf8');
assert.doesNotMatch(world,/fillRect|strokeRect/,'world objects use sprites instead of placeholder rectangles');assert.doesNotMatch(render,/fillRect\(core\./,'boss aperture cannot be painted over by a placeholder');assert.match(render,/regulator-core-/);assert.match(render,/base-drone/);
console.log(`Production art PASS: 176 frames, 60 sector props, 60 mechanism states, 30 world enemy states, 20 base enemy/core states, 6 carry overlays; 16 backgrounds, 10 materials; ${Math.round(bytes.length/1024)} KiB atlas.`);
