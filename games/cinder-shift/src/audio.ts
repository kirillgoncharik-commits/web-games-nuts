export class Effects {
  muted = false;
  private context?: AudioContext;
  async unlock() {
    try { this.context ||= new AudioContext(); if (this.context.state === 'suspended') await this.context.resume(); } catch { /* Play without audio. */ }
  }
  pause() { void this.context?.suspend().catch(() => {}); }
  tone(frequency: number, duration = .07, volume = .035) {
    if (this.muted || this.context?.state !== 'running') return;
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(frequency, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency / 2), ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  state() { return this.context?.state || 'uninitialized'; }
}
