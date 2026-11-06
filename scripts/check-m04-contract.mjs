import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';import assert from'node:assert/strict';import{methodText}from'./m03-contract-utils.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),read=p=>readFile('games/cinder-shift/'+p,'utf8');
export async function checkM04(c){
 for(const [file,sha]of Object.entries(c.frozen_modules))assert.equal(hash(await read(file)),sha,'Frozen M03 module: '+file);
 for(const [file,field]of [['src/room-scene.ts','frozen_room_methods'],['src/player.ts','frozen_player_methods'],['src/mission.ts','frozen_clock_methods']]){const source=await read(file);for(const [method,sha]of Object.entries(c[field]))assert.equal(hash(methodText(source,method)),sha,'Frozen method '+file+':'+method);}
 const enemies=(await read('src/enemies.ts')).replace(/'(?:Сервисный ходок|Сканирующий дрон|walker-shot|drone-shot)'/g,"'ENEMY_SOURCE'");assert.equal(hash(enemies),c.enemy_logic_sha,'Enemy AI changed');
 const mission=await read('src/room-data.ts'),rooms=mission.slice(mission.indexOf('export const rooms:'),mission.indexOf('\n};',mission.indexOf('export const rooms:'))+3).replace(/name(?:Key)?:'[^']*',subtitle(?:Key)?:'[^']*',/g,'');assert.equal(hash(rooms),c.base_rooms_sha,'Base room geometry changed');
 const render=await read('src/render.ts');assert.equal(hash(render.slice(render.indexOf('    const pose='),render.indexOf('    if(room.target'))),c.rig_binding_sha,'Hero pose/phase/muzzle binding changed');
 const index=JSON.parse(await read('src/art/assets.generated.json'));for(const [id,old]of Object.entries(c.frame_anchors)){const f=index.frames[id];assert.ok(f,'Missing animation slot '+id);assert.deepEqual({source_canvas:f.source_canvas,pivot:f.pivot,foot:f.foot,muzzle:f.muzzle,slot_id:f.slot_id},old,'Anchor changed '+id);}assert.deepEqual(index.module_anchors,c.module_anchors);
 console.log('M04 contract: explicit W1/M1/D1/E02/E03 changes; base geometry, AI, damage, transitions and animation binding frozen.');
}
