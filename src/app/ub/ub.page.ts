import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AudioService } from '../services/audio.service'; 
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-ub',
  templateUrl: './ub.page.html',
  styleUrls: ['./ub.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class UBPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalUB') modalUB!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalUB') closeModalButtonUB!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionUB') questionUB!: ElementRef<HTMLButtonElement>;
  @ViewChild('UBprev') UBprev!: ElementRef<HTMLButtonElement>;
  @ViewChild('UBnext') UBnext!: ElementRef<HTMLButtonElement>;
  @ViewChild('UBball') UBball!: ElementRef<HTMLDivElement>;
  @ViewChild('UBballText') UBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('UBtimeInput') UBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('UBcountdownInput') UBcountdownInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('startBtnUB') startBtnUB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnUB') stopBtnUB!: ElementRef<HTMLButtonElement>;
  @ViewChild('UBSave') UBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsUB') settingsUB!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputUB') inhaleInputUB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputUB') hold1InputUB!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputUB') exhaleInputUB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputUB') hold2InputUB!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneUB') roundsDoneUB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayUB') timerDisplayUB!: ElementRef<HTMLInputElement>;
  @ViewChild('UBResultSaved') UBResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusUB') minusUB!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusUB') plusUB!: ElementRef<HTMLButtonElement>;



  private audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
  private voiceMute = localStorage.getItem('voiceMute') === 'true';
  private bellMute = localStorage.getItem('bellMute') === 'true';
  private isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleUB = true;
  private hold1UB = false;
  private exhaleUB = false;
  private hold2UB = false;
  private UBinterval: any = null; 
  private UBcountdown: any = null; // Use 'any' or specify the correct type if known
  private UBcurrentValue = 5;
  private UBduration = 0; // Initialize duration as a number
  private roundsUB = 0;
  private UBSeconds = 0;
  private UBMinutes = 0;
  private UBTimer: any = null;
  private UBResult = ''; // Variable to store the BRT result as a string



  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
    //modal events set up
    this.closeModalButtonUB.nativeElement.onclick = () => this.globalService.closeModal(this.modalUB);
    this.questionUB.nativeElement.onclick = () => this.globalService.openModal(this.modalUB);
    this.UBnext.nativeElement.onclick = () => this.globalService.plusSlides(1, 'slides', this.modalUB);
    this.UBprev.nativeElement.onclick = () => this.globalService.plusSlides(-1, 'slides', this.modalUB);
    this.globalService.openModal(this.modalUB);
    //populate input
    for (let UBi = 2; UBi <= 60; UBi++) { // assuming 1 to 60 minutes
      let UBoption = document.createElement('option');
      UBoption.value = (UBi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        UBoption.textContent = UBi + ' minutos';
      } else {
        UBoption.textContent = UBi + ' minutes';
      }
      this.UBtimeInput.nativeElement.appendChild(UBoption);
    }
    // Initialize buttons
    //modal events set up
    this.minusUB.nativeElement.onclick = () => this.minusRatioUB();
    this.plusUB.nativeElement.onclick = () => this.plusRatioUB();
    this.startBtnUB.nativeElement.onclick = () => this.startUB();
    this.stopBtnUB.nativeElement.onclick = () => this.stopUB();
    this.UBSave.nativeElement.onclick = () => this.saveUB();
    this.stopBtnUB.nativeElement.disabled = true;
    this.stopBtnUB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.UBSave.nativeElement.disabled = true;
    this.UBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.UBtimeInput.nativeElement.onchange = () => this.setUBduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
     //initialize sounds
     this.audioService.initializeAudioObjects("bell");
     this.audioService.initializeAudioObjects("inhale");
     this.audioService.initializeAudioObjects("exhale");
     this.audioService.initializeAudioObjects("hold");
  }
  // Method to set the UBduration after ViewChild is initialized
  setUBduration(): void {
      const selectedValue = this.UBtimeInput.nativeElement.value;
      // Check if the value is '∞', then set UBduration accordingly
      if (selectedValue === 'infinity') {
        this.UBduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.UBduration = parseInt(selectedValue);
      }
  }

  ionViewWillEnter() {
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.UBballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.UBballText.nativeElement.textContent = "Start"
    }
    this.setUBduration();
    this.UBResultSaved.nativeElement.style.display = 'none';
    this.audioPlayerMute = localStorage.getItem('audioPlayerMute') === 'true';
    this.voiceMute = localStorage.getItem('voiceMute') === 'true';
    this.bellMute = localStorage.getItem('bellMute') === 'true';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.initializeSong();
  }
  minusRatioUB(): void{
    if(parseInt(this.inhaleInputUB.nativeElement.value) > 4){
      this.inhaleInputUB.nativeElement.value = 
      ((parseInt(this.inhaleInputUB.nativeElement.value) || 0) - 2).toString();
      this.hold1InputUB.nativeElement.value = 
      ((parseInt(this.hold1InputUB.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputUB.nativeElement.value = 
      ((parseInt(this.exhaleInputUB.nativeElement.value) || 0) - 2).toString();
      this.hold2InputUB.nativeElement.value = 
      ((parseInt(this.hold2InputUB.nativeElement.value) || 0) - 1).toString();
    }
  }
  plusRatioUB():void{
    if(parseInt(this.inhaleInputUB.nativeElement.value) < 30){
      this.inhaleInputUB.nativeElement.value = 
      ((parseInt(this.inhaleInputUB.nativeElement.value) || 0) + 2).toString();
      this.hold1InputUB.nativeElement.value = 
      ((parseInt(this.hold1InputUB.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputUB.nativeElement.value = 
      ((parseInt(this.exhaleInputUB.nativeElement.value) || 0) + 2).toString();
      this.hold2InputUB.nativeElement.value = 
      ((parseInt(this.hold2InputUB.nativeElement.value) || 0) + 1).toString();
    }
  }
  startUB(): void{
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsUB.nativeElement.disabled = true;
    this.questionUB.nativeElement.disabled = true;
    this.minusUB.nativeElement.disabled = true;
    this.plusUB.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnUB.nativeElement.disabled = true;
      this.inhaleUB = true;
      localStorage.setItem('breathingON', "true"); 
      localStorage.setItem('firstClick', "false"); 
      this.UBcountdownInput.nativeElement.style.display = "inline";
      this.UBtimeInput.nativeElement.style.display = "none";
      this.startCountdownUB();
      this.UBballText.nativeElement.textContent = "3";
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
        this.UBballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.UBballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        if(this.isPortuguese){
          this.UBballText.nativeElement.textContent = "Inspire";
        }else{
          this.UBballText.nativeElement.textContent = "Inhale";
        }
        if(!this.voiceMute){
          this.audioService.playSound('inhale');
        }
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputUB.nativeElement.value), this.UBball);
        this.UBinterval = setInterval(() => this.startTimerUB(), 1000);
        this.UBTimer = setInterval(() => this.DisplayTimerUB(), 1000);
        this.startBtnUB.nativeElement.disabled = false;
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsUB();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnUB.nativeElement.disabled = false;
      this.stopBtnUB.nativeElement.style.color = '#990000';
      if(this.roundsUB > 0){
        this.UBSave.nativeElement.disabled = false;
        this.UBSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsUB.nativeElement.disabled = false;
      this.questionUB.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.UBballText.nativeElement.textContent = "Continuar"
      }else{
        this.UBballText.nativeElement.textContent = "Resume"
      }
      if (!this.audioPlayerMute) {
        this.audioService.pauseSelectedSong();
      }
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleUB){
          this.UBballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1UB || this.hold2UB){
          this.UBballText.nativeElement.textContent = "Segure"
        }else if(this.exhaleUB){
          this.UBballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleUB){
          this.UBballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1UB || this.hold2UB){
          this.UBballText.nativeElement.textContent = "Hold"
        }else if(this.exhaleUB){
          this.UBballText.nativeElement.textContent = "Exhale"
        }      
      }
      if (!this.audioPlayerMute) {
        this.audioService.playSelectedSong();
      }
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnUB.nativeElement.disabled = true;
      this.stopBtnUB.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.UBSave.nativeElement.disabled = true;
      this.UBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.UBinterval = setInterval(() => this.startTimerUB(), 1000);
      this.UBTimer = setInterval(() => this.DisplayTimerUB(), 1000);
      this.startCountdownUB();
    }
  }
  startCountdownUB(): void {
    if (this.UBduration !== Infinity) {
      let Contdownminutes = Math.floor(this.UBduration / 60);
      let Contdownseconds = this.UBduration % 60;
      this.UBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.UBcountdown = setInterval( () => {
        if(this.UBduration == 0){
          clearInterval(this.UBcountdown); 
          this.UBcountdown = null;
        }else{
          this.UBduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.UBduration / 60);
          let Contdownseconds = this.UBduration % 60;
          this.UBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.UBcountdownInput.nativeElement.value = '∞';
      this.UBcountdownInput.nativeElement.style.display = "inline";
      this.UBtimeInput.nativeElement.style.display = "none";
    }
  }
  startTimerUB(): void{ 
    this.UBcurrentValue--;
    if(this.inhaleUB && this.UBcurrentValue == 1){
      this.UBcurrentValue = parseInt(this.hold1InputUB.nativeElement.value) + 1;
      this.inhaleUB = false;
      this.hold1UB = true;
      if(!this.voiceMute){
          this.audioService.playSound('hold');
      }
      if(this.isPortuguese){
        this.UBballText.nativeElement.textContent = "Segure"
      }else{
        this.UBballText.nativeElement.textContent = "Hold"
      }
      this.globalService.changeBall(1.3, parseInt(this.hold1InputUB.nativeElement.value), this.UBball);
    }
    else if(this.hold1UB && this.UBcurrentValue == 1){
      this.UBcurrentValue = parseInt(this.exhaleInputUB.nativeElement.value) + 1;
      this.hold1UB = false;
      this.exhaleUB = true;
      if(!this.voiceMute){
          this.audioService.playSound('exhale');
      }
      if(this.isPortuguese){
        this.UBballText.nativeElement.textContent = "Expire"
      }else{
        this.UBballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, parseInt(this.exhaleInputUB.nativeElement.value), this.UBball);
    }
    else if(this.exhaleUB && this.UBcurrentValue == 1){
      this.UBcurrentValue = parseInt(this.hold2InputUB.nativeElement.value) + 1;
      this.exhaleUB = false;
      this.hold2UB = true;
      if(!this.voiceMute){
        this.audioService.playSound('hold');
      }
      if(this.isPortuguese){
        this.UBballText.nativeElement.textContent = "Segure"
      }else{
        this.UBballText.nativeElement.textContent = "Hold"
      }
      this.globalService.changeBall(1, parseInt(this.hold2InputUB.nativeElement.value), this.UBball);
      this.roundsUB++;
      this.roundsDoneUB.nativeElement.innerHTML = this.roundsUB.toString();
    }
    else if(this.hold2UB && this.UBcurrentValue == 1){
      if(this.UBduration !== 0){
        this.UBcurrentValue = parseInt(this.inhaleInputUB.nativeElement.value) + 1;
        this.hold2UB = false;
        this.inhaleUB = true;
        if(!this.voiceMute){
            this.audioService.playSound('inhale');
        }
        if(this.isPortuguese){
          this.UBballText.nativeElement.textContent = "Inspire"
        }else{
          this.UBballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputUB.nativeElement.value), this.UBball);
      } 
      else{
        if (!this.bellMute) {
          this.audioService.playSound("bell");
        }
        if (!this.audioPlayerMute) {
          this.audioService.pauseSelectedSong();
        }
        this.clearIntervalsUB();
        localStorage.setItem('breathingON', "false"); 
        localStorage.setItem('firstClick', "true"); 
        this.startBtnUB.nativeElement.disabled = true;
        this.settingsUB.nativeElement.disabled = false;
        this.questionUB.nativeElement.disabled = false;
        this.stopBtnUB.nativeElement.disabled = false;
        this.stopBtnUB.nativeElement.style.color = '#990000';
        this.UBSave.nativeElement.disabled = false;
        this.UBSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.UBball);
        this.UBcountdownInput.nativeElement.style.display = "none";
        this.UBtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.UBballText.nativeElement.textContent = "Iniciar"
        }else{
          this.UBballText.nativeElement.textContent = "Start"
        }
        if(!this.voiceMute){
          if(this.isPortuguese){
            this.audioService.playSound('nommalbreathPT');
          }else{
            this.audioService.playSound('normalbreath');
          }
        }
      }
    }
  }
  // Method to display the timer
  DisplayTimerUB(): void {
    this.UBSeconds++;
    if (this.UBSeconds === 60) {
    this.UBSeconds = 0;
    this.UBMinutes++;
    }
    const M = this.UBMinutes < 10 ? '0' + this.UBMinutes : this.UBMinutes;
    const S = this.UBSeconds < 10 ? '0' + this.UBSeconds : this.UBSeconds;
    this.timerDisplayUB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopUB(): void{
    this.clearIntervalsUB();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.UBcountdownInput.nativeElement.style.display = "none";
    this.UBtimeInput.nativeElement.style.display = "inline";
    this.UBcurrentValue = parseInt(this.inhaleInputUB.nativeElement.value) + 1;
    this.startBtnUB.nativeElement.disabled = false;
    this.stopBtnUB.nativeElement.disabled = true;
    this.stopBtnUB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.UBSave.nativeElement.disabled = true;
    this.UBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.minusUB.nativeElement.disabled = false;
    this.plusUB.nativeElement.disabled = false;
    this.inhaleUB = true;
    this.hold1UB = false;
    this.exhaleUB = false;
    this.hold2UB = false;
    this.globalService.changeBall(1, 1, this.UBball);
    if(this.isPortuguese){
      this.UBballText.nativeElement.textContent = "Iniciar"
    }else{
      this.UBballText.nativeElement.textContent = "Start"
    }
    this.roundsUB = 0;
    this.roundsDoneUB.nativeElement.innerHTML = "0";
    this.timerDisplayUB.nativeElement.innerHTML = "00 : 00";
    if (this.audioService.currentAudio) {
      this.audioService.currentAudio.pause();
      this.audioService.currentAudio.currentTime = 0;
    }
    this.setUBduration();
    this.UBSeconds = 0;
    this.UBMinutes = 0;
    this.roundsUB = 0;
  }
  saveUB(): void{
    this.UBResult = this.timerDisplayUB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('UBResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.UBResult, rounds: this.roundsUB }); // Add the new result with the current date
    localStorage.setItem('UBResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.UBResultSaved.nativeElement.style.display = 'block';
    this.stopUB();
  }
  
  clearIntervalsUB(): void {
    clearInterval(this.UBinterval);
    clearInterval(this.UBcountdown); 
    clearInterval(this.UBTimer); 
    this.UBinterval = null;
    this.UBcountdown = null;
    this.UBTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopUB(); 
    this.UBResultSaved.nativeElement.style.display = 'none';
  }
}