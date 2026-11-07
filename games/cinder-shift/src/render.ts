import Phaser from 'phaser';
import assets from './art/assets.generated.json' with {type:'json'};
import promo from './art/promo.generated.json' with {type:'json'};
import {enemyPhase,enemyRect} from './enemies';
import {miraRigPose} from './art/rig';
import {hasEvent,repairPosition,type EventPlan} from './session/events';
import type {MissionAttempt,RoomDefinition,RoomState,Rect} from './mission';
import type {Player} from './player';
import type {Projectiles} from './projectiles';

type AssetId=keyof typeof assets.frames;
export function preloadArt(scene:Phaser.Scene){
  const base='./assets/m03/';
  for(const [name,atlas] of Object.entries(assets.atlases))scene.load.atlas('m03-'+name,base+atlas.image.file,base+atlas.json.file);
  for(const [name,file] of Object.entries(assets.backgrounds))scene.load.image('m03-bg-'+name,base+file.file);
  scene.load.image('promo-loading','./assets/m05b1/'+promo.loading.file);scene.load.image('promo-menu','./assets/m05b1/'+promo.menu.file);
}

// The pool changes textures and integer draw positions; it never steps the simulation.
export class SceneArt{
  private pool:Phaser.GameObjects.Image[]=[];private used=0;
  private threats:Phaser.GameObjects.Graphics;private debug:Phaser.GameObjects.Graphics;private exitMarker:Phaser.GameObjects.Text;
  constructor(private scene:Phaser.Scene,private room:RoomDefinition,private plan:EventPlan=[],private debugEnabled:()=>boolean=()=>false){
    scene.add.image(0,40,'m03-bg-far').setOrigin(0).setTint(0x8e9aa9);
    scene.add.image(0,40,'m03-bg-'+room.theme).setOrigin(0).setTint(0xa8b5bd);
    scene.add.rectangle(0,216,640,104,0x1c2a39).setOrigin(0).setDepth(1);
    scene.add.tileSprite(0,216,640,104,'m03-environment','wall').setOrigin(0).setTint(0x91a7b0).setAlpha(.32).setDepth(1);
    for(const x of [96,288,512])scene.add.tileSprite(x,224,16,96,'m03-environment','support').setOrigin(0).setTint(0x91a7b0).setAlpha(.32).setDepth(1);
    if(room.id==='A'||room.id==='T'){scene.add.rectangle(298,110,208,106,0x213747,.72).setOrigin(0).setDepth(1);scene.add.tileSprite(300,112,204,104,'m03-environment','wall').setOrigin(0).setTint(0x72909c).setAlpha(.24).setDepth(1);}
    for(const solid of room.solids)if(!solid.id)this.platform(solid);
    this.exitMarker=scene.add.text(609,222,'→',{fontFamily:'Arial',fontSize:'18px',color:'#FFB65B'}).setOrigin(.5).setDepth(3);
    if(room.id==='B'&&hasEvent(plan,'E02'))for(const x of [320,382])scene.add.image(x,40,'m03-props','signal-mint').setOrigin(0).setDisplaySize(2,232).setTintFill(0xffb65b).setDepth(3);
    this.threats=scene.add.graphics().setDepth(5);this.debug=scene.add.graphics().setDepth(20);
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
    this.used=0;this.threats.clear();const room=this.room,now=attempt.clock.now,x=Math.round(player.x),y=Math.round(player.feet),f=player.facing;
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
      const ready=room.terminalKind==='install'?attempt.cellCollected:room.terminalKind==='exit'||room.terminalKind==='restore'||state.targetHp<=0;
      this.sprite(state.terminal||room.terminalKind==='restore'&&!hasEvent(attempt.eventPlan,'E01')?'terminal-on':ready?'terminal-ready':'terminal-off',room.terminal.x,320,3);
      if(hold>0)this.sprite('signal-mint',room.terminal.x-20,258,7).setDisplaySize(40*Math.min(1,hold/600),4);
    }
    const exitOpen=room.next?(room.id==='A'?state.terminal:room.id==='F'?attempt.cellCollected:true):state.terminal;
    this.sprite(exitOpen?'gate-open':'gate-closed',609,320,3);
    this.exitMarker.setColor(exitOpen?'#76DCC8':'#FFB65B');
    for(const panel of attempt.definition().solids.filter(s=>s.id)){this.threats.fillStyle(panel.material==='thin'?0x456171:0x213747).fillRect(panel.x,panel.y,panel.width,panel.height);this.threats.lineStyle(2,panel.material==='thin'?0x76dcc8:0xffb65b).strokeRect(panel.x,panel.y,panel.width,panel.height);for(let py=panel.y+8;py<panel.y+panel.height;py+=16)this.threats.lineBetween(panel.x,py,panel.x+panel.width,py-6);}
    if(room.cell&&!attempt.cellCollected){this.threats.fillStyle(0x101823).fillRect(room.cell.x-12,292,24,28);this.threats.lineStyle(2,0x76dcc8).strokeRect(room.cell.x-12,292,24,28);for(let i=0;i<3;i++)this.threats.fillStyle(0x76dcc8).fillRect(room.cell.x-7+i*6,298,4,14);}
    if(attempt.build.buffer&&!state.bufferUsed)this.threats.lineStyle(1,0x76dcc8,.75).strokeRect(x-16,y-47,32,48);
    if(room.id==='B'&&room.safeZones?.length){const zone=room.safeZones[0],displayWidth=Math.min(zone.width,64);this.threats.fillStyle(0x153c3f,.22).fillRect(zone.x,zone.y,displayWidth,zone.height);this.threats.lineStyle(2,0x76dcc8,.8).strokeRect(zone.x,zone.y,displayWidth,zone.height);this.threats.lineStyle(3,0x76dcc8).lineBetween(zone.x,zone.y+4,zone.x,zone.y+zone.height-4);}
    if(room.id==='B'){const cache=this.sprite('repair-cache',repairPosition.x,320,6);if(state.containerUsed)cache.setTint(0x456171).setAlpha(.45);}
    if(room.previous)this.sprite('gate-open',31,320,3);
    for(const e of state.enemies){
      if(e.hp<=0){this.sprite(e.kind==='drone'?'drone-wreck':'walker-wreck',e.x,320);continue;}
      const phase=enemyPhase(e),facing=e.state==='attack'?Math.sign(e.aim.x-e.x)||-1:e.direction;
      if(e.kind==='turret'){const enabled=attempt.enemyPowered(),color=enabled?0xbac6c9:0x456171;this.threats.fillStyle(color).fillRect(e.x-15,e.y+8,30,7).fillRect(e.x-10,e.y-18,20,24);const angle=Math.atan2(e.aim.y-(e.y-17),e.aim.x-e.x);this.threats.lineStyle(5,color).lineBetween(e.x,e.y-17,e.x+Math.cos(angle)*23,e.y-17+Math.sin(angle)*23);this.threats.fillStyle(enabled&&e.attackPhase==='recovery'?0x76dcc8:0x101823).fillRect(e.x-5,e.y-10,10,10);}
      else this.sprite(e.kind,e.x,e.kind==='walker'?e.y+15:e.y,5,facing);
      if(e.behavior==='aggressive'){this.threats.lineStyle(2,0xffb65b).strokeTriangle(e.x-20,e.y-12,e.x-13,e.y-7,e.x-20,e.y-2);if(e.noticeMs>0)this.threats.lineStyle(2,0xf1d8ae).strokeCircle(e.x,e.y-38,12);}
      for(let i=0;i<e.hp;i++)this.sprite('signal-coral',e.x-9+i*7,e.y-27,7).setDisplaySize(5,2);
      if(phase==='telegraph'){
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
    if(this.debugEnabled()){
      this.debug.lineStyle(1,0x76dcc8);for(const s of room.solids)this.debug.strokeRect(s.x,s.y,s.width,s.height);
      const body=player.rect();this.debug.lineStyle(1,0xffb65b).strokeRect(body.x,body.y,body.width,body.height);
      this.debug.lineStyle(1,0xf36d76);for(const e of state.enemies)if(e.hp>0){const r=enemyRect(e);this.debug.strokeRect(r.x,r.y,r.width,r.height);}
      const m=player.muzzle;this.debug.lineStyle(1,0xedf1ec).lineBetween(m.x-3,m.y,m.x+3,m.y).lineBetween(m.x,m.y-3,m.x,m.y+3);
    }
  }
}
