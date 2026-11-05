export type Action = 'left' | 'right' | 'jump' | 'crouch' | 'fire' | 'interact' | 'ability' | 'pause';
export type Frame = { down: Set<Action>; pressed: Set<Action>; released: Set<Action> };
const keys: Record<string, Action> = { KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right', Space:'jump', KeyS:'crouch', ArrowDown:'crouch', KeyJ:'fire', KeyX:'fire', KeyE:'interact', KeyK:'ability', KeyC:'ability', Escape:'pause' };
export class Controls {
  device: 'keyboard' | 'touch' | 'gamepad' = matchMedia('(pointer:coarse)').matches ? 'touch' : 'keyboard';
  scope: 'menu' | 'play' | 'pause' = 'menu';
  private keyboard = new Set<string>();
  private touch = new Map<number, Action>();
  private previous = new Set<Action>();
  private queuedPress = new Set<Action>();
  private queuedRelease = new Set<Action>();
  private padState = '';
  constructor() {
    window.addEventListener('keydown', e => {
      const target=e.target instanceof HTMLElement?e.target:null;
      // Editable controls own their keys; ordinary page buttons retain Tab/Enter/Space.
      if (!keys[e.code] || this.scope === 'menu' || target?.closest('input,select,textarea,[contenteditable=true]') || ((e.code==='Space') && target?.closest('button,summary,a'))) return;
      e.preventDefault(); if (!e.repeat) this.queuedPress.add(keys[e.code]); this.keyboard.add(e.code); this.device = 'keyboard';
    });
    window.addEventListener('keyup', e => { if(this.keyboard.delete(e.code)) this.queuedRelease.add(keys[e.code]); });
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
  clear() { this.keyboard.clear(); this.touch.clear(); this.previous.clear(); this.queuedPress.clear(); this.queuedRelease.clear(); document.querySelectorAll('.held').forEach(el => el.classList.remove('held')); }
  setScope(scope: Controls['scope']) { this.clear(); this.scope = scope; this.previous = this.sample(); }
  hint(action:Action) {
    const labels={keyboard:{left:'A / D',right:'A / D',jump:'Space',crouch:'S / ↓',fire:'J / X',interact:'E',ability:'K / C',pause:'Esc'},gamepad:{left:'стик',right:'стик',jump:'A',crouch:'↓',fire:'RT',interact:'X',ability:'B',pause:'Menu'},touch:{left:'кнопки ◀ ▶',right:'кнопки ◀ ▶',jump:'кнопка ↑',crouch:'кнопка ↓',fire:'автоогонь / ОГОНЬ',interact:'ТЕРМИНАЛ',ability:'ИМПУЛЬС',pause:'Пауза'}};
    return labels[this.device][action];
  }
  private sample() {
    const down = new Set<Action>();
    this.keyboard.forEach(key => down.add(keys[key])); this.touch.forEach(action => down.add(action));
    let pads:(Gamepad|null)[]=[];
    try{pads=Array.from(navigator.getGamepads?.()||[]);}catch{/* Embedding may deny gamepad access. */}
    const pad = Array.from(pads).find(p => p?.connected);
    if (pad) {
      const on = (i: number) => pad.buttons[i]?.pressed || false;
      const mapping: [Action, boolean][] = [['left', on(14) || pad.axes[0] < -.25], ['right', on(15) || pad.axes[0] > .25], ['crouch', on(13) || pad.axes[1] > .5], ['jump', on(0)], ['fire', on(7)], ['ability', on(1)], ['interact', on(2)], ['pause', on(9)]];
      const signature = JSON.stringify(mapping);
      if (signature !== this.padState && mapping.some(([,v]) => v)) this.device = 'gamepad';
      this.padState = signature;
      mapping.forEach(([action, held]) => { if (held) down.add(action); });
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
