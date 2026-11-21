// Suggested next action in the switchboard. Both levers remain usable.
export function exchangeGuide(phase:number,circuit:'A'|'B',x:number,feet:number){
 const far=x>=452;
 if(phase===0){
  if(circuit==='A')return {key:'worlds.exchange.selectB',x:far?552:112,y:260};
  if(feet>289&&x<=214)return {key:'worlds.exchange.bridge',x:180,y:281};
  if(feet>289&&far)return {key:'worlds.exchange.fromRight',x:438,y:273};
  if(feet>289&&x>214)return {key:'worlds.exchange.crate',x:194,y:280};
  return {key:'worlds.exchange.bridge',x:324,y:248};
 }
 if(circuit==='B'){
  if(x>=416)return {key:'worlds.exchange.lever',x:552,y:260};
  if(feet<=288)return {key:'worlds.exchange.cross',x:438,y:273};
  return {key:'worlds.exchange.lower',x:112,y:260};
 }
 if(x<416)return {key:'worlds.exchange.stairs',x:x<215?194:x<310?272:358,y:x<310?281:248};
 return {key:'worlds.exchange.confirm',x:552,y:271};
}
