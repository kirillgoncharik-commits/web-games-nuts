import type Phaser from 'phaser';
import type {MissionAttempt} from '../mission';
import {turretPresentation} from '../enemies';
import {playtestProfile} from './profile';

/** Local, low-contrast background motion; no timers or full-screen flashes. */
export class PlaytestArt{
 private readonly g:Phaser.GameObjects.Graphics;
 constructor(scene:Phaser.Scene){this.g=scene.add.graphics().setDepth(1.6);}
 draw(a:MissionAttempt,reduced:boolean){
  const g=this.g,now=a.clock.now,powered=a.room().terminal,c=powered?0x76dcc8:0xf2b563,t=reduced?0:now/1000;
  g.clear();
  // A permanent cable links the actual terminal to the first exit.
  g.lineStyle(3,0x263e4e,.95).lineBetween(564,265,564,208).lineBetween(564,208,614,208).lineBetween(614,208,614,290);
  g.lineStyle(1,c,.8).lineBetween(564,265,564,208).lineBetween(564,208,614,208).lineBetween(614,208,614,290);
  g.lineStyle(2,c,.9).strokeRoundedRect(548,242,32,28,3);
  g.lineBetween(565,246,558,256).lineBetween(558,256,567,256).lineBetween(567,256,561,266);
  // The route remains visible with animation disabled, and uses shape as well as colour.
  for(const x of [110,280,450])g.lineStyle(2,c,.6).lineBetween(x,338,x+12,338).lineBetween(x+7,334,x+12,338).lineBetween(x+7,342,x+12,338);
  g.lineStyle(3,c,.9).strokeRect(606,252,17,62);
  if(!powered)g.lineBetween(609,280,620,291).lineBetween(620,280,609,291);
  else g.lineBetween(609,280,613,286).lineBetween(613,286,621,275);
  // Beacon, vent steam, and a power-driven rotor stay behind gameplay silhouettes.
  g.fillStyle(c,reduced?.35:.35+Math.sin(t*2)*.12).fillRect(118,98,14,8);
  for(let i=0;i<3;i++){const rise=reduced?i*9:(t*13+i*12)%40;g.fillStyle(0x779ba9,.1).fillRect(262+i*6,192-rise,10,3);}
  g.lineStyle(2,0x456171,.7).strokeCircle(478,125,22);
  for(let i=0;i<4;i++){const angle=i*Math.PI/2+(powered?t*1.4:0);g.lineStyle(2,powered?0x76dcc8:0x596572,.55).lineBetween(478+Math.cos(angle)*5,125+Math.sin(angle)*5,478+Math.cos(angle)*18,125+Math.sin(angle)*18);}
  const turret=a.room().enemies.find(e=>e.id==='a-lab-turret');
  if(turret&&turret.hp>0){const p=turretPresentation(turret),x=turret.x,y=turret.y-46;
   if(p.state==='warning'){g.lineStyle(2,0xf2b563,.9).strokeTriangle(x,y-13,x-9,y+3,x+9,y+3).lineBetween(x,y-8,x,y-2);g.fillStyle(0xf2b563).fillRect(x-1,y+1,2,2);}
   if(p.damageable)g.lineStyle(2,0x76dcc8,.95).strokeRect(x-10,y-10,20,14).lineBetween(x-5,y-6,x+5,y-6);
  }
  if(!a.room().c01RepairUsed){const p=playtestProfile.repair;g.fillStyle(0x142d32,.95).fillRect(p.x-9,p.y-22,18,18);g.lineStyle(2,0x76dcc8,.9).strokeRect(p.x-9,p.y-22,18,18).lineBetween(p.x-5,p.y-13,p.x+5,p.y-13).lineBetween(p.x,p.y-18,p.x,p.y-8);}
 }
}
