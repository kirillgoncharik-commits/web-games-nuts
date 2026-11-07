import assets from './audio/assets.generated.json' with {type:'json'};
import {buildTrack,midiHz,type ThemeId,type MusicTrack,type MusicEvent} from '../../../audio/m06/synth.mjs';
import type {PlayableMissionId} from './session/missions';
export type SoundId=keyof typeof assets.sfx;
export type AudioLevels={musicVolume:number;sfxVolume:number;uiVolume:number};
type Bus='ui'|'sfx'|'result';
type Music={id:ThemeId;track:MusicTrack;started:number;next:number;cycle:number;gain:GainNode;nodes:Set<AudioScheduledSourceNode>;timer:number};
type Voice={source:AudioBufferSourceNode;gain:GainNode;bus:Bus;priority:number;id:SoundId;started:number;ends:number};
export function musicTheme(mission:PlayableMissionId,room?:string):ThemeId{return room==='M5D'?'boss':mission==='cargo'?'freight':mission==='foundry'?'foundry':mission==='archive'?'archive':mission==='reactor'?'reactor':'airlock';}
export class AudioService{
 private context?:AudioContext;private master?:GainNode;private musicBus?:GainNode;private sfxBus?:GainNode;private uiBus?:GainNode;
 private buffers=new Map<string,AudioBuffer>();private raw=new Map<string,ArrayBuffer>();private prepared:Promise<void>;private decoding=new Map<string,Promise<void>>();
 private voices=new Set<Voice>();private retiring=new Set<Voice>();private music?:Music;private desiredMusic:ThemeId|null=null;private worldTheme:ThemeId='airlock';private failed=new Set<string>();
 private world=false;private hidden=false;private mute=false;private noiseBuffer?:AudioBuffer;
 private levels:AudioLevels={musicVolume:.18,sfxVolume:.75,uiVolume:.6};private once=new Set<string>();private played:Record<string,number>={};private dropped=0;private maximum=0;private error=false;
 constructor(){this.prepared=this.preload();}
 get muted(){return this.mute;}
 set muted(value:boolean){this.mute=value;if(this.master)this.master.gain.setValueAtTime(value?0:.32,this.context!.currentTime);if(value){this.stopVoices(()=>true);this.stopMusic();}else this.syncMusic();}
 configure(settings:AudioLevels&{muted:boolean}){this.levels={musicVolume:settings.musicVolume,sfxVolume:settings.sfxVolume,uiVolume:settings.uiVolume};this.muted=settings.muted;this.applyLevels();}
 private applyLevels(){if(!this.context)return;for(const [node,value]of [[this.musicBus,this.levels.musicVolume],[this.sfxBus,this.levels.sfxVolume],[this.uiBus,this.levels.uiVolume]] as const)node?.gain.setTargetAtTime(value,this.context.currentTime,.003);}
 private async preload(){await Promise.all(Object.entries(assets.sfx).map(async([id,item])=>{try{const response=await fetch(new URL('./assets/audio/'+item.file,location.href));if(!response.ok)throw Error('audio_asset');const bytes=await response.arrayBuffer();this.raw.set(id,bytes);if(this.context)void this.decode(id,bytes);}catch{this.error=true;this.failed.add(id);}}));}
 async unlock(){
  try{
   if(this.hidden||document.hidden)return;
   if(!this.context){const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=this.mute?0:.32;this.master.connect(ctx.destination);this.musicBus=ctx.createGain();this.sfxBus=ctx.createGain();this.uiBus=ctx.createGain();for(const node of [this.musicBus,this.sfxBus,this.uiBus])node.connect(this.master);this.applyLevels();this.noiseBuffer=this.makeNoiseBuffer();}
   if(this.context.state==='suspended')await this.context.resume();
   await this.prepared;for(const[id,bytes]of this.raw)void this.decode(id,bytes);await Promise.all(this.decoding.values());this.syncMusic();
  }catch{this.error=true;}
 }
 private makeNoiseBuffer(){const ctx=this.context!,buffer=ctx.createBuffer(1,8192,ctx.sampleRate),channel=buffer.getChannelData(0);let state=0x6d2b79f5;for(let i=0;i<channel.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;channel[i]=(state>>>0)/2147483648-1;}return buffer;}
 private decode(id:string,bytes:ArrayBuffer){let pending=this.decoding.get(id);if(!pending){pending=this.context!.decodeAudioData(bytes.slice(0)).then(buffer=>{this.buffers.set(id,buffer);this.failed.delete(id);this.raw.delete(id);}).catch(()=>{this.error=true;this.failed.add(id);});this.decoding.set(id,pending);}return pending;}
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
  const started=ctx.currentTime+delay,variants:Partial<Record<SoundId,readonly number[]>>={shot:[.96,1,1.04],hit_enemy:[.93,1,1.07]},rates=variants[id],playbackRate=rates?rates[(this.played[id]||0)%rates.length]:1;source.playbackRate.setValueAtTime(playbackRate,started);const voice:Voice={source,gain,bus:def.bus as Bus,priority:def.priority,id,started,ends:started+buffer.duration/playbackRate};this.voices.add(voice);
  source.onended=()=>{this.voices.delete(voice);this.retiring.delete(voice);source.disconnect();gain.disconnect();};source.start(started);
  this.played[id]=(this.played[id]||0)+1;if(onceKey){this.once.add(onceKey);if(this.once.size>256)this.once.delete(this.once.values().next().value!);}this.maximum=Math.max(this.maximum,[...this.voices].filter(v=>v.bus!=='result').length);return true;
 }
 private stopMusic(immediate=false){const music=this.music;if(!music)return;this.music=undefined;clearInterval(music.timer);const ctx=this.context!,at=ctx.currentTime;if(immediate){for(const source of music.nodes){try{source.stop(at);}catch{}source.disconnect();}music.nodes.clear();music.gain.disconnect();return;}music.gain.gain.cancelScheduledValues(at);music.gain.gain.setValueAtTime(music.gain.gain.value,at);music.gain.gain.linearRampToValueAtTime(0,at+.045);for(const source of music.nodes)try{source.stop(at+.05);}catch{}window.setTimeout(()=>music.gain.disconnect(),100);}
 private scheduleNote(music:Music,event:MusicEvent,at:number,beatSeconds:number){const ctx=this.context;if(!ctx||!this.musicBus||!this.noiseBuffer)return;const duration=Math.max(.015,event.duration*beatSeconds),gain=ctx.createGain();let source:AudioScheduledSourceNode;
  if(event.wave==='noise'){const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter();noise.buffer=this.noiseBuffer;filter.type='lowpass';filter.frequency.value=2400;noise.connect(filter);filter.connect(gain);source=noise;}
  else{const oscillator=ctx.createOscillator();oscillator.type=event.wave==='pulse'?'square':'triangle';oscillator.frequency.value=midiHz(event.pitch);oscillator.connect(gain);source=oscillator;}
  gain.connect(music.gain);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(event.level,at+.004);gain.gain.setValueAtTime(event.level,Math.max(at+.005,at+duration-.018));gain.gain.linearRampToValueAtTime(0,at+duration);music.nodes.add(source);source.onended=()=>{music.nodes.delete(source);source.disconnect();gain.disconnect();};source.start(at);source.stop(at+duration);
 }
 private scheduleMusic(music:Music){const ctx=this.context;if(!ctx||this.music!==music||ctx.state!=='running')return;const beatSeconds=60/music.track.bpm,cycleSeconds=music.track.bars*4*beatSeconds,horizon=ctx.currentTime+.16;
  while(true){const cycleAt=music.started+music.cycle*cycleSeconds,event=music.track.events[music.next];if(!event){music.cycle++;music.next=0;continue;}const at=cycleAt+event.beat*beatSeconds;if(at>horizon)break;music.next++;if(at<ctx.currentTime-.02)continue;this.scheduleNote(music,event,at,beatSeconds);}
 }
 private syncMusic(){const ctx=this.context,id=this.desiredMusic;if(this.mute||this.hidden||document.hidden||ctx?.state!=='running'||!id){this.stopMusic(this.hidden);return;}if(this.music?.id===id)return;this.stopMusic();const track=buildTrack(id),gain=ctx.createGain(),music:Music={id,track,started:ctx.currentTime+.04,next:0,cycle:0,gain,nodes:new Set(),timer:0};gain.gain.value=1;gain.connect(this.musicBus!);this.music=music;this.scheduleMusic(music);music.timer=window.setInterval(()=>this.scheduleMusic(music),25);}
 menu(theme:ThemeId='menu'){this.world=false;this.stopVoices(v=>v.bus!=='ui');this.desiredMusic=theme;this.syncMusic();}
 startWorld(theme?:ThemeId){this.world=true;if(theme)this.worldTheme=theme;this.stopVoices(v=>v.bus==='result');this.desiredMusic=this.worldTheme;this.syncMusic();}
 clearCombat(){this.stopVoices(v=>v.bus==='sfx');}
 pauseWorld(){this.world=false;this.stopVoices(v=>v.bus==='sfx');this.desiredMusic=null;this.stopMusic();}
 background(){this.hidden=true;this.world=false;for(const voice of [...this.voices])this.stop(voice,true);for(const voice of this.retiring){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();}this.retiring.clear();this.stopMusic(true);void this.context?.suspend().catch(()=>{});}
 foreground(){this.hidden=false;this.syncMusic();}
 state(){return this.context?.state||'uninitialized';}
 snapshot(){const expected=Object.keys(assets.sfx).length,decoded=this.buffers.size,unavailableResources=[...this.failed].sort();return{state:this.state(),expected,decoded,unavailable:this.error,unavailableResources,partialFailure:decoded>0&&unavailableResources.length>0,ready:expected>0&&decoded===expected&&unavailableResources.length===0,world:this.world,hidden:this.hidden,muted:this.mute,voices:[...this.voices].filter(v=>v.bus!=='result').length,resultVoices:[...this.voices].filter(v=>v.bus==='result').length,retiring:this.retiring.size,music:this.music?.id||null,maxVoices:this.maximum,dropped:this.dropped,played:{...this.played},levels:{...this.levels}};}
}
