import {build} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const source=resolve('qa-work/harness-source');
await mkdir(source,{recursive:true});
const html=(await readFile('games/cinder-shift/index.html','utf8'))
 .replace('src="./src/main.ts"','src="../../tests/encounter-harness.ts"');
await writeFile(resolve(source,'index.html'),html);
await build({configFile:resolve('vite.config.ts'),root:source,publicDir:resolve('games/cinder-shift/public'),build:{outDir:resolve('qa-work/rework-harness'),emptyOutDir:true}});
console.log('Encounter fixtures built outside the deliverable dist/ tree.');
