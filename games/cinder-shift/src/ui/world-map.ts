import type {I18n} from '../i18n';
import type {CampaignData} from '../session/campaign';
import {missionIds,missions,unlocked,type MissionId} from '../session/missions';
import {Panels,escape as e} from './components';
export const worldMapDefinition={version:1,nodes:missionIds.map(id=>({id,...missions[id].map})),connections:missionIds.slice(0,-1).map((id,index)=>({from:id,to:missionIds[index+1]}))};
export function mapStatus(d:CampaignData,id:MissionId){return!missions[id].implemented?'unavailable':d.completed_missions.includes(id as any)?'completed':unlocked(id,d.completed_missions)?'next':'locked';}
export function worldMap(i:I18n,ui:Panels,d:CampaignData,selected:MissionId,select:(id:MissionId)=>void){
 const lines=worldMapDefinition.connections.map(edge=>{const a=missions[edge.from].map,b=missions[edge.to].map;return`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${d.completed_missions.includes(edge.from as any)?'travelled':''}"/>`;}).join('');
 const nodes=missionIds.map(id=>{const def=missions[id],status=mapStatus(d,id),here=d.location_id===id;return ui.button('map-'+id,`<span class="map-number">${def.number.toString().padStart(2,'0')}</span><strong>${e(i.t(def.nameKey))}</strong><span class="map-status">${e(i.t('map.status.'+status))}</span>${here?`<span class="map-here">◆ ${e(i.t('map.here'))}</span>`:''}`,()=>select(id),{html:true,pressed:selected===id,className:'map-node '+status});}).join('');
 const def=missions[selected];return`<p class="map-context">${e(i.t('map.context'))}</p><div class="map-route"><svg viewBox="0 0 720 180" aria-hidden="true">${lines}</svg><div class="map-nodes">${nodes}</div></div><section class="map-detail" aria-live="polite"><h3>${e(i.t(def.nameKey))}</h3><p>${e(i.t(def.goalKey))}</p><p class="helper">${e(i.t('map.status.'+mapStatus(d,selected)))}</p></section><p class="helper">${e(i.t('map.evacuation'))}</p>`;
}
