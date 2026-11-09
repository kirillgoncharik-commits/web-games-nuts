import manifest from '../../public/assets/art-refresh-v1/runtime-manifest.json' with {type:'json'};

export type ArtFrame=keyof typeof manifest.frames;
export type SpriteAnchor='bottom'|'center';

export function fitSprite(frame:ArtFrame,width:number,height:number,anchor:SpriteAnchor){
  const meta=manifest.frames[frame],bounds=meta.opaque_bounds;
  return {
    scale:Math.min(width/bounds.width,height/bounds.height),
    originX:(bounds.x+bounds.width/2)/meta.source_canvas[0],
    originY:(bounds.y+bounds.height*(anchor==='bottom'?1:.5))/meta.source_canvas[1]
  };
}

export function coverSprite(frame:ArtFrame,width:number,height:number){
  const meta=manifest.frames[frame],bounds=meta.opaque_bounds;
  const scale=Math.max(width/bounds.width,height/bounds.height);
  const cropWidth=width/scale,cropHeight=height/scale;
  const x=bounds.x+(bounds.width-cropWidth)/2,y=bounds.y+(bounds.height-cropHeight)/2;
  return {scale,x,y,width:cropWidth,height:cropHeight,originX:x/meta.source_canvas[0],originY:y/meta.source_canvas[1]};
}
