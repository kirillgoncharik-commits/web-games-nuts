import assets from './audio/assets.generated.json' with {type:'json'};
export type SoundId=keyof typeof assets.sfx;
export type AudioLevels={musicVolume:number;sfxVolume:number;uiVolume:number};
type Bus='ui'|'sfx'|'result';
type Music={source:AudioBufferSourceNode;gain:GainNode;id:'menu'|'combat'};
type Voice={source:AudioBufferSourceNode;gain:GainNode;bus:Bus;priority:number;id:SoundId;started:number;ends:number};
export class AudioService{
 private context?:AudioContext;private master?:GainNode;private musicBus?:GainNode;private sfxBus?:GainNode;private uiBus?:GainNode;
 private buffers=new Map<string,AudioBuffer>();private raw=new Map<string,ArrayBuffer>();private prepared:Promise<void>;private decoding=new Map<string,Promise<void>>();
 private voices=new Set<Voice>();private retiring=new Set<Voice>();private music?:Music;private retiringMusic=new Set<Music>();
 private desiredMusic:'menu'|'combat'|null=null;private world=false;private hidden=false;private mute=false;
 private levels:AudioLevels={musicVolume:.18,sfxVolume:.75,uiVolume:.6};private once=new Set<string>();private played:Record<string,number>={};private dropped=0;private maximum=0;private error=false;
 constructor(){this.prepared=this.preload();}
 get muted(){return this.mute;}
 set muted(value:boolean){this.mute=value;if(this.master)this.master.gain.setValueAtTime(value?0:.32,this.context!.currentTime);if(value){this.stopVoices(()=>true);this.stopMusic();}else this.syncMusic();}
 configure(settings:AudioLevels&{muted:boolean}){this.levels={musicVolume:settings.musicVolume,sfxVolume:settings.sfxVolume,uiVolume:settings.uiVolume};this.muted=settings.muted;this.applyLevels();}
 private applyLevels(){if(!this.context)return;for(const [node,value]of [[this.musicBus,this.levels.musicVolume],[this.sfxBus,this.levels.sfxVolume],[this.uiBus,this.levels.uiVolume]] as const)node?.gain.setTargetAtTime(value,this.context.currentTime,.003);}
 private async preload(){await Promise.all([...Object.entries(assets.sfx),...Object.entries(assets.music).map(([id,m])=>['music:'+id,m] as const)].map(async([id,item])=>{try{const response=await fetch(new URL('./assets/audio/'+item.file,location.href));if(!response.ok)throw Error('audio_asset');const bytes=await response.arrayBuffer();this.raw.set(id,bytes);if(this.context)void this.decode(id,bytes);}catch{this.error=true;}}));}
 async unlock(){
  try{
   if(this.hidden||document.hidden)return;
   if(!this.context){const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=this.mute?0:.32;this.master.connect(ctx.destination);this.musicBus=ctx.createGain();this.sfxBus=ctx.createGain();this.uiBus=ctx.createGain();for(const node of [this.musicBus,this.sfxBus,this.uiBus])node.connect(this.master);this.applyLevels();}
   if(this.context.state==='suspended')await this.context.resume();
   for(const[id,bytes]of this.raw)void this.decode(id,bytes);await Promise.all(this.decoding.values());this.syncMusic();
  }catch{this.error=true;}
 }
 private decode(id:string,bytes:ArrayBuffer){let pending=this.decoding.get(id);if(!pending){pending=this.context!.decodeAudioData(bytes.slice(0)).then(buffer=>{this.buffers.set(id,buffer);this.raw.delete(id);this.syncMusic();}).catch(()=>{this.error=true;});this.decoding.set(id,pending);}return pending;}
 private stop(voice:Voice,immediate=false){if(!this.voices.delete(voice))return;const ctx=this.context!;if(immediate){try{voice.source.stop(ctx.currentTime);}catch{}voice.source.disconnect();voice.gain.disconnect();return;}voice.ends=Math.min(voice.ends,ctx.currentTime+.004);voice.gain.gain.cancelScheduledValues(ctx.currentTime);voice.gain.gain.setTargetAtTime(0,ctx.currentTime,.001);try{voice.source.stop(voice.ends);}catch{}this.retiring.add(voice);}
 private stopVoices(predicate:(v:Voice)=>boolean){for(const voice of [...this.voices])if(predicate(voice))this.stop(voice);}
 play(id:SoundId,onceKey?:string){
  const ctx=this.context,def=assets.sfx[id],buffer=this.buffers.get(id);
  if(this.mute||this.hidden||document.hidden||ctx?.state!=='running'||!buffer||(def.bus==='sfx'&&!this.world))return false;
  if(onceKey&&this.once.has(onceKey))return false;
  let delay=0;const same=[...this.voices].filter(v=>v.bus!=='result');
  if(def.bus==='result'){this.stopVoices(v=>v.bus==='result');delay=.005;}
  else if(same.length>=8){const victim=same.sort((a,b)=>a.priority-b.priority||a.started-b.started)[0];if(victim.priority>def.priority){this.dropped++;return false;}this.stop(victim);delay=.005;}
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.connect(gain);gain.connect(def.bus==='ui'?this.uiBus!:this.sfxBus!);gain.gain.value=1;
  const started=ctx.currentTime+delay,voice:Voice={source,gain,bus:def.bus as Bus,priority:def.priority,id,started,ends:started+buffer.duration};this.voices.add(voice);
  source.onended=()=>{this.voices.delete(voice);this.retiring.delete(voice);source.disconnect();gain.disconnect();};source.start(started);
  this.played[id]=(this.played[id]||0)+1;if(onceKey){this.once.add(onceKey);if(this.once.size>256)this.once.delete(this.once.values().next().value!);}this.maximum=Math.max(this.maximum,[...this.voices].filter(v=>v.bus!=='result').length);return true;
 }
 private stopMusic(immediate=false){const music=this.music;if(!music)return;this.music=undefined;const ctx=this.context!;if(immediate){try{music.source.stop(ctx.currentTime);}catch{}music.source.disconnect();music.gain.disconnect();return;}this.retiringMusic.add(music);music.gain.gain.setTargetAtTime(0,ctx.currentTime,.001);try{music.source.stop(ctx.currentTime+.004);}catch{} }
 private syncMusic(){
  const ctx=this.context,id=this.desiredMusic;
  if(this.mute||this.hidden||document.hidden||ctx?.state!=='running'||!id){this.stopMusic();return;}
  if(this.music?.id===id)return;const buffer=this.buffers.get('music:'+id);if(!buffer)return;this.stopMusic();const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=1;source.connect(gain);gain.connect(this.musicBus!);const music:Music={source,gain,id};this.music=music;source.onended=()=>{this.retiringMusic.delete(music);source.disconnect();gain.disconnect();};source.start(ctx.currentTime+.005);
 }
 menu(){this.world=false;this.stopVoices(v=>v.bus!=='ui');this.desiredMusic='menu';this.syncMusic();}
 startWorld(){this.world=true;this.stopVoices(v=>v.bus==='result');this.desiredMusic='combat';this.syncMusic();}
 clearCombat(){this.stopVoices(v=>v.bus==='sfx');}
 pauseWorld(){this.world=false;this.stopVoices(v=>v.bus==='sfx');this.desiredMusic=null;this.stopMusic();}
 background(){this.hidden=true;this.world=false;this.desiredMusic=null;for(const voice of [...this.voices])this.stop(voice,true);for(const voice of this.retiring){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();}this.retiring.clear();this.stopMusic(true);for(const music of this.retiringMusic){try{music.source.stop();}catch{}music.source.disconnect();music.gain.disconnect();}this.retiringMusic.clear();void this.context?.suspend().catch(()=>{});}
 foreground(){this.hidden=false;}
 state(){return this.context?.state||'uninitialized';}
 snapshot(){return{state:this.state(),ready:this.buffers.size===22,unavailable:this.error,world:this.world,hidden:this.hidden,muted:this.mute,voices:[...this.voices].filter(v=>v.bus!=='result').length,resultVoices:[...this.voices].filter(v=>v.bus==='result').length,retiring:this.retiring.size+this.retiringMusic.size,music:this.music?.id||null,maxVoices:this.maximum,dropped:this.dropped,played:{...this.played},levels:{...this.levels}};}
}
