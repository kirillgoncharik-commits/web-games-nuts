export type FeedbackEvent='damage'|'heavy'|'shield'|'repair';
export type FeedbackOptions={intensity:number;reduced:boolean};

/** Simulation time owns every impulse: pausing cannot leave a browser timer alive. */
export class CombatFeedback{
 private damageAt=-Infinity;private shieldAt=-Infinity;private repairAt=-Infinity;
 private shakeAt=-Infinity;private shakeStrength=0;
 trigger(event:FeedbackEvent,now:number){
  if(event==='damage'){this.damageAt=now;this.shakeAt=now;this.shakeStrength=1.25;}
  if(event==='heavy'){this.shakeAt=now;this.shakeStrength=2.25;}
  if(event==='shield')this.shieldAt=now;
  if(event==='repair'){this.clear();this.repairAt=now;}
 }
 clear(){this.damageAt=this.shieldAt=this.repairAt=this.shakeAt=-Infinity;this.shakeStrength=0;}
 sample(now:number,{intensity,reduced}:FeedbackOptions){
  const strength=Number.isFinite(intensity)?Math.max(0,Math.min(1,intensity)):0;
  const fade=(start:number,duration:number)=>Math.max(0,Math.min(1,1-(now-start)/duration));
  const shake=reduced?0:fade(this.shakeAt,170)*this.shakeStrength*strength;
  const step=shake>0?Math.floor(Math.max(0,now-this.shakeAt)/25):0;
  return{damageAlpha:reduced?0:fade(this.damageAt,145)*.19*strength,
   shieldAlpha:fade(this.shieldAt,210)*.7*strength,repairAlpha:fade(this.repairAt,260)*.65*strength,
   offsetX:shake?shake*(step%2?1:-1):0,offsetY:shake?shake*.55*(step%3?1:-1):0};
 }
}
