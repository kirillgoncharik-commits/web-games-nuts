import {test,expect} from '@playwright/test';
import {Player} from '../games/cinder-shift/src/player';
import type {Action,Frame} from '../games/cinder-shift/src/input';
import config from '../games/cinder-shift/game.config.json' with {type:'json'};

function player(){
 const body:any={blocked:{down:true},touching:{down:false},height:config.movement.standing_height,velocity:{x:0,y:0},
  setVelocityX(x:number){this.velocity.x=x;},setVelocityY(y:number){this.velocity.y=y;}};
 const sprite:any={x:64,y:298,body,setVisible(){return this;},setCollideWorldBounds(){return this;}};
 return new Player({physics:{add:{sprite:()=>sprite}}} as any,64);
}
const frame=(down:Action[],pressed:Action[],released:Action[]):Frame=>({down:new Set(down),pressed:new Set(pressed),released:new Set(released)});

test('releasing and re-pressing jump between fixed ticks gives the new held jump full height',()=>{
 const p=player();
 p.step(frame(['jump'],['jump'],['jump']),1000,1000/60,[],false);
 expect(p.body.velocity.y).toBe(config.initial_balance.jump_velocity);
 p.body.blocked.down=false;
 p.step(frame(['jump'],[],[]),1017,1000/60,[],false);
 expect(p.body.velocity.y).toBe(config.initial_balance.jump_velocity);
 p.step(frame([],[],['jump']),1034,1000/60,[],false);
 expect(p.body.velocity.y).toBe(-110);
});

test('a complete tap between fixed ticks still produces the intended short jump',()=>{
 const p=player();
 p.step(frame([],['jump'],['jump']),1000,1000/60,[],false);
 expect(p.body.velocity.y).toBe(-110);
});
