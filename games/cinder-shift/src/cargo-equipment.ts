import type {Rect,RoomDefinition} from './room-data';

/** Surface transport, separate from the player's own acceleration and knockback. */
export function conveyorSurfaceSpeed(conveyor:RoomDefinition['conveyor'],body:Rect,feet:number,grounded:boolean,vy:number,dashing=false){
 if(!conveyor||conveyor.enabled!==true||!grounded||vy<0||dashing)return 0;
 if(Math.abs(feet-conveyor.y-conveyor.height)>2||body.x+body.width<=conveyor.x||body.x>=conveyor.x+conveyor.width)return 0;
 return conveyor.speed;
}
