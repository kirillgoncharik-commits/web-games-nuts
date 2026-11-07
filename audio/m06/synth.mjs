// Original 8-bit inspired score data. Themes share instruments but not melodies or harmonic paths.
export const themes={
 menu:{bpm:108,bars:32,roots:[45,41,43,40],motif:[0,7,9,7,4,2,0,-3],answer:[12,9,7,4],swing:0,lead:.075,bass:.12,answerLevel:.045,noise:.012},
 map:{bpm:96,bars:16,roots:[41,48,43,45],motif:[0,3,7,10,7,5,3,0],answer:[12,10,7,3],swing:0,lead:.052,bass:.085,answerLevel:.036,noise:.006},
 airlock:{bpm:144,bars:32,roots:[40,45,43,47],motif:[0,3,7,10,9,7,3,0],answer:[12,10,7,3],swing:.03,lead:.084,bass:.13,answerLevel:.048,noise:.018},
 freight:{bpm:150,bars:32,roots:[38,41,43,45],motif:[0,7,5,10,7,3,5,0],answer:[12,7,10,5],swing:.09,lead:.088,bass:.145,answerLevel:.038,noise:.028},
 foundry:{bpm:152,bars:32,roots:[36,43,39,41],motif:[0,2,7,9,7,2,5,0],answer:[12,9,7,2],swing:.04,lead:.082,bass:.14,answerLevel:.042,noise:.025},
 archive:{bpm:120,bars:32,roots:[41,48,45,43],motif:[0,7,12,10,7,3,5,0],answer:[12,15,12,7],swing:0,lead:.066,bass:.095,answerLevel:.055,noise:.009},
 reactor:{bpm:148,bars:32,roots:[36,41,39,43],motif:[0,7,8,7,3,0,5,3],answer:[12,8,7,3],swing:.035,lead:.09,bass:.15,answerLevel:.04,noise:.03},
 boss:{bpm:160,bars:32,roots:[36,37,43,39],motif:[0,1,7,8,7,1,5,0],answer:[12,8,7,1],swing:.02,lead:.1,bass:.16,answerLevel:.035,noise:.04}
};

export function buildTrack(id){
 const score=themes[id];if(!score)throw Error('unknown_music_theme:'+id);
 const events=[],beatLength=score.bars*4;
 const add=(beat,duration,pitch,wave,level)=>{if(beat>=beatLength)return;events.push({beat,duration:Math.min(duration,beatLength-beat),pitch,wave,level});};
 for(let bar=0;bar<score.bars;bar++){
  const phrase=Math.floor(bar/8),localBar=bar%8,chord=score.roots[Math.floor(localBar/2)%score.roots.length],returning=phrase===score.bars/8-1;
  const motif=score.motif,energy=phrase===2?1.08:phrase===1?.92:1;
  for(let step=0;step<8;step++){
   const beat=bar*4+step*.5+(step%2?score.swing:0),motifIndex=(step+localBar*2+(phrase===2?2:0))%motif.length,offset=motif[motifIndex];
   const rest=(id==='map'&&step%2===1)||(id==='menu'&&step===5&&localBar%2===1)||(id==='archive'&&step===3&&localBar%2===0);
   if(!rest)add(beat,.34,chord+12+offset+(phrase===1?12:0),'pulse',score.lead*energy);
   if(step%2===0&&!returning)add(beat+.22,.25,chord+24+score.answer[(step/2+localBar)%score.answer.length],'triangle',score.answerLevel);
  }
  const bassPattern=id==='freight'||id==='reactor'||id==='boss'?[0,.75,1.5,2,2.75,3.5]:[0,1,2,3];
  for(let i=0;i<bassPattern.length;i++)add(bar*4+bassPattern[i],.78,chord-12+(i%2?7:0),'triangle',score.bass);
  for(const beat of id==='map'?[0,2]:[0,1,2,3]){
   const level=beat===0?score.noise:score.noise*(beat%2?.65:.85);
   add(bar*4+beat,.09,0,'noise',level);
  }
  if(id!=='map'&&localBar%2===1)for(const beat of [1.5,3.5])add(bar*4+beat,.045,0,'noise',score.noise*.42);
 }
 return{...score,events:events.sort((a,b)=>a.beat-b.beat)};
}

export function midiHz(note){return 440*Math.pow(2,(note-69)/12);}
