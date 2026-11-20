export type PlatformTarget='web'|'itch'|'crazygames-basic'|'crazygames-full'|'gamepix'|'y8'|'playgama'|'yandex';
export type PlatformProfile={integration_status:string;ads:string[];storage:string;analytics:string;[key:string]:unknown};
export type AdResult={status:'unsupported'|'no_fill'|'started'|'completed'|'failed';nativeRequestSent:boolean;transitionId?:string};
export type HostStorage=Pick<Storage,'getItem'|'setItem'>;
type HostListener=(reason:'host_pause'|'host_resume')=>void;
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
 private sdk?:YandexSdk;private guestStorage?:HostStorage;private initialization?:Promise<{ready:boolean;target:PlatformTarget}>;
 private initialized=false;private readySent=false;private playing=false;private requestedPlaying=false;private error:string|null=null;
 private reasons=new Set<string>();private listeners=new Set<HostListener>();
 private adRequests=new Map<string,Promise<AdResult>>();private adInFlight=false;
 get paused(){return this.reasons.size>0;}
 storage(){return this.guestStorage;}
 initialize(){return this.initialization??=this.initializeNative();}
 private async initializeNative(){
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
 ready(){if(!this.initialized||this.readySent)return;try{this.sdk?.features.LoadingAPI.ready();this.readySent=true;}catch{this.error='yandex_ready_failed';}}
 locale():string|null{return this.sdk?.environment.i18n.lang||null;}
 gameplay(active:boolean){this.requestedPlaying=active;this.syncGameplay();}
 private syncGameplay(){
  const next=this.initialized&&this.readySent&&this.requestedPlaying&&!this.paused;
  if(next===this.playing)return;
  try{if(this.sdk){if(next)this.sdk.features.GameplayAPI.start();else this.sdk.features.GameplayAPI.stop();}this.playing=next;}catch{this.error='yandex_gameplay_failed';}
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
  if(!this.sdk||!this.profile.ads.includes(placement))return Promise.resolve({status:'unsupported',nativeRequestSent:false,transitionId});
  if(this.adInFlight)return Promise.resolve({status:'no_fill',nativeRequestSent:false,transitionId});
  this.adInFlight=true;
  const request=new Promise<AdResult>(resolve=>{
   let settled=false,opened=false;
   const finish=(status:AdResult['status'])=>{if(settled)return;settled=true;clearTimeout(timer);this.adInFlight=false;this.setPause('ad',false);resolve({status,nativeRequestSent:true,transitionId});};
   // A missing pre-open callback cannot trap a player. After opening, only
   // an actual close/error releases the pause, never a wall-clock timeout.
   const timer=setTimeout(()=>finish('no_fill'),5000);
   this.setPause('ad',true);
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
 snapshot(){return{target:this.target,integrationStatus:this.profile.integration_status,adsEnabled:Boolean(this.sdk&&this.profile.ads.length),nativeSdkLoaded:Boolean(this.sdk),initialized:this.initialized,readySent:this.readySent,playing:this.playing,paused:this.paused,pauseReasons:[...this.reasons],storage:this.guestStorage?'yandex_safe_storage':'indexeddb',error:this.error};}
}
export const platform=new PlatformAdapter();
