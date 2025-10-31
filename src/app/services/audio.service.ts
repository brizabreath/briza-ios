import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private audioContext!: AudioContext;
  private audioBuffers: { [key: string]: AudioBuffer[] } = {};
  private indexes: { [key: string]: number } = {};
  private audioPlayerMute = false;
  private activeSources: AudioBufferSourceNode[] = [];
  currentAudio: HTMLAudioElement | null = null;

  /** Master list of all sounds in the app */
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
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async preloadAll(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('⚠️ Failed to resume AudioContext before preload:', err);
      }
    }
    await Promise.all(this.ALL_SOUNDS.map(name => this.loadAudio(name)));
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
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // ✅ reuse the same buffer in the pool (instead of decoding multiple times)
      this.audioBuffers[name] = Array(poolSize).fill(buffer);
      this.indexes[name] = 0;
    } catch (error) {
      console.error(`❌ Failed to load or decode ${url}:`, error);
      delete this.audioBuffers[name];
    }
  }

  private async playBuffer(name: string): Promise<void> {
    const buffers = this.audioBuffers[name];
    if (!buffers?.length) return;

    if (this.audioContext.state !== 'running') {
      await this.audioContext.resume();
    }

    const index = this.indexes[name] ?? 0;
    const buffer = buffers[index];
    this.indexes[name] = (index + 1) % buffers.length;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    // 👉 track active sources
    this.activeSources.push(source);
    source.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== source);
    };

    source.start(0);
  }


  async playSound(name: string): Promise<void> {
    // Skip voice if muted
    if (localStorage.getItem('voiceMute') === 'true') return;
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    // Ensure buffer exists, reload if necessary
    if (!this.audioBuffers[name] || this.audioBuffers[name].length === 0) {
      this.clearBuffer(name);
      await this.loadAudio(name);
    }

    await this.playBuffer(name);
  }

  private clearBuffer(name: string): void {
    delete this.audioBuffers[name];
    delete this.indexes[name];
  }



  async playBell(name: string = 'bell'): Promise<void> {
    if (localStorage.getItem('bellMute') === 'true') return;
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    // Ensure buffer exists, reload if necessary
    if (!this.audioBuffers[name] || this.audioBuffers[name].length === 0) {
      this.clearBuffer(name);
      await this.loadAudio(name);
    }

    const buffers = this.audioBuffers[name];
    if (!buffers?.length) {
      console.warn(`⚠️ No bell buffers available for ${name}`);
      return;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const index = this.indexes[name] ?? 0;
      const buffer = buffers[index];
      this.indexes[name] = (index + 1) % buffers.length;

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (err) {
      console.warn(`⚠️ Failed to play bell ${name}:`, err);
    }
  }

  async playBreath(name: string): Promise<void> {
    if (localStorage.getItem('breathMute') === 'true') {
      return;
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    // Ensure buffer exists, reload if necessary
    if (!this.audioBuffers[name] || this.audioBuffers[name].length === 0) {
      this.clearBuffer(name);
      await this.loadAudio(name);
    }

    const buffers = this.audioBuffers[name];
    if (!buffers?.length) {
      console.warn(`⚠️ No breath buffers available for ${name}`);
      return;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const index = this.indexes[name] ?? 0;
      const buffer = buffers[index];
      this.indexes[name] = (index + 1) % buffers.length;

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (err) {
      console.warn(`⚠️ Failed to play breath sound ${name}:`, err);
    }
  }


  async playBreathSound(
    name: 'inhaleBreath' | 'exhaleBreath' | 'humming',
    durationSec: number
  ): Promise<void> {
    if (localStorage.getItem('vibrMute') === 'true') {
    }else{
      await Haptics.vibrate();
    }
    if (localStorage.getItem('breathMute') === 'true') {
      return;
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    await this.loadAudio(name);

    const buffers = this.audioBuffers[name];
    if (!buffers || buffers.length === 0) {
      console.warn(`⚠️ No buffers available for ${name}`);
      return;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const index = this.indexes[name] ?? 0;
      const buffer = buffers[index];
      this.indexes[name] = (index + 1) % buffers.length;

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      // Stretch playback (use seconds consistently)
      const originalDuration = buffer.duration; // in seconds
      const rate = originalDuration / durationSec;
      source.playbackRate.value = rate;

      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (err) {
      console.warn(`⚠️ Failed to start breathSound ${name}:`, err);
    }
  }
  async vibrateFor(durationMs: number, interval = 300) {
    const endTime = Date.now() + durationMs;
    while (Date.now() < endTime) {
      await Haptics.vibrate();
      await new Promise(res => setTimeout(res, interval));
    }
  }

  // 🎵 Background music
  async initializeSong(): Promise<void> {
    if (this.currentAudio) return;

    const selectedSongUrl = localStorage.getItem('selectedSong') || 'assets/audio/healingFrequency.mp3';
    if (!localStorage.getItem('selectedSong')) {
      localStorage.setItem('selectedSong', selectedSongUrl);
    }

    this.audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
    
    this.currentAudio = this.audioPlayerMute
      ? new Audio('assets/audio/silent.mp3')
      : new Audio(selectedSongUrl);

    this.currentAudio.loop = true;

    await new Promise<void>((resolve) => {
      this.currentAudio!.addEventListener('canplaythrough', () => resolve(), { once: true });
      this.currentAudio!.load();
    });
  }

  playSelectedSong(): void {
    this.currentAudio?.play().catch(err => console.warn('⚠️ Failed to play song:', err));
    this.disableMediaSession();
  }



  pauseSelectedSong(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    // 🧹 Stop any lingering scheduled sounds
    this.activeSources.forEach(s => {
      try { s.stop(); } catch {}
    });
    this.activeSources = [];
    this.disableMediaSession();
  }

  private disableMediaSession(): void {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';

       const nullHandler = () => {
        };
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
  }
  async resetaudio(): Promise<void> {
    try {
      // ✅ 1. Ensure AudioContext exists or recreate it if closed
      if (!this.audioContext || this.audioContext.state === 'closed') {
        console.warn('AudioContext was closed — recreating...');
        this.createAudioContext();
      }

      // ✅ 2. Resume if suspended (common after background)
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
          console.log('🎧 AudioContext resumed');
        } catch (err) {
          console.warn('⚠️ Failed to resume AudioContext:', err);
        }
      }

      // ✅ 3. Clean up inactive sources
      this.activeSources = this.activeSources.filter(src => {
        // The only reliable way is to check if it's still connected
        try {
          // Accessing src.buffer ensures it's valid
          return !!src.buffer;
        } catch {
          return false;
        }
      });

      // ✅ 4. Recreate or reconnect the background song if necessary
      if (!this.currentAudio) {
        await this.initializeSong();
      }
    } catch (err) {
      console.error('❌ resetaudio critical error:', err);
    }
  }
}
