import Phaser from 'phaser';
import config from '../game.config.json' with {type:'json'};
import {MissionAttempt,rooms,type RoomId,type Point,type Result} from './mission';
import {Player} from './player';
import {Projectiles} from './projectiles';
import {stepEnemy,enemyRect} from './enemies';
import {clearLine,intersects,segmentRect,expand} from './geometry';
import {SceneArt} from './render';
import {shotVelocities} from './session/research';
import {hasEvent,repairPosition} from './session/events';
import type {Controls,Frame,Action} from './input';
import type {Effects} from './audio';
import type {EventName} from './telemetry';

export type RoomHooks={controls:Controls;effects:Effects;emit:(name:EventName,params?:Record<string,string|number>)=>void;pause:()=>void;result:(result:Result)=>void;dying:()=>void;objective:(key:string,params?:Record<string,string|number>)=>void;hud:(attempt:MissionAttempt,player:Player,hold:number)=>void;container:()=>void;autoFire:()=>boolean;debug:()=>boolean;transition:(active:boolean)=>void};
export class RoomScene extends Phaser.Scene{
  attempt!:MissionAttempt;player!:Player;projectiles=new Projectiles();
  hold=0;transition:{to:RoomId;entry:'left'|'right';remaining:number}|null=null;
  private entry:'left'|'right'='left';private art!:SceneArt;
  private modalOpened=false;private deathMs=0;private pendingPressed=new Set<Action>();private pendingReleased=new Set<Action>();
  constructor(readonly hooks:RoomHooks){super('Room');}
  init(data:{attempt:MissionAttempt;entry?:'left'|'right'}){this.attempt=data.attempt;this.entry=data.entry||'left';}
  create(){
    this.hold=0;this.transition=null;this.deathMs=0;this.modalOpened=false;this.pendingPressed.clear();this.pendingReleased.clear();this.projectiles=new Projectiles();
    const def=this.attempt.definition(),saved=this.attempt.room();
    this.physics.world.setBounds(0,40,640,280);
    const platforms=this.physics.add.staticGroup();
    def.solids.forEach(s=>{const r=this.add.rectangle(s.x+s.width/2,s.y+s.height/2,s.width,s.height,0xffffff,0);this.physics.add.existing(r,true);platforms.add(r);});
    this.player=new Player(this,this.entry==='right'?584:64);this.physics.add.collider(this.player.sprite,platforms);
    this.art=new SceneArt(this,def,this.attempt.eventPlan,this.hooks.debug);
    this.hooks.controls.setScope('play');this.attempt.clock.clear();this.hooks.transition(false);
    this.hooks.emit('room_enter',{revisit:Number(saved.visited)});saved.visited=true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.projectiles.clear();this.hooks.controls.clear();});
  }
  update(_time:number,delta:number){
    const frame=this.hooks.controls.poll();
    if(frame.pressed.has('pause')&&this.deathMs===0){this.hooks.pause();return;}
    frame.pressed.forEach(a=>this.pendingPressed.add(a));frame.released.forEach(a=>this.pendingReleased.add(a));
    this.attempt.clock.advance(delta,ms=>{
      if(this.transition){
        this.transition.remaining-=ms;
        if(this.transition.remaining<=0){const change=this.transition;this.attempt.current=change.to;this.scene.restart({attempt:this.attempt,entry:change.entry});return false;}
        return;
      }
      if(this.deathMs>0){this.deathMs-=ms;if(this.deathMs<=0){this.hooks.result('death');return false;}return;}
      const simFrame:Frame={down:frame.down,pressed:new Set(this.pendingPressed),released:new Set(this.pendingReleased)};
      this.pendingPressed.clear();this.pendingReleased.clear();
      this.step(ms,simFrame);
      if(this.attempt.result||this.modalOpened)return false;
    });
    this.renderState();
  }
  private step(ms:number,frame:Frame){
    const attempt=this.attempt,now=attempt.clock.now,def=attempt.definition(),saved=attempt.room();
    attempt.activeMs+=ms;
    const oldVy=this.player.body.velocity.y;
    this.player.step(frame,now,ms,def.solids,attempt.mode==='training'||attempt.build.dash);
    if(oldVy>=0&&this.player.body.velocity.y< -200)this.hooks.effects.tone(140,.12);
    this.physics.world.update(now,ms);this.physics.world.postUpdate();
    const muzzle=this.player.muzzle;
    const targets=[...(def.target&&saved.targetHp>0?[{x:def.target.x-10,y:def.target.y-18,width:20,height:36}]:[]),...saved.enemies.filter(e=>e.hp>0).map(enemyRect)].map(r=>expand(r,4,1.5));
    const auto=this.hooks.controls.device==='touch' && this.hooks.autoFire() && targets.some(t=>(t.x+t.width/2-this.player.x)*this.player.facing>0 && muzzle.y>=t.y && muzzle.y<=t.y+t.height && clearLine(muzzle,{x:t.x+t.width/2,y:muzzle.y},def.solids));
    if((frame.down.has('fire')||frame.pressed.has('fire')||auto)&&now>=this.player.nextShot){
      for(const velocity of shotVelocities(this.player.facing,config.initial_balance.projectile_speed,attempt.build.spread))this.projectiles.fire(muzzle,velocity,'player','cutter');this.player.nextShot=now+1000/config.initial_balance.shots_per_second;this.hooks.effects.tone(380,.055,.025);
    }
    for(const enemy of saved.enemies)stepEnemy(enemy,ms,{x:this.player.x,y:this.player.feet-25},def.solids,this.projectiles,kind=>this.hooks.effects.tone(kind==='walker'?210:680,kind==='walker'?.18:.1,.025));
    this.projectiles.step(ms,def.solids,(shot,from,to)=>{
      if(shot.team==='enemy'){
        if(segmentRect(from,to,expand(this.player.rect(),4,3))){this.damage(shot.source,Math.sign(shot.vx));return true;}return false;
      }
      if(def.target&&saved.targetHp>0&&segmentRect(from,to,expand({x:def.target.x-10,y:def.target.y-18,width:20,height:36},4,1.5))){saved.targetHp--;this.hooks.effects.tone(180,.09);return true;}
      for(const e of saved.enemies)if(e.hp>0&&segmentRect(from,to,expand(enemyRect(e),4,1.5))){e.hp--;if(e.hp<=0)e.phase='dead';this.hooks.effects.tone(e.hp<=0?95:180,.1);return true;}
      return false;
    });
    for(const e of saved.enemies)if(e.hp>0&&intersects(this.player.rect(),enemyRect(e)))this.damage(e.kind==='walker'?'walker-contact':'drone-contact',Math.sign(this.player.x-e.x)||1);
    if(attempt.hp<=0)return;
    this.interact(ms,frame);
    if(this.modalOpened)return;
    this.tutorial();
    if(this.player.x>=620){
      if(def.next && (def.id!=='A'||saved.terminal))this.beginTransition(def.next,'left');
      else if(!def.next&&saved.terminal&&(def.id==='T'||attempt.objective))this.hooks.result('victory');
    }
    if(this.player.x<=20&&def.previous)this.beginTransition(def.previous,'right');
  }
  private damage(reason:string,direction:number){
    if(!this.attempt.damage(this.attempt.clock.now,reason))return;
    this.player.knock(direction,this.attempt.clock.now);this.hooks.effects.tone(70,.16,.055);this.hooks.emit('hit_received',{reason,hp:this.attempt.hp});
    if(this.attempt.hp<=0){this.hold=0;this.projectiles.clear();this.player.body.setVelocity(0,0);this.deathMs=350;this.hooks.controls.setScope('menu');this.hooks.dying();}
  }
  private interact(ms:number,frame:Frame){
    const def=this.attempt.definition(),saved=this.attempt.room(),terminal=def.terminal;
    if(this.attempt.current==='B'&&hasEvent(this.attempt.eventPlan,'E03')&&!saved.containerUsed&&Math.abs(this.player.x-repairPosition.x)<repairPosition.radius&&this.player.feet>303&&frame.pressed.has('interact')){this.modalOpened=true;this.hold=0;this.hooks.container();return;}
    const inRange=terminal&&Math.abs(this.player.x-terminal.x)<34&&this.player.feet>303;
    if(!inRange||saved.terminal){this.hold=0;return;}
    if((def.id==='A'||def.id==='T')&&frame.pressed.has('interact')&&saved.targetHp<=0){saved.terminal=true;this.hooks.effects.tone(440,.16);return;}
    if(def.id==='C'&&frame.down.has('interact')){
      this.hold+=ms;
      if(this.hold+1e-6>=config.combat.terminal_hold_ms){saved.terminal=true;this.attempt.objective=true;this.hold=0;this.hooks.effects.tone(550,.2);}
    }else this.hold=0;
  }
  private beginTransition(to:RoomId,entry:'left'|'right'){
    this.transition={to,entry,remaining:config.combat.transition_ms};this.hold=0;this.player.body.setVelocity(0,0);this.projectiles.clear();this.hooks.controls.setScope('menu');this.hooks.transition(true);
  }
  private tutorial(){
    const a=this.attempt;if(a.current!=='A'&&a.current!=='T')return;
    const flags:Record<string,boolean>={move:this.player.x>112,jump:this.player.feet<305,crouch:this.player.crouching&&this.player.x>324&&this.player.x<420,fire:a.room().targetHp<=0,interact:a.room().terminal};
    for(const [step,done] of Object.entries(flags))if(done&&!a.tutorial.has(step)){a.tutorial.add(step);this.hooks.emit('tutorial_step',{step});}
  }
  closeContainer(){this.modalOpened=false;this.pendingPressed.clear();this.pendingReleased.clear();this.attempt.clock.clear();}
  private renderState(){
    const a=this.attempt,def=a.definition(),saved=a.room();
    this.art.render(this.player,a,saved,this.projectiles,this.hold,this.deathMs>0);
    this.hooks.hud(a,this.player,this.hold);
    let key=a.objective?'mission.objective.exit':'mission.objective.power',params:Record<string,string|number>={};
    if(a.current==='A'||a.current==='T'){
      const steps:[string,Action][]=[['move','right'],['jump','jump'],['crouch','crouch'],['fire','fire'],['interact','interact']];
      const next=steps.find(([name])=>!a.tutorial.has(name));key=next?'mission.tutorial.'+next[0]:'mission.objective.open';if(next)params.action=next[1];
    }else if(a.current==='B'){
      key=hasEvent(a.eventPlan,'E02')?'mission.objective.closed':'mission.objective.corridor';
      if(hasEvent(a.eventPlan,'E03')&&!saved.containerUsed&&Math.abs(this.player.x-repairPosition.x)<repairPosition.radius){key='mission.objective.container';params.action='interact';}
    }else if(!saved.terminal&&def.terminal&&Math.abs(this.player.x-def.terminal.x)<38){key='mission.objective.hold';params={action:'interact',seconds:.6};}
    if(this.transition){key='mission.objective.transition';params={room:this.transition.to};}
    this.hooks.objective(key,params);
  }
  snapshot(){return this.player?.sprite.body?{player:this.player.snapshot(),targetHp:this.attempt.room().targetHp,powered:this.attempt.room().terminal,room:this.attempt.current,hp:this.attempt.hp,maxHp:this.attempt.maxHp,score:this.attempt.score,loadout:structuredClone(this.attempt.build),eventPlan:structuredClone(this.attempt.eventPlan),containerUsed:this.attempt.room('B').containerUsed,objective:this.attempt.objective,attemptId:this.attempt.id,activeSeconds:this.attempt.activeMs/1000,holdMs:this.hold,projectiles:this.projectiles.shots.map(s=>({...s})),enemies:this.attempt.room().enemies.map(e=>({...e})),roomStates:structuredClone(this.attempt.states),simMs:this.attempt.clock.now,transition:Boolean(this.transition)}:null;}
}
