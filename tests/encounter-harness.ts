import {HostRecordStorage,BridgeRecordStorage} from '../games/cinder-shift/src/session/host-storage';
import {SaveService} from '../games/cinder-shift/src/session/save';
// Test-only entry, compiled outside dist/. The production entry has no fixture globals.
import {app} from '../games/cinder-shift/src/main';
import {Campaign,newCampaign,newWorldCampaign} from '../games/cinder-shift/src/session/campaign';
import {missionChain,type PlayableMissionId} from '../games/cinder-shift/src/session/missions';
import {isWorldMission,worldForMission} from '../games/cinder-shift/src/session/new-campaign-content';
import type {RoomId} from '../games/cinder-shift/src/room-data';
import type {NodeId,ActiveSkill} from '../games/cinder-shift/src/session/research';
import {MissionAttempt} from '../games/cinder-shift/src/mission';

(window as any).__ENCOUNTER__={
 async transportStatistics(input:{kind:'guest'|'bridge';key:string;incoming:import('../games/cinder-shift/src/session/personal-records').PersonalRecords}){
  // The controlled SDK mock owns localStorage; production Bridge code receives only its SDK.
  const sdk={get:async(key:string,parse?:boolean)=>{if(parse!==false)throw Error('raw_envelope_required');await new Promise(resolve=>setTimeout(resolve,20));return localStorage.getItem(key);},set:async(key:string,value:unknown)=>{await new Promise(resolve=>setTimeout(resolve,20));localStorage.setItem(key,String(value));}};
  const storage=input.kind==='guest'?new HostRecordStorage(localStorage,input.key):new BridgeRecordStorage(sdk,input.key);
  const saves=new SaveService('transport-fixture',storage);return saves.updatePersonalRecords(input.incoming);
 },
 flushStatistics(){return app.statistics.flush();},
 // Storage-contract fixture only; production has no mutable statistics global.
 writeStatistics(value:import('../games/cinder-shift/src/session/personal-records').PersonalRecords){return app.saves.updatePersonalRecords(value);},
 async audioClock(action:'suspend'|'resume'){const service=app.effects as any,ctx=service.context as AudioContext;await ctx[action]();return{state:ctx.state,time:ctx.currentTime};},
 audioMixer(input?:{warning?:boolean;musicVolume?:number}){const service=app.effects as any;if(input?.warning)app.effects.play('warn_turret');if(input?.musicVolume!==undefined)app.effects.configure({...app.settings,musicVolume:input.musicVolume});return{gain:service.musicBus?.gain.value,context:service.context?.state,snapshot:app.effects.snapshot()};},
 capture(){return new Promise(resolve=>app.game.renderer.snapshot(image=>{
  const s=(window as any).__CINDER__();
  resolve({png:(image as HTMLImageElement).src,state:{build:s.build,sha:s.sha,hp:s.hp,maxHp:s.maxHp,feedback:s.feedback,audioStatus:s.audioStatus,settings:s.settings}});
 }));},
 start(input:{mission:PlayableMissionId;room?:RoomId;nodes?:NodeId[];active?:ActiveSkill;reactorCircuit?:'cooling'|'isolation';cargoCircuit?:'conveyor'|'security';archiveState?:{carrier?:boolean;power?:boolean;uploaded?:boolean};cleared?:boolean;clearedEnemyIds?:string[];hp?:number;seed?:number;debug?:boolean;reduced?:boolean}){
  app.game.scene.stop('Room');app.game.scene.stop('Backdrop');
  const world=isWorldMission(input.mission)?worldForMission(input.mission):'r01';
  const campaign=new Campaign(world==='r01'?newCampaign(input.seed??4):newWorldCampaign(world,input.seed??4));
  for(const id of missionChain(input.mission)){
   if(id===input.mission)break;
   campaign.selectMission(id);campaign.prepare();campaign.begin();
   campaign.applyResult({attempt_id:'fixture-'+id,mission_id:id,result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:1,screen_ms:0,nodes:[]});campaign.advance();
  }
  campaign.selectMission(input.mission);
  for(const node of input.nodes||[])if(!campaign.buy(node))throw Error('Invalid fixture purchase '+node);
  if(input.active!==undefined&&!campaign.selectActive(input.active))throw Error('Invalid fixture active skill');
  const attempt=new MissionAttempt('mission',campaign.prepare());campaign.begin();
  if(input.reactorCircuit){if(input.mission!=='reactor')throw Error('Reactor fixture used outside Reactor');const entry=attempt.current;attempt.current='M5H';attempt.toggleReactorPower();if(input.reactorCircuit==='isolation')attempt.toggleReactorPower();attempt.current=entry;}
  if(input.cargoCircuit){const entry=attempt.current;attempt.current='M2C';attempt.toggleCargoPower();if(input.cargoCircuit==='security')attempt.toggleCargoPower();attempt.current=entry;}
  if(input.archiveState){if(input.mission!=='archive')throw Error('Archive fixture used outside Archive');const v=input.archiveState;if(v.uploaded&&(!v.carrier||!v.power)||v.power&&!v.carrier)throw Error('Invalid archive entry state');attempt.archiveCarrierCollected=Boolean(v.carrier);attempt.archiveUploadPowered=Boolean(v.power);attempt.dataUploaded=Boolean(v.uploaded);attempt.objective=Boolean(v.uploaded);}
  if(input.room)attempt.current=input.room;
  if(input.cleared)attempt.room().enemies.forEach(enemy=>enemy.hp=0);
  for(const id of input.clearedEnemyIds||[]){const enemy=attempt.room().enemies.find(e=>e.id===id);if(!enemy)throw Error('Unknown fixture enemy '+id);enemy.hp=0;}
  if(input.hp!==undefined)attempt.hp=input.hp;
  app.activeWorld=world;app.campaign=campaign;app.attempt=attempt;app.runSession=null;app.challengeEntry=null;app.challengeSpec=null;app.challengeResult=null;
  app.settings.debugBodies=input.debug||false;app.settings.reducedMotion=input.reduced||false;
  app.state='playing';app.ui.hide();app.controls.clear();app.controls.setScope('play');
  app.game.scene.start('Room',{attempt});document.getElementById('game')?.focus();
  return{room:attempt.current,nodes:attempt.build.nodes,hp:attempt.hp};
 }
};
