import Phaser from 'phaser';
import config from '../game.config.json' with {type:'json'};
import {MissionAttempt,type RoomId,type Result} from './mission';
import {Player} from './player';
import {Projectiles} from './projectiles';
import {stepEnemy,enemyRect,enemyPhase,suspendEnemy} from './enemies';
import {clearLine,intersects,segmentRect,expand} from './geometry';
import {SceneArt} from './render';
import {shotVelocities} from './session/research';
import {hasEvent,repairPosition} from './session/events';
import type {Controls,Frame,Action} from './input';
import type {AudioService} from './audio';
import type {EventName} from './telemetry';
export type RoomHooks={controls:Controls;effects:AudioService;emit:(name:EventName,params?:Record<string,string|number>)=>void;pause:()=>void;result:(result:Result)=>void;dying:()=>void;objective:(key:string,params?:Record<string,string|number>)=>void;hud:(attempt:MissionAttempt,player:Player,hold:number)=>void;container:()=>void;autoFire:()=>boolean;debug:()=>boolean;transition:(active:boolean)=>void};
export class RoomScene extends Phaser.Scene{
 attempt!:MissionAttempt;player!:Player;projectiles=new Projectiles();hold=0;transition:{to:RoomId;entry:'left'|'right';remaining:number}|null=null;
 private entry:'left'|'right'='left';private art!:SceneArt;private solidRemovers=new Map<string,()=>void>();
 private readyAnnounced=false;private modalOpened=false;private deathMs=0;private repairPocketActive=false;private pendingPressed=new Set<Action>();private pendingReleased=new Set<Action>();
 constructor(readonly hooks:RoomHooks){super('Room');}
 init(data:{attempt:MissionAttempt;entry?:'left'|'right'}){this.attempt=data.attempt;this.entry=data.entry||'left';}
 create(){
  this.readyAnnounced=false;this.hold=0;this.transition=null;this.deathMs=0;this.modalOpened=false;this.repairPocketActive=false;this.pendingPressed.clear();this.pendingReleased.clear();this.projectiles=new Projectiles();this.solidRemovers.clear();
  const a=this.attempt,id=a.current,def=a.definition(),saved=a.room();this.physics.world.setBounds(0,40,640,280);const platforms=this.physics.add.staticGroup();
  def.solids.forEach(s=>{const r=this.add.rectangle(s.x+s.width/2,s.y+s.height/2,s.width,s.height,0xffffff,0);this.physics.add.existing(r,true);platforms.add(r);if(s.id)this.solidRemovers.set(s.id,()=>{(r.body as Phaser.Physics.Arcade.StaticBody).destroy();r.destroy();});});
  this.player=new Player(this,this.entry==='right'?584:64);this.physics.add.collider(this.player.sprite,platforms);this.art=new SceneArt(this,def,a.eventPlan,this.hooks.debug);
  this.hooks.controls.setScope('play');a.clock.clear();this.hooks.transition(false);this.hooks.emit('room_enter',{revisit:Number(saved.visited)});saved.visited=true;
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{for(const enemy of a.room(id).enemies)suspendEnemy(enemy);this.hooks.effects.clearCombat();this.projectiles.clear();this.hooks.controls.clear();});
 }
 update(_time:number,delta:number){
  const frame=this.hooks.controls.poll();if(frame.pressed.has('pause')&&this.deathMs===0){this.hooks.pause();return;}
  frame.pressed.forEach(a=>this.pendingPressed.add(a));frame.released.forEach(a=>this.pendingReleased.add(a));
  this.attempt.clock.advance(delta,ms=>{
   if(this.transition){this.transition.remaining-=ms;if(this.transition.remaining<=0){const change=this.transition;this.attempt.current=change.to;this.scene.restart({attempt:this.attempt,entry:change.entry});return false;}return;}
   if(this.deathMs>0){this.deathMs-=ms;if(this.deathMs<=0){this.hooks.result('death');return false;}return;}
   const simFrame:Frame={down:frame.down,pressed:new Set(this.pendingPressed),released:new Set(this.pendingReleased)};this.pendingPressed.clear();this.pendingReleased.clear();this.step(ms,simFrame);if(this.attempt.result||this.modalOpened)return false;
  });this.renderState();
 }
 private readyTerminal(){const d=this.attempt.definition();return d.terminalKind==='power'||d.terminalKind==='training'?this.attempt.room().targetHp<=0:d.terminalKind==='install'?this.attempt.cellCollected:d.terminalKind==='restore'?hasEvent(this.attempt.eventPlan,'E01'):true;}
 private removeSolid(id:string){this.solidRemovers.get(id)?.();this.solidRemovers.delete(id);}
 private step(ms:number,frame:Frame){
  const attempt=this.attempt,now=attempt.clock.now,def=attempt.definition(),saved=attempt.room();attempt.activeMs+=ms;
  const oldVy=this.player.body.velocity.y,wasDashing=now<this.player.dashUntil;
  this.player.step(frame,now,ms,def.solids,attempt.mode==='training'||attempt.build.dash,attempt.build.airDash);
  if(oldVy>=0&&this.player.body.velocity.y< -200)this.hooks.effects.play('jump');
  if(!wasDashing&&now<this.player.dashUntil){this.hooks.effects.play('dash');this.hooks.emit('ability_used',{ability:'M1',airborne:Number(!this.player.body.blocked.down)});}
  this.physics.world.update(now,ms);this.physics.world.postUpdate();if(oldVy>30&&(this.player.body.blocked.down||this.player.body.touching.down))this.hooks.effects.play('land');
  if(attempt.current==='E'&&this.player.x>272&&(this.player.body.blocked.down||this.player.body.touching.down)&&(Math.abs(this.player.feet-256)<2||Math.abs(this.player.feet-224)<2))saved.route='service';
  const muzzle=this.player.muzzle,targets=[...(def.target&&saved.targetHp>0?[{x:def.target.x-10,y:def.target.y-18,width:20,height:36}]:[]),...saved.enemies.filter(e=>e.hp>0).map(enemyRect)].map(r=>expand(r,4,1.5));
  const auto=this.hooks.controls.device==='touch'&&this.hooks.autoFire()&&targets.some(t=>(t.x+t.width/2-this.player.x)*this.player.facing>0&&muzzle.y>=t.y&&muzzle.y<=t.y+t.height&&clearLine(muzzle,{x:t.x+t.width/2,y:muzzle.y},def.solids));
  if((frame.down.has('fire')||frame.pressed.has('fire')||auto)&&now>=this.player.nextShot){for(const velocity of shotVelocities(this.player.facing,attempt.profile.projectileSpeed,attempt.build.spread))this.projectiles.fire(muzzle,velocity,'player','cutter',attempt.build.piercing?1:0);this.player.nextShot=now+1000/attempt.profile.shotsPerSecond;this.hooks.effects.play('shot');}
  const inSafePocket=Boolean(def.safeZones?.some(zone=>intersects(this.player.rect(),zone)));
  if(inSafePocket&&!this.repairPocketActive){this.projectiles.clearTeam('enemy');for(const enemy of saved.enemies)suspendEnemy(enemy);}
  this.repairPocketActive=inSafePocket;
  if(!inSafePocket&&attempt.enemyPowered())for(const enemy of saved.enemies)stepEnemy(enemy,ms,{x:this.player.x,y:this.player.feet-25},def.solids,this.projectiles,kind=>this.hooks.effects.play(kind==='walker'?'warn_walker':kind==='turret'?'warn_turret':'warn_drone'));
  this.projectiles.step(ms,def.solids,(shot,from,to)=>{
   if(shot.team==='enemy'){if(segmentRect(from,to,expand(this.player.rect(),4,3))){this.damage(shot.source,Math.sign(shot.vx));return true;}return false;}
   if(def.target&&saved.targetHp>0&&!shot.hitIds.includes('target')&&segmentRect(from,to,expand({x:def.target.x-10,y:def.target.y-18,width:20,height:36},4,1.5))){shot.hitIds.push('target');saved.targetHp-=attempt.profile.projectileDamage;this.hooks.effects.play(saved.targetHp<=0?'enemy_break':'hit_enemy');if(shot.pierces>0){shot.pierces--;return false;}return true;}
   for(const e of saved.enemies)if(e.hp>0&&!shot.hitIds.includes(e.id)&&segmentRect(from,to,expand(enemyRect(e),4,1.5))){
    shot.hitIds.push(e.id);if(e.kind==='turret'&&e.attackPhase!=='recovery')return true;
    e.hp-=attempt.profile.projectileDamage;if(e.hp<=0){e.state='dead';e.attackPhase=null;}this.hooks.effects.play(e.hp<=0?'enemy_break':'hit_enemy');if(shot.pierces>0&&e.kind!=='turret'){shot.pierces--;return false;}return true;
   }return false;
  },solid=>{attempt.breakPanel(solid.id!);this.removeSolid(solid.id!);this.hooks.effects.play('enemy_break');this.hooks.emit('route_choice',{route:'piercing-sheet',room_id:attempt.current});});
  if(def.terminal&&!saved.terminal&&!this.readyAnnounced&&this.readyTerminal()){this.readyAnnounced=true;this.hooks.effects.play('terminal_ready');}
  if(!inSafePocket&&attempt.enemyPowered())for(const e of saved.enemies)if(e.hp>0&&intersects(this.player.rect(),enemyRect(e)))this.damage(e.kind+'-contact',Math.sign(this.player.x-e.x)||1);
  if(attempt.hp<=0)return;this.interact(ms,frame);if(this.modalOpened)return;this.tutorial();
  if(this.player.x>=620){
   const open=(def.id!=='A'||saved.terminal)&&(def.id!=='F'||attempt.cellCollected);
   if(def.next&&open){if(def.id==='E')this.hooks.emit('route_choice',{route:saved.route});this.beginTransition(def.next,'left');}
   else if(!def.next&&saved.terminal&&(def.id==='T'||attempt.objective))this.hooks.result('victory');
  }
  if(this.player.x<=20&&def.previous)this.beginTransition(def.previous,'right');
 }
 private damage(reason:string,direction:number){
  if(!this.attempt.damage(this.attempt.clock.now,reason))return;
  this.player.knock(direction,this.attempt.clock.now);
  if(this.attempt.lastDamageAbsorbed){this.hooks.effects.play('power_restore');this.hooks.emit('shield_absorbed',{room_id:this.attempt.current});return;}
  this.hooks.effects.play('hurt_player');this.hooks.emit('hit_received',{reason,hp:this.attempt.hp});
  if(this.attempt.hp<=0){this.hold=0;this.projectiles.clear();this.player.body.setVelocity(0,0);this.deathMs=350;this.hooks.controls.setScope('menu');this.hooks.dying();}
 }
 private interact(ms:number,frame:Frame){
  const a=this.attempt,def=a.definition(),saved=a.room(),terminal=def.terminal;
  if(a.missionId==='airlock'&&a.current==='B'&&!saved.containerUsed&&Math.abs(this.player.x-repairPosition.x)<repairPosition.radius&&this.player.feet>303&&frame.pressed.has('interact')){this.modalOpened=true;this.hold=0;this.hooks.container();return;}
  if(def.cell&&!a.cellCollected&&Math.abs(this.player.x-def.cell.x)<34&&this.player.feet>303&&frame.pressed.has('interact')){a.cellCollected=true;this.hooks.effects.play('cache_claim');this.hooks.emit('mission_objective',{objective:'cell_collected'});return;}
  const inRange=terminal&&Math.abs(this.player.x-terminal.x)<34&&this.player.feet>303;if(!inRange||saved.terminal||!this.readyTerminal()){this.hold=0;return;}
  if((def.terminalKind==='power'||def.terminalKind==='training')&&frame.pressed.has('interact')){saved.terminal=true;this.hooks.effects.play('power_restore');this.hooks.effects.play('gate_open');return;}
  if(def.terminalKind==='restore'&&hasEvent(a.eventPlan,'E01')&&frame.pressed.has('interact')){saved.terminal=true;this.removeSolid('e-power-gate');this.hooks.effects.play('power_restore');this.hooks.emit('event_choice',{event_id:'E01',choice:'restore_power'});return;}
  if((def.terminalKind==='exit'||def.terminalKind==='install')&&frame.down.has('interact')){
   this.hold+=ms;if(this.hold+1e-6>=config.combat.terminal_hold_ms){saved.terminal=true;a.objective=true;if(def.terminalKind==='install'){a.cellInstalled=true;this.hooks.emit('mission_objective',{objective:'cell_installed'});}this.hold=0;this.hooks.effects.play('power_restore');this.hooks.effects.play('gate_open');}
  }else this.hold=0;
 }
 private beginTransition(to:RoomId,entry:'left'|'right'){this.transition={to,entry,remaining:config.combat.transition_ms};this.hold=0;this.player.body.setVelocity(0,0);this.projectiles.clear();this.hooks.controls.setScope('menu');this.hooks.transition(true);}
 private tutorial(){
  const a=this.attempt;if(a.current!=='A'&&a.current!=='T')return;
  const flags:Record<string,boolean>={move:this.player.x>112,jump:this.player.feet<305,crouch:this.player.crouching&&this.player.x>324&&this.player.x<420,fire:a.room().targetHp<=0,interact:a.room().terminal};for(const[step,done]of Object.entries(flags))if(done&&!a.tutorial.has(step)){a.tutorial.add(step);this.hooks.emit('tutorial_step',{step});}
 }
 closeContainer(){this.modalOpened=false;this.pendingPressed.clear();this.pendingReleased.clear();this.attempt.clock.clear();}
 private renderState(){
  const a=this.attempt,def=a.definition(),saved=a.room();this.art.render(this.player,a,saved,this.projectiles,this.hold,this.deathMs>0);this.hooks.hud(a,this.player,this.hold);
  let key=a.objective?'mission.objective.exit':a.missionId==='cargo'?'cargo.objective.cell':'mission.objective.power',params:Record<string,string|number>={};
  if(a.current==='A'||a.current==='T'){const steps:[string,Action][]=[['move','right'],['jump','jump'],['crouch','crouch'],['fire','fire'],['interact','interact']];const next=steps.find(([name])=>!a.tutorial.has(name));key=next?'mission.tutorial.'+next[0]:'mission.objective.open';if(next)params.action=next[1];}
  else if(a.current==='B'){key=hasEvent(a.eventPlan,'E02')?'mission.objective.closed':'mission.objective.corridor';if(a.missionId==='airlock'&&!saved.containerUsed&&Math.abs(this.player.x-repairPosition.x)<repairPosition.radius){key='mission.objective.repair';params.action='interact';}}
  else if(a.missionId==='cargo'){
   key=a.cellInstalled?'cargo.objective.exit':a.cellCollected?'cargo.objective.install':'cargo.objective.cell';
   if(def.cell&&!a.cellCollected&&Math.abs(this.player.x-def.cell.x)<38){key='cargo.objective.take';params.action='interact';}
   if(def.id==='E'&&hasEvent(a.eventPlan,'E01')&&!saved.terminal&&Math.abs(this.player.x-88)<34){key='cargo.objective.restore';params.action='interact';}
  }
  if(!saved.terminal&&def.terminal&&this.readyTerminal()&&(def.terminalKind==='exit'||def.terminalKind==='install')&&Math.abs(this.player.x-def.terminal.x)<38){key='mission.objective.hold';params={action:'interact',seconds:.6};}
  if(this.transition){key='mission.objective.transition';params={room:this.transition.to};}this.hooks.objective(key,params);
 }
 snapshot(){return this.player?.sprite.body?{player:this.player.snapshot(),missionId:this.attempt.missionId,targetHp:this.attempt.room().targetHp,powered:this.attempt.room().terminal,room:this.attempt.current,hp:this.attempt.hp,maxHp:this.attempt.maxHp,score:this.attempt.score,loadout:structuredClone(this.attempt.build),eventPlan:structuredClone(this.attempt.eventPlan),containerUsed:this.attempt.missionId==='airlock'?this.attempt.room('B').containerUsed:false,bufferUsed:this.attempt.room().bufferUsed,cellCollected:this.attempt.cellCollected,cellInstalled:this.attempt.cellInstalled,objective:this.attempt.objective,attemptId:this.attempt.id,activeSeconds:this.attempt.activeMs/1000,holdMs:this.hold,projectiles:this.projectiles.shots.map(s=>({...s})),enemies:this.attempt.room().enemies.map(e=>({...e,phase:enemyPhase(e),activated:e.active,remaining:e.state==='attack'&&e.attackPhase==='recovery'?e.cooldown:e.phaseMs})),roomStates:structuredClone(this.attempt.states),simMs:this.attempt.clock.now,transition:Boolean(this.transition)}:null;}
}
