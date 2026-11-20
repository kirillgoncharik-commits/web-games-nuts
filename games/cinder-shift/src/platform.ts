import type {BridgeStorage} from './session/host-storage';
export type PlatformTarget='web'|'itch'|'crazygames-basic'|'crazygames-full'|'gamepix'|'y8'|'playgama'|'yandex';
export type PlatformProfile={integration_status:string;ads:string[];storage:string;analytics:string;[key:string]:unknown};
export type AdResult={status:'unsupported'|'no_fill'|'started'|'completed'|'failed';nativeRequestSent:boolean;transitionId?:string};
export type HostStorage=Pick<Storage,'getItem'|'setItem'>;
type HostListener=(reason:'host_pause'|'host_resume')=>void;
type BridgeSdk={
 initialize():Promise<void>;
 platform:{language:string;isPaused:boolean;isAudioEnabled:boolean;sendMessage(message:string):Promise<unknown>;on(event:string,listener:(value:boolean)=>void):unknown};
 storage:BridgeStorage;
 advertisement:{interstitial:{isSupported:boolean;show(placement:string):void};on(event:string,listener:(state:string)=>void):unknown};
};
type YandexSdk={
 environment:{i18n:{lang:string}};
 features:{LoadingAPI:{ready():void};GameplayAPI:{start():void;stop():void}};
 getStorage():Promise<HostStorage>;
 on(event:'game_api_pause'|'game_api_resume',listener:()=>void):unknown;
 adv:{showFullscreenAdv(options:{callbacks:{onOpen():void;onClose(shown:boolean):void;onError(error:unknown):void}}):void};
};
declare const __BUILD_TARGET__:PlatformTarget;
declare const __TARGET_PROFILE__:PlatformProfile;
export const buildTarget:PlatformTarget=__BUILD_TARGET__;
export const targetProfile:PlatformProfile=__TARGET_PROFILE__;

function timeout<T>(promise:Promise<T>,ms:number,label:string):Promise<T>{
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(label)),ms);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
}

