import type {Controls} from '../input';
import type{SoundId}from'../audio';
export const escape=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type ButtonOptions={kind?:'primary'|'secondary'|'danger';disabled?:boolean;pressed?:boolean;sound?:'silent'|'cancel';className?:string;html?:boolean;label?:string;style?:string;busy?:boolean};
export class Panels{
  private actions=new Map<string,()=>void>();private changes=new Map<string,(value:string,checked:boolean)=>void>();
  private scrollPositions=new Map<string,number>();private scopeKey='';private back:()=>void=()=>{};private padPrevious=new Set<string>();
  onSound:(id:SoundId)=>void=()=>{};private previousFocus='';
  visible=false;onDevice:()=>void=()=>{};
  constructor(readonly root:HTMLElement,private controls:Controls){
    root.addEventListener('click',e=>{const target=(e.target as Element).closest<HTMLButtonElement>('[data-command]');if(target&&!target.disabled){if(target.dataset.sound!=='silent')this.onSound(target.dataset.sound==='cancel'?'ui_cancel':'ui_confirm');this.actions.get(target.dataset.command!)?.();}});
    root.addEventListener('change',e=>{const input=e.target as HTMLInputElement;this.changes.get(input.id)?.(input.value,input.checked);});
    root.addEventListener('pointerdown',e=>{this.controls.device=e.pointerType==='touch'?'touch':'keyboard';this.onDevice();});
    window.addEventListener('keydown',e=>{
      if(!this.visible)return;this.controls.device='keyboard';this.onDevice();
      if(this.controls.isRebinding)return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){this.onSound('ui_cancel');this.back();}return;}
      if(e.key==='Tab'){e.preventDefault();this.move(e.shiftKey?-1:1);return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&!(e.target instanceof HTMLSelectElement)&&!(e.target instanceof HTMLInputElement&&e.target.type!=='checkbox')){e.preventDefault();this.move(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1);return;}
      if(e.repeat&&(e.key==='Enter'||e.key===' '))e.preventDefault();
    },true);
    document.addEventListener('focusin',e=>{if(this.visible&&!root.contains(e.target as Node))this.focus();else if(this.visible){const el=e.target as HTMLElement,id=el.dataset.focus||el.id;if(id&&id!==this.previousFocus){this.previousFocus=id;this.onSound('ui_focus');}}});
  }
  button(id:string,content:string,action:()=>void,options:ButtonOptions={}){this.actions.set(id,action);return `<button type="button" data-command="${escape(id)}" data-sound="${options.sound||'confirm'}" data-testid="${escape(id)}" data-focus="${escape(id)}" class="${options.kind||'secondary'} ${options.className||''}" ${options.label?`aria-label="${escape(options.label)}"`:''} ${options.style?`style="${escape(options.style)}"`:''} ${options.busy?'aria-busy="true"':''} ${options.disabled?'disabled':''} ${options.pressed===undefined?'':`aria-pressed="${options.pressed}"`}>${options.html?content:escape(content)}</button>`;}
  change(id:string,callback:(value:string,checked:boolean)=>void){this.changes.set(id,callback);}
  show(build:()=>string,back:()=>void,focusId?:string,scopeKey=''){
    const previous=(document.activeElement as HTMLElement)?.dataset.focus||document.activeElement?.id;
    const oldContent=this.root.querySelector('.panel-content');if(oldContent)this.scrollPositions.set(this.scopeKey,oldContent.scrollTop);this.scopeKey=scopeKey;
    this.actions.clear();this.changes.clear();this.back=back;this.root.innerHTML=build();this.root.hidden=false;this.visible=true;this.syncPad();this.focus(focusId||previous);const content=this.root.querySelector('.panel-content');if(content)content.scrollTop=this.scrollPositions.get(scopeKey)||0;
  }
  hide(){this.visible=false;this.root.hidden=true;this.root.replaceChildren();this.actions.clear();this.changes.clear();}
  private items(){return [...this.root.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),input:not(:disabled),summary,a[href]')].filter(el=>el.getClientRects().length>0);}
  focus(id?:string){const target=id?this.items().find(el=>el.dataset.focus===id||el.id===id):undefined;(target||this.items()[0])?.focus({preventScroll:true});}
  private move(direction:number){const items=this.items(),at=items.indexOf(document.activeElement as HTMLElement);items[(at+direction+items.length)%items.length]?.focus({preventScroll:true});(document.activeElement as HTMLElement)?.scrollIntoView({block:'nearest'});}
  private pad(){const keys=new Set<string>();try{const p=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);if(!p)return keys;const on=(i:number)=>p.buttons[i]?.pressed;for(const [key,active] of [['next',on(13)||p.axes[1]>.5],['previous',on(12)||p.axes[1]<-.5],['right',on(15)||p.axes[0]>.5],['left',on(14)||p.axes[0]<-.5],['confirm',on(0)],['back',on(1)],['pause',on(9)]] as const)if(active)keys.add(key);}catch{/* Embedding may deny access. */}return keys;}
  private syncPad(){this.padPrevious=this.pad();}
  poll(){const now=this.pad(),edges=[...now].filter(k=>!this.padPrevious.has(k));this.padPrevious=now;if(!this.visible||document.hidden||!document.hasFocus()||!edges.length)return;this.controls.device='gamepad';this.onDevice();const focused=document.activeElement;if(focused instanceof HTMLInputElement&&focused.type==='range'&&(edges.includes('left')||edges.includes('right'))){const step=Number(focused.step)||.05;focused.value=String(Math.max(Number(focused.min),Math.min(Number(focused.max),Number(focused.value)+(edges.includes('right')?step:-step))));focused.dispatchEvent(new Event('change',{bubbles:true}));}else if(edges.includes('next')||edges.includes('right'))this.move(1);else if(edges.includes('previous')||edges.includes('left'))this.move(-1);else if(edges.includes('back')||edges.includes('pause')){this.onSound('ui_cancel');this.back();}else if(edges.includes('confirm')){const el=document.activeElement as HTMLElement;if(el instanceof HTMLButtonElement)el.click();else if(el instanceof HTMLInputElement&&el.type==='checkbox'){el.checked=!el.checked;el.dispatchEvent(new Event('change',{bubbles:true}));}else if(el instanceof HTMLSelectElement){el.selectedIndex=(el.selectedIndex+1)%el.options.length;el.dispatchEvent(new Event('change',{bubbles:true}));}else if(el instanceof HTMLElement&&el.tagName==='SUMMARY')el.click();}}
}
