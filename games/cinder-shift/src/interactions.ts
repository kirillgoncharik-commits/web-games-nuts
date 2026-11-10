import type {Point} from './room-data';

export function terminalInReach(playerX:number,feet:number,terminal:Point){
  return Math.abs(playerX-terminal.x)<34&&feet>terminal.y-17;
}

export function cacheInReach(playerX:number,feet:number,cache:Point&{radius:number}){
  return Math.abs(playerX-cache.x)<cache.radius&&Math.abs(feet-cache.y)<12;
}
