import type Phaser from 'phaser';
import type {RoomDefinition,Rect} from '../room-data';

/** Shared material language. Geometry is always taken from the simulation. */
export const sectorDesign={
 airlock:{accent:0x80d4e6,metal:0x455e70,shadow:0x111e2c,material:'pressure-bulkhead',processes:['ventilation','pressure-gauge']},
 cargo:{accent:0xd6ad68,metal:0x65574b,shadow:0x201e24,material:'freight-truss',processes:['transport-rollers','gantry-hoist']},
 foundry:{accent:0xe98d60,metal:0x664b43,shadow:0x281c23,material:'cast-iron',processes:['hydraulic-pistons','coolant-return']},
 archive:{accent:0xb6a2e3,metal:0x4e4b69,shadow:0x1b1b2d,material:'data-vault',processes:['rack-transfer','optical-scan']},
 reactor:{accent:0x89b3e0,metal:0x465b70,shadow:0x131d2e,material:'power-containment',processes:['cooling-impeller','power-circulation']}
} as const;
export function roomSector(room:RoomDefinition){return room.sector||(['D','E','F','G'].includes(room.id)||room.id.startsWith('M2')?'cargo':'airlock');}
export function roomDesign(room:RoomDefinition){return sectorDesign[roomSector(room)];}

/** Static architecture is drawn once per scene, below all collision surfaces. */
export function drawSectorArchitecture(scene:Phaser.Scene,room:RoomDefinition){
 const g=scene.add.graphics().setDepth(1.05),d=roomDesign(room),sector=roomSector(room);
 const variant=[...room.id].reduce((sum,c)=>sum+c.charCodeAt(0),0)%3;
 g.fillStyle(d.shadow,.14).fillRect(0,40,640,280);
 const plate=(x:number,y:number,w:number,h:number)=>{
  g.fillStyle(d.metal,.12).fillRect(x,y,w,h);g.lineStyle(1,d.metal,.65).strokeRect(x,y,w,h);
  for(const xx of [x+4,x+w-5])for(const yy of [y+4,y+h-5])g.fillStyle(d.accent,.26).fillRect(xx,yy,2,2);
 };
 if(sector==='airlock'){
  for(const x of [34,238,566]){g.fillStyle(d.metal,.65).fillRect(x,46,14,274);g.fillStyle(d.accent,.18).fillRect(x+2,50,2,262);}
  for(const x of [64,318]){plate(x,66,204,140);g.lineStyle(4,d.shadow).strokeRect(x+12,80,180,112);}
  for(let n=0;n<8;n++)g.fillStyle(d.metal,.48).fillRect(76+n*20,210,12,5);
  g.lineStyle(3,d.metal,.7).lineBetween(12,48,628,48);g.lineStyle(1,d.accent,.22).lineBetween(12,55,628,55);
 }else if(sector==='cargo'){
  for(let n=0;n<4;n++){const x=24+n*154;g.lineStyle(7,d.metal,.65).lineBetween(x,48,x+84,126).lineBetween(x+84,126,x+140,48);}
  for(let n=0;n<3;n++){const x=52+n*182,y=198-(n+variant)%2*34;plate(x,y-58,128,58);for(let i=1;i<7;i++)g.fillStyle(d.metal,.48).fillRect(x+i*16,y-53,3,48);g.fillStyle(d.accent,.3).fillRect(x+6,y-13,25,5);}
  g.fillStyle(d.metal,.65).fillRect(0,72,640,10);g.fillStyle(d.shadow).fillRect(0,76,640,3);
 }else if(sector==='foundry'){
  for(const x of [46,348]){g.fillStyle(d.metal,.65).fillRect(x,52,12,154);g.lineStyle(8,d.metal,.65).lineBetween(x+6,180,x+6,210).lineBetween(x+6,210,x+130,210);g.lineStyle(2,d.accent,.23).lineBetween(x+3,56,x+3,180);}
  const service=['M3B','M3G','M3H'].includes(room.id);
  if(service){for(let n=0;n<6;n++)plate(144+n*34,84,26,106);g.lineStyle(6,d.metal,.65).lineBetween(130,70,386,70);}
  else{plate(390,72,174,118);g.fillStyle(0x3d2627,.7).fillRect(408,96,138,70);for(let n=0;n<8;n++)g.fillStyle(d.shadow).fillRect(414+n*17,96,6,70);g.fillStyle(d.accent,.18).fillRect(412,150,130,8);}
  for(const x of [12,590])g.lineStyle(5,d.metal,.8).lineBetween(x,52,x,230);
 }else if(sector==='archive'){
  for(let n=0;n<7;n++){const x=34+n*83;plate(x,60,60,146);for(let shelf=0;shelf<7;shelf++){g.fillStyle(d.shadow).fillRect(x+6,69+shelf*18,48,10);g.fillStyle(d.accent,.2).fillRect(x+10,72+shelf*18,12,2);}}
  g.lineStyle(3,d.metal,.7).lineBetween(0,218,640,218);for(let n=0;n<8;n++)g.fillStyle(d.accent,.2).fillRect(30+n*80,214,18,3);
 }else{
  g.lineStyle(12,d.metal,.6).strokeCircle(464,150,93);g.lineStyle(2,d.accent,.24).strokeCircle(464,150,76);
  for(let n=0;n<8;n++){const angle=n*Math.PI/4;g.lineStyle(8,d.metal,.7).lineBetween(464+Math.cos(angle)*78,150+Math.sin(angle)*78,464+Math.cos(angle)*102,150+Math.sin(angle)*102);}
  for(const x of [40,92,220]){plate(x,62,32,154);g.fillStyle(d.accent,.12).fillRect(x+11,70,10,136);}
  g.lineStyle(7,d.metal,.7).lineBetween(0,58,330,58).lineBetween(330,58,330,234);
 }
 // A quiet lower wall preserves the projectile plane; no random glowing overlay.
 g.fillStyle(d.shadow,.78).fillRect(0,236,640,84);
 for(const x of [6,626]){g.fillStyle(d.metal,.8).fillRect(x,238,8,82);g.fillStyle(d.accent,.4).fillRect(x+2,244,4,7);}
 const floor=scene.add.graphics().setDepth(2.1);
 for(const solid of room.solids)if(!solid.id)drawPlatformEdge(floor,solid,d.accent,d.metal);
 bakeLayer(scene,g,'rw2-architecture-'+room.id,1.05);
 bakeLayer(scene,floor,'rw2-surfaces-'+room.id,2.1);
}

function bakeLayer(scene:Phaser.Scene,graphics:Phaser.GameObjects.Graphics,key:string,depth:number){
 graphics.generateTexture(key,640,360);graphics.destroy();
 scene.add.image(0,0,key).setOrigin(0).setDepth(depth);
 scene.events.once('shutdown',()=>scene.textures.remove(key));
}

function drawPlatformEdge(g:Phaser.GameObjects.Graphics,s:Rect,accent:number,metal:number){
 g.fillStyle(metal,.75).fillRect(s.x,s.y,s.width,Math.min(4,s.height));
 g.fillStyle(accent,.72).fillRect(s.x,s.y,s.width,1);
 for(let x=s.x+8;x<s.x+s.width-4;x+=24)g.fillStyle(0x111823,.75).fillRect(x,s.y+3,8,Math.min(3,s.height-3));
}
