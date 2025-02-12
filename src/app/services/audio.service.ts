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
    if (this.audioObjects[name]) {
      this.audioObjects[name].currentTime = 0; // Reset to start
      this.audioObjects[name].loop = false;
      this.audioObjects[name].play();
    } else {
      console.error(`Audio ${name} not found.`);
    }
  }

  // Method to play the selected song from local storage
  playSelectedSong(): void {
    if (this.currentAudio) {
      this.currentAudio.loop = true; // Enable loop
      this.currentAudio.play();
    }
  }


  // Method to pause the currently playing song
  pauseSelectedSong(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }
}
