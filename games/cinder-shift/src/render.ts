import Phaser from 'phaser';
import type {MissionAttempt,RoomDefinition,RoomState} from './mission';
import type {Player} from './player';
import type {Projectiles} from './projectiles';
export function drawRoom(scene:Phaser.Scene,room:RoomDefinition){
  const g=scene.add.graphics();
  g.fillStyle(0x14232b).fillRect(0,40,640,320);g.fillStyle(0x0e191f).fillRect(0,0,640,40);
  g.fillStyle(0x23353b).fillRect(0,40,640,3);
  for(let x=24;x<640;x+=88){g.fillStyle(0x1a2d34).fillRect(x,70,64,126);g.lineStyle(1,0x263a3f).strokeRect(x,70,64,126);g.fillStyle(0x21373d).fillRect(x+10,80,44,4);}
  g.lineStyle(3,0x294047).lineBetween(0,216,640,216);g.lineStyle(1,0x365058).lineBetween(0,220,640,220);
  room.solids.forEach(s=>{g.fillStyle(0x35484a).fillRect(s.x,s.y,s.width,s.height);g.fillStyle(0x82958a).fillRect(s.x,s.y,s.width,3);g.fillStyle(0x273a3e).fillRect(s.x,s.y+7,s.width,s.height-7);});
  for(let x=0;x<640;x+=32){g.fillStyle(0x475c57).fillRect(x+2,331,27,2);g.fillStyle(0x1a2b30).fillRect(x+29,323,2,37);}
  if(room.target)for(let x=328;x<418;x+=16)g.fillStyle(0xc49a4f).fillRect(x,278,8,4);
  if(room.terminal){const x=room.terminal.x;g.fillStyle(0x314a4e).fillRect(x-12,270,24,50);g.fillStyle(0x88cdbf).fillRect(x-8,276,16,12);}
  g.fillStyle(0x31494c).fillRect(592,240,34,80);g.fillStyle(0x20343c).fillRect(597,246,24,74);
  if(room.previous){g.fillStyle(0x31494c).fillRect(14,240,34,80);g.fillStyle(0x20343c).fillRect(19,246,24,74);}
  const label=(x:number,y:number,text:string,color='#789894')=>scene.add.text(x,y,text,{fontFamily:'Arial',fontSize:'8px',color});
  label(24,53,`CALDERA 7 / ${room.id} / ${room.subtitle}`,'#789894');
  label(271,108,room.name.toUpperCase(),'#496c71');
  label(590,224,room.id==='C'?'ВЫХОД':'→','#bad7bf');
  if(room.previous)label(21,224,'← НАЗАД','#bad7bf');
  if(room.id==='B'){label(210,274,'УКРЫТИЕ','#b3c8b4');label(320,241,'ВЕРХНИЙ ПУТЬ','#9db8aa');}
  if(room.id==='C')label(536,252,'ЩИТОК','#b8ddca');
}
export function drawActors(g:Phaser.GameObjects.Graphics,player:Player,attempt:MissionAttempt,room:RoomDefinition,state:RoomState,shots:Projectiles,hold:number,dying:boolean){
  g.clear();const now=attempt.clock.now,x=Math.round(player.x),y=Math.round(player.feet),h=player.crouching?26:44;
  for(let i=0;i<6;i++){g.fillStyle(i<attempt.hp?0xb5d5c2:0x3b4c4b).fillRect(16+i*10,13,7,12);}
  if(now<player.dashUntil)g.fillStyle(0x73d9d3,.2).fillRect(x-player.facing*30-10,y-h+4,30,h-4);
  const step=Math.sin(now/75)*3*(Math.abs(player.body.velocity.x)>5?1:0),hit=now<attempt.hurtUntil && Math.floor(now/80)%2===0;
  g.fillStyle(0x09191e,.6).fillEllipse(x,y+1,30,5);
  g.fillStyle(dying?0x58615a:hit?0xf2ddad:0x537677).fillRect(x-11,y-h+12,22,h-20);
  g.fillStyle(hit?0xf2ddad:0xd2bb83).fillRect(x-12,y-h+9,24,9);g.fillStyle(0x2a4a52).fillRect(x-10,y-h,20,14);
  g.fillStyle(dying?0x574f48:0x9ae9d7).fillRect(x+(player.facing>0?-1:-10),y-h+4,11,5);
  g.fillStyle(0x7b9588).fillRect(x-9,y-12+Math.round(step),7,12-Math.round(step)).fillRect(x+3,y-12-Math.round(step),7,12+Math.round(step));
  g.fillStyle(0xbaa67c).fillRect(x-11,y-4+Math.round(step),10,4).fillRect(x+2,y-4-Math.round(step),11,4);
  g.fillStyle(0x1b333b).fillRect(x+player.facing*10-5,y-(player.crouching?19:32),18,8);g.fillStyle(0xa2c6b5).fillRect(x+player.facing*20-3,y-(player.crouching?17:30),6,4);
  if(room.target&&state.targetHp>0){const p=room.target;g.fillStyle(0xe1cfa1).fillRect(p.x-10,p.y-18,20,36);g.fillStyle(0x8a7352).fillRect(p.x-5,p.y-10,10,20);for(let i=0;i<state.targetHp;i++)g.fillStyle(0xe9d8a8).fillRect(p.x-8+i*6,p.y-27,4,3);}
  for(const e of state.enemies){
    if(e.hp<=0){g.fillStyle(0x4b5250).fillRect(e.x-12,314,24,6);continue;}
    if(e.kind==='walker'){
      g.fillStyle(0x705d4d).fillRect(e.x-14,e.y-12,28,19);g.fillStyle(0xb79363).fillRect(e.x-11,e.y-18,22,12);g.fillStyle(e.phase==='telegraph'?0xffb465:0xeca96a).fillRect(e.x-8,e.y-16,16,3);g.fillStyle(0x2a3b3f).fillRect(e.x-13,e.y+7,8,8).fillRect(e.x+5,e.y+7,8,8);
    }else{g.lineStyle(2,0x769d9d).lineBetween(e.x-21,e.y,e.x+21,e.y);g.fillStyle(0x7e8a80).fillTriangle(e.x,e.y-12,e.x-13,e.y+8,e.x+13,e.y+8);g.fillStyle(0xe9a6a1).fillRect(e.x-4,e.y-4,8,6);}
    for(let i=0;i<e.hp;i++)g.fillStyle(0xd5ac76).fillRect(e.x-9+i*7,e.y-27,5,2);
    if(e.phase==='telegraph'){
      g.lineStyle(1,e.kind==='walker'?0xf4b35f:0xe8a9b4,.85);
      if(e.kind==='walker'){g.lineBetween(e.x,e.y-17,e.aim.x,e.y-17);g.strokeTriangle(e.x,e.y-43,e.x-5,e.y-33,e.x+5,e.y-33);}
      else{g.lineBetween(e.x,e.y,e.aim.x,e.aim.y);g.strokeRect(e.aim.x-9,e.aim.y-9,18,18);g.lineBetween(e.aim.x-14,e.aim.y,e.aim.x+14,e.aim.y);}
    }
  }
  for(const s of shots.shots){if(s.team==='player')g.fillStyle(0xbaf7df).fillRect(s.x-4,s.y-1,8,3);else g.fillStyle(0xf4a47a).fillTriangle(s.x-5,s.y,s.x+3,s.y-4,s.x+3,s.y+4);}
  if(state.terminal){g.fillStyle(0x96e4c3).fillRect(598,247,3,70).fillRect(618,247,3,70);}
  if(room.terminal&&hold>0){g.fillStyle(0x344a48).fillRect(room.terminal.x-20,258,40,4);g.fillStyle(0xa8ead0).fillRect(room.terminal.x-20,258,40*Math.min(1,hold/600),4);}
}
