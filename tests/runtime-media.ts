import {expect,type Page,type TestInfo} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

// Capture only the game's own Web Audio output, never microphone or system audio.
export async function installMediaCapture(page:Page){
 await page.addInitScript(()=>{
  const w=window as any,original=AudioNode.prototype.connect;
  w.__GAME_AUDIO_CAPTURE__=null;
  AudioNode.prototype.connect=function(...args:any[]){
   const result=(original as any).apply(this,args);
   if(args[0]===this.context.destination&&!w.__GAME_AUDIO_CAPTURE__){
    const context=this.context as AudioContext,destination=context.createMediaStreamDestination(),analyser=context.createAnalyser();
    analyser.fftSize=1024;(original as any).call(this,destination);(original as any).call(this,analyser);
    w.__GAME_AUDIO_CAPTURE__={context,destination,analyser};
   }
   return result;
  } as typeof AudioNode.prototype.connect;
 });
}
export async function startMedia(page:Page){
 await expect.poll(()=>page.evaluate(()=>Boolean((window as any).__GAME_AUDIO_CAPTURE__))).toBe(true);
 await page.evaluate(()=>{
  const w=window as any,a=w.__GAME_AUDIO_CAPTURE__,canvas=document.querySelector('#game canvas') as HTMLCanvasElement;
  if(!canvas)throw Error('Game canvas missing');
  const video=canvas.captureStream(30),stream=new MediaStream([...video.getVideoTracks(),...a.destination.stream.getAudioTracks()]);
  const types=['video/webm;codecs=vp8,opus','video/webm'];const mimeType=types.find(t=>MediaRecorder.isTypeSupported(t));
  if(!mimeType)throw Error('WebM recording unavailable');
  const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:300000,audioBitsPerSecond:64000}),chunks:BlobPart[]=[];
  let peakRms=0,samples=0,frame=0,active=true;
  const data=new Float32Array(a.analyser.fftSize);
  function sample(){if(!active)return;a.analyser.getFloatTimeDomainData(data);let power=0;for(const value of data)power+=value*value;peakRms=Math.max(peakRms,Math.sqrt(power/data.length));samples++;frame=requestAnimationFrame(sample);}
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  recorder.start(1000);sample();
  w.__GAME_RECORDING__={stop:()=>new Promise<any>((resolve,reject)=>{
   recorder.onerror=event=>reject(new Error(String(event)));
   recorder.onstop=()=>{active=false;cancelAnimationFrame(frame);for(const track of video.getTracks())track.stop();
    const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>resolve({base64:String(reader.result).split(',')[1],mimeType,peakRms,samples,audioTracks:stream.getAudioTracks().length,width:canvas.width,height:canvas.height});reader.readAsDataURL(new Blob(chunks,{type:mimeType}));
   };recorder.stop();
  })};
 });
}
export async function finishMedia(page:Page,info:TestInfo,name:string){
 const capture=await page.evaluate(()=>(window as any).__GAME_RECORDING__.stop());
 const bytes=Buffer.from(capture.base64,'base64');delete capture.base64;
 await writeFile(info.outputPath(name+'.webm'),bytes);await writeFile(info.outputPath(name+'-audio.json'),JSON.stringify({...capture,bytes:bytes.length},null,2));
 expect(capture.audioTracks).toBe(1);expect(capture.peakRms).toBeGreaterThan(.0001);expect(bytes.length).toBeGreaterThan(1000);
 return {...capture,bytes:bytes.length};
}
