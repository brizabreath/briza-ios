import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

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
  @ViewChild('minusKB') minusKB!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusKB') plusKB!: ElementRef<HTMLButtonElement>;
  @ViewChild('SminusKB') SminusKB!: ElementRef<HTMLButtonElement>;
  @ViewChild('SplusKB') SplusKB!: ElementRef<HTMLButtonElement>;
  @ViewChild('breathsetInputKB') breathsetInputKB!: ElementRef<HTMLInputElement>;
  @ViewChild('speedsetInputKB') speedsetInputKB!: ElementRef<HTMLInputElement>;


  private currentAudio: HTMLAudioElement | null = null; // To keep track of the currently playing audio
  private timeoutIdSETKB: any; // To store the timeout ID for stopping audio playback
  private audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
  private voiceMute = localStorage.getItem('voiceMute') === 'true';
  private breathMute = localStorage.getItem('breathMute') === 'true';
  private bellMute = localStorage.getItem('bellMute') === 'true';
  private KBbreaths: any = null;
  private KBbreathSpeed: any = null; 
  private isFemale = localStorage.getItem('isFemale') === 'true';

  constructor(private navCtrl: NavController, private globalService: GlobalService) {}

  // Method called when the user selects a song
  onSongChange(event: Event): void {
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
    // Add event listener for breath changes
    this.minusKB.nativeElement.onclick = () => this.handleMinusChange();
    this.plusKB.nativeElement.onclick = () => this.handlePlusChange();
    this.SminusKB.nativeElement.onclick = () => this.handleSMinusChange();
    this.SplusKB.nativeElement.onclick = () => this.handleSPlusChange();
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
    //set up breaths
    this.KBbreaths = localStorage.getItem('numberOfBreaths');
    // Check if it doesn't exist or is null
    if (this.KBbreaths === null) {
      this.KBbreaths = 31; // Default value
      localStorage.setItem('numberOfBreaths', this.KBbreaths.toString()); // Store it in localStorage
    } else {
      this.KBbreaths = parseInt(this.KBbreaths); // Convert the stored string to a number
    }
    this.KBbreathSpeed = localStorage.getItem('speedOfBreathsKB');
    // Check if it doesn't exist or is null
    if (this.KBbreathSpeed === null) {
      this.KBbreathSpeed = 650; // Default value
      localStorage.setItem('speedOfBreathsKB', this.KBbreathSpeed.toString()); // Store it in localStorage
      this.speedsetInputKB.nativeElement.value = "Medium";
    } else {
      if(this.KBbreathSpeed == 800){
        this.speedsetInputKB.nativeElement.value = "Slow";
      } else if(this.KBbreathSpeed == 650){
        this.speedsetInputKB.nativeElement.value = "Medium";
      } else if(this.KBbreathSpeed == 500){
        this.speedsetInputKB.nativeElement.value = "Fast";
      } 
      this.KBbreathSpeed = parseInt(this.KBbreathSpeed); // Convert the stored string to a number
    }
    this.breathsetInputKB.nativeElement.value = (this.KBbreaths - 1).toString();
  }
  handleMinusChange():void{
    if (this.KBbreaths > 11) {
      this.KBbreaths = this.KBbreaths - 10;
      this.breathsetInputKB.nativeElement.value = (this.KBbreaths - 1).toString();
      localStorage.setItem('numberOfBreaths', this.KBbreaths.toString()); // Store it in localStorage
    }
  }
  handlePlusChange():void{
    if (this.KBbreaths < 71) {
      this.KBbreaths = this.KBbreaths + 10;
      this.breathsetInputKB.nativeElement.value = (this.KBbreaths - 1).toString();
      localStorage.setItem('numberOfBreaths', this.KBbreaths.toString()); // Store it in localStorage
    }
  }
  handleSMinusChange():void{
    if (this.speedsetInputKB.nativeElement.value == "Medium") {
      this.speedsetInputKB.nativeElement.value = "Slow";
      this.KBbreathSpeed = 800;
      localStorage.setItem('speedOfBreathsKB', this.KBbreathSpeed.toString()); // Store it in localStorage
    }
    else if (this.speedsetInputKB.nativeElement.value == "Fast") {
      this.speedsetInputKB.nativeElement.value = "Medium";
      this.KBbreathSpeed = 650;
      localStorage.setItem('speedOfBreathsKB', this.KBbreathSpeed.toString()); // Store it in localStorage
    }
  }
  handleSPlusChange():void{
    if (this.speedsetInputKB.nativeElement.value == "Slow") {
      this.speedsetInputKB.nativeElement.value = "Medium";
      this.KBbreathSpeed = 650;
      localStorage.setItem('speedOfBreathsKB', this.KBbreathSpeed.toString()); // Store it in localStorage
    }
    else if (this.speedsetInputKB.nativeElement.value == "Medium") {
      this.speedsetInputKB.nativeElement.value = "Fast";
      this.KBbreathSpeed = 500;
      localStorage.setItem('speedOfBreathsKB', this.KBbreathSpeed.toString()); // Store it in localStorage
    }
  }
  // Method to handle the volume change
  handleVolumeChange(): void {
    const volumeSETKB = parseFloat(this.volumeBarSETKB.nativeElement.value);

    // Check if volume is 0 and adjust the UI accordingly
    if (volumeSETKB === 0) {
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
}
