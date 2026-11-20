import {escape as e,type Panels} from './components';
import type {I18n} from '../i18n';
import {accuracy,statisticsTotals,type PersonalRecords} from '../session/personal-records';
import type {CampaignData} from '../session/campaign';
import type {ChallengeRecords} from '../session/challenge-records';
import type {ChallengeArchive} from '../session/challenge-archive';
import type {RelayRecords} from '../session/relay';
import {missions,type PlayableMissionId} from '../session/missions';
import type {RunModeId} from '../session/run-clock';
import {makeChallengeSpec} from '../session/challenge-spec';

export type RecordsTab='summary'|'campaigns'|'challenges';
type Input={data:PersonalRecords;temporary:boolean;unlocked:boolean;tab:RecordsTab;mode:RunModeId;mission:string;campaigns:Map<string,CampaignData|null>;challenges:ChallengeRecords;archive:ChallengeArchive;relay:RelayRecords;onTab:(tab:RecordsTab)=>void;onMode:(mode:RunModeId)=>void;onMission:(mission:string)=>void;};
export function personalRecordsView(i18n:I18n,ui:Panels,input:Input){
 const t=(key:string,params:Record<string,string|number>={})=>i18n.t(key,params),n=(value:number)=>i18n.number(value,0);
 const duration=(ms:number)=>{const seconds=Math.floor(ms/1000);return t('records.duration',{hours:Math.floor(seconds/3600),minutes:Math.floor(seconds/60)%60,seconds:seconds%60});};
 const trialDuration=(ms:number)=>t('records.secondsValue',{seconds:i18n.number(ms/1000,3)});
 const metric=(title:string,value:string,testId='')=>'<div><dt>'+e(title)+'</dt><dd'+(testId?' data-testid="'+e(testId)+'"':'')+'>'+e(value)+'</dd></div>';
 const tabs='<nav class="records-tabs" aria-label="'+e(t('records.title'))+'">'+(['summary','campaigns','challenges'] as const).map(tab=>ui.button('records-'+tab,t('records.'+tab),()=>input.onTab(tab),{pressed:input.tab===tab})).join('')+'</nav>';
 const notice='<p class="helper">'+e(t('records.device'))+' · '+e(t('records.since',{date:i18n.date(input.data.started_at)}))+'</p>'+(input.temporary?'<p role="status" class="warning">'+e(t('records.temporary'))+'</p>':'');
 if(input.tab==='summary'){
  const totals=statisticsTotals(input.data),percent=accuracy(totals.shots,totals.hits);
  return tabs+notice+'<dl class="records-stats">'+metric(t('records.totalTime'),duration(totals.total_ms),'records-total-time')+metric(t('records.missionTime'),duration(totals.mission_ms),'records-mission-time')+metric(t('records.shots'),n(totals.shots),'records-shots')+metric(t('records.hits'),n(totals.hits),'records-hits')+metric(t('records.accuracy'),percent===null?'—':new Intl.NumberFormat(i18n.locale,{minimumFractionDigits:1,maximumFractionDigits:1}).format(percent)+'%','records-accuracy')+metric(t('records.completions'),n(input.data.completed.length),'records-completions')+'</dl><p class="helper">'+e(t('records.newCounters'))+'</p>';
 }
 if(input.tab==='campaigns')return tabs+notice+['r01','c02-small-world','c03-adriatic-1986'].map((world,index)=>{
  const campaign=input.campaigns.get(world),rows=input.data.completed.filter(row=>row.world===world).sort((a,b)=>b.completed_at.localeCompare(a.completed_at));
  const status=campaign?.stage==='campaign_complete'?t('records.completed'):campaign?t('records.inProgress'):t(world==='r01'||input.unlocked?'world.available':'world.locked_by_progress');
  let html='<article class="records-card"><h3>'+e(t(['world.c01','world.c02','world.c03'][index]))+'</h3><p>'+e(status)+(campaign?' · '+e(t(missions[campaign.mission_id].nameKey))+' · '+e(t('world.progress',{count:campaign.completed_missions.length})):'' )+'</p><p>'+e(t('records.knownCompletions',{count:rows.length}))+'</p>';
  if(campaign?.stage==='campaign_complete'&&!rows.some(row=>row.id===campaign.campaign_id))html+='<p class="helper">'+e(t('records.incompleteHistory'))+'</p>';
  const groups=new Map<string,typeof rows>();for(const row of rows){const key=[row.ruleset,row.content_version,row.assisted].join(' · ');const group=groups.get(key)||[];group.push(row);groups.set(key,group);}
  for(const [key,group]of groups){const full=group.filter(row=>row.history_complete);html+='<p class="helper">'+e(key)+' · '+e(t(group[0].assisted?'challenge.assisted':'challenge.manual'))+'</p><dl class="records-stats">'+metric(t('records.bestTime'),full.length?duration(Math.min(...full.map(row=>row.active_ms))):'—')+metric(t('records.bestScore'),full.length?n(Math.max(...full.map(row=>row.score))):'—')+'</dl>';}
  html+='<details><summary>'+e(t('records.history'))+'</summary>'+(rows.length?'<ol class="records-history">'+rows.map(row=>'<li><time datetime="'+e(row.completed_at)+'">'+e(i18n.date(row.completed_at))+'</time> · '+e(duration(row.active_ms))+' · '+e(t('results.deaths',{count:row.deaths}))+' · '+e(t('challenge.scoreValue',{score:row.score}))+(row.route?' · '+e(t('foundry.fork.'+row.route)):'')+(!row.history_complete?' · '+e(t('records.incompleteHistory')):'')+'</li>').join('')+'</ol>':'<p>'+e(t('records.noCampaigns'))+'</p>')+'</details></article>';return html;
 }).join('');
 const modes:RunModeId[]=['time_attack','score_attack','daily','duel','relay'];
 const specFor=(key:string)=>{const raw=Object.hasOwn(input.data.specs,key)?input.data.specs[key]:input.archive.items.find(row=>row.challenge_key===key)?.spec;if(!raw)return;try{return makeChallengeSpec(raw);}catch{return;}};
 const entries=Object.entries(input.challenges.recent).filter(([key,rows])=>rows[0]?.mode===input.mode&&(input.mission==='all'||(specFor(key)?.mission_ids||[]).includes(input.mission as PlayableMissionId)));
 const choices=[...new Set(Object.keys(input.challenges.recent).flatMap(key=>specFor(key)?.mission_ids||[]))];
 ui.change('records-mode',mode=>{if(modes.includes(mode as RunModeId))input.onMode(mode as RunModeId);});ui.change('records-mission',mission=>input.onMission(mission));
 let html=tabs+notice+'<div class="records-filters"><label>'+e(t('records.mode'))+'<select id="records-mode" data-focus="records-mode">'+modes.map(mode=>'<option value="'+mode+'" '+(mode===input.mode?'selected':'')+'>'+e(t('challenge.'+mode))+'</option>').join('')+'</select></label><label>'+e(t('records.mission'))+'<select id="records-mission" data-focus="records-mission"><option value="all">'+e(t('records.allMissions'))+'</option>'+choices.map(id=>'<option value="'+e(id)+'" '+(id===input.mission?'selected':'')+'>'+e(t(missions[id].nameKey))+'</option>').join('')+'</select></label></div>';
 for(const [key,rows]of entries){
  const spec=specFor(key),best=input.challenges.best.find(row=>row.challenge_key===key),day=spec?.event_plan_id.match(/daily-(\d{4}-\d{2}-\d{2})/)?.[1];
  html+='<article class="records-card"><h3>'+e(spec?spec.mission_ids.map(id=>t(missions[id].nameKey)).join(' + '):t('records.noData'))+(key.endsWith(':A')?' · A':key.endsWith(':B')?' · B':'')+'</h3>'+(input.mode==='daily'?'<p>'+e(t('records.utcDay',{date:day||t('records.noData')}))+'</p>':'')+'<p>'+e(t(best?.metric==='score'?'records.bestScore':'records.bestTime'))+': '+e(best?(best.metric==='score'?n(best.value):trialDuration(best.value)):'—')+'</p>';
  if(spec)html+='<p class="helper">'+e(spec.ruleset_id)+' · '+e(spec.content_hash)+' · '+e(t(spec.assist_profile==='assisted'?'challenge.assisted':'challenge.manual'))+' · '+e(t('challenge.'+spec.timing_policy))+'</p>';
  html+='<details><summary>'+e(t('records.history'))+'</summary><ol class="records-history">'+rows.map(row=>'<li><time datetime="'+e(new Date(row.finished_at).toISOString())+'">'+e(i18n.date(new Date(row.finished_at).toISOString()))+'</time> · '+e(trialDuration(row.elapsed_ms))+' · '+e(t('challenge.scoreValue',{score:row.score}))+' · '+e((row.state==='dnf'?t('records.dnf')+' ':'')+t('challenge.outcome.'+row.outcome))+' · '+e(t('challenge.eligibility.'+row.eligibility))+'</li>').join('')+'</ol></details></article>';
 }
 if(!entries.length)html+='<p>'+e(t('records.noTrials'))+'</p>';
 if(input.mode==='duel')for(const row of input.archive.items.filter(row=>input.mission==='all'||row.spec.mission_ids.includes(input.mission as PlayableMissionId)))if(row.opponent_results.length)html+='<article class="records-card"><h3>'+e(t('records.opponent'))+'</h3><p class="helper">'+e(t('challenge.resultUnverified'))+'</p>'+row.opponent_results.map(r=>'<p>'+e(trialDuration(r.elapsed_ms))+' · '+e(t('challenge.scoreValue',{score:r.score}))+'</p>').join('')+'</article>';
 if(input.mode==='relay')for(const row of input.relay.branches)html+='<article class="records-card"><h3>'+e(t('records.teamCode'))+'</h3><p>'+e(duration(row.receipt.team_elapsed_ms))+' · '+e(t('challenge.scoreValue',{score:row.receipt.team_score}))+'</p><p class="helper">A: '+e(duration(row.receipt.stage_a.elapsed_ms))+' · B: '+e(duration(row.receipt.stage_b.elapsed_ms))+'</p></article>';
 if(input.mode==='duel')for(const row of input.archive.items.filter(row=>row.local_result&&(input.mission==='all'||row.spec.mission_ids.includes(input.mission as PlayableMissionId)))){const r=row.local_result!;html+='<article class="records-card"><h3>'+e(t('records.ownResult'))+'</h3><p>'+e(trialDuration(r.elapsed_ms))+' · '+e(t('challenge.scoreValue',{score:r.score}))+'</p></article>';}
 return html;
}
