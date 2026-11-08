export type LayoutRect={x:number;y:number;width:number;height:number};
export type TouchLayoutMode='dock'|'sides'|'none';
export type MobileLayoutInput={width:number;height:number;safe:{top:number;right:number;bottom:number;left:number};touch:boolean;previous?:TouchLayoutMode};
export type MobileViewportLayout={mode:TouchLayoutMode;scale:number;frame:LayoutRect;canvas:LayoutRect;controls:LayoutRect|null;controlRects:Record<string,LayoutRect>;available:{width:number;height:number};};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const scaleFor=(width:number,height:number)=>Math.max(0,Math.min(width/640,height/360));

/** Selects the largest full 640×360 game frame while keeping touch controls at CSS-pixel size. */
export function mobileViewportLayout(input:MobileLayoutInput):MobileViewportLayout{
 const width=Math.max(0,input.width-input.safe.left-input.safe.right),height=Math.max(0,input.height-input.safe.top-input.safe.bottom);
 const dockHeight=input.width<input.height?144:88,sideWidth=232;
 const candidates:{mode:TouchLayoutMode;scale:number;controls:LayoutRect|null;controlRects:Record<string,LayoutRect>}[]=[];
 if(!input.touch)candidates.push({mode:'none',scale:scaleFor(width,height),controls:null,controlRects:{}});
 else{
  const dockScale=scaleFor(width,Math.max(0,height-dockHeight));
  candidates.push({mode:'dock',scale:dockScale,controls:{x:input.safe.left,y:input.height-input.safe.bottom-dockHeight,width,height:dockHeight},controlRects:{move:{x:input.safe.left+8,y:input.height-input.safe.bottom-(input.width<input.height?136:76),width:196,height:60},action:{x:input.width-input.safe.right-272,y:input.height-input.safe.bottom-(input.width<input.height?68:76),width:264,height:60}}});
  const sideScale=scaleFor(Math.max(0,width-sideWidth),height);
  candidates.push({mode:'sides',scale:sideScale,controls:{x:input.safe.left,y:input.safe.top,width,height},controlRects:{move:{x:input.safe.left+8,y:input.safe.top+clamp((height-144)/2,0,height-144),width:104,height:144},action:{x:input.width-input.safe.right-112,y:input.safe.top+clamp((height-280)/2,0,height-280),width:104,height:280}}});
 }
 const feasible=candidates.filter(candidate=>candidate.scale>0&&candidate.scale*360>=150&&(!input.touch||candidate.mode==='dock'||input.width>=sideWidth+320));
 const options=feasible.length?feasible:candidates;
 let selected=options.reduce((best,candidate)=>candidate.scale>best.scale?candidate:best,options[0]);
 const previous=input.previous&&options.find(candidate=>candidate.mode===input.previous);
 if(previous&&previous.scale>=selected.scale*.95)selected=previous;
 const canvasWidth=Math.floor(640*selected.scale),canvasHeight=Math.floor(360*selected.scale),frameX=input.safe.left+(width-canvasWidth)/2;
 const frameY=input.safe.top+(height-(selected.mode==='dock'?canvasHeight+dockHeight:canvasHeight))/2;
 return{mode:selected.mode,scale:selected.scale,frame:{x:frameX,y:frameY,width:canvasWidth,height:canvasHeight},canvas:{x:frameX,y:frameY,width:canvasWidth,height:canvasHeight},controls:selected.controls,controlRects:selected.controlRects,available:{width,height}};
}
