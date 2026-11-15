import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {definitions} from '../audio/m06/effects.mjs';
import {renderDefinition,wav,rate} from '../audio/m05a/score.mjs';
const manifestPath='games/cinder-shift/src/audio/assets.generated.json';
const manifest=JSON.parse(await readFile(manifestPath));
for(const id of ['shield_absorb','repair_suit','ability_ready','boss_shutdown']){
 const definition=definitions[id],samples=renderDefinition(id,definition),bytes=wav(samples),sha=createHash('sha256').update(bytes).digest('hex'),file=`${id}-${sha.slice(0,10)}.wav`;
 const runtime_path='games/cinder-shift/public/assets/audio/'+file,master_path='audio/m06/wav/effects/'+id+'.wav';
 await mkdir('audio/m06/wav/effects',{recursive:true});await writeFile(runtime_path,bytes);await writeFile(master_path,bytes);
 manifest.sfx[id]={...manifest.sfx.hit_open,...definition,id,file,sha256:sha,bytes:bytes.length,seconds:samples.length/rate,rms:Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length),source_project:'audio/m06/effects.mjs',runtime_path,master_path};delete manifest.sfx[id].parts;
}
manifest.music_themes=[...new Set([...manifest.music_themes,'shutdown','evacuation'])];
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('RW2: four original cues exported; existing audio bytes retained.');
