import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';import assert from'node:assert/strict';import sharp from'sharp';import{methodText}from'./m03-contract-utils.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFile('games/cinder-shift/'+p,'utf8');
export async function checkM05B1(contract){
 const prior=JSON.parse(await readFile('art/m05a/mechanics-contract.json','utf8'));
 for(const file of ['src/input.ts','src/geometry.ts','src/art/rig.ts'])if(prior.frozen_modules[file])assert.equal(hash(await read(file)),prior.frozen_modules[file],file);
 const mission=await read('src/mission.ts');for(const[name,sha]of Object.entries(prior.clock_methods))assert.equal(hash(methodText(mission,name)),sha,'Fixed-step clock changed');
 const render=await read('src/render.ts');const poseStart=render.indexOf('    const pose='),poseEnd=render.indexOf('    const hit=',poseStart),placementStart=render.indexOf("    this.sprite('mira-shadow'",poseEnd),placementEnd=render.indexOf('    if(room.target',placementStart);assert.ok(poseStart>=0&&poseEnd>poseStart&&placementStart>poseEnd&&placementEnd>placementStart,'Mira rig binding markers');assert.equal(hash(render.slice(poseStart,poseEnd)+render.slice(placementStart,placementEnd)),prior.rig_binding_sha,'Mira rig binding');
 const index=JSON.parse(await read('src/art/assets.generated.json'));for(const[id,old]of Object.entries(prior.frame_anchors)){const f=index.frames[id];assert.deepEqual({source_canvas:f.source_canvas,pivot:f.pivot,foot:f.foot,muzzle:f.muzzle,slot_id:f.slot_id},old,'Anchor '+id);}assert.deepEqual(index.module_anchors,prior.module_anchors);
 const profile=JSON.parse(await read('src/art/profile.generated.json'));assert.equal(hash(await readFile('games/cinder-shift/public/assets/m05a/'+profile.file)),profile.sha256);
 const promo=JSON.parse(await read('src/art/promo.generated.json'));let bytes=0;
 for(const[name,item]of Object.entries(promo)){const b=await readFile('games/cinder-shift/public/assets/m05b1/'+item.file);assert.equal(hash(b),item.sha256);assert.equal(b.length,item.bytes);assert.ok(b.length<=384*1024);const meta=await sharp(b).metadata();assert.ok(meta.width>=1280);assert.ok(Math.abs(meta.width/meta.height-1672/941)<.01);assert.equal(hash(await readFile('art/m05b1/'+name+'-master.png')),contract.master_hashes[name]);bytes+=b.length;}
 assert.ok(bytes<=768*1024);
 console.log('M05B.1 contract: AI profiles, campaign, piercing, air dash and room buffer intentionally extended; existing damage/balance, input, geometry, fixed clock, Mira anchors and rig protected. Promo exports '+bytes+' bytes.');
}
