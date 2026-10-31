/* Playgama Bridge adapter. Offline local preview uses an in-memory fallback only. */
export class BridgeAdapter {
  constructor() {
    this.bridge = null;
    this.ready = false;
    this.paused = false;
    this.audioEnabled = true;
    this.memory = new Map();
  }
  async init(onPause = () => {}, onAudio = () => {}) {
    try {
      const candidate = window.bridge;
      if (candidate?.initialize) {
        await candidate.initialize();
        this.bridge = candidate;
        this.audioEnabled = candidate.platform?.isAudioEnabled !== false;
        this.bridge.platform?.on?.(candidate.EVENT_NAME.PAUSE_STATE_CHANGED, value => {
          this.paused = Boolean(value); onPause(this.paused);
        });
        this.bridge.platform?.on?.(candidate.EVENT_NAME.AUDIO_STATE_CHANGED, value => {
          this.audioEnabled = Boolean(value); onAudio(this.audioEnabled);
        });
      }
    } catch (error) {
      console.warn('Playgama Bridge unavailable; using preview-only in-memory profile.', error);
      this.bridge = null;
    }
    this.ready = true;
    return { language: this.bridge?.platform?.language || 'en', audioEnabled: this.audioEnabled };
  }
  async loadProfile() {
    const defaults = { yen: 1250, gems: 25, style: 'rookie', ownedStyles: ['rookie'], bestScore: 0, settings: { sensitivity: 1, botLevel: 'normal', brightness: 1 } };
    if (!this.bridge?.storage) return { ...defaults, ...(this.memory.get('profile') || {}) };
    try {
      const [saved] = await this.bridge.storage.get(['vl_profile_v1']);
      return { ...defaults, ...(saved || {}) };
    } catch (error) { console.warn('Profile load failed; defaults restored.', error); return defaults; }
  }
  async saveProfile(profile) {
    if (!this.bridge?.storage) { this.memory.set('profile', structuredClone(profile)); return; }
    try { await this.bridge.storage.set(['vl_profile_v1'], [profile]); }
    catch (error) { console.warn('Profile save failed.', error); }
  }
  sendReady() { if (this.bridge?.platform?.sendMessage) this.bridge.platform.sendMessage('game_ready'); }
  levelStarted() { this.bridge?.platform?.sendMessage?.('level_started', { world: 'arena', level: '1' }); }
  levelCompleted() { this.bridge?.platform?.sendMessage?.('level_completed', { world: 'arena', level: '1' }); this.bridge?.advertisement?.showInterstitial?.('level_completed'); }
}
