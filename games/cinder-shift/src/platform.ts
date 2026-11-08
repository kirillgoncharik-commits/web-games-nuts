export type PlatformTarget='web'|'itch'|'crazygames-basic'|'crazygames-full'|'gamepix'|'y8'|'playgama'|'yandex';
export type PlatformProfile={integration_status:string;ads:string[];storage:string;analytics:string;[key:string]:unknown};
export type AdResult={status:'unsupported'|'no_fill'|'started'|'completed'|'failed';nativeRequestSent:boolean;transitionId?:string};
declare const __BUILD_TARGET__:PlatformTarget;
declare const __TARGET_PROFILE__:PlatformProfile;
export const buildTarget:PlatformTarget=__BUILD_TARGET__;
export const targetProfile:PlatformProfile=__TARGET_PROFILE__;

// Shared host contract. Until a channel SDK is integrated, ads resolve immediately
// to an unavailable result so progress remains free and cannot wait on a callback.
export class PlatformAdapter{
 readonly target=buildTarget;
 readonly profile=targetProfile;
 initialize(){return Promise.resolve({ready:this.profile.integration_status==='local_candidate',target:this.target});}
 ready(){}
 locale():string|null{return null;}
 requestInterstitial(_placement:string,_transitionId:string):Promise<AdResult>{return Promise.resolve({status:'unsupported',nativeRequestSent:false});}
 onPause(_listener:(reason:'host_pause'|'host_resume')=>void){return()=>{};}
 snapshot(){return{target:this.target,integrationStatus:this.profile.integration_status,adsEnabled:false,nativeSdkLoaded:false};}
}
export const platform=new PlatformAdapter();
