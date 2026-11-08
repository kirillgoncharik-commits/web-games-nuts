import type{I18n}from'../i18n';
import{characterProfile,previewProfile,type CharacterProfile}from'../session/profile';
import{research,prerequisitesMet,type NodeId,type ActiveSkill}from'../session/research';
import type{CampaignData}from'../session/campaign';
import{Panels,escape as e}from'./components';
import{moduleStateMark,researchIcon}from'./research-icons';
import portrait from'../art/profile.generated.json'with{type:'json'};

export const heroImage=(i:I18n,extra='')=>'<img class="mira-portrait '+extra+'" src="./assets/m05a/'+portrait.file+'" width="48" height="64" alt="'+e(i.t('character.portrait'))+'"/>';

export function heroProfile(i:I18n,nodes:readonly NodeId[],active:ActiveSkill=nodes.includes('M1')?'M1':null){
 const p=characterProfile(nodes,active),icons=nodes.map(id=>researchIcon(id)).join('');
 return'<aside class="profile-card" aria-label="'+e(i.t('character.profile'))+'">'+heroImage(i)+'<h3>'+e(i.t('character.mira.name'))+'</h3><p class="helper">'+e(i.t('character.mira.role'))+'</p><p data-testid="profile-integrity">'+e(i.t('common.hp',{hp:p.maxHp,max:p.maxHp}))+'</p><p class="helper">'+e(i.t('workshop.skills'))+'</p><div class="profile-build-icons" aria-hidden="true">'+icons+'</div><p class="helper" data-testid="profile-active">'+e(i.t('workshop.active',{skill:i.t(p.active?'research.'+p.active+'.name':'workshop.noActive')}))+'</p><p class="helper">'+e(i.t('research.build',{build:nodes.length?nodes.map(id=>i.t('research.'+id+'.name')).join(' + '):i.t('common.base')}))+'</p></aside>';
}

const fields=['maxHp','projectileDamage','projectilesPerShot','shotsPerSecond','projectileSpeed','walkSpeed','piercing','ricochet','chargedShot','airDash','wallMove','phaseDash','buffer','shieldClear','deathSave','active']as const;

function value(i:I18n,p:CharacterProfile,key:typeof fields[number]){
 if(key==='active')return i.t(p.active?'research.'+p.active+'.name':'workshop.noActive');
 if(key==='piercing'||key==='ricochet'||key==='chargedShot'||key==='airDash'||key==='wallMove'||key==='phaseDash'||key==='buffer'||key==='shieldClear'||key==='deathSave')return i.t(p[key]?'common.on':'common.off');
 if(key==='walkSpeed'||key==='projectileSpeed')return i.t('workshop.speed',{speed:p[key]});
 return i.number(p[key]);
}

