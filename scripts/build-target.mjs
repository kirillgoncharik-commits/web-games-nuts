import{readFile}from'node:fs/promises';
import{spawnSync}from'node:child_process';
const targets=JSON.parse(await readFile('games/cinder-shift/platforms/targets.json','utf8'));
const target=process.argv[2]||targets.default_target;
if(!Object.hasOwn(targets.targets,target))throw Error('unknown_build_target:'+target);
const result=spawnSync('npm',['run','build'],{stdio:'inherit',env:{...process.env,CINDER_TARGET:target}});
if(result.error)throw result.error;
process.exitCode=result.status??1;
