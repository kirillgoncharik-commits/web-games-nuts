import type{I18n}from'../i18n';
import type{CampaignData}from'../session/campaign';
import{missionIds,missions,unlocked,type MissionId}from'../session/missions';
import{Panels,escape as e}from'./components';
import complexMap from'./caldera-complex.svg?raw';

export const worldMapDefinition={version:2,viewBox:{width:1200,height:520},nodes:missionIds.map(id=>({id,...missions[id].map})),connections:missionIds.slice(0,-1).map((id,index)=>({from:id,to:missionIds[index+1]}))};

export function mapStatus(d:CampaignData,id:MissionId){
 return!missions[id].implemented?'unavailable':(d.completed_missions as readonly string[]).includes(id)?'completed':unlocked(id,d.completed_missions)?'next':'locked';
}

const stateGlyph=(status:ReturnType<typeof mapStatus>)=>{
 if(status==='completed')return'<path d="m5 12 4 4L19 6"/>';
 if(status==='next')return'<path d="M4 12h14m-6-6 6 6-6 6"/>';
 if(status==='locked')return'<rect x="5" y="10" width="14" height="11"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>';
 return'<path d="M6 6l12 12M18 6 6 18"/>';
};

function routePath(from:MissionId,to:MissionId){
 const a=missions[from].map,b=missions[to].map,mid=(a.x+b.x)/2;
 return`M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
}

export function worldMap(i:I18n,ui:Panels,d:CampaignData,selected:MissionId,select:(id:MissionId)=>void){
 const lines=worldMapDefinition.connections.map(edge=>{
  const travelled=(d.completed_missions as readonly string[]).includes(edge.from),current=d.location_id===edge.from||d.location_id===edge.to;
  return`<path d="${routePath(edge.from,edge.to)}" class="map-connection ${travelled?'travelled':''} ${current?'current':''}"/>`;
 }).join('');
 const pins=missionIds.map(id=>{
  const def=missions[id],status=mapStatus(d,id),here=d.location_id===id,label=[i.t(def.nameKey),i.t('map.status.'+status),...(here?[i.t('map.here')]:[])].join('. ');
  const content='<span class="map-pin-number">'+String(def.number).padStart(2,'0')+'</span><svg viewBox="0 0 24 24" class="map-pin-state" aria-hidden="true">'+stateGlyph(status)+'</svg>'+(here?'<span class="map-pin-current" aria-hidden="true">◆</span>':'');
  return ui.button('map-pin-'+id,content,()=>select(id),{html:true,label,pressed:selected===id,className:'map-pin '+status+(here?' current':''),style:`left:${def.map.x/12}%;top:${def.map.y/5.2}%`});
 }).join('');
 const legend=missionIds.map(id=>{
  const def=missions[id],status=mapStatus(d,id),here=d.location_id===id,label=[i.t(def.nameKey),i.t('map.status.'+status),...(here?[i.t('map.here')]:[])].join('. ');
  const content='<span class="map-legend-number">'+String(def.number).padStart(2,'0')+'</span><span class="map-legend-name">'+e(i.t(def.nameKey))+'</span><span class="map-legend-status">'+e(i.t('map.status.'+status))+(here?' · '+e(i.t('map.here')):'')+'</span>';
  return ui.button('map-sector-'+id,content,()=>select(id),{html:true,label,pressed:selected===id,className:'map-legend-item '+status+(here?' current':'')});
 }).join('');
 const def=missions[selected],status=mapStatus(d,selected);
 return`<p class="map-context">${e(i.t('map.context'))}</p><div class="map-illustrated" role="group" aria-label="${e(i.t('map.title'))}">${complexMap}<svg class="map-route-overlay" viewBox="0 0 1200 520" aria-hidden="true">${lines}</svg><div class="map-pins">${pins}</div></div><nav class="map-legend" aria-label="${e(i.t('map.title'))}">${legend}</nav><section class="map-detail" aria-live="polite"><h3>${e(i.t(def.nameKey))}</h3><p>${e(i.t(def.goalKey))}</p><p class="helper">${e(i.t('map.status.'+status))}${d.location_id===selected?' · '+e(i.t('map.here')):''}</p></section><p class="helper">${e(i.t('map.evacuation'))}</p>`;
}
