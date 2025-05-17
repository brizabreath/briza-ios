import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AudioService } from '../services/audio.service'; // Import the AudioService
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule
import { App } from '@capacitor/app';

@Component({
  selector: 'app-brt',
  templateUrl: './brt.page.html',
  styleUrls: ['./brt.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BRTPage implements AfterViewInit, OnDestroy {
  @ViewChild('myModalBRT') modalBRT!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalBRT') closeModalButtonBRT!: ElementRef<HTMLSpanElement>;
  @ViewChild('BRTprev') BRTprev!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRTnext') BRTnext!: ElementRef<HTMLButtonElement>;
  @ViewChild('timerDisplayBRT') timerDisplayBRT!: ElementRef<HTMLInputElement>;
  @ViewChild('brtStart') brtStart!: ElementRef<HTMLButtonElement>;
  @ViewChild('brtStop') brtStop!: ElementRef<HTMLButtonElement>;
  @ViewChild('brtSave') brtSave!: ElementRef<HTMLInputElement>;
  @ViewChild('BRTSettings') BRTSettings!: ElementRef<HTMLButtonElement>;
  @ViewChild('brtResultSaved') brtResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('BRTball') BRTball!: ElementRef<HTMLDivElement>;
  @ViewChild('settingsBRT') settingsBRT!: ElementRef<HTMLButtonElement>;
  @ViewChild('questionBRT') questionBRT!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRTballText') BRTballText!: ElementRef<HTMLSpanElement>;




  private brtSeconds = 0;
  private brtMinutes = 0;
  private brtInt: any = null;
  private brtResult = ''; // Variable to store the BRT result as a string
  private isPortuguese = localStorage.getItem('isPortuguese') === 'true';


  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}

  ngAfterViewInit(): void {
    this.globalService.openModal(this.modalBRT);
    // Add event listeners for start, pause, stop, and save buttons
    this.brtStart.nativeElement.addEventListener('click', () => this.startTimerBRT());
    this.brtStop.nativeElement.addEventListener('click', () => this.stopTimerBRT());
    this.brtSave.nativeElement.addEventListener('click', () => this.saveResultBRT());

    // Initialize button states
    this.brtStart.nativeElement.disabled = false;
    this.brtStop.nativeElement.disabled = true;
    this.brtStop.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.brtSave.nativeElement.disabled = true;
    this.brtSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.brtResultSaved.nativeElement.style.display = 'none'; // Ensure the saved message is hidden initially
    this.globalService.changeBall(1.2,1,this.BRTball);
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
    //initiate button
    this.BRTnext.nativeElement.onclick = () => this.globalService.plusSlides(1, 'slides', this.modalBRT);
    this.BRTprev.nativeElement.onclick = () => this.globalService.plusSlides(-1, 'slides', this.modalBRT);
    this.closeModalButtonBRT.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalBRT));
    this.questionBRT.nativeElement.onclick = () => this.globalService.openModal(this.modalBRT);
  }
  ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startTimerBRT();
          this.globalService.clearAllTimeouts();
        }else{
          this.globalService.clearAllTimeouts();
          this.stopTimerBRT();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.BRTballText.nativeElement.textContent = "Iniciar"
    }else{
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.BRTballText.nativeElement.textContent = "Start"
    }
    this.brtResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    //initialize sounds
    this.audioService.initializeSong();
    this.audioService.initializeAudioObjects("bell");
    this.audioService.initializeAudioObjects("inhale");
    this.audioService.initializeAudioObjects("exhale");
    this.audioService.initializeAudioObjects("hold");
  }
  
  // Method to start the timer
  startTimerBRT(): void {
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    if(firstClick == "true" && breathingON == "false"){
      this.BRTSettings.nativeElement.disabled = true;
      this.questionBRT.nativeElement.disabled = true;
      this.brtStop.nativeElement.disabled = true;
      this.brtStop.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.brtSave.nativeElement.disabled = true;
      this.brtSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.brtStart.nativeElement.disabled = true;
      if(this.isPortuguese){
        this.BRTballText.nativeElement.textContent = "Inspire";
      }else{
        this.BRTballText.nativeElement.textContent = "Inhale";
      }
      this.audioService.playBell("bell");;
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.audioService.playSound('inhale');
        this.BRTballText.nativeElement.textContent = "3";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.BRTballText.nativeElement.textContent = "2";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        this.BRTballText.nativeElement.textContent = "1";
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      const timeoutId5 = setTimeout(() => {
        if(this.isPortuguese){
          this.BRTballText.nativeElement.textContent = "Espire";
        }else{
          this.BRTballText.nativeElement.textContent = "Exhale";
        }
        this.audioService.playSound('exhale');
      }, 4000);
      this.globalService.timeouts.push(timeoutId5); // Store the timeout ID
      const timeoutId6 = setTimeout(() => {
        this.BRTballText.nativeElement.textContent = "3";
      }, 5000);
      this.globalService.timeouts.push(timeoutId6); // Store the timeout ID
      const timeoutId7 = setTimeout(() => {
        this.BRTballText.nativeElement.textContent = "2";
      }, 6000);
      this.globalService.timeouts.push(timeoutId7); // Store the timeout ID
      const timeoutId8 = setTimeout(() => {
        this.BRTballText.nativeElement.textContent = "1";
      }, 7000);
      this.globalService.timeouts.push(timeoutId8); // Store the timeout ID
      const timeoutId9 = setTimeout(() => {
        if(this.isPortuguese){
          this.BRTballText.nativeElement.textContent = "Segure";
        }else{
          this.BRTballText.nativeElement.textContent = "Hold";
        }
        this.audioService.playSound('hold');
        this.brtInt = setInterval(() => this.brtDisplayTimer(), 1000);
        this.brtStart.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false");
      }, 8000);
      this.globalService.timeouts.push(timeoutId9); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      localStorage.setItem('breathingON', "false"); 
      localStorage.setItem('firstClick', "true"); 
      clearInterval(this.brtInt);
      this.BRTSettings.nativeElement.disabled = false;
      this.questionBRT.nativeElement.disabled = false;
      this.brtStop.nativeElement.disabled = false;
      this.brtStop.nativeElement.style.color = '#990000';
      this.brtSave.nativeElement.disabled = false;
      this.brtSave.nativeElement.style.color = '#49B79D';
      this.brtStart.nativeElement.disabled = true;

      // Capture the BRT result when paused
      this.brtResult = this.timerDisplayBRT.nativeElement.value;

      // Pause the selected song
      this.audioService.pauseSelectedSong();
    }
  }
    // Method to display the timer
    brtDisplayTimer(): void {
      this.brtSeconds++;
      if (this.brtSeconds === 60) {
        this.brtSeconds = 0;
        this.brtMinutes++;
      }
      const brtM = this.brtMinutes < 10 ? '0' + this.brtMinutes : this.brtMinutes;
      const brtS = this.brtSeconds < 10 ? '0' + this.brtSeconds : this.brtSeconds;
      this.timerDisplayBRT.nativeElement.value = `${brtM} : ${brtS}`;
      this.BRTballText.nativeElement.innerText = this.timerDisplayBRT.nativeElement.value;
    }
  // Method to stop the timer
  stopTimerBRT(): void {
    clearInterval(this.brtInt);
    [this.brtSeconds, this.brtMinutes] = [0, 0];
    this.timerDisplayBRT.nativeElement.value = '00 : 00';
    this.brtStart.nativeElement.disabled = false;
    this.brtStop.nativeElement.disabled = true;
    this.brtStop.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.brtSave.nativeElement.disabled = true;
    this.brtSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    if (this.isPortuguese) {
      this.BRTballText.nativeElement.textContent = "Iniciar"
    }else{
      this.BRTballText.nativeElement.textContent = "Start"

    }
    // Stop and reset the selected song
    if (this.audioService.currentAudio) { 
      this.audioService.pauseSelectedSong();
    }
  }

  // Method to save the BRT result to local storage and reset
  saveResultBRT(): void {
    const savedResults = JSON.parse(localStorage.getItem('brtResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.brtResult }); // Add the new result with the current date
    localStorage.setItem('brtResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.brtResultSaved.nativeElement.style.display = 'block';
    // Reset the timer and audio
    this.stopTimerBRT();
  }
  // Method to navigate back
  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  ngOnDestroy(): void {
    clearInterval(this.brtInt);
    if (this.audioService.currentAudio) {
      this.audioService.pauseSelectedSong();
      // Hide the "Result Successfully Saved" message when navigating away
      this.brtResultSaved.nativeElement.style.display = 'none';
    }
    App.removeAllListeners();
  }
}
