import Phaser from 'phaser';
import assets from './art/assets.generated.json' with {type:'json'};
import promo from './art/promo.generated.json' with {type:'json'};
import {enemyPhase,enemyRect,enemyMuzzle,turretPresentation} from './enemies';
import {miraRigPose} from './art/rig';
import {cargoShutter,hasEvent,repairPosition,type EventPlan} from './session/events';
import {regulatorBody,regulatorPattern} from './boss';
import type {MissionAttempt,RoomDefinition,RoomState,Rect} from './mission';
import {rooms} from './room-data';
import type {Player} from './player';
import type {Projectiles} from './projectiles';

type AssetId=keyof typeof assets.frames;
export function preloadArt(scene:Phaser.Scene){
  const base='./assets/m03/';
  for(const [name,atlas] of Object.entries(assets.atlases))scene.load.atlas('m03-'+name,base+atlas.image.file,base+atlas.json.file);
  for(const [name,file] of Object.entries(assets.backgrounds))scene.load.image('m03-bg-'+name,base+file.file);
  scene.load.atlas('art-refresh-v1','./assets/art-refresh-v1/art-refresh-v1.png','./assets/art-refresh-v1/art-refresh-v1.json');
  scene.load.image('promo-loading','./assets/m06/'+promo.loading.file);scene.load.image('promo-menu','./assets/m06/'+promo.menu.file);
}

