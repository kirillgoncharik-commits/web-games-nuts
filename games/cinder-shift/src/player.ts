import Phaser from 'phaser';
import config from '../game.config.json' with {type:'json'};
import type {Frame} from './input';
import type {Rect} from './mission';
import {intersects} from './geometry';
export class Player{
  readonly sprite:Phaser.Physics.Arcade.Sprite;
  private dashStartX=0;private dashDirection=1;
  facing=1;crouching=false;lastGrounded=-1000;jumpQueued=-1000;jumpConsumed=false;dashUntil=0;dashReady=0;knockUntil=0;nextShot=0;
  constructor(scene:Phaser.Scene,x:number){this.sprite=scene.physics.add.sprite(x,298,'body').setVisible(false).setCollideWorldBounds(true);}
  get body(){return this.sprite.body as Phaser.Physics.Arcade.Body;}
  get x(){return this.sprite.x;}
  get feet(){return this.sprite.y+22;}
  get muzzle(){return {x:this.x+this.facing*19,y:this.feet-(this.crouching?15:28)};}
  rect():Rect{return {x:this.body.x,y:this.body.y,width:this.body.width,height:this.body.height};}
  step(frame:Frame,now:number,ms:number,solids:Rect[],dashAllowed:boolean){
    const b=this.body,m=config.movement,grounded=b.blocked.down||b.touching.down;
    if(grounded){this.lastGrounded=now;this.jumpConsumed=false;}
    if(frame.pressed.has('jump'))this.jumpQueued=now;
    const standing={x:this.x-11,y:this.feet-m.standing_height,width:22,height:m.standing_height-.1};
    this.crouching=frame.down.has('crouch')||solids.some(s=>intersects(standing,s));
    const h=this.crouching?m.crouching_height:m.standing_height;
    if(b.height!==h){b.setSize(22,h,false);b.setOffset(0,44-h);b.updateFromGameObject();}
    const direction=Number(frame.down.has('right'))-Number(frame.down.has('left'));
    if(direction&&now>=this.dashUntil)this.facing=direction;
    const speed=this.crouching?m.crouch_speed:config.initial_balance.walk_speed;
    if(dashAllowed&&frame.pressed.has('ability')&&grounded&&now>=this.dashReady){this.dashUntil=now+m.dash_ms;this.dashReady=now+m.dash_cooldown_ms;this.dashStartX=this.x;this.dashDirection=this.facing;}
    if(now<this.dashUntil){const remaining=Math.max(0,config.m04.dash_distance-(this.x-this.dashStartX)*this.dashDirection);b.setVelocityX(this.dashDirection*Math.min(m.dash_speed,remaining/(ms/1000)));}
    else if(b.velocity.x*this.dashDirection>speed&&this.dashUntil>0&&now-this.dashUntil<ms+1)b.setVelocityX(direction*speed);
    else {
      const target=direction*speed,change=(direction?m.acceleration:m.deceleration)*ms/1000*(now<this.knockUntil?.5:1);
      b.setVelocityX(b.velocity.x+Math.sign(target-b.velocity.x)*Math.min(change,Math.abs(target-b.velocity.x)));
    }
    if(now-this.jumpQueued<=m.jump_buffer_ms && now-this.lastGrounded<=m.coyote_ms && !this.jumpConsumed && !this.crouching){b.setVelocityY(config.initial_balance.jump_velocity);this.jumpQueued=-1000;this.lastGrounded=-1000;this.jumpConsumed=true;}
    if(frame.released.has('jump')&&b.velocity.y< -110)b.setVelocityY(-110);
  }
  knock(direction:number,now:number){this.body.setVelocityX(direction*130);this.knockUntil=now+120;}
  snapshot(){return {x:this.x,y:this.sprite.y,vx:this.body.velocity.x,vy:this.body.velocity.y,crouching:this.crouching};}
}
