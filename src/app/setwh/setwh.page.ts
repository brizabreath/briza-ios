import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule
import { AudioService } from '../services/audio.service';   

@Component({
  selector: 'app-setwh',
  templateUrl: './setwh.page.html',
  styleUrls: ['./setwh.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class SETWHPage implements AfterViewInit, OnDestroy {
  @ViewChild('setaudio') setaudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setmute') setmute!: ElementRef<HTMLDivElement>;
  @ViewChild('setVaudio') setVaudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setVmute') setVmute!: ElementRef<HTMLDivElement>;
  @ViewChild('setBrmute') setBrmute!: ElementRef<HTMLDivElement>;
  @ViewChild('setBraudio') setBraudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setBaudio') setBaudio!: ElementRef<HTMLDivElement>;
  @ViewChild('setBmute') setBmute!: ElementRef<HTMLDivElement>;
  @ViewChild('volumeBarSETWH') volumeBarSETWH!: ElementRef<HTMLInputElement>;
  @ViewChild('voiceBarSETWH') voiceBarSETWH!: ElementRef<HTMLInputElement>;
  @ViewChild('breathBarSETWH') breathBarSETWH!: ElementRef<HTMLInputElement>;
  @ViewChild('bellBarSETWH') bellBarSETWH!: ElementRef<HTMLInputElement>;
  @ViewChild('songSelectSETWH') songSelectSETWH!: ElementRef<HTMLSelectElement>; // Reference to the select element
  @ViewChild('minusWH') minusWH!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusWH') plusWH!: ElementRef<HTMLButtonElement>;
  @ViewChild('SminusWH') SminusWH!: ElementRef<HTMLButtonElement>;
  @ViewChild('SplusWH') SplusWH!: ElementRef<HTMLButtonElement>;
  @ViewChild('breathsetInputWH') breathsetInputWH!: ElementRef<HTMLInputElement>;
  @ViewChild('speedsetInputWH') speedsetInputWH!: ElementRef<HTMLInputElement>;
  @ViewChild('setFemale') setFemale!: ElementRef<HTMLDivElement>;
  @ViewChild('setMale') setMale!: ElementRef<HTMLDivElement>;
  @ViewChild('maleBarSetWH') maleBarSetWH!: ElementRef<HTMLInputElement>;
  @ViewChild('setVrmuteWH') setVrmuteWH!: ElementRef<HTMLDivElement>;
  @ViewChild('setVraudioWH') setVraudioWH!: ElementRef<HTMLDivElement>;
  @ViewChild('vibrBarSETWH') vibrBarSETWH!: ElementRef<HTMLInputElement>;

  private currentAudio: HTMLAudioElement | null = null; // To keep track of the currently playing audio
  private timeoutIdSETWH: any; // To store the timeout ID for stopping audio playback
  private audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
  private voiceMute = localStorage.getItem('voiceMute') === 'true';
  private breathMute = localStorage.getItem('breathMute') === 'true';
  private bellMute = localStorage.getItem('bellMute') === 'true';
  private WHbreaths: any = null;
  private WHbreathSpeed: any = null; 
  private isFemale = localStorage.getItem('isFemale') === 'true';
  private vibrMute = localStorage.getItem('vibrMute') === 'true';


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
      clearTimeout(this.timeoutIdSETWH); // Clear the previous timeout to prevent auto-pause of the new audio
    }

    // Create a new audio instance for the selected song
    this.currentAudio = new Audio(selectedSong);
    this.currentAudio.muted = false;
    this.currentAudio.load();
    this.currentAudio.play();
    if(this.audioService.currentAudio){
      this.audioService.currentAudio.src = '';
      this.audioService.currentAudio.load();
      this.audioService.currentAudio = null;
      await this.audioService.initializeSong();
    }
    // SETWH a timeout to pause the audio after 15 seconds
    this.timeoutIdSETWH = setTimeout(() => {
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
      const options = this.songSelectSETWH.nativeElement.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === savedSong) {
          options[i].selected = true;
          break;
        }
      }
    }

    // Add event listener for volume changes
    this.volumeBarSETWH.nativeElement.addEventListener('input', () => this.handleVolumeChange());
    this.voiceBarSETWH.nativeElement.addEventListener('input', () => this.handleVoiceChange());
    this.breathBarSETWH.nativeElement.addEventListener('input', () => this.handleBreathChange());
    this.bellBarSETWH.nativeElement.addEventListener('input', () => this.handleBellChange());
    this.maleBarSetWH.nativeElement.addEventListener('input', () => this.handleMaleChange());
    this.vibrBarSETWH.nativeElement.addEventListener('input', () => this.handlevibrChange());
    // Add event listener for breath changes
    this.minusWH.nativeElement.onclick = () => this.handleMinusChange();
    this.plusWH.nativeElement.onclick = () => this.handlePlusChange();
    this.SminusWH.nativeElement.onclick = () => this.handleSMinusChange();
    this.SplusWH.nativeElement.onclick = () => this.handleSPlusChange();
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
      this.volumeBarSETWH.nativeElement.value = '0';
      this.setaudio.nativeElement.style.display = 'none';
      this.setmute.nativeElement.style.display = 'block';
    }else{
      this.volumeBarSETWH.nativeElement.value = '1';
      this.setmute.nativeElement.style.display = 'none';
      this.setaudio.nativeElement.style.display = 'block';
    }
    if(this.voiceMute){
      this.voiceBarSETWH.nativeElement.value = '0';
      this.setVaudio.nativeElement.style.display = 'none';
      this.setVmute.nativeElement.style.display = 'block';
    }else{
      this.voiceBarSETWH.nativeElement.value = '1';
      this.setVmute.nativeElement.style.display = 'none';
      this.setVaudio.nativeElement.style.display = 'block';
    }
    if(this.breathMute){
      this.breathBarSETWH.nativeElement.value = '0';
      this.setBraudio.nativeElement.style.display = 'none';
      this.setBrmute.nativeElement.style.display = 'block';
    }else{
      this.breathBarSETWH.nativeElement.value = '1';
      this.setBrmute.nativeElement.style.display = 'none';
      this.setBraudio.nativeElement.style.display = 'block';
    }
    if(this.bellMute){
      this.bellBarSETWH.nativeElement.value = '0';
      this.setBaudio.nativeElement.style.display = 'none';
      this.setBmute.nativeElement.style.display = 'block';
    }else{
      this.bellBarSETWH.nativeElement.value = '1';
      this.setBmute.nativeElement.style.display = 'none';
      this.setBaudio.nativeElement.style.display = 'block';
    }
    if(this.isFemale){
      this.maleBarSetWH.nativeElement.value = '0';
      this.setMale.nativeElement.style.display = 'none';
      this.setFemale.nativeElement.style.display = 'block';
    }else{
      this.maleBarSetWH.nativeElement.value = '1';
      this.setFemale.nativeElement.style.display = 'none';
      this.setMale.nativeElement.style.display = 'block';
    }
    if(this.vibrMute){
      this.vibrBarSETWH.nativeElement.value = '0';
      this.setVraudioWH.nativeElement.style.display = 'none';
      this.setVrmuteWH.nativeElement.style.display = 'block';
    }else{
      this.vibrBarSETWH.nativeElement.value = '1';
      this.setVrmuteWH.nativeElement.style.display = 'none';
      this.setVraudioWH.nativeElement.style.display = 'block';
    }
    //set up breaths
    this.WHbreaths = localStorage.getItem('numberOfBreaths');
    // Check if it doesn't exist or is null
    if (this.WHbreaths === null) {
      this.WHbreaths = 31; // Default value
      localStorage.setItem('numberOfBreaths', this.WHbreaths.toString()); // Store it in localStorage
    } else {
      this.WHbreaths = parseInt(this.WHbreaths); // Convert the stored string to a number
    }
    this.WHbreathSpeed = localStorage.getItem('speedOfBreaths');
    // Check if it doesn't exist or is null
    if (this.WHbreathSpeed === null) {
      this.WHbreathSpeed = 1900; // Default value
      localStorage.setItem('speedOfBreaths', this.WHbreathSpeed.toString()); // Store it in localStorage
      this.speedsetInputWH.nativeElement.value = "Medium";
    } else {
      if(this.WHbreathSpeed == 2200){
        this.speedsetInputWH.nativeElement.value = "Slow";
      } else if(this.WHbreathSpeed == 1900){
        this.speedsetInputWH.nativeElement.value = "Medium";
      } else if(this.WHbreathSpeed == 1600){
        this.speedsetInputWH.nativeElement.value = "Fast";
      } 
      this.WHbreathSpeed = parseInt(this.WHbreathSpeed); // Convert the stored string to a number
    }
    this.breathsetInputWH.nativeElement.value = (this.WHbreaths - 1).toString();
  }
  handleMinusChange():void{
    if (this.WHbreaths > 11) {
      this.WHbreaths = this.WHbreaths - 10;
      this.breathsetInputWH.nativeElement.value = (this.WHbreaths - 1).toString();
      localStorage.setItem('numberOfBreaths', this.WHbreaths.toString()); // Store it in localStorage
    }
  }
  handlePlusChange():void{
    if (this.WHbreaths < 71) {
      this.WHbreaths = this.WHbreaths + 10;
      this.breathsetInputWH.nativeElement.value = (this.WHbreaths - 1).toString();
      localStorage.setItem('numberOfBreaths', this.WHbreaths.toString()); // Store it in localStorage
    }
  }
  handleSMinusChange():void{
    if (this.speedsetInputWH.nativeElement.value == "Medium") {
      this.speedsetInputWH.nativeElement.value = "Slow";
      this.WHbreathSpeed = 2200;
      localStorage.setItem('speedOfBreaths', this.WHbreathSpeed.toString()); // Store it in localStorage
    }
    else if (this.speedsetInputWH.nativeElement.value == "Fast") {
      this.speedsetInputWH.nativeElement.value = "Medium";
      this.WHbreathSpeed = 1900;
      localStorage.setItem('speedOfBreaths', this.WHbreathSpeed.toString()); // Store it in localStorage
    }
  }
  handleSPlusChange():void{
    if (this.speedsetInputWH.nativeElement.value == "Slow") {
      this.speedsetInputWH.nativeElement.value = "Medium";
      this.WHbreathSpeed = 1900;
      localStorage.setItem('speedOfBreaths', this.WHbreathSpeed.toString()); // Store it in localStorage
    }
    else if (this.speedsetInputWH.nativeElement.value == "Medium") {
      this.speedsetInputWH.nativeElement.value = "Fast";
      this.WHbreathSpeed = 1600;
      localStorage.setItem('speedOfBreaths', this.WHbreathSpeed.toString()); // Store it in localStorage
    }
  }
  // Method to handle the volume change
  handlevibrChange(): void {
    const volumeSET = parseFloat(this.vibrBarSETWH.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSET === 0) {
      localStorage.setItem('vibrMute', 'true');
      this.setVraudioWH.nativeElement.style.display = 'none';
      this.setVrmuteWH.nativeElement.style.display = 'block';
    } else {
      localStorage.setItem('vibrMute', 'false');
      this.setVrmuteWH.nativeElement.style.display = 'none';
      this.setVraudioWH.nativeElement.style.display = 'block';
    }
  }
  // Method to handle the volume change
  async handleVolumeChange(): Promise<void> {
    const volumeSETWH = parseFloat(this.volumeBarSETWH.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSETWH === 0) {
      localStorage.setItem('audioPlayerMute', 'true');
      this.setaudio.nativeElement.style.display = 'none';
      this.setmute.nativeElement.style.display = 'block';
      if(this.audioService.currentAudio){
      this.audioService.currentAudio.src = '';
      this.audioService.currentAudio.load();
      this.audioService.currentAudio = null;
      await this.audioService.initializeSong();
    }
    } else {
      localStorage.setItem('audioPlayerMute', 'false');
      this.setmute.nativeElement.style.display = 'none';
      this.setaudio.nativeElement.style.display = 'block';
      if(this.audioService.currentAudio){
      this.audioService.currentAudio.src = '';
      this.audioService.currentAudio.load();
      this.audioService.currentAudio = null;
      await this.audioService.initializeSong();
    }
    }
  }
  // Method to handle the volume change
  handleVoiceChange(): void {
    const volumeSETWH = parseFloat(this.voiceBarSETWH.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSETWH === 0) {
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
    const volumeSETWH = parseFloat(this.breathBarSETWH.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSETWH === 0) {
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
    const volumeSETWH = parseFloat(this.bellBarSETWH.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSETWH === 0) {
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
    const volumeSet = parseFloat(this.maleBarSetWH.nativeElement.value);

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
      clearTimeout(this.timeoutIdSETWH); // Clear the timeout
    }
  }

  // Lifecycle hook to stop audio if the component is destroyed
  ngOnDestroy(): void {
    this.stopAudio(); // Stop the audio if the user navigates away or the component is destroyed
  }
}
