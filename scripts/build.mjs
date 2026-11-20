import { build } from 'vite';
import {buildMetadata} from './build-metadata.mjs';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const gameConfig=JSON.parse(await readFile('games/cinder-shift/game.config.json','utf8'));
const targetManifest=JSON.parse(await readFile('games/cinder-shift/platforms/targets.json','utf8'));
const target=process.env.CINDER_TARGET||targetManifest.default_target;
const targetProfile=targetManifest.targets[target];
if(!targetProfile)throw Error('unknown_build_target:'+target);
if(process.env.SOURCE_SHA && process.env.SOURCE_SHA!==sha)throw Error('SOURCE_SHA must match the actual checkout commit');
const dirty=Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim());
process.env.SOURCE_SHA=sha;process.env.CINDER_TARGET=target;
const metadata=buildMetadata();process.env.CINDER_BUILD_META=JSON.stringify(metadata);
await build();
const dir='dist/cinder-shift', files=[];
if(target!=='web')await rm(join(dir,'game-analytics.js'),{force:true});
if(target==='playgama'){
 const path=join(dir,'boot-guard.js'),before=await readFile(path,'utf8');
 const locale=/let locale=\/\^ru\(\?:-\|\$\)\/i\.test\(navigator\.language\)\?'ru':'en';try\{const saved=localStorage\.getItem\('cinder-shift-language-v1'\);if\(saved==='en'\|\|saved==='ru'\)locale=saved;\}catch\{\}/;
 const after=before.replace(locale,"let locale='en';");
 if(after===before)throw Error('playgama_preboot_locale_contract_changed');
 await writeFile(path,after);
}
async function walk(path){for(const name of (await readdir(path)).sort()){const file=join(path,name);if((await stat(file)).isDirectory())await walk(file);else{const bytes=await readFile(file);files.push({path:relative(dir,file),bytes:bytes.length,gzip_bytes:gzipSync(bytes).length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
await walk(dir);
await writeFile(join(dir,'build-manifest.json'),JSON.stringify({...metadata,game_id:'r01',gameplay_base_sha:process.env.CINDER_GAMEPLAY_BASE_SHA||sha,target,platform_status:targetProfile.integration_status,source_sha:sha,source_dirty:dirty,stage:gameConfig.stage,files,total_bytes:files.reduce((n,f)=>n+f.bytes,0),total_gzip_bytes:files.reduce((n,f)=>n+f.gzip_bytes,0)},null,2)+'\n');
console.log(`Artifact: ${dir}; ${files.reduce((n,f)=>n+f.gzip_bytes,0)} gzip bytes; source ${sha}`);
