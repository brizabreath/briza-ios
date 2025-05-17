import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  audioObjects: { [key: string]: HTMLAudioElement[] } = {};
  breathIndexes: { [key: string]: number } = {};
  soundIndexes: { [key: string]: number } = {};
  bellIndexes: { [key: string]: number } = {};
  currentAudio: HTMLAudioElement | null = null;

  private voiceMute = false;
  private bellMute = false;
  private audioPlayerMute = false;
  private breathMute = false;

  constructor() {}

  initializeAudioObjects(name: string): void {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    const isFemale = localStorage.getItem('isFemale') === 'true';

    const audioUrl = `https://brizastorage.blob.core.windows.net/sounds/${name}${isPortuguese ? 'PT' : ''}${isFemale ? 'F' : ''}.mp3`;

    let poolSize = 1;
    if (['fullyin', 'fullyout', 'fullyout2'].includes(name)) poolSize = 3; // Breath sounds
    else if (name === 'bell') poolSize = 2; // Bell
    else poolSize = 5; // General voice sounds

    const pool: HTMLAudioElement[] = [];

    for (let i = 0; i < poolSize; i++) {
      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audio.setAttribute('controls', 'false');
      audio.load();
      pool.push(audio);
    }

    this.audioObjects[name] = pool;

    if (['fullyin', 'fullyout', 'fullyout2'].includes(name)) {
      this.breathIndexes[name] = 0;
    } else if (name === 'bell') {
      this.bellIndexes[name] = 0;
    } else {
      this.soundIndexes[name] = 0;
    }
  }

  initializeSong(): void {
    const selectedSongUrl =
      localStorage.getItem('selectedSong') ||
      'https://brizastorage.blob.core.windows.net/audio/healingFrequency.mp3';

    if (!localStorage.getItem('selectedSong')) {
      localStorage.setItem('selectedSong', selectedSongUrl);
    }

    this.currentAudio = new Audio(selectedSongUrl);
    this.currentAudio.loop = true;
    this.currentAudio.load();
  }

  playSelectedSong(): void {
    this.audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
    if (this.audioPlayerMute) return;

    if (!this.currentAudio) {
      this.initializeSong();
    }

    this.currentAudio?.play();
  }

  pauseSelectedSong(): void {
    this.audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
    if (this.audioPlayerMute) return;

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

  private playFromPool(pool: HTMLAudioElement[], name: string, indexMap: { [key: string]: number }, key: string): void {
    if (!pool || pool.length === 0) return;

    const index = indexMap[key] ?? 0;
    const audio = pool[index];
    indexMap[key] = (index + 1) % pool.length;

    try {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }

      audio.play().catch(err => {
        console.warn(`Retrying ${name} after play() failed once:`, err);
        setTimeout(() => {
          audio.currentTime = 0;
          audio.play().catch(err2 => {
            console.error(`Failed to play ${name} after retry:`, err2);
          });
        }, 50);
      });
    } catch (err) {
      console.error(`Audio error for ${name}:`, err);
    }
  }

  playSound(name: string): void {
    this.voiceMute = localStorage.getItem('voiceMute') === 'true';
    if (this.voiceMute) return;

    const pool = this.audioObjects[name];
    this.playFromPool(pool, name, this.soundIndexes, name);
  }

  playBell(name: string): void {
    this.bellMute = localStorage.getItem('bellMute') === 'true';
    if (this.bellMute) return;

    const pool = this.audioObjects[name];
    this.playFromPool(pool, name, this.bellIndexes, name);
  }

  playBreath(name: string): void {
    this.breathMute = localStorage.getItem('breathMute') === 'true';
    if (this.breathMute) return;

    const pool = this.audioObjects[name];
    this.playFromPool(pool, name, this.breathIndexes, name);
  }
}
