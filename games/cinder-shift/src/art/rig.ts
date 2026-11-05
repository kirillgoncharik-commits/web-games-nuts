// M02's procedural leg phase and quantization are deliberately unchanged.
export function miraRigPose(now:number,vx:number,feet:number,crouching:boolean){
  const step=Math.sin(now/75)*3*(Math.abs(vx)>5?1:0),q=Math.round(step);
  return {height:crouching?26:44,frontLegY:feet-12+q,frontLegHeight:12-q,backLegY:feet-12-q,backLegHeight:12+q,frontBootY:feet-4+q,backBootY:feet-4-q};
}
