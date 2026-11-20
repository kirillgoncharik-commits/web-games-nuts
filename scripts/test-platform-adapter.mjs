import test from 'node:test';
import assert from 'node:assert/strict';
import {HostRecordStorage,BridgeRecordStorage} from '../games/cinder-shift/src/session/host-storage.ts';

async function adapter(target='yandex',overrides={}){
 const calls=[],events=new Map(),data=new Map();let callbacks;
 const sdk={
  environment:{i18n:{lang:'ru'}},
  features:{LoadingAPI:{ready(){calls.push('ready');}},GameplayAPI:{start(){calls.push('start');},stop(){calls.push('stop');}}},
  getStorage:async()=>({getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}),
  on:(name,fn)=>events.set(name,fn),
  adv:{showFullscreenAdv(options){calls.push('ad');callbacks=options.callbacks;}},
  ...overrides
 };
 globalThis.window={YaGames:{init:async()=>{calls.push('init');return sdk;}}};
 globalThis.__BUILD_TARGET__=target;
 globalThis.__TARGET_PROFILE__={integration_status:'local_candidate',ads:['mission_complete_next'],storage:'guest',analytics:'disabled'};
 const module=await import('../games/cinder-shift/src/platform.ts?case='+Math.random());
 return{host:new module.PlatformAdapter(),calls,events,sdk,data,callbacks:()=>callbacks};
}

test('SDK initialization is shared; readiness and gameplay transitions are distinct',async()=>{
 const {host,calls}=await adapter();
 await Promise.all([host.initialize(),host.initialize()]);assert.deepEqual(calls,['init']);
 host.gameplay(true);assert.deepEqual(calls,['init']);
 host.ready();host.ready();host.gameplay(true);host.gameplay(true);
 host.gameplay(false);host.gameplay(false);
 assert.deepEqual(calls,['init','ready','start','stop']);assert.equal(host.locale(),'ru');
});
test('SDK-free channels do not touch YaGames or enable ads',async()=>{
 for(const target of ['web','itch','crazygames-basic']){
  const {host,calls}=await adapter(target);await host.initialize();host.ready();host.gameplay(true);
  assert.deepEqual(calls,[]);assert.equal((await host.requestInterstitial('mission_complete_next','once')).nativeRequestSent,false);
 }
});
test('host pause and ad pause compose; duplicate callbacks settle once',async()=>{
 const a=await adapter();await a.host.initialize();a.host.ready();a.host.gameplay(true);
 const notifications=[];a.host.onPause(reason=>{notifications.push(reason);if(reason==='host_pause')a.host.gameplay(false);});
 const request=a.host.requestInterstitial('mission_complete_next','transition-1');
 assert.equal(a.host.requestInterstitial('mission_complete_next','transition-1'),request);
 a.events.get('game_api_pause')();a.callbacks().onOpen();a.callbacks().onClose(true);
 a.callbacks().onClose(true);a.callbacks().onError(Error('duplicate'));
 const result=await request;assert.equal(result.status,'completed');assert.equal(a.host.paused,true);
 let resumed=false;const resume=a.host.whenResumed().then(()=>{resumed=true;});await Promise.resolve();assert.equal(resumed,false);
 a.events.get('game_api_resume')();await resume;
 assert.equal(a.host.paused,false);assert.deepEqual(notifications,['host_pause','host_resume']);
 assert.equal(a.calls.filter(c=>c==='ad').length,1);
 assert.equal(a.calls.filter(c=>c==='start').length,1);assert.equal(a.host.snapshot().playing,false); // Host resume never overrides the app's manual/menu state.
});
test('no-fill, SDK throws and ad errors preserve a usable non-playing state',async()=>{
 for(const scenario of ['no_fill','throw','error']){
  const a=await adapter();await a.host.initialize();a.host.ready();
  if(scenario==='throw')a.sdk.adv.showFullscreenAdv=()=>{throw Error('blocked');};
  const request=a.host.requestInterstitial('mission_complete_next',scenario);
  if(scenario==='no_fill')a.callbacks().onClose(false);if(scenario==='error')a.callbacks().onError(Error('network'));
  assert.equal((await request).status,scenario==='no_fill'?'no_fill':'failed');assert.equal(a.host.paused,false);assert.equal(a.host.snapshot().playing,false);
 }
});
test('initialization failure is visible and does not announce game readiness',async()=>{
 const a=await adapter('yandex',{getStorage:async()=>{throw Error('storage denied');}});
 await assert.rejects(a.host.initialize(),/storage denied/);a.host.ready();
 assert.equal(a.host.snapshot().initialized,false);assert.equal(a.host.snapshot().readySent,false);assert.equal(a.host.snapshot().error,'storage denied');
});
test('guest records survive a fresh service and update atomically without losing unrelated records',async()=>{
 const values=new Map();const storage={getItem:key=>values.get(key)??null,setItem:(key,v)=>values.set(key,v)};
 const first=new HostRecordStorage(storage);await first.writeMany({campaign:{schema_version:1,points:3},settings:{muted:true}});
 const second=new HostRecordStorage(storage);assert.deepEqual(await second.read('campaign'),{schema_version:1,points:3});
 await second.writeMany({campaign:{schema_version:1,points:7},'world-profile.v1':{completion_ids:['first']}});
 assert.deepEqual(await first.read('settings'),{muted:true});assert.deepEqual(await first.read('world-profile.v1'),{completion_ids:['first']});
});
test('malformed, future and failed reads cannot overwrite previous host saves',async()=>{
 for(const text of ['broken','{"version":2,"records":{"campaign":{"keep":true}}}','{"version":1,"records":[]}']){
  let value=text,writes=0;
  const store=new HostRecordStorage({getItem:()=>value,setItem:(_key,next)=>{writes++;value=next;}});
  await assert.rejects(store.read('campaign'));await assert.rejects(store.writeMany({campaign:{}}));assert.equal(writes,0);assert.equal(value,text);
 }
 const store=new HostRecordStorage({getItem:()=>{throw Error('read denied');},setItem:()=>assert.fail('must not write')});
 await assert.rejects(store.writeMany({campaign:{}}),/read denied/);
});
test('quota failure leaves the previous atomic envelope intact',async()=>{
 const original='{"version":1,"records":{"campaign":{"keep":true}}}';
 const store=new HostRecordStorage({getItem:()=>original,setItem:()=>{throw Error('quota');}});
 await assert.rejects(store.writeMany({campaign:{replace:true}}),/quota/);
 assert.deepEqual(await store.read('campaign'),{keep:true});
});

