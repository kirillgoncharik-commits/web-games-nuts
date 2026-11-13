import {RegulatorEncounter} from './boss';
import config from '../game.config.json' with {type:'json'};
import type {MissionEntry} from './session/campaign';
import {loadout} from './session/research';
import {characterProfile,type CharacterProfile}from'./session/profile';
import {hasEvent,shutter,cargoShutter,eventConfig,type EventPlan} from './session/events';
import {missions,type PlayableMissionId} from './session/missions';
import {createEnemy,suspendEnemy,type EnemyState} from './enemies';
import type {ScoreLedger} from './session/score-ledger';
export {rooms} from './room-data';
export type {RoomId,Rect,Point,EnemyDefinition,RoomDefinition} from './room-data';
export type {EnemyState} from './enemies';
import {rooms,type RoomId,type RoomDefinition} from './room-data';
export type Mode='mission'|'training';
export type RoomState={powerCircuit:'press'|'furnace';targetHp:number;terminal:boolean;enemies:EnemyState[];visited:boolean;containerUsed:boolean;repairUsed:boolean;cacheUsed:boolean;bufferUsed:boolean;brokenPanels:string[];route:'ground'|'service'|'press'|'archive'};
export type Result='victory'|'death';
export class MissionAttempt{
 readonly id=crypto.randomUUID();readonly missionId:PlayableMissionId;private harmEvent=0;
 current:RoomId;hp:number;readonly profile:CharacterProfile;readonly maxHp:number;readonly entry:MissionEntry;score:number;relayIntelCollected=false;relayRepairUsed=false;
 cargoCircuit:'conveyor'|'security'='security';cargoRerouted=false;objective=false;cellCollected=false;cellInstalled=false;dataUploaded=false;scoutedArchive=false;s05Accepted=false;e06Rewarded=false;d4Used=false;lastDeathSaved=false;readonly regulator=new RegulatorEncounter();abilityReadyAt=0;foundryRoute:'service'|'press'|null=null;activeMs=0;hurtUntil=-1;damageFlashUntil=-1;lastDamageAbsorbed=false;
 result:Result|'abandoned'|null=null;reason='';tutorial=new Set<string>();clock=new SimulationClock();states:Partial<Record<RoomId,RoomState>>={};
 constructor(readonly mode:Mode,entry?:MissionEntry,readonly scoreLedger?:ScoreLedger){this.entry=structuredClone(entry||{mission_id:'airlock',seed:0,build:loadout([]),max_hp:6,initial_hp:6,initial_score:0,event_plan:[]});this.missionId=this.entry.mission_id;this.current=mode==='training'?'T':missions[this.missionId].rooms[0];this.profile=characterProfile(this.entry.build.nodes,this.entry.build.active);this.maxHp=this.entry.max_hp;this.hp=this.entry.initial_hp;this.score=this.entry.initial_score;if(this.entry.relay_leg==='B'&&this.entry.relay_support==='power'&&this.missionId==='cargo'&&hasEvent(this.eventPlan,'E01'))this.room('F').terminal=true;}
 get bossHp(){return this.regulator.hp;}
 set bossHp(value:number){this.regulator.hp=value;}
 get bossElapsedMs(){return this.regulator.elapsedMs;}
 get build(){return this.entry.build;}
 get eventPlan():EventPlan{return this.entry.event_plan;}
 definition(id=this.current):RoomDefinition{const base=rooms[id],saved=this.states[id];let solids=base.solids.filter(s=>!s.id||!saved?.brokenPanels.includes(s.id));if(id==='B'&&hasEvent(this.eventPlan,'E02'))solids=[...solids,shutter];const cargoEvent=id==='F'&&hasEvent(this.eventPlan,'E01');if(cargoEvent&&!saved?.terminal)solids=[...solids,cargoShutter];let terminal=base.terminal,terminalKind=base.terminalKind;if(id==='F'&&!cargoEvent){terminal=undefined;terminalKind=undefined;}let next=base.next,previous=base.previous;if(id==='M3F')next=saved?.route==='press'?'M3C':saved?.route==='service'?'M3B':undefined;if(id==='M3K')previous=this.room('M3F').route==='press'?'M3J':'M3H';if(id==='M4C'&&!this.dataUploaded)next=undefined;const hazards=base.hazards?.filter(h=>h.kind!=='heat'||id==='M5B'||id==='M3E'||hasEvent(this.eventPlan,'E04')).map(h=>id==='M3E'?{...h,enabled:(saved?.powerCircuit||'press')===(h.kind==='press'?'press':'furnace')}:h);const cache=id==='M5B'&&!hasEvent(this.eventPlan,'E06')?undefined:base.cache;if(previous&&!missions[this.missionId].rooms.includes(previous))previous=undefined;if(next&&!missions[this.missionId].rooms.includes(next))next=undefined;const conveyor=base.conveyor?{...base.conveyor,enabled:this.cargoRerouted&&this.cargoCircuit==='conveyor'}:undefined;return{...base,solids,hazards,conveyor,cache,terminal,terminalKind,next,previous};}
 chooseContainer(choice:'repair'|'salvage'){const hasChoice=hasEvent(this.eventPlan,'E03');if(this.mode!=='mission'||this.missionId!=='airlock'||this.current!=='B'||this.room('B').containerUsed||(choice==='salvage'&&!hasChoice))return false;if(choice==='repair'&&!this.claimRepair('R01'))return false;this.room('B').containerUsed=true;if(choice==='salvage'){this.score+=eventConfig.salvageScore;this.scoreLedger?.goal('optional:E03');}return true;}
 collectRelayIntel(){if(this.mode!=='mission'||this.missionId!=='airlock'||this.current!=='B'||this.entry.relay_template!=='relay_airlock_cargo_v1'||this.entry.relay_leg!=='A'||this.relayIntelCollected)return false;this.relayIntelCollected=true;this.scoreLedger?.goal('relay:intel');return true;}
 claimRelayRepair(){if(this.mode!=='mission'||this.missionId!=='cargo'||this.current!=='F'||this.entry.relay_template!=='relay_airlock_cargo_v1'||this.entry.relay_leg!=='B'||this.entry.relay_support!=='repair'||!this.cellCollected||this.relayRepairUsed||this.hp>=this.maxHp)return false;this.relayRepairUsed=true;this.hp=Math.min(this.maxHp,this.hp+2);return true;}
 chooseCache(choice:'salvage'|'scout'|'health'|'challenge'){const def=this.definition(),state=this.room();if(this.mode!=='mission'||!def.cache||state.cacheUsed)return false;const hasBeacon=def.id==='M4B'&&hasEvent(this.eventPlan,'E05'),hasPatrol=def.id==='M5B'&&hasEvent(this.eventPlan,'E06');if(choice==='salvage'){if(hasBeacon||hasPatrol)return false;this.score+=eventConfig.salvageScore;this.scoreLedger?.goal('cache:'+def.id);}else if(choice==='scout'){if(!hasBeacon)return false;this.scoutedArchive=true;}else if(choice==='health'){if(!hasBeacon||this.hp>=this.maxHp)return false;this.hp=Math.min(this.maxHp,this.hp+1);}else{if(!hasPatrol)return false;this.s05Accepted=true;state.enemies.push(createEnemy({id:'m5b-e06-ram',kind:'walker',preset:'ram_charge',x:552,y:305,end:{x:576,y:305},activateX:500,charge:{min:500,max:592}}));}state.cacheUsed=true;return true;}
 toggleCargoPower(){if(this.mode!=='mission'||this.missionId!=='cargo'||this.current!=='M2C')return false;this.cargoCircuit=this.cargoCircuit==='security'?'conveyor':'security';this.cargoRerouted=true;return true;}
 toggleFoundryPower(){if(this.current!=='M3E'||!this.definition().powerSwitch)return false;const saved=this.room();saved.powerCircuit=saved.powerCircuit==='press'?'furnace':'press';return true;}
 chooseFoundryRoute(route:'service'|'press'){if(this.mode!=='mission'||this.missionId!=='foundry'||this.current!=='M3F'||!this.room('M3F').terminal||this.room('M3F').route!=='ground')return false;this.room('M3F').route=route;this.foundryRoute=route;return true;}
 claimRepair(slot:'R01'|'R02'|'R03'|'R04'|'R05'){const required=this.missionId==='airlock'?'R01':this.missionId==='cargo'?'R02':this.missionId==='foundry'?'R03':this.missionId==='archive'?'R04':this.missionId==='reactor'?'R05':null;if(this.mode!=='mission'||slot!==required||this.hp>=this.maxHp||slot==='R02'&&!this.cellCollected)return false;const roomId=slot==='R01'?'B':slot==='R02'?'M2E':slot==='R03'?'M3K':slot==='R04'?'M4C':'M5C',state=this.room(roomId),def=rooms[roomId];if(this.current!==roomId||!def.repair&&slot!=='R01'||state.repairUsed)return false;state.repairUsed=true;state.containerUsed=true;this.hp=Math.min(this.maxHp,this.hp+eventConfig.repairHp);return true;}
 room(id=this.current):RoomState{return this.states[id]||=( {powerCircuit:'press',targetHp:rooms[id].target?3:0,terminal:false,visited:false,containerUsed:false,repairUsed:false,cacheUsed:false,bufferUsed:false,brokenPanels:[],route:'ground',enemies:rooms[id].enemies.map(createEnemy)} );}
 enemyPowered(enemy?:EnemyState){if(this.current==='M2D'&&enemy?.id==='m2d-routed-turret')return this.cargoRerouted&&this.cargoCircuit==='security';if(this.current==='F'&&enemy?.id==='f-event-turret'){if(this.entry.relay_leg==='B'&&this.entry.relay_support==='power')return false;return hasEvent(this.eventPlan,'E01')&&this.room().terminal;}return true;}
 /** Every powered live enemy counts, including one that has not detected Mira yet. */
 combatRemaining(){return this.mode==='training'?0:this.room().enemies.filter(enemy=>enemy.hp>0&&this.enemyPowered(enemy)).length+(this.definition().boss&&this.bossHp>0?1:0);}
 terminalReady(){const d=this.definition(),saved=this.room();if(!d.terminal||saved.terminal||this.combatRemaining()>0&&d.terminalKind!=='restore')return false;if(d.id==='G'&&this.missionId==='cargo')return this.cellInstalled;return d.terminalKind==='power'||d.terminalKind==='training'?saved.targetHp<=0:d.terminalKind==='install'?this.cellCollected:d.terminalKind==='restore'?hasEvent(this.eventPlan,'E01'):true;}
 forwardExitOpen(){
  if(this.combatRemaining()>0)return false;
  const def=this.definition(),saved=this.room();
  if(def.id==='G'&&this.missionId==='cargo')return this.cellInstalled&&saved.terminal;
  if(def.id==='M2C')return this.cargoRerouted;
  if(def.id==='M2E')return this.cellInstalled&&saved.terminal;
  if(!def.next)return saved.terminal&&(this.mode==='training'||this.objective);
  if(def.id==='A'||def.id==='M5A')return saved.terminal;
  if(def.id==='F')return this.cellCollected;
  if(def.id==='M3F')return Boolean(def.next)&&saved.terminal;
  if(def.id==='M3K')return saved.terminal;
  if(def.id==='M4C')return this.dataUploaded;
  return true;
 }
 suspend(){for(const enemy of this.room().enemies)suspendEnemy(enemy);}
 breakPanel(id:string){const saved=this.room();if(!saved.brokenPanels.includes(id))saved.brokenPanels.push(id);}
 damage(now:number,reason:string){
  this.lastDamageAbsorbed=false;this.lastDeathSaved=false;if(this.mode==='training'||this.result||this.hp<=0||now<this.hurtUntil)return false;
  this.hurtUntil=now+config.initial_balance.hurt_invulnerability_seconds*1000;
  if(this.build.buffer&&!this.room().bufferUsed){this.room().bufferUsed=true;this.lastDamageAbsorbed=true;return true;}
  const hpBefore=this.hp;this.hp=Math.max(0,this.hp-1);if(this.hp===0&&this.build.deathSave&&!this.d4Used){this.d4Used=true;this.lastDeathSaved=true;this.hp=Math.min(this.maxHp,config.m05b3.d4_restore_hp);}if(this.hp<hpBefore){this.damageFlashUntil=now+130;this.scoreLedger?.harm(`accepted-hit-${this.harmEvent++}`);}this.reason=reason;return true;
 }
 finish(result:Result|'abandoned'){if(this.result)return false;this.result=result;return true;}
}
// Render rate never changes simulation steps; long frames are admitted as bounded work.
export class SimulationClock{
  now=0;private accumulator=0;
  advance(delta:number,step:(ms:number)=>boolean|void){
    this.accumulator+=Math.max(0,Math.min(delta,250));
    let count=0;
    while(this.accumulator+1e-6>=1000/60 && count<15){this.accumulator-=1000/60;this.now+=1000/60;count++;if(step(1000/60)===false){this.accumulator=0;break;}}
    return count;
  }
  clear(){this.accumulator=0;}
}
