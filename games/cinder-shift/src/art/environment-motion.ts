import type Phaser from 'phaser';
import type {MissionAttempt} from '../mission';
import {ProductionSprites} from './production-art';

/** Decorative sprites follow the simulation clock and actual circuit selection. */
export class EnvironmentMotion{
 private graphics:Phaser.GameObjects.Graphics;private sprites:ProductionSprites;private lastFrame='';
 constructor(scene:Phaser.Scene){this.graphics=scene.add.graphics().setDepth(1.4);this.sprites=new ProductionSprites(scene);}
 draw(attempt:MissionAttempt,reduced:boolean){
  const def=attempt.definition(),shutdown=attempt.missionId==='reactor'&&attempt.bossHp<=0;
  const powered=!shutdown&&(attempt.missionId==='archive'&&['M4G','M4H','M4C'].includes(def.id)?attempt.archiveUploadPowered:def.id==='A'||def.terminalKind==='restore'?attempt.room().terminal:true);
  const tick=reduced||!powered?0:Math.floor(attempt.clock.now/140),signature=[def.id,tick,powered,attempt.cargoCircuit,attempt.reactorCircuit,attempt.room().powerCircuit].join(':');
  if(signature===this.lastFrame)return;this.lastFrame=signature;
  const g=this.graphics,p=this.sprites;g.clear();p.begin();
  const bob=reduced||!powered?0:Math.round(Math.sin(tick/3)*2);
  const props:Record<string,[string,string]>={airlock:['SW03-damper','YU04-distributor'],cargo:['YU02-crane','YU04-conveyor'],foundry:['YU04-lathe','YU04-flywheel'],archive:['YU05-relay','YU05-crt'],reactor:['YU03-substation','YU04-flywheel']};
  const frames=props[attempt.missionId]??props.airlock;
  p.draw(frames[0],128,172+bob,90,96,1.4,1,.7);p.draw(frames[1],486,184,118,98,1.4,1,.7);
  const connection=(y:number,live:boolean,frame:string)=>{g.lineStyle(live?2:1,live?0x91d2b8:0x405c70,.75).lineBetween(112,282,112,y).lineBetween(112,y,464,y);p.draw(frame,464,y+14,66,34,1.5);};
  if(def.id==='M2C'){connection(154,attempt.cargoRerouted&&attempt.cargoCircuit==='conveyor','bridge-extended');connection(232,attempt.cargoRerouted&&attempt.cargoCircuit==='security','scanner-idle');}
  if(def.id==='M5H'){connection(192,attempt.reactorRerouted&&attempt.reactorCircuit==='cooling','SW03-damper');connection(242,attempt.reactorRerouted&&attempt.reactorCircuit==='isolation','switch-B');}
  if(def.conveyor){const b=def.conveyor,live=b.enabled===true;p.rect('bridge-extended',b,2.3);const phase=reduced||!live?0:(attempt.clock.now/80)%12;g.lineStyle(2,live?0x91d2b8:0x78949f,.7);for(let x=b.x+8+phase;x<b.x+b.width-6;x+=16)g.lineBetween(x,b.y+5,x+5,b.y+5);}
  p.end();
 }
}
