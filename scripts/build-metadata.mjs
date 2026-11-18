import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// One object is embedded into the JS entry and written into its artifact manifest.
export function buildMetadata(){
  const version=JSON.parse(readFileSync('package.json','utf8')).version;
  if(!/^\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.[1-9]\d*)?$/.test(version))throw Error('invalid_product_version');
  const source_sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if(process.env.SOURCE_SHA&&process.env.SOURCE_SHA!==source_sha)throw Error('SOURCE_SHA differs from checkout');
  const source_dirty=Boolean(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{encoding:'utf8'}).trim());
  const designated=process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_WORKFLOW==='Cinder Shift artifact';
  const built_at_utc=process.env.CINDER_BUILT_AT||new Date().toISOString();
  const channel=designated?'preview':process.env.GITHUB_ACTIONS==='true'?'verification':'local';
  const build_id=designated?`cinder-v1.b${process.env.GITHUB_RUN_NUMBER}.a${process.env.GITHUB_RUN_ATTEMPT}`:
    channel==='verification'?`verify.${process.env.GITHUB_RUN_ID}.a${process.env.GITHUB_RUN_ATTEMPT}`:
    `local.${built_at_utc.replace(/[-:.]/g,'')}${source_dirty?'.dirty':''}`;
  if(designated&&source_dirty)throw Error('candidate_requires_clean_source');
  const variant=process.env.CINDER_C01_PLAYTEST||'off';
  if(!['off','A','B'].includes(variant))throw Error('invalid_c01_playtest_variant');
  return {...(variant!=='off'?{experiment:{id:'c01-gate-v1',variant,base_sha:'1eee69e8dfd4efaa9b3c203ae0c707d098ccb3db',rooms:['A'],end_room:'B',analytics:'local-only',save_namespace:'cinder-shift-r01.c01-gate-v1.'+variant}}:{}),version,release_id:version,milestone:'M-RW3',source_sha,source_dirty,build_id:variant==='off'?build_id:build_id+'.c01-'+variant,built_at_utc,channel,notes_id:version};
}
