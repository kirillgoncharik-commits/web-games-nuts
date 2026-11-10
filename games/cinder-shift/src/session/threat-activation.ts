import {clearLine} from '../geometry';
import {enemyMuzzle,type EnemyState} from '../enemies';
import type {Point,Rect,RoomId} from '../room-data';

/** Keeps the Airlock drone behind the walker's first response or the designed sight break. */
export function roomThreatCanActivate(room:RoomId,candidate:EnemyState,roster:EnemyState[],player:Point,solids:Rect[]){
 if(room==='B'&&candidate.id==='b-drone'){
  const walker=roster.find(enemy=>enemy.id==='b-walker');
  if(!walker)return false;
  if(walker.hp<=0)return true;
  return player.x>520&&!clearLine(enemyMuzzle(walker),player,solids);
 }
 if(room==='C'&&!candidate.active)return roster.filter(enemy=>enemy.active&&enemy.hp>0).length<2;
 return true;
}
