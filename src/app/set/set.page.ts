import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service'; 
import { AudioService } from '../services/audio.service'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-set',
  templateUrl: './set.page.html',
  styleUrls: ['./set.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class SetPage implements AfterViewInit, OnDestroy {
  @ViewChild('setaudio') setaudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setmute') setmute!: ElementRef<HTMLDivElement>;
  @ViewChild('setVaudio') setVaudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setVmute') setVmute!: ElementRef<HTMLDivElement>;
  @ViewChild('setBaudio') setBaudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setBmute') setBmute!: ElementRef<HTMLDivElement>;
  @ViewChild('volumeBarSet') volumeBarSet!: ElementRef<HTMLInputElement>;
  @ViewChild('voiceBarSet') voiceBarSet!: ElementRef<HTMLInputElement>;
  @ViewChild('bellBarSet') bellBarSet!: ElementRef<HTMLInputElement>;
  @ViewChild('songSelectSet') songSelectSet!: ElementRef<HTMLSelectElement>; // Reference to the select element

  private currentAudio: HTMLAudioElement | null = null; // To keep track of the currently playing audio
  private timeoutIdSet: any; // To store the timeout ID for stopping audio playback
  private audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
  private voiceMute = localStorage.getItem('voiceMute') === 'true';
  private bellMute = localStorage.getItem('bellMute') === 'true';


  constructor(private navCtrl: NavController, private globalService: GlobalService, private audioService: AudioService) {}

  // Method called when the user selects a song
  onSongChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedSong = selectElement.value;
    localStorage.setItem('selectedSong', selectedSong); // Save the selected song in local storage

    // Pause the currently playing audio if any
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0; // Reset the audio to the start
      clearTimeout(this.timeoutIdSet); // Clear the previous timeout to prevent auto-pause of the new audio
    }

    // Create a new audio instance for the selected song
    this.currentAudio = new Audio(selectedSong);
    this.currentAudio.muted = false;
    this.currentAudio.load();
    this.currentAudio.play();

    // Set a timeout to pause the audio after 15 seconds
    this.timeoutIdSet = setTimeout(() => {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0; // Reset the audio to the start
      }
    }, 15000);
  }

  // Lifecycle hook to initialize the DOM elements and set the selected song
  ngAfterViewInit(): void {
    // Retrieve the saved song from local storage
    const savedSong = localStorage.getItem('selectedSong');

    // If a saved song exists, set it as the selected value in the select element
    if (savedSong) {
      const options = this.songSelectSet.nativeElement.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === savedSong) {
          options[i].selected = true;
          break;
        }
      }
    }

    // Add event listener for volume changes
    this.volumeBarSet.nativeElement.addEventListener('input', () => this.handleVolumeChange());
    this.voiceBarSet.nativeElement.addEventListener('input', () => this.handleVoiceChange());
    this.bellBarSet.nativeElement.addEventListener('input', () => this.handleBellChange());
  }

  ionViewWillEnter() {
    // Refresh the content every time the page becomes active
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    if (isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    }else{
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
    if(this.audioPlayerMute){
      this.volumeBarSet.nativeElement.value = '0';
      this.setaudio.nativeElement.style.display = 'none';
      this.setmute.nativeElement.style.display = 'block';
    }else{
      this.volumeBarSet.nativeElement.value = '1';
      this.setmute.nativeElement.style.display = 'none';
      this.setaudio.nativeElement.style.display = 'block';
    }
    if(this.voiceMute){
      this.voiceBarSet.nativeElement.value = '0';
      this.setVaudio.nativeElement.style.display = 'none';
      this.setVmute.nativeElement.style.display = 'block';
    }else{
      this.voiceBarSet.nativeElement.value = '1';
      this.setVmute.nativeElement.style.display = 'none';
      this.setVaudio.nativeElement.style.display = 'block';
    }
    if(this.bellMute){
      this.bellBarSet.nativeElement.value = '0';
      this.setBaudio.nativeElement.style.display = 'none';
      this.setBmute.nativeElement.style.display = 'block';
    }else{
      this.bellBarSet.nativeElement.value = '1';
      this.setBmute.nativeElement.style.display = 'none';
      this.setBaudio.nativeElement.style.display = 'block';
    }
  }
  // Method to handle the volume change
  handleVolumeChange(): void {
    const volumeSet = parseFloat(this.volumeBarSet.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSet === 0) {
      localStorage.setItem('audioPlayerMute', 'true');
      this.setaudio.nativeElement.style.display = 'none';
      this.setmute.nativeElement.style.display = 'block';
    } else {
      localStorage.setItem('audioPlayerMute', 'false');
      this.setmute.nativeElement.style.display = 'none';
      this.setaudio.nativeElement.style.display = 'block';
    }
  }
  // Method to handle the volume change
  handleVoiceChange(): void {
    const volumeSet = parseFloat(this.voiceBarSet.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSet === 0) {
      localStorage.setItem('voiceMute', 'true');
      this.setVaudio.nativeElement.style.display = 'none';
      this.setVmute.nativeElement.style.display = 'block';
    } else {
      localStorage.setItem('voiceMute', 'false');
      this.setVmute.nativeElement.style.display = 'none';
      this.setVaudio.nativeElement.style.display = 'block';
    }
  }
  // Method to handle the volume change
  handleBellChange(): void {
    const volumeSet = parseFloat(this.bellBarSet.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSet === 0) {
      localStorage.setItem('bellMute', 'true');
      this.setBaudio.nativeElement.style.display = 'none';
      this.setBmute.nativeElement.style.display = 'block';
    } else {
      localStorage.setItem('bellMute', 'false');
      this.setBmute.nativeElement.style.display = 'none';
      this.setBaudio.nativeElement.style.display = 'block';
    }
  }
  // Method to navigate back
  goBack() {
    this.stopAudio(); // Stop the currently playing audio before navigating back
    this.navCtrl.back(); // Goes back to the previous page in the history stack
  }

  // Method to stop the audio when navigating away
  private stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0; // Reset the audio to the start
      clearTimeout(this.timeoutIdSet); // Clear the timeout
    }
  }

  // Lifecycle hook to stop audio if the component is destroyed
  ngOnDestroy(): void {
    this.stopAudio(); // Stop the audio if the user navigates away or the component is destroyed
  }
}
