import Phaser from 'phaser';
import config from '../game.config.json' with {type:'json'};
import {Controls} from './input';
import {Effects} from './audio';
import {Telemetry,type EventName} from './telemetry';
import {MissionAttempt,rooms,type Mode,type Result} from './mission';
import {RoomScene} from './room-scene';
import './style.css';
declare const __BUILD_ID__:string;
declare const __SOURCE_SHA__:string;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.querySelector<T>(`#${id}`)!;
const controls=new Controls(),effects=new Effects(),telemetry=new Telemetry(__BUILD_ID__,__SOURCE_SHA__);
let game:Phaser.Game,attempt:MissionAttempt|null=null;
let state:'loading'|'menu'|'briefing'|'playing'|'paused'|'dying'|'complete'|'dead'|'error'='loading';
let touchMode='auto',layout='dock',lastSample=performance.now(),loadMs=0,frames=0,longFrames=0,sampleFrames=0;
const fps:number[]=[];
const startedAt=performance.now(),portrait=()=>matchMedia('(pointer:coarse)').matches&&innerHeight>innerWidth;
const focusGame=()=>$('game').focus({preventScroll:true});
function emit(name:EventName,params:Record<string,string|number>={}){
  try{telemetry.emit(name,{...(attempt?{mission_id:attempt.missionId,room_id:attempt.current,attempt_id:attempt.id,active_duration:Math.round(attempt.activeMs)/1000}:{}),...params});}catch{/* Diagnostics cannot stop the game. */}
}
function panel(html:string,primary:()=>void,secondary?:()=>void){
  const overlay=$('overlay');overlay.hidden=false;overlay.innerHTML=`<div class="panel">${html}</div>`;
  overlay.querySelector('[data-primary]')?.addEventListener('click',primary);overlay.querySelector('[data-secondary]')?.addEventListener('click',secondary||(()=>{}));
}
function deviceHints(){
  if(controls.device==='gamepad')return 'Стик / крестовина — движение · A — прыжок · ↓ — присесть · RT — огонь · X — терминал · Menu — пауза';
  if(controls.device==='touch')return 'Слева — движение и приседание. Справа — прыжок, огонь и терминал. Автоогонь видит только цели перед костюмом без стены на пути.';
  return 'A / D или стрелки — движение · Space — прыжок · S / ↓ — присесть · J / X — огонь · E — терминал · Esc — пауза';
}
function updateDevice(){
  $('sector-label').textContent=attempt?`ОТСЕК ${attempt.current} — ${rooms[attempt.current].name.toUpperCase()}`:'МИССИЯ 01 — ШЛЮЗ';
  $('device').textContent={keyboard:'КЛАВИАТУРА',gamepad:'ГЕЙМПАД',touch:'СЕНСОР'}[controls.device];
  $('hints').textContent=deviceHints()+(attempt?.mode==='training'?' · K / C — тест импульса':'');
  const touch=touchMode==='on'||(touchMode==='auto'&&controls.device==='touch');
  $('touch-controls').hidden=!touch;$('playframe').classList.toggle('touch-sides',touch&&layout==='sides');
  document.querySelector<HTMLElement>('[data-action="ability"]')!.hidden=attempt?.mode!=='training';
}
function menu(){
  if(attempt&&attempt.mode==='mission'&&attempt.finish('abandoned'))emit('mission_end',{result:'abandoned',reason:'Выход в меню'});
  game.scene.stop('Room');state='menu';attempt=null;controls.setScope('menu');effects.pause();$('pause').setAttribute('disabled','');$('transition').hidden=true;
  $('objective').textContent='Миссия 01 · Включить аварийную линию и выйти';
  panel('<p class="tag">КАЛЬДЕРА 7 / МИССИЯ 01</p><h2>Шлюз</h2><p>Сеть изолировала комплекс. Верните питание эвакуационной линии и доберитесь до выхода через три отсека.</p><button class="primary" data-primary>Начать миссию →</button><button class="secondary" data-secondary>Полигон управления</button><p class="steps">ТРИ КОМНАТЫ · БАЗОВЫЙ КОСТЮМ · БЕЗ СОХРАНЕНИЯ</p>',briefing,()=>start('training'));
  updateDevice();syncOrientation();
}
function briefing(){
  state='briefing';controls.setScope('menu');
  panel(`<p class="tag">МИССИЯ 01 / ШЛЮЗ</p><h2>Включить аварийную линию<br>и выйти</h2><p>A — проверка костюма. B — сервисный коридор.<br>C — силовой щиток и эвакуационный шлюз.<br>Роботов можно обходить. После смерти миссия начинается заново.</p><p>${deviceHints()}</p><button class="primary" data-primary>Войти в шлюз</button><button class="secondary" data-secondary>В меню</button>`,()=>start('mission'),menu);
}
function start(mode:Mode,retry=false){
  if(portrait())return;
  const previous=attempt?.id;game.scene.stop('Room');attempt=new MissionAttempt(mode);state='playing';controls.setScope('play');
  $('overlay').hidden=true;$('transition').hidden=true;$('pause').removeAttribute('disabled');void effects.unlock();effects.tone(330,.14);
  if(retry)emit('retry',{previous_attempt_id:previous||''});
  emit(mode==='mission'?'mission_start':'test_start');game.scene.start('Room',{attempt});focusGame();updateDevice();
}
function finish(result:Result){
  if(!attempt||!attempt.finish(result))return;
  const current=attempt;
  game.scene.pause('Room');state=result==='victory'?'complete':'dead';controls.setScope('menu');$('pause').setAttribute('disabled','');effects.tone(result==='victory'?660:65,.2);
  emit(current.mode==='training'?'test_complete':'mission_end',{result,reason:result==='death'?current.reason:'Аварийная линия включена, шлюз достигнут'});
  const win=result==='victory',time=Math.round(current.activeMs/1000),title=win?(current.mode==='training'?'Системы в норме.':'Линия восстановлена.'):'Костюм повреждён';
  panel(`<p class="tag">${win?'ЗАДАНИЕ ВЫПОЛНЕНО':'МИССИЯ ПРЕРВАНА'} / ОТСЕК ${current.current}</p><h2>${title}</h2><p>${win?'Питание включено. Шлюз достигнут.':`Причина: ${current.reason}.`}<br>Активное время: ${time} с · прочность: ${current.hp}/6</p><button class="primary" data-primary>${win?'Пройти ещё раз':'Повторить'}</button><button class="secondary" data-secondary>В меню</button>`,()=>start(current.mode,true),menu);
}
function pause(reason='manual'){
  if(state!=='playing')return;
  state='paused';game.scene.pause('Room');controls.setScope('pause');attempt?.clock.clear();effects.pause();emit('pause',{reason});
  panel(`<p class="tag">КОСТЮМ В ОЖИДАНИИ</p><h2>Пауза</h2><p>${reason==='blur'||reason==='hidden'?'Вы покинули окно. Мир и звук остановлены.':reason==='portrait'?'Телефон повёрнут. Мир и звук остановлены.':'Мир и звук остановлены.'}<br>Продолжение — по вашей команде.</p><button class="primary" data-primary>Продолжить</button><button class="secondary" data-secondary>В меню</button>`,resume,menu);
}
function resume(){
  if(state!=='paused'||portrait()||document.hidden)return;
  void effects.unlock();controls.setScope('play');attempt?.clock.clear();state='playing';game.scene.resume('Room');$('overlay').hidden=true;focusGame();emit('resume');
}
function syncOrientation(){$('rotate').hidden=!portrait();if(portrait())pause('portrait');}
function failure(message:string,contextLost=false){
  if(state==='error')return;state='error';controls.setScope('menu');effects.pause();game?.scene.pause('Room');emit('error',{code:message});
  panel(`<p class="tag">${contextLost?'ГРАФИЧЕСКИЙ КОНТЕКСТ ПОТЕРЯН':'СБОЙ ЗАПУСКА'}</p><h2>Нужен перезапуск</h2><p>${contextLost?'Графика была отключена браузером. После обновления миссия начнётся заново.':'Обновите страницу, чтобы повторить загрузку. Подробности доступны в диагностике.'}</p><button class="primary" data-primary>Повторить загрузку</button>`,()=>location.reload());
}
const room=new RoomScene({controls,effects,emit,pause:()=>pause(),result:finish,dying:()=>{state='dying';},objective:text=>$('objective').textContent=text,transition:active=>{$('transition').hidden=!active;}});
class Boot extends Phaser.Scene{
  constructor(){super('Boot');}
  create(){
    const g=this.make.graphics({x:0,y:0});g.fillStyle(0xffffff).fillRect(0,0,22,44).generateTexture('body',22,44);g.destroy();
    loadMs=Math.round(performance.now()-startedAt);emit('game_ready',{load_ms:loadMs});this.scene.stop();menu();
  }
}
$('build-label').textContent=`v${__BUILD_ID__} / ${__SOURCE_SHA__.slice(0,7)}`;
$('pause').addEventListener('click',()=>{state==='paused'?resume():pause();focusGame();});
$('mute').addEventListener('click',()=>{effects.muted=!effects.muted;$('mute').textContent=`Звук: ${effects.muted?'выкл':'вкл'}`;$('mute').setAttribute('aria-pressed',String(effects.muted));focusGame();});
$('diagnostics-toggle').addEventListener('click',()=>{$('diagnostics').hidden=!$('diagnostics').hidden;$('diagnostics-toggle').setAttribute('aria-expanded',String(!$('diagnostics').hidden));focusGame();});
$('touch-mode').addEventListener('change',e=>{touchMode=(e.target as HTMLSelectElement).value;updateDevice();});
$('touch-layout').addEventListener('change',e=>{layout=(e.target as HTMLSelectElement).value;controls.clear();updateDevice();});
$('autofire').addEventListener('change',focusGame);
(document.querySelector('.settings') as HTMLDetailsElement).addEventListener('toggle',e=>{if(!(e.target as HTMLDetailsElement).open)focusGame();});
window.addEventListener('blur',()=>pause('blur'));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('hidden');});window.addEventListener('resize',syncOrientation);
window.addEventListener('error',e=>failure(e.message||'runtime_error'));window.addEventListener('unhandledrejection',()=>failure('unhandled_rejection'));
emit('game_boot');
const benchmarkFps=new URLSearchParams(location.search).get('fps')==='30'?30:60;
game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:640,height:360,backgroundColor:'#14232b',pixelArt:true,antialias:false,banner:false,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},input:{keyboard:false},
  fps:{target:benchmarkFps,limit:benchmarkFps===30?30:0,smoothStep:false},
  physics:{default:'arcade',arcade:{gravity:{x:0,y:config.initial_balance.gravity},customUpdate:true,fixedStep:false}},scene:[Boot,room]});
game.events.on(Phaser.Core.Events.READY,()=>game.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failure('webgl_context_lost',true);}));
game.events.on(Phaser.Core.Events.POST_RENDER,()=>{
  if(state!=='playing'&&state!=='dying'){
    const frame=controls.poll();if(state==='paused'&&frame.pressed.has('pause'))resume();
    if((state==='menu'||state==='briefing'||state==='complete'||state==='dead')&&frame.pressed.has('jump')&&controls.device==='gamepad'&&document.hasFocus()){
      if(state==='menu')briefing();else if(state==='briefing')start('mission');else if(attempt)start(attempt.mode,true);
    }
  }
  updateDevice();sampleFrames++;
  if(state==='playing'){frames++;if(game.loop.delta>50)longFrames++;}
  const sampleNow=performance.now(),sampleMs=sampleNow-lastSample;if(sampleMs<1000)return;lastSample=sampleNow;
  const value=Math.round(sampleFrames*1000/sampleMs);sampleFrames=0;if(state==='playing'){fps.push(value);if(fps.length>60)fps.shift();}
  $('metrics').textContent=`${value} FPS · загрузка ${loadMs} мс · длинных кадров ${longFrames}/${frames} · ${state} · ${effects.state()}`;
  const ctx=$<HTMLCanvasElement>('fps-chart').getContext('2d')!;ctx.clearRect(0,0,640,64);ctx.strokeStyle='#405951';ctx.beginPath();ctx.moveTo(0,34);ctx.lineTo(640,34);ctx.stroke();ctx.strokeStyle='#8fd8cd';ctx.beginPath();fps.forEach((v,i)=>{const x=i*640/59,y=64-Math.min(120,v)/120*60;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
});
Object.defineProperty(window,'__CINDER__',{value:()=>({build:__BUILD_ID__,sha:__SOURCE_SHA__,state:room.transition&&state==='playing'?'transition':state,device:controls.device,mode:attempt?.mode,activeScenes:game.scene.getScenes(true).map(s=>s.scene.key),...(attempt&&room.attempt===attempt?room.snapshot():{}),audio:effects.state(),events:telemetry.events.map(e=>e.name),eventLog:structuredClone(telemetry.events),fps:[...fps],frames,longFrames,loadMs})});
setTimeout(()=>{if(state==='loading')failure('boot_timeout');},15000);
