// Original deterministic pulse/triangle/noise score for Nuts Games. No sampled recordings.
export const rate=44100,bpm=106;
const p=(wave,start,duration,from,to,level=1)=>({wave,start,duration,from,to,level});
export const definitions={
 ui_focus:{seconds:.03,priority:0,bus:'ui',peak:.09,parts:[p('pulse',0,.03,560,560)]},
 ui_confirm:{seconds:.1,priority:2,bus:'ui',peak:.13,parts:[p('pulse',0,.045,440,440),p('pulse',.05,.05,660,660)]},
 ui_cancel:{seconds:.1,priority:2,bus:'ui',peak:.12,parts:[p('triangle',0,.045,440,440),p('triangle',.05,.05,294,294)]},
 ui_denied:{seconds:.14,priority:2,bus:'ui',peak:.14,parts:[p('pulse',0,.055,135,125),p('pulse',.075,.06,135,100)]},
 module_purchase:{seconds:.24,priority:3,bus:'ui',peak:.2,parts:[p('noise',0,.06,300,90,.4),p('pulse',.04,.07,220,330),p('triangle',.12,.12,440,660)]},
 jump:{seconds:.1,priority:0,bus:'sfx',peak:.13,parts:[p('pulse',0,.1,110,270)]},
 land:{seconds:.09,priority:0,bus:'sfx',peak:.13,parts:[p('noise',0,.06,180,70,.5),p('triangle',0,.09,80,38)]},
 dash:{seconds:.14,priority:1,bus:'sfx',peak:.18,parts:[p('noise',0,.14,800,120),p('pulse',0,.07,90,180,.3)]},
 shot:{seconds:.055,priority:0,bus:'sfx',peak:.14,parts:[p('pulse',0,.055,380,170),p('noise',0,.018,900,300,.22)]},
 hit_enemy:{seconds:.07,priority:2,bus:'sfx',peak:.18,parts:[p('pulse',0,.035,920,480,.7),p('noise',0,.07,600,200,.5)]},
 enemy_break:{seconds:.19,priority:2,bus:'sfx',peak:.2,parts:[p('noise',0,.19,300,40),p('triangle',0,.17,110,32,.65)]},
 hurt_player:{seconds:.2,priority:5,bus:'sfx',peak:.25,parts:[p('pulse',0,.1,94,65),p('pulse',.08,.12,75,48),p('noise',0,.08,130,60,.25)]},
 warn_walker:{seconds:.19,priority:4,bus:'sfx',peak:.25,parts:[p('pulse',0,.065,155,155),p('pulse',.09,.1,155,155)]},
 warn_turret:{seconds:.23,priority:4,bus:'sfx',peak:.25,parts:[p('pulse',0,.05,330,330),p('pulse',.08,.05,247,247),p('triangle',.16,.07,165,165)]},
 warn_drone:{seconds:.15,priority:4,bus:'sfx',peak:.25,parts:[p('pulse',0,.15,720,1060,.7),p('triangle',0,.15,360,530,.4)]},
 terminal_ready:{seconds:.18,priority:2,bus:'sfx',peak:.17,parts:[p('triangle',0,.08,330,330),p('pulse',.09,.09,495,495)]},
 power_restore:{seconds:.28,priority:3,bus:'sfx',peak:.22,parts:[p('pulse',0,.075,220,220),p('pulse',.085,.075,330,330),p('triangle',.17,.11,440,440)]},
 gate_open:{seconds:.19,priority:2,bus:'sfx',peak:.17,parts:[p('noise',0,.12,200,70,.6),p('triangle',.04,.15,95,145)]},
 cache_claim:{seconds:.22,priority:2,bus:'sfx',peak:.18,parts:[p('noise',0,.04,400,180,.4),p('pulse',.04,.07,523,523),p('triangle',.12,.1,784,784)]},
 mission_win:{seconds:.85,priority:6,bus:'result',peak:.3,parts:[p('pulse',0,.17,262,262,.6),p('pulse',.18,.17,330,330,.6),p('pulse',.36,.17,392,392,.6),p('triangle',.54,.31,523,523),p('triangle',.54,.31,131,131,.5)]},
 mission_death:{seconds:.8,priority:6,bus:'result',peak:.3,parts:[p('pulse',0,.2,196,196,.6),p('pulse',.21,.2,147,147,.6),p('triangle',.42,.38,98,65),p('noise',.42,.2,150,40,.2)]}
};
function seedFor(value){let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function add(data,part,seed){let state=seed||1,filtered=0,phase=0;const first=Math.round(part.start*rate),count=Math.round(part.duration*rate);
 for(let i=0;i<count&&first+i<data.length;i++){const time=i/rate,u=i/Math.max(1,count-1),frequency=part.from*Math.pow(part.to/part.from,u);phase+=frequency/rate;let value;
  if(part.wave==='noise'){state^=state<<13;state^=state>>>17;state^=state<<5;const raw=(state>>>0)/2147483648-1;filtered+=Math.min(.65,Math.max(.035,frequency/rate*7))*(raw-filtered);value=filtered*2;}
  else if(part.wave==='triangle')value=2/Math.PI*Math.asin(Math.sin(phase*Math.PI*2));
  else{value=0;for(let harmonic=1;harmonic<=7;harmonic+=2)value+=Math.sin(phase*Math.PI*2*harmonic)/harmonic;value*=.8;}
  const attack=Math.min(1,time/.003),release=Math.min(1,(part.duration-time)/.012),decay=part.sustain?1:Math.pow(Math.max(0,1-u),.7);data[first+i]+=value*part.level*attack*release*decay;
 }
}
export function renderDefinition(id,def){const data=new Float32Array(Math.round(def.seconds*rate));def.parts.forEach((part,i)=>add(data,part,seedFor(id)+i));let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));for(let i=0;i<data.length;i++)data[i]*=def.peak/(peak||1);return data;}
export function renderSfx(id){return renderDefinition(id,definitions[id]);}
const hz=midi=>440*Math.pow(2,(midi-69)/12);
export function renderMusic(id){const combat=id==='combat',bars=combat?16:8,beat=60/bpm,step=beat/2,data=new Float32Array(Math.round(bars*4*beat*rate));const roots=[38,34,41,36],arp=[0,7,12,15,12,7,3,7];
 for(let bar=0;bar<bars;bar++){const root=roots[Math.floor(bar/2)%roots.length];for(let s=0;s<8;s++){const at=(bar*8+s)*step,remaining=data.length/rate-at;
  if(s%2===0)add(data,{wave:'triangle',start:at,duration:Math.min(step*1.6,remaining-.006),from:hz(root),to:hz(root),level:.35,sustain:true},0);
  if(combat||s%2===0){const n=root+24+arp[(s+(bar%2)*2)%arp.length];add(data,{wave:'pulse',start:at,duration:Math.min(step*(combat?.65:.85),remaining-.006),from:hz(n),to:hz(n),level:combat?.12:.09,sustain:true},0);}
  if(combat||s%4===0)add(data,{wave:'noise',start:at,duration:.045,from:combat?1700:900,to:400,level:s%2?.045:.065},bar*19+s+23);
 }}let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));for(let i=0;i<data.length;i++)data[i]*=.18/(peak||1);return data;}
export function wav(data,sampleRate=rate){const b=Buffer.alloc(44+data.length*2);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data.length*2,40);for(let i=0;i<data.length;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,data[i]))*32767),44+i*2);return b;}
