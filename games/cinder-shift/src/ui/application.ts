import Phaser from 'phaser';
import {Controls,type Action} from '../input';
import {AudioService} from '../audio';
import {Telemetry,type EventName} from '../telemetry';
import {MissionAttempt,rooms,type Mode,type Result} from '../mission';
import {RoomScene,type RoomHooks} from '../room-scene';
import type {Player} from '../player';
import {Campaign,newCampaign,type AttemptResult,type MissionEntry} from '../session/campaign';
import {research,loadout,type NodeId} from '../session/research';
import {hasEvent,seedsForPlans} from '../session/events';
import {SaveService,type Settings,defaults} from '../session/save';
import {I18n,type Params} from '../i18n';
import {Panels,escape as e} from './components';
import{heroImage,stats,workshopBody,characterSlots}from'./workshop';
import assets from '../art/assets.generated.json' with {type:'json'};

type Screen='character'|'menu'|'research'|'briefing'|'pause'|'settings'|'result'|'event'|'confirm-purchase'|'confirm-event'|'confirm-new'|'resume-entry'|'error';
type State='loading'|'menu'|'research'|'briefing'|'playing'|'paused'|'event'|'dying'|'complete'|'dead'|'error';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
export class Application{
  readonly controls=new Controls();readonly effects=new AudioService();readonly i18n=new I18n();readonly saves:SaveService;readonly telemetry:Telemetry;readonly ui:Panels;
  game!:Phaser.Game;room!:RoomScene;campaign:Campaign|null=null;attempt:MissionAttempt|null=null;
  state:State='loading';screen:Screen='menu';settings:Settings=defaults(this.i18n.locale);
  private lastRendered:Screen|null=null;private focusHistory=new Map<Screen,string>();private assetsReady=false;private settingsReady=false;private busy=false;private selected:NodeId='W1';private choice:'repair'|'salvage'='salvage';
  private characterInspect=false;private settingsReturn:Screen='menu';private newShiftReturn:Screen='menu';private pauseReason='manual';private errorCode='';private previousDevice='';
  private sessionStarted=performance.now();private lastFrame=performance.now();private screenMs=0;private reading:Record<string,number>={};
  private lastSample=performance.now();private sampleFrames=0;private loadMs=0;private frames=0;private longFrames=0;private fps:number[]=[];
  constructor(readonly build:string,readonly sha:string){
    this.saves=new SaveService(build);this.telemetry=new Telemetry(build,sha);this.ui=new Panels($('overlay'),this.controls);
    $('overlay').style.setProperty('--menu-arch',`url("${new URL('./assets/m03/'+assets.backgrounds.B.file,location.href).href}")`);$('overlay').style.setProperty('--menu-far',`url("${new URL('./assets/m03/'+assets.backgrounds.far.file,location.href).href}")`);
    this.ui.onSound=id=>{this.effects.play(id);};this.ui.onDevice=()=>this.updateDevice();this.saves.onStatus=()=>{this.storageNotice();this.layout();};
    $('build-label').textContent=`v${build} / ${sha.slice(0,7)}`;
    $('pause').addEventListener('click',()=>this.pause('manual'));
    $('mute').addEventListener('click',()=>{this.effects.muted=!this.effects.muted;this.settings.muted=this.effects.muted;this.controls.clear();void this.persistSettings();this.updateDevice();this.focusGame();});
    $('settings-open').addEventListener('click',()=>this.openSettings());
    const gesture=(event:Event)=>{if(event.isTrusted&&!document.hidden){this.effects.foreground();void this.effects.unlock();}};document.addEventListener('pointerdown',gesture,true);document.addEventListener('keydown',gesture,true);
    window.addEventListener('blur',()=>{this.pause('blur');this.effects.background();void this.persist();});
    window.addEventListener('focus',()=>this.effects.foreground());
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.pause('hidden');this.effects.background();void this.persist();}else this.effects.foreground();});
    window.addEventListener('resize',()=>{if(this.portrait())this.pause('portrait');this.layout();if(['briefing','pause','resume-entry'].includes(this.screen)&&this.ui.visible)this.render();});
    window.addEventListener('error',event=>this.failure(event.message||'runtime_error'));
    window.addEventListener('unhandledrejection',()=>this.failure('unhandled_rejection'));
    Object.defineProperty(window,'__CINDER__',{value:()=>this.snapshot()});this.emit('game_boot');
    setTimeout(()=>{if(this.state==='loading')this.failure('boot_timeout');},15000);
  }
  readonly hooks:RoomHooks={controls:this.controls,effects:this.effects,emit:(name,params)=>this.emit(name,params),pause:()=>this.pause('manual'),result:result=>{void this.finish(result);},dying:()=>{this.state='dying';},objective:(key,params)=>this.objective(key,params),hud:(attempt,player,hold)=>this.hud(attempt,player,hold),container:()=>this.openEvent(),autoFire:()=>this.settings.autofire,debug:()=>this.settings.debugBodies,transition:active=>{$('transition').hidden=!active;}};
  attach(game:Phaser.Game,room:RoomScene){this.game=game;this.room=room;game.events.on(Phaser.Core.Events.POST_RENDER,()=>this.frame());game.events.on(Phaser.Core.Events.READY,()=>game.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.failure('webgl_context_lost');}));this.layout();}
  async initialize(){const loaded=await this.saves.load(this.i18n.locale);this.settings=loaded.settings;this.effects.configure(this.settings);this.i18n.setLocale(this.settings.locale);if(loaded.campaign)this.campaign=new Campaign(loaded.campaign);this.settingsReady=true;this.ready();}
  progress(value:number){const bar=$<HTMLProgressElement>('loading-progress');if(bar)bar.value=value;const label=$('loading-label');if(label)label.textContent=this.i18n.t('loading.assets',{percent:Math.round(value*100)});}
  artReady(){this.assetsReady=true;if(!this.settingsReady&&$('loading-label'))$('loading-label').textContent=this.t('loading.storage');this.ready();}
  private ready(){if(!this.assetsReady||!this.settingsReady||this.state==='error')return;this.loadMs=Math.round(performance.now());this.emit('game_ready',{load_ms:this.loadMs});this.showMenu(false);}
  private emit(name:EventName,params:Record<string,string|number>={}){try{this.telemetry.emit(name,{locale:this.i18n.locale,...(this.campaign?{campaign_id:this.campaign.data.campaign_id,campaign_seed:this.campaign.data.campaign_seed}:{}),...(this.attempt?{mission_id:this.attempt.missionId,room_id:this.attempt.current,attempt_id:this.attempt.id,active_duration:Math.round(this.attempt.activeMs)/1000}:{}),...params});}catch{/* Diagnostics never block play. */}}
  private async persist(replace=false){if(!this.campaign)return false;const success=await this.saves.saveCampaign(this.campaign.snapshot(),replace);this.emit('save_result',{kind:'campaign',success:Number(success),stage:this.campaign.data.stage});return success;}
  private async persistSettings(){const success=await this.saves.saveSettings(this.settings);this.emit('save_result',{kind:'settings',success:Number(success)});return success;}
  private get t(){return (key:string,params:Params={})=>this.i18n.t(key,params);}
  private buildName(nodes:readonly NodeId[]){return nodes.length?nodes.map(id=>this.t('research.'+id+'.name')).join(' + '):this.t('common.base');}
  private focusGame(){$('game').focus({preventScroll:true});}
  private portrait(){return matchMedia('(pointer:coarse)').matches&&innerHeight>innerWidth;}
  private stopAttempt(){if(this.attempt?.mode==='mission'&&this.attempt.finish('abandoned'))this.emit('mission_end',{result:'abandoned',reason:'menu'});this.game.scene.stop('Room');this.attempt=null;this.controls.setScope('menu');this.effects.pauseWorld();$('transition').hidden=true;}
  private show(screen:Screen){this.screen=screen;if(screen==='result')this.effects.pauseWorld();if(['menu','character','research','briefing'].includes(screen))this.effects.menu();this.render();}
  private showMenu(stop=true){if(stop)this.stopAttempt();if(this.campaign?.data.stage==='result'&&this.campaign.data.result?.result==='victory'){this.campaign.data.stage='preview_complete';void this.persist();}this.state='menu';this.game.scene.start('Backdrop');this.controls.setScope('menu');this.show('menu');}
  private async newShift(confirmed=false){
    if(this.busy)return;
    if(!confirmed&&(this.campaign||this.saves.issue)){this.newShiftReturn=this.screen;this.show('confirm-new');return;}
    this.characterInspect=false;this.show('character');
  }
  private async chooseMira(){
    if(this.busy)return;if(this.characterInspect){await this.showResearch();return;}
    this.stopAttempt();const forced=new URLSearchParams(location.search).get('seed'),seed=forced!==null&&/^\d+$/.test(forced)?Number(forced)>>>0:crypto.getRandomValues(new Uint32Array(1))[0];
    this.campaign=new Campaign(newCampaign(seed));this.sessionStarted=performance.now();this.screenMs=0;this.reading={};this.emit('campaign_start');this.state='research';this.busy=true;this.show('research');await this.persist(true);this.busy=false;this.render();
  }
  private async showResearch(){if(!this.campaign)return;this.stopAttempt();this.campaign.data.stage='research';this.state='research';this.game.scene.start('Backdrop');this.show('research');await this.persist();}
  private async prepare(){if(!this.campaign||this.busy)return;this.campaign.prepare();this.state='briefing';this.busy=true;this.show('briefing');await this.persist();this.busy=false;this.render();}
  private async buy(){if(!this.campaign||this.busy)return;const id=this.selected;if(!this.campaign.buy(id)){this.effects.play('ui_denied');this.show('research');return;}this.emit('research_purchase',{node_id:id,points:this.campaign.data.points});this.busy=true;this.show('research');await this.persist();this.busy=false;this.effects.play('module_purchase');this.render();this.ui.focus('briefing');}
  private continueShift(){
    if(!this.campaign||this.busy)return;this.emit('continue',{stage:this.campaign.data.stage});
    if(this.campaign.data.stage==='mission'){this.show('resume-entry');return;}
    if(this.campaign.data.stage==='briefing'){this.state='briefing';this.show('briefing');return;}
    if(this.campaign.data.stage==='result'||this.campaign.data.stage==='preview_complete'){this.state=this.campaign.data.result?.result==='death'?'dead':'complete';this.show('result');return;}
    this.state='research';this.show('research');
  }
  private async start(mode:Mode,retry=false){
    if(this.busy||this.portrait()||document.hidden)return;
    const entry=mode==='mission'?this.campaign?.data.entry:undefined;if(mode==='mission'&&!entry)return;
    const previous=this.attempt?.id||this.campaign?.data.result?.attempt_id;this.game.scene.stop('Room');this.game.scene.stop('Backdrop');this.attempt=new MissionAttempt(mode,entry||undefined);
    if(this.campaign&&mode==='mission'){this.campaign.data.stage='mission';this.busy=true;await this.persist();this.busy=false;}
    if(retry)this.emit('retry',{previous_attempt_id:previous||''});this.state='playing';this.ui.hide();this.controls.setScope('play');this.emit(mode==='mission'?'mission_start':'test_start');
    $('transition').hidden=true;this.effects.startWorld();this.game.scene.start('Room',{attempt:this.attempt});void this.effects.unlock();this.updateDevice();this.layout();this.focusGame();
    if(this.portrait()||document.hidden||!document.hasFocus())this.pause(this.portrait()?'portrait':'hidden');
  }
  private async finish(result:Result){
    const a=this.attempt;if(!a||!a.finish(result))return;this.game.scene.pause('Room');this.state=result==='victory'?'complete':'dead';this.controls.setScope('menu');this.effects.pauseWorld();this.effects.play(result==='victory'?'mission_win':'mission_death','result:'+a.id);
    this.emit(a.mode==='training'?'test_complete':'mission_end',{result,reason:result==='death'?a.reason:'objective_complete',score:a.score});
    if(a.mode==='mission'&&this.campaign){this.campaign.applyResult({attempt_id:a.id,mission_id:'airlock',result,reason:a.reason,hp:a.hp,max_hp:a.maxHp,score:a.score,active_ms:a.activeMs,screen_ms:this.screenMs,nodes:[...a.build.nodes]});this.busy=true;this.show('result');await this.persist();this.busy=false;}
    this.show('result');
  }
  private pause(reason:string){if(this.state!=='playing')return;this.pauseReason=reason;this.state='paused';this.game.scene.pause('Room');this.controls.setScope('pause');this.attempt?.clock.clear();this.effects.pauseWorld();this.emit('pause',{reason});this.show('pause');void this.persist();}
  private resume(){if(this.state!=='paused'||this.portrait()||document.hidden||!document.hasFocus())return;this.attempt?.clock.clear();this.controls.setScope('play');this.state='playing';this.game.scene.resume('Room');this.ui.hide();this.effects.foreground();this.effects.startWorld();void this.effects.unlock();this.focusGame();this.emit('resume');this.updateDevice();this.layout();}
  private openSettings(){if(this.state==='playing')this.pause('manual');this.settingsReturn=this.screen;this.show('settings');}
  private closeSettings(){this.show(this.settingsReturn);}
  private changeLocale(value:string){if(value!=='en'&&value!=='ru')return;const previous=this.i18n.locale;this.settings.locale=value;this.i18n.setLocale(value);this.emit('locale_changed',{previous_locale:previous});void this.persistSettings();this.render();this.updateDevice();}
  private openEvent(){if(this.state!=='playing'||!this.attempt)return;this.state='event';this.game.scene.pause('Room');this.controls.setScope('menu');this.attempt.clock.clear();this.effects.pauseWorld();this.emit('event_offered',{event_id:'E03'});this.show('event');}
  private leaveEvent(){this.room.closeContainer();if(!document.hidden&&document.hasFocus()&&!this.portrait()){this.state='paused';this.resume();}else{this.state='paused';this.pauseReason=this.portrait()?'portrait':'hidden';this.show('pause');}}
  private claim(){const claimed=this.attempt?.chooseContainer(this.choice);if(claimed)this.emit('event_choice',{event_id:'E03',choice:this.choice,hp:this.attempt!.hp,score:this.attempt!.score});this.leaveEvent();if(claimed)this.effects.play('cache_claim');}
  failure(code:string){if(this.state==='error')return;this.errorCode=code;this.state='error';this.game?.scene.pause('Room');this.controls.setScope('menu');this.effects.pauseWorld();this.emit('error',{code});this.show('error');}
  private wrap(title:string,body:string,actions:string,kicker?:string,extra=''){return `<section class="panel ${extra}"><header>${kicker?`<p class="tag">${e(kicker)}</p>`:''}<h2 id="screen-title">${e(title)}</h2></header><div class="panel-content">${body}</div><footer class="panel-actions">${actions}</footer></section>`;}
  private languageSelect(id:string){this.ui.change(id,value=>this.changeLocale(value));return `<label class="language-label">${e(this.t('settings.locale'))}<select id="${id}" data-focus="${id}" data-testid="${id}"><option value="en" ${this.i18n.locale==='en'?'selected':''}>English</option><option value="ru" ${this.i18n.locale==='ru'?'selected':''}>Русский</option></select></label>`;}
  private hints(){return `<p class="device-hints" data-control-hints>${e(this.t('settings.controls.'+this.controls.device))}</p>`;}
  private button(id:string,key:string,action:()=>void,primary=false,disabled=false){return this.ui.button(id,this.t(key),action,{kind:primary?'primary':'secondary',disabled:disabled||this.busy,sound:id.startsWith('cancel')||id.endsWith('-back')?'cancel':undefined});}
  private audioSettings(){
    for(const bus of ['music','sfx','ui'] as const)this.ui.change(bus+'-volume',value=>{this.settings[(bus+'Volume') as 'musicVolume']=Number(value);this.effects.configure(this.settings);void this.persistSettings();});
    const mixer='<fieldset class="audio-mixer"><legend>'+e(this.t('audio.title'))+'</legend>'+(['music','sfx','ui'] as const).map(bus=>'<label>'+e(this.t('audio.'+bus))+'<input id="'+bus+'-volume" data-focus="'+bus+'-volume" type="range" min="0" max="1" step="0.05" value="'+this.settings[(bus+'Volume') as 'musicVolume']+'"/></label>').join('')+'</fieldset>';
    return mixer+(this.effects.state()!=='running'&&!this.effects.muted?this.button('enable-audio','audio.enable',()=>{this.effects.foreground();void this.effects.unlock().then(()=>this.render());}):'')+(this.effects.snapshot().unavailable?'<p class="helper">'+e(this.t('audio.unavailable'))+'</p>':'');
  }
  private render(){
    if(this.state==='loading'||!this.game)return;const t=this.t,ui=this.ui,d=this.campaign?.data,a=this.attempt;
    this.controls.setScope(this.state==='paused'?'pause':'menu');
    const active=document.activeElement as HTMLElement,focus=active?.dataset.focus||active?.id;if(this.lastRendered&&focus)this.focusHistory.set(this.lastRendered,focus);
    const defaults:Partial<Record<Screen,string>>={character:'choose-mira',menu:d?'continue':'new-shift',research:'research-'+this.selected,briefing:'start-mission',pause:'resume',settings:'locale',event:'event-salvage',result:d?.result?.result==='victory'?'result-research':'retry','confirm-purchase':'confirm-buy','confirm-event':'confirm-event','confirm-new':'cancel-new','resume-entry':'restart-entry',error:'reload'};
    const nextFocus=this.lastRendered===this.screen?undefined:this.focusHistory.get(this.screen)||defaults[this.screen];this.lastRendered=this.screen;
    $('overlay').classList.toggle('workshop-overlay',this.screen==='research');
    ui.show(()=>{
      switch(this.screen){
        case'character':return this.wrap(t('character.title'),characterSlots(this.i18n),this.button('choose-mira','character.continue',()=>{void this.chooseMira();},true)+this.button('character-back','common.back',()=>{if(this.characterInspect)void this.showResearch();else this.showMenu();}),t('character.kicker'),'character-picker');
        case'menu':{
          const complete=d&&['result','preview_complete'].includes(d.stage),main=d?this.button('continue',complete?'menu.result':'menu.continue',()=>this.continueShift(),true):'';
          const status=this.saves.issue?t('errors.save.'+this.saves.issue):d?t('menu.saved',{stage:t('menu.stage.'+d.stage),points:d.points}):t('menu.noSave');
          return this.wrap('CINDER SHIFT 64','<div class="menu-layout"><div><p class="menu-context">'+e(t('menu.context'))+'</p><div class="save-card"><p>'+e(status)+'</p>'+(this.saves.savedAt&&d?'<small>'+e(t('common.saveTime',{time:this.i18n.date(this.saves.savedAt)}))+'</small>':'')+'</div>'+this.languageSelect('menu-locale')+'</div>'+heroImage(this.i18n,'menu-mira')+'</div>',main+this.button('new-shift','menu.new',()=>{void this.newShift();},!d)+this.button('training','menu.training',()=>{void this.start('training');})+this.button('menu-settings','common.settings',()=>this.openSettings()),t('menu.kicker'),'main-menu');
        }
        case'research':{
          if(!d)return'';const node=research.find(n=>n.id===this.selected)!,owned=d.nodes.includes(node.id),disabled=owned||d.points<node.cost;
          return this.wrap(t('research.title'),'<p class="workshop-points">'+e(t('common.points',{points:d.points}))+'</p>'+workshopBody(this.i18n,ui,d,this.selected,id=>{this.selected=id;if(!d.nodes.includes(id)&&d.points<research.find(n=>n.id===id)!.cost)this.effects.play('ui_denied');this.render();})+'<p class="selection-detail">'+e(t(disabled?(owned?'research.owned':'research.insufficient'):'research.cost',{cost:node.cost}))+'</p>',ui.button('purchase',t('research.buy',{node:node.id}),()=>this.show('confirm-purchase'),{kind:'secondary',disabled:disabled||this.busy})+this.button('briefing',d.completed_missions.length?'research.replay':'research.briefing',()=>{void this.prepare();},true)+this.button('research-menu','common.menu',()=>this.showMenu())+this.button('research-settings','common.settings',()=>this.openSettings())+this.button('character-select','character.choose',()=>{this.characterInspect=true;this.show('character');}),undefined,'workshop');
        }
        case'confirm-purchase':{
          if(!d)return'';const node=research.find(n=>n.id===this.selected)!;
          return this.wrap(t('research.confirmTitle'),'<p>'+e(t('research.confirmText',{node:t(node.nameKey)}))+'</p><p class="build-strip">'+e(t('workshop.confirmCost',{cost:node.cost,remaining:d.points-node.cost}))+'</p>'+stats(this.i18n,d.nodes,this.selected,true),ui.button('confirm-buy',t('common.confirm'),()=>{void this.buy();},{kind:'primary',disabled:this.busy,sound:'silent'})+this.button('cancel-buy','common.cancel',()=>this.show('research')));
        }
        case'briefing':{
          if(!d?.entry)return'';const entry=d.entry;return this.wrap(t('mission.goal'),`<p>${e(t('mission.route'))}</p><p class="build-strip">${e(t('research.build',{build:this.buildName(entry.build.nodes)}))}</p>${research.filter(n=>entry.build.nodes.includes(n.id)).map(n=>`<p class="helper">${e(t(n.nameKey))}: ${e(t(n.effectKey))}</p>`).join('')}${stats(this.i18n,entry.build.nodes)}<p class="condition" data-testid="event-condition">${e(t(hasEvent(entry.event_plan,'E02')?'mission.conditionClosed':'mission.conditionNone'))}</p>${hasEvent(entry.event_plan,'E03')?`<p class="helper">${e(t('mission.optionalCache'))}</p>`:''}<p class="helper">${e(t('mission.retryRule'))}</p>${this.hints()}${this.portrait()?`<p class="warning">${e(t('pause.portrait'))}</p>`:''}`,this.button('start-mission','mission.start',()=>{void this.start('mission');},true,this.portrait())+this.button('briefing-research','results.research',()=>{void this.showResearch();}),t('mission.briefing'));
        }
        case'pause':return this.wrap(t('pause.title'),`<p>${e(t('pause.'+this.pauseReason))}</p>${a?.mode==='mission'?`<p class="helper">${e(t('pause.save'))}</p>`:''}`,this.button('resume','common.continue',()=>this.resume(),true,this.portrait())+this.button('pause-settings','common.settings',()=>this.openSettings())+this.button('pause-menu','common.menu',()=>this.showMenu()));
        case'settings':{
          for(const id of ['touch-mode','touch-layout','autofire','sound-setting','debug-bodies'])ui.change(id,(value,checked)=>{if(id==='touch-mode')this.settings.touchMode=value as Settings['touchMode'];if(id==='touch-layout')this.settings.layout=value as Settings['layout'];if(id==='autofire')this.settings.autofire=checked;if(id==='sound-setting'){this.settings.muted=!checked;this.effects.muted=!checked;}if(id==='debug-bodies')this.settings.debugBodies=checked;this.controls.clear();void this.persistSettings();this.updateDevice();this.layout();});
          const issue=this.saves.issue,retryable=issue==='unavailable'||issue==='write_failed';return this.wrap(t('settings.title'),`<div class="settings-grid">${this.languageSelect('locale')}<label>${e(t('settings.sound'))}<input id="sound-setting" data-focus="sound-setting" type="checkbox" ${!this.settings.muted?'checked':''}/></label><label>${e(t('settings.touch'))}<select id="touch-mode" data-focus="touch-mode">${(['auto','on','off'] as const).map(v=>`<option value="${v}" ${this.settings.touchMode===v?'selected':''}>${e(t('settings.'+({auto:'auto',on:'show',off:'hide'}[v])))}</option>`).join('')}</select></label><label>${e(t('settings.layout'))}<select id="touch-layout" data-focus="touch-layout">${['dock','sides'].map(v=>`<option value="${v}" ${this.settings.layout===v?'selected':''}>${e(t('settings.'+v))}</option>`).join('')}</select></label><label>${e(t('settings.autofire'))}<input id="autofire" data-focus="autofire" type="checkbox" ${this.settings.autofire?'checked':''}/></label></div>${this.audioSettings()}<p class="helper">${e(t('settings.autofireHint'))}</p>${this.hints()}<p class="helper">${e(t('settings.navigation'))}</p>${issue?`<p class="warning">${e(t('errors.save.'+issue))}</p>`:''}<details class="technical"><summary>${e(t('settings.technical'))}</summary><label>${e(t('settings.debug'))}<input id="debug-bodies" data-focus="debug-bodies" type="checkbox" ${this.settings.debugBodies?'checked':''}/></label><p>${e(t('settings.seed',{seed:d?.campaign_seed??0}))}</p><p id="metrics"></p><canvas id="fps-chart" width="640" height="64" data-i18n-aria="accessibility.fps"></canvas><pre id="events">${e(this.telemetry.events.slice(-20).map(v=>v.name+' '+JSON.stringify(v.params)).join('\n'))}</pre><p>${e(t('settings.telemetry'))}</p></details>`,this.button('settings-back','common.back',()=>this.closeSettings(),true)+(retryable?this.button('retry-save','errors.save.retry',()=>{void this.saves.retry(this.campaign?.snapshot()||null,this.settings).then(()=>this.render());}):issue?this.button('settings-reset','menu.new',()=>{void this.newShift();}):''));
        }
        case'event':return this.wrap(t('events.title'),`<p>${e(t('events.context'))}</p><p class="build-strip">${e(t('common.hp',{hp:a?.hp??0,max:a?.maxHp??6}))} · ${e(t('common.score',{score:a?.score??0}))}</p><p class="helper">${e(t('events.once'))}</p>${a&&a.hp>=a.maxHp?`<p class="helper">${e(t('events.full'))}</p>`:''}`,this.button('event-repair','events.repair',()=>{this.choice='repair';this.show('confirm-event');},false,!a||a.hp>=a.maxHp)+this.button('event-salvage','events.salvage',()=>{this.choice='salvage';this.show('confirm-event');},true)+this.button('event-leave','events.leave',()=>this.leaveEvent())+this.button('event-settings','common.settings',()=>this.openSettings()));
        case'confirm-event':return this.wrap(t('events.confirm'),`<p>${e(t(this.choice==='repair'?'events.repair':'events.salvage'))}</p><p class="helper">${e(t('events.once'))}</p>`,this.button('confirm-event','common.confirm',()=>this.claim(),true)+this.button('cancel-event','common.cancel',()=>this.show('event')));
        case'confirm-new':return this.wrap(t(this.saves.issue==='corrupt'||this.saves.issue==='incompatible'||this.saves.issue==='unknown_nodes'?'errors.resetTitle':'menu.replaceTitle'),`<p>${e(t(!this.campaign&&(this.saves.issue==='unavailable'||this.saves.issue==='write_failed')?'errors.save.replaceUnknown':'menu.replaceText'))}</p>`,ui.button('confirm-new',t('common.confirm'),()=>{void this.newShift(true);},{kind:'danger'})+this.button('cancel-new','common.cancel',()=>this.show(this.newShiftReturn)));
        case'resume-entry':return this.wrap(t('menu.restartTitle'),`<p>${e(t('menu.restartText'))}</p>`,this.button('restart-entry','menu.restart',()=>{void this.start('mission',true);},true)+this.button('cancel-continue','common.cancel',()=>this.showMenu()));
        case'result':{
          const training=a?.mode==='training';const r:AttemptResult|null=training?{attempt_id:a.id,mission_id:'airlock',result:a.result==='victory'?'victory':'death',reason:a.reason,hp:a.hp,max_hp:a.maxHp,score:a.score,active_ms:a.activeMs,screen_ms:this.screenMs,nodes:[],reward_granted:false,applied:true}:d?.result||null;if(!r)return'';const win=r.result==='victory';
          return this.wrap(t(training?'results.training':win?'results.win':'results.death'),`<span class="result-icon ${win?'success':'failure'}" aria-hidden="true">${win?'✓':'!'}</span>${!win?`<p>${e(t('results.reason',{reason:t('results.reason.'+(r.reason||'unknown'))}))}</p>`:''}${!win?'<p class="helper">'+e(t('workshop.deathHint.'+(r.reason.includes('drone')?'drone':r.reason.includes('walker')?'walker':'unknown')))+'</p>':''}<div class="result-grid"><p>${e(t('common.time',{seconds:r.active_ms/1000}))}</p><p>${e(t('common.hp',{hp:r.hp,max:r.max_hp}))}</p><p>${e(t('research.build',{build:this.buildName(r.nodes)}))}</p></div><p class="helper salvage-note">${e(t('workshop.salvage',{score:r.score}))}</p><p class="reward">${e(t(training?'training.note':win?r.reward_granted?'results.reward':'results.noReward':'results.deathReward'))}</p>${win&&!training?`<p class="helper">${e(t('results.previewEnd'))}</p>`:''}`,(!training?this.button('result-research','results.research',()=>{void this.showResearch();},win):'')+this.button('retry',training?'results.again':'results.retry',()=>{void this.start(training?'training':'mission',true);},!win||Boolean(training))+this.button('result-menu','common.menu',()=>this.showMenu()),t(win?'results.complete':'results.interrupted'));
        }
        case'error':return this.wrap(t('errors.title'),`<p>${e(t(this.errorCode==='webgl_context_lost'?'errors.context':'errors.load'))}</p>`,this.button('reload','errors.retry',()=>location.reload(),true));
      }
    },()=>this.back(),nextFocus,this.screen);
    this.i18n.applyStatic();this.updateDevice();this.storageNotice();this.layout();
  }
  private back(){if(this.busy)return;if(this.screen==='character'){if(this.characterInspect)void this.showResearch();else this.showMenu();return;}if(this.screen==='settings')this.closeSettings();else if(this.screen==='confirm-purchase')this.show('research');else if(this.screen==='confirm-event')this.show('event');else if(this.screen==='event')this.leaveEvent();else if(this.screen==='pause')this.resume();else if(this.screen==='briefing')void this.showResearch();else if(this.screen==='confirm-new')this.show(this.newShiftReturn);else if(this.screen==='resume-entry')this.show('menu');else if(this.screen==='research'||this.screen==='result')this.showMenu();}
  private storageNotice(){const notice=$('storage-notice');notice.hidden=!this.saves.issue||this.screen==='menu'&&this.ui.visible;notice.textContent=this.saves.issue?this.t('errors.save.'+this.saves.issue):'';}
  private updateDevice(){
    const active=this.state==='playing'||this.state==='dying',touch=this.settings.touchMode==='on'||this.settings.touchMode==='auto'&&this.controls.device==='touch';
    $('touch-controls').hidden=!active||!touch;$('playframe').classList.toggle('touch-sides',active&&touch&&this.settings.layout==='sides');
    document.querySelectorAll<HTMLButtonElement>('#touch-controls button').forEach(button=>{button.disabled=this.state!=='playing';});
    document.querySelector<HTMLElement>('[data-action=ability]')!.hidden=!this.attempt||!(this.attempt.mode==='training'||this.attempt.build.dash);
    $('hud').hidden=!this.attempt||!['playing','dying','paused','event'].includes(this.state);$('mission-footer').hidden=!this.attempt||!['playing','dying','paused','event'].includes(this.state);
    $('pause').toggleAttribute('disabled',this.state!=='playing');$('settings-open').toggleAttribute('disabled',this.state!=='playing');$('mute').toggleAttribute('disabled',this.ui.visible);$('mute').textContent=this.t(this.effects.muted?'settings.muteOn':'settings.muteOff');$('mute').setAttribute('aria-pressed',String(this.effects.muted));
    $('device').textContent=this.t('hud.device.'+this.controls.device);document.querySelectorAll('[data-control-hints]').forEach(el=>el.textContent=this.t('settings.controls.'+this.controls.device));
    if(this.previousDevice!==this.controls.device){this.previousDevice=this.controls.device;this.layout();}
  }
  private objective(key:string,params:Params={}){const resolved={...params};if(resolved.action)resolved.action=this.t(this.controls.hintKey(resolved.action as Action));const value=this.t(key,resolved);if($('objective').textContent!==value)$('objective').textContent=value;}
  private hud(a:MissionAttempt,player:Player,hold:number){
    const segments=$('hp-segments');if(segments.children.length!==a.maxHp)segments.innerHTML='<i></i>'.repeat(a.maxHp);[...segments.children].forEach((el,i)=>el.classList.toggle('lost',i>=a.hp));const hp=`${a.hp}/${a.maxHp}`;if($('hp-value').textContent!==hp)$('hp-value').textContent=hp;
    $('hud-room').textContent=a.current==='T'?this.t('hud.training'):this.t('hud.room',{room:a.current});const hasImpulse=a.mode==='training'||a.build.dash;$('ability-status').hidden=!hasImpulse;
    if(hasImpulse){const remaining=Math.max(0,player.dashReady-a.clock.now);$('ability-time').textContent=remaining?this.t('hud.cooldown',{seconds:Math.ceil(remaining/100)/10}):this.t('hud.ready');$('ability-fill').style.width=`${100*(1-remaining/3000)}%`;}
    $('interaction-progress').hidden=hold<=0;if(hold>0)$('interaction-progress').textContent=this.t('hud.hold',{percent:Math.min(100,Math.floor(hold/6))});
  }
  private layout(){
    const shell=$('app'),consoleElement=document.querySelector<HTMLElement>('.console')!,frame=$('playframe'),viewport=$('viewport'),touch=$('touch-controls');
    const shellStyle=getComputedStyle(shell),availableWidth=shell.clientWidth-parseFloat(shellStyle.paddingLeft)-parseFloat(shellStyle.paddingRight)-2,toolbar=document.querySelector('.toolbar')!.getBoundingClientRect().height,footer=$('mission-footer').hidden?0:$('mission-footer').getBoundingClientRect().height,notice=$('storage-notice').hidden?0:$('storage-notice').getBoundingClientRect().height;
    const sides=frame.classList.contains('touch-sides'),dock=!touch.hidden&&!sides?touch.getBoundingClientRect().height:0;
    const availableHeight=Math.max(110,innerHeight-toolbar-footer-notice-16),width=Math.max(180,availableWidth-(sides?240:0)),height=Math.max(90,availableHeight-dock);
    let scale=Math.min(width/640,height/360);if(scale>=1)scale=Math.floor(scale);viewport.style.width=`${Math.floor(640*scale)}px`;viewport.style.height=`${Math.floor(360*scale)}px`;
    frame.style.minHeight=sides?`${Math.floor(360*scale)}px`:'';consoleElement.style.width=sides||!touch.hidden?`${availableWidth}px`:`${Math.floor(640*scale)+2}px`;shell.classList.toggle('in-mission',Boolean(this.attempt));
    this.game?.scale.refresh();
  }
  private frame(){
    const now=performance.now(),delta=Math.max(0,Math.min(250,now-this.lastFrame));this.lastFrame=now;
    this.ui.poll();if(this.ui.visible&&!document.hidden&&document.hasFocus()){this.screenMs+=delta;this.reading[this.screen]=(this.reading[this.screen]||0)+delta;}
    this.updateDevice();this.sampleFrames++;if(this.state==='playing'){this.frames++;if(this.game.loop.delta>50)this.longFrames++;}
    const elapsed=now-this.lastSample;if(elapsed<1000)return;this.lastSample=now;const fps=Math.round(this.sampleFrames*1000/elapsed);this.sampleFrames=0;if(this.state==='playing'){this.fps.push(fps);if(this.fps.length>180)this.fps.shift();}
    const metrics=$('metrics');if(metrics)metrics.textContent=`${fps} FPS · ${this.loadMs} ms · ${this.longFrames}/${this.frames} · ${this.state} · ${this.effects.state()}`;
    const chart=$<HTMLCanvasElement>('fps-chart');if(chart){const ctx=chart.getContext('2d')!;ctx.clearRect(0,0,640,64);ctx.strokeStyle='#76DCC8';ctx.beginPath();this.fps.slice(-60).forEach((v,i)=>{const x=i*640/59,y=64-Math.min(120,v)/2;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
  }
  snapshot(){return {build:this.build,sha:this.sha,state:this.room?.transition&&this.state==='playing'?'transition':this.state,screen:this.ui.visible?this.screen:null,device:this.controls.device,locale:this.i18n.locale,mode:this.attempt?.mode,activeScenes:this.game?.scene.getScenes(true).map(s=>s.scene.key)||[],...(this.attempt&&this.room?.attempt===this.attempt?this.room.snapshot():{}),campaign:this.campaign?.snapshot()||null,save:{available:this.saves.available,issue:this.saves.issue,diagnostic:this.saves.lastError,savedAt:this.saves.savedAt},settings:structuredClone(this.settings),audio:this.effects.state(),audioStatus:this.effects.snapshot(),events:this.telemetry.events.map(e=>e.name),eventLog:structuredClone(this.telemetry.events),fps:[...this.fps],frames:this.frames,longFrames:this.longFrames,loadMs:this.loadMs,screenMs:this.screenMs,screenTimes:{...this.reading},sessionWallMs:performance.now()-this.sessionStarted,eventTestSeeds:seedsForPlans()};}
}