export function stats(i:I18n,nodes:readonly NodeId[],selected?:NodeId,changesOnly=false,idPrefix='',active:ActiveSkill=nodes.includes('M1')?'M1':null){
 const now=characterProfile(nodes,active),next=selected?previewProfile(nodes,selected,active):now;
 const rows=fields.filter(key=>!changesOnly||now[key]!==next[key]).map(key=>'<tr><th scope="row">'+e(i.t('workshop.stat.'+key))+'</th><td data-testid="'+idPrefix+'current-'+key+'">'+e(value(i,now,key))+'</td>'+(selected?'<td class="'+(now[key]!==next[key]?'stat-change':'')+'" data-testid="'+idPrefix+'preview-'+key+'">'+(now[key]!==next[key]?'<span aria-hidden="true">→ </span>':'')+e(value(i,next,key))+'</td>':'')+'</tr>').join('');
 return'<section class="stats-card"><h3>'+e(i.t('workshop.stats'))+'</h3><table class="profile-stats"><thead><tr><th scope="col">'+e(i.t('workshop.parameter'))+'</th><th scope="col">'+e(i.t('workshop.current'))+'</th>'+(selected?'<th scope="col">'+e(i.t('workshop.after',{node:selected}))+'</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table>'+(next.active==='M1'&&!changesOnly?'<p class="helper">'+e(i.t('workshop.dash',{distance:next.dashDistance,seconds:next.dashSeconds,cooldown:next.dashCooldown}))+'</p>':'')+(selected==='W1'&&!changesOnly?'<p class="helper">'+e(i.t('workshop.spreadNote'))+'</p>':'')+'</section>';
}

export function workshopBody(i:I18n,ui:Panels,d:CampaignData,selected:NodeId,select:(id:NodeId)=>void){
 const cards=research.map(node=>{
  const owned=d.nodes.includes(node.id),insufficient=d.points<node.cost,locked=!prerequisitesMet(d.nodes,node.id),equipped=(node.id==='M1'||node.id==='W4')&&d.active===node.id;
  const visualState=equipped?'equipped':owned?'purchased':locked?'locked':insufficient?'no-points':selected===node.id?'selected':'available';
  const textKey=equipped?'research.equipped':owned?'research.owned':locked?'research.locked':insufficient?'research.insufficient':selected===node.id?'research.selected':'research.available';
  const stateText=locked?i.t('research.requires',{nodes:node.requires.join(', ')}):i.t(textKey);
  const content='<span class="module-emblem">'+researchIcon(node.icon)+moduleStateMark(visualState)+'</span><span class="module-copy"><span class="module-heading"><strong>'+e(node.id+' / '+i.t(node.nameKey))+'</strong><span class="module-cost">'+e(i.t('research.cost',{cost:node.cost}))+'</span></span><span class="module-kind">'+e(i.t(node.id==='M1'||node.id==='W4'?'workshop.activeType':'workshop.passiveType'))+'</span><span class="effect">'+e(i.t(node.effectKey))+'</span><span class="node-state">'+e(stateText)+'</span></span>';
  return ui.button('research-'+node.id,content,()=>select(node.id),{pressed:selected===node.id,sound:'silent',html:true,className:'research-card state-'+visualState});
 }).join('');
 return'<div class="workshop-layout">'+heroProfile(i,d.nodes,d.active)+'<section class="module-list"><h3>'+e(i.t('workshop.modules'))+'</h3><div class="research-grid">'+cards+'</div></section><details class="workshop-technical"><summary>'+e(i.t('workshop.details'))+'</summary>'+stats(i,d.nodes,selected,false,'detail-',d.active)+'</details></div>';
}

export function characterSlots(i:I18n){
 return'<p class="helper">'+e(i.t('character.context'))+'</p><div class="character-grid"><section class="character-slot available" aria-label="'+e(i.t('character.mira.name'))+'">'+heroImage(i)+'<h3>'+e(i.t('character.mira.name'))+'</h3><p class="helper">'+e(i.t('character.mira.role'))+'</p></section>'+[2,3].map(slot=>'<section class="character-slot locked" aria-disabled="true"><span class="locked-mark" aria-hidden="true">?</span><strong>'+e(i.t('character.slot',{slot}))+'</strong><p>'+e(i.t('character.soon'))+'</p></section>').join('')+'</div>';
}

export function selectionSummary(i:I18n,nodes:readonly NodeId[],selected:NodeId,active:ActiveSkill=nodes.includes('M1')?'M1':null){
 const node=research.find(n=>n.id===selected)!,now=characterProfile(nodes,active),next=previewProfile(nodes,selected,active);
 const key=selected==='D1'?'maxHp':selected==='D2'?'buffer':selected==='D3'?'shieldClear':selected==='D4'?'deathSave':selected==='W1'?'projectilesPerShot':selected==='W2'?'piercing':selected==='W3'?'ricochet':selected==='W4'?'chargedShot':selected==='M2'?'airDash':selected==='M3'?'wallMove':selected==='M4'?'phaseDash':'active';
 const display=(p:CharacterProfile)=>value(i,p,key);
 return'<div class="selected-module" role="status" aria-live="polite">'+researchIcon(node.icon)+'<div><strong>'+e(selected+' / '+i.t(node.nameKey))+'</strong><p class="selected-change">'+e(i.t('workshop.stat.'+key))+': <span data-testid="current-'+key+'">'+e(display(now))+'</span> → <span class="stat-change" data-testid="preview-'+key+'">'+e(display(next))+'</span></p></div></div>';
}
