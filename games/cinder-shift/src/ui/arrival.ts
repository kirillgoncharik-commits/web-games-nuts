import type {I18n} from '../i18n';
import {escape as e} from './components';

export const arrivalDuration=6500;
const phases=['approach','disembark','emergency'] as const;
/** Illustrated shots keep the original clock, skip action and live captions. */
export function arrivalBody(i:I18n){
 return `<div class="arrival-scene"><svg viewBox="0 0 640 140" role="img" aria-label="${e(i.t('arrival.description'))}" shape-rendering="crispEdges">${phases.map((phase,n)=>`<image id="arrival-${phase}" href="./assets/arrival/${phase}.png" width="640" height="140" visibility="${n?'hidden':'visible'}"/>`).join('')}</svg><p id="arrival-caption" role="status">${e(i.t('arrival.approach'))}</p></div>`;
}

export function updateArrival(i:I18n,elapsed:number,_reduced:boolean){
 const step=Math.floor(elapsed/110);elapsed=step*110;
 const key=elapsed>=4800?'emergency':elapsed>=2800?'disembark':'approach';
 for(const phase of phases)document.getElementById('arrival-'+phase)?.setAttribute('visibility',phase===key?'visible':'hidden');
 const caption=document.getElementById('arrival-caption');
 if(caption){caption.textContent=i.t('arrival.'+key);caption.dataset.frame=String(step);}
}
