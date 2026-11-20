import type {RoomState} from '../games/cinder-shift/src/mission';

export function campaignPressure(rooms:Record<string,RoomState>) {
  return Object.entries(rooms).filter(([,room])=>room.visited).map(([roomId, room])=>{
    const attacks=room.enemies.reduce((total,enemy)=>total+enemy.warnings,0);
    const combatMs=Math.round(room.enemyContactMs);
    return {room:roomId, enemies:room.enemies.length, attacks, combatMs, hpLost:room.hpLost,
      attacksPerCombatMinute:combatMs ? Math.round(attacks*60000/combatMs) : null};
  });
}
