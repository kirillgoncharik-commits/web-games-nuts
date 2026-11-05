import config from '../game.config.json' with {type:'json'};
export type RoomId='A'|'B'|'C'|'T';
export type Mode='mission'|'training';
export type Rect={x:number;y:number;width:number;height:number};
export type Point={x:number;y:number};
export type EnemyDefinition={id:string;kind:'walker'|'drone';x:number;y:number;end:Point;activateX:number;first?:boolean};
export type RoomDefinition={id:RoomId;name:string;subtitle:string;solids:Rect[];enemies:EnemyDefinition[];terminal?:Point;target?:Point;next?:RoomId;previous?:RoomId};
const floor:Rect={x:0,y:320,width:640,height:40};
const cover=(x:number,y:number,width=48):Rect=>({x,y,width,height:320-y});
export const rooms:Record<RoomId,RoomDefinition>={
  A:{id:'A',name:'Входной шлюз',subtitle:'СЕРВИСНЫЙ ДОПУСК',solids:[floor,cover(176,288,80),{x:324,y:252,width:96,height:36}],enemies:[],target:{x:480,y:292},terminal:{x:548,y:320},next:'B'},
  T:{id:'T',name:'Полигон управления',subtitle:'ДИАГНОСТИКА КОСТЮМА',solids:[floor,cover(176,272,80),{x:324,y:252,width:96,height:36}],enemies:[],target:{x:484,y:292},terminal:{x:551,y:320}},
  B:{id:'B',name:'Сервисный коридор',subtitle:'ПАТРУЛЬ ОБСЛУЖИВАНИЯ',solids:[floor,cover(224,288),{x:320,y:256,width:64,height:16}],enemies:[{id:'b-walker',kind:'walker',x:368,y:305,end:{x:432,y:305},activateX:112,first:true},{id:'b-drone',kind:'drone',x:432,y:292,end:{x:496,y:248},activateX:300}],previous:'A',next:'C'},
  C:{id:'C',name:'Силовой щиток',subtitle:'АВАРИЙНАЯ ЛИНИЯ',solids:[floor,cover(160,288),{x:256,y:256,width:48,height:16},cover(352,288),{x:432,y:256,width:48,height:16},cover(512,288,16)],enemies:[{id:'c-walker-1',kind:'walker',x:256,y:305,end:{x:304,y:305},activateX:80},{id:'c-drone',kind:'drone',x:400,y:292,end:{x:464,y:248},activateX:288},{id:'c-walker-2',kind:'walker',x:464,y:305,end:{x:496,y:305},activateX:400}],terminal:{x:560,y:320},previous:'B'},
};
export type EnemyState=EnemyDefinition & {home:Point;hp:number;phase:'patrol'|'telegraph'|'attack'|'recovery'|'dead';remaining:number;direction:number;shots:number;aim:Point;activated:boolean;warnings:number};
export type RoomState={targetHp:number;terminal:boolean;enemies:EnemyState[];visited:boolean};
export type Result='victory'|'death';
export class MissionAttempt{
  readonly id=crypto.randomUUID();
  readonly missionId='airlock';
  current:RoomId;
  hp=config.initial_balance.player_hp;
  objective=false;
  activeMs=0;
  hurtUntil=-1;
  result:Result|'abandoned'|null=null;
  reason='';
  tutorial=new Set<string>();
  clock=new SimulationClock();
  states:Partial<Record<RoomId,RoomState>>={};
  constructor(readonly mode:Mode){this.current=mode==='training'?'T':'A';}
  room(id=this.current){
    return this.states[id] ||= {targetHp:3,terminal:false,visited:false,enemies:rooms[id].enemies.map(e=>({...e,home:{x:e.x,y:e.y},hp:config.combat[e.kind].hp,phase:'patrol',remaining:0,direction:1,shots:0,aim:{x:0,y:0},activated:false,warnings:0}))};
  }
  damage(now:number,reason:string){
    if(this.mode==='training'||this.result||this.hp<=0||now<this.hurtUntil)return false;
    this.hp=Math.max(0,this.hp-1);this.hurtUntil=now+config.initial_balance.hurt_invulnerability_seconds*1000;this.reason=reason;return true;
  }
  finish(result:Result|'abandoned'){if(this.result)return false;this.result=result;return true;}
}
// Render rate never changes simulation steps; long frames are admitted as bounded work.
export class SimulationClock{
  now=0;private accumulator=0;
  advance(delta:number,step:(ms:number)=>boolean|void){
    this.accumulator+=Math.max(0,Math.min(delta,250));
    let count=0;
    while(this.accumulator+1e-6>=1000/60 && count<15){this.accumulator-=1000/60;this.now+=1000/60;count++;if(step(1000/60)===false){this.accumulator=0;break;}}
    return count;
  }
  clear(){this.accumulator=0;}
}