async function bridgeAdapter(overrides={}){
 const calls=[],events=new Map(),data=new Map();
 const bridge={
  initialize:async()=>{calls.push('init');},
  platform:{language:'ru',isPaused:false,isAudioEnabled:true,sendMessage:async message=>{calls.push(message);},on:(name,fn)=>events.set(name,fn)},
  storage:{get:async key=>data.get(key)??null,set:async(key,value)=>{data.set(key,value);}},
  advertisement:{isInterstitialSupported:true,interstitialState:'closed',rewardedState:'closed',showInterstitial(){calls.push('ad');},on:(name,fn)=>events.set(name,fn)},
  ...overrides
 };
 globalThis.window={bridge,YaGames:{init:()=>assert.fail('wrong native SDK')}};
 globalThis.__BUILD_TARGET__='playgama';
 globalThis.__TARGET_PROFILE__={integration_status:'sdk_candidate_audio_and_host_qa_pending',ads:['mission_complete_next'],storage:'Bridge',analytics:'Bridge'};
 const module=await import('../games/cinder-shift/src/platform.ts?bridge='+Math.random());
 return{host:new module.PlatformAdapter(),bridge,calls,events,data};
}
test('Bridge initializes once, uses host language and initial audio/pause state',async()=>{
 const a=await bridgeAdapter();a.bridge.platform.isPaused=true;a.bridge.platform.isAudioEnabled=false;
 const audio=[];a.host.onAudio(value=>audio.push(value));
 await Promise.all([a.host.initialize(),a.host.initialize()]);a.host.ready();a.host.ready();a.host.gameplay(true);
 assert.deepEqual(a.calls,['init','game_ready']);assert.equal(a.host.locale(),'ru');assert.equal(a.host.paused,true);assert.deepEqual(audio,[true,false]);
 a.events.get('pause_state_changed')(false);assert.equal(a.host.snapshot().playing,true);
 a.events.get('audio_state_changed')(true);assert.equal(a.host.snapshot().audioEnabled,true);assert.deepEqual(audio,[true,false,true]);
 assert.deepEqual(a.calls,['init','game_ready','gameplay_started']);
});
test('Bridge interstitial events compose with host pause and deduplicate a transition',async()=>{
 const a=await bridgeAdapter();await a.host.initialize();a.host.ready();
 const p=a.host.requestInterstitial('mission_complete_next','one');
 assert.equal(a.host.requestInterstitial('mission_complete_next','one'),p);
 a.events.get('interstitial_state_changed')('loading');a.events.get('interstitial_state_changed')('opened');
 a.events.get('pause_state_changed')(true);a.events.get('interstitial_state_changed')('closed');a.events.get('interstitial_state_changed')('closed');
 assert.equal((await p).status,'completed');assert.equal(a.host.paused,true);
 a.events.get('pause_state_changed')(false);assert.equal(a.host.paused,false);assert.equal(a.calls.filter(x=>x==='ad').length,1);
});
test('Bridge no-fill/failed/throw outcomes release pause without inventing ad completion',async()=>{
 for(const scenario of ['closed','failed','throw']){
  const a=await bridgeAdapter();await a.host.initialize();a.host.ready();
  a.bridge.advertisement.showInterstitial=()=>{if(scenario==='throw')throw Error('network');a.events.get('interstitial_state_changed')(scenario);};
  const result=await a.host.requestInterstitial('mission_complete_next',scenario);
  assert.equal(result.status,scenario==='closed'?'no_fill':'failed');assert.equal(a.host.paused,false);
 }
});
test('concurrent Bridge envelope updates retain all records and survive a new service',async()=>{
 let text=null;const storage={get:async(_key,parse)=>{assert.equal(parse,false);await Promise.resolve();return text;},set:async(_key,value)=>{text=value;}};
 const store=new BridgeRecordStorage(storage);
 await Promise.all([store.writeMany({campaign:{points:1}}),store.writeMany({settings:{muted:true}}),store.writeMany({'active-world.v1':'c03-adriatic-1986'})]);
 const reloaded=new BridgeRecordStorage(storage);assert.deepEqual(await reloaded.read('campaign'),{points:1});assert.deepEqual(await reloaded.read('settings'),{muted:true});assert.equal(await reloaded.read('active-world.v1'),'c03-adriatic-1986');
});
test('Bridge corrupt/future or denied reads never replace previous data',async()=>{
 for(const initial of ['broken','{"version":2,"records":{"keep":true}}','{"version":1,"records":[]}']){
  let text=initial,writes=0;
  const store=new BridgeRecordStorage({get:async()=>text,set:async(_key,value)=>{text=value;writes++;}});
  await assert.rejects(store.read('campaign'));await assert.rejects(store.writeMany({campaign:{}}));assert.equal(text,initial);assert.equal(writes,0);
 }
 const denied=new BridgeRecordStorage({get:async()=>{throw Error('denied');},set:async()=>assert.fail('must not overwrite')});
 await assert.rejects(denied.writeMany({campaign:{}}),/denied/);
});
test('Bridge write failures retain the envelope and do not poison a later retry',async()=>{
 let text='{"version":1,"records":{"settings":{"keep":true}}}',fail=true;
 const store=new BridgeRecordStorage({get:async()=>text,set:async(_key,value)=>{if(fail)throw Error('quota');text=value;}});
 await assert.rejects(store.writeMany({campaign:{points:1}}),/quota/);assert.deepEqual(await store.read('settings'),{keep:true});
 fail=false;await store.writeMany({campaign:{points:2}});assert.deepEqual(await store.read('campaign'),{points:2});assert.deepEqual(await store.read('settings'),{keep:true});
});

test('a denied Web Locks API falls back to the local queue without retrying failed storage operations',async()=>{
 const own=Object.getOwnPropertyDescriptor(navigator,'locks');
 try{
  Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async()=>{throw Error('lock access denied')}}});
  let raw=null,writes=0;const storage=new HostRecordStorage({getItem:()=>raw,setItem:(_key,value)=>{writes++;raw=value}},'blocked-lock-fixture');
  await storage.writeMany({campaign:{keep:true}});assert.deepEqual(await storage.read('campaign'),{keep:true});assert.equal(writes,1);
  Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async(_name,callback)=>callback()}});
  const bad=new HostRecordStorage({getItem:()=>{throw Error('read denied')},setItem:()=>{writes++;}},'throwing-read-fixture');
  await assert.rejects(bad.writeMany({campaign:{}}),/read denied/);assert.equal(writes,1);
 }finally{if(own)Object.defineProperty(navigator,'locks',own);else delete navigator.locks;}
});
