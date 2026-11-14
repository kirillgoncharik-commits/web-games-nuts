import type {I18n} from '../i18n';
import {escape as e} from './components';

export const arrivalDuration=6500;
export function arrivalBody(i:I18n){
 return `<div class="arrival-scene"><svg viewBox="0 0 640 300" role="img" aria-label="${e(i.t('arrival.description'))}" shape-rendering="crispEdges">
 <rect width="640" height="300" fill="#0c1420"/><path d="M0 230H640V300H0Z" fill="#172936"/>
 <path d="M370 34H630V230H370Z" fill="#213747" stroke="#456171" stroke-width="4"/>
 <path d="M390 58H610V216H390Z" fill="#101823"/><path d="M380 230H640M380 240H640" stroke="#dfa15c" stroke-width="4"/>
 <path d="M420 80H580M420 100H580M420 120H580" stroke="#30495c" stroke-width="8"/>
 <path d="M30 36H33M82 80H85M160 24H163M240 120H243M300 42H303M54 160H57M292 194H295" stroke="#91a7b0" stroke-width="3"/>
 <g id="arrival-shuttle" transform="translate(20 80)"><path d="M0 24L20 8H76L100 24V48H0Z" fill="#72909c" stroke="#111823" stroke-width="4"/>
 <path d="M26 0H68V12H26ZM18 48H34V56H18ZM70 48H86V56H70Z" fill="#dfa15c"/>
 <path d="M68 16H82L92 26H68Z" fill="#76dcc8"/><path d="M4 30H52V40H4Z" fill="#30495c"/>
 <path id="arrival-exhaust" d="M-22 29H-5V42H-22Z" fill="#dfa15c"/></g>
 <g id="arrival-mira" visibility="hidden"><path d="M0 0H10V10H0Z" fill="#f1d8ae"/><path d="M-2 10H12V28H-2Z" fill="#76dcc8"/><path d="M-2 28H3V38H-2ZM8 28H13V38H8Z" fill="#72909c"/></g>
 <path id="arrival-alarm" d="M392 42H412V48H392ZM588 42H608V48H588Z" fill="#76dcc8"/>
 </svg><p id="arrival-caption" role="status">${e(i.t('arrival.approach'))}</p></div>`;
}

export function updateArrival(i:I18n,elapsed:number,reduced:boolean){
 const step=Math.floor(elapsed/110);elapsed=step*110;const progress=Math.min(1,elapsed/2600);
 const x=reduced?450:Math.round(20+430*progress),y=reduced?162:Math.round(80+82*progress);
 document.getElementById('arrival-shuttle')?.setAttribute('transform',`translate(${x} ${y})`);
 const landed=elapsed>=2800,alarm=elapsed>=4800;
 document.getElementById('arrival-exhaust')?.setAttribute('visibility',landed?'hidden':'visible');
 document.getElementById('arrival-mira')?.setAttribute('visibility',elapsed>=3500?'visible':'hidden');
 document.getElementById('arrival-mira')?.setAttribute('transform',`translate(${reduced?560:Math.round(514+Math.min(46,Math.max(0,elapsed-3500)/26))} 192)`);
 document.getElementById('arrival-alarm')?.setAttribute('fill',alarm?'#f36d76':'#76dcc8');
 const caption=document.getElementById('arrival-caption'),key=alarm?'arrival.emergency':landed?'arrival.disembark':'arrival.approach';
 if(caption){caption.textContent=i.t(key);caption.dataset.frame=String(step);}
}
