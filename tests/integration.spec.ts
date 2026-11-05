import{test,expect}from'@playwright/test';
import{mkdtemp,mkdir,writeFile,readFile,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join}from'node:path';
import{execFileSync}from'node:child_process';
test('integration preserves a cached HTML bundle while installing the new manifest',async()=>{
  const root=await mkdtemp(join(tmpdir(),'cinder-cache-test-'));
  try{
    const assets=join(root,'public/games/cinder-shift/assets');await mkdir(assets,{recursive:true});await writeFile(join(assets,'cached-build-deadbeef.js'),'previous-bundle');
    await writeFile(join(root,'public/games/cinder-shift/build-manifest.json'),'{}');
    execFileSync(process.execPath,['scripts/integrate.mjs',root],{stdio:'pipe'});
    expect(await readFile(join(assets,'cached-build-deadbeef.js'),'utf8')).toBe('previous-bundle');
    const actual=await readFile(join(root,'public/games/cinder-shift/build-manifest.json'),'utf8');expect(actual).toBe(await readFile('dist/cinder-shift/build-manifest.json','utf8'));
  }finally{await rm(root,{recursive:true,force:true});}
});
