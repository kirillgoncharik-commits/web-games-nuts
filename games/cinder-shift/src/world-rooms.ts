import type {RoomDefinition,Rect,Point,EnemyDefinition,HazardDefinition} from './room-data';
import type {CarryKind,PowerObject,Circuit} from './session/world-mechanics';
import type {WorldRoomId,WorldMissionId} from './session/new-campaign-content';
import type {KeyboardSpec,PaperSpec,LampSpec,ClothSpec,BridgeSpec,AirSpec} from './session/world-environment';

/** Authored collision/action data; the design registry keeps the matching intent and acceptance. */
export type WorldRoomSpec={
 carry?:{kind:CarryKind;spawn:Point;contacts:{id:string;rect:Rect;window?:boolean}[]};
 switches?:Point[];powerObjects?:PowerObject[];sequence?:Circuit[];sequenceTargets?:Point[];
 pulse?:{x:number;width:number;cycle:number;warning:number;active:number;kind?:'water'};
 repair?:Point;landmark:string;wind?:number;
 keyboard?:KeyboardSpec;
 paper?:PaperSpec;
 lamp?:LampSpec;
 cloth?:ClothSpec;bridge?:BridgeSpec;air?:AirSpec;
};
const floor:Rect={x:0,y:320,width:640,height:40};
const platform=(x:number,y:number,width:number,height=12):Rect=>({x,y,width,height});
const cover=(x:number,height:number,width=32):Rect=>platform(x,320-height,width,height);
const enemy=(id:string,x:number,kind:'walker'|'drone'|'turret'='drone',y=kind==='drone'?292:305):EnemyDefinition=>({id,kind,preset:kind==='walker'?'walker_service':kind==='turret'?'turret_cycle':'drone_service',x,y,end:{x:x+(kind==='turret'?0:32),y},activateX:Math.max(120,x-160),first:true});
const contact=(id:string,x:number,y=280,window=false)=>({id,rect:{x,y,width:24,height:28},window});
const carry=(kind:CarryKind,x:number,...contacts:ReturnType<typeof contact>[]):WorldRoomSpec['carry']=>({kind,spawn:{x,y:292},contacts});
const power=(id:string,circuit:Circuit,x:number,y:number,w:number,h=12):PowerObject=>({id,solidOn:circuit,rect:platform(x,y,w,h)});
type Authored={id:WorldRoomId;solids:Rect[];world:WorldRoomSpec;enemies?:EnemyDefinition[];hazards?:HazardDefinition[];cache?:Point};
const authored:Authored[]=[
 {id:'SW01-A',solids:[platform(174,226,16,52),platform(174,220,90,10),platform(332,260,72)],world:{landmark:'mug',carry:carry('lid',112,contact('drawer-lock-01',294))},cache:{x:366,y:260}},
 {id:'SW01-B',solids:[platform(150,236,112),platform(332,246,96),cover(484,32)],world:{landmark:'plates',carry:carry('lid',112,contact('rack-lock-01',552)),pulse:{x:276,width:56,cycle:5400,warning:1400,active:800}},enemies:[enemy('sw01b-scanner',430)]},
 {id:'SW01-C',solids:[platform(116,248,90),platform(250,276,72),platform(398,248,72),cover(520,32)],world:{landmark:'drawer',repair:{x:572,y:320},carry:carry('lid',340,contact('drawer-dock-01',470))}},
 {id:'SW01-D',solids:[platform(132,244,92),cover(300,32,40),platform(450,244,80)],world:{landmark:'lidar',carry:carry('lid',112,contact('dock-phase-01',264,280,true),contact('dock-phase-02',408,280,true),contact('dock-phase-03',548,280,true)),pulse:{x:352,width:56,cycle:4800,warning:1400,active:700}}},
 {id:'SW02-A',solids:[cover(384,24,64),platform(464,240,88)],world:{landmark:'keys',keyboard:{id:'c02-small-world:SW02-A:key-pair-01',trigger:cover(160,24,64),target:cover(272,48,64),travel:16,returnDelayMs:1800}},enemies:[enemy('sw02a-scanner',488)]},
 {id:'SW02-B',solids:[platform(160,276,88),platform(292,240,112),platform(448,268,80)],world:{landmark:'cable',carry:carry('spool',112,contact('cable-latch-01',536))},enemies:[enemy('sw02b-service',448)],cache:{x:344,y:240}},
 {id:'SW02-C',solids:[platform(132,276,88),platform(420,276,100)],world:{landmark:'printer',paper:{id:'c02-small-world:SW02-C:printer-tray-01',platform:platform(276,244,104,8),cycleMs:4800,warningMs:1000,extendedMs:2600,returnWarningMs:700}}},
 {id:'SW02-D',solids:[cover(152,32,40),platform(256,252,88),cover(432,32,48)],world:{landmark:'desktop-node',lamp:{origin:{x:344,y:104},cycleMs:5000,warningMs:900,scanMs:900},carry:carry('block',112,contact('desktop-line-01',380),contact('desktop-line-02',548))},enemies:[enemy('sw02d-turret',504,'turret')]},
 {id:'SW03-A',solids:[platform(128,276,96),platform(416,276,80),platform(512,242,64)],world:{landmark:'cloth',bridge:{id:'c02-small-world:SW03-A:strap-01',platform:platform(264,242,96),contactId:'cloth-catch-01'},carry:carry('spool',112,contact('cloth-catch-01',252))},cache:{x:544,y:242}},
 {id:'SW03-B',solids:[cover(160,32,48),cover(232,48,40),cover(480,32,48)],world:{landmark:'washer',cloth:{id:'c02-small-world:SW03-B:cloth-01',platform:platform(280,248,88),travel:32,cycleMs:4800},carry:carry('lid',112,contact('washer-lock-01',552))},enemies:[enemy('sw03b-scanner',424)]},
 {id:'SW03-C',solids:[platform(144,280,88),platform(280,244,88),platform(416,212,88)],world:{landmark:'vent',air:{area:{x:248,y:180,width:144,height:140},direction:1,speed:24,cycleMs:5200,quietMs:1600,warningMs:1000,activeMs:1600},repair:{x:552,y:320}},cache:{x:452,y:212}},
 {id:'SW03-D',solids:[platform(144,248,96),cover(312,32,48),platform(440,248,88)],world:{landmark:'damper',carry:carry('block',112,contact('damper-close-01',280),contact('vent-fragment-02',548,280,true)),air:{area:{x:368,y:190,width:64,height:130},direction:-1,speed:24,cycleMs:5200,quietMs:1600,warningMs:1000,activeMs:1600,damperContact:'damper-close-01'}}},
 {id:'SW04-A',solids:[cover(144,32,64),platform(272,256,88),cover(440,32,72)],world:{landmark:'garden',air:{area:{x:224,y:144,width:192,height:128},direction:1,speed:24,cycleMs:5200,quietMs:1800,warningMs:1000,activeMs:1400}},cache:{x:308,y:256}},
 {id:'SW04-B',solids:[platform(144,280,80),platform(408,280,96)],world:{landmark:'towel',cloth:{id:'c02-small-world:SW04-B:towel-01',platform:platform(264,248,88),travel:32,cycleMs:5200},air:{area:{x:232,y:160,width:152,height:124},direction:-1,speed:22,cycleMs:5200,quietMs:1800,warningMs:1000,activeMs:1400}}},
 {id:'SW04-C',solids:[platform(128,244,104),platform(296,264,80),platform(440,244,88)],world:{landmark:'gutter',carry:carry('lid',112,contact('gutter-lock-01',548)),pulse:{x:240,width:48,cycle:4800,warning:1400,active:700,kind:'water'},repair:{x:580,y:320}}},
 {id:'SW04-D',solids:[cover(144,32,40),platform(272,248,88),cover(448,32,40)],world:{landmark:'weathervane',air:{area:{x:248,y:128,width:176,height:144},direction:1,speed:22,cycleMs:5000,quietMs:1600,warningMs:900,activeMs:1400},carry:carry('lid',112,contact('vane-phase-01',240),contact('vane-phase-02',400,280,true),contact('vane-fragment-03',548,280,true)),pulse:{x:488,width:48,cycle:5000,warning:1500,active:800}}},
 {id:'SW05-A',solids:[platform(136,280,80),platform(256,244,80),platform(376,208,80),platform(496,244,80)],world:{landmark:'books'},cache:{x:416,y:208}},
 {id:'SW05-B',solids:[platform(136,260,96),cover(296,32,40),platform(416,244,104)],world:{landmark:'router-cable',carry:carry('conductor',112,contact('beacon-feed-01',552))},enemies:[enemy('sw05b-service',450)]},
 {id:'SW05-C',solids:[platform(128,248,72),platform(272,248,88),platform(448,248,72)],world:{landmark:'beacon-board',carry:carry('conductor',112,contact('beacon-part-01',240),contact('beacon-part-02',404),contact('beacon-part-03',548)),repair:{x:584,y:320}}},
 {id:'SW05-D',solids:[cover(152,32,40),platform(272,244,88),cover(448,32,40)],world:{landmark:'beacon',carry:carry('conductor',112,contact('beacon-final-01',240,280,true),contact('beacon-final-02',400,280,true),contact('beacon-final-03',548,280,true)),pulse:{x:352,width:56,cycle:4400,warning:1400,active:800}}},
 {id:'YU01-A',solids:[cover(184,32,48),platform(328,256,88)],world:{landmark:'courtyard',switches:[{x:112,y:320}],powerObjects:[power('entrance-B','A',468,264,16,56)],sequence:['B']}},
 {id:'YU01-B',solids:[platform(144,280,64),platform(460,280,72)],world:{landmark:'exchange',switches:[{x:112,y:320},{x:536,y:320}],powerObjects:[power('stairs-A','A',248,248,80),power('bridge-B','B',360,252,80)],sequence:['B','A']}},
 {id:'YU01-C',solids:[platform(144,260,104),platform(376,244,96),cover(528,32)],world:{landmark:'rooftop',switches:[{x:112,y:320},{x:568,y:320}],sequenceTargets:[{x:584,y:320}],powerObjects:[power('screen-A','A',312,268,24,52)],sequence:['B']},enemies:[enemy('yu01c-anomaly',440)],cache:{x:416,y:244}},
 {id:'YU01-D',solids:[cover(168,32,40),platform(312,244,88)],world:{landmark:'transmitter',switches:[{x:112,y:320},{x:448,y:320}],powerObjects:[power('tx-screen-A','A',496,268,20,52)],sequence:['B','A','B'],pulse:{x:240,width:56,cycle:5200,warning:1600,active:700}}},
 {id:'YU02-A',solids:[cover(152,40,64),platform(344,252,96)],world:{landmark:'warehouse',switches:[{x:112,y:320},{x:548,y:320}],powerObjects:[power('warehouse-A','A',264,268,20,52),power('lift-B','B',448,220,88)],sequence:['B']},cache:{x:488,y:220}},
 {id:'YU02-B',solids:[platform(144,276,88),platform(436,276,88)],world:{landmark:'crane',switches:[{x:112,y:320},{x:552,y:320}],powerObjects:[power('crane-A','A',272,240,96),power('crane-B','B',320,276,96)],sequence:['B','A'],pulse:{x:380,width:40,cycle:5600,warning:1800,active:700}}},
 {id:'YU02-C',solids:[platform(144,248,104),cover(320,32,48),platform(448,248,80)],world:{landmark:'quay',switches:[{x:112,y:320},{x:568,y:320}],powerObjects:[power('light-screen-A','A',400,272,20,48)],sequence:['B'],repair:{x:584,y:320}},enemies:[enemy('yu02c-drone',464)],cache:{x:480,y:248}},
 {id:'YU02-D',solids:[cover(152,32,40),platform(288,244,88),cover(464,32,40)],world:{landmark:'port-relay',switches:[{x:112,y:320},{x:416,y:320}],powerObjects:[power('relay-A','A',520,264,20,56)],sequence:['B','A','B'],pulse:{x:232,width:48,cycle:4800,warning:1600,active:700}}},
 {id:'YU03-A',solids:[platform(144,248,88),platform(352,264,88)],world:{landmark:'station',switches:[{x:112,y:320},{x:552,y:320}],powerObjects:[power('traction-A','A',272,272,24,48)],sequence:['B']}},
 {id:'YU03-B',solids:[cover(144,32,80),cover(352,32,96),platform(480,244,88)],world:{landmark:'train',switches:[{x:112,y:320},{x:568,y:320}],sequenceTargets:[{x:300,y:288},{x:552,y:320}],powerObjects:[power('train-A','A',264,248,64),power('train-B','B',264,288,64)],sequence:['B','A']},cache:{x:520,y:244}},
 {id:'YU03-C',solids:[platform(144,244,88),cover(288,32,48),platform(424,244,88)],world:{landmark:'tunnel',switches:[{x:112,y:320},{x:552,y:320}],powerObjects:[power('tunnel-A','A',368,272,20,48)],sequence:['B'],repair:{x:584,y:320},pulse:{x:240,width:40,cycle:5000,warning:1600,active:700}},enemies:[enemy('yu03c-drone',448)]},
 {id:'YU03-D',solids:[cover(160,32,40),platform(312,248,88)],world:{landmark:'substation',switches:[{x:112,y:320},{x:448,y:320}],powerObjects:[power('isolator-A','A',520,264,20,56)],sequence:['B','A','B'],pulse:{x:232,width:56,cycle:5200,warning:1800,active:700}}},
 {id:'YU04-A',solids:[platform(144,276,88),platform(432,248,96)],world:{landmark:'factory',switches:[{x:112,y:320},{x:568,y:320}],powerObjects:[power('belt-A','A',264,272,80),power('belt-B','B',336,240,80)],sequence:['B']}},
 {id:'YU04-B',solids:[platform(144,280,80),platform(448,280,80)],world:{landmark:'conveyor',switches:[{x:112,y:320},{x:568,y:320}],powerObjects:[power('hoist-A','A',256,244,80),power('hoist-B','B',352,212,80)],sequence:['B','A']},cache:{x:392,y:212}},
 {id:'YU04-C',solids:[cover(160,32,48),platform(304,244,88),cover(480,32,48)],world:{landmark:'distributor',switches:[{x:112,y:320},{x:432,y:320}],powerObjects:[power('feed-A','A',240,272,20,48)],sequence:['B','A'],repair:{x:584,y:320}},enemies:[enemy('yu04c-scanner',448)]},
 {id:'YU04-D',solids:[cover(152,32,48),platform(296,244,88),cover(464,32,40)],world:{landmark:'drive',switches:[{x:112,y:320},{x:416,y:320}],powerObjects:[power('drive-A','A',528,264,20,56)],sequence:['B','A','B'],pulse:{x:232,width:56,cycle:4600,warning:1600,active:800}}},
 {id:'YU05-A',solids:[platform(144,280,80),platform(264,244,80),platform(384,208,80),platform(504,244,72)],world:{landmark:'bay',switches:[{x:112,y:320},{x:568,y:320}],powerObjects:[power('bay-A','A',352,276,24,44)],sequence:['B']},cache:{x:424,y:208}},
 {id:'YU05-B',solids:[cover(152,32,48),platform(296,248,88),cover(480,32,40)],world:{landmark:'gallery',switches:[{x:112,y:320},{x:424,y:320}],powerObjects:[power('gallery-A','A',240,272,20,48),power('gallery-B','B',432,240,80)],sequence:['B','A']},enemies:[enemy('yu05b-drone',448)]},
 {id:'YU05-C',solids:[platform(144,248,80),platform(288,248,80),platform(440,248,80)],world:{landmark:'antenna',switches:[{x:112,y:320},{x:400,y:320},{x:552,y:320}],powerObjects:[power('antenna-A','A',240,272,20,48)],sequence:['B','A','B'],repair:{x:584,y:320}}},
 {id:'YU05-D',solids:[cover(160,32,48),platform(304,244,88),cover(480,32,40)],world:{landmark:'rift',switches:[{x:112,y:320},{x:432,y:320}],powerObjects:[power('rift-A','A',544,264,20,56)],sequence:['B','A','B'],pulse:{x:240,width:56,cycle:4400,warning:1500,active:800}}},
];
export const worldRooms=Object.fromEntries(authored.map((room):[WorldRoomId,RoomDefinition]=>{
 const mission=room.id.slice(0,4) as WorldMissionId,letter=room.id.at(-1)!,prev=String.fromCharCode(letter.charCodeAt(0)-1),next=String.fromCharCode(letter.charCodeAt(0)+1);
 return[room.id,{id:room.id,theme:'B',nameKey:'worlds.room.'+room.id,subtitleKey:'worlds.hint.'+room.id,solids:[floor,...room.solids],enemies:room.enemies||[],world:room.world,
 cache:room.cache?{id:'salvage',...room.cache,radius:24}:undefined,
 previous:letter==='A'?undefined:`${mission}-${prev}` as WorldRoomId,next:letter==='D'?undefined:`${mission}-${next}` as WorldRoomId,
 terminal:letter==='D'?{x:584,y:320}:undefined,terminalKind:letter==='D'?'exit':undefined,
 safeZones:room.world.repair?[{x:552,y:272,width:72,height:48,shielded:true}]:undefined}];
})) as Record<WorldRoomId,RoomDefinition>;
