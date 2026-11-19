/** Authored pixel art and timing shared by Phaser, SVG exports and the Figma handoff.
 * Coordinates are logical game pixels. These layers never provide collision or damage. */
export const motionPalette = {
  ink:'#142331', shadow:'#20384a', steel:'#405c70', edge:'#78949f',
  cream:'#efd6a4', amber:'#dfa568', rust:'#9b6456', teal:'#65a7a5',
  mint:'#91d2b8', water:'#315d79', foam:'#83b4c2', violet:'#8d809d',
  leaf:'#7b9b75', paper:'#c7d1c3', glow:'#c2e5d4',
} as const;
export type MotionColor = keyof typeof motionPalette;
export type PixelShape = {x:number;y:number;width:number;height:number;color:MotionColor;alpha?:number};
export type MotionKey = {ms:number;x?:number;y?:number;alpha?:number;rotation?:number};
export type MotionPart = {id:string;shapes:PixelShape[];keys?:MotionKey[];pivot?:{x:number;y:number}};
export type MotionRig = {id:string;name:string;mission:string;duration:number;width:number;height:number;parts:MotionPart[]};
const r=(x:number,y:number,width:number,height:number,color:MotionColor,alpha?:number):PixelShape=>({x,y,width,height,color,...(alpha===undefined?{}:{alpha})});
const part=(id:string,shapes:PixelShape[],keys?:MotionKey[]):MotionPart=>({id,shapes,...(keys?{keys}:{})});
const bob=(dy:number):MotionKey[]=>[{ms:0,y:0},{ms:600,y:dy},{ms:1200,y:0},{ms:1800,y:-dy},{ms:2400,y:0}];
const drift=(dx:number):MotionKey[]=>[{ms:0,x:0},{ms:1200,x:dx},{ms:2400,x:0}];
const pulse:MotionKey[]=[{ms:0,alpha:.45},{ms:1200,alpha:.85},{ms:2400,alpha:.45}];
function rig(id:string,name:string,mission:string,parts:MotionPart[]):MotionRig{return{id,name,mission,duration:2400,width:160,height:104,parts};}

