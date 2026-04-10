import { Injectable } from '@angular/core';
import { Haptics } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private audioContext!: AudioContext;

  private audioBuffers: { [key: string]: AudioBuffer[] } = {};
  private indexes: { [key: string]: number } = {};
  private activeSources: AudioBufferSourceNode[] = [];

  // Keep a hard cap to reduce CPU spikes (common cause of crackle)
  private readonly MAX_ACTIVE_SOURCES = 12;

  // WebAudio unlock state (iOS)
  private needsGestureUnlock = true;
  private hasPreloaded = false;

  // Background song
  currentAudio: HTMLAudioElement | null = null;
  private audioPlayerMute = false;

  // Song routing for iOS-safe fade
  private songGain?: GainNode;
  private songSourceNode?: MediaElementAudioSourceNode;
  private fadeTimeoutId: any = null;
  private fadeToken = 0;

  // ---- NEW: Shared routing + gentle limiter to reduce clipping crackle ----
  private masterGain?: GainNode; // everything passes through here
  private sfxGain?: GainNode;    // SFX bus
  private limiter?: DynamicsCompressorNode; // acts like a soft limiter

  private ALL_SOUNDS = [
    'bell',
    'exhale',
    'exhaleBreath',
    'exhaleLeft',
    'exhaleRight',
    'fullyin',
    'fullyinHold',
    'fullyout',
    'fullyout2',
    'hold',
    'hum',
    'humming',
    'inagain',
    'inbelly',
    'inchest',
    'inhale',
    'inhaleBreath',
    'inhaleLeft',
    'inhaleRight',
    'inribs',
    'letGo',
    'letgoandhold',
    'lightNasal',
    'nextRound',
    'normalbreath',
    'pause',
    'pinchRun',
    'pinchWalk',
    'recover'
  ];

  constructor() {
    this.createAudioContext();
  }

  private createAudioContext(): void {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      // after re-create, we need unlock again
      this.needsGestureUnlock = true;
      this.hasPreloaded = false;

      // song nodes must be rebuilt because AudioContext changed
      this.songGain = undefined;
      this.songSourceNode = undefined;

      // master routing must be rebuilt because AudioContext changed
      this.masterGain = undefined;
      this.sfxGain = undefined;
      this.limiter = undefined;

      // reconnect song if it exists
      if (this.currentAudio) {
        this.ensureSongRouting();
      }
    }
  }

  markNeedsUnlock(): void {
    this.needsGestureUnlock = true;
  }

  async onAppBecameActive(): Promise<void> {
    this.createAudioContext();

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch {}

    this.needsGestureUnlock = (this.audioContext.state !== 'running');

    // keep song routing valid
    this.ensureSongRouting();
  }

  async unlockFromGestureIfNeeded(): Promise<void> {
    this.createAudioContext();

    try {
      if (this.audioContext.state !== 'running') {
        await this.audioContext.resume();   // must be in a gesture handler
      }
    } catch {}

    this.needsGestureUnlock = (this.audioContext.state !== 'running');

    if (!this.needsGestureUnlock) {
      // IMPORTANT tweak:
      // Don't autoplay any silent bridge on app open.
      // We only need the WebAudio context running + preloaded buffers.
      if (!this.hasPreloaded) await this.preloadAll();
    }
  }

  get requiresGestureUnlock(): boolean {
    return this.needsGestureUnlock;
  }

  async preloadAll(): Promise<void> {
    this.createAudioContext();

    // Do NOT resume here. Only unlockFromGestureIfNeeded() is allowed to resume.
    if (this.audioContext.state !== 'running') {
      // Optional: bail out silently
      return;
    }

    await Promise.all(this.ALL_SOUNDS.map((name) => this.loadAudio(name)));
    this.hasPreloaded = true;
  }

  private async loadAudio(name: string): Promise<void> {
    if (this.audioBuffers[name]) return;

    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    const isFemale = localStorage.getItem('isFemale') === 'true';

    const baseName = `${name}${isPortuguese ? 'PT' : ''}${isFemale ? 'F' : ''}`;
    const url = `assets/sounds/${baseName}.mp3`;

    let poolSize = 1;
    if (['fullyin', 'fullyout', 'fullyout2'].includes(name)) poolSize = 3;
    else if (name === 'bell') poolSize = 2;
    else poolSize = 5;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.audioContext.decodeAudioData(arrayBuffer);

      this.audioBuffers[name] = Array(poolSize).fill(buffer);
      this.indexes[name] = 0;
    } catch (error) {
      console.error(`❌ Failed to load or decode ${url}:`, error);
      delete this.audioBuffers[name];
    }
  }

  private clearBuffer(name: string): void {
    delete this.audioBuffers[name];
    delete this.indexes[name];
  }

  // ---- NEW: build a stable routing graph for both song + SFX ----
  private ensureMasterRouting(): void {
    this.createAudioContext();

    if (!this.masterGain) {
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1;

      // Soft limiter to reduce clipping crackle when song + SFX overlap
      this.limiter = this.audioContext.createDynamicsCompressor();
      // These are conservative "anti-crackle" settings; not meant to sound squashed
      this.limiter.threshold.value = -12;
      this.limiter.knee.value = 10;
      this.limiter.ratio.value = 6;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.12;

      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.audioContext.destination);
    }

    if (!this.sfxGain) {
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.masterGain);
    }

    // If songGain exists, route it into master (not directly to destination)
    if (this.songGain) {
      try { this.songGain.disconnect(); } catch {}
      this.songGain.connect(this.masterGain);
    }
  }

  private trackSource(source: AudioBufferSourceNode) {
    // Hard cap active sources (prevents CPU underruns -> crackle)
    if (this.activeSources.length >= this.MAX_ACTIVE_SOURCES) {
      const old = this.activeSources.shift();
      try { old?.stop(); } catch {}
    }

    this.activeSources.push(source);
    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
    };
  }

  private async playBuffer(name: string, playbackRate?: number): Promise<void> {
    const buffers = this.audioBuffers[name];
    if (!buffers?.length) return;

    // if not running, bail (don’t try to resume here)
    if (this.audioContext.state !== 'running') return;

    // Ensure stable routing (limiter + busses)
    this.ensureMasterRouting();

    const index = this.indexes[name] ?? 0;
    const buffer = buffers[index];
    this.indexes[name] = (index + 1) % buffers.length;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    if (playbackRate && playbackRate > 0) source.playbackRate.value = playbackRate;

    // Route SFX through SFX bus -> master -> limiter -> destination
    source.connect(this.sfxGain!);

    this.trackSource(source);
    source.start(0);
  }

  async playSound(name: string): Promise<void> {
    if (localStorage.getItem('voiceMute') === 'true') return;

    if (!this.audioBuffers[name] || this.audioBuffers[name].length === 0) {
      this.clearBuffer(name);
      await this.loadAudio(name);
    }

    await this.playBuffer(name);
  }

  async playBell(name: string = 'bell'): Promise<void> {
    if (localStorage.getItem('bellMute') === 'true') return;

    if (!this.audioBuffers[name] || this.audioBuffers[name].length === 0) {
      this.clearBuffer(name);
      await this.loadAudio(name);
    }

    await this.playBuffer(name);
  }

  async playBreath(name: string): Promise<void> {
    if (localStorage.getItem('breathMute') === 'true') return;

    if (!this.audioBuffers[name] || this.audioBuffers[name].length === 0) {
      this.clearBuffer(name);
      await this.loadAudio(name);
    }

    await this.playBuffer(name);
  }

  async playBreathSound(
    name: 'inhaleBreath' | 'exhaleBreath' | 'humming',
    durationSec: number
  ): Promise<void> {
    if (localStorage.getItem('vibrMute') !== 'true') {
      await Haptics.vibrate();
    }
    if (localStorage.getItem('breathMute') === 'true') return;

    await this.loadAudio(name);

    const buffers = this.audioBuffers[name];
    if (!buffers || buffers.length === 0) return;

    const buffer = buffers[this.indexes[name] ?? 0];
    const originalDuration = buffer.duration; // seconds
    const rate = originalDuration / durationSec;

    // update index
    this.indexes[name] = ((this.indexes[name] ?? 0) + 1) % buffers.length;

    await this.playBuffer(name, rate);
  }

  async vibrateFor(durationMs: number, interval = 300) {
    const endTime = Date.now() + durationMs;
    while (Date.now() < endTime) {
      await Haptics.vibrate();
      await new Promise((res) => setTimeout(res, interval));
    }
  }

  // ---------- Background song (HTMLAudio routed through WebAudio for fade) ----------

  async initializeSong(): Promise<void> {
    this.createAudioContext();

    if (!this.currentAudio) {
      const selectedSongUrl =
        localStorage.getItem('selectedSong') || 'assets/audio/healingFrequency.mp3';

      if (!localStorage.getItem('selectedSong')) {
        localStorage.setItem('selectedSong', selectedSongUrl);
      }

      this.audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';

      // Create element ONCE; later change .src if needed
      this.currentAudio = new Audio(
        this.audioPlayerMute ? 'assets/audio/silent.mp3' : selectedSongUrl
      );
      this.currentAudio.loop = true;
      this.currentAudio.preload = 'auto';

      await new Promise<void>((resolve) => {
        this.currentAudio!.addEventListener('canplaythrough', () => resolve(), { once: true });
        this.currentAudio!.load();
      });
    }

    this.ensureSongRouting();
  }

  private ensureSongRouting(): void {
    if (!this.currentAudio) return;
    this.createAudioContext();

    // Ensure master routing exists first (so song routes into it)
    this.ensureMasterRouting();

    if (!this.songGain) {
      this.songGain = this.audioContext.createGain();
      this.songGain.gain.value = 1;
      // connect to master (not destination)
      this.songGain.connect(this.masterGain!);
    }

    // If we already have a source node but it belongs to a different element, rebuild it.
    if (!this.songSourceNode) {
      this.songSourceNode = this.audioContext.createMediaElementSource(this.currentAudio);
      this.songSourceNode.connect(this.songGain);
    }
  }

  playSelectedSong(): void {
    if (!this.currentAudio) return;

    // best-effort resume context
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    } catch {}

    // Ensure routing + limiter is present before play
    this.ensureSongRouting();

    this.prepareSongForPlay();

    this.currentAudio.play().catch(() => {});
    this.disableMediaSession();
  }

  // ---- pause ----
  async pauseSelectedSong(): Promise<void> {
    await this.fadeOutSong(3000);

    // Stop any lingering scheduled WebAudio sources (SFX)
    this.activeSources.forEach((s) => { try { s.stop(); } catch {} });
    this.activeSources = [];

    this.disableMediaSession();
  }

  // ---- fade using GainNode (NO gain reset here) ----
  private fadeOutSong(ms = 3000): Promise<void> {
    if (!this.currentAudio) return Promise.resolve();

    this.ensureSongRouting();

    if (!this.songGain) {
      try { this.currentAudio.pause(); } catch {}
      try { this.currentAudio.currentTime = 0; } catch {}
      return Promise.resolve();
    }

    this.fadeToken++;
    const token = this.fadeToken;

    if (this.fadeTimeoutId) {
      clearTimeout(this.fadeTimeoutId);
      this.fadeTimeoutId = null;
    }

    const g = this.songGain.gain;
    const now = this.audioContext.currentTime;
    const end = now + ms / 1000;

    g.cancelScheduledValues(now);
    // force a known start point (avoid "already at 0.0001 so fade does nothing")
    g.setValueAtTime(g.value || 1, now);
    g.linearRampToValueAtTime(0.0001, end);

    return new Promise((resolve) => {
      this.fadeTimeoutId = window.setTimeout(() => {
        if (token !== this.fadeToken) return resolve();
        if (!this.currentAudio) return resolve();

        try { this.currentAudio.pause(); } catch {}
        try { this.currentAudio.currentTime = 0; } catch {}

        // DO NOT reset gain here (playSelectedSong will reset it)
        resolve();
      }, ms + 50);
    });
  }

  private disableMediaSession(): void {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null as any;
        navigator.mediaSession.playbackState = 'none';

        const nullHandler = () => {};
        navigator.mediaSession.setActionHandler('play', nullHandler);
        navigator.mediaSession.setActionHandler('pause', nullHandler);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      } catch (e) {
        console.warn('⚠️ Failed to disable MediaSession', e);
      }
    }
  }

  clearAllAudioBuffers(): void {
    this.audioBuffers = {};
    this.indexes = {};
    this.hasPreloaded = false;
  }

  async resetForPlayOrResume(): Promise<void> {
    // ensure context object exists (but do NOT resume here)
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.createAudioContext();
    }

    // stop any WebAudio SFX still running
    this.activeSources.forEach(s => { try { s.stop(); } catch {} });
    this.activeSources = [];

    // cancel pending song fade completion
    this.fadeToken++;
    if (this.fadeTimeoutId) {
      clearTimeout(this.fadeTimeoutId);
      this.fadeTimeoutId = null;
    }

    // keep song element + routing correct (no resume, no bridge)
    await this.ensureSongUpToDate();
  }

  private async ensureSongUpToDate(): Promise<void> {
    const selectedSongUrl =
      localStorage.getItem('selectedSong') || 'assets/audio/healingFrequency.mp3';
    const wantMute = localStorage.getItem('audioPlayerMute') === 'true';

    const expectedSrc = new URL(
      wantMute ? 'assets/audio/silent.mp3' : selectedSongUrl,
      window.location.href
    ).href;

    const currentSrc = this.currentAudio?.src || '';
    const needsRecreate =
      !this.currentAudio ||
      currentSrc !== expectedSrc ||
      this.audioPlayerMute !== wantMute;

    this.audioPlayerMute = wantMute;

    if (needsRecreate) {
      // stop old element
      if (this.currentAudio) {
        try { this.currentAudio.pause(); } catch {}
        try { this.currentAudio.currentTime = 0; } catch {}
      }

      // IMPORTANT: tear down graph so we can create a new MediaElementSource
      this.teardownSongGraph();

      // recreate element
      this.currentAudio = new Audio(wantMute ? 'assets/audio/silent.mp3' : selectedSongUrl);
      this.currentAudio.loop = true;
      this.currentAudio.preload = 'auto';

      await new Promise<void>((resolve) => {
        this.currentAudio!.addEventListener('canplaythrough', () => resolve(), { once: true });
        this.currentAudio!.load();
      });

      // rebuild routing for the new element
      this.ensureSongRouting();
    } else {
      this.ensureSongRouting();
    }
  }

  private teardownSongGraph(): void {
    // disconnect old nodes safely
    try { this.songSourceNode?.disconnect(); } catch {}
    this.songSourceNode = undefined;
  }

  private prepareSongForPlay(): void {
    if (!this.currentAudio) return;

    this.ensureSongRouting();

    // cancel any pending fade completion
    this.fadeToken++;
    if (this.fadeTimeoutId) {
      clearTimeout(this.fadeTimeoutId);
      this.fadeTimeoutId = null;
    }

    // restore gain to 1 BEFORE play
    if (this.songGain) {
      const g = this.songGain.gain;
      const t = this.audioContext.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(1, t);
    }

    // always start from beginning (your requirement)
    try { this.currentAudio.pause(); } catch {}
    try { this.currentAudio.currentTime = 0; } catch {}
  }

  // ------------------------------------------------------------------
  // iOS silent bridge (kept for compatibility, but NOT auto-started)
  // ------------------------------------------------------------------
  private silentBridge?: HTMLAudioElement;
  private bridgeStarted = false;

  private isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  async startMediaBridge(): Promise<void> {
    // Tweaked: do NOT start automatically on app open.
    // Keep function for compatibility if you ever call it manually.
    if (!this.isIOS() || this.bridgeStarted) return;

    // Only start if you explicitly want it
    // (ex: you could call this right before a feature that *needs* it)
    // For now, we simply leave it as a no-op unless you call it and want it.
    return;
  }

  stopMediaBridge(): void {
    try { this.silentBridge?.pause(); } catch {}
    this.silentBridge = undefined;
    this.bridgeStarted = false;
  }
}