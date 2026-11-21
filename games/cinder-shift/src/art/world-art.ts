import type Phaser from 'phaser';
import type {RoomDefinition,Rect} from '../room-data';
import type {MissionAttempt,RoomState} from '../mission';
import type {Player} from '../player';
import {powerTarget,worldReady,worldPulse,worldPulseArea,worldPowerFieldPhase,worldPhaseDoors} from '../session/world-runtime';
import {keyboardSolids,paperPhase,lampPhase,clothSolid,airPhase} from '../session/world-environment';
import {encounterTiming,encounterSolids} from '../session/world-encounter';
import {ProductionSprites,productionArt,productionFrames} from './production-art';
import {WorldMotionArt} from './world-motion';

/** Sprites give objects identity. Lines describe real wires and hazard signals. */
export class WorldArt{
 private sprites:ProductionSprites;private cues:Phaser.GameObjects.Graphics;private motion:WorldMotionArt;
 private carryState:string|null=null;private carryPose='idle';private carryActionUntil=0;
 constructor(private scene:Phaser.Scene,private room:RoomDefinition){
  this.sprites=new ProductionSprites(scene);this.motion=new WorldMotionArt(scene,room);this.cues=scene.add.graphics().setDepth(5.5);
  const sector=room.id.slice(0,4) as keyof typeof productionArt.sectors;
  scene.add.image(0,40,'production-bg-'+sector).setOrigin(0).setDisplaySize(640,280).setDepth(1.25);
  const props=productionArt.sectors[sector],variant=room.id.charCodeAt(room.id.length-1)-65;
  const decorations=new ProductionSprites(scene);decorations.begin();
  // Rear props remain subdued and never provide collision.
  for(const [i,x,y,w,h]of [[variant%6,100,220,150,120],[(variant+2)%6,330,192,126,105],[(variant+4)%6,550,248,130,128]])decorations.draw(props[i]==='YU01-laundry'?'YU01-balcony':props[i],x,y,w,h,1.45,1,.65);
  decorations.end();
  for(const r of room.solids)if(!r.id)scene.add.tileSprite(r.x,r.y,r.width,r.height,'production-material-'+sector).setOrigin(0).setDepth(2.2);
  for(const q of room.world!.switches??[]){
    const bezel=scene.add.graphics().setDepth(6.55);
    bezel.fillStyle(0x15242f).fillRoundedRect(q.x-24,q.y-68,48,20,3);
    bezel.lineStyle(2,0x8e9a94).strokeRoundedRect(q.x-24,q.y-68,48,20,3);
    bezel.fillStyle(0xd4ac69).fillRect(q.x-21,q.y-60,2,3).fillRect(q.x+19,q.y-60,2,3);
    scene.add.text(q.x,q.y-58,'A / B',{fontFamily:'monospace',fontSize:'10px',color:'#efd6a4',backgroundColor:'#142331'}).setOrigin(.5).setDepth(6.6);
   }
 }
 render(player:Player,a:MissionAttempt,state:RoomState,reduced:boolean){
  const spec=this.room.world!,s=state.world!,now=a.clock.now,g=this.cues,p=this.sprites;p.begin();g.clear();this.motion.render(state,now,reduced,player.x);
  const plate=(frame:string,r:Rect,alpha=1)=>p.rect(frame,r,3.2,alpha);
  const wire=(points:{x:number;y:number}[],color:number,alpha=1)=>{g.lineStyle(2,color,alpha);for(let n=1;n<points.length;n++)g.lineBetween(points[n-1].x,points[n-1].y,points[n].x,points[n].y);};
  for(const r of worldPhaseDoors(spec,s))plate('door-closed',r);
  for(const w of spec.powerWires??[])wire(w.points,w.on==='A'?0xdfa568:0x91d2b8,s.power?.circuit===w.on ? .9 : .25);
  if(spec.belt){plate('bridge-extended',spec.belt.area);if(s.power?.circuit===spec.belt.runningOn&&!reduced){const r=spec.belt.area;g.lineStyle(2,0xdfa568,.8);for(let x=r.x+now/80%12;x<r.x+r.width;x+=16)g.lineBetween(x,r.y+3,x+5,r.y+3);}}
  if(spec.keyboard&&s.keyboard)for(const r of keyboardSolids(spec.keyboard,s.keyboard))plate('SW02-keys',r);
  if(spec.paper&&s.paper){const r=spec.paper.platform,phase=paperPhase(spec.paper,s.paper,now);p.draw('SW02-printer',r.x+r.width/2,r.y-4,r.width+24,66,3.1);if(s.paper.visible)plate('bridge-extended',r);p.draw('signal-'+(phase==='idle'?'safe':phase==='warning'?'warning':'active'),r.x+r.width+12,r.y,12,30,4);}
  if(spec.cloth&&s.cloth)plate(this.room.id.startsWith('SW04')?'SW04-towel':'SW03-cloth',clothSolid(spec.cloth,s.cloth));
  if(spec.bridge&&s.bridge){const r=spec.bridge.platform;if(s.bridge.visible)plate('bridge-extended',r);else p.draw('bridge-folded',r.x,r.y,18,r.width/2,3.2);}
  if(spec.latch&&s.latch)plate('door-'+(s.latch.open?'open':'closed'),spec.latch.gate);
  if(spec.lamp&&s.lamp){const l=spec.lamp,phase=lampPhase(l,s.lamp,now);p.draw('SW02-lamp',l.origin.x,l.origin.y+16,90,94,3.1);const target=s.carry?.contacts.find(c=>!c.active);if(target&&phase==='scanning'){g.fillStyle(0xefd6a4,.09).fillTriangle(l.origin.x,l.origin.y,target.rect.x-25,320,target.rect.x+49,320);}}
  if(spec.air){const r=spec.air.area,phase=airPhase(spec.air,now,s.damperClosedAt!==null),x=spec.air.direction===1?r.x:r.x+r.width;p.draw('SW03-damper',x,r.y+42,32,36,3.3).setAngle(phase==='closed'?0:phase==='gust'?30:15);if(phase==='gust'||phase==='warning')for(let n=0;n<4;n++){const drift=reduced?0:now/55%18,xx=r.x+14+n*28+drift*spec.air.direction;wire([{x:xx,y:r.y+35+n%2*24},{x:xx+spec.air.direction*14,y:r.y+35+n%2*24}],0xc7d1c3,phase==='gust' ? .65 : .3);}}
  if(spec.transmissionMap){const r=spec.transmissionMap.panel;p.rect('transmitter-'+(state.terminal?'restored':s.phase?'transmitting':'offline'),r,2.9);for(const [n,q]of spec.transmissionMap.nodes.entries())p.draw('contact-'+(n<s.phase?'locked':'inactive'),q.x,q.y+5,12,12,4);}
  if(s.power){
   for(const obj of s.power.objects){const active=obj.solidOn===s.power.circuit;plate(obj.role==='door'?'door-'+(active?'closed':'open'):'bridge-'+(active?'extended':'folded'),obj.rect,active?1:.6);}
   for(const q of spec.switches??[]){
    p.draw('switch-'+s.power.circuit,q.x,q.y-6,36,42,6.4);
    g.fillStyle(0x9edbc2).fillRect(q.x+(s.power.circuit==='A'?-15:9),q.y-47,7,2);
   }
   const target=powerTarget(spec,s);if(target)p.draw('contact-'+(spec.sequence![s.phase]===s.power.circuit&&worldPulse(spec,now,s)==='safe'?'ready':'inactive'),target.x,target.y-7,28,36,6.4);
  }
  if(s.carry){for(const c of s.carry.contacts)p.rect('contact-'+(c.active?'locked':c.open?'ready':'inactive'),c.rect,6.4);
   const item=s.carry.item,pose=item.state==='held'?'held':item.state==='thrown'?'thrown':item.state==='ready'?'ground':'landed';
   p.draw(item.kind+'-'+pose,item.position.x,item.position.y+9,item.kind==='lid'?28:22,22,6.5,player.facing);
   if(this.carryState!==null&&this.carryState!==item.state){this.carryPose=item.state==='held'?'pickup':this.carryState==='held'&&item.state==='thrown'?'throw':'drop';this.carryActionUntil=now+160;}this.carryState=item.state;
   if(item.state==='held'||now<this.carryActionUntil){const handY=player.feet-(player.crouching?16:27),ax=player.x+player.facing*4,ay=handY-4,bx=item.state==='held'?item.position.x-player.facing*7:ax+player.facing*22,by=item.state==='held'?item.position.y:handY,pose=now<this.carryActionUntil?this.carryPose:player.body.velocity.y?'jump':Math.abs(player.body.velocity.x)>5?'walk':'idle',frame='carry-'+pose,b=productionFrames[frame].bounds;p.draw(frame,ax,ay,Math.hypot(bx-ax,by-ay)+5,9,6.6).setOrigin(b.x/100,(b.y+b.height/2)/100).setPosition(ax,ay).setRotation(Math.atan2(by-ay,bx-ax));}
  }
  if(spec.encounter&&s.encounter){const e=spec.encounter,t=encounterTiming(e,s.encounter,now),stage=e.stages[s.encounter.stage];for(const r of encounterSolids(e,s.encounter))plate('door-closed',r);p.draw('scanner-'+(t.phase==='complete'?'disabled':t.phase==='open'?'exposed':t.phase==='scan'?'active':t.phase==='warning'?'warning':'idle'),580,256,90,100,3.3);if(stage&&(t.phase==='scan'||t.phase==='warning'))wire([{x:stage.origin.x,y:stage.origin.y},{x:stage.beam.x,y:stage.origin.y}],t.phase==='scan'?0xe77762:0xdfa568,t.phase==='scan' ? .85 : .35);}
  const pulse=worldPulse(spec,now,s),area=worldPulseArea(spec);if(area){const kind=spec.pulse!.kind;
   if(kind==='load'){const y=pulse==='active'?area.y+area.height:area.y+24;p.draw('YU02-container',area.x+area.width/2,y,area.width,24,4);}
   if(pulse!=='safe'){
    const color=kind==='water'?0x83b4c2:kind==='steam'?0xc7d1c3:pulse==='active'?0xe77762:0xdfa568;
    g.lineStyle(pulse==='active'?3:1,color,.8).lineBetween(area.x,area.y+area.height-2,area.x+area.width,area.y+area.height-2);
    for(let n=0;n<Math.max(2,Math.ceil(area.width/16));n++){const x=area.x+8+n*16,y=area.y+area.height-(reduced?12:(now/30+n*11)%Math.max(16,area.height));g.fillStyle(color,pulse==='active' ? .65 : .25).fillCircle(x,y,kind==='steam'?3:1);}
   }
   for(const q of spec.pulse!.signals??[])p.draw('signal-'+pulse,q.x,q.y+28,22,50,4);
  }
  if(spec.powerField){const r=spec.powerField.area,phase=worldPowerFieldPhase(spec,s,now);p.draw('signal-'+(phase==='isolated'?'safe':phase==='live'?'active':'warning'),r.x-16,r.y,18,34,4);if(phase==='live')for(let x=r.x+4;x<r.x+r.width;x+=12)wire([{x,y:r.y+r.height},{x:x+3,y:r.y+3},{x:x+7,y:r.y+r.height}],0xdfa568,.75);}
  if(spec.repair)p.draw('repair-'+(s.repaired?'used':'ready'),spec.repair.x,spec.repair.y,30,32,5);
  if(worldReady(spec,s))p.draw('transmitter-restored',584,320,28,46,3.4);
  p.end();
 }
}
