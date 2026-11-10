import Phaser from 'phaser';
import config from '../game.config.json' with {type:'json'};
import {MissionAttempt,type RoomId,type Result} from './mission';
import {Player} from './player';
import {Projectiles} from './projectiles';
import {stepEnemy,enemyRect,enemyPhase,suspendEnemy,enemyMuzzle,turretPresentation} from './enemies';
import {clearLine,intersects,segmentRect,expand} from './geometry';
import {terminalInReach,cacheInReach} from './interactions';
import {SceneArt} from './render';
import {shotVelocities} from './session/research';
import {hasEvent,repairPosition} from './session/events';
import {roomThreatCanActivate} from './session/threat-activation';
import {regulatorBody,regulatorPattern} from './boss';
import {musicTheme} from './audio';
import type {Controls,Frame,Action} from './input';
import type {AudioService} from './audio';
import type {EventName} from './telemetry';
export type ServiceSlot='R01'|'R02'|'R03'|'R04'|'R05'|'S04'|'S05'|'INTEL'|'RELAY';
export type RoomHooks={controls:Controls;effects:AudioService;emit:(name:EventName,params?:Record<string,string|number>)=>void;pause:()=>void;playAllowed:()=>boolean;ghostFrame:(room:string)=>{x:number;y:number;facing:1|-1;animation_id:'idle'|'run'|'jump'|'crouch'}|null;result:(result:Result)=>void;dying:()=>void;objective:(key:string,params?:Record<string,string|number>)=>void;hud:(attempt:MissionAttempt,player:Player,hold:number)=>void;container:(slot:ServiceSlot)=>void;fork:()=>void;autoFire:()=>boolean;debug:()=>boolean;combatAssist:()=>boolean;reducedFlashes:()=>boolean;transition:(active:boolean)=>void};
export class RoomScene extends Phaser.Scene{
 attempt!:MissionAttempt;player!:Player;projectiles=new Projectiles();hold=0;transition:{to:RoomId;entry:'left'|'right';remaining:number}|null=null;
 private entry:'left'|'right'='left';private art!:SceneArt;private solidRemovers=new Map<string,()=>void>();private encountered=new Set<string>();
 private readyAnnounced=false;private modalOpened=false;private deathMs=0;private pendingPressed=new Set<Action>();private pendingReleased=new Set<Action>();private hazardCycles=new Map<string,number>();private ghostMarker?:Phaser.GameObjects.Graphics;private serviceMarkers?:Phaser.GameObjects.Graphics;
 constructor(readonly hooks:RoomHooks){super('Room');}
 init(data:{attempt:MissionAttempt;entry?:'left'|'right'}){this.attempt=data.attempt;this.entry=data.entry||'left';}
 create(){
  this.readyAnnounced=false;this.hold=0;this.transition=null;this.deathMs=0;this.modalOpened=false;this.pendingPressed.clear();this.pendingReleased.clear();this.hazardCycles.clear();this.projectiles=new Projectiles();this.solidRemovers.clear();
  const a=this.attempt,id=a.current,def=a.definition(),saved=a.room();this.physics.world.setBounds(0,40,640,280);const platforms=this.physics.add.staticGroup();
  def.solids.forEach(s=>{const r=this.add.rectangle(s.x+s.width/2,s.y+s.height/2,s.width,s.height,0xffffff,0);this.physics.add.existing(r,true);platforms.add(r);if(s.id)this.solidRemovers.set(s.id,()=>{(r.body as Phaser.Physics.Arcade.StaticBody).destroy();r.destroy();});});
  this.player=new Player(this,this.entry==='right'?584:64);this.player.dashReady=a.abilityReadyAt;this.player.chargeReady=a.abilityReadyAt;this.physics.add.collider(this.player.sprite,platforms,undefined,(_player,platform)=>{if(this.attempt.clock.now>=this.player.dashUntil||!a.build.wallMove&&!a.build.phaseDash)return true;const object=platform as Phaser.GameObjects.Rectangle;return !def.solids.some(s=>(s.material==='wall'&&a.build.wallMove||s.material==='phase'&&a.build.phaseDash)&&Math.abs(s.x+s.width/2-object.x)<1&&Math.abs(s.y+s.height/2-object.y)<1);});this.art=new SceneArt(this,def,a.eventPlan,this.hooks.debug);
  this.hooks.effects.startWorld(musicTheme(a.missionId,id));if(def.boss)void this.hooks.effects.unlock().then(()=>this.hooks.effects.play('boss_intro','boss-intro:'+a.id));this.hooks.controls.setScope(this.hooks.playAllowed()?'play':'menu');a.clock.clear();this.hooks.transition(false);this.hooks.emit('room_enter',{revisit:Number(saved.visited)});saved.visited=true;if(!this.hooks.playAllowed())this.scene.pause();
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{for(const enemy of a.room(id).enemies)suspendEnemy(enemy);this.hooks.effects.clearCombat();this.projectiles.clear();this.hooks.controls.clear();});
 }
 update(_time:number,delta:number){
  const frame=this.hooks.controls.poll();if((frame.down.size||frame.pressed.size)&&!this.attempt.tutorial.has('first_control')){this.attempt.tutorial.add('first_control');this.hooks.emit('first_control');}if(frame.pressed.has('pause')&&this.deathMs===0){this.hooks.pause();return;}
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
  if(def.boss)attempt.bossElapsedMs+=ms;
  const oldVy=this.player.body.velocity.y,wasDashing=now<this.player.dashUntil;
  this.player.step(frame,now,ms,def.solids,attempt.mode==='training'||attempt.build.active==='M1',attempt.build.airDash);
  if(attempt.build.active==='W4')attempt.abilityReadyAt=this.player.chargeReady;else attempt.abilityReadyAt=this.player.dashReady;
  if(oldVy>=0&&this.player.body.velocity.y< -200)this.hooks.effects.play('jump');
  if(!wasDashing&&now<this.player.dashUntil){this.hooks.effects.play('dash');this.hooks.emit('ability_used',{ability:'M1',airborne:Number(!this.player.body.blocked.down)});}
  this.physics.world.update(now,ms);this.physics.world.postUpdate();if(oldVy>30&&(this.player.body.blocked.down||this.player.body.touching.down))this.hooks.effects.play('land');
  if(attempt.current==='E'&&this.player.x>272&&(this.player.body.blocked.down||this.player.body.touching.down)&&(Math.abs(this.player.feet-256)<2||Math.abs(this.player.feet-224)<2))saved.route='service';
  const muzzle=this.player.muzzle,targets=[...(def.target&&saved.targetHp>0?[{x:def.target.x-10,y:def.target.y-18,width:20,height:36}]:[]),...(def.boss&&attempt.bossHp>0?[regulatorBody(def.boss.x,def.boss.y,def.boss.width,def.boss.height)]:[]),...saved.enemies.filter(e=>e.hp>0).map(enemyRect)].map(r=>expand(r,4,1.5));
  const auto=this.hooks.controls.device==='touch'&&this.hooks.autoFire()&&targets.some(t=>(t.x+t.width/2-this.player.x)*this.player.facing>0&&muzzle.y>=t.y&&muzzle.y<=t.y+t.height&&clearLine(muzzle,{x:t.x+t.width/2,y:muzzle.y},def.solids));
  if((frame.down.has('fire')||frame.pressed.has('fire')||auto)&&now>=this.player.nextShot){for(const velocity of shotVelocities(this.player.facing,attempt.profile.projectileSpeed,attempt.build.spread))this.projectiles.fire(muzzle,velocity,'player','cutter',attempt.build.piercing?1:0,attempt.build.ricochet?1:0,attempt.profile.projectileDamage);this.player.nextShot=now+1000/attempt.profile.shotsPerSecond;this.art.cue('muzzle',muzzle,now,this.player.facing);this.hooks.effects.play('shot');}
  if(attempt.build.active==='W4'&&frame.pressed.has('ability')&&now>=this.player.chargeReady){this.projectiles.fire(muzzle,{x:this.player.facing*attempt.profile.projectileSpeed*1.2,y:0},'player','W4',0,0,config.m05b3.w4_damage);this.player.chargeReady=now+config.m05b3.w4_cooldown_ms;attempt.abilityReadyAt=this.player.chargeReady;this.hooks.effects.play('power_restore');this.hooks.emit('ability_used',{ability:'W4'});}
  const inSafePocket=Boolean(def.safeZones?.some(zone=>intersects(this.player.rect(),zone)));
  const inShield=Boolean(def.safeZones?.some(zone=>zone.shielded&&intersects(this.player.rect(),zone)));
  const bossPattern=def.boss?regulatorPattern(attempt.bossElapsedMs,attempt.bossHp):null;
  for(const hazard of def.hazards||[]){const cycle=Math.floor((now+(hazard.offset_ms||0))/hazard.cycle_ms),phase=(now+(hazard.offset_ms||0))%hazard.cycle_ms;if(phase<hazard.warning_ms&&this.hazardCycles.get(hazard.id)!==cycle){this.hazardCycles.set(hazard.id,cycle);this.hooks.effects.play(hazard.kind==='press'?'warn_turret':'warn_drone');}const active=phase>=hazard.warning_ms&&phase<hazard.warning_ms+hazard.active_ms;if(active&&!inSafePocket&&intersects(this.player.rect(),{x:hazard.x,y:hazard.y,width:hazard.width,height:hazard.height})){this.damage(hazard.kind==='press'?'press':'heat',Math.sign(this.player.x-hazard.x)||1);if(attempt.hp<=0)return;}}
  if(bossPattern?.phase==='warning'){const cycle=Math.floor(attempt.bossElapsedMs/config.m05b3.boss_cycle_ms);if(this.hazardCycles.get('regulator-warning')!==cycle){this.hazardCycles.set('regulator-warning',cycle);this.hooks.effects.play('warn_turret');}}
  if(bossPattern?.phase==='active'&&bossPattern.rects.some(rect=>intersects(this.player.rect(),rect))){this.damage('regulator-beam',Math.sign(this.player.x-(bossPattern.rects[0]?.x||320))||1);if(attempt.hp<=0)return;}
  const playerPoint={x:this.player.x,y:this.player.feet-25};
  for(const enemy of saved.enemies){
   if(!attempt.enemyPowered(enemy))continue;
   const canActivate=roomThreatCanActivate(attempt.current,enemy,saved.enemies,playerPoint,def.solids);
   stepEnemy(enemy,ms,playerPoint,def.solids,this.projectiles,kind=>this.hooks.effects.play(kind==='walker'?'warn_walker':kind==='turret'?'warn_turret':'warn_drone'),this.hooks.combatAssist()?1.5:1,canActivate);
   const key=attempt.id+':'+enemy.id;if(enemy.active&&!this.encountered.has(key)){this.encountered.add(key);this.hooks.emit('enemy_encounter',{enemy_id:enemy.id,enemy_kind:enemy.kind,behavior:enemy.behavior});}
   if(enemy.id==='e-turret'&&enemy.first&&enemy.attackPhase==='recovery'&&!attempt.tutorial.has('turret_hint')&&enemy.hp===4){attempt.tutorial.add('turret_hint');this.hooks.emit('tutorial_step',{step:'turret_open_window'});}
  }
  this.projectiles.step(ms,def.solids,(shot,from,to)=>{
   if(shot.team==='enemy'){
    if(def.safeZones?.some(zone=>zone.shielded&&segmentRect(from,to,zone)))return true;
    if(segmentRect(from,to,expand(this.player.rect(),4,3))){this.damage(shot.source,Math.sign(shot.vx));return true;}return false;
   }
   if(def.boss&&bossPattern&&attempt.bossHp>0&&!shot.hitIds.includes('regulator')&&segmentRect(from,to,expand(regulatorBody(def.boss.x,def.boss.y,def.boss.width,def.boss.height),4,1.5))){shot.hitIds.push('regulator');if(bossPattern.phase==='core'){attempt.bossHp=Math.max(0,attempt.bossHp-shot.damage);this.art.cue(attempt.bossHp===0?'shutdown':'hit',to,now,Math.sign(shot.vx));this.hooks.effects.play(attempt.bossHp===0?'enemy_break':'hit_enemy');if(attempt.bossHp===0)this.hooks.emit('boss_defeated',{boss_id:'regulator'});}else{this.art.cue('armour',to,now,Math.sign(shot.vx));this.hooks.effects.play('hit_armour');}return true;}
   if(def.target&&saved.targetHp>0&&!shot.hitIds.includes('target')&&segmentRect(from,to,expand({x:def.target.x-10,y:def.target.y-18,width:20,height:36},4,1.5))){shot.hitIds.push('target');saved.targetHp-=shot.damage;this.art.cue('hit',to,now,Math.sign(shot.vx));this.hooks.effects.play(saved.targetHp<=0?'enemy_break':'hit_enemy');if(shot.pierces>0){shot.pierces--;return false;}return true;}
   for(const e of saved.enemies)if(e.hp>0&&!shot.hitIds.includes(e.id)&&segmentRect(from,to,expand(enemyRect(e),4,1.5))){
    shot.hitIds.push(e.id);if(e.kind==='turret'&&!turretPresentation(e,attempt.enemyPowered(e)).damageable){this.art.cue('armour',to,now,Math.sign(shot.vx));this.hooks.effects.play('hit_armour');return true;}
    e.hp-=shot.damage;this.art.cue('hit',to,now,Math.sign(shot.vx));if(e.id==='e-turret'&&e.hp<4)attempt.tutorial.add('turret_hit');if(e.hp<=0){e.state='dead';e.attackPhase=null;attempt.scoreLedger?.kill(e.id,e.kind);if(e.id==='m5b-e06-ram'){attempt.scoreLedger?.goal('optional:E06');if(!attempt.e06Rewarded){attempt.e06Rewarded=true;attempt.score+=config.m05b3.e06_score;this.hooks.emit('event_choice',{event_id:'E06',choice:'defeated_patrol',score:attempt.score});}}}this.hooks.effects.play(e.hp<=0?'enemy_break':e.kind==='turret'?'hit_open':'hit_enemy');if(shot.pierces>0&&e.kind!=='turret'){shot.pierces--;return false;}return true;
   }return false;
  },solid=>{attempt.breakPanel(solid.id!);this.removeSolid(solid.id!);this.hooks.effects.play('enemy_break');this.hooks.emit('route_choice',{route:'piercing-sheet',room_id:attempt.current});},(shot,_solid,point)=>{if(shot.team==='player'){this.art.cue('wall',point,now,Math.sign(shot.vx));this.hooks.effects.play('hit_wall');}});
  if(def.terminal&&!saved.terminal&&!this.readyAnnounced&&this.readyTerminal()){this.readyAnnounced=true;this.hooks.effects.play('terminal_ready');}
  if(!inShield)for(const e of saved.enemies)if(e.hp>0&&attempt.enemyPowered(e)&&e.active&&intersects(this.player.rect(),enemyRect(e)))this.damage(e.kind+'-contact',Math.sign(this.player.x-e.x)||1);
  if(attempt.hp<=0)return;this.interact(ms,frame);if(this.modalOpened)return;this.tutorial();
  if(this.player.x>=620){
   const open=def.id==='A'?saved.terminal:def.id==='F'?attempt.cellCollected:def.id==='M3A'?Boolean(def.next):def.id==='M4C'?attempt.dataUploaded:def.id==='M5D'?attempt.bossHp<=0:true;
   if(def.next&&open){if(def.id==='E')this.hooks.emit('route_choice',{route:saved.route});this.beginTransition(def.next,'left');}
   else if(!def.next&&saved.terminal&&(def.id==='T'||attempt.objective))this.hooks.result('victory');
  }
  if(this.player.x<=20&&def.previous)this.beginTransition(def.previous,'right');
 }
 private damage(reason:string,direction:number){
  if(!this.attempt.damage(this.attempt.clock.now,reason))return;
  this.player.knock(direction,this.attempt.clock.now);
  const point={x:this.player.x,y:this.player.feet-24};
  if(this.attempt.lastDamageAbsorbed){this.art.cue('shield',point,this.attempt.clock.now);if(this.attempt.build.shieldClear)this.projectiles.clearTeam('enemy');this.hooks.effects.play('power_restore');this.hooks.emit('shield_absorbed',{room_id:this.attempt.current});return;}
  if(this.attempt.lastDeathSaved){this.art.cue('charge',point,this.attempt.clock.now);this.hooks.effects.play('power_restore');this.hooks.emit('death_prevented',{node_id:'D4',hp:this.attempt.hp});return;}
  this.art.cue('hit',point,this.attempt.clock.now);this.hooks.effects.play('hurt_player');this.hooks.emit('hit_received',{reason,hp:this.attempt.hp});
  if(this.attempt.hp<=0){this.hold=0;this.projectiles.clear();this.player.body.setVelocity(0,0);this.deathMs=350;this.hooks.controls.setScope('menu');this.hooks.dying();}
 }
 private interact(ms:number,frame:Frame){
  const a=this.attempt,def=a.definition(),saved=a.room(),terminal=def.terminal;
  if(def.relayIntel&&a.entry.relay_leg==='A'&&a.entry.relay_template==='relay_airlock_cargo_v1'&&!a.relayIntelCollected&&Math.abs(this.player.x-def.relayIntel.x)<repairPosition.radius&&this.player.feet>303&&frame.pressed.has('interact')){this.modalOpened=true;this.hold=0;this.hooks.container('INTEL');return;}
  if(def.relayRepairCache&&a.entry.relay_leg==='B'&&a.entry.relay_support==='repair'&&a.cellCollected&&!a.relayRepairUsed&&a.hp<a.maxHp&&Math.abs(this.player.x-def.relayRepairCache.x)<def.relayRepairCache.radius&&this.player.feet>303&&frame.pressed.has('interact')){this.modalOpened=true;this.hold=0;this.hooks.container('RELAY');return;}
  if(a.missionId==='airlock'&&a.current==='B'&&!saved.containerUsed&&Math.abs(this.player.x-repairPosition.x)<repairPosition.radius&&this.player.feet>303&&frame.pressed.has('interact')){this.modalOpened=true;this.hold=0;this.hooks.container('R01');return;}
  if(def.repair&&!saved.repairUsed&&a.hp<a.maxHp&&(def.repair.slot!=='R02'||a.cellCollected)&&(!def.repair.slot||def.repair.slot!=='R04'||a.dataUploaded)&&Math.abs(this.player.x-def.repair.x)<def.repair.radius&&this.player.feet>303&&frame.pressed.has('interact')){this.modalOpened=true;this.hold=0;this.hooks.container(def.repair.slot);return;}
  if(def.cache&&!saved.cacheUsed&&cacheInReach(this.player.x,this.player.feet,def.cache)&&frame.pressed.has('interact')){if(def.cache.id==='S04'&&hasEvent(a.eventPlan,'E05')){this.modalOpened=true;this.hooks.container('S04');}else if(def.cache.id==='S05'&&hasEvent(a.eventPlan,'E06')){this.modalOpened=true;this.hooks.container('S05');}else if(a.chooseCache('salvage')){this.hooks.effects.play('cache_claim');this.hooks.emit('mission_objective',{objective:'salvage_collected',score:a.score});}return;}
  if(def.cell&&!a.cellCollected&&Math.abs(this.player.x-def.cell.x)<34&&this.player.feet>303&&frame.pressed.has('interact')){a.cellCollected=true;this.art.cue('charge',def.cell,a.clock.now);this.hooks.effects.play('cache_claim');this.hooks.emit('mission_objective',{objective:'cell_collected'});return;}
  const inRange=terminal&&terminalInReach(this.player.x,this.player.feet,terminal);if(!inRange||saved.terminal||!this.readyTerminal()){this.hold=0;return;}
  if((def.terminalKind==='power'||def.terminalKind==='training')&&frame.pressed.has('interact')){saved.terminal=true;this.art.cue('charge',terminal!,a.clock.now);this.hooks.effects.play('power_restore');this.hooks.effects.play('gate_open');if(a.missionId==='foundry'&&def.id==='M3A'){this.modalOpened=true;this.hooks.fork();}return;}
  if(def.terminalKind==='restore'&&hasEvent(a.eventPlan,'E01')&&frame.pressed.has('interact')){saved.terminal=true;this.art.cue('charge',terminal!,a.clock.now);this.removeSolid('f-power-gate');this.hooks.effects.play('power_restore');this.hooks.emit('event_choice',{event_id:'E01',choice:'restore_power'});return;}
  if((def.terminalKind==='exit'||def.terminalKind==='install'||def.terminalKind==='data')&&frame.down.has('interact')){
   this.hold+=ms;if(this.hold+1e-6>=config.combat.terminal_hold_ms){saved.terminal=true;this.art.cue('charge',terminal!,a.clock.now);a.objective=true;if(def.terminalKind==='install'){a.cellInstalled=true;this.hooks.emit('mission_objective',{objective:'cell_installed'});}if(def.terminalKind==='data'){a.dataUploaded=true;this.hooks.emit('mission_objective',{objective:'data_uploaded'});}this.hold=0;this.hooks.effects.play('power_restore');this.hooks.effects.play('gate_open');}
  }else this.hold=0;
 }
 private beginTransition(to:RoomId,entry:'left'|'right'){this.transition={to,entry,remaining:config.combat.transition_ms};this.hold=0;this.player.body.setVelocity(0,0);this.projectiles.clear();this.hooks.controls.setScope('menu');this.hooks.transition(true);}
 private tutorial(){
  const a=this.attempt;if(a.current!=='A'&&a.current!=='T')return;
  const flags:Record<string,boolean>={move:this.player.x>112,jump:this.player.feet<305,crouch:this.player.crouching&&this.player.x>324&&this.player.x<420,fire:a.room().targetHp<=0,interact:a.room().terminal};for(const[step,done]of Object.entries(flags))if(done&&!a.tutorial.has(step)){a.tutorial.add(step);this.hooks.emit('tutorial_step',{step});}if(Object.keys(flags).every(step=>a.tutorial.has(step))&&!a.tutorial.has('tutorial_complete')){a.tutorial.add('tutorial_complete');this.hooks.emit('tutorial_complete');}
 }
 closeContainer(){this.modalOpened=false;this.pendingPressed.clear();this.pendingReleased.clear();this.attempt.clock.clear();}
 private renderState(){
  const a=this.attempt,def=a.definition(),saved=a.room();this.art.render(this.player,a,saved,this.projectiles,this.hold,this.deathMs>0,this.hooks.reducedFlashes());this.hooks.hud(a,this.player,this.hold);this.serviceMarkers??=this.add.graphics().setDepth(8);this.serviceMarkers.clear();if(def.relayIntel&&a.entry.relay_leg==='A'&&!a.relayIntelCollected){const p=def.relayIntel;this.serviceMarkers.fillStyle(0x76dcc8,.16);this.serviceMarkers.lineStyle(2,0x76dcc8,.88);this.serviceMarkers.fillCircle(p.x,p.y-15,13);this.serviceMarkers.strokeCircle(p.x,p.y-15,13);this.serviceMarkers.strokeRoundedRect(p.x-5,p.y-22,10,14,2);this.serviceMarkers.fillCircle(p.x,p.y-15,2);}if(def.relayRepairCache&&a.entry.relay_leg==='B'&&a.entry.relay_support==='repair'&&a.cellCollected&&!a.relayRepairUsed){const p=def.relayRepairCache;this.serviceMarkers.fillStyle(0xf2b563,.18);this.serviceMarkers.lineStyle(2,0xf2b563,.9);this.serviceMarkers.fillRoundedRect(p.x-10,p.y-25,20,20,4);this.serviceMarkers.strokeRoundedRect(p.x-10,p.y-25,20,20,4);this.serviceMarkers.lineBetween(p.x-5,p.y-15,p.x+5,p.y-15);this.serviceMarkers.lineBetween(p.x,p.y-20,p.x,p.y-10);}this.ghostMarker??=this.add.graphics().setDepth(9);const ghost=this.hooks.ghostFrame(a.current);this.ghostMarker.clear();if(ghost){const crouched=ghost.animation_id==='crouch',height=crouched?11:20,top=ghost.y-height;this.ghostMarker.fillStyle(0x76dcc8,.12);this.ghostMarker.lineStyle(1.5,0x76dcc8,.64);this.ghostMarker.fillRoundedRect(ghost.x-8,top,16,height,4);this.ghostMarker.strokeRoundedRect(ghost.x-8,top,16,height,4);this.ghostMarker.fillCircle(ghost.x,top-5,5);this.ghostMarker.strokeCircle(ghost.x,top-5,5);this.ghostMarker.fillStyle(0x76dcc8,.8).fillTriangle(ghost.x+ghost.facing*2,top-6,ghost.x+ghost.facing*9,top-4,ghost.x+ghost.facing*2,top-2);if(ghost.animation_id==='run')this.ghostMarker.lineBetween(ghost.x-11,ghost.y-3,ghost.x-15,ghost.y);if(ghost.animation_id==='jump')this.ghostMarker.lineBetween(ghost.x-7,ghost.y+2,ghost.x+7,ghost.y+2);}
  let key=a.objective?'mission.objective.exit':a.missionId==='cargo'?'cargo.objective.cell':a.missionId==='foundry'?'foundry.objective.line':a.missionId==='archive'?'archive.objective.data':'reactor.objective.blockade',params:Record<string,string|number>={};
  if(a.current==='A'||a.current==='T'){const steps:[string,Action][]=[['move','right'],['jump','jump'],['crouch','crouch'],['fire','fire'],['interact','interact']];const next=steps.find(([name])=>!a.tutorial.has(name));key=next?'mission.tutorial.'+next[0]:'mission.objective.open';if(next)params.action=next[1];}
  else if(a.current==='B'){key=hasEvent(a.eventPlan,'E02')?'mission.objective.closed':'mission.objective.corridor';if(a.missionId==='airlock'&&!saved.containerUsed&&Math.abs(this.player.x-repairPosition.x)<repairPosition.radius){key='mission.objective.repair';params.action='interact';}}
  else if(a.missionId==='cargo'){
   key=a.cellInstalled?'cargo.objective.exit':a.cellCollected?'cargo.objective.install':'cargo.objective.cell';
   if(def.cell&&!a.cellCollected&&Math.abs(this.player.x-def.cell.x)<38){key='cargo.objective.take';params.action='interact';}
   if(def.id==='F'&&hasEvent(a.eventPlan,'E01')&&!saved.terminal&&Math.abs(this.player.x-88)<34){key='cargo.objective.restore';params.action='interact';}
   const teachingTurret=saved.enemies.find(enemy=>enemy.id==='e-turret');if(def.id==='E'&&teachingTurret&&a.tutorial.has('turret_hint')&&!a.tutorial.has('turret_hit'))key='cargo.objective.turretHint';
  }
  else if(a.missionId==='foundry'){if(def.id==='M3A')key=saved.terminal?'foundry.objective.route':'foundry.objective.terminal';else if(def.id==='M3B')key='foundry.objective.service';else if(def.id==='M3C')key=hasEvent(a.eventPlan,'E04')?'foundry.objective.heat':'foundry.objective.press';else if(def.id==='M3D')key=saved.terminal?'mission.objective.exit':'foundry.objective.cooling';if(def.cache&&!saved.cacheUsed&&cacheInReach(this.player.x,this.player.feet,def.cache)){key='foundry.objective.salvage';params.action='interact';}}
  else if(a.missionId==='archive'){if(def.id==='M4A')key='archive.objective.sorting';else if(def.id==='M4B')key=hasEvent(a.eventPlan,'E05')?'archive.objective.beacon':'archive.objective.cache';else if(def.id==='M4C')key=a.dataUploaded?'archive.objective.transit':a.scoutedArchive?'archive.objective.scouted':'archive.objective.upload';else key=a.dataUploaded?'archive.objective.exit':'archive.objective.data';if(def.cache&&!saved.cacheUsed&&cacheInReach(this.player.x,this.player.feet,def.cache)){key=hasEvent(a.eventPlan,'E05')?'archive.objective.beaconChoice':'archive.objective.salvage';params.action='interact';}}
  else if(a.missionId==='reactor'){if(def.id==='M5A')key=saved.terminal?'reactor.objective.transit':'reactor.objective.blockade';else if(def.id==='M5B')key=a.s05Accepted?'reactor.objective.patrolActive':def.cache&&!saved.cacheUsed?'reactor.objective.patrol':'reactor.objective.heat';else if(def.id==='M5C')key='reactor.objective.service';else if(def.id==='M5D')key=a.bossHp<=0?'reactor.objective.bossDown':'reactor.objective.boss';else key='reactor.objective.evacuation';if(def.cache&&!saved.cacheUsed&&cacheInReach(this.player.x,this.player.feet,def.cache)){key='reactor.objective.patrolChoice';params.action='interact';}if(def.boss&&a.bossHp>0)params={hp:a.bossHp};}
  if(def.repair&&!saved.repairUsed&&a.hp<a.maxHp&&(!def.repair||def.repair.slot!=='R04'||a.dataUploaded)&&Math.abs(this.player.x-def.repair.x)<def.repair.radius){key='mission.objective.repairSlot';params={action:'interact',slot:def.repair.slot};}
  if(!saved.terminal&&def.terminal&&this.readyTerminal()&&(def.terminalKind==='exit'||def.terminalKind==='install'||def.terminalKind==='data')&&terminalInReach(this.player.x,this.player.feet,def.terminal)){key=def.terminalKind==='data'?'archive.objective.holdUpload':'mission.objective.hold';params={action:'interact',seconds:.6};}
  if(this.transition){key='mission.objective.transition';params={room:this.transition.to};}this.hooks.objective(key,params);
 }
 snapshot(){return this.player?.sprite.body?{player:this.player.snapshot(),missionId:this.attempt.missionId,targetHp:this.attempt.room().targetHp,powered:this.attempt.room().terminal,room:this.attempt.current,hp:this.attempt.hp,maxHp:this.attempt.maxHp,critical:this.attempt.hp>0&&this.attempt.hp/this.attempt.maxHp<=1/3,score:this.attempt.score,loadout:structuredClone(this.attempt.build),eventPlan:structuredClone(this.attempt.eventPlan),containerUsed:this.attempt.missionId==='airlock'?this.attempt.room('B').containerUsed:false,bufferUsed:this.attempt.room().bufferUsed,cellCollected:this.attempt.cellCollected,cellInstalled:this.attempt.cellInstalled,dataUploaded:this.attempt.dataUploaded,scoutedArchive:this.attempt.scoutedArchive,s05Accepted:this.attempt.s05Accepted,e06Rewarded:this.attempt.e06Rewarded,d4Used:this.attempt.d4Used,bossHp:this.attempt.bossHp,foundryRoute:this.attempt.foundryRoute,objective:this.attempt.objective,attemptId:this.attempt.id,activeSeconds:this.attempt.activeMs/1000,holdMs:this.hold,projectiles:this.projectiles.shots.map(s=>({...s})),enemies:this.attempt.room().enemies.map(e=>({...e,phase:enemyPhase(e),activated:e.active,powered:this.attempt.enemyPowered(e),turret:e.kind==='turret'?turretPresentation(e,this.attempt.enemyPowered(e)):undefined,muzzle:enemyMuzzle(e),remaining:e.state==='attack'&&e.attackPhase==='recovery'?e.cooldown:e.phaseMs})),roomStates:structuredClone(this.attempt.states),simMs:this.attempt.clock.now,transition:Boolean(this.transition)}:null;}
}