/** Only the selected channel can initialize a native SDK. No external analytics. */
export class PlatformAdapter{
 readonly target=buildTarget;readonly profile=targetProfile;
 private sdk?:YandexSdk;private bridge?:BridgeSdk;private guestStorage?:HostStorage;private bridgeStorage?:BridgeStorage;private initialization?:Promise<{ready:boolean;target:PlatformTarget}>;
 private initialized=false;private readySent=false;private playing=false;private requestedPlaying=false;private error:string|null=null;
 private reasons=new Set<string>();private listeners=new Set<HostListener>();
 private audioEnabled=true;private audioListeners=new Set<(enabled:boolean)=>void>();private bridgeAdState?:((state:string)=>void);
 private adRequests=new Map<string,Promise<AdResult>>();private adInFlight=false;
 get paused(){return this.reasons.size>0;}
 storage(){return this.guestStorage;}
 asyncStorage(){return this.bridgeStorage;}
 initialize(){return this.initialization??=this.initializeNative();}
 private async initializeNative(){
  if(this.target==='playgama'){
   try{
    const bridge=(window as unknown as {bridge?:BridgeSdk}).bridge;if(!bridge)throw Error('playgama_sdk_missing');
    await timeout(bridge.initialize(),8000,'playgama_init_timeout');this.bridge=bridge;
    if(!bridge.storage||typeof bridge.storage.get!=='function'||typeof bridge.storage.set!=='function')throw Error('playgama_storage_unavailable');
    this.bridgeStorage={get:(key,parse)=>timeout(bridge.storage.get(key,parse),4000,'playgama_storage_timeout'),set:(key,value)=>timeout(bridge.storage.set(key,value),4000,'playgama_storage_timeout')};
    bridge.platform.on('pause_state_changed',paused=>this.setPause('sdk',paused));
    bridge.platform.on('audio_state_changed',enabled=>this.setAudio(enabled));
    bridge.advertisement.on('interstitial_state_changed',state=>{this.setPause('bridge_ad',state==='loading'||state==='opened');this.bridgeAdState?.(state);});
    this.setPause('sdk',bridge.platform.isPaused);this.setAudio(bridge.platform.isAudioEnabled);
    this.initialized=true;return{ready:true,target:this.target};
   }catch(error){this.error=error instanceof Error?error.message:'playgama_init_failed';throw error;}
  }
  if(this.target!=='yandex'){this.initialized=this.profile.integration_status==='local_candidate';return{ready:this.initialized,target:this.target};}
  try{
   const ya=(window as unknown as {YaGames?:{init():Promise<YandexSdk>}}).YaGames;
   if(!ya)throw Error('yandex_sdk_missing');
   const sdk=await timeout(ya.init(),8000,'yandex_init_timeout');this.sdk=sdk;
   sdk.on('game_api_pause',()=>this.setPause('sdk',true));
   sdk.on('game_api_resume',()=>this.setPause('sdk',false));
   this.guestStorage=await timeout(sdk.getStorage(),4000,'yandex_storage_timeout');
   if(!this.guestStorage||typeof this.guestStorage.getItem!=='function'||typeof this.guestStorage.setItem!=='function')throw Error('yandex_storage_unavailable');
   this.initialized=true;return{ready:true,target:this.target};
  }catch(error){this.error=error instanceof Error?error.message:'yandex_init_failed';throw error;}
 }
 private bridgeMessage(message:string){try{void this.bridge?.platform.sendMessage(message).catch(()=>{this.error='playgama_message_failed';});}catch{this.error='playgama_message_failed';}}
 ready(){if(!this.initialized||this.readySent)return;try{this.sdk?.features.LoadingAPI.ready();this.readySent=true;if(this.bridge)this.bridgeMessage('game_ready');}catch{this.error='yandex_ready_failed';}}
 locale():string|null{return this.bridge?.platform.language||this.sdk?.environment.i18n.lang||null;}
 private setAudio(enabled:boolean){this.audioEnabled=enabled;for(const listener of this.audioListeners)listener(enabled);}
 onAudio(listener:(enabled:boolean)=>void){this.audioListeners.add(listener);listener(this.audioEnabled);return()=>this.audioListeners.delete(listener);}
 gameplay(active:boolean){this.requestedPlaying=active;this.syncGameplay();}
 private syncGameplay(){
  const next=this.initialized&&this.readySent&&this.requestedPlaying&&!this.paused;
  if(next===this.playing)return;
  try{if(this.sdk){if(next)this.sdk.features.GameplayAPI.start();else this.sdk.features.GameplayAPI.stop();}if(this.bridge)this.bridgeMessage(next?'gameplay_started':'gameplay_stopped');this.playing=next;}catch{this.error='yandex_gameplay_failed';}
 }
 private setPause(reason:string,active:boolean){
  const previous=this.paused;if(active)this.reasons.add(reason);else this.reasons.delete(reason);
  if(previous===this.paused)return;
  if(this.paused)this.syncGameplay();
  for(const listener of this.listeners)listener(this.paused?'host_pause':'host_resume');
  if(!this.paused)this.syncGameplay();
 }
 onPause(listener:HostListener){this.listeners.add(listener);if(this.paused)listener('host_pause');return()=>this.listeners.delete(listener);}
 whenResumed(){if(!this.paused)return Promise.resolve();return new Promise<void>(resolve=>{const off=this.onPause(reason=>{if(reason==='host_resume'){off();resolve();}});});}
 requestInterstitial(placement:string,transitionId:string):Promise<AdResult>{
  const existing=this.adRequests.get(transitionId);if(existing)return existing;
  if((!this.sdk&&!this.bridge)||!this.profile.ads.includes(placement))return Promise.resolve({status:'unsupported',nativeRequestSent:false,transitionId});
  if(this.bridge&&!this.bridge.advertisement.interstitial.isSupported)return Promise.resolve({status:'unsupported',nativeRequestSent:false,transitionId});
  if(this.adInFlight)return Promise.resolve({status:'no_fill',nativeRequestSent:false,transitionId});
  this.adInFlight=true;
  const request=new Promise<AdResult>(resolve=>{
   let settled=false,opened=false;
   let timer:ReturnType<typeof setTimeout>|undefined;
   const finish=(status:AdResult['status'])=>{if(settled)return;settled=true;clearTimeout(timer);this.bridgeAdState=undefined;this.adInFlight=false;this.setPause('ad',false);resolve({status,nativeRequestSent:true,transitionId});};
   // A missing pre-open callback cannot trap a player. After opening, only
   // an actual close/error releases the pause, never a wall-clock timeout.
   this.setPause('ad',true);
   if(this.bridge){
    this.bridgeAdState=state=>{if(state==='opened')opened=true;else if(state==='closed')finish(opened?'completed':'no_fill');else if(state==='failed')finish('failed');};
    try{this.bridge.advertisement.interstitial.show(placement);}catch{this.setPause('bridge_ad',false);finish('failed');}
    return;
   }
   timer=setTimeout(()=>finish('no_fill'),5000);
   try{this.sdk!.adv.showFullscreenAdv({callbacks:{
    onOpen:()=>{if(settled)return;opened=true;clearTimeout(timer);},
    onClose:shown=>finish(shown||opened?'completed':'no_fill'),
    onError:()=>finish('failed')
   }});}catch{finish('failed');}
  });
  this.adRequests.set(transitionId,request);
  if(this.adRequests.size>64)this.adRequests.delete(this.adRequests.keys().next().value!);
  return request;
 }
 snapshot(){return{target:this.target,integrationStatus:this.profile.integration_status,adsEnabled:Boolean((this.sdk||this.bridge)&&this.profile.ads.length),nativeSdkLoaded:Boolean(this.sdk||this.bridge),initialized:this.initialized,readySent:this.readySent,playing:this.playing,paused:this.paused,pauseReasons:[...this.reasons],audioEnabled:this.audioEnabled,storage:this.bridgeStorage?'playgama_bridge':this.guestStorage?'yandex_safe_storage':'indexeddb',error:this.error};}
}
export const platform=new PlatformAdapter();