export const motionRigs:MotionRig[]=[
  rig('kitchen-steam','Copper kettle / warm steam','SW01',[
    part('copper-kettle',[r(45,50,65,37,'rust'),r(49,44,57,10,'amber'),r(54,40,47,5,'cream'),r(51,55,5,24,'amber'),r(61,80,42,5,'ink'),r(101,38,9,8,'rust'),r(110,35,9,6,'amber'),r(117,29,7,10,'amber'),r(31,56,14,6,'amber'),r(27,60,7,15,'rust'),r(33,73,12,5,'amber'),r(57,35,38,4,'rust'),r(68,30,16,5,'amber')]),
    part('steam-near',[r(115,18,7,4,'paper',.4),r(120,11,11,4,'paper',.3),r(115,5,9,3,'paper',.2)],[{ms:0,y:0,alpha:.2},{ms:800,y:-7,alpha:.65},{ms:1600,y:-12,alpha:.15},{ms:2400,y:0,alpha:.2}]),
    part('steam-far',[r(102,20,5,4,'paper',.3),r(100,11,9,4,'paper',.2)],bob(-3)),
    part('stove-light',[r(53,92,48,2,'amber',.5),r(59,95,36,2,'rust',.4)],pulse),
  ]),
  rig('desk-fan','Desk fan / dust in lamplight','SW02',[
    part('fan-housing',[r(61,28,46,4,'edge'),r(53,36,62,4,'steel'),r(49,44,70,34,'steel'),r(53,78,62,4,'edge'),r(61,86,46,4,'steel'),r(78,89,12,9,'steel'),r(61,98,46,4,'edge'),r(55,44,58,31,'ink')]),
    {...part('fan-blades',[r(80,44,8,15,'teal'),r(64,61,16,6,'edge'),r(88,62,15,6,'teal'),r(78,57,12,9,'cream')],[{ms:0,rotation:0},{ms:2400,rotation:360}]),pivot:{x:84,y:61}},
    part('dust-near',[r(14,37,2,2,'paper',.5),r(127,51,2,2,'paper',.4),r(33,68,2,2,'paper',.3)],drift(8)),
    part('dust-far',[r(133,22,2,2,'amber',.35),r(26,84,2,2,'paper',.3)],bob(3)),
  ]),
  rig('laundry-line','Laundry / layered fabric and air','SW03',[
    part('clothesline',[r(8,19,144,2,'edge'),r(8,14,3,13,'steel'),r(149,14,3,13,'steel')]),
    part('long-fabric',[r(27,24,46,58,'violet'),r(31,28,8,50,'paper',.4),r(65,27,4,51,'ink',.3),r(29,80,40,4,'edge'),r(31,17,5,10,'amber'),r(62,17,5,10,'amber')],drift(2)),
    part('short-fabric',[r(92,25,38,43,'teal'),r(96,29,4,34,'mint',.5),r(121,28,5,34,'ink',.3),r(93,66,35,4,'edge'),r(96,17,5,10,'amber'),r(121,17,5,10,'amber')],[{ms:0,x:0,y:0},{ms:1200,x:3,y:-2},{ms:2400,x:0,y:0}]),
    part('air-ribbons',[r(10,92,24,1,'paper',.3),r(111,86,30,1,'paper',.25)],drift(7)),
  ]),
  rig('balcony-leaves','Terracotta / wind through leaves','SW04',[
    part('terracotta',[r(49,72,62,6,'amber'),r(54,78,52,18,'rust'),r(59,96,42,5,'rust'),r(58,80,5,13,'amber')]),
    part('plant-stems',[r(77,24,5,49,'leaf'),r(62,42,17,4,'leaf'),r(82,34,21,4,'leaf')]),
    part('left-leaves',[r(40,33,23,6,'leaf'),r(45,39,23,8,'teal'),r(53,47,16,3,'leaf'),r(62,21,14,5,'mint'),r(66,26,13,12,'leaf')],drift(-2)),
    part('right-leaves',[r(96,22,26,8,'leaf'),r(89,30,25,6,'teal'),r(88,45,26,9,'leaf'),r(97,54,24,4,'teal')],drift(3)),
    part('pollen',[r(17,22,2,2,'cream',.4),r(132,62,2,2,'cream',.3)],drift(10)),
  ]),
  rig('shelf-beacon','Bookshelf / miniature lighthouse','SW05',[
    part('book-spines',[r(15,56,11,43,'rust'),r(29,47,15,52,'violet'),r(48,62,11,37,'teal'),r(19,62,3,26,'amber'),r(33,54,7,2,'paper'),r(14,100,130,4,'steel')]),
    part('lighthouse',[r(86,50,25,48,'paper'),r(91,36,15,16,'edge'),r(85,32,27,5,'rust'),r(82,51,33,5,'rust'),r(91,62,7,7,'water'),r(102,78,5,7,'water'),r(93,90,9,8,'ink'),r(80,98,38,3,'edge')]),
    part('beacon-sweep',[r(108,39,13,4,'cream',.55),r(121,36,13,10,'cream',.25),r(134,33,12,16,'cream',.12)],pulse),
    part('dust',[r(71,23,2,2,'paper',.4),r(126,66,2,2,'paper',.3)],bob(-3)),
  ]),
  rig('relay-cabinet','House of Communications / relay cabinet','YU01',[
    part('cabinet',[r(28,15,104,85,'steel'),r(33,20,94,75,'shadow'),r(38,25,84,4,'edge'),r(38,34,42,25,'ink'),r(85,34,34,25,'ink'),r(40,66,78,3,'edge'),r(40,75,78,3,'edge'),r(40,84,78,3,'edge'),r(23,100,114,4,'ink')]),
    part('signal-meter',[r(43,49,4,5,'mint'),r(50,44,4,10,'mint'),r(57,39,4,15,'mint'),r(64,46,4,8,'teal')],pulse),
    part('relay-slider',[r(90,42,22,3,'teal'),r(90,49,12,3,'cream')],drift(3)),
    part('status-light',[r(116,24,4,4,'mint'),r(111,21,14,10,'mint',.08)],pulse),
  ]),
  rig('harbor-tide','Night Harbor / boat, tide and reflections','YU02',[
    part('harbor-post',[r(132,17,6,76,'rust'),r(129,14,12,6,'edge'),r(133,24,2,55,'amber'),r(120,93,30,5,'ink')]),
    part('moored-boat',[r(20,65,96,5,'edge'),r(27,70,83,7,'rust'),r(35,77,65,6,'shadow'),r(40,58,49,7,'paper'),r(45,50,39,8,'cream'),r(53,53,10,5,'water'),r(68,53,10,5,'water'),r(61,28,3,22,'steel'),r(62,28,23,2,'edge'),r(33,83,61,2,'ink')],bob(1)),
    part('mast-pennant',[r(67,32,20,3,'rust'),r(67,35,15,3,'rust'),r(67,38,8,2,'amber')],drift(2)),
    part('water-back',[r(8,86,22,2,'foam',.4),r(34,92,32,2,'foam',.3),r(98,87,22,2,'teal',.5)],drift(4)),
    part('water-front',[r(16,99,36,2,'water'),r(73,96,35,2,'foam',.4),r(118,102,25,1,'teal',.4)],drift(-5)),
    part('lamp-reflection',[r(133,83,5,2,'amber',.6),r(130,88,11,2,'amber',.4),r(134,94,7,2,'amber',.2)],pulse),
    part('dock-lamp',[r(125,5,20,3,'steel'),r(129,8,12,6,'cream'),r(121,8,28,18,'cream',.06)]),
  ]),
  rig('rail-signal','Last train / signal and current','YU03',[
    part('signal-mast',[r(80,17,7,83,'steel'),r(64,16,39,51,'shadow'),r(69,20,29,43,'ink'),r(74,100,21,4,'edge'),r(72,27,22,7,'rust'),r(72,43,22,7,'mint'),r(76,58,14,3,'edge')]),
    part('signal-halo',[r(68,39,30,15,'mint',.08),r(75,44,16,4,'mint')],pulse),
    part('catenary',[r(8,8,144,2,'edge'),r(28,10,2,12,'steel'),r(124,10,2,12,'steel')]),
    part('current-slug',[r(12,7,12,3,'teal',.6)],[{ms:0,x:0,alpha:.4},{ms:2200,x:124,alpha:.4},{ms:2300,x:124,alpha:0},{ms:2400,x:0,alpha:0}]),
  ]),
  rig('factory-flywheel','Old factory / flywheel and belt','YU04',[
    part('machine-casing',[r(25,63,110,35,'steel'),r(30,68,100,23,'shadow'),r(32,98,13,6,'ink'),r(115,98,13,6,'ink'),r(40,31,64,5,'edge'),r(32,39,80,41,'steel'),r(40,39,64,41,'shadow')]),
    {...part('flywheel-spokes',[r(67,38,7,39,'rust'),r(49,54,42,7,'rust'),r(64,51,13,13,'amber'),r(69,54,4,7,'ink')],[{ms:0,rotation:0},{ms:2400,rotation:180}]),pivot:{x:71,y:58}},
    part('belt-markers',[r(105,40,8,3,'edge'),r(112,50,8,3,'edge'),r(115,61,8,3,'edge')],bob(3)),
    part('pressure-gauge',[r(112,22,20,16,'paper'),r(116,26,12,8,'ink'),r(120,27,3,6,'mint')]),
  ]),
  rig('roof-transmission','Final frequency / antenna transmission','YU05',[
    part('antenna',[r(77,12,5,75,'edge'),r(55,26,50,3,'steel'),r(46,40,68,3,'edge'),r(58,53,44,3,'steel'),r(70,84,20,7,'steel'),r(53,93,54,7,'rust'),r(60,88,40,5,'shadow')]),
    part('near-signal',[r(112,24,3,6,'teal',.6),r(118,31,3,13,'teal',.6),r(112,46,3,6,'teal',.6)],pulse),
    part('far-signal',[r(132,14,3,10,'mint',.3),r(139,28,3,21,'mint',.3),r(132,53,3,10,'mint',.3)],[{ms:0,alpha:.2},{ms:1200,alpha:.65},{ms:2400,alpha:.2}]),
    part('roof-pennant',[r(16,55,3,42,'steel'),r(19,57,20,5,'rust'),r(19,62,14,4,'amber')],drift(2)),
  ]),
];