// The pool changes textures and integer draw positions; it never steps the simulation.
export class SceneArt{
  private pool:Phaser.GameObjects.Image[]=[];private used=0;private artPool:Phaser.GameObjects.Image[]=[];private artUsed=0;private bufferUsedLast:boolean|null=null;private bufferEffectUntil=-1;private bossHpLast:number|null=null;private bossHitUntil=-1;
  private threats:Phaser.GameObjects.Graphics;private debug:Phaser.GameObjects.Graphics;private exitMarker:Phaser.GameObjects.Text;private shieldLabels:Phaser.GameObjects.Text[]=[];
  constructor(private scene:Phaser.Scene,private room:RoomDefinition,private plan:EventPlan=[],private debugEnabled:()=>boolean=()=>false){
    scene.add.image(0,40,'m03-bg-far').setOrigin(0).setTint(0x8e9aa9);
    scene.add.image(0,40,'m03-bg-'+room.theme).setOrigin(0).setTint(room.sector==='foundry'?0xc98b5b:room.sector==='archive'?0x829fb8:0xa8b5bd);
    scene.add.rectangle(0,216,640,104,0x1c2a39).setOrigin(0).setDepth(1);
    scene.add.tileSprite(0,216,640,104,'m03-environment','wall').setOrigin(0).setTint(0x91a7b0).setAlpha(.32).setDepth(1);
    for(const x of [96,288,512])scene.add.tileSprite(x,224,16,96,'m03-environment','support').setOrigin(0).setTint(0x91a7b0).setAlpha(.32).setDepth(1);
    if(room.id==='A'||room.id==='T'){scene.add.rectangle(298,110,208,106,0x213747,.72).setOrigin(0).setDepth(1);scene.add.tileSprite(300,112,204,104,'m03-environment','wall').setOrigin(0).setTint(0x72909c).setAlpha(.24).setDepth(1);}
    for(const solid of room.solids)if(!solid.id)this.platform(solid);
    this.exitMarker=scene.add.text(609,222,'→',{fontFamily:'Arial',fontSize:'18px',color:'#FFB65B'}).setOrigin(.5).setDepth(3);
    if(room.id==='B'&&hasEvent(plan,'E02'))for(const x of [320,382])scene.add.image(x,40,'m03-props','signal-mint').setOrigin(0).setDisplaySize(2,232).setTintFill(0xffb65b).setDepth(3);
    const repairSlots=new Map<string,{x:number;y:number}>();
    for(const zone of room.safeZones||[])if(zone.slot)repairSlots.set(zone.slot,{x:room.id==='B'?repairPosition.x:room.repair?.x??zone.x+zone.width/2,y:270});
    if(room.repair)repairSlots.set(room.repair.slot,{x:room.repair.x,y:270});
    this.shieldLabels=[...repairSlots].map(([slot,point])=>scene.add.text(point.x-14,point.y,slot,{fontFamily:'Arial',fontSize:'9px',color:'#76DCC8',backgroundColor:'#101823'}).setPadding(2,1).setDepth(6));this.threats=scene.add.graphics().setDepth(5);this.debug=scene.add.graphics().setDepth(20);
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
  private art(frame:string,x:number,y:number,width:number,height:number,depth=4,flip=1,origin:[number,number]=[.5,1],alpha=1){
    let image=this.artPool[this.artUsed++];
    if(!image){image=this.scene.add.image(0,0,'art-refresh-v1');this.artPool.push(image);}
    image.setTexture('art-refresh-v1',frame).setOrigin(origin[0],origin[1]).setPosition(Math.round(x),Math.round(y)).setDisplaySize(width,height).setFlipX(flip<0).setAngle(0).setAlpha(alpha).clearTint().setDepth(depth).setVisible(true);
    return image;
  }
  private landmarks(room:RoomDefinition){
    const groups:Record<string,Array<[string,number,number,number,number]>>={
      D:[['cargo-landmark_container',164,234,112,68],['cargo-landmark_rail-crane',452,192,148,62],['cargo-landmark_power-junction',548,254,62,48]],
      E:[['cargo-landmark_rail-crane',160,194,138,56],['cargo-landmark_container',300,240,112,68],['cargo-landmark_power-junction',560,252,62,48]],
      F:[['cargo-landmark_power-junction',168,248,64,50],['cargo-landmark_rail-crane',312,188,148,56],['cargo-landmark_container',476,236,104,62]],
      G:[['cargo-landmark_container',170,236,108,64],['cargo-landmark_rail-crane',360,190,140,54],['cargo-landmark_power-junction',560,248,58,46]],
      M3A:[['foundry-landmark_furnace',176,252,116,82],['foundry-landmark_process-pipes',444,188,150,60]],
      M3B:[['foundry-landmark_process-pipes',180,188,152,58],['foundry-landmark_press-line',456,238,112,66]],
      M3C:[['foundry-landmark_press-line',160,252,150,76],['foundry-landmark_furnace',456,238,112,80]],
      M3D:[['foundry-landmark_press-line',168,238,118,66],['foundry-landmark_process-pipes',450,188,144,58]],
      M4A:[['archive-landmark_data-racks',168,214,140,82],['archive-landmark_transfer-bus',452,200,144,56]],
      M4B:[['archive-landmark_archive-cabinet',164,238,114,72],['archive-landmark_data-racks',452,212,136,78]],
      M4C:[['archive-landmark_transfer-bus',170,198,148,54],['archive-landmark_archive-cabinet',470,238,112,72]],
      M4D:[['archive-landmark_data-racks',172,210,138,78],['archive-landmark_transfer-bus',450,196,148,54]],
      M5A:[['reactor-landmark_power-bus',156,202,160,68],['reactor-landmark_cooling-manifold',462,232,144,70]],
      M5B:[['reactor-landmark_cooling-manifold',164,232,144,70],['reactor-landmark_beacon-mast',488,220,78,82]],
      M5C:[['reactor-landmark_power-bus',164,202,156,66],['reactor-landmark_beacon-mast',472,220,78,82]],
      M5D:[['reactor-landmark_cooling-manifold',132,236,144,70],['reactor-landmark_power-bus',456,204,152,64]],
      M5E:[['reactor-landmark_beacon-mast',184,216,76,82],['reactor-landmark_power-bus',440,202,156,66]],
    };
    for(const [frame,x,y,w,h] of groups[room.id]||[])this.art(frame,x,y,w,h,1.5);
  }
  private line(x:number,y:number,toX:number,toY:number,color:'signal-coral'|'signal-mint',thickness=1){
    const a=Math.round(toX)-Math.round(x),b=Math.round(toY)-Math.round(y);
    return this.sprite(color,x,y,7).setDisplaySize(Math.hypot(a,b),thickness).setRotation(Math.atan2(b,a));
  }
  private turret(e:import('./enemies').EnemyState,powered:boolean){
    const g=this.threats,{state}=turretPresentation(e,powered),cx=e.x,muzzle=enemyMuzzle(e),facing=Math.sign(e.aim.x-e.x)||1;
    this.art('turret_'+state,cx,e.y+15,54,50,5,facing);
    if(state==='destroyed')return;
    if(state==='warning'){
      this.line(muzzle.x,muzzle.y,e.aim.x,e.aim.y,'signal-coral',2).setAlpha(.85);
      this.sprite('warning-reticle',e.aim.x,e.aim.y,8);g.lineStyle(2,0xf36d76).lineBetween(e.aim.x-14,e.aim.y,e.aim.x+14,e.aim.y);
    }
    if(state==='burst'&&e.shotFlashMs>0)g.fillStyle(0xffb65b,.95).fillCircle(muzzle.x,muzzle.y,5);
  }
  render(player:Player,attempt:MissionAttempt,state:RoomState,shots:Projectiles,hold:number,dying:boolean,reducedFlashes=false){
    this.used=0;this.artUsed=0;this.threats.clear();const room=attempt.definition(),now=attempt.clock.now,x=Math.round(player.x),y=Math.round(player.feet),f=player.facing;
    if(this.bossHpLast===null)this.bossHpLast=attempt.bossHp;else if(attempt.bossHp<this.bossHpLast)this.bossHitUntil=now+140;
    this.bossHpLast=attempt.bossHp;
    this.landmarks(room);
    const pose=miraRigPose(now,player.body.velocity.x,y,player.crouching);
    const hit=now<attempt.damageFlashUntil;
    const hero=(id:AssetId,px:number,py:number)=>{
      const s=this.sprite(id,px,py,6,f);if(dying)s.setTint(0x776b70);else if(hit){if(reducedFlashes)s.setTint(0xf36d76).setAlpha(.9);else s.setTintFill(0xf36d76);}return s;
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
      const kind=room.terminalKind==='install'?'cell':room.terminalKind==='data'?'data':room.terminalKind==='exit'?'exit':'power';
      const ready=room.terminalKind==='install'?attempt.cellCollected:room.terminalKind==='restore'?hasEvent(attempt.eventPlan,'E01'):room.terminalKind==='power'||room.terminalKind==='training'?state.targetHp<=0:true;
      const terminalState=state.terminal||room.terminalKind==='restore'&&!hasEvent(attempt.eventPlan,'E01')?'done':hold>0?'hold':ready?'ready':'off';
      this.art(`terminal_${kind}-${terminalState}`,room.terminal.x,320,32,54,3);
      if(hold>0)this.sprite('signal-mint',room.terminal.x-20,258,7).setDisplaySize(40*Math.min(1,hold/600),4);
    }
    if(room.window){
      const view=room.id==='M5C'?'window-view_reactor-view':'window-view_evacuation-view';
      this.art(view,room.window.x,room.window.y,room.window.width,room.window.height,1,1,[0,0]);
      this.threats.lineStyle(4,0x456171,.95).strokeRect(room.window.x,room.window.y,room.window.width,room.window.height);
      this.threats.lineStyle(2,0x91a7b0,.65).lineBetween(room.window.x+room.window.width/2,room.window.y,room.window.x+room.window.width/2,room.window.y+room.window.height);
    }
    const exitOpen=room.next?(room.id==='A'?state.terminal:room.id==='F'?attempt.cellCollected:room.id==='M3A'?Boolean(room.next):room.id==='M4C'?attempt.dataUploaded:room.id==='M5D'?attempt.bossHp<=0:true):state.terminal;
    this.art(exitOpen?'power-shutter_open':'power-shutter_closed',609,320,40,84,3);
    this.exitMarker.setColor(exitOpen?'#76DCC8':'#FFB65B');
    for(const panel of room.solids.filter(s=>s.id)){
      if(panel.id==='f-power-gate')this.art('power-shutter_closed',panel.x+panel.width/2,panel.y+panel.height,48,panel.height+8,4);
      else if(panel.material==='thin')this.art('thin-sheet_intact',panel.x+panel.width/2,panel.y+panel.height,Math.max(24,panel.width+16),panel.height,4);
      else if(panel.material==='ricochet'){
        const impact=shots.shots.some(s=>s.team==='player'&&s.x>=panel.x-4&&s.x<=panel.x+panel.width+4&&s.y>=panel.y-4&&s.y<=panel.y+panel.height+4);
        this.art(`ricochet-panel_${impact?'impact':'normal'}`,panel.x+panel.width/2,panel.y+panel.height/2,panel.width+18,panel.height+18,4,1,[.5,.5]);
      }else if(panel.material==='wall'){
        const overlapping=player.x+14>=panel.x&&player.x-14<=panel.x+panel.width&&player.feet>=panel.y&&player.feet-44<=panel.y+panel.height;
        const crossing=attempt.build.wallMove&&now<player.dashUntil&&overlapping;
        this.art(`magnetic-wall_${crossing?'pass-ripple':'idle'}`,panel.x+panel.width/2,panel.y+panel.height/2,Math.max(48,panel.width+28),panel.height+16,4,1,[.5,.5],crossing?.9:1);
      }
      else if(panel.material==='phase'){
        const overlapping=player.x+14>=panel.x&&player.x-14<=panel.x+panel.width&&player.feet>=panel.y&&player.feet-44<=panel.y+panel.height;
        const crossing=attempt.build.phaseDash&&overlapping;
        const frame=crossing&&now<player.dashUntil?'passable':crossing&&now-player.dashUntil<120?'restore':'active';
        this.art(`phase-curtain_${frame}`,panel.x+panel.width/2,panel.y+panel.height/2,Math.max(32,panel.width+20),panel.height+16,4,1,[.5,.5],frame==='active'?.82:.9);
      }
    }
    if(room.id==='B'&&hasEvent(attempt.eventPlan,'E02'))this.art('power-shutter_closed',352,256,72,216,3.5);
    if(room.id==='F'&&hasEvent(attempt.eventPlan,'E01')&&state.terminal)this.art('power-shutter_open',cargoShutter.x+cargoShutter.width/2,cargoShutter.y+cargoShutter.height,42,44,4);
    for(const broken of rooms[room.id].solids.filter(s=>s.id&&s.material==='thin'&&state.brokenPanels.includes(s.id)))this.art('thin-sheet_broken',broken.x+broken.width/2,broken.y+broken.height/2,Math.max(24,broken.width+16),broken.height,4,1,[.5,.5]);
    if(room.cell){
      if(!attempt.cellCollected)this.art('energy-cell_uncollected',room.cell.x,320,32,52,4);
      else{
        this.art('energy-cell_socket',room.cell.x,320,32,52,4);
        this.art('energy-cell_carried',x+f*16,y-16,22,30,7,f,[.5,.5]);
      }
    }
    if(room.id==='G'&&attempt.cellInstalled)this.art('energy-cell_installed',room.terminal?room.terminal.x-28:528,320,30,48,4);
    if(this.bufferUsedLast===null)this.bufferUsedLast=state.bufferUsed;
    else if(!this.bufferUsedLast&&state.bufferUsed)this.bufferEffectUntil=now+180;
    else if(this.bufferUsedLast&&!state.bufferUsed)this.bufferEffectUntil=-1;
    this.bufferUsedLast=state.bufferUsed;
    if(attempt.build.buffer){
      const activated=now<this.bufferEffectUntil,frame=!state.bufferUsed?'ready':activated?(attempt.build.shieldClear?'discharge':'absorbed'):'spent';
      this.art(`buffer-discharge_${frame}`,x,y-22,54,54,7,1,[.5,.5],frame==='ready'?.62:frame==='spent'?.45:1);
    }
    for(const zone of room.safeZones||[]){const protectedPocket=zone.shielded===true;this.threats.fillStyle(0x153c3f,protectedPocket?.3:.22).fillRect(zone.x,zone.y,zone.width,zone.height);this.threats.lineStyle(protectedPocket?3:2,0x76dcc8,.8).strokeRect(zone.x,zone.y,zone.width,zone.height);this.threats.lineStyle(protectedPocket?4:3,0x76dcc8).lineBetween(zone.x,zone.y+4,zone.x,zone.y+zone.height-4);if(protectedPocket)for(let px=zone.x+10;px<zone.x+zone.width-3;px+=14)this.threats.lineStyle(1,0x76dcc8,.65).lineBetween(px,zone.y+4,px,zone.y+zone.height-4);}
    if(room.id==='B'){
      const station=this.art(`repair-station_${state.containerUsed?'used':'ready'}`,repairPosition.x,320,46,48,5);
      if(state.containerUsed)station.setAlpha(.72);
    }
    if(room.repair&&(room.repair.slot!=='R04'||attempt.dataUploaded)){
      const protectedSlot=(room.safeZones||[]).some(zone=>zone.slot===room.repair?.slot&&zone.shielded);
      const frame=state.repairUsed?'used':protectedSlot?'protected':'ready';
      this.art(`repair-station_${frame}`,room.repair.x,320,46,50,5);
    }
    if(room.cache){
      const family=room.cache.id==='S04'?'archive':room.cache.id==='S05'?'beacon':'salvage',nearby=Math.abs(player.x-room.cache.x)<=room.cache.radius+12,frame=state.cacheUsed?'used':nearby?'interact':'available';
      this.art(`service-cache_${family}-${frame}`,room.cache.x,320,52,46,5);
    }
    for(const hazard of room.hazards||[]){
      const phase=(now+(hazard.offset_ms||0))%hazard.cycle_ms,warning=phase<hazard.warning_ms,active=phase>=hazard.warning_ms&&phase<hazard.warning_ms+hazard.active_ms,recovery=phase>=hazard.warning_ms+hazard.active_ms,color=active?0xf36d76:warning?0xffb65b:0x687784;
      const frame=active?hazard.kind==='press'?'strike':'active':warning?'warning':recovery?'recovery':hazard.kind==='press'?'safe':'cool',asset=hazard.kind==='press'?'press':'heat-emitter';
      this.art(`${asset}_${frame}`,hazard.x+hazard.width/2,hazard.y+hazard.height,hazard.width+18,hazard.height+14,3);
      this.threats.fillStyle(color,active ? .30 : warning ? .17 : .035).fillRect(hazard.x,hazard.y,hazard.width,hazard.height);
      this.threats.lineStyle(2,color,active ? .95 : warning ? .8 : .4).strokeRect(hazard.x,hazard.y,hazard.width,hazard.height);
      if(warning||active)this.sprite('warning-triangle',hazard.x+hazard.width/2,hazard.y+hazard.height/2,8);
    }
    if(room.boss){
      const pattern=regulatorPattern(attempt.bossElapsedMs,attempt.bossHp),body=regulatorBody(room.boss.x,room.boss.y,room.boss.width,room.boss.height);
      const bossState=attempt.bossHp<=0?(state.terminal?'destroyed':'shutdown'):now<this.bossHitUntil?'hit':attempt.bossHp<=room.boss.hp/2&&pattern.phase==='idle'?'phase-two':pattern.phase==='warning'?'warning':pattern.phase==='active'?'attack':pattern.phase==='core'?'exposed':'armored';
      this.art(`regulator_${bossState}`,room.boss.x,room.boss.y,room.boss.width,room.boss.height,3,1,[.5,1]);
      for(const rect of pattern.rects){const color=pattern.phase==='active'?0xf36d76:0xffb65b;this.threats.fillStyle(color,pattern.phase==='active'?.34:.16).fillRect(rect.x,rect.y,rect.width,rect.height);this.threats.lineStyle(2,color,pattern.phase==='active'?.95:.8).strokeRect(rect.x,rect.y,rect.width,rect.height);}
      this.threats.fillStyle(0x101823).fillRect(room.boss.x-44,body.y-14,88,8);this.threats.fillStyle(0xf36d76).fillRect(room.boss.x-42,body.y-12,84*Math.max(0,attempt.bossHp/room.boss.hp),4);this.threats.lineStyle(1,0xedf1ec,.9).strokeRect(room.boss.x-44,body.y-14,88,8);
    }
    if(room.previous)this.sprite('gate-open',31,320,3);
    for(const e of state.enemies){
      if(e.hp<=0){if(e.kind==='turret')this.turret(e,false);else if(e.preset==='walker_security')this.art('security-walker_destroyed',e.x,e.y+15,44,40,5);else if(e.preset==='ram_charge')this.art('ram-charger_destroyed',e.x,e.y+15,48,38,5);else this.sprite(e.kind==='drone'?'drone-wreck':'walker-wreck',e.x,320);continue;}
      const phase=enemyPhase(e),facing=e.state==='attack'?Math.sign(e.aim.x-e.x)||-1:e.direction;
      if(e.kind==='turret')this.turret(e,attempt.enemyPowered(e));
      else if(e.preset==='walker_security'){
        const frame=phase==='telegraph'?'warning':phase==='attack'?'fire':phase==='recovery'?'recovery':e.state==='chase'||e.noticeMs>0?'notice':'patrol';
        this.art(`security-walker_${frame}`,e.x,e.y+15,42,40,5,facing);
      }else if(e.preset==='ram_charge'){
        const frame=phase==='telegraph'?'windup':phase==='attack'?'charge':phase==='recovery'?'recovery':'idle';
        this.art(`ram-charger_${frame}`,e.x,e.y+15,48,38,5,facing);
      }else this.sprite(e.kind,e.x,e.kind==='walker'?e.y+15:e.y,5,facing);
      if(e.behavior==='aggressive'){this.threats.lineStyle(2,0xffb65b).strokeTriangle(e.x-20,e.y-12,e.x-13,e.y-7,e.x-20,e.y-2);if(e.noticeMs>0)this.threats.lineStyle(2,0xf1d8ae).strokeCircle(e.x,e.y-38,12);}
      for(let i=0;i<e.hp;i++)this.sprite('signal-coral',e.x-9+i*7,e.y-27,7).setDisplaySize(5,2);
      if(phase==='telegraph'&&e.kind==='walker'){const muzzle=enemyMuzzle(e);this.line(muzzle.x,muzzle.y,e.aim.x,muzzle.y,'signal-coral').setAlpha(.85);this.sprite('warning-triangle',e.x,e.y-43,8);}
      else if(phase==='telegraph'&&e.kind==='drone'){const muzzle=enemyMuzzle(e);this.line(muzzle.x,muzzle.y,e.aim.x,e.aim.y,'signal-coral').setAlpha(.85);this.sprite('warning-reticle',e.aim.x,e.aim.y,8);this.line(e.aim.x-14,e.aim.y,e.aim.x+14,e.aim.y,'signal-coral');}
    }
    for(const shot of shots.shots)this.sprite(shot.team==='player'?'shot-player':'shot-enemy',shot.x,shot.y,8,shot.vx>=0?1:-1);
    for(let i=this.used;i<this.pool.length;i++)this.pool[i].setVisible(false);
    for(let i=this.artUsed;i<this.artPool.length;i++)this.artPool[i].setVisible(false);
    this.debug.clear();
    if(this.debugEnabled()){
      this.debug.lineStyle(1,0x76dcc8);for(const s of room.solids)this.debug.strokeRect(s.x,s.y,s.width,s.height);
      const body=player.rect();this.debug.lineStyle(1,0xffb65b).strokeRect(body.x,body.y,body.width,body.height);
      this.debug.lineStyle(1,0xf36d76);for(const e of state.enemies)if(e.hp>0){const r=enemyRect(e);this.debug.strokeRect(r.x,r.y,r.width,r.height);}
      const m=player.muzzle;this.debug.lineStyle(1,0xedf1ec).lineBetween(m.x-3,m.y,m.x+3,m.y).lineBetween(m.x,m.y-3,m.x,m.y+3);
    }
  }
}
