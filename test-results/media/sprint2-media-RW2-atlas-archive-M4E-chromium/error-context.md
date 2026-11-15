# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sprint2-media.spec.ts >> RW2 atlas archive M4E
- Location: tests/sprint2-media.spec.ts:9:35

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 1000
Received:   7
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - region "Cinder Shift 64" [ref=e3]:
      - generic [ref=e5]:
        - application "Игровое поле. Управление доступно в настройках." [active] [ref=e6]
        - generic:
          - generic "Прочность костюма":
            - generic: ПРОЧНОСТЬ
            - strong: 6/6
          - generic: Заберите физический носитель на верхней полке.
          - strong: СЕКТОР 4 · M4E
          - button "Пауза игры" [ref=e8] [cursor=pointer]: Ⅱ
  - paragraph [ref=e9]: Cinder Shift 64 is a browser action game by Nuts Games. Prepare Mira, explore five sectors of Caldera 7, choose a route through the foundry, and reach the evacuation platform. Twelve research technologies and six campaign events shape each run. Keyboard, touch and gamepad controls; English and Russian interface. No account required.
```

# Test source

```ts
  1  | import {expect,type Page,type TestInfo} from '@playwright/test';
  2  | import {writeFile} from 'node:fs/promises';
  3  | 
  4  | // Capture only the game's own Web Audio output, never microphone or system audio.
  5  | export async function installMediaCapture(page:Page){
  6  |  await page.addInitScript(()=>{
  7  |   const w=window as any,original=AudioNode.prototype.connect;
  8  |   w.__GAME_AUDIO_CAPTURE__=null;
  9  |   AudioNode.prototype.connect=function(this:AudioNode,...args:any[]){
  10 |    const result=(original as any).apply(this,args);
  11 |    if(args[0]===this.context.destination&&!w.__GAME_AUDIO_CAPTURE__){
  12 |     const context=this.context as AudioContext,destination=context.createMediaStreamDestination(),analyser=context.createAnalyser();
  13 |     analyser.fftSize=1024;(original as any).call(this,destination);(original as any).call(this,analyser);
  14 |     w.__GAME_AUDIO_CAPTURE__={context,destination,analyser};
  15 |    }
  16 |    return result;
  17 |   } as typeof AudioNode.prototype.connect;
  18 |  });
  19 | }
  20 | export async function startMedia(page:Page){
  21 |  await expect.poll(()=>page.evaluate(()=>Boolean((window as any).__GAME_AUDIO_CAPTURE__))).toBe(true);
  22 |  await page.evaluate(()=>{
  23 |   const w=window as any,a=w.__GAME_AUDIO_CAPTURE__,canvas=document.querySelector('#game canvas') as HTMLCanvasElement;
  24 |   if(!canvas)throw Error('Game canvas missing');
  25 |   const video=canvas.captureStream(30),stream=new MediaStream([...video.getVideoTracks(),...a.destination.stream.getAudioTracks()]);
  26 |   const types=['video/webm;codecs=vp8,opus','video/webm'];const mimeType=types.find(t=>MediaRecorder.isTypeSupported(t));
  27 |   if(!mimeType)throw Error('WebM recording unavailable');
  28 |   const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:300000,audioBitsPerSecond:64000}),chunks:BlobPart[]=[];
  29 |   let peakRms=0,samples=0,frame=0,active=true;
  30 |   const data=new Float32Array(a.analyser.fftSize);
  31 |   function sample(){if(!active)return;a.analyser.getFloatTimeDomainData(data);let power=0;for(const value of data)power+=value*value;peakRms=Math.max(peakRms,Math.sqrt(power/data.length));samples++;frame=requestAnimationFrame(sample);}
  32 |   recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  33 |   recorder.start(1000);sample();
  34 |   w.__GAME_RECORDING__={stop:()=>new Promise<any>((resolve,reject)=>{
  35 |    recorder.onerror=event=>reject(new Error(String(event)));
  36 |    recorder.onstop=()=>{active=false;cancelAnimationFrame(frame);for(const track of video.getTracks())track.stop();
  37 |     const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>resolve({base64:String(reader.result).split(',')[1],mimeType,peakRms,samples,audioTracks:stream.getAudioTracks().length,width:canvas.width,height:canvas.height});reader.readAsDataURL(new Blob(chunks,{type:mimeType}));
  38 |    };recorder.stop();
  39 |   })};
  40 |  });
  41 | }
  42 | export async function finishMedia(page:Page,info:TestInfo,name:string){
  43 |  const capture=await page.evaluate(()=>(window as any).__GAME_RECORDING__.stop());
  44 |  const bytes=Buffer.from(capture.base64,'base64');delete capture.base64;
  45 |  await writeFile(info.outputPath(name+'.webm'),bytes);await writeFile(info.outputPath(name+'-audio.json'),JSON.stringify({...capture,bytes:bytes.length},null,2));
> 46 |  expect(capture.audioTracks).toBe(1);expect(capture.peakRms).toBeGreaterThan(.0001);expect(bytes.length).toBeGreaterThan(1000);
     |                                                                                                          ^ Error: expect(received).toBeGreaterThan(expected)
  47 |  return {...capture,bytes:bytes.length};
  48 | }
  49 | 
```