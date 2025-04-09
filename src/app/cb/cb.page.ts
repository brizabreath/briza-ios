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
  selector: 'app-cb',
  templateUrl: './cb.page.html',
  styleUrls: ['./cb.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class CBPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalCB') modalCB!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalCB') closeModalButtonCB!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionCB') questionCB!: ElementRef<HTMLButtonElement>;
  @ViewChild('CBprev') CBprev!: ElementRef<HTMLButtonElement>;
  @ViewChild('CBnext') CBnext!: ElementRef<HTMLButtonElement>;
  @ViewChild('CBball') CBball!: ElementRef<HTMLDivElement>;
  @ViewChild('CBballText') CBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('CBtimeInput') CBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('CBcountdownInput') CBcountdownInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('startBtnCB') startBtnCB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnCB') stopBtnCB!: ElementRef<HTMLButtonElement>;
  @ViewChild('CBSave') CBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsCB') settingsCB!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneCB') roundsDoneCB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayCB') timerDisplayCB!: ElementRef<HTMLInputElement>;
  @ViewChild('CBResultSaved') CBResultSaved!: ElementRef<HTMLDivElement>;


  private audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
  private voiceMute = localStorage.getItem('voiceMute') === 'true';
  private bellMute = localStorage.getItem('bellMute') === 'true';
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleCB = true;
  private exhaleCB = false;
  private CBinterval: any = null; 
  private CBcountdown: any = null; // Use 'any' or specify the correct type if known
  private CBcurrentValue = 5.5;
  private CBduration = 0; // Initialize duration as a number
  private CBSeconds = 0;
  private CBMinutes = 0;
  private roundsCB = 0;
  private CBTimer: any = null;
  private CBResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;



  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
    //modal events set up
    this.closeModalButtonCB.nativeElement.onclick = () => this.globalService.closeModal(this.modalCB);
    this.questionCB.nativeElement.onclick = () => this.globalService.openModal(this.modalCB);
    this.CBnext.nativeElement.onclick = () => this.globalService.plusSlides(1, 'slides', this.modalCB);
    this.CBprev.nativeElement.onclick = () => this.globalService.plusSlides(-1, 'slides', this.modalCB);
    this.globalService.openModal(this.modalCB);
    //populate input
    for (let CBi = 2; CBi <= 60; CBi++) { // assuming 1 to 60 minutes
      let CBoption = document.createElement('option');
      CBoption.value = (CBi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        CBoption.textContent = CBi + ' minutos';
      } else {
        CBoption.textContent = CBi + ' minutes';
      }
      this.CBtimeInput.nativeElement.appendChild(CBoption);
    }
    // Initialize buttons
    this.startBtnCB.nativeElement.onclick = () => this.startCB();
    this.stopBtnCB.nativeElement.onclick = () => this.stopCB();
    this.CBSave.nativeElement.onclick = () => this.saveCB();
    this.stopBtnCB.nativeElement.disabled = true;
    this.stopBtnCB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CBSave.nativeElement.disabled = true;
    this.CBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CBtimeInput.nativeElement.onchange = () => this.setCBduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
    //initialize sounds
    this.audioService.initializeAudioObjects("bell");
    this.audioService.initializeAudioObjects("inhale");
    this.audioService.initializeAudioObjects("exhale");
    this.audioService.initializeAudioObjects("normalbreath");
  }
  // Method to set the CBduration after ViewChild is initialized
  setCBduration(): void {
      const selectedValue = this.CBtimeInput.nativeElement.value;
      
      // Check if the value is '∞', then set CBduration accordingly
      if (selectedValue === 'infinity') {
        this.CBduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.CBduration = parseInt(selectedValue);
      }
  }

  ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startCB();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopCB();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.CBballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.CBballText.nativeElement.textContent = "Start"
    }
    this.setCBduration();
    this.CBResultSaved.nativeElement.style.display = 'none';
    this.audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
    this.voiceMute = localStorage.getItem('voiceMute') === 'true';
    this.bellMute = localStorage.getItem('bellMute') === 'true';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    //initialize sounds
    this.audioService.initializeSong();
  }
 
  startCB(): void{
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsCB.nativeElement.disabled = true;
    this.questionCB.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnCB.nativeElement.disabled = true;
      this.inhaleCB = true;
      this.CBcountdownInput.nativeElement.style.display = "inline";
      this.CBtimeInput.nativeElement.style.display = "none";
      this.startCountdownCB();
      this.CBballText.nativeElement.textContent = "3";
      if (!this.bellMute) {
        this.audioService.playSound("bell");
      }
      const timeoutId1 = setTimeout(() => {
        if (!this.audioPlayerMute) {
          this.audioService.playSelectedSong();
        }
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.CBballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.CBballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        if(this.isPortuguese){
          this.CBballText.nativeElement.textContent = "Inspire";
        }else{
          this.CBballText.nativeElement.textContent = "Inhale";
        }
        if(!this.voiceMute){
          this.audioService.playSound('inhale');
        }
        this.globalService.changeBall(1.5, 5, this.CBball);
        this.CBinterval = setInterval(() => this.startTimerCB(), 500);
        this.CBTimer = setInterval(() => this.DisplayTimerCB(), 1000);
        this.startBtnCB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsCB();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnCB.nativeElement.disabled = false;
      this.stopBtnCB.nativeElement.style.color = '#990000';
      if(this.roundsCB > 0){
        this.CBSave.nativeElement.disabled = false;
        this.CBSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsCB.nativeElement.disabled = false;
      this.questionCB.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.CBballText.nativeElement.textContent = "Continuar"
      }else{
        this.CBballText.nativeElement.textContent = "Resume"
      }
      if (!this.audioPlayerMute) {
        this.audioService.pauseSelectedSong();
      }
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleCB){
          this.CBballText.nativeElement.textContent = "Inspire"
        }else if(this.exhaleCB){
          this.CBballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleCB){
          this.CBballText.nativeElement.textContent = "Inhale"
        }else if(this.exhaleCB){
          this.CBballText.nativeElement.textContent = "Exhale"
        }      
      }
      if (!this.audioPlayerMute) {
        this.audioService.playSelectedSong();
      }
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnCB.nativeElement.disabled = true;
      this.stopBtnCB.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.CBSave.nativeElement.disabled = true;
      this.CBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.CBinterval = setInterval(() => this.startTimerCB(), 500);
      this.CBTimer = setInterval(() => this.DisplayTimerCB(), 1000);
      this.startCountdownCB();
    }
  }
  startCountdownCB(): void {
    if (this.CBduration !== Infinity) {
      let Contdownminutes = Math.floor(this.CBduration / 60);
      let Contdownseconds = this.CBduration % 60;
      this.CBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.CBcountdown = setInterval( () => {
        if(this.CBduration == 0){
          clearInterval(this.CBcountdown); 
          this.CBcountdown = null;
        }else{
          this.CBduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.CBduration / 60);
          let Contdownseconds = this.CBduration % 60;
          this.CBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.CBcountdownInput.nativeElement.value = '∞';
      this.CBcountdownInput.nativeElement.style.display = "inline";
      this.CBtimeInput.nativeElement.style.display = "none";
    }
  }
  startTimerCB(): void{ 
    this.CBcurrentValue = this.CBcurrentValue-0.5;
    if(this.inhaleCB && this.CBcurrentValue == 0.5){
      this.CBcurrentValue = 5.5;
      this.inhaleCB = false;
      this.exhaleCB = true;
      if(!this.voiceMute){
          this.audioService.playSound('exhale');
      }
      if(this.isPortuguese){
        this.CBballText.nativeElement.textContent = "Espire"
      }else{
        this.CBballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, 5, this.CBball);
      this.roundsCB++;
      this.roundsDoneCB.nativeElement.innerHTML = this.roundsCB.toString();
    }
    else if(this.exhaleCB && this.CBcurrentValue == 0.5){
      if(this.CBduration !== 0){
        this.CBcurrentValue = 5.5;
        this.exhaleCB = false;
        this.inhaleCB = true;
        if(!this.voiceMute){     
            this.audioService.playSound('inhale');
        }
        if(this.isPortuguese){
          this.CBballText.nativeElement.textContent = "Inspire"
        }else{
          this.CBballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, 5, this.CBball);
      } 
      else{
         
        this.clearIntervalsCB();
        localStorage.setItem('breathingON', "false"); 
        localStorage.setItem('firstClick', "true"); 
        this.startBtnCB.nativeElement.disabled = true;
        this.settingsCB.nativeElement.disabled = false;
        this.questionCB.nativeElement.disabled = false;
        this.stopBtnCB.nativeElement.disabled = false;
        this.stopBtnCB.nativeElement.style.color = '#990000';
        this.CBSave.nativeElement.disabled = false;
        this.CBSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.CBball);
        this.CBcountdownInput.nativeElement.style.display = "none";
        this.CBtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.CBballText.nativeElement.textContent = "Iniciar"
        }else{
          this.CBballText.nativeElement.textContent = "Start"
        }
        if (!this.bellMute) {
          this.audioService.playSound("bell");
        }
        if(!this.voiceMute){
          setTimeout(() => {
            this.audioService.playSound('normalbreath');
          }, 1000);
        }
        if (!this.audioPlayerMute) {
          setTimeout(() => {
            this.audioService.pauseSelectedSong();
          }, 3000);
        }
      }
    }
  }
  // Method to display the timer
  DisplayTimerCB(): void {
    this.CBSeconds++;
    if (this.CBSeconds === 60) {
    this.CBSeconds = 0;
    this.CBMinutes++;
    }
    const M = this.CBMinutes < 10 ? '0' + this.CBMinutes : this.CBMinutes;
    const S = this.CBSeconds < 10 ? '0' + this.CBSeconds : this.CBSeconds;
    this.timerDisplayCB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopCB(): void{
    this.clearIntervalsCB();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.CBcountdownInput.nativeElement.style.display = "none";
    this.CBtimeInput.nativeElement.style.display = "inline";
    this.CBcurrentValue = 5.5;
    this.startBtnCB.nativeElement.disabled = false;
    this.stopBtnCB.nativeElement.disabled = true;
    this.stopBtnCB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CBSave.nativeElement.disabled = true;
    this.CBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.inhaleCB = true;
    this.exhaleCB = false;
    this.globalService.changeBall(1, 1, this.CBball);
    if(this.isPortuguese){
      this.CBballText.nativeElement.textContent = "Iniciar"
    }else{
      this.CBballText.nativeElement.textContent = "Start"
    }
    this.roundsCB = 0;
    this.roundsDoneCB.nativeElement.innerHTML = "0";
    this.timerDisplayCB.nativeElement.innerHTML = "00 : 00";
    if (this.audioService.currentAudio) {
      this.audioService.pauseSelectedSong();
    }
    this.setCBduration();
    this.CBSeconds = 0;
    this.CBMinutes = 0;
    this.roundsCB = 0;
  }
  saveCB(): void{
    this.CBResult = this.timerDisplayCB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('CBResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.CBResult, rounds: this.roundsCB }); // Add the new result with the current date
    localStorage.setItem('CBResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.CBResultSaved.nativeElement.style.display = 'block';
    this.stopCB();
  }
  
  clearIntervalsCB(): void {
    clearInterval(this.CBinterval);
    clearInterval(this.CBcountdown); 
    clearInterval(this.CBTimer); 
    this.CBinterval = null;
    this.CBcountdown = null;
    this.CBTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopCB(); 
    this.CBResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}