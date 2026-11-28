const preferenceKey = 'civitas.campaign-music.v1';
export const themes = {
  frontier: {title:'Pacific Light', file:'pacific-light.mp3'},
  industrial: {title:'The Trestle', file:'the-trestle.mp3'},
  modern: {title:'Night Observatory', file:'night-observatory.mp3'}
};

export function loadMusicPreference(storage) {
  let saved;
  try { saved = JSON.parse(storage?.getItem(preferenceKey)); } catch { /* A blocked store is optional. */ }
  return {enabled:saved?.enabled !== false,
    volume:Number.isInteger(saved?.volume) ? Math.max(0, Math.min(100, saved.volume)) : 34};
}

export class CampaignMusic {
  constructor({storage, createContext, readAudio, onChange=()=>{}}) {
    this.storage = storage;
    this.preference = loadMusicPreference(storage);
    this.createContext = createContext;
    this.readAudio = readAudio;
    this.onChange = onChange;
    this.scene = null;
    this.visible = true;
    this.activated = false;
    this.status = 'waiting';
    this.active = null;
    this.loading = null;
    this.failedScene = null;
  }

  notify(status) {
    if (this.status === status) return;
    this.status = status;
    this.onChange();
  }

  setPreference(values) {
    if (typeof values.enabled === 'boolean') this.preference.enabled = values.enabled;
    if (Number.isFinite(values.volume)) this.preference.volume = Math.max(0, Math.min(100, Math.round(values.volume)));
    try { this.storage?.setItem(preferenceKey, JSON.stringify(this.preference)); } catch { /* Play for this session. */ }
    if (this.output) this.output.gain.setTargetAtTime(this.level(), this.context.currentTime, .045);
    this.reconcile();
    this.onChange();
  }

  level() { return (this.preference.volume/100) ** 1.5; }

  setScene(era) {
    const scene = Object.hasOwn(themes, era) ? era : null;
    if (this.scene === scene) return;
    this.scene = scene;
    this.failedScene = null;
    if (!scene && this.active) {
      this.active.source.stop();
      this.active = null;
    }
    this.reconcile();
    this.onChange();
  }

  setVisible(visible) {
    if (this.visible === visible) return;
    this.visible = visible;
    this.reconcile();
  }

  activate(retry=false) {
    this.activated = true;
    if (retry) this.failedScene = null;
    // Resume inside a trusted click, including the click that opens an
    // asynchronous online match. No audio is fetched on the title screen.
    if (this.preference.enabled && this.visible && !this.context) {
      try {
        this.context = this.createContext();
        this.output = this.context.createGain();
        this.output.gain.value = this.level();
        this.output.connect(this.context.destination);
      } catch {
        this.notify('unavailable');
        return;
      }
    }
    if (this.context && this.preference.enabled && this.visible &&
        (this.scene || !this.primed) && this.context.state !== 'running') {
      this.primed = true;
      this.resume();
    } else this.reconcile();
  }

  resume() {
    if (this.resuming) return;
    try {
      this.resuming = Promise.resolve(this.context.resume()).then(()=>{
        this.resuming = null;
        if (this.context.state === 'running') this.reconcile();
        else this.notify('waiting');
      }, ()=>{
        this.resuming = null;
        this.notify('waiting');
      });
    } catch { this.notify('waiting'); }
  }

  reconcile() {
    const ctx = this.context;
    const enabled = this.preference.enabled && this.preference.volume > 0;
    if (!this.scene || !this.visible || !enabled) {
      if (ctx?.state === 'running') ctx.suspend().catch(()=>{});
      this.notify(enabled ? 'waiting' : 'off');
      return;
    }
    if (!this.activated || !ctx) { this.notify('waiting'); return; }
    if (ctx.state !== 'running') { this.resume(); return; }
    if (this.active?.scene === this.scene) { this.notify('playing'); return; }
    if (this.failedScene === this.scene) { this.notify('unavailable'); return; }
    if (this.loading === this.scene) return;
    const scene = this.scene;
    this.loading = scene;
    this.notify('loading');
    this.startWhenReady(scene);
  }

  async startWhenReady(scene) {
    const ctx = this.context;
    try {
      const bytes = await this.readAudio(new URL('./music/'+themes[scene].file,import.meta.url));
      const buffer = await ctx.decodeAudioData(bytes);
      if (this.loading !== scene) return;
      this.loading = null;
      if (this.scene !== scene || !this.visible || !this.preference.enabled || this.preference.volume===0) return;
      const source = ctx.createBufferSource(), blend = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.connect(blend);
      blend.connect(this.output);
      const now = ctx.currentTime;
      blend.gain.setValueAtTime(0,now);
      blend.gain.linearRampToValueAtTime(1,now+.9);
      if (this.active) {
        const old = this.active;
        old.blend.gain.cancelScheduledValues(now);
        old.blend.gain.setValueAtTime(old.blend.gain.value,now);
        old.blend.gain.linearRampToValueAtTime(0,now+.85);
        old.source.stop(now+.9);
      }
      source.onended = ()=>{source.disconnect();blend.disconnect();};
      source.start(now);
      this.active = {scene,source,blend};
      this.notify(ctx.state === 'running' ? 'playing' : 'waiting');
    } catch {
      if (this.loading !== scene) return;
      this.loading = null;
      this.failedScene = scene;
      if (this.scene === scene) this.notify('unavailable');
    }
  }
}