/** Deliberately stepped at 12.5 fps, not render-frame based. No random or wall clock. */
export function sampleMotion(part:MotionPart,now:number,duration:number,reduced=false){
  const time=reduced?0:Math.floor(Math.max(0,now)/80)*80%duration;
  const keys=part.keys;if(!keys?.length)return{x:0,y:0,alpha:1,rotation:0};
  let left=keys[0],right=keys[keys.length-1];
  for(let i=1;i<keys.length;i++)if(time<keys[i].ms){left=keys[i-1];right=keys[i];break;}
  const t=right.ms===left.ms?0:Math.max(0,Math.min(1,(time-left.ms)/(right.ms-left.ms)));
  const value=(key:'x'|'y'|'alpha'|'rotation',fallback:number)=>(left[key]??fallback)+((right[key]??fallback)-(left[key]??fallback))*t;
  return{x:Math.round(value('x',0)),y:Math.round(value('y',0)),alpha:value('alpha',1),rotation:value('rotation',0)};
}
export function motionSvg(rig:MotionRig,now=0,reduced=false){
  const parts=rig.parts.map(p=>{const pose=sampleMotion(p,now,rig.duration,reduced),rotation=p.pivot?` rotate(${pose.rotation} ${p.pivot.x} ${p.pivot.y})`:'';return`<g id="${p.id}" transform="translate(${pose.x} ${pose.y})${rotation}" opacity="${pose.alpha}">${p.shapes.map(s=>`<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${motionPalette[s.color]}" opacity="${s.alpha??1}"/>`).join('')}</g>`;}).join('');
  return`<svg xmlns="http://www.w3.org/2000/svg" width="${rig.width}" height="${rig.height}" viewBox="0 0 ${rig.width} ${rig.height}" shape-rendering="crispEdges">${parts}</svg>`;
}
