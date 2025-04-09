import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  audioObjects: { [key: string]: HTMLAudioElement } = {};
  currentAudio: HTMLAudioElement | null = null;

  constructor() {}

  // Method to initialize audio objects
  initializeAudioObjects(name: string): void {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true'; // Adjust based on how you determine language
    this.audioObjects[name] = new Audio(
      `https://brizastorage.blob.core.windows.net/sounds/${name}${isPortuguese ? 'PT' : ''}.mp3`
    );
    this.audioObjects[name].load();
  }
  initializeSong(): void{
    const selectedSongUrl = localStorage.getItem('selectedSong');
    if (selectedSongUrl) {
        this.currentAudio = new Audio(selectedSongUrl);
        this.currentAudio.load();
    } else {
      const defaultSong = 'https://brizastorage.blob.core.windows.net/audio/healingFrequency.mp3'; // Default song URL
      localStorage.setItem('selectedSong', defaultSong); // Save the default song in local storage
      this.currentAudio = new Audio(defaultSong);
      this.currentAudio.load();
    }
  }
  // Method to play a specific sound by name
  playSound(name: string): void {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    const audioUrl = `https://brizastorage.blob.core.windows.net/sounds/${name}${isPortuguese ? 'PT' : ''}.mp3`;
  
    // 🔥 Use Web Audio API instead of HTMLAudioElement
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    fetch(audioUrl)
      .then(response => response.arrayBuffer())
      .then(data => audioContext.decodeAudioData(data))
      .then(buffer => {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
      })
      .catch(error => console.error(`Failed to play sound: ${name}`, error));
  }
  

  // Method to play the selected song from local storage
  playSelectedSong(): void {
    if (!this.currentAudio) {
      console.log("🎵 Reloading audio...");
      const selectedSongUrl = localStorage.getItem('selectedSong') || 'https://brizastorage.blob.core.windows.net/audio/healingFrequency.mp3';
      this.currentAudio = new Audio(selectedSongUrl);
      this.currentAudio.load(); // 🔥 Ensure preloading
    }
  
    this.currentAudio.loop = true;
    this.currentAudio.play();
  }
  

  // Method to pause the currently playing song
  pauseSelectedSong(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = ''; // 🔥 Remove source to unload
      this.currentAudio.load();   // 🔥 Reset audio
      this.currentAudio = null;   // 🔥 Make sure it's null so we can recreate it later
    }
  
    // 🔥 Unregister media session (prevents lock screen controls)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    }
  }  
}
