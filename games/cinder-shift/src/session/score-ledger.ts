export type EnemyKind='walker'|'drone'|'turret';
export type ScoreBreakdown={victory:number;optional_goals:number;walkers:number;drones:number;turrets:number;time_bonus:number;clean_bonus:number;total:number;harm_events:number};
const values:Record<EnemyKind,number>={walker:50,drone:75,turret:150};
export class ScoreLedger{
  private readonly goals=new Set<string>();private readonly enemies=new Map<string,EnemyKind>();private readonly harms=new Set<string>();private victory=false;
  goal(id:string){if(!safeId(id)||this.goals.has(id))return false;this.goals.add(id);return true;}
  kill(id:string,kind:EnemyKind){if(!safeId(id)||this.enemies.has(id))return false;this.enemies.set(id,kind);return true;}
  harm(id:string){if(!safeId(id)||this.harms.has(id))return false;this.harms.add(id);return true;}
  finish(elapsedMs:number,outcome:'victory'|'death'|'dnf'):ScoreBreakdown{
    const victory=outcome==='victory'?1000:0,optional_goals=this.goals.size*250;
    const walkers=[...this.enemies.values()].filter(k=>k==='walker').length;
    const drones=[...this.enemies.values()].filter(k=>k==='drone').length;
    const turrets=[...this.enemies.values()].filter(k=>k==='turret').length;
    const time_bonus=outcome==='victory'?Math.max(0,1200-2*Math.floor(Math.max(0,elapsedMs)/1000)):0;
    const clean_bonus=outcome==='victory'&&this.harms.size===0?400:0;
    return{victory,optional_goals,walkers:walkers*values.walker,drones:drones*values.drone,turrets:turrets*values.turret,time_bonus,clean_bonus,total:victory+optional_goals+walkers*values.walker+drones*values.drone+turrets*values.turret+time_bonus+clean_bonus,harm_events:this.harms.size};
  }
}
function safeId(id:string){return typeof id==='string'&&id.length>0&&id.length<=120&&/^[A-Za-z0-9_.:-]+$/.test(id);}
