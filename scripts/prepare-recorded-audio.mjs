import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const config=JSON.parse(await readFile('games/cinder-shift/audio/recorded-sources.json','utf8'));
const sourceDir='qa-work/recorded-audio-source',output='games/cinder-shift/public/assets/audio-recorded';
await mkdir(sourceDir,{recursive:true});await mkdir(output,{recursive:true});
function blobSha(bytes){return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');}
for(const source of config.sources){
 const destination=sourceDir+'/'+source.id+(source.id==='music'?'.ogg':'.wav');let bytes;
 try{bytes=await readFile(destination);}catch{}
 if(!bytes||blobSha(bytes)!==source.git_blob){
  const url='https://raw.githubusercontent.com/'+config.source_repository+'/'+config.source_commit+'/'+source.path;
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('recorded_asset_http_'+response.status+':'+source.id);
  bytes=Buffer.from(await response.arrayBuffer());if(blobSha(bytes)!==source.git_blob)throw Error('recorded_asset_hash:'+source.id);
  await writeFile(destination,bytes);
 }
}
await copyFile(sourceDir+'/music.ogg',output+'/music.ogg');
const clips=[['jump','jump',.28],['shot','shot',.22],['hit','hit',.18],['explode','explode',.55],['confirm','confirm',.45],['tick','confirm',.09]];
for(const[name,source,duration]of clips){
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',sourceDir+'/'+source+'.wav','-t',String(duration),'-af','afade=t=out:st='+Math.max(0,duration-.025)+':d=0.025','-codec:a','libmp3lame','-b:a','96k','-ar','44100','-ac','1','-map_metadata','-1',output+'/'+name+'.mp3'],{stdio:'inherit'});
}
await copyFile('games/cinder-shift/audio/RECORDED_AUDIO_LICENSE.txt',output+'/LICENSE.txt');
const files=[];for(const name of ['music.ogg',...clips.map(c=>c[0]+'.mp3'),'LICENSE.txt']){const bytes=await readFile(output+'/'+name);files.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(output+'/manifest.json',JSON.stringify({source_repository:config.source_repository,source_commit:config.source_commit,music:'Pompy — Hubert Lamontagne (madbr)',license:'MIT; full upstream notice in LICENSE.txt',processing:'Original Ogg music; authored SFX excerpts encoded with FFmpeg/libmp3lame',files},null,2)+'\n');
console.log('Recorded audio prepared:',files.length,'files; pinned source hashes verified.');
