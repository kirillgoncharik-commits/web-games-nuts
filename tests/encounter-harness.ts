// Test-only entry, compiled outside dist/. The production entry has no fixture globals.
import {app} from '../games/cinder-shift/src/main';
import {Campaign,newCampaign} from '../games/cinder-shift/src/session/campaign';
import {missionIds,type PlayableMissionId} from '../games/cinder-shift/src/session/missions';
import type {RoomId} from '../games/cinder-shift/src/room-data';
import type {NodeId,ActiveSkill} from '../games/cinder-shift/src/session/research';
import {MissionAttempt} from '../games/cinder-shift/src/mission';

(window as any).__ENCOUNTER__={
 capture(){return new Promise(resolve=>app.game.renderer.snapshot(image=>{
  const s=(window as any).__CINDER__();
  resolve({png:(image as HTMLImageElement).src,state:{build:s.build,sha:s.sha,hp:s.hp,maxHp:s.maxHp,feedback:s.feedback,audioStatus:s.audioStatus,settings:s.settings}});
 }));},
 start(input:{mission:PlayableMissionId;room?:RoomId;nodes?:NodeId[];active?:ActiveSkill;reactorCircuit?:'cooling'|'isolation';cargoCircuit?:'conveyor'|'security';archiveState?:{carrier?:boolean;power?:boolean;uploaded?:boolean};cleared?:boolean;hp?:number;seed?:number;debug?:boolean;reduced?:boolean}){
  app.game.scene.stop('Room');app.game.scene.stop('Backdrop');
  const campaign=new Campaign(newCampaign(input.seed??4));
  for(const id of missionIds){
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
  if(input.hp!==undefined)attempt.hp=input.hp;
  app.campaign=campaign;app.attempt=attempt;app.runSession=null;app.challengeEntry=null;app.challengeSpec=null;app.challengeResult=null;
  app.settings.debugBodies=input.debug||false;app.settings.reducedMotion=input.reduced||false;
  app.state='playing';app.ui.hide();app.controls.clear();app.controls.setScope('play');
  app.game.scene.start('Room',{attempt});document.getElementById('game')?.focus();
  return{room:attempt.current,nodes:attempt.build.nodes,hp:attempt.hp};
 }
};
