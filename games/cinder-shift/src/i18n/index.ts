import en from './en.json' with {type:'json'};
import ru from './ru.json' with {type:'json'};
export type Locale='en'|'ru';
export type Params=Record<string,string|number>;
export const catalogs:Record<Locale,Record<string,string>>={en,ru};
export function initialLocale():Locale{try{const saved=localStorage.getItem('cinder-shift-language-v1');if(saved==='en'||saved==='ru')return saved;}catch{/* Storage may be denied. */}return /^ru(?:-|$)/i.test(navigator.language)?'ru':'en';}
export class I18n{
  private missing=new Set<string>();
  constructor(public locale:Locale=initialLocale()){this.applyStatic();}
  setLocale(locale:Locale){this.locale=locale;this.applyStatic();}
  number(value:number,digits=1){return new Intl.NumberFormat(this.locale,{maximumFractionDigits:digits}).format(value);}
  date(iso:string){return new Intl.DateTimeFormat(this.locale,{dateStyle:'short',timeStyle:'short'}).format(new Date(iso));}
  t(key:string,params:Params={}){
    const value=catalogs[this.locale][key]||catalogs.en[key];
    if(!value){if(import.meta.env.DEV&&!this.missing.has(key)){console.warn('Missing localization key: '+key);this.missing.add(key);}return en['errors.generic'];}
    return value.replace(/\{(\w+)\}/g,(_match,name:string)=>params[name]===undefined?'—':typeof params[name]==='number'?this.number(params[name] as number):String(params[name]));
  }
  applyStatic(){
    document.documentElement.lang=this.locale;document.title=this.t('common.title')+' · Nuts Games';
    document.querySelector<HTMLMetaElement>('meta[name=description]')?.setAttribute('content',this.t('meta.description'));
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el=>el.textContent=this.t(el.dataset.i18n!));
    document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',this.t(el.dataset.i18nAria!)));
  }
}
