export type RoomId='A'|'B'|'C'|'T';
export type Rect={x:number;y:number;width:number;height:number};
export type Point={x:number;y:number};
export type EnemyDefinition={id:string;kind:'walker'|'drone';x:number;y:number;end:Point;activateX:number;first?:boolean};
export type RoomDefinition={id:RoomId;nameKey:string;subtitleKey:string;solids:Rect[];enemies:EnemyDefinition[];terminal?:Point;target?:Point;next?:RoomId;previous?:RoomId};
const floor:Rect={x:0,y:320,width:640,height:40};
const cover=(x:number,y:number,width=48):Rect=>({x,y,width,height:320-y});
export const rooms:Record<RoomId,RoomDefinition>={
  A:{id:'A',nameKey:'mission.room.A',subtitleKey:'mission.subtitle.A',solids:[floor,cover(176,288,80),{x:324,y:252,width:96,height:36}],enemies:[],target:{x:480,y:292},terminal:{x:548,y:320},next:'B'},
  T:{id:'T',nameKey:'mission.room.T',subtitleKey:'mission.subtitle.T',solids:[floor,cover(176,272,80),{x:324,y:252,width:96,height:36}],enemies:[],target:{x:484,y:292},terminal:{x:551,y:320}},
  B:{id:'B',nameKey:'mission.room.B',subtitleKey:'mission.subtitle.B',solids:[floor,cover(224,288),{x:320,y:256,width:64,height:16}],enemies:[{id:'b-walker',kind:'walker',x:368,y:305,end:{x:432,y:305},activateX:112,first:true},{id:'b-drone',kind:'drone',x:432,y:292,end:{x:496,y:248},activateX:300}],previous:'A',next:'C'},
  C:{id:'C',nameKey:'mission.room.C',subtitleKey:'mission.subtitle.C',solids:[floor,cover(160,288),{x:256,y:256,width:48,height:16},cover(352,288),{x:432,y:256,width:48,height:16},cover(512,288,16)],enemies:[{id:'c-walker-1',kind:'walker',x:256,y:305,end:{x:304,y:305},activateX:80},{id:'c-drone',kind:'drone',x:400,y:292,end:{x:464,y:248},activateX:288},{id:'c-walker-2',kind:'walker',x:464,y:305,end:{x:496,y:305},activateX:400}],terminal:{x:560,y:320},previous:'B'},
};
