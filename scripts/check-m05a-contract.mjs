import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';import assert from'node:assert/strict';import{methodText}from'./m03-contract-utils.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),read=p=>readFile('games/cinder-shift/'+p,'utf8');
export async function checkM05A(c){
 for(const[file,sha]of Object.entries(c.frozen_modules))assert.equal(hash(await read(file)),sha,'M05A frozen mechanics '+file);
 const scene=await read('src/room-scene.ts'),audio=s=>s.replace(/this\.hooks\.effects\.(?:tone|play|clearCombat)\([^;]*\);/g,'');
 for(const[name,sha]of Object.entries(c.room_methods))assert.equal(hash(audio(methodText(scene,name))),sha,'M05A method changed beyond semantic audio: '+name);
 const mission=await read('src/mission.ts');assert.equal(hash(methodText(mission,'damage')),c.mission_damage_sha);
 for(const[name,sha]of Object.entries(c.clock_methods))assert.equal(hash(methodText(mission,name)),sha,'Fixed-step clock changed');
 const render=await read('src/render.ts');assert.equal(hash(render.slice(render.indexOf('    const pose='),render.indexOf('    if(room.target'))),c.rig_binding_sha,'Mira rig, phase or muzzle changed');
 const index=JSON.parse(await read('src/art/assets.generated.json'));for(const[id,old]of Object.entries(c.frame_anchors)){const f=index.frames[id];assert.deepEqual({source_canvas:f.source_canvas,pivot:f.pivot,foot:f.foot,muzzle:f.muzzle,slot_id:f.slot_id},old,'Anchor '+id);}assert.deepEqual(index.module_anchors,c.module_anchors);
 const profile=JSON.parse(await read('src/art/profile.generated.json'));assert.equal(hash(await readFile('games/cinder-shift/public/assets/m05a/'+profile.file)),profile.sha256);assert.equal(profile.width,48);assert.equal(profile.height,64);
 console.log('M05A contract: unchanged balance, AI, movement, event plans, damage and rig; semantic audio and same-canvas repaint explicitly allowed.');
}
