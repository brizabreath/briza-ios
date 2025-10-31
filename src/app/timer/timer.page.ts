import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AudioService } from '../services/audio.service'; 
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule
import { App } from '@capacitor/app';

@Component({
  selector: 'app-timer',
  templateUrl: './timer.page.html',
  styleUrls: ['./timer.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class TIMERPage implements  AfterViewInit, OnDestroy {
  @ViewChild('TIMERball') TIMERball!: ElementRef<HTMLDivElement>;
  @ViewChild('TIMERballText') TIMERballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('TIMERtimeInput') TIMERtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('TIMERcountdownInput') TIMERcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnTIMER') startBtnTIMER!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnTIMER') stopBtnTIMER!: ElementRef<HTMLButtonElement>;
  @ViewChild('TIMERSave') TIMERSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('timerDisplayTIMER') timerDisplayTIMER!: ElementRef<HTMLInputElement>;
  @ViewChild('TIMERResultSaved') TIMERResultSaved!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private TIMERinterval: any = null; 
  private TIMERcountdown: any = null; // Use 'any' or specify the correct type if known
  private TIMERcurrentValue = 0;
  private TIMERduration = 0; // Initialize duration as a number
  private TIMERSeconds = 0;
  private TIMERMinutes = 0;
  private TIMERTimer: any = null;
  private TIMERResult = ''; // Variable to store the TIMER result as a string
  private timerSeconds = 0;
  private timerMinutes = 0;

  constructor(private navCtrl: NavController, private audioService: AudioService, public globalService: GlobalService) {}
  ngAfterViewInit(): void {
    //populate input
    for (let TIMERi = 2; TIMERi <= 60; TIMERi++) { // assuming 1 to 60 minutes
      let TIMERoption = document.createElement('option');
      TIMERoption.value = (TIMERi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        TIMERoption.textContent = TIMERi + ' minutos';
      } else {
        TIMERoption.textContent = TIMERi + ' minutes';
      }
      this.TIMERtimeInput.nativeElement.appendChild(TIMERoption);
    }
    // Initialize buttons
    //modal events set up
    this.startBtnTIMER.nativeElement.onclick = () => this.startTIMER();
    this.stopBtnTIMER.nativeElement.onclick = () => this.stopTIMER();
    this.TIMERSave.nativeElement.onclick = () => this.saveTIMER();
    this.stopBtnTIMER.nativeElement.disabled = true;
    this.stopBtnTIMER.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.TIMERSave.nativeElement.disabled = true;
    this.TIMERSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.TIMERtimeInput.nativeElement.onchange = () => this.setTIMERduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
  }
  // Method to set the TIMERduration after ViewChild is initialized
  setTIMERduration(): void {
      const selectedValue = this.TIMERtimeInput.nativeElement.value;
      this.TIMERduration = parseInt(selectedValue);
  }

  async ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startTIMER();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopTIMER();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.TIMERballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.TIMERballText.nativeElement.textContent = "Start"
    }
    this.setTIMERduration();
    this.TIMERResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    //initialize sounds
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong(); 
  }
   
  async startTIMER(): Promise<void>{
    this.audioService.resetaudio(); 
    //initialize sounds
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnTIMER.nativeElement.disabled = true;
      this.TIMERcountdownInput.nativeElement.style.display = "none";
      this.TIMERtimeInput.nativeElement.style.display = "none";
      this.TIMERballText.nativeElement.textContent = "00 : 00";
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      const timeoutId4 = setTimeout(async () => {
        this.globalService.changeBall(1.3, 1, this.TIMERball);
        this.TIMERinterval = setInterval(() => this.startTimerTIMER(), 1000);
        this.TIMERTimer = setInterval(() => this.DisplayTimerTIMER(), 1000);
        this.startCountdownTIMER();
        this.startBtnTIMER.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 1000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsTIMER();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnTIMER.nativeElement.disabled = false;
      this.stopBtnTIMER.nativeElement.style.color = '#990000';
      if(this.isPortuguese){
        this.TIMERballText.nativeElement.textContent = "Continuar"
      }else{
        this.TIMERballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnTIMER.nativeElement.disabled = true;
      this.stopBtnTIMER.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.TIMERSave.nativeElement.disabled = true;
      this.TIMERSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.TIMERinterval = setInterval(() => this.startTimerTIMER(), 1000);
      this.TIMERTimer = setInterval(() => this.DisplayTimerTIMER(), 1000);
      this.startCountdownTIMER();
    }
  }
  startCountdownTIMER(): void {
    let Contdownminutes = Math.floor(this.TIMERduration / 60);
    let Contdownseconds = this.TIMERduration % 60;
    this.TIMERcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
    this.TIMERcountdown = setInterval( () => {
      if(this.TIMERduration == 0){
        clearInterval(this.TIMERcountdown); 
        this.TIMERcountdown = null;
      }else{
        this.TIMERduration--;
        // Calculate minutes and seconds
        let Contdownminutes = Math.floor(this.TIMERduration / 60);
        let Contdownseconds = this.TIMERduration % 60;
        this.TIMERcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }
   // Method to display the timer
    timerDisplayTimer(): void {
      this.timerSeconds++;
      if (this.timerSeconds === 60) {
        this.timerSeconds = 0;
        this.timerMinutes++;
      }
      const timerM = this.timerMinutes < 10 ? '0' + this.timerMinutes : this.timerMinutes;
      const timerS = this.timerSeconds < 10 ? '0' + this.timerSeconds : this.timerSeconds;
      this.timerDisplayTIMER.nativeElement.value = `${timerM} : ${timerS}`;
      this.TIMERballText.nativeElement.innerText = this.timerDisplayTIMER.nativeElement.value;
    }
  async startTimerTIMER(): Promise<void>{ 
    this.TIMERcurrentValue++;
    if(this.TIMERduration !== 0){
      this.timerDisplayTimer();
    } 
    else{
      this.clearIntervalsTIMER();
      localStorage.setItem('breathingON', "false"); 
      this.startBtnTIMER.nativeElement.disabled = true;
      this.stopBtnTIMER.nativeElement.disabled = false;
      this.stopBtnTIMER.nativeElement.style.color = '#990000';
      this.TIMERSave.nativeElement.disabled = false;
      this.TIMERSave.nativeElement.style.color = '#49B79D';
      this.globalService.changeBall(1.3, 1, this.TIMERball);
      this.audioService.pauseSelectedSong();
      await this.audioService.playBell("bell");
    }
  }
  // Method to display the timer
  DisplayTimerTIMER(): void {
    this.TIMERSeconds++;
    if (this.TIMERSeconds === 60) {
    this.TIMERSeconds = 0;
    this.TIMERMinutes++;
    }
    const M = this.TIMERMinutes < 10 ? '0' + this.TIMERMinutes : this.TIMERMinutes;
    const S = this.TIMERSeconds < 10 ? '0' + this.TIMERSeconds : this.TIMERSeconds;
    this.timerDisplayTIMER.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopTIMER(): void{
    this.clearIntervalsTIMER();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.TIMERcountdownInput.nativeElement.style.display = "none";
    this.TIMERtimeInput.nativeElement.style.display = "inline";
    this.startBtnTIMER.nativeElement.disabled = false;
    this.stopBtnTIMER.nativeElement.disabled = true;
    this.stopBtnTIMER.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.TIMERSave.nativeElement.disabled = true;
    this.TIMERSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.globalService.changeBall(1.3, 1, this.TIMERball);
    if(this.isPortuguese){
      this.TIMERballText.nativeElement.textContent = "Iniciar"
    }else{
      this.TIMERballText.nativeElement.textContent = "Start"
    }
    this.timerDisplayTIMER.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setTIMERduration();
    this.timerMinutes = 0;
    this.timerSeconds = 0;
    this.TIMERSeconds = 0;
    this.TIMERMinutes = 0;
    this.TIMERcountdownInput.nativeElement.style.display = "none";
    this.TIMERtimeInput.nativeElement.style.display = "inline"; 
  }
  saveTIMER(): void{
    this.TIMERResult = this.timerDisplayTIMER.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('TIMERResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.TIMERResult}); // Add the new result with the current date
    localStorage.setItem('TIMERResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.TIMERResultSaved.nativeElement.style.display = 'block';
    this.stopTIMER();
  }
  
  clearIntervalsTIMER(): void {
    clearInterval(this.TIMERinterval);
    clearInterval(this.TIMERcountdown); 
    clearInterval(this.TIMERTimer); 
    this.TIMERinterval = null;
    this.TIMERcountdown = null;
    this.TIMERTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopTIMER(); 
    this.TIMERResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}