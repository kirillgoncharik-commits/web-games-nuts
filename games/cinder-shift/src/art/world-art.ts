import {encounterTiming,encounterSolids} from '../session/world-encounter';
import type Phaser from 'phaser';
import type {RoomDefinition,Rect} from '../room-data';
import type {MissionAttempt,RoomState} from '../mission';
import type {Player} from '../player';
import {powerTarget,worldReady,worldPulse,worldPulseArea} from '../session/world-runtime';
import {keyboardSolids,keyboardPhase,paperPhase,lampPhase,clothSolid,airPhase} from '../session/world-environment';

const palettes={
 SW01:[0x382932,0xc98551,0xf2d39b,0x6a5264],SW02:[0x242f42,0x526887,0xf0c577,0x85929c],SW03:[0x344753,0x8f9cac,0xd5c9bd,0x7470a0],SW04:[0x294747,0xa56347,0xc7c98b,0x628d6e],SW05:[0x282d4a,0x715166,0xf2c97b,0x827b9c],
 YU01:[0x24394b,0x947d75,0xe8bf91,0x678192],YU02:[0x1d344b,0x496472,0xe9b471,0x70595a],YU03:[0x2c3647,0x647377,0xbfc4b8,0x95674f],YU04:[0x403746,0x8a7869,0xefc684,0x6e7c7d],YU05:[0x2d3453,0x7c7482,0xf5d2a2,0x6d8e9c]
} as const;
/** Original pixel geometry, with gameplay surfaces drawn from the actual colliders. */
export class WorldArt{
 private ink:Phaser.GameObjects.Graphics;private environment:Phaser.GameObjects.Graphics;private labels:Phaser.GameObjects.Text[]=[];
 private keyLabels:Phaser.GameObjects.Text[]=[];
 constructor(private scene:Phaser.Scene,private room:RoomDefinition){
  const mission=room.id.slice(0,4) as keyof typeof palettes,p=palettes[mission],home=mission.startsWith('SW');
  const g=scene.add.graphics().setDepth(1.25),landmark=room.world!.landmark;
  g.fillStyle(p[0]).fillRect(0,40,640,280);
  // Three planes: distant light/window or bay, architecture, oversized foreground props.
  if(home){
   g.fillStyle(p[3],.45).fillRect(24,60,248,132);g.fillStyle(p[2],.32).fillRect(30,66,236,120);
   for(const x of [32,148,264])g.fillStyle(p[0],.7).fillRect(x,64,5,128);
   g.fillStyle(p[0],.7).fillRect(28,122,240,6);g.fillStyle(p[1],.25).fillRect(0,212,640,108);
   for(let n=0;n<12;n++)g.fillStyle(p[2],.06).fillRect(n*58,230+(n%3)*8,44,2);
  }else{
   g.fillStyle(p[3],.7).fillRect(0,132,640,76);for(let y=148;y<204;y+=12)g.fillStyle(p[2],.12).fillRect((y%3)*20,y,640,2);
   for(let n=0;n<8;n++){const h=40+(n*17)%64,x=n*88-20;g.fillStyle(p[1],.55).fillRect(x,172-h,68,h);g.fillStyle(p[0],.9).fillTriangle(x-5,172-h,x+34,152-h,x+74,172-h);for(let j=0;j<3;j++)g.fillStyle(p[2],.45).fillRect(x+12+j*17,184-h,8,12);}
   g.fillStyle(p[1],.28).fillRect(0,222,640,98);
  }
  const line=(x:number,y:number,w:number,h:number,c:number)=>{g.fillStyle(c).fillRect(x,y,w,h);g.lineStyle(2,p[0],.7).strokeRect(x,y,w,h);};
  const ceramic=(x:number,y:number,w:number,h:number)=>{g.fillStyle(p[1]).fillRoundedRect(x,y,w,h,12);g.lineStyle(3,p[2],.7).strokeRoundedRect(x+4,y+4,w-8,h-8,10);};
  if(['mug','plates','drawer','lidar'].includes(landmark)){
   ceramic(362,128,118,150);g.lineStyle(14,p[1]).strokeEllipse(494,188,64,80);g.lineStyle(4,p[2],.5).strokeEllipse(494,188,58,72);
   if(landmark==='plates')for(const x of [64,148,232]){g.fillStyle(p[3]).fillEllipse(x,220,70,146);g.lineStyle(3,p[2],.5).strokeEllipse(x,220,58,126);}
   if(landmark==='drawer'){line(40,104,252,138,p[1]);line(122,162,84,14,p[3]);}
   if(landmark==='lidar'){ceramic(386,198,176,68);line(432,198,64,18,p[0]);}
  }else if(mission==='SW02'){
   line(40,142,260,126,p[3]);for(let r=0;r<3;r++)for(let c=0;c<6;c++)line(48+c*40,148+r*34,32,24,p[1]);
   g.lineStyle(12,p[1]).beginPath().moveTo(340,236).lineTo(392,136).lineTo(552,136).lineTo(590,232).strokePath();
   if(landmark==='printer'){line(360,160,216,112,p[3]);line(380,218,174,22,p[0]);}
  }else if(mission==='SW03'){
   line(358,92,212,178,p[3]);g.fillStyle(p[0]).fillCircle(464,184,64);g.lineStyle(10,p[2],.4).strokeCircle(464,184,66);
   for(let n=0;n<5;n++){g.fillStyle(p[1],.6).fillTriangle(12+n*80,96,82+n*80,96,56+n*80,236);g.lineStyle(2,p[2],.3).lineBetween(34+n*80,104,62+n*80,214);}
  }else if(mission==='SW04'){
   for(const x of [80,330,550]){g.fillStyle(p[1]).fillTriangle(x-64,250,x+64,250,x+42,318);g.fillTriangle(x-64,250,x-42,318,x+42,318);g.lineStyle(10,p[3]).lineBetween(x,254,x+12,140);for(const d of [-1,1])g.fillStyle(p[3]).fillEllipse(x+d*28,190+d*18,72,24);}
   g.lineStyle(3,p[2],.4).lineBetween(20,116,620,100);
  }else if(mission==='SW05'){
   for(let n=0;n<7;n++)line(20+n*54,122-(n%3)*12,44,166+(n%3)*12,n%2?p[1]:p[3]);
   line(418,170,176,102,p[3]);for(const x of [448,560]){line(x,70,10,100,p[3]);g.fillStyle(p[2],.5).fillRect(x+2,76,2,80);}
  }else if(['courtyard','exchange','rooftop','transmitter'].includes(landmark)){
   line(28,68,200,200,p[1]);for(const x of [52,128])for(const y of [90,164]){line(x,y,52,54,p[0]);g.lineStyle(2,p[2],.35).strokeRect(x+4,y+4,44,46);}
   g.lineStyle(4,p[3]).lineBetween(376,256,376,88);for(const y of [108,132,156])g.lineBetween(348,y,404,y);line(436,164,132,94,p[3]);
  }else if(mission==='YU02'){
   for(const x of [36,166,448]){line(x,192,118,82,p[3]);for(let n=0;n<5;n++)g.lineStyle(2,p[2],.16).lineBetween(x+8+n*22,198,x+8+n*22,268);}
   g.lineStyle(12,p[1]).lineBetween(318,250,318,82);g.lineBetween(258,82,560,82);g.lineStyle(2,p[2]).lineBetween(488,86,488,182);g.lineBetween(488,182,460,202);
  }else if(mission==='YU03'){
   line(30,142,540,112,p[3]);for(let n=0;n<8;n++)line(44+n*64,158,48,38,p[0]);for(const x of [108,256,404,532]){g.fillStyle(p[0]).fillCircle(x,260,18);g.lineStyle(2,p[2],.3).strokeCircle(x,260,12);}
   g.lineStyle(3,p[1]).lineBetween(10,96,622,96);g.lineBetween(64,96,64,64);g.lineBetween(550,96,550,64);
  }else if(mission==='YU04'){
   for(const x of [40,236,446]){line(x,84,136,174,p[3]);g.lineStyle(8,p[1]).lineBetween(x+14,110,x+114,110);for(let n=0;n<3;n++)g.lineBetween(x+20+n*40,110,x+20+n*40,230);}
   g.lineStyle(6,p[1]).lineBetween(12,64,620,64);for(let x=20;x<620;x+=48)g.lineBetween(x,56,x+16,72);
  }else{
   line(418,150,160,122,p[1]);g.lineStyle(5,p[3]).lineBetween(490,52,490,176);for(const y of [76,104,132])g.lineBetween(450,y,530,y);
   for(let n=0;n<3;n++){g.lineStyle(1,p[2],.22).strokeEllipse(490,80,80+n*64,28+n*24);}
   if(landmark==='rift')for(let n=0;n<4;n++){g.lineStyle(2,p[2],.3).strokeEllipse(320,152,80+n*16,120+n*12);}
  }
  // Visible lip/material at every real collision surface, including the safe lower route.
  const materials=scene.add.graphics().setDepth(2.2);
  for(const s of room.solids){if(s.id?.startsWith('world-key:')||s.id?.startsWith('world-paper:')||s.id?.startsWith('world-cloth:')||s.id?.startsWith('world-bridge:')||s.id?.startsWith('world-encounter:')||s.id?.startsWith('world-latch:'))continue;materials.fillStyle(p[1]).fillRect(s.x,s.y,s.width,s.height);materials.fillStyle(p[2],.65).fillRect(s.x,s.y,s.width,3);materials.fillStyle(p[0],.4).fillRect(s.x,s.y+s.height-3,s.width,3);for(let x=s.x+8;x<s.x+s.width;x+=24)materials.fillStyle(p[0],.35).fillRect(x,s.y+6,8,2);}
  this.ink=scene.add.graphics().setDepth(6.5);this.environment=scene.add.graphics().setDepth(3.2);
  if(room.world?.switches)for(const point of room.world.switches)this.labels.push(scene.add.text(point.x,point.y-62,'A / B',{fontFamily:'monospace',fontSize:'10px',color:'#f1d8ae',backgroundColor:'#172533'}).setOrigin(.5).setDepth(6.6));
  if(room.world?.keyboard)for(const text of ['I','II'])this.keyLabels.push(scene.add.text(0,0,text,{fontFamily:'monospace',fontSize:'10px',color:'#f1d8ae'}).setOrigin(.5,0).setDepth(3.3));
 }
 render(player:Player,a:MissionAttempt,state:RoomState,reduced:boolean){
  const spec=this.room.world!,world=state.world!,g=this.ink,h=this.environment,now=a.clock.now;g.clear();h.clear();
  if(spec.keyboard&&world.keyboard){
   const keys=keyboardSolids(spec.keyboard,world.keyboard),phase=keyboardPhase(world.keyboard,now);
   for(const [i,k]of keys.entries()){
    const down=i===0?world.keyboard.pressed:world.keyboard.lowered,c=down?0xf0c577:0xa1acbc;
    h.fillStyle(0x283344).fillRect(k.x,k.y,k.width,k.height);h.fillStyle(down?0x6f6b62:0x526887).fillRect(k.x+3,k.y+3,k.width-6,Math.min(18,k.height-3));
    h.lineStyle(2,c,.9).lineBetween(k.x+2,k.y+1,k.x+k.width-2,k.y+1);h.lineStyle(1,0x172331).lineBetween(k.x+5,k.y+5,k.x+k.width-5,k.y+5);
    this.keyLabels[i].setPosition(k.x+k.width/2,k.y+6);
   }
   const [a,b]=keys,ax=a.x+a.width/2,bx=b.x+b.width/2;
   h.lineStyle(2,world.keyboard.lowered?0xf0c577:0x65758b,.7).lineBetween(ax,334,bx,334).lineBetween(ax,320,ax,334).lineBetween(bx,320,bx,334);
   h.lineBetween(bx-5,329,bx,334).lineBetween(bx-5,339,bx,334);
   if(world.keyboard.lowered){const width=48*Math.max(0,Math.min(1,(world.keyboard.releaseAt-now)/spec.keyboard.returnDelayMs));h.fillStyle(0xf0c577,.7).fillRect(bx-24,b.y+24,width,3);}
   if(phase==='returning')h.lineStyle(2,0xf0c577,.9).lineBetween(bx-6,b.y-8,bx,b.y-14).lineBetween(bx,b.y-14,bx+6,b.y-8);
  }
  if(spec.paper&&world.paper){
   const r=spec.paper.platform,phase=paperPhase(spec.paper,world.paper,now),visible=world.paper.visible;
   h.fillStyle(0x172331).fillRect(r.x-14,r.y-36,r.width+28,28);
   h.lineStyle(2,0x85929c).strokeRect(r.x-14,r.y-36,r.width+28,28);
   h.lineStyle(3,0x526887).lineBetween(r.x-8,r.y-9,r.x+r.width+8,r.y-9);
   // The dotted outline previews the next physical surface without implying a collider.
   if(visible){h.fillStyle(0xf1e2ba).fillRect(r.x,r.y,r.width,r.height);h.lineStyle(1,0x85929c).lineBetween(r.x+8,r.y+4,r.x+r.width-8,r.y+4);}
   else for(let x=r.x;x<r.x+r.width;x+=12)h.lineStyle(1,0xe7bb77,.65).lineBetween(x,r.y,x+6,r.y);
   const c=phase==='extended'?0x8ddab2:phase==='idle'?0x65758b:0xf0c577;
   h.fillStyle(c).fillCircle(r.x+r.width-4,r.y-23,4);
   if(phase==='returning'||phase==='held')h.lineStyle(2,c).lineBetween(r.x+36,r.y-22,r.x+52,r.y-22).lineBetween(r.x+36,r.y-22,r.x+42,r.y-28).lineBetween(r.x+36,r.y-22,r.x+42,r.y-16);
   else if(phase==='warning')h.lineStyle(2,c).lineBetween(r.x+36,r.y-22,r.x+52,r.y-22).lineBetween(r.x+52,r.y-22,r.x+46,r.y-28).lineBetween(r.x+52,r.y-22,r.x+46,r.y-16);
   const elapsed=world.paper.startedAt===null?0:(now-world.paper.startedAt)%spec.paper.cycleMs;
   const progress=phase==='warning'?elapsed/spec.paper.warningMs:phase==='extended'?(elapsed-spec.paper.warningMs)/spec.paper.extendedMs:1;
   h.fillStyle(c,.8).fillRect(r.x,r.y-6,r.width*Math.max(0,Math.min(1,progress)),2);
  }
  if(spec.lamp&&world.lamp&&world.carry){
   const {x,y}=spec.lamp.origin,phase=lampPhase(spec.lamp,world.lamp,now),contacts=world.carry.contacts,target=contacts.find(c=>!c.active),cx=target?target.rect.x+target.rect.width/2:548;
   h.lineStyle(6,0x526887).lineBetween(x-64,196,x-64,74).lineBetween(x-64,74,x,y-12);
   h.fillStyle(0x85929c).fillTriangle(x,y-18,x-24,y+6,x+24,y+6);
   if(target){h.fillStyle(0xf0c577,phase==='scanning'?.15:.05).fillTriangle(x,y,cx-58,320,cx+58,320);h.lineStyle(1,0xf0c577,.5).lineBetween(x,y,cx-58,320).lineBetween(x,y,cx+58,320);
    if(phase!=='open'){h.lineStyle(2,0xa9a0c5,.8).strokeRect(cx-18,272,36,42);for(let n=0;n<3;n++)h.lineBetween(cx-16,279+n*12,cx+16,291+n*12);}
   }
   for(let n=0;n<contacts.length;n++){h.fillStyle(contacts[n].active?0x8ddab2:0x65758b).fillRect(x-18+n*22,y+18,14,5);}
   h.fillStyle(!target||phase==='open'?0x8ddab2:0xf0c577).fillCircle(x,y,5);
  }
  if(spec.latch&&world.latch){const r=spec.latch.gate,c=world.latch.open?0x91d9c6:0xe7bb77;
   h.lineStyle(2,c).strokeRect(r.x-4,r.y-6,r.width+8,r.height+6);
   if(!world.latch.open){h.fillStyle(0x566c77).fillRect(r.x,r.y,r.width,r.height);for(let y=r.y+6;y<r.y+r.height;y+=10)h.lineBetween(r.x+3,y,r.x+r.width-3,y);}
   else h.lineBetween(r.x-6,r.y-10,r.x+r.width+6,r.y-10);
   h.fillStyle(c).fillCircle(r.x+r.width/2,r.y-16,4);
  }
  if(spec.encounter&&world.encounter){const e=spec.encounter,state=world.encounter,t=encounterTiming(e,state,now),stage=e.stages[state.stage],c=t.phase==='complete'||t.phase==='open'?0x91d9c6:t.phase==='scan'?0xe9a36f:0xf0c577;
   for(const r of encounterSolids(e,state)){h.fillStyle(0x435b6a).fillRect(r.x,r.y,r.width,r.height);h.lineStyle(2,0x91b7b9).strokeRect(r.x,r.y,r.width,r.height);for(let y=r.y+8;y<r.y+r.height;y+=10)h.lineBetween(r.x+4,y,r.x+r.width-4,y);}
   h.fillStyle(0x172c3c).fillRoundedRect(536,154,96,102,8);h.lineStyle(2,c).strokeRoundedRect(536,154,96,102,8);
   for(let n=0;n<e.stages.length;n++){h.fillStyle(n<state.stage?0x91d9c6:n===state.stage?c:0x526b7b).fillCircle(556+n*24,173,5);}
   const open=t.phase==='open',split=open?18:3;h.fillStyle(0x52757b).fillRect(548,188,32-split,48);h.fillRect(584+split,188,36-split,48);h.lineStyle(2,c).strokeRect(548,188,72,48);
   if(stage){const {origin,beam}=stage,right=origin.x>beam.x+beam.width/2;let end=right?beam.x:beam.x+beam.width;
    for(const r of a.definition().solids){if(r.y<=origin.y&&r.y+r.height>origin.y&&(right?r.x<origin.x&&r.x+r.width>end:r.x+r.width>origin.x&&r.x<end))end=right?Math.max(end,r.x+r.width):Math.min(end,r.x);}
    h.fillStyle(c).fillCircle(origin.x,origin.y,5);h.lineStyle(t.phase==='scan'?6:1,c,t.phase==='scan'?.8:.22).lineBetween(origin.x,origin.y,end,origin.y);
    h.lineStyle(1,c,.35).strokeRect(beam.x,beam.y,beam.width,beam.height);
    if(t.phase==='settling'){const r=stage.cover;for(let x=r.x;x<r.x+r.width;x+=8)h.lineStyle(1,c,.6).lineBetween(x,r.y,x+4,r.y);}
   }
  }
  if(spec.cloth&&world.cloth){
   const r=clothSolid(spec.cloth,world.cloth),base=spec.cloth.platform;
   h.lineStyle(1,0x83948b,.5).lineBetween(base.x-12,base.y-32,base.x+base.width+spec.cloth.travel+12,base.y-32);
   for(const x of [r.x+10,r.x+r.width-10]){h.lineStyle(1,0xcbd7be).lineBetween(x,r.y-32,x,r.y);h.fillStyle(0xe8c792).fillRect(x-3,r.y-36,6,10);}
   h.fillStyle(0x6fa5a4).fillRect(r.x,r.y,r.width,r.height);h.lineStyle(2,0xd0ded0).lineBetween(r.x,r.y,r.x+r.width,r.y);
   for(let x=r.x+8;x<r.x+r.width;x+=12)h.lineStyle(1,0x284b60,.65).lineBetween(x,r.y+3,x+3,r.y+r.height);
  }
  if(spec.bridge&&world.bridge){const r=spec.bridge.platform;
   h.lineStyle(2,world.bridge.visible?0xa6d8bd:0x858c9c,.9);
   if(world.bridge.visible){h.fillStyle(0x718d82).fillRect(r.x,r.y,r.width,r.height);h.lineBetween(r.x,r.y,r.x+r.width,r.y);}
   else{h.lineBetween(r.x,r.y-r.width/2,r.x,r.y);for(let x=r.x;x<r.x+r.width;x+=12)h.lineBetween(x,r.y,x+5,r.y);}
  }
  if(spec.air){const air=spec.air,phase=airPhase(air,now,world.damperClosedAt!==null),r=air.area,c=phase==='closed'?0x91d9c6:phase==='warning'?0xf0c577:0xc0deda;
   const x=air.direction===1?r.x:r.x+r.width,y=r.y+18;
   h.lineStyle(3,0x6f899a).strokeRect(x-10,y-12,20,24);for(let n=0;n<3;n++)h.lineBetween(x-6,y-7+n*7,x+6,y-7+n*7);
   const flag=phase==='gust'?22:phase==='warning'?14:7;h.lineStyle(2,c).lineBetween(x,y-16,x,y-40);h.fillStyle(c).fillTriangle(x,y-40,x+air.direction*flag,y-36,x,y-29);
   if(phase==='closed'){h.lineStyle(3,c).lineBetween(x-8,y-10,x+8,y+10).lineBetween(x+8,y-10,x-8,y+10);}
   if(phase==='gust'||phase==='warning'){const drift=reduced?0:(now/65)%20;h.lineStyle(phase==='gust'?2:1,c,phase==='gust'?.55:.3);for(let n=0;n<4;n++){const ax=r.x+16+n*30+drift*air.direction,ay=r.y+50+n%2*24;h.lineBetween(ax,ay,ax+air.direction*16,ay).lineBetween(ax+air.direction*16,ay,ax+air.direction*11,ay-4);}}
   // The complete boundary stays readable with effects and motion reduced.
   h.lineStyle(1,c,.22).strokeRect(r.x,r.y,r.width,r.height);
  }
  if(spec.wind){const drift=reduced?0:(now/60)%24;h.lineStyle(1,0xd9e3c4,.18);for(let n=0;n<5;n++)h.lineBetween(48+n*128+drift*spec.wind,116+n%3*28,76+n*128+drift*spec.wind,116+n%3*28);}
  const pulse=worldPulse(spec,now),p=spec.pulse;if(p){const water=p.kind==='water',steam=p.kind==='steam',area=worldPulseArea(spec)!,active=water?0x76c6e5:steam?0xd5e4de:0xff985f,warning=water?0xa7d8e7:steam?0xa6ccbd:0xffc67a;
   h.fillStyle(pulse==='active'?active:warning,pulse==='active'?.32:pulse==='warning'?.16:.04).fillRect(area.x,area.y,area.width,area.height);h.lineStyle(2,pulse==='active'?active:warning,pulse==='safe'?.22:.8).strokeRect(area.x,area.y,area.width,area.height);
   if(water){for(let n=0;n<3;n++){const y=282+n*12;h.lineBetween(p.x+4,y,p.x+12,y+3).lineBetween(p.x+12,y+3,p.x+20,y).lineBetween(p.x+20,y,p.x+p.width-4,y+3);}h.fillStyle(warning).fillTriangle(p.x-12,316,p.x-4,316,p.x-8,308);h.fillTriangle(p.x+p.width+4,316,p.x+p.width+12,316,p.x+p.width+8,308);}
   else if(steam){for(let n=0;n<4;n++){const y=area.y+16+n*25;h.lineStyle(2,active,pulse==='active'?.65:.25).lineBetween(area.x+8,y,area.x+18,y-6).lineBetween(area.x+18,y-6,area.x+32,y);}
    for(const r of p.shelters||[]){h.fillStyle(0x152d38).fillRect(r.x,r.y,r.width,r.height);h.lineStyle(2,0x91d9c6).lineBetween(r.x,r.y,r.x+r.width,r.y);h.lineBetween(r.x+r.width/2-5,r.y+8,r.x+r.width/2,r.y+14).lineBetween(r.x+r.width/2,r.y+14,r.x+r.width/2+7,r.y+5);}
   }
   else if(pulse!=='safe'){h.lineBetween(p.x,274,p.x+p.width,320);h.lineBetween(p.x+p.width,274,p.x,320);}
  }
  if(world.carry){const carry=world.carry,item=carry.item;for(const c of carry.contacts){g.fillStyle(0x132532).fillRect(c.rect.x,c.rect.y,c.rect.width,c.rect.height);g.lineStyle(c.open?3:2,c.active?0x8ddab2:c.open?0xf3ce8e:0x797d94).strokeRect(c.rect.x,c.rect.y,c.rect.width,c.rect.height);if(c.active){g.lineBetween(c.rect.x+4,c.rect.y+14,c.rect.x+10,c.rect.y+21);g.lineBetween(c.rect.x+10,c.rect.y+21,c.rect.x+20,c.rect.y+6);}else if(c.open)g.fillStyle(0xf3ce8e).fillRect(c.rect.x+8,c.rect.y+8,8,12);else g.lineBetween(c.rect.x+4,c.rect.y+4,c.rect.x+20,c.rect.y+24);}
   const {x,y}=item.position;g.fillStyle(item.kind==='conductor'?0x91d9c6:0xf2ce94);if(item.kind==='lid'){g.fillEllipse(x,y,26,12);g.lineStyle(2,0x6c6a70).strokeEllipse(x,y,26,12);}else{g.fillRoundedRect(x-10,y-10,20,20,3);g.lineStyle(2,0x655b67).strokeRoundedRect(x-10,y-10,20,20,3);}
   if(spec.lamp){g.fillStyle(0xc8e4dc).fillTriangle(x-7,y+7,x+7,y-7,x+7,y+7);g.lineStyle(2,0x6d919c).lineBetween(x-7,y+7,x+7,y-7);}
   if(item.state==='held'){const handY=player.feet-(player.crouching?16:27),f=player.facing;g.lineStyle(5,0x81b3c3).lineBetween(player.x+f*4,handY-4,x-f*7,y);g.fillStyle(0xe8c1a2).fillRect(x-f*10,y-3,5,5);}
  }
  if(world.power){const power=world.power,c=power.circuit==='A'?0xefc778:0x8bd8c1;for(const obj of power.objects){const r=obj.rect,active=obj.solidOn===power.circuit;h.lineStyle(active?3:1,active?c:0x5d7186,active?1:.45);if(active)h.fillStyle(0x54747f,.8).fillRect(r.x,r.y,r.width,r.height);h.strokeRect(r.x,r.y,r.width,r.height);if(!active)for(let x=r.x;x<r.x+r.width;x+=12)h.lineBetween(x,r.y,x+4,r.y);}
   for(const s of spec.switches||[]){g.fillStyle(0x294759).fillRect(s.x-18,s.y-42,36,36);g.lineStyle(3,c).strokeRect(s.x-18,s.y-42,36,36);g.lineBetween(s.x,s.y-12,s.x+(power.circuit==='A'?-10:10),s.y-34);for(let n=0;n<(power.circuit==='A'?1:2);n++)g.fillStyle(c).fillCircle(s.x-6+n*12,s.y-50,3);}
   const target=powerTarget(spec,world);if(target){const wanted=spec.sequence![world.phase],cx=target.x;g.fillStyle(0x142c38).fillRect(cx-14,target.y-44,28,36);g.lineStyle(3,wanted===power.circuit&&pulse==='safe'?0x8ddab2:0xefc778).strokeRect(cx-14,target.y-44,28,36);for(let n=0;n<(wanted==='A'?1:2);n++)g.fillStyle(0xf1d8ae).fillCircle(cx-5+n*10,target.y-32,3);g.fillStyle(0xf1d8ae).fillTriangle(cx-5,target.y-21,cx+5,target.y-21,cx,target.y-15);}
   for(let n=0;n<(spec.sequence?.length||0);n++)g.fillStyle(n<world.phase?0x8ddab2:0x53647a).fillRect(298+n*16,66,10,5);
  }
  if(spec.repair&&!world.repaired){const r=spec.repair;g.lineStyle(3,0x8ddab2).strokeRect(r.x-12,r.y-28,24,22);g.lineBetween(r.x-6,r.y-17,r.x+6,r.y-17);g.lineBetween(r.x,r.y-23,r.x,r.y-11);}
  if(worldReady(spec,world)){g.lineStyle(3,0x8ddab2).lineBetween(596,256,620,256);g.lineBetween(612,248,620,256);g.lineBetween(612,264,620,256);}
 }
}
