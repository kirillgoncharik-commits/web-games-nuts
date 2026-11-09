import config from '../game.config.json' with {type:'json'};
import {buildTarget} from './platform';
declare global { interface Window { gtag?: (...args: unknown[]) => void } }
export type EventName = 'game_boot' | 'game_ready' | 'load_complete' | 'screen_view' | 'play_pressed' | 'first_control' | 'tutorial_complete' | 'result_view' | 'result_continue' | 'research_reward' | 'enemy_encounter' | 'attempt_time' | 'death' | 'save_error' | 'campaign_replay_start' | 'error' | 'test_start' | 'test_complete' | 'pause' | 'resume' | 'mission_start' | 'room_enter' | 'tutorial_step' | 'hit_received' | 'mission_end' | 'retry' | 'campaign_start' | 'campaign_checkpoint' | 'campaign_end' | 'research_purchase' | 'event_offered' | 'event_choice' | 'repair_offered' | 'repair_used' | 'save_result' | 'continue' | 'locale_changed' | 'ability_used' | 'route_choice' | 'shield_absorbed' | 'mission_objective' | 'map_open' | 'boss_defeated' | 'death_prevented' | 'career_record_saved' | 'mode_view' | 'challenge_start' | 'challenge_finish' | 'personal_best_set' | 'retry_selected' | 'challenge_exported' | 'challenge_imported' | 'relay_handoff_created' | 'relay_leg_b_started' | 'relay_completed' | 'leaderboard_submit_result';
export class Telemetry {
  readonly events: { name: EventName; event_id: string; at: number; params: Record<string, string | number> }[] = [];
  private started = performance.now();
  constructor(readonly build: string, readonly sha: string) {}
  emit(name: EventName, params: Record<string, string | number> = {}) {
    const event = { name, event_id: crypto.randomUUID(), at: Math.round(performance.now() - this.started), params: {game_id:config.game_id,build_id:this.build,source_sha:this.sha,...params} };
    this.events.push(event); if (this.events.length > 240) this.events.shift();
    // This adapter never installs an SDK, queues remote events, or changes consent.
    try {
      if (buildTarget==='web'&&config.analytics.external_enabled&&localStorage.getItem(config.analytics.consent_key)==='granted') {
        const host = window.parent === window ? window : window.parent;
        // No event is buffered before consent; this allowlist contains only stable gameplay fields.
        const names: Partial<Record<EventName, string>> = {game_boot:'game_boot',game_ready:'game_loaded',load_complete:'load_complete',screen_view:'screen_view',play_pressed:'play_pressed',first_control:'first_control',tutorial_step:'tutorial_step',tutorial_complete:'tutorial_complete',mission_start:'game_start',room_enter:'room_enter',research_purchase:'research_purchase',research_reward:'research_reward',event_offered:'event_offered',event_choice:'event_choice',repair_offered:'repair_offered',repair_used:'repair_used',enemy_encounter:'enemy_encounter',hit_received:'hit_received',death:'death',mission_end:'game_end',retry:'game_restart',attempt_time:'attempt_time',result_view:'result_view',result_continue:'result_continue',campaign_start:'campaign_start',campaign_checkpoint:'campaign_checkpoint',campaign_end:'campaign_end',campaign_replay_start:'campaign_replay_start',save_result:'save_result',save_error:'save_error',error:'game_error',ability_used:'ability_used',route_choice:'route_chosen',pause:'game_pause',resume:'game_resume',continue:'continue',locale_changed:'locale_changed',mission_objective:'mission_objective',map_open:'map_open',boss_defeated:'boss_defeated',death_prevented:'death_prevented',career_record_saved:'career_record_saved'};
        const remote = names[name];
        if (remote && (name !== 'retry' || params.mode === 'mission') && (name !== 'first_control' || params.mode === 'mission')) {
          const payload:Record<string,string|number>={game_id:config.game_id,build_id:this.build,source_sha:this.sha,content_version:'campaign-m05b3.0',distribution_channel:buildTarget,environment:location.hostname==='nuts.bid'?'production':'preview',language:params.locale||'en'};
          const allowed=new Set(['screen','mode','mission_id','room_id','attempt_id','stage','step','result','reason','input_method','active_ms','active_duration','screen_ms','load_ms','technical_load_ms','intro_visible_ms','time_to_menu_ms','amount','source_mission_id','node_id','choice','event_id','slot_id','hp_before','hp_after','healing','score','revisit','success','kind','assisted','route','ability','airborne','campaign_run','placement_id','transition_id','ad_request_id','active_playtime_before_request','duration_ms','enemy_id','enemy_kind','behavior','previous_locale','language','objective']);
          for(const[key,value]of Object.entries(params))if(allowed.has(key)&&(typeof value==='string'||typeof value==='number'))payload[key]=value;
          if(params.result==='victory')payload.outcome='win';else if(params.result==='death')payload.outcome='defeat';else if(params.result==='abandoned')payload.outcome='explicit_exit';
          host.gtag?.('event',remote,{...payload,event_id:event.event_id});
        }
      }
    } catch { /* Storage and cross-origin embedding cannot prevent play. */ }
    const output=document.querySelector('#events');if(output)output.textContent = [...this.events].reverse().map(e => `${(e.at / 1000).toFixed(2)}s  ${e.name}  ${JSON.stringify(e.params)}`).join('\n');
  }
}
