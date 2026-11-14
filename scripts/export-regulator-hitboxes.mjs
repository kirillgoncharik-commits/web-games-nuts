import {readFile,writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const config=await readFile('games/cinder-shift/game.config.json','utf8');
async function module(path){const source=await readFile(path,'utf8');const code='const config='+config+';\n'+stripTypeScriptTypes(source.replace(/^import[^\n]*\n/gm,''),{mode:'strip'});return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));}
const {regulatorBody,regulatorHitboxes}=await module('games/cinder-shift/src/boss.ts');
const {rooms}=await module('games/cinder-shift/src/room-data.ts');
const r=rooms.M5D,b=r.boss,body=regulatorBody(b.x,b.y,b.width,b.height),boxes=regulatorHitboxes(body);
function drawGeometry(body,boxes,solids){
const rect=(r,fill,stroke="#aac4cd")=>`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${fill}" stroke="${stroke}"/>`;
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="1280" height="720">
<rect width="640" height="360" fill="#101923"/>
<g font-family="monospace" fill="#e5f0f0" font-size="12"><text x="18" y="24">CINDER SHIFT · REGULATOR COLLISION GEOMETRY</text><text x="18" y="47">Same normalized boxes as the game renderer and impact checks.</text><text x="18" y="73">Core y=${boxes.core.y.toFixed(3)}…${(boxes.core.y+boxes.core.height).toFixed(3)}</text><text x="18" y="92">Open shutters clip the armor around this band.</text></g>
${solids.filter(r=>!r.id).map(r=>rect(r,"#243744")).join("")}
${rect(body,"none","#76929e")}
${boxes.armor.map(r=>rect(r,"#3b5260")).join("")}
${rect({x:body.x,y:boxes.core.y,width:body.width,height:boxes.core.height},"#173e3d","#76dcc8")}
${rect(boxes.core,"#76dcc8")}
${rect(solids.find(r=>r.id==="regulator-ricochet"),"#a8cbd5")}
<g fill="none" stroke-width="2"><path d="M295 228H456" stroke="#e5f0f0"/><path d="M295 228L366 216L456 232" stroke="#ffb65b"/><path d="M230 292H418" stroke="#f36d76"/></g>
<g font-family="monospace" fill="#e5f0f0" font-size="11"><text x="378" y="137">Robot sprite bounds</text><text x="268" y="198">W3 reflector</text><text x="245" y="250">Firing shelf</text><text x="215" y="310">Floor volley hits leg armor</text><text x="18" y="342">Paths are schematic. Exact trajectories: regulator-ballistics-model.spec.ts</text></g>
</svg>\n`;
}
await writeFile('docs/cinder-shift/regulator-hitboxes.svg',drawGeometry(body,boxes,r.solids));
await writeFile('docs/cinder-shift/regulator-hitboxes.json',JSON.stringify({body,...boxes,open_aperture:{top:boxes.core.y,bottom:boxes.core.y+boxes.core.height},source:'games/cinder-shift/src/boss.ts',diagram_paths:'schematic; physics is checked with actual Projectiles.step'},null,2)+'\n');
console.log('Exported Regulator hitbox markup from runtime geometry.');
