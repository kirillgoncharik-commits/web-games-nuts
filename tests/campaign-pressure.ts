import type {RoomState} from '../games/cinder-shift/src/mission';

export function campaignPressure(rooms:Record<string,RoomState>) {
  return Object.entries(rooms).filter(([,room])=>room.visited).map(([roomId, room])=>{
    const attacks=room.enemies.reduce((total,enemy)=>total+enemy.warnings,0);
    const combatMs=Math.round(room.enemyContactMs);
    return {room:roomId, enemies:room.enemies.length, attacks, combatMs, hpLost:room.hpLost,
      attacksPerCombatMinute:combatMs ? Math.round(attacks*60000/combatMs) : null};
  });
}

type RouteSnapshot={
  attemptId:string; activeSeconds:number; score:number;
  eventLog:{name:string;params:{attempt_id?:string;room_id?:string;active_duration?:number;score?:number}}[];
};

// A return to an earlier room is a distinct visit. Keep the sector-exit award
// in the final visit, and include only the partial score of a failed attempt.
export function campaignVisits(snapshot:RouteSnapshot){
  const entries=snapshot.eventLog.filter(event=>event.name==='room_enter'&&event.params.attempt_id===snapshot.attemptId);
  return entries.map(({params},index)=>{
    const end=entries[index+1]?.params;
    return {room:params.room_id, entered_seconds:params.active_duration,
      left_seconds:end?.active_duration??snapshot.activeSeconds,
      score_in:params.score, score_out:end?.score??snapshot.score};
  });
}
