import{mkdir,writeFile,readdir,rm}from'node:fs/promises';
import{createHash}from'node:crypto';
import{definitions as legacyDefinitions,renderSfx as renderLegacy,renderDefinition,wav,rate}from'../audio/m05a/score.mjs';
import{definitions as cues,cueIds}from'../audio/m06/effects.mjs';
import{themes,buildTrack,midiHz}from'../audio/m06/synth.mjs';

const runtime='games/cinder-shift/public/assets/audio',masters='audio/m06/wav';
const definitions={...legacyDefinitions,...cues},renderEffect=id=>Object.hasOwn(cues,id)?renderDefinition(id,cues[id]):renderLegacy(id);
await mkdir(runtime,{recursive:true});await mkdir(masters+'/effects',{recursive:true});
for(const name of await readdir(runtime))await rm(runtime+'/'+name,{force:true});
const manifest={sampleRate:rate,sfx:{},music:{},provenance:'Original deterministic local synthesis; effects: audio/m05a/score.mjs and audio/m06/effects.mjs; eight original score themes: audio/m06/synth.mjs.'};
for(const[id,definition]of Object.entries(definitions)){
 const data=renderEffect(id),bytes=wav(data),sha=createHash('sha256').update(bytes).digest('hex'),file=id+'-'+sha.slice(0,10)+'.wav',masterPath=masters+'/effects/'+id+'.wav';
 await writeFile(runtime+'/'+file,bytes);await writeFile(masterPath,bytes);let sum=0;for(const value of data)sum+=value*value;
 manifest.sfx[id]={id,file,sha256:sha,bytes:bytes.length,seconds:data.length/rate,peak:definition.peak,rms:Math.sqrt(sum/data.length),priority:definition.priority,bus:definition.bus,cue_id:definition.cue_id||null,source_project:Object.hasOwn(cues,id)?'audio/m06/effects.mjs':'audio/m05a/score.mjs',master_path:masterPath,runtime_path:runtime+'/'+file,bpm:null,loop_start_sample:null,loop_end_sample:null,loudness_lufs:null,true_peak_dbtp:null,author:'Nuts Games internal draft (AI-assisted; human review pending)',provenance:'Deterministic local synthesis; no external samples.',target_profile:'web candidate; platform codec and SDK compatibility unverified'};
}

function renderTrack(id){
 const track=buildTrack(id),duration=track.bars*4*60/track.bpm,count=Math.round(duration*rate),mix=new Float32Array(count),beatSeconds=60/track.bpm;
 for(let eventIndex=0;eventIndex<track.events.length;eventIndex++){
  const event=track.events[eventIndex],start=Math.round(event.beat*beatSeconds*rate),length=Math.min(count-start,Math.round(event.duration*beatSeconds*rate));
  if(length<=0)continue;let phase=0,state=(2166136261^Math.imul(eventIndex+1,16777619))>>>0,filtered=0;
  const frequency=event.wave==='noise'?0:midiHz(event.pitch),attack=Math.max(1,Math.round(.004*rate)),release=Math.max(1,Math.round(.018*rate));
  for(let i=0;i<length;i++){
   phase+=frequency/rate;let signal;
   if(event.wave==='noise'){state^=state<<13;state^=state>>>17;state^=state<<5;const white=(state>>>0)/2147483648-1;filtered+=.26*(white-filtered);signal=filtered*2;}
   else if(event.wave==='triangle')signal=2/Math.PI*Math.asin(Math.sin(phase*Math.PI*2));
   else signal=Math.sin(phase*Math.PI*2)>=0?1:-1;
   const envelope=Math.min(1,i/attack,Math.max(0,(length-i)/release));mix[start+i]+=signal*event.level*envelope;
  }
 }
 let peak=0,sum=0;for(const value of mix){peak=Math.max(peak,Math.abs(value));sum+=value*value;}
 const headroom=peak>.22?.22/peak:1;for(let i=0;i<mix.length;i++)mix[i]*=headroom;
 return{data:mix,peak:peak*headroom,rms:Math.sqrt(sum/mix.length)*headroom,duration};
}

const catalog={sample_rate:rate,channels:1,bits_per_sample:16,provenance:'Original procedural 8-bit inspired score; no external recordings or transcribed melodies.',reference_review:'Official Columbia Jetman collection metadata and the supplied Iwatsuki interview were reviewed. The official collection credits KAZZ TOYAMA; the interview covers other Famicom/SNES/XBLA projects. Listening comparison to the Jetman game score remains open.',themes:{}};
for(const id of Object.keys(themes)){
 const rendered=renderTrack(id),bytes=wav(rendered.data),sha=createHash('sha256').update(bytes).digest('hex'),file=id+'-'+sha.slice(0,10)+'.wav';
 await writeFile(masters+'/'+file,bytes);
 catalog.themes[id]={id:'BGM_'+id.toUpperCase(),source_project:'audio/m06/synth.mjs',file,master_path:masters+'/'+file,runtime_path:'games/cinder-shift/src/audio.ts (procedural Web Audio scheduler)',sha256:sha,bytes:bytes.length,bpm:themes[id].bpm,bars:themes[id].bars,seconds:rendered.duration,peak:rendered.peak,rms:rendered.rms,sample_rate:rate,loop_start_sample:0,loop_end_sample:rendered.data.length,loudness_lufs:null,true_peak_dbtp:null,author:'Nuts Games internal draft (AI-assisted; human review pending)',provenance:catalog.provenance,target_profile:'web candidate; Playgama recording/tool-produced OGG/MP3 not prepared'};
}
manifest.music_themes=Object.keys(themes);
await writeFile('games/cinder-shift/src/audio/assets.generated.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('audio/m06/registry.json',JSON.stringify({version:'1.0',runtime:manifest,music:catalog,cues:cueIds},null,2)+'\n');
console.log(JSON.stringify({runtime_sfx:Object.keys(manifest.sfx).length,runtime_audio_bytes:Object.values(manifest.sfx).reduce((n,item)=>n+item.bytes,0),original_music_themes:Object.keys(catalog.themes).length,music_cues:Object.keys(cueIds).length,master_sample_rate:rate},null,2));
