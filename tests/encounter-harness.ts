// Test-only entry, compiled outside dist/. The production entry has no fixture globals.
import {app} from '../games/cinder-shift/src/main';
import {Campaign,newCampaign} from '../games/cinder-shift/src/session/campaign';
import {missionIds,type PlayableMissionId} from '../games/cinder-shift/src/session/missions';
import type {RoomId} from '../games/cinder-shift/src/room-data';
import type {NodeId} from '../games/cinder-shift/src/session/research';
import {MissionAttempt} from '../games/cinder-shift/src/mission';

(window as any).__ENCOUNTER__={
 start(input:{mission:PlayableMissionId;room?:RoomId;nodes?:NodeId[];cleared?:boolean;hp?:number;seed?:number;debug?:boolean;reduced?:boolean}){
  app.game.scene.stop('Room');app.game.scene.stop('Backdrop');
  const campaign=new Campaign(newCampaign(input.seed??4));
  for(const id of missionIds){
   if(id===input.mission)break;
   campaign.selectMission(id);campaign.prepare();campaign.begin();
   campaign.applyResult({attempt_id:'fixture-'+id,mission_id:id,result:'victory',reason:'',hp:6,max_hp:6,score:0,active_ms:1,screen_ms:0,nodes:[]});campaign.advance();
  }
  campaign.selectMission(input.mission);
  for(const node of input.nodes||[])if(!campaign.buy(node))throw Error('Invalid fixture purchase '+node);
  const attempt=new MissionAttempt('mission',campaign.prepare());campaign.begin();
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
