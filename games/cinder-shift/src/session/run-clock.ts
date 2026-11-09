export type RunPauseReason='manual'|'settings'|'blur'|'hidden'|'orientation'|'host'|'container';
export type RunTimingPolicy='standard'|'personal';

/** Wall-clock timer for competitive runs. Simulation steps never drive this clock. */
export class RunClock{
  private startedAt:number|null=null;
  private stoppedAt:number|null=null;
  private segmentStartedAt:number|null=null;
  private elapsedBeforePause=0;
  private pauseStartedAt:number|null=null;
  private readonly reasons=new Set<RunPauseReason>();
  private pauses=0;
  constructor(private readonly now:()=>number=()=>performance.now()){}
  start(at=this.now()){if(this.startedAt!==null)return false;this.startedAt=at;this.segmentStartedAt=at;return true;}
  pause(reason:RunPauseReason,at=this.now()){
    if(this.startedAt===null||this.stoppedAt!==null||this.reasons.has(reason))return false;
    if(this.reasons.size===0){this.elapsedBeforePause+=Math.max(0,at-(this.segmentStartedAt??at));this.segmentStartedAt=null;this.pauseStartedAt=at;this.pauses++;}
    this.reasons.add(reason);return true;
  }
  resume(reason:RunPauseReason,at=this.now()){
    if(!this.reasons.delete(reason))return false;
    if(this.reasons.size===0){this.pauseStartedAt=null;this.segmentStartedAt=at;}
    return true;
  }
  /** Adds the currently elapsed segment and freezes the result. */
  stop(at=this.now()){
    if(this.startedAt===null)return 0;
    if(this.stoppedAt!==null)return this.elapsedMs(this.stoppedAt);
    if(this.reasons.size===0)this.elapsedBeforePause+=Math.max(0,at-(this.segmentStartedAt??this.startedAt));
    this.stoppedAt=at;this.reasons.clear();this.pauseStartedAt=null;return this.elapsedBeforePause;
  }
  elapsedMs(at=this.now()){
    if(this.startedAt===null)return 0;
    if(this.stoppedAt!==null)return this.elapsedBeforePause;
    if(this.reasons.size>0)return this.elapsedBeforePause;
    return this.elapsedBeforePause+Math.max(0,at-(this.segmentStartedAt??this.startedAt));
  }
  get pauseCount(){return this.pauses;}
  get paused(){return this.reasons.size>0;}
  get started(){return this.startedAt!==null;}
}

export type RunModeId='time_attack'|'score_attack'|'daily'|'duel'|'relay';
export type RunState='preparation'|'ready'|'playing'|'paused'|'practice'|'finished'|'dnf';
export type Eligibility='standard'|'practice';
export type RunResult={run_id:string;challenge_key:string;mode:RunModeId;state:'finished'|'dnf';eligibility:Eligibility;elapsed_ms:number;sim_ms:number;score:number;outcome:'victory'|'death'|'cancelled';pause_count:number;finished_at:number};

export class RunSession{
  state:RunState='preparation';eligibility:Eligibility='standard';
  private readonly pauseReasons=new Set<RunPauseReason>();
  private result:RunResult|null=null;
  private pauses=0;
  constructor(readonly runId:string,readonly challengeKey:string,readonly mode:RunModeId,readonly timing:RunTimingPolicy,readonly clock:RunClock=new RunClock()){}
  ready(){if(this.state!=='preparation')return false;this.state='ready';return true;}
  start(){if(this.state!=='ready'||!this.clock.start())return false;this.state='playing';return true;}
  pause(reason:RunPauseReason){return this.interrupt(reason);}
  interrupt(reason:RunPauseReason){
    if(!['playing','practice','paused'].includes(this.state)||this.pauseReasons.has(reason))return false;
    if(reason!=='container'&&this.timing==='standard')this.eligibility='practice';
    if(this.pauseReasons.size===0)this.pauses++;
    this.pauseReasons.add(reason);
    if(this.timing==='personal')this.clock.pause(reason);
    this.state='paused';return true;
  }
  resume(reason=[...this.pauseReasons].at(-1)){if(this.state!=='paused'||!reason||!this.pauseReasons.delete(reason))return false;if(this.timing==='personal')this.clock.resume(reason);if(this.pauseReasons.size>0)return true;this.state=this.eligibility==='practice'?'practice':'playing';return true;}
  finish(input:{outcome:'victory'|'death'|'cancelled';simMs:number;score:number;at?:number}):RunResult|null{
    if(this.result||!['playing','practice','paused'].includes(this.state))return null;
    const pauseCount=this.pauses,elapsed=Math.max(0,this.clock.stop(input.at));this.state=input.outcome==='cancelled'?'dnf':'finished';
    this.result={run_id:this.runId,challenge_key:this.challengeKey,mode:this.mode,state:this.state==='dnf'?'dnf':'finished',eligibility:this.eligibility,elapsed_ms:Math.round(elapsed),sim_ms:Math.max(0,Math.round(input.simMs)),score:Math.max(0,Math.floor(input.score)),outcome:input.outcome,pause_count:pauseCount,finished_at:Math.round(input.at??performance.now())};
    return structuredClone(this.result);
  }
  dnf(simMs=0,at?:number){return this.finish({outcome:'cancelled',simMs,score:0,at});}
  snapshot(){return this.result?structuredClone(this.result):null;}
}
