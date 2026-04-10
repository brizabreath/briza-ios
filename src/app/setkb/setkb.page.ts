import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule
import { AudioService } from '../services/audio.service'; 

@Component({
  selector: 'app-setkb',
  templateUrl: './setkb.page.html',
  styleUrls: ['./setkb.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class SETKBPage implements AfterViewInit, OnDestroy {
  @ViewChild('setaudio') setaudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setmute') setmute!: ElementRef<HTMLDivElement>;
  @ViewChild('setVaudio') setVaudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setVmute') setVmute!: ElementRef<HTMLDivElement>;
  @ViewChild('setBrmute') setBrmute!: ElementRef<HTMLDivElement>;
  @ViewChild('setBraudio') setBraudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setBaudio') setBaudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setBmute') setBmute!: ElementRef<HTMLDivElement>;
  @ViewChild('volumeBarSETKB') volumeBarSETKB!: ElementRef<HTMLInputElement>;
  @ViewChild('setFemale') setFemale!: ElementRef<HTMLDivElement>;
  @ViewChild('setMale') setMale!: ElementRef<HTMLDivElement>;
  @ViewChild('maleBarSetKB') maleBarSetKB!: ElementRef<HTMLInputElement>;
  @ViewChild('voiceBarSETKB') voiceBarSETKB!: ElementRef<HTMLInputElement>;
  @ViewChild('breathBarSETKB') breathBarSETKB!: ElementRef<HTMLInputElement>;
  @ViewChild('bellBarSETKB') bellBarSETKB!: ElementRef<HTMLInputElement>;
  @ViewChild('songSelectSETKB') songSelectSETKB!: ElementRef<HTMLSelectElement>; // Reference to the select element
  @ViewChild('breathsetInputKB') breathsetInputKB!: ElementRef<HTMLInputElement>;
  @ViewChild('setVrmuteKB') setVrmuteKB!: ElementRef<HTMLDivElement>;
  @ViewChild('setVraudioKB') setVraudioKB!: ElementRef<HTMLDivElement>;
  @ViewChild('vibrBarSETKB') vibrBarSETKB!: ElementRef<HTMLInputElement>;

  private currentAudio: HTMLAudioElement | null = null; // To keep track of the currently playing audio
  private timeoutIdSETKB: any; // To store the timeout ID for stopping audio playback
  private audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
  private voiceMute = localStorage.getItem('voiceMute') === 'true';
  private breathMute = localStorage.getItem('breathMute') === 'true';
  private bellMute = localStorage.getItem('bellMute') === 'true';
  private KBbreaths: any = null;
  KBbreathSpeed: any = null; 
  private isFemale = localStorage.getItem('isFemale') === 'true';
  private vibrMute = localStorage.getItem('vibrMute') === 'true';
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  displayBreaths = 30;              
  speedLabel: 'Slow'|'Medium'|'Fast' = 'Medium';

  private SPEED_MAP: Record<'Slow'|'Medium'|'Fast', number> = {
    Slow: 700,
    Medium: 600,
    Fast: 500,
  };
  constructor(private navCtrl: NavController, private globalService: GlobalService, private audioService: AudioService) {}

  // Method called when the user selects a song
  async onSongChange(event: Event): Promise<void> {
    const selectElement = event.target as HTMLSelectElement;
    const selectedSong = selectElement.value;
    localStorage.setItem('selectedSong', selectedSong); // Save the selected song in local storage

    // Pause the currently playing audio if any
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0; // Reset the audio to the start
      clearTimeout(this.timeoutIdSETKB); // Clear the previous timeout to prevent auto-pause of the new audio
    }

    // Create a new audio instance for the selected song
    this.currentAudio = new Audio(selectedSong);
    this.currentAudio.muted = false;
    this.currentAudio.load();
    this.currentAudio.play();
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume(); 
    await this.audioService.initializeSong();

    // SETKB a timeout to pause the audio after 15 seconds
    this.timeoutIdSETKB = setTimeout(() => {
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
      const options = this.songSelectSETKB.nativeElement.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === savedSong) {
          options[i].selected = true;
          break;
        }
      }
    }

    // Add event listener for volume changes
    this.volumeBarSETKB.nativeElement.addEventListener('input', () => this.handleVolumeChange());
    this.voiceBarSETKB.nativeElement.addEventListener('input', () => this.handleVoiceChange());
    this.breathBarSETKB.nativeElement.addEventListener('input', () => this.handleBreathChange());
    this.bellBarSETKB.nativeElement.addEventListener('input', () => this.handleBellChange());
    this.maleBarSetKB.nativeElement.addEventListener('input', () => this.handleMaleChange());
    this.vibrBarSETKB.nativeElement.addEventListener('input', () => this.handlevibrChange());
  }

  ionViewWillEnter() {
    // Refresh the content every time the page becomes active
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
      this.syncBreathUIFromStorage();
    if(this.audioPlayerMute){
      this.volumeBarSETKB.nativeElement.value = '0';
      this.setaudio.nativeElement.style.display = 'none';
      this.setmute.nativeElement.style.display = 'block';
    }else{
      this.volumeBarSETKB.nativeElement.value = '1';
      this.setmute.nativeElement.style.display = 'none';
      this.setaudio.nativeElement.style.display = 'block';
    }
    if(this.voiceMute){
      this.voiceBarSETKB.nativeElement.value = '0';
      this.setVaudio.nativeElement.style.display = 'none';
      this.setVmute.nativeElement.style.display = 'block';
    }else{
      this.voiceBarSETKB.nativeElement.value = '1';
      this.setVmute.nativeElement.style.display = 'none';
      this.setVaudio.nativeElement.style.display = 'block';
    }
    if(this.breathMute){
      this.breathBarSETKB.nativeElement.value = '0';
      this.setBraudio.nativeElement.style.display = 'none';
      this.setBrmute.nativeElement.style.display = 'block';
    }else{
      this.breathBarSETKB.nativeElement.value = '1';
      this.setBrmute.nativeElement.style.display = 'none';
      this.setBraudio.nativeElement.style.display = 'block';
    }
    if(this.bellMute){
      this.bellBarSETKB.nativeElement.value = '0';
      this.setBaudio.nativeElement.style.display = 'none';
      this.setBmute.nativeElement.style.display = 'block';
    }else{
      this.bellBarSETKB.nativeElement.value = '1';
      this.setBmute.nativeElement.style.display = 'none';
      this.setBaudio.nativeElement.style.display = 'block';
    }
    if(this.isFemale){
      this.maleBarSetKB.nativeElement.value = '0';
      this.setMale.nativeElement.style.display = 'none';
      this.setFemale.nativeElement.style.display = 'block';
    }else{
      this.maleBarSetKB.nativeElement.value = '1';
      this.setFemale.nativeElement.style.display = 'none';
      this.setMale.nativeElement.style.display = 'block';
    }
    if(this.vibrMute){
      this.vibrBarSETKB.nativeElement.value = '0';
      this.setVraudioKB.nativeElement.style.display = 'none';
      this.setVrmuteKB.nativeElement.style.display = 'block';
    }else{
      this.vibrBarSETKB.nativeElement.value = '1';
      this.setVrmuteKB.nativeElement.style.display = 'none';
      this.setVraudioKB.nativeElement.style.display = 'block';
    }
    //set up breaths
    this.KBbreaths = localStorage.getItem('numberOfBreaths');
    // Check if it doesn't exist or is null
    if (this.KBbreaths === null) {
      this.KBbreaths = 31; // Default value
      localStorage.setItem('numberOfBreaths', this.KBbreaths.toString()); // Store it in localStorage
    } else {
      this.KBbreaths = parseInt(this.KBbreaths); // Convert the stored string to a number
    }
    this.breathsetInputKB.nativeElement.value = (this.KBbreaths - 1).toString();
  }
  // Method to handle the volume change
  handlevibrChange(): void {
    const volumeSET = parseFloat(this.vibrBarSETKB.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSET === 0) {
      localStorage.setItem('vibrMute', 'true');
      this.setVraudioKB.nativeElement.style.display = 'none';
      this.setVrmuteKB.nativeElement.style.display = 'block';
    } else {
      localStorage.setItem('vibrMute', 'false');
      this.setVrmuteKB.nativeElement.style.display = 'none';
      this.setVraudioKB.nativeElement.style.display = 'block';
    }
  }
  // Method to handle the volume change
  async handleVolumeChange(): Promise<void> {
    const volumeSETKB = parseFloat(this.volumeBarSETKB.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSETKB === 0) {
      localStorage.setItem('audioPlayerMute', 'true');
      this.setaudio.nativeElement.style.display = 'none';
      this.setmute.nativeElement.style.display = 'block';
      await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume(); 
      await this.audioService.initializeSong();
    } else {
      localStorage.setItem('audioPlayerMute', 'false');
      this.setmute.nativeElement.style.display = 'none';
      this.setaudio.nativeElement.style.display = 'block';
      await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume(); 
      await this.audioService.initializeSong();
    }
  }
  // Method to handle the volume change
  handleVoiceChange(): void {
    const volumeSETKB = parseFloat(this.voiceBarSETKB.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSETKB === 0) {
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
  handleBreathChange(): void {
    const volumeSETKB = parseFloat(this.breathBarSETKB.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSETKB === 0) {
      localStorage.setItem('breathMute', 'true');
      this.setBraudio.nativeElement.style.display = 'none';
      this.setBrmute.nativeElement.style.display = 'block';
    } else {
      localStorage.setItem('breathMute', 'false');
      this.setBrmute.nativeElement.style.display = 'none';
      this.setBraudio.nativeElement.style.display = 'block';
    }
  }
  // Method to handle the volume change
  handleBellChange(): void {
    const volumeSETKB = parseFloat(this.bellBarSETKB.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSETKB === 0) {
      localStorage.setItem('bellMute', 'true');
      this.setBaudio.nativeElement.style.display = 'none';
      this.setBmute.nativeElement.style.display = 'block';
    } else {
      localStorage.setItem('bellMute', 'false');
      this.setBmute.nativeElement.style.display = 'none';
      this.setBaudio.nativeElement.style.display = 'block';
    }
  }
  // Method to handle the volume change
  handleMaleChange(): void {
    const volumeSet = parseFloat(this.maleBarSetKB.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSet === 0) {
      localStorage.setItem('isFemale', 'true');
      this.setMale.nativeElement.style.display = 'none';
      this.setFemale.nativeElement.style.display = 'block';
    } else {
      localStorage.setItem('isFemale', 'false');
      this.setFemale.nativeElement.style.display = 'none';
      this.setMale.nativeElement.style.display = 'block';
    }
    this.audioService.clearAllAudioBuffers();
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
      clearTimeout(this.timeoutIdSETKB); // Clear the timeout
    }
  }

  // Lifecycle hook to stop audio if the component is destroyed
  ngOnDestroy(): void {
    this.stopAudio(); // Stop the audio if the user navigates away or the component is destroyed
  }

  private getNumberOfBreathsRaw(): number {
    const raw = parseInt(localStorage.getItem('numberOfBreaths') || '31', 10);
    // clamp
    return Math.max(11, Math.min(101, raw));
  }

  private setNumberOfBreathsRaw(raw: number) {
    const clamped = Math.max(11, Math.min(101, raw));
    localStorage.setItem('numberOfBreaths', String(clamped));
    this.displayBreaths = clamped - 1;
  }

  // - button
  decBreaths() {
    const raw = this.getNumberOfBreathsRaw();
    if (raw > 11) this.setNumberOfBreathsRaw(raw - 10);
  }

  // + button
  incBreaths() {
    const raw = this.getNumberOfBreathsRaw();
    if (raw < 101) this.setNumberOfBreathsRaw(raw + 10);
  }

  setSpeed(label: 'Slow'|'Medium'|'Fast') {
    this.speedLabel = label;
    const ms = this.SPEED_MAP[label];
    localStorage.setItem('KBspeedOfBreaths', String(ms));
    this.KBbreathSpeed = ms;
  }

  // call this on enter to sync UI from storage
  private syncBreathUIFromStorage() {
    // breaths
    const rawBreaths = this.getNumberOfBreathsRaw();
    this.displayBreaths = rawBreaths - 1;

    // speed
    const rawSpeed = parseInt(localStorage.getItem('KBspeedOfBreaths') || '600', 10);

    if (rawSpeed >= 700) this.speedLabel = 'Slow';
    else if (rawSpeed <= 500) this.speedLabel = 'Fast';
    else this.speedLabel = 'Medium';

    this.KBbreathSpeed = rawSpeed;
  }
}
