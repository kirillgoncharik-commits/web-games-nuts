import Phaser from 'phaser';
import config from '../game.config.json' with {type:'json'};
import {Application} from './ui/application';
import {RoomScene} from './room-scene';
import {preloadArt} from './render';
import './style.css';
declare const __BUILD_ID__:string;
declare const __SOURCE_SHA__:string;
const app=new Application(__BUILD_ID__,__SOURCE_SHA__);
const room=new RoomScene(app.hooks);
class Backdrop extends Phaser.Scene{
  constructor(){super('Backdrop');}
  create(){this.add.image(0,40,'m03-bg-far').setOrigin(0).setTint(0xb8bccb);this.add.image(0,40,'m03-bg-B').setOrigin(0).setTint(0xbac6c9);}
}
class Boot extends Phaser.Scene{
  constructor(){super('Boot');}
  preload(){this.load.on('progress',(value:number)=>app.progress(value));this.load.on('loaderror',()=>app.failure('art_load_error'));preloadArt(this);}
  create(){
    if(app.state==='error')return;
    if(['mira','enemies','props','environment','bg-far','bg-A','bg-B','bg-C'].some(name=>!this.textures.exists('m03-'+name))){app.failure('art_process_error');return;}
    const g=this.make.graphics({x:0,y:0});g.fillStyle(0xffffff).fillRect(0,0,22,44).generateTexture('body',22,44);g.destroy();this.scene.stop();app.artReady();
  }
}
const fps=new URLSearchParams(location.search).get('fps')==='30'?30:60;
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:640,height:360,backgroundColor:'#111823',pixelArt:true,antialias:false,banner:false,
  audio:{noAudio:true},
  loader:{imageLoadType:'HTMLImageElement'},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},input:{keyboard:false},fps:{target:fps,limit:fps===30?30:0,smoothStep:false},
  physics:{default:'arcade',arcade:{gravity:{x:0,y:config.initial_balance.gravity},customUpdate:true,fixedStep:false}},scene:[Boot,Backdrop,room]});
app.attach(game,room);void app.initialize();
