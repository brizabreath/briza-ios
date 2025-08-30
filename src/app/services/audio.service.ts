import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private audioContext!: AudioContext;
  private audioBuffers: { [key: string]: AudioBuffer[] } = {};
  private indexes: { [key: string]: number } = {};

  private voiceMute = false;
  private bellMute = false;
  private audioPlayerMute = false;
  private breathMute = false;

 currentAudio: HTMLAudioElement | null = null;

  constructor() {
    this.createAudioContext();

    // Resume audio context when app comes back from background
    App.addListener('resume', () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('🔊 AudioContext resumed after resume');
        }).catch(err => {
          console.warn('⚠️ Failed to resume AudioContext:', err);
        });
      }
    });
  }

  private createAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private async loadAudio(name: string): Promise<void> {
    if (this.audioBuffers[name]) return; // Already loaded

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

      const decodedBuffers: AudioBuffer[] = [];
      for (let i = 0; i < poolSize; i++) {
        const buffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
        decodedBuffers.push(buffer);
      }

      this.audioBuffers[name] = decodedBuffers;
      this.indexes[name] = 0;
    } catch (error) {
      console.error(`❌ Failed to load or decode ${name}:`, error);
      delete this.audioBuffers[name]; // Mark as not loaded
    }
  }

  private playBuffer(name: string): void {
    const buffers = this.audioBuffers[name];
    if (!buffers || buffers.length === 0) return;

    const index = this.indexes[name] ?? 0;
    const buffer = buffers[index];
    this.indexes[name] = (index + 1) % buffers.length;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    try {
      source.start(0);
    } catch (err) {
      console.warn(`⚠️ Failed to start playback for ${name}:`, err);
      this.audioContext.resume().catch(() => {});
    }
  }

  async playSound(name: string): Promise<void> {
    this.voiceMute = localStorage.getItem('voiceMute') === 'true';
    if (this.voiceMute) return;

    await this.loadAudio(name);
    this.playBuffer(name);
  }

  async playBell(name: string): Promise<void> {
    this.bellMute = localStorage.getItem('bellMute') === 'true';
    if (this.bellMute) return;

    await this.loadAudio(name);
    this.playBuffer(name);
  }

  async playBreath(name: string): Promise<void> {
    this.breathMute = localStorage.getItem('breathMute') === 'true';
    if (this.breathMute) return;

    await this.loadAudio(name);
    this.playBuffer(name);
  }

  initializeSong(): void {
    if (this.currentAudio) return;

    const selectedSongUrl =
      localStorage.getItem('selectedSong') || 'assets/audio/healingFrequency.mp3';

    if (!localStorage.getItem('selectedSong')) {
      localStorage.setItem('selectedSong', selectedSongUrl);
    }
    this.audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';  
    if (this.audioPlayerMute){
      this.currentAudio = new Audio('assets/audio/silent.mp3');
    }else{
      this.currentAudio = new Audio(selectedSongUrl);
    }
    this.currentAudio.loop = true;
    this.currentAudio.load();
  }

  playSelectedSong(): void {
    if (!this.currentAudio) {
      this.initializeSong();
    }

    this.currentAudio?.play();
  }

  pauseSelectedSong(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio.load();
      this.currentAudio = null;
    }

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;

        const nullHandler = () => {
          console.log('🔒 Ignored lock screen media control');
        };

        navigator.mediaSession.setActionHandler('play', nullHandler);
        navigator.mediaSession.setActionHandler('pause', nullHandler);
        navigator.mediaSession.setActionHandler('seekbackward', nullHandler);
        navigator.mediaSession.setActionHandler('seekforward', nullHandler);
        navigator.mediaSession.setActionHandler('previoustrack', nullHandler);
        navigator.mediaSession.setActionHandler('nexttrack', nullHandler);
      } catch (e) {
        console.warn('⚠️ MediaSession handler clear failed', e);
      }
    }
  }
  clearAllAudioBuffers(): void {
    this.audioBuffers = {};
  }
  async playBreathSound(name: 'inhaleBreath' | 'exhaleBreath' | 'humming', durationMs: number): Promise<void> {
    this.breathMute = localStorage.getItem('breathMute') === 'true';
    if (this.breathMute) return;

    await this.loadAudio(name);

    const buffers = this.audioBuffers[name];
    if (!buffers || buffers.length === 0) return;

    const index = this.indexes[name] ?? 0;
    const buffer = buffers[index];
    this.indexes[name] = (index + 1) % buffers.length;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // PlaybackRate adjustment for stretching
    const originalDuration = buffer.duration;
    const rate = originalDuration / (durationMs);
    source.playbackRate.value = rate;

    source.connect(this.audioContext.destination);

    try {
      source.start(0);
    } catch (err) {
      console.warn(`⚠️ Failed to start breathSound ${name}:`, err);
      this.audioContext.resume().catch(() => {});
    }
  }
}
