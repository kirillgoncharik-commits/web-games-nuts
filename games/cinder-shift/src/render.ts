import Phaser from 'phaser';
import assets from './art/assets.generated.json' with {type:'json'};
import {miraRigPose} from './art/rig';
import type {MissionAttempt,RoomDefinition,RoomState,Rect} from './mission';
import type {Player} from './player';
import type {Projectiles} from './projectiles';

type AssetId=keyof typeof assets.frames;
export function preloadArt(scene:Phaser.Scene){
  const base='./assets/m03/';
  for(const [name,atlas] of Object.entries(assets.atlases))scene.load.atlas('m03-'+name,base+atlas.image.file,base+atlas.json.file);
  for(const [name,file] of Object.entries(assets.backgrounds))scene.load.image('m03-bg-'+name,base+file.file);
}

// The pool changes textures and integer draw positions; it never steps the simulation.
export class SceneArt{
  private pool:Phaser.GameObjects.Image[]=[];private used=0;
  private debug:Phaser.GameObjects.Graphics;
  constructor(private scene:Phaser.Scene,private room:RoomDefinition){
    scene.add.image(0,40,'m03-bg-far').setOrigin(0).setTint(0xb8bccb);
    scene.add.image(0,40,'m03-bg-'+(room.id==='T'?'A':room.id)).setOrigin(0).setTint(0xbac6c9);
    for(const solid of room.solids)this.platform(solid);
    this.debug=scene.add.graphics().setDepth(20);
  }
  private platform(s:Rect){
    for(let y=0;y<s.height;y+=16)for(let x=0;x<s.width;x+=16){
      const id:AssetId=y===0?'floor-top':'floor-face';
      const tile=this.scene.add.image(s.x+x,s.y+y,'m03-environment',id).setOrigin(0).setDepth(2);
      tile.setCrop(0,0,Math.min(16,s.width-x),Math.min(16,s.height-y));
    }
  }
  private sprite(id:AssetId,x:number,y:number,depth=4,flip=1){
    const meta=assets.frames[id];let sprite=this.pool[this.used++];
    if(!sprite){sprite=this.scene.add.image(0,0,'m03-'+meta.atlas,id);this.pool.push(sprite);}
    sprite.setTexture('m03-'+meta.atlas,id).setOrigin(meta.pivot[0]/meta.source_canvas[0],meta.pivot[1]/meta.source_canvas[1]);
    sprite.setPosition(Math.round(x),Math.round(y)).setScale(flip,1).setAngle(0).setAlpha(1).clearTint().setDepth(depth).setVisible(true);
    return sprite;
  }
  private line(x:number,y:number,toX:number,toY:number,color:'signal-coral'|'signal-mint',thickness=1){
    const a=Math.round(toX)-Math.round(x),b=Math.round(toY)-Math.round(y);
    return this.sprite(color,x,y,7).setDisplaySize(Math.hypot(a,b),thickness).setRotation(Math.atan2(b,a));
  }
  render(player:Player,attempt:MissionAttempt,state:RoomState,shots:Projectiles,hold:number,dying:boolean){
    this.used=0;const room=this.room,now=attempt.clock.now,x=Math.round(player.x),y=Math.round(player.feet),f=player.facing;
    const pose=miraRigPose(now,player.body.velocity.x,y,player.crouching);
    const hit=now<attempt.hurtUntil&&Math.floor(now/80)%2===0;
    const hero=(id:AssetId,px:number,py:number)=>{
      const s=this.sprite(id,px,py,6,f);if(dying)s.setTint(0x776b70);else if(hit)s.setTintFill(0xf1d8ae);return s;
    };
    this.sprite('mira-shadow',x,y+1,3).setAlpha(.6);
    if(now<player.dashUntil)this.sprite('mira-body-stand',x-f*30,y-40,5,f).setTintFill(0x76dcc8).setAlpha(.2);
    hero('mira-leg',x-9,pose.frontLegY).setOrigin(f>0?0:1,0).setScale(f,pose.frontLegHeight/12);
    hero('mira-leg',x+3,pose.backLegY).setOrigin(f>0?0:1,0).setScale(f,pose.backLegHeight/12);
    hero('mira-boot',x-11,pose.frontBootY).setOrigin(f>0?0:1,0);
    hero('mira-boot',x+2,pose.backBootY).setOrigin(f>0?0:1,0).setScale(f*1.1,1);
    hero(player.crouching?'mira-body-crouch':'mira-body-stand',x,y-(player.crouching?17:32)).setOrigin(.5,0);
    hero('mira-head',x,y-pose.height).setOrigin(.5,0);
    hero('mira-cutter',x+f*(19-21),y-(player.crouching?15:28)-4);
    if(room.target&&state.targetHp>0){
      this.sprite(state.targetHp===3?'target':'target-damaged',room.target.x,room.target.y);
      for(let i=0;i<state.targetHp;i++)this.sprite('signal-mint',room.target.x-8+i*6,room.target.y-27,7).setDisplaySize(4,3);
    }
    if(room.terminal){
      const ready=room.id==='C'||state.targetHp<=0;
      this.sprite(state.terminal?'terminal-on':ready?'terminal-ready':'terminal-off',room.terminal.x,320,3);
      if(hold>0)this.sprite('signal-mint',room.terminal.x-20,258,7).setDisplaySize(40*Math.min(1,hold/600),4);
    }
    this.sprite(state.terminal||room.id==='B'?'gate-open':'gate-closed',609,320,3);
    if(room.previous)this.sprite('gate-open',31,320,3);
    for(const e of state.enemies){
      if(e.hp<=0){this.sprite(e.kind==='walker'?'walker-wreck':'drone-wreck',e.x,320);continue;}
      const facing=e.phase==='telegraph'||e.phase==='attack'?Math.sign(e.aim.x-e.x)||-1:e.direction;
      this.sprite(e.kind,e.x,e.kind==='walker'?e.y+15:e.y,5,facing);
      for(let i=0;i<e.hp;i++)this.sprite('signal-coral',e.x-9+i*7,e.y-27,7).setDisplaySize(5,2);
      if(e.phase==='telegraph'){
        if(e.kind==='walker'){
          this.line(e.x,e.y-17,e.aim.x,e.y-17,'signal-coral').setAlpha(.85);
          this.sprite('warning-triangle',e.x,e.y-43,8);
        }else{
          this.line(e.x,e.y,e.aim.x,e.aim.y,'signal-coral').setAlpha(.85);
          this.sprite('warning-reticle',e.aim.x,e.aim.y,8);
          this.line(e.aim.x-14,e.aim.y,e.aim.x+14,e.aim.y,'signal-coral');
        }
      }
    }
    for(const shot of shots.shots)this.sprite(shot.team==='player'?'shot-player':'shot-enemy',shot.x,shot.y,8,shot.vx>=0?1:-1);
    for(let i=this.used;i<this.pool.length;i++)this.pool[i].setVisible(false);
    this.debug.clear();
    if((document.querySelector('#debug-bodies') as HTMLInputElement)?.checked){
      this.debug.lineStyle(1,0x76dcc8);for(const s of room.solids)this.debug.strokeRect(s.x,s.y,s.width,s.height);
      const body=player.rect();this.debug.lineStyle(1,0xffb65b).strokeRect(body.x,body.y,body.width,body.height);
      this.debug.lineStyle(1,0xf36d76);for(const e of state.enemies)if(e.hp>0)this.debug.strokeRect(e.x-13,e.y-(e.kind==='walker'?15:10),26,e.kind==='walker'?30:20);
      const m=player.muzzle;this.debug.lineStyle(1,0xedf1ec).lineBetween(m.x-3,m.y,m.x+3,m.y).lineBetween(m.x,m.y-3,m.x,m.y+3);
    }
    document.querySelector('#hp-value')!.textContent=`${attempt.hp}/6`;
    document.querySelectorAll('#hp-segments i').forEach((s,i)=>s.classList.toggle('lost',i>=attempt.hp));
    document.querySelector('#hud-room')!.textContent=room.id==='T'?'ПОЛИГОН':`ОТСЕК ${room.id} / 3`;
  }
}
