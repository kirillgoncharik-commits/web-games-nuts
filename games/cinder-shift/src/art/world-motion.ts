import type Phaser from 'phaser';
import type {RoomDefinition} from '../room-data';
import type {RoomState} from '../mission';
import {motionRigs,motionPalette,sampleMotion,type MotionRig} from './motion-atlas';
import {powerTarget} from '../session/world-runtime';

/** Decorative only: rendering cannot move a collider, arm a hazard or advance an objective. */
export class WorldMotionArt{
  private background:Phaser.GameObjects.Graphics;
  private feedback:Phaser.GameObjects.Graphics;
  private rig?:MotionRig;
  private signature='';
  private previous?:{circuit?:string;phase:number;contacts:string[]};
  private cues:{x:number;y:number;born:number}[]=[];
  constructor(scene:Phaser.Scene,private room:RoomDefinition){
    this.background=scene.add.graphics().setDepth(1.65);
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
    const signature=[reduced?0:Math.floor(now/80),reduced].join(':');
    if(signature!==this.signature){
      this.signature=signature;const g=this.background;g.clear();
      // Separate background prop plane above the routes. It never resembles a platform.
      const x=roomPlacement(this.room.id),y=65;
      for(const p of this.rig.parts){const pose=sampleMotion(p,now,this.rig.duration,reduced);
        g.save().translateCanvas(x+pose.x,y+pose.y);
        if(p.pivot)g.translateCanvas(p.pivot.x,p.pivot.y).rotateCanvas(pose.rotation*Math.PI/180).translateCanvas(-p.pivot.x,-p.pivot.y);
        for(const s of p.shapes)g.fillStyle(parseInt(motionPalette[s.color].slice(1),16),(s.alpha??1)*pose.alpha*.85).fillRect(s.x,s.y,s.width,s.height);
        g.restore();
      }
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
