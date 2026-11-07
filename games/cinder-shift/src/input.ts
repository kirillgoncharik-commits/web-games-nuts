export type Action = 'left' | 'right' | 'jump' | 'crouch' | 'fire' | 'interact' | 'ability' | 'pause';
export type Frame = { down: Set<Action>; pressed: Set<Action>; released: Set<Action> };
export const actions:readonly Action[]=['left','right','jump','crouch','fire','interact','ability','pause'];
const defaultKeys:Record<string,Action>={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'jump',KeyS:'crouch',ArrowDown:'crouch',KeyJ:'fire',KeyX:'fire',KeyE:'interact',KeyK:'ability',KeyC:'ability',Escape:'pause'};
const primaryKeys:Record<Action,string>={left:'KeyA',right:'KeyD',jump:'Space',crouch:'KeyS',fire:'KeyJ',interact:'KeyE',ability:'KeyK',pause:'Escape'};
export function keyLabel(code:string){return code==='Space'?'Space':code==='Escape'?'Esc':code.startsWith('Arrow')?({'ArrowLeft':'←','ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓'} as Record<string,string>)[code]||code:code.startsWith('Key')?code.slice(3):code.startsWith('Digit')?code.slice(5):code;}
export function bindingAllowed(action:Action,code:string){const current=defaultKeys[code];return !current||current===action;}
export class Controls {
  device: 'keyboard' | 'touch' | 'gamepad' = matchMedia('(pointer:coarse)').matches ? 'touch' : 'keyboard';
  scope: 'menu' | 'play' | 'pause' = 'menu';
  private keyboard = new Set<string>();
  private touch = new Map<number, Action>();
  private previous = new Set<Action>();
  private queuedPress = new Set<Action>();
  private queuedRelease = new Set<Action>();
  private padState = '';private blockedKeys=new Set<string>();private physicalKeys=new Set<string>();private blockedPad=new Set<Action>();private keyMap:Record<string,Action>={...defaultKeys};private keyOverrides:Partial<Record<Action,string>>={};private rebind:((action:Action,code:string|null)=>void)|null=null;private rebindAction:Action|null=null;
  constructor() {
    window.addEventListener('keydown', e => {
      if(this.keyMap[e.code])this.physicalKeys.add(e.code);
      if(this.rebindAction){e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;const action=this.rebindAction,callback=this.rebind;this.rebindAction=null;this.rebind=null;const code=e.code==='Escape'?null:/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space)$/.test(e.code)?e.code:null;callback?.(action,code);return;}
      if(this.blockedKeys.has(e.code)&&e.repeat)return;if(!e.repeat)this.blockedKeys.delete(e.code);
      const target=e.target instanceof HTMLElement?e.target:null;
      // Editable controls own their keys; ordinary page buttons retain Tab/Enter/Space.
      if (!this.keyMap[e.code] || this.scope === 'menu' || target?.closest('input,select,textarea,[contenteditable=true]') || ((e.code==='Space') && target?.closest('button,summary,a'))) return;
      e.preventDefault(); if (!e.repeat) this.queuedPress.add(this.keyMap[e.code]); this.keyboard.add(e.code); this.device = 'keyboard';
    });
    window.addEventListener('keyup', e => { this.physicalKeys.delete(e.code);this.blockedKeys.delete(e.code);if(this.keyboard.delete(e.code)) {const action=this.keyMap[e.code];if(action)this.queuedRelease.add(action);} });
    window.addEventListener('gamepaddisconnected',()=>this.clear());
    document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => {
      button.addEventListener('pointerdown', e => {
        if (this.scope !== 'play') return;
        e.preventDefault(); button.setPointerCapture(e.pointerId);
        const action=button.dataset.action as Action; this.touch.set(e.pointerId, action); this.queuedPress.add(action); button.classList.add('held'); this.device = 'touch';
      });
      const release = (e: PointerEvent) => { this.touch.delete(e.pointerId); button.classList.remove('held'); };
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
      button.addEventListener('contextmenu', e => e.preventDefault());
    });
  }
  get isRebinding(){return this.rebindAction!==null;}
  setBindings(bindings:Partial<Record<Action,string>>){this.keyOverrides={...bindings};this.keyMap={...defaultKeys};for(const[action,code]of Object.entries(this.keyOverrides) as [Action,string][]){for(const[key,value]of Object.entries(this.keyMap))if(value===action)delete this.keyMap[key];this.keyMap[code]=action;}this.clear();}
  binding(action:Action){return this.keyOverrides[action]||primaryKeys[action];}
  bindingLabel(action:Action){return keyLabel(this.binding(action));}
  actionForKey(code:string){return this.keyMap[code];}
  beginRebind(action:Action,callback:(action:Action,code:string|null)=>void){this.clear();this.rebindAction=action;this.rebind=callback;}
  cancelRebind(){this.rebindAction=null;this.rebind=null;}
  clear() { this.keyboard.clear(); this.touch.clear(); this.previous.clear(); this.queuedPress.clear(); this.queuedRelease.clear(); document.querySelectorAll('.held').forEach(el => el.classList.remove('held')); }
  setScope(scope: Controls['scope']) { this.clear();this.scope=scope;this.blockedKeys=new Set(this.physicalKeys);this.blockedPad.clear();const held=this.sample();this.blockedPad=new Set(held);this.previous=new Set(); }
  hintKey(action:Action){return 'input.'+this.device+'.'+action;}
  private sample() {
    const down = new Set<Action>();
    this.keyboard.forEach(key => {const action=this.keyMap[key];if(action)down.add(action);}); this.touch.forEach(action => down.add(action));
    let pads:(Gamepad|null)[]=[];
    try{pads=Array.from(navigator.getGamepads?.()||[]);}catch{/* Embedding may deny gamepad access. */}
    const pad = Array.from(pads).find(p => p?.connected);
    if (pad) {
      const on = (i: number) => pad.buttons[i]?.pressed || false;
      const mapping: [Action, boolean][] = [['left', on(14) || pad.axes[0] < -.25], ['right', on(15) || pad.axes[0] > .25], ['crouch', on(13) || pad.axes[1] > .5], ['jump', on(0)], ['fire', on(7)], ['ability', on(1)], ['interact', on(2)], ['pause', on(9)]];
      const signature = JSON.stringify(mapping);
      if (signature !== this.padState && mapping.some(([,v]) => v)) this.device = 'gamepad';
      this.padState = signature;
      mapping.forEach(([action, held]) => { if(!held)this.blockedPad.delete(action);if(held&&!this.blockedPad.has(action))down.add(action); });
    }
    return down;
  }
  poll(): Frame {
    const down = this.sample();
    const pressed = new Set([...this.queuedPress,...[...down].filter(a => !this.previous.has(a))]);
    const released = new Set([...this.queuedRelease,...[...this.previous].filter(a => !down.has(a))]);
    this.queuedPress.clear(); this.queuedRelease.clear();
    this.previous = down;
    return { down, pressed, released };
  }
}
