import config from '../game.config.json' with {type:'json'};
declare global { interface Window { gtag?: (...args: unknown[]) => void } }
export type EventName = 'game_boot' | 'game_ready' | 'error' | 'test_start' | 'test_complete' | 'pause' | 'resume' | 'mission_start' | 'room_enter' | 'tutorial_step' | 'hit_received' | 'mission_end' | 'retry' | 'campaign_start' | 'research_purchase' | 'event_offered' | 'event_choice' | 'save_result' | 'continue' | 'locale_changed';
export class Telemetry {
  readonly events: { name: EventName; event_id: string; at: number; params: Record<string, string | number> }[] = [];
  private started = performance.now();
  constructor(readonly build: string, readonly sha: string) {}
  emit(name: EventName, params: Record<string, string | number> = {}) {
    const event = { name, event_id: crypto.randomUUID(), at: Math.round(performance.now() - this.started), params: {game_id:config.game_id,build_id:this.build,source_sha:this.sha,...params} };
    this.events.push(event); if (this.events.length > 240) this.events.shift();
    // This adapter never installs an SDK, queues remote events, or changes consent.
    try {
      if (config.analytics.external_enabled && localStorage.getItem(config.analytics.consent_key) === 'granted') {
        const host = window.parent === window ? window : window.parent;
        // Existing local lifecycle names stay stable; only four consented external events are sent.
        const names: Partial<Record<EventName, string>> = {game_ready:'game_loaded', mission_start:'game_start', mission_end:'game_end', retry:'game_restart'};
        const remote = names[name];
        if (remote && (name !== 'retry' || params.mode === 'mission')) {
          const outcome = params.result === 'victory' ? 'win' : params.result === 'death' ? 'defeat' : params.result === 'abandoned' ? 'explicit_exit' : undefined;
          host.gtag?.('event', remote, { game_id: config.game_id, build_id: this.build, source_sha: this.sha, event_id: event.event_id, language: params.locale, level_id: params.mission_id, ...(outcome ? {outcome} : {}) });
        }
      }
    } catch { /* Storage and cross-origin embedding cannot prevent play. */ }
    const output=document.querySelector('#events');if(output)output.textContent = [...this.events].reverse().map(e => `${(e.at / 1000).toFixed(2)}s  ${e.name}  ${JSON.stringify(e.params)}`).join('\n');
  }
}
