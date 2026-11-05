import { cp, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const target=process.argv[2];
if(!target)throw Error('Usage: npm run integrate -- /absolute/path/to/nutsbid-checkout');
const source=resolve('dist/cinder-shift'), dest=resolve(target,'public/games/cinder-shift');
const manifest=JSON.parse(await readFile(join(source,'build-manifest.json'),'utf8'));
if(manifest.game_id!=='r01' || !/^[a-f0-9]{40}$/.test(manifest.source_sha))throw Error('Invalid source manifest');
if(manifest.source_dirty!==false)throw Error('Build from a clean committed game checkout before integration');
for(const file of manifest.files){const bytes=await readFile(join(source,file.path));if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error(`Changed artifact: ${file.path}`);}
const backup=resolve(target,'.cinder-shift-previous');
try{await readFile(join(dest,'build-manifest.json'));await rm(backup,{recursive:true,force:true});await rename(dest,backup);}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(dest,{recursive:true});await cp(source,dest,{recursive:true});
console.log(`Integrated ${manifest.build_id}, source ${manifest.source_sha} into ${dest}. No deployment performed.`);
