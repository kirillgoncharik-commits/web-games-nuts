export type RoomId='A'|'B'|'C'|'D'|'E'|'F'|'G'|'T';
export type Rect={x:number;y:number;width:number;height:number;material?:'thin';id?:string};
export type Point={x:number;y:number};
export type EnemyKind='walker'|'drone'|'turret';
export type EnemyPreset='walker_service'|'walker_security'|'drone_service'|'turret_cycle';
export type EnemyDefinition={id:string;kind:EnemyKind;preset:EnemyPreset;x:number;y:number;end:Point;activateX:number;first?:boolean;leash?:{min:number;max:number}};
export type RoomDefinition={id:RoomId;theme:'A'|'B'|'C';nameKey:string;subtitleKey:string;solids:Rect[];enemies:EnemyDefinition[];safeZones?:Rect[];terminal?:Point;target?:Point;cell?:Point;terminalKind?:'training'|'power'|'exit'|'restore'|'install';next?:RoomId;previous?:RoomId};
const floor:Rect={x:0,y:320,width:640,height:40};
const cover=(x:number,y:number,width=48):Rect=>({x,y,width,height:320-y});
export const rooms:Record<RoomId,RoomDefinition>={
 A:{id:'A',theme:'A',nameKey:'mission.room.A',subtitleKey:'mission.subtitle.A',solids:[floor,cover(176,288,80),{x:324,y:252,width:96,height:36}],enemies:[],target:{x:480,y:292},terminal:{x:548,y:320},terminalKind:'power',next:'B'},
 T:{id:'T',theme:'A',nameKey:'mission.room.T',subtitleKey:'mission.subtitle.T',solids:[floor,cover(176,272,80),{x:324,y:252,width:96,height:36}],enemies:[],target:{x:484,y:292},terminal:{x:551,y:320},terminalKind:'training'},
 B:{id:'B',theme:'B',nameKey:'mission.room.B',subtitleKey:'mission.subtitle.B',solids:[floor,cover(224,288),{x:320,y:256,width:64,height:16},cover(520,272,16)],enemies:[{id:'b-walker',kind:'walker',preset:'walker_service',x:368,y:305,end:{x:432,y:305},activateX:112,first:true},{id:'b-drone',kind:'drone',preset:'drone_service',x:432,y:292,end:{x:496,y:248},activateX:300}],safeZones:[{x:536,y:272,width:84,height:48}],previous:'A',next:'C'},
 C:{id:'C',theme:'C',nameKey:'mission.room.C',subtitleKey:'mission.subtitle.C',solids:[floor,cover(160,288),{x:256,y:256,width:48,height:16},cover(352,288),{x:432,y:256,width:48,height:16},cover(512,288,16)],enemies:[{id:'c-walker-1',kind:'walker',preset:'walker_service',x:256,y:305,end:{x:304,y:305},activateX:80},{id:'c-drone',kind:'drone',preset:'drone_service',x:416,y:292,end:{x:416,y:248},activateX:288},{id:'c-walker-2',kind:'walker',preset:'walker_service',x:464,y:305,end:{x:496,y:305},activateX:400}],terminal:{x:560,y:320},terminalKind:'exit',previous:'B'},
 D:{id:'D',theme:'B',nameKey:'mission.room.D',subtitleKey:'mission.subtitle.D',solids:[floor,cover(224,288)],enemies:[{id:'d-security',kind:'walker',preset:'walker_security',x:416,y:305,end:{x:480,y:305},activateX:180,leash:{min:288,max:568}}],next:'E'},
 E:{id:'E',theme:'C',nameKey:'mission.room.E',subtitleKey:'mission.subtitle.E',solids:[floor,cover(160,288),{x:272,y:256,width:64,height:16},{x:368,y:224,width:64,height:16},{id:'e-sheet',material:'thin',x:432,y:200,width:8,height:72}],enemies:[{id:'e-turret',kind:'turret',preset:'turret_cycle',x:480,y:305,end:{x:480,y:305},activateX:112}],terminal:{x:88,y:320},terminalKind:'restore',previous:'D',next:'F'},
 F:{id:'F',theme:'B',nameKey:'mission.room.F',subtitleKey:'mission.subtitle.F',solids:[floor,cover(208,288),{x:320,y:256,width:80,height:16}],enemies:[{id:'f-service',kind:'walker',preset:'walker_service',x:432,y:305,end:{x:496,y:305},activateX:144}],cell:{x:552,y:320},previous:'E',next:'G'},
 G:{id:'G',theme:'C',nameKey:'mission.room.G',subtitleKey:'mission.subtitle.G',solids:[floor,cover(160,288),cover(320,288)],enemies:[{id:'g-turret',kind:'turret',preset:'turret_cycle',x:448,y:305,end:{x:448,y:305},activateX:180}],terminal:{x:560,y:320},terminalKind:'install',previous:'F'},
};
