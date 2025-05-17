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
  selector: 'app-ap',
  templateUrl: './ap.page.html',
  styleUrls: ['./ap.page.scss'],
  standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      IonicModule,
      RouterModule
  ],
})
export class APPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalAP') modalAP!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalAP') closeModalButtonAP!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionAP') questionAP!: ElementRef<HTMLButtonElement>;
  @ViewChild('APprev') APprev!: ElementRef<HTMLButtonElement>;
  @ViewChild('APnext') APnext!: ElementRef<HTMLButtonElement>;
  @ViewChild('APball') APball!: ElementRef<HTMLDivElement>;
  @ViewChild('APballText') APballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('APtimeInput') APtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('APcountdownInput') APcountdownInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('startBtnAP') startBtnAP!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnAP') stopBtnAP!: ElementRef<HTMLButtonElement>;
  @ViewChild('APSave') APSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsAP') settingsAP!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputAP') inhaleInputAP!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputAP') hold1InputAP!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputAP') exhaleInputAP!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneAP') roundsDoneAP!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayAP') timerDisplayAP!: ElementRef<HTMLInputElement>;
  @ViewChild('APResultSaved') APResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusAP') minusAP!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusAP') plusAP!: ElementRef<HTMLButtonElement>;

  private isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleAP = true;
  private hold1AP = false;
  private exhaleAP = false;
  private APinterval: any = null; 
  private APcountdown: any = null; // Use 'any' or specify the correct type if known
  private APcurrentValue = 5;
  private APduration = 0; // Initialize duration as a number
  private roundsAP = 0;
  private APSeconds = 0;
  private APMinutes = 0;
  private APTimer: any = null;
  private APResult = ''; // Variable to store the BRT result as a string



  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
    //modal events set up
    this.closeModalButtonAP.nativeElement.onclick = () => this.globalService.closeModal(this.modalAP);
    this.questionAP.nativeElement.onclick = () => this.globalService.openModal(this.modalAP);
    this.APnext.nativeElement.onclick = () => this.globalService.plusSlides(1, 'slides', this.modalAP);
    this.APprev.nativeElement.onclick = () => this.globalService.plusSlides(-1, 'slides', this.modalAP);
    this.globalService.openModal(this.modalAP);
    //populate input
    for (let APi = 2; APi <= 60; APi++) { // assuming 1 to 60 minutes
      let APoption = document.createElement('option');
      APoption.value = (APi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        APoption.textContent = APi + ' minutos';
      } else {
        APoption.textContent = APi + ' minutes';
      }
      this.APtimeInput.nativeElement.appendChild(APoption);
    }
    // Initialize buttons
    //modal events set up
    this.minusAP.nativeElement.onclick = () => this.minusRatioAP();
    this.plusAP.nativeElement.onclick = () => this.plusRatioAP();
    this.startBtnAP.nativeElement.onclick = () => this.startAP();
    this.stopBtnAP.nativeElement.onclick = () => this.stopAP();
    this.APSave.nativeElement.onclick = () => this.saveAP();
    this.stopBtnAP.nativeElement.disabled = true;
    this.stopBtnAP.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.APSave.nativeElement.disabled = true;
    this.APSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.APtimeInput.nativeElement.onchange = () => this.setAPduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
  }
  // Method to set the APduration after ViewChild is initialized
  setAPduration(): void {
      const selectedValue = this.APtimeInput.nativeElement.value;
      // Check if the value is '∞', then set APduration accordingly
      if (selectedValue === 'infinity') {
        this.APduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.APduration = parseInt(selectedValue);
      }
  }

  ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startAP();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopAP();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.APballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.APballText.nativeElement.textContent = "Start"
    }
    this.setAPduration();
    this.APResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.initializeSong();
     //initialize sounds
     this.audioService.initializeAudioObjects("bell");
     this.audioService.initializeAudioObjects("inhale");
     this.audioService.initializeAudioObjects("exhale");
     this.audioService.initializeAudioObjects("hold");
     this.audioService.initializeAudioObjects("normalbreath");
  }
  minusRatioAP(): void{
    if(parseInt(this.inhaleInputAP.nativeElement.value) > 2){
      this.inhaleInputAP.nativeElement.value = 
      ((parseInt(this.inhaleInputAP.nativeElement.value) || 0) - 1).toString();
      this.hold1InputAP.nativeElement.value = 
      ((parseInt(this.hold1InputAP.nativeElement.value) || 0) - 4).toString();
      this.exhaleInputAP.nativeElement.value = 
      ((parseInt(this.exhaleInputAP.nativeElement.value) || 0) - 2).toString();
    }
  }
  plusRatioAP():void{
    if(parseInt(this.inhaleInputAP.nativeElement.value) < 30){
      this.inhaleInputAP.nativeElement.value = 
      ((parseInt(this.inhaleInputAP.nativeElement.value) || 0) + 1).toString();
      this.hold1InputAP.nativeElement.value = 
      ((parseInt(this.hold1InputAP.nativeElement.value) || 0) + 4).toString();
      this.exhaleInputAP.nativeElement.value = 
      ((parseInt(this.exhaleInputAP.nativeElement.value) || 0) + 2).toString();
    }
  }
  startAP(): void{
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsAP.nativeElement.disabled = true;
    this.questionAP.nativeElement.disabled = true;
    this.minusAP.nativeElement.disabled = true;
    this.plusAP.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnAP.nativeElement.disabled = true;
      this.inhaleAP = true;
      this.APcountdownInput.nativeElement.style.display = "inline";
      this.APtimeInput.nativeElement.style.display = "none";
      this.startCountdownAP();
      this.APballText.nativeElement.textContent = "3";
      this.audioService.playBell("bell");;
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.APballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.APballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
        if(this.isPortuguese){
          this.APballText.nativeElement.textContent = "Inspire";
        }else{
          this.APballText.nativeElement.textContent = "Inhale";
        }
        this.audioService.playSound('inhale');
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputAP.nativeElement.value), this.APball);
        this.APinterval = setInterval(() => this.startTimerAP(), 1000);
        this.APTimer = setInterval(() => this.DisplayTimerAP(), 1000);
        this.startBtnAP.nativeElement.disabled = false;
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsAP();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnAP.nativeElement.disabled = false;
      this.stopBtnAP.nativeElement.style.color = '#990000';
      if(this.roundsAP > 0){
        this.APSave.nativeElement.disabled = false;
        this.APSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsAP.nativeElement.disabled = false;
      this.questionAP.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.APballText.nativeElement.textContent = "Continuar"
      }else{
        this.APballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleAP){
          this.APballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1AP){
          this.APballText.nativeElement.textContent = "Segure"
        }else if(this.exhaleAP){
          this.APballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleAP){
          this.APballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1AP){
          this.APballText.nativeElement.textContent = "Hold"
        }else if(this.exhaleAP){
          this.APballText.nativeElement.textContent = "Exhale"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnAP.nativeElement.disabled = true;
      this.stopBtnAP.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.APSave.nativeElement.disabled = true;
      this.APSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.APinterval = setInterval(() => this.startTimerAP(), 1000);
      this.APTimer = setInterval(() => this.DisplayTimerAP(), 1000);
      this.startCountdownAP();
    }
  }
  startCountdownAP(): void {
    if (this.APduration !== Infinity) {
      let Contdownminutes = Math.floor(this.APduration / 60);
      let Contdownseconds = this.APduration % 60;
      this.APcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.APcountdown = setInterval( () => {
        if(this.APduration == 0){
          clearInterval(this.APcountdown); 
          this.APcountdown = null;
        }else{
          this.APduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.APduration / 60);
          let Contdownseconds = this.APduration % 60;
          this.APcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.APcountdownInput.nativeElement.value = '∞';
      this.APcountdownInput.nativeElement.style.display = "inline";
      this.APtimeInput.nativeElement.style.display = "none";
    }
  }
  startTimerAP(): void{ 
    this.APcurrentValue--;
    if(this.inhaleAP && this.APcurrentValue == 1){
      this.APcurrentValue = parseInt(this.hold1InputAP.nativeElement.value) + 1;
      this.inhaleAP = false;
      this.hold1AP = true;
      this.audioService.playSound('hold');
      if(this.isPortuguese){
        this.APballText.nativeElement.textContent = "Segure"
      }else{
        this.APballText.nativeElement.textContent = "Hold"
      }
      this.globalService.changeBall(1.3, parseInt(this.hold1InputAP.nativeElement.value), this.APball);
    }
    else if(this.hold1AP && this.APcurrentValue == 1){
      this.APcurrentValue = parseInt(this.exhaleInputAP.nativeElement.value) + 1;
      this.hold1AP = false;
      this.exhaleAP = true;
      this.audioService.playSound('exhale');
      if(this.isPortuguese){
        this.APballText.nativeElement.textContent = "Espire"
      }else{
        this.APballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, parseInt(this.exhaleInputAP.nativeElement.value), this.APball);
      this.roundsAP++;
      this.roundsDoneAP.nativeElement.innerHTML = this.roundsAP.toString();
    }
    else if(this.exhaleAP && this.APcurrentValue == 1){
      if(this.APduration !== 0){
        this.APcurrentValue = parseInt(this.inhaleInputAP.nativeElement.value) + 1;
        this.exhaleAP = false;
        this.inhaleAP = true;
        this.audioService.playSound('inhale');
        if(this.isPortuguese){
          this.APballText.nativeElement.textContent = "Inspire"
        }else{
          this.APballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputAP.nativeElement.value), this.APball);
      } 
      else{
        this.clearIntervalsAP();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnAP.nativeElement.disabled = true;
        this.settingsAP.nativeElement.disabled = false;
        this.questionAP.nativeElement.disabled = false;
        this.stopBtnAP.nativeElement.disabled = false;
        this.stopBtnAP.nativeElement.style.color = '#990000';
        this.APSave.nativeElement.disabled = false;
        this.APSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.APball);
        this.APcountdownInput.nativeElement.style.display = "none";
        this.APtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.APballText.nativeElement.textContent = "Iniciar"
        }else{
          this.APballText.nativeElement.textContent = "Start"
        }
        this.audioService.playBell("bell");;
        setTimeout(() => {
          this.audioService.playSound('normalbreath');
        }, 500);
        setTimeout(() => {
          this.audioService.pauseSelectedSong();
        }, 4000);
      }
    }
  }
  // Method to display the timer
  DisplayTimerAP(): void {
    this.APSeconds++;
    if (this.APSeconds === 60) {
    this.APSeconds = 0;
    this.APMinutes++;
    }
    const M = this.APMinutes < 10 ? '0' + this.APMinutes : this.APMinutes;
    const S = this.APSeconds < 10 ? '0' + this.APSeconds : this.APSeconds;
    this.timerDisplayAP.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopAP(): void{
    this.clearIntervalsAP();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.APcountdownInput.nativeElement.style.display = "none";
    this.APtimeInput.nativeElement.style.display = "inline";
    this.APcurrentValue = parseInt(this.inhaleInputAP.nativeElement.value) + 1;
    this.startBtnAP.nativeElement.disabled = false;
    this.stopBtnAP.nativeElement.disabled = true;
    this.stopBtnAP.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.APSave.nativeElement.disabled = true;
    this.APSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.minusAP.nativeElement.disabled = false;
    this.plusAP.nativeElement.disabled = false;
    this.inhaleAP = true;
    this.hold1AP = false;
    this.exhaleAP = false;
    this.globalService.changeBall(1, 1, this.APball);
    if(this.isPortuguese){
      this.APballText.nativeElement.textContent = "Iniciar"
    }else{
      this.APballText.nativeElement.textContent = "Start"
    }
    this.roundsAP = 0;
    this.roundsDoneAP.nativeElement.innerHTML = "0";
    this.timerDisplayAP.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setAPduration();
    this.APSeconds = 0;
    this.APMinutes = 0;
    this.roundsAP = 0;
  }
  saveAP(): void{
    this.APResult = this.timerDisplayAP.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('APResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.APResult, rounds: this.roundsAP}); // Add the new result with the current date
    localStorage.setItem('APResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.APResultSaved.nativeElement.style.display = 'block';
    this.stopAP();
  }
  
  clearIntervalsAP(): void {
    clearInterval(this.APinterval);
    clearInterval(this.APcountdown); 
    clearInterval(this.APTimer); 
    this.APinterval = null;
    this.APcountdown = null;
    this.APTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopAP(); 
    this.APResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}