import Phaser from 'phaser';
import config from '../game.config.json';
import { Controls } from './input';
import { Effects } from './audio';
import { Telemetry } from './telemetry';
import './style.css';

declare const __BUILD_ID__: string;
declare const __SOURCE_SHA__: string;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;
const controls = new Controls();
const effects = new Effects();
const telemetry = new Telemetry(__BUILD_ID__, __SOURCE_SHA__);
const overlay = $('overlay');
let game: Phaser.Game;
let state: 'loading' | 'menu' | 'playing' | 'paused' | 'complete' | 'error' = 'loading';
let room: TestRoom;
let pauseReason = '';
let touchMode = 'auto', layout = 'dock';
let fps: number[] = [];
let lastSample = 0, startedAt = 0, loadMs = 0;
const portrait = () => matchMedia('(pointer:coarse)').matches && innerHeight > innerWidth;

function panel(html: string, action: () => void, second?: () => void) {
  overlay.hidden = false; overlay.innerHTML = `<div class="panel">${html}</div>`;
  overlay.querySelector('[data-primary]')?.addEventListener('click', action);
  overlay.querySelector('[data-secondary]')?.addEventListener('click', second || (() => {}));
}
function focusGame() { $('game').focus({ preventScroll: true }); }
function syncTouch() {
  const show = touchMode === 'on' || (touchMode === 'auto' && controls.device === 'touch');
  $('touch-controls').hidden = !show;
  $('playframe').classList.toggle('touch-sides', show && layout === 'sides');
}
function updateHints() {
  const names = { keyboard: 'КЛАВИАТУРА', gamepad: 'ГЕЙМПАД', touch: 'СЕНСОР' };
  $('device').textContent = names[controls.device]; syncTouch();
  if (controls.device === 'gamepad') $('hints').textContent = 'Стик / крестовина — движение · A — прыжок · ↓ — присесть · RT — огонь · X — терминал · B — импульс · Menu — пауза';
  else if (controls.device === 'touch') $('hints').textContent = 'Слева — движение и приседание. Справа — прыжок, огонь, импульс и терминал. Автоогонь включается только при цели перед вами.';
  else $('hints').innerHTML = '<kbd>A</kbd><kbd>D</kbd> движение <kbd>Space</kbd> прыжок <kbd>S</kbd> присесть <kbd>J</kbd> огонь <kbd>E</kbd> терминал <kbd>K</kbd> импульс';
}
function menu() {
  if (game.scene.isActive('Pause')) game.scene.stop('Pause');
  if (game.scene.getScene('Room')) game.scene.stop('Room');
  state = 'menu'; controls.setScope('menu'); effects.pause(); $('pause').setAttribute('disabled','');
  $('objective').textContent = 'Проверка систем костюма перед сменой';
  panel('<p class="tag">ПРОТОКОЛ ДОПУСКА / 00</p><h2>Костюм готов.<br>Проверим управление.</h2><p>Преодолейте уступ и низкий проход. Сбейте мишень, включите терминал и откройте шлюз.</p><button class="primary" data-primary>Начать проверку →</button><p class="steps">ОДИН ОТСЕК · БЕЗ ВРАГОВ · БЕЗ СОХРАНЕНИЯ</p>', start);
  updateHints(); syncOrientation();
}
function start() {
  if (portrait()) return;
  void effects.unlock(); overlay.hidden = true; controls.setScope('play');
  state = 'playing'; $('pause').removeAttribute('disabled'); focusGame();
  game.scene.stop('Menu'); game.scene.start('Room'); telemetry.emit('test_start');
}
function pause(reason = 'manual') {
  if (state !== 'playing') return;
  state = 'paused'; pauseReason = reason; controls.setScope('pause'); effects.pause();
  game.scene.pause('Room'); game.scene.start('Pause'); telemetry.emit('pause', { reason });
}
function resume() {
  if (state !== 'paused' || portrait() || document.hidden) return;
  void effects.unlock(); game.scene.stop('Pause'); overlay.hidden = true;
  controls.setScope('play'); state = 'playing'; game.scene.resume('Room'); focusGame(); telemetry.emit('resume');
}
function syncOrientation() {
  $('rotate').hidden = !portrait(); if (portrait()) pause('portrait');
}
function complete(seconds: number) {
  state = 'complete'; game.scene.pause('Room'); controls.setScope('menu'); effects.tone(660, .2); $('pause').setAttribute('disabled','');
  telemetry.emit('test_complete', { active_seconds: Math.round(seconds) });
  panel(`<p class="tag">ПРОТОКОЛ ДОПУСКА / ЗАВЕРШЁН</p><h2>Системы в норме.</h2><p>Мишень сбита. Питание шлюза восстановлено.<br>Время в отсеке: ${Math.round(seconds)} с.</p><button class="primary" data-primary>Проверить ещё раз</button><button class="secondary" data-secondary>В меню</button><p class="steps">ПЕРВАЯ МИССИЯ — СЛЕДУЮЩИЙ ЭТАП</p>`, () => { game.scene.stop('Room'); start(); }, menu);
}
function failure(message: string) {
  if (state === 'error') return;
  state = 'error'; controls.setScope('menu'); effects.pause();
  game?.scene.pause('Room'); telemetry.emit('error', { code: message });
  panel('<p class="tag">СБОЙ ЗАПУСКА</p><h2>Не удалось запустить полигон</h2><p>Обновите страницу, чтобы повторить загрузку. Подробности доступны в локальной диагностике.</p><button class="primary" data-primary>Повторить загрузку</button>', () => location.reload());
}

class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    // All prototype visuals are drawn locally, without remote assets or fonts.
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff).fillRect(0,0,22,44).generateTexture('body',22,44);
    g.clear().fillStyle(0xb5f3d5).fillRect(0,0,8,3).generateTexture('shot',8,3);
    g.clear().fillStyle(0xeee1b4).fillRect(0,0,20,36).generateTexture('target',20,36); g.destroy();
    loadMs = Math.round(performance.now() - startedAt); telemetry.emit('game_ready', { load_ms: loadMs });
    this.scene.start('Menu');
  }
}
class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() { this.cameras.main.setBackgroundColor('#14232b'); menu(); }
}
class Pause extends Phaser.Scene {
  constructor() { super('Pause'); }
  create() {
    const text = pauseReason === 'blur' || pauseReason === 'hidden' ? 'Вы покинули окно. Мир остановлен.' : pauseReason === 'portrait' ? 'Смена ориентации остановила проверку.' : 'Мир остановлен. Можно перевести дух.';
    panel(`<p class="tag">КОСТЮМ В ОЖИДАНИИ</p><h2>Пауза</h2><p>${text}<br>Продолжение — только по вашей команде.</p><button class="primary" data-primary>Продолжить</button><button class="secondary" data-secondary>В меню</button>`, resume, menu);
  }
  update() { const frame = controls.poll(); if (frame.pressed.has('pause')) resume(); updateHints(); }
}

type Solid = { x: number; y: number; width: number; height: number };
class TestRoom extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  target!: Phaser.Physics.Arcade.Image;
  bullets!: Phaser.Physics.Arcade.Group;
  art!: Phaser.GameObjects.Graphics;
  hud!: Phaser.GameObjects.Text;
  targetLabel!: Phaser.GameObjects.Text;
  terminalLabel!: Phaser.GameObjects.Text;
  solids: Solid[] = [{x:0,y:320,width:640,height:40},{x:176,y:272,width:80,height:48},{x:324,y:252,width:96,height:36}];
  facing = 1;
  crouching = false;
  hp = 3;
  powered = false;
  activeSeconds = 0;
  lastGrounded = -1000;
  jumpQueued = -1000;
  jumpConsumed = false;
  nextShot = 0;
  dashUntil = 0;
  dashReady = 0;
  clock = 0;
  lastFeet = 320;
  constructor() { super('Room'); }
  create() {
    room = this;
    this.facing=1; this.crouching=false; this.hp=3; this.powered=false; this.activeSeconds=0; this.clock=0; this.lastGrounded=-1000; this.jumpQueued=-1000; this.jumpConsumed=false; this.nextShot=0; this.dashUntil=0; this.dashReady=0; this.lastFeet=320;
    this.cameras.main.setBackgroundColor('#14232b'); this.drawRoom();
    this.physics.world.setBounds(0,40,640,280);
    const platforms = this.physics.add.staticGroup();
    this.solids.forEach(s => { const r = this.add.rectangle(s.x+s.width/2,s.y+s.height/2,s.width,s.height,0xffffff,0); this.physics.add.existing(r,true); platforms.add(r); });
    this.player = this.physics.add.sprite(64,298,'body').setVisible(false).setCollideWorldBounds(true);
    this.player.body!.setSize(config.movement.body_width,config.movement.standing_height);
    this.physics.add.collider(this.player,platforms);
    this.target = this.physics.add.staticImage(484,292,'target');
    this.bullets = this.physics.add.group({ allowGravity:false, maxSize:24 });
    this.physics.add.collider(this.bullets,platforms, bullet => bullet.destroy());
    this.physics.add.overlap(this.target,this.bullets, (_target,bullet) => { bullet.destroy(); this.hp--; effects.tone(180,.09); if (this.hp <= 0) this.target.disableBody(true,true); });
    this.art = this.add.graphics().setDepth(4);
    this.hud = this.add.text(16,12,'', { fontFamily:'monospace',fontSize:'10px',color:'#e2e7d5' }).setDepth(10);
    this.targetLabel = this.add.text(484,250,'МИШЕНЬ 3/3', {fontFamily:'monospace',fontSize:'7px',color:'#dbc49d'}).setOrigin(.5);
    this.terminalLabel = this.add.text(551,237,'ПИТАНИЕ\nОТКЛЮЧЕНО',{fontFamily:'monospace',fontSize:'6px',color:'#a1c6bd',align:'center'}).setOrigin(.5);
    controls.setScope('play'); focusGame();
  }
  drawRoom() {
    const g = this.add.graphics();
    g.fillStyle(0x0e191f).fillRect(0,0,640,40);
    g.fillStyle(0x23353b).fillRect(0,40,640,3);
    // The background stays below the contrast of the collision geometry.
    for (let x=24;x<640;x+=88) {g.fillStyle(0x1a2d34).fillRect(x,70,64,126);g.lineStyle(1,0x263a3f).strokeRect(x,70,64,126);g.fillStyle(0x21373d).fillRect(x+10,80,44,4);}
    g.lineStyle(3,0x294047).lineBetween(0,216,640,216);
    g.lineStyle(1,0x365058).lineBetween(0,220,640,220);
    g.fillStyle(0x1d3036).fillRect(12,236,100,84);
    for(let i=0;i<3;i++)g.fillStyle(0x355059).fillRect(25,248+i*17,70,4);
    this.solids.forEach(s => {g.fillStyle(0x35484a).fillRect(s.x,s.y,s.width,s.height);g.fillStyle(0x72857b).fillRect(s.x,s.y,s.width,3);g.fillStyle(0x273a3e).fillRect(s.x,s.y+7,s.width,s.height-7);});
    for(let x=0;x<640;x+=32){g.fillStyle(0x475c57).fillRect(x+2,331,27,2);g.fillStyle(0x1a2b30).fillRect(x+29,323,2,37);}
    for(let x=328;x<418;x+=16){g.fillStyle(0xc49a4f).fillRect(x,278,8,4);}
    g.fillStyle(0x314a4e).fillRect(539,263,24,57);g.fillStyle(0x80baaf).fillRect(543,269,16,12);g.fillStyle(0x15292d).fillRect(546,272,10,6);
    g.fillStyle(0x31494c).fillRect(580,236,45,84);g.fillStyle(0x20343c).fillRect(585,242,35,78);g.fillStyle(0x61756a).fillRect(600,245,3,75);
    const label=(x:number,y:number,text:string,color='#819a99')=>this.add.text(x,y,text,{fontFamily:'monospace',fontSize:'7px',color});
    label(24,53,'CALDERA 7 / SERVICE ACCESS', '#59777b');label(26,310,'01 →');label(178,257,'02 / SPACE','#d8bc7c');label(330,239,'03 / S ↓','#d8bc7c');label(463,231,'04 / J','#d8bc7c');label(584,221,'ВЫХОД','#96c6ae');
    label(277,94,'ТЕХНИЧЕСКИЙ ОТСЕК', '#47676d');label(277,107,'RESTRICTED / 00', '#47676d');
  }
  update(_time: number, delta: number) {
    if(state !== 'playing')return;
    const dt = Math.min(delta,50); this.clock+=dt; this.activeSeconds+=dt/1000;
    const frame=controls.poll(); updateHints();
    if(frame.pressed.has('pause')){pause();return;}
    const b=this.player.body as Phaser.Physics.Arcade.Body;
    const grounded=b.blocked.down || b.touching.down;
    if(grounded){this.lastGrounded=this.clock; this.jumpConsumed=false;}
    if(frame.pressed.has('jump'))this.jumpQueued=this.clock;
    const feet=this.player.y+22;
    const headBlocked=this.solids.some(s=>s.y<feet && s.y+s.height>feet-config.movement.standing_height && s.x<this.player.x+11 && s.x+s.width>this.player.x-11);
    this.crouching=frame.down.has('crouch') || headBlocked;
    const height=this.crouching ? config.movement.crouching_height : config.movement.standing_height;
    if(b.height!==height){b.setSize(22,height,false); b.setOffset(0,44-height); b.updateFromGameObject();}
    const direction=Number(frame.down.has('right'))-Number(frame.down.has('left'));
    if(direction)this.facing=direction;
    const speed=this.crouching?config.movement.crouch_speed:config.initial_balance.walk_speed;
    if(frame.pressed.has('ability') && grounded && this.clock>=this.dashReady){this.dashUntil=this.clock+config.movement.dash_ms;this.dashReady=this.clock+config.movement.dash_cooldown_ms;effects.tone(110,.14);}
    if(this.clock<this.dashUntil)b.setVelocityX(this.facing*config.movement.dash_speed);
    else b.setVelocityX(Phaser.Math.Linear(b.velocity.x,direction*speed,Math.min(1,(direction?config.movement.acceleration:config.movement.deceleration)*dt/1000/Math.max(1,Math.abs(direction*speed-b.velocity.x)))));
    if(this.clock-this.jumpQueued<=config.movement.jump_buffer_ms && this.clock-this.lastGrounded<=config.movement.coyote_ms && !this.jumpConsumed && !this.crouching){b.setVelocityY(config.initial_balance.jump_velocity);this.jumpQueued=-1000;this.lastGrounded=-1000;this.jumpConsumed=true;effects.tone(140,.12);}
    if(frame.released.has('jump') && b.velocity.y < -110)b.setVelocityY(-110);
    if(!grounded)this.lastFeet=feet;
    else if(this.lastFeet<feet-5){effects.tone(60,.08,.025);this.lastFeet=feet;}
    const targetAhead=this.hp>0 && (484-this.player.x)*this.facing>0 && Math.abs((feet-(this.crouching?15:28))-292)<19 && !this.solids.some(s=>s.y<feet-15 && s.y+s.height>feet-28 && s.x>Math.min(this.player.x,484) && s.x<Math.max(this.player.x,484));
    const auto=controls.device==='touch' && $('autofire') instanceof HTMLInputElement && ($('autofire') as HTMLInputElement).checked && targetAhead;
    if((frame.down.has('fire') || auto) && this.clock>=this.nextShot){this.shoot(feet);this.nextShot=this.clock+1000/config.initial_balance.shots_per_second;}
    this.bullets.getChildren().forEach(bullet=>{const image=bullet as Phaser.Physics.Arcade.Image;if(image.x<0 || image.x>640)image.destroy();});
    if(frame.pressed.has('interact') && Math.abs(this.player.x-551)<36){
      if(this.hp<=0){this.powered=true;effects.tone(440,.16);}else{effects.tone(80,.12);$('objective').textContent='Сначала сбейте мишень: огонь J / X';}
    }
    if(this.powered && this.player.x>596){complete(this.activeSeconds);return;}
    this.drawPlayer(feet);
    const cooldown=Math.max(0,(this.dashReady-this.clock)/1000);
    this.hud.setText(`▰▰▰▰▰▰   КОСТЮМ 06 / 06      ПОЛИГОН 00          ИМПУЛЬС ${cooldown>0?cooldown.toFixed(1)+'с':'ГОТОВ'}`);
    this.targetLabel.setText(this.hp>0?`МИШЕНЬ ${this.hp}/3`:'МИШЕНЬ СБИТА');
    this.terminalLabel.setText(this.powered?'ШЛЮЗ\nОТКРЫТ':this.hp<=0?'ТЕРМИНАЛ\n[E] ПИТАНИЕ':'ПИТАНИЕ\nОТКЛЮЧЕНО');
    if(this.clock>500)$('objective').textContent=this.powered?'Шлюз открыт. Выход справа →':this.hp<=0?'Включите терминал у шлюза · E':this.player.x<150?'Пройдите полигон: уступ → проход → мишень':this.player.x<280?'Прыжок Space · удержание меняет высоту':this.player.x<440?'Низкий проход: удерживайте S / ↓':'Сбейте мишень · J / X';
  }
  shoot(feet: number) {
    const bullet=this.bullets.create(this.player.x+this.facing*19,feet-(this.crouching?15:28),'shot') as Phaser.Physics.Arcade.Image | null;
    if(bullet){(bullet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);bullet.setVelocityX(this.facing*config.initial_balance.projectile_speed);effects.tone(380,.055,.025);}
  }
  drawPlayer(feet: number) {
    const g=this.art;g.clear();const x=Math.round(this.player.x),y=Math.round(feet),h=this.crouching?26:44;
    const step=Math.sin(this.clock/75)*3*(Math.abs(this.player.body!.velocity.x)>5?1:0);
    if(this.clock<this.dashUntil){g.fillStyle(0x73d9d3,.2).fillRect(x-this.facing*30-10,y-h+4,30,h-4);}
    g.fillStyle(0x09191e,.6).fillEllipse(x,y+1,30,5);
    g.fillStyle(0x537677).fillRect(x-11,y-h+12,22,h-20);
    g.fillStyle(0xd2bb83).fillRect(x-12,y-h+9,24,9);
    g.fillStyle(0x2a4a52).fillRect(x-10,y-h,20,14);
    g.fillStyle(0x9ae9d7).fillRect(x+(this.facing>0?-1:-10),y-h+4,11,5);
    g.fillStyle(0x7b9588).fillRect(x-9,y-12+Math.round(step),7,12-Math.round(step)).fillRect(x+3,y-12-Math.round(step),7,12+Math.round(step));
    g.fillStyle(0xbaa67c).fillRect(x-11,y-4+Math.round(step),10,4).fillRect(x+2,y-4-Math.round(step),11,4);
    g.fillStyle(0x1b333b).fillRect(x+this.facing*10-5,y-(this.crouching?19:32),18,8);
    g.fillStyle(0xa2c6b5).fillRect(x+this.facing*20-3,y-(this.crouching?17:30),6,4);
    if(this.powered){g.fillStyle(0x96e4c3).fillRect(586,244,3,74).fillRect(617,244,3,74);}
  }
}

$('build-label').textContent=`v${__BUILD_ID__} / ${__SOURCE_SHA__.slice(0,7)}`;
$('pause').addEventListener('click',()=>{if(state==='paused')resume();else pause();});
$('mute').addEventListener('click',()=>{effects.muted=!effects.muted;$('mute').textContent=`Звук: ${effects.muted?'выкл':'вкл'}`;$('mute').setAttribute('aria-pressed',String(effects.muted));});
$('diagnostics-toggle').addEventListener('click',()=>{$('diagnostics').hidden=!$('diagnostics').hidden;$('diagnostics-toggle').setAttribute('aria-expanded',String(!$('diagnostics').hidden));});
$('touch-mode').addEventListener('change',e=>{touchMode=(e.target as HTMLSelectElement).value;syncTouch();});
$('touch-layout').addEventListener('change',e=>{layout=(e.target as HTMLSelectElement).value;controls.clear();syncTouch();});
window.addEventListener('blur',()=>pause('blur'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('hidden');});
window.addEventListener('resize',syncOrientation);
window.addEventListener('error',e=>failure(e.message || 'runtime_error'));
window.addEventListener('unhandledrejection',()=>failure('unhandled_rejection'));
startedAt=performance.now();telemetry.emit('game_boot');
game=new Phaser.Game({
  type:Phaser.AUTO,parent:'game',width:config.viewport.width,height:config.viewport.height,
  backgroundColor:'#14232b',pixelArt:true,antialias:false,banner:false,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  input:{keyboard:false},
  physics:{default:'arcade',arcade:{gravity:{x:0,y:config.initial_balance.gravity},fps:60,fixedStep:true}},
  scene:[Boot,Menu,TestRoom,Pause],
});
game.events.on(Phaser.Core.Events.POST_RENDER,()=>{
  if(state==='menu' || state==='complete'){
    const frame=controls.poll();updateHints();
    if(frame.pressed.has('jump') && controls.device==='gamepad' && document.hasFocus()){game.scene.stop('Room');start();}
  }
  if(performance.now()-lastSample<1000)return;
  lastSample=performance.now();const value=Math.round(game.loop.actualFps);
  if(state==='playing'){fps.push(value);if(fps.length>60)fps.shift();}
  $('metrics').textContent=`${value} FPS · загрузка ${loadMs} мс · ${state} · ${effects.state()}`;
  const chart=$<HTMLCanvasElement>('fps-chart'), ctx=chart.getContext('2d')!;
  ctx.clearRect(0,0,640,64);ctx.strokeStyle='#405951';ctx.beginPath();ctx.moveTo(0,34);ctx.lineTo(640,34);ctx.stroke();
  ctx.strokeStyle='#8fd8cd';ctx.beginPath();fps.forEach((v,i)=>{const x=i*640/59,y=64-Math.min(120,v)/120*60;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
});
// Read-only inspection surface for smoke tests and measured playtests.
Object.defineProperty(window,'__CINDER__',{value:()=>({build:__BUILD_ID__,sha:__SOURCE_SHA__,state,device:controls.device,activeScenes:game.scene.getScenes(true).map(s=>s.scene.key),player:room?.player?.body?{x:room.player.x,y:room.player.y,vx:room.player.body.velocity.x,vy:room.player.body.velocity.y,crouching:room.crouching}:null,targetHp:room?.hp,powered:room?.powered,activeSeconds:room?.activeSeconds,audio:effects.state(),events:telemetry.events.map(e=>e.name),fps:[...fps],loadMs})});
setTimeout(()=>{if(state==='loading')failure('boot_timeout');},15000);
