import type Phaser from 'phaser';
import type {MissionAttempt} from '../mission';

/** Decorative mechanisms use simulation time: pause, blur and scene changes freeze them. */
export class EnvironmentMotion{
 private readonly graphics:Phaser.GameObjects.Graphics;
 constructor(scene:Phaser.Scene){this.graphics=scene.add.graphics().setDepth(1.4);}
 draw(attempt:MissionAttempt,reduced:boolean){
  const g=this.graphics;g.clear();
  const def=attempt.definition(),powered=attempt.missionId==='archive'&&['M4G','M4H','M4C'].includes(def.id)?attempt.archiveUploadPowered:def.id==='A'||def.terminalKind==='restore'?attempt.room().terminal:true;
  const tick=reduced||!powered?0:Math.floor(attempt.clock.now/140),color=powered?0x76dcc8:0x72909c;
  g.lineStyle(2,0x456171,.8);
  const fan=(x:number,y:number)=>{g.strokeCircle(x,y,24);g.lineStyle(3,color,.5);for(let blade=0;blade<4;blade++){const angle=(blade+tick%8/8)*Math.PI/2;g.lineBetween(x+Math.cos(angle)*6,y+Math.sin(angle)*6,x+Math.cos(angle)*20,y+Math.sin(angle)*20);}g.fillStyle(0x30495c).fillCircle(x,y,5);};
  const bars=(x:number,y:number)=>{for(let n=0;n<6;n++){g.fillStyle((tick+n)%6===0?color:0x30495c,.65).fillRect(x+n*14,y,8,4);}};
  switch(attempt.missionId){
   case'airlock':fan(116,128);g.lineStyle(1,color,.4).strokeRect(380,116,180,48);bars(420,132);g.fillStyle(color,.35).fillRect(390+(tick*5)%150,151,18,3);break;
   case'cargo':{
    g.fillStyle(0x213747,.85).fillRect(180,178,200,18);for(let n=0;n<11;n++)g.lineStyle(1,color,.3).lineBetween(182+n*18+(tick%3)*2,180,178+n*18+(tick%3)*2,194);
    g.lineStyle(3,0x456171,.7).lineBetween(424,86,578,86);g.fillStyle(color,.5).fillRect(432+(tick%40)*3,82,16,10);g.lineStyle(1,color,.4).lineBetween(440+(tick%40)*3,92,440+(tick%40)*3,130);
    if(def.id==='M2C')for(const [circuit,y]of [['conveyor',154],['security',232]] as const){
     const live=attempt.cargoRerouted&&attempt.cargoCircuit===circuit,c=live?0x76dcc8:0x456171;
     g.lineStyle(live?3:1,c,live?.85:.45);g.beginPath();g.moveTo(112,282);g.lineTo(112,112);g.lineTo(396,112);g.lineTo(396,y);g.lineTo(488,y);g.strokePath();
     g.fillStyle(0x101823,.9).fillRoundedRect(420,y-17,68,34,4);g.lineStyle(2,c,.8).strokeRoundedRect(420,y-17,68,34,4);
     if(circuit==='conveyor')for(let n=0;n<4;n++)g.lineBetween(430+n*13,y+7,440+n*13,y-7);
     else{g.strokeCircle(448,y,9);g.lineBetween(448,y,472,y-5);}
    }
    if(def.conveyor){
     const b=def.conveyor,live=b.enabled===true,c=live?0x76dcc8:0x456171,phase=reduced||!live?0:((attempt.clock.now*b.speed/1000)%18+18)%18;
     g.fillStyle(0x101823,.95).fillRect(b.x,b.y+5,b.width,b.height-5);g.lineStyle(2,c,.8).lineBetween(b.x,b.y+5,b.x+b.width,b.y+5);
     for(let n=-1;n<=Math.ceil(b.width/18);n++){const x=b.x+n*18+phase;if(x>=b.x+7&&x<b.x+b.width-5){g.lineStyle(2,c,live?.9:.45).lineBetween(x+4,b.y+8,x-4,b.y+12);g.lineBetween(x-4,b.y+12,x+4,b.y+15);}}
     g.lineStyle(1,c,.7).lineBetween(24,338,b.x,338);g.lineBetween(b.x,338,b.x,320);
    }
    break;
   }
   case'foundry':for(let n=0;n<3;n++){const offset=(tick+n*3)%12;g.fillStyle(0x30495c,.85).fillRect(106+n*32,76,18,88);g.fillStyle(color,.4).fillRect(110+n*32,108+Math.abs(6-offset)*5,10,26);}g.lineStyle(2,0x456171,.7).strokeRect(438,102,108,72);bars(452,120);for(let n=0;n<3;n++)g.fillStyle(color,.13).fillRect(450+n*28,152-(tick+n*4)%20,9,8);break;
   case'archive':for(let n=0;n<5;n++){g.fillStyle(0x213747,.9).fillRect(94+n*20,88,16,72);g.fillStyle((tick+n)%7<2?color:0x456171,.55).fillRect(98+n*20,96,8,4);}g.lineStyle(1,0x456171,.8).strokeRect(394,96,170,80);g.fillStyle(color,.12).fillRect(398,100+(tick*3)%70,162,4);bars(430,158);break;
   case'reactor':g.lineStyle(3,0x456171,.8).strokeCircle(478,124,40);g.lineStyle(2,color,.3).strokeCircle(478,124,18+(tick%8)*2);g.fillStyle(color,.25).fillCircle(478,124,9);fan(132,132);g.lineStyle(2,color,.25).lineBetween(156,132,210,132);break;
  }
 }
}
