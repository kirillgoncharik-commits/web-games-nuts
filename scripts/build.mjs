import { build } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const sha=process.env.SOURCE_SHA || execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dirty=Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim());
process.env.SOURCE_SHA=sha;
await build();
const dir='dist/cinder-shift', files=[];
async function walk(path){for(const name of (await readdir(path)).sort()){const file=join(path,name);if((await stat(file)).isDirectory())await walk(file);else{const bytes=await readFile(file);files.push({path:relative(dir,file),bytes:bytes.length,gzip_bytes:gzipSync(bytes).length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
await walk(dir);
await writeFile(join(dir,'build-manifest.json'),JSON.stringify({game_id:'r01',build_id:pkg.version,source_sha:sha,source_dirty:dirty,stage:'M0 technical preview',files,total_bytes:files.reduce((n,f)=>n+f.bytes,0),total_gzip_bytes:files.reduce((n,f)=>n+f.gzip_bytes,0)},null,2)+'\n');
console.log(`Artifact: ${dir}; ${files.reduce((n,f)=>n+f.gzip_bytes,0)} gzip bytes; source ${sha}`);
