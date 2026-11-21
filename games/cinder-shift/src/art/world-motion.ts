import type Phaser from 'phaser';
import type {RoomDefinition} from '../room-data';
import type {RoomState} from '../mission';
import {motionRigs,sampleMotion,type MotionRig} from './motion-atlas';
import {powerTarget} from '../session/world-runtime';
import {ProductionSprites,productionArt} from './production-art';

/** Decorative only: rendering cannot move a collider, arm a hazard or advance an objective. */
export class WorldMotionArt{
  private background:Phaser.GameObjects.Graphics;
  private sprites:ProductionSprites;
  private feedback:Phaser.GameObjects.Graphics;
  private rig?:MotionRig;
  private signature='';
  private previous?:{circuit?:string;phase:number;contacts:string[]};
  private cues:{x:number;y:number;born:number}[]=[];
  constructor(scene:Phaser.Scene,private room:RoomDefinition){
    this.background=scene.add.graphics().setDepth(1.65);
    this.sprites=new ProductionSprites(scene);
    this.feedback=scene.add.graphics().setDepth(6.4);
    this.rig=motionRigs.find(r=>r.mission===room.id.slice(0,4));
  }
  render(state:RoomState,now:number,reduced:boolean,playerX=64){
    const world=state.world;if(!world||!this.rig)return;
    const current={circuit:world.power?.circuit,phase:world.phase,contacts:world.carry?.contacts.filter(c=>c.active).map(c=>c.id)??[]};
    // Establish state on entry/revisit; an already earned contact is not a new event.
    if(this.previous){
      if(current.phase>this.previous.phase){
        const target=powerTarget(this.room.world!,{...world,phase:this.previous.phase});
        if(target)this.cues.push({x:target.x,y:target.y-28,born:now});
      }else if(current.circuit!==this.previous.circuit){
        const point=this.room.world?.switches?.reduce((a,b)=>Math.abs(a.x-playerX)<Math.abs(b.x-playerX)?a:b);
        if(point)this.cues.push({x:point.x,y:point.y-28,born:now});
      }
      for(const c of world.carry?.contacts??[])if(c.active&&!this.previous.contacts.includes(c.id))this.cues.push({x:c.rect.x+c.rect.width/2,y:c.rect.y+c.rect.height/2,born:now});
    }
    this.previous=current;
    const motionNow=this.room.world?.landmark==='drive'&&world.phase>=2?0:now;
    const signature=[reduced?0:Math.floor(motionNow/80),reduced].join(':');
    if(signature!==this.signature){
      this.signature=signature;const g=this.background;g.clear();this.sprites.begin();
      // Separate background prop plane above the routes. It never resembles a platform.
      const x=roomPlacement(this.room.id),y=65;
      const p=this.rig.parts.find(p=>p.keys?.length)??this.rig.parts[0],pose=sampleMotion(p,motionNow,this.rig.duration,reduced);
      const sector=this.room.id.slice(0,4) as keyof typeof productionArt.sectors,frame=productionArt.sectors[sector][5];
      if(sector==='YU01'){
        this.sprites.draw('YU01-exchange',x+80,y+110,138,104,1.65,1,.75);
      }else this.sprites.draw(frame,x+80+pose.x+(reduced?0:Math.round(Math.sin(motionNow*Math.PI/1200)*3)),y+104+pose.y+(reduced?0:Math.round(Math.cos(motionNow*Math.PI/1200)*3)),160,104,1.65,1,.68+pose.alpha*.16).setAngle(Math.sin(pose.rotation*Math.PI/180)*2);
      this.sprites.end();
    }
    const g=this.feedback;g.clear();this.cues=this.cues.filter(c=>now-c.born<480).slice(-4);
    for(const cue of this.cues){
      const p=Math.max(0,(now-cue.born)/480),alpha=(1-p)*.65;
      if(reduced){g.lineStyle(2,0x91d2b8,alpha).strokeRect(cue.x-5,cue.y-5,10,10);continue;}
      // Four low-luminance flecks, bounded to 18 pixels: no full-screen flash.
      for(const [dx,dy]of [[-1,-1],[1,-1],[-1,1],[1,1]]){
        const d=4+Math.round(p*14);g.fillStyle(0x91d2b8,alpha).fillRect(cue.x+dx*d,cue.y+dy*d-2,3,2);
      }
    }
  }
}
function roomPlacement(id:string){return id.endsWith('-C')?32:id.endsWith('-B')?200:416;}
