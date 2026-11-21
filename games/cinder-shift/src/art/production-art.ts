import type Phaser from 'phaser';
import manifest from '../../public/assets/world-production/manifest.json' with {type:'json'};
import type {RoomDefinition,Rect} from '../room-data';
import {roomSector} from './sector-design';
type Meta={bounds:{x:number;y:number;width:number;height:number};canvas:number[]};
export const productionArt=manifest;
export const productionFrames=manifest.frames as Record<string,Meta>;
export const baseArtSector=(room:RoomDefinition)=>room.boss?'regulator':roomSector(room);
export function preloadProductionArt(scene:Phaser.Scene,room:RoomDefinition){
 if(!scene.textures.exists('production-objects'))scene.load.atlas('production-objects','./assets/world-production/objects.png','./assets/world-production/objects.json');
 if(room.world?.pulse?.kind==='steam'&&!scene.textures.exists('kitchen-steam-manifold'))
  scene.load.image('kitchen-steam-manifold','./assets/kitchen/steam-manifold.png');
 if(room.world){const sector=room.id.slice(0,4) as keyof typeof manifest.backgrounds;
  if(!scene.textures.exists('production-bg-'+sector))scene.load.image('production-bg-'+sector,'./assets/world-production/'+manifest.backgrounds[sector].file);
  if(!scene.textures.exists('production-material-'+sector))scene.load.image('production-material-'+sector,'./assets/world-production/'+manifest.materials[sector]);
 }else{const sector=baseArtSector(room);if(!scene.textures.exists('production-bg-base-'+sector))scene.load.image('production-bg-base-'+sector,'./assets/world-production/'+manifest.baseBackgrounds[sector].file);}
}
/** Render only: placements never change physical geometry. */
export class ProductionSprites{
 private pool:Phaser.GameObjects.Image[]=[];private used=0;
 constructor(private scene:Phaser.Scene){}
 begin(){this.used=0;}
 draw(frame:string,x:number,y:number,w:number,h:number,depth=4,flip=1,alpha=1,stretch=false){
  const meta=productionFrames[frame];if(!meta)throw Error('unmapped_production_sprite:'+frame);
  let image=this.pool[this.used++];if(!image){image=this.scene.add.image(0,0,'production-objects',frame);this.pool.push(image);}
  const b=meta.bounds,s=Math.min(w/b.width,h/b.height);
  return image.setTexture('production-objects',frame).setOrigin((b.x+b.width/2)/meta.canvas[0],(b.y+b.height)/meta.canvas[1]).setPosition(Math.round(x),Math.round(y)).setScale(stretch?w/b.width:s,stretch?h/b.height:s).setFlipX(flip<0).setAngle(0).clearTint().setAlpha(alpha).setDepth(depth).setVisible(true);
 }
 rect(frame:string,r:Rect,depth=3.2,alpha=1){return this.draw(frame,r.x+r.width/2,r.y+r.height,r.width,r.height,depth,1,alpha,true);}
 end(){for(let n=this.used;n<this.pool.length;n++)this.pool[n].setVisible(false);}
}
