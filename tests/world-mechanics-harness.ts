// Internal graybox entry only. Never imported by the production game.
import Phaser from 'phaser';
import {Controls,type Frame} from '../games/cinder-shift/src/input';
import {Player} from '../games/cinder-shift/src/player';
import {SimulationClock} from '../games/cinder-shift/src/mission';
import {preloadArt} from '../games/cinder-shift/src/render';
import {SaveService} from '../games/cinder-shift/src/session/save';
import {createCarryRoom,carryAction,stepCarry,settleCarry,resetMandatoryItem,createPowerRoom,switchCircuit,circuitSolids,powerReadout,canFire} from '../games/cinder-shift/src/session/world-mechanics';
import config from '../games/cinder-shift/game.config.json' with {type:'json'};
import type {Rect} from '../games/cinder-shift/src/room-data';

const world=new URLSearchParams(location.search).get('world')==='adriatic'?'adriatic':'small-world',controls=new Controls(),storage=new SaveService('0.8.0-alpha.1'),key=`world.fixture.${world}.v1` as const;
const record=await storage.loadModeData(key),raw=record.value as {schema?:number;ledger?:string[];circuit?:'A'|'B'}|undefined,restored=raw?.schema===1?raw:undefined;
const carry=createCarryRoom('SW01-A','lid',{x:112,y:312},[{id:'c02-small-world:SW01-A:contact:drawer-lock-01',rect:{x:276,y:278,width:24,height:28},active:false,open:true}],restored?.ledger||[]);
const power=createPowerRoom([{id:'bridge-A',solidOn:'A',rect:{x:224,y:276,width:68,height:12}},{id:'bridge-B',solidOn:'B',rect:{x:324,y:264,width:120,height:12}}],restored?.circuit||'A',restored?.ledger||[]);
let sample:Sample;
class Sample extends Phaser.Scene{
 player!:Player;clock=new SimulationClock();paused=false;completed=false;private geometry!:Phaser.Physics.Arcade.StaticGroup;private solids:Rect[]=[];private ink!:Phaser.GameObjects.Graphics;private hero!:Phaser.GameObjects.Image;private head!:Phaser.GameObjects.Image;private weapon!:Phaser.GameObjects.Image;private legs:Phaser.GameObjects.Image[]=[];private saving=Promise.resolve();
 preload(){preloadArt(this);}
 create(){const g=this.make.graphics({x:0,y:0});g.fillStyle(0xffffff).fillRect(0,0,22,44).generateTexture('body',22,44);g.destroy();this.physics.world.setBounds(0,40,640,280);this.geometry=this.physics.add.staticGroup();this.player=new Player(this,64);this.rebuild();this.physics.add.collider(this.player.sprite,this.geometry);this.ink=this.add.graphics();this.hero=this.add.image(0,0,'m03-mira','mira-body-stand').setOrigin(.5,0);this.head=this.add.image(0,0,'m03-mira','mira-head').setOrigin(.5,0);this.weapon=this.add.image(0,0,'m03-mira','mira-cutter').setOrigin(0,0);this.legs=[this.add.image(0,0,'m03-mira','mira-leg').setOrigin(0,0),this.add.image(0,0,'m03-mira','mira-leg').setOrigin(0,0)];controls.setScope('play');document.getElementById('game')?.focus();window.addEventListener('blur',()=>this.suspend());this.draw();}
 private rebuild(){this.geometry.clear(true,true);this.solids=[{x:0,y:320,width:640,height:40},...(world==='small-world'?[{x:176,y:224,width:14,height:54},{x:176,y:224,width:80,height:8}]:circuitSolids(power))];for(const s of this.solids){const r=this.add.rectangle(s.x+s.width/2,s.y+s.height/2,s.width,s.height,0,0);this.physics.add.existing(r,true);this.geometry.add(r);}}
 private persist(){const record={schema:1,ledger:world==='small-world'?[...carry.ledger]:[...power.ledger],circuit:power.circuit};this.saving=this.saving.then(async()=>{await storage.saveModeData(key,record);});}
 private suspend(){this.paused=true;this.clock.clear();controls.clear();if(carry.item.state==='thrown')resetMandatoryItem(carry);}
 update(_time:number,delta:number){const frame=controls.poll();if(frame.pressed.has('pause')){this.paused=!this.paused;this.clock.clear();controls.clear();if(carry.item.state==='thrown')resetMandatoryItem(carry);this.draw();return;}if(this.paused||this.completed){this.draw();return;}let first=true;this.clock.advance(delta,ms=>{const f:Frame={down:frame.down,pressed:first?frame.pressed:new Set(),released:first?frame.released:new Set()};first=false;this.step(ms,f);});this.draw();}
 private step(ms:number,frame:Frame){const player=this.player;player.step(frame,this.clock.now,ms,this.solids,false);this.physics.world.update(this.clock.now,ms);this.physics.world.postUpdate();
  if(world==='small-world'){
   if(frame.pressed.has('interact'))carryAction(carry,{x:player.x,y:player.feet-28},player.facing===-1?-1:1,frame.down.has('crouch'));
   if(stepCarry(carry,ms,this.solids).length)this.persist();settleCarry(carry,{x:player.x+player.facing*19,y:player.feet-28},this.solids);
  }else if(frame.pressed.has('interact')&&Math.abs(player.x-112)<34){if(switchCircuit(power,player.rect())){this.rebuild();this.persist();}}
  if(player.x>580&&(world==='small-world'?carry.contacts.every(c=>c.active):power.switches>0)){this.completed=true;player.body.setVelocity(0,0);if(world==='adriatic'&&!power.ledger.includes('c03-adriatic-1986:YU01-B:line-ready'))power.ledger.push('c03-adriatic-1986:YU01-B:line-ready');this.persist();}
 }
 private draw(){const g=this.ink;g.clear();g.fillStyle(world==='small-world'?0x3b2f32:0x173e55).fillRect(0,40,640,280);for(const r of this.solids){g.fillStyle(0x8ca2a4).fillRect(r.x,r.y,r.width,r.height);g.lineStyle(2,0xf1d8ae).strokeRect(r.x,r.y,r.width,r.height);}if(world==='small-world'){for(const c of carry.contacts){g.lineStyle(3,c.active?0x76dcc8:0xffb65b).strokeRect(c.rect.x,c.rect.y,c.rect.width,c.rect.height);g.lineBetween(c.rect.x,c.rect.y,c.rect.x+c.rect.width,c.rect.y+c.rect.height);}g.fillStyle(0xf1d8ae).fillEllipse(carry.item.position.x,carry.item.position.y,24,10);}else{g.lineStyle(3,0xffb65b).lineBetween(112,302,power.circuit==='A'?96:128,280);g.fillStyle(0x76dcc8);for(let i=0;i<(power.circuit==='A'?1:2);i++)g.fillCircle(100+i*20,264,4);g.lineStyle(2,0xf1d8ae).lineBetween(112,306,440,306);if(power.circuit==='B')g.lineBetween(112,310,440,310);}
  const y=this.player.feet,x=this.player.x,f=this.player.facing;this.hero.setTexture('m03-mira',this.player.crouching?'mira-body-crouch':'mira-body-stand').setPosition(x,y-(this.player.crouching?17:32)).setFlipX(f<0);this.head.setPosition(x,y-(this.player.crouching?26:44)).setFlipX(f<0);this.weapon.setPosition(x+f*2,y-32).setFlipX(f<0).setVisible(world!=='small-world'||canFire(carry));for(let i=0;i<2;i++)this.legs[i].setPosition(x-8+i*12,y-12).setFlipX(f<0);
  const status=document.getElementById('status')!;status.textContent=this.paused?'PAUSED · Escape':this.completed?'SAMPLE COMPLETE · reload checks persisted state':world==='small-world'?'SW01-A · E: pickup / throw · S+E: drop · contact → right exit':`YU01-B · E near lever: A/B · ${powerReadout(power).label} · ${powerReadout(power).lamps} lamp(s)`;
 }
 snapshot(){return{world,paused:this.paused,completed:this.completed,player:this.player?.snapshot(),carry:structuredClone(carry),power:structuredClone(power),canFire:canFire(carry),storageAvailable:storage.available,solids:this.solids};}
}
sample=new Sample();new Phaser.Game({type:Phaser.AUTO,parent:'game',width:640,height:360,pixelArt:true,audio:{noAudio:true},input:{keyboard:false},physics:{default:'arcade',arcade:{gravity:{x:0,y:config.initial_balance.gravity},customUpdate:true,fixedStep:false}},scene:[sample],banner:false});
(window as any).__WORLD_SAMPLE__=()=>sample.snapshot();
