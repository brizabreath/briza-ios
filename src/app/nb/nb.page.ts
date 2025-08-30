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
  selector: 'app-nb',
  templateUrl: './nb.page.html',
  styleUrls: ['./nb.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class NBPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalNB') modalNB!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalNB') closeModalButtonNB!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionNB') questionNB!: ElementRef<HTMLButtonElement>;
  @ViewChild('NBdots') NBdots!: ElementRef<HTMLDivElement>;
  @ViewChild('NBball') NBball!: ElementRef<HTMLDivElement>;
  @ViewChild('NBballText') NBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('NBtimeInput') NBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('NBcountdownInput') NBcountdownInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('startBtnNB') startBtnNB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnNB') stopBtnNB!: ElementRef<HTMLButtonElement>;
  @ViewChild('NBSave') NBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsNB') settingsNB!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputNB') inhaleInputNB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputNB') hold1InputNB!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputNB') exhaleInputNB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputNB') hold2InputNB!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneNB') roundsDoneNB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayNB') timerDisplayNB!: ElementRef<HTMLInputElement>;
  @ViewChild('NBResultSaved') NBResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusNB') minusNB!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusNB') plusNB!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleNB = true;
  private hold1NB = false;
  private exhaleNB = false;
  private hold2NB = false;
  private NBinterval: any = null; 
  private NBcountdown: any = null; // Use 'any' or specify the correct type if known
  private NBcurrentValue = 5;
  private NBduration = 0; // Initialize duration as a number
  private roundsNB = 0;
  private NBSeconds = 0;
  private NBMinutes = 0;
  private NBTimer: any = null;
  private NBResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.globalService.initBulletSlider(this.modalNB, this.NBdots, 'slides');
    this.closeModalButtonNB.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalNB));
    this.questionNB.nativeElement.onclick = () => this.globalService.openModal(this.modalNB, this.NBdots, 'slides');
    this.questionNB.nativeElement.onclick = () => this.globalService.openModal(this.modalNB);
     //populate input
    for (let NBi = 2; NBi <= 60; NBi++) { // assuming 1 to 60 minutes
      let NBoption = document.createElement('option');
      NBoption.value = (NBi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        NBoption.textContent = NBi + ' minutos';
      } else {
        NBoption.textContent = NBi + ' minutes';
      }
      this.NBtimeInput.nativeElement.appendChild(NBoption);
    }
    // Initialize buttons
    //modal events set up
    this.minusNB.nativeElement.onclick = () => this.minusRatioNB();
    this.plusNB.nativeElement.onclick = () => this.plusRatioNB();
    this.startBtnNB.nativeElement.onclick = () => this.startNB();
    this.stopBtnNB.nativeElement.onclick = () => this.stopNB();
    this.NBSave.nativeElement.onclick = () => this.saveNB();
    this.stopBtnNB.nativeElement.disabled = true;
    this.stopBtnNB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.NBSave.nativeElement.disabled = true;
    this.NBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.NBtimeInput.nativeElement.onchange = () => this.setNBduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
  }
  // Method to set the NBduration after ViewChild is initialized
  setNBduration(): void {
      const selectedValue = this.NBtimeInput.nativeElement.value;
      // Check if the value is '∞', then set NBduration accordingly
      if (selectedValue === 'infinity') {
        this.NBduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.NBduration = parseInt(selectedValue);
      }
  }

  ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startNB();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopNB();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.NBballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.NBballText.nativeElement.textContent = "Start"
    }
    this.setNBduration();
    this.NBResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    //initialize sounds
    this.audioService.initializeSong(); 
  }
   
  minusRatioNB(): void{
    if(parseInt(this.inhaleInputNB.nativeElement.value) > 3){
      this.inhaleInputNB.nativeElement.value = 
      ((parseInt(this.inhaleInputNB.nativeElement.value) || 0) - 1).toString();
      this.hold1InputNB.nativeElement.value = 
      ((parseInt(this.hold1InputNB.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputNB.nativeElement.value = 
      ((parseInt(this.exhaleInputNB.nativeElement.value) || 0) - 1).toString();
      this.hold2InputNB.nativeElement.value = 
      ((parseInt(this.hold2InputNB.nativeElement.value) || 0) - 1).toString();
    }
  }
  plusRatioNB():void{
    if(parseInt(this.inhaleInputNB.nativeElement.value) < 40){
      this.inhaleInputNB.nativeElement.value = 
      ((parseInt(this.inhaleInputNB.nativeElement.value) || 0) + 1).toString();
      this.hold1InputNB.nativeElement.value = 
      ((parseInt(this.hold1InputNB.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputNB.nativeElement.value = 
      ((parseInt(this.exhaleInputNB.nativeElement.value) || 0) + 1).toString();
      this.hold2InputNB.nativeElement.value = 
      ((parseInt(this.hold2InputNB.nativeElement.value) || 0) + 1).toString();
    }
  }
  startNB(): void{
    this.NBcurrentValue = parseInt(this.inhaleInputNB.nativeElement.value) + 1;
    //initialize sounds
    this.audioService.initializeSong(); 
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsNB.nativeElement.disabled = true;
    this.questionNB.nativeElement.disabled = true;
    this.minusNB.nativeElement.disabled = true;
    this.plusNB.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnNB.nativeElement.disabled = true;
      this.inhaleNB = true; 
      this.NBcountdownInput.nativeElement.style.display = "inline";
      this.NBtimeInput.nativeElement.style.display = "none";
      this.startCountdownNB();
      this.NBballText.nativeElement.textContent = "3";
      this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.NBballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.NBballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        if(this.isPortuguese){
          this.NBballText.nativeElement.textContent = "Inspire";
        }else{
          this.NBballText.nativeElement.textContent = "Inhale";
        }
        this.audioService.playSound('inhaleLeft');
        this.audioService.playBreathSound('inhaleBreath', this.NBcurrentValue); 
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputNB.nativeElement.value), this.NBball);
        this.NBinterval = setInterval(() => this.startTimerNB(), 1000);
        this.NBTimer = setInterval(() => this.DisplayTimerNB(), 1000);
        this.startBtnNB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false");
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsNB();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnNB.nativeElement.disabled = false;
      this.stopBtnNB.nativeElement.style.color = '#990000';
      if(this.roundsNB > 0){
        this.NBSave.nativeElement.disabled = false;
        this.NBSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsNB.nativeElement.disabled = false;
      this.questionNB.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.NBballText.nativeElement.textContent = "Continuar"
      }else{
        this.NBballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleNB){
          this.NBballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1NB){
          this.NBballText.nativeElement.textContent = "Espire"
        }else if(this.exhaleNB){
          this.NBballText.nativeElement.textContent = "Inspire"
        }else if(this.hold2NB){
          this.NBballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleNB){
          this.NBballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1NB){
          this.NBballText.nativeElement.textContent = "Exhale"
        }else if(this.exhaleNB){
          this.NBballText.nativeElement.textContent = "Inhale"
        }else if(this.hold2NB){
          this.NBballText.nativeElement.textContent = "Exhale"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnNB.nativeElement.disabled = true;
      this.stopBtnNB.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.NBSave.nativeElement.disabled = true;
      this.NBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.NBinterval = setInterval(() => this.startTimerNB(), 1000);
      this.NBTimer = setInterval(() => this.DisplayTimerNB(), 1000);
      this.startCountdownNB();
    }
  }
  startCountdownNB(): void {
    if (this.NBduration !== Infinity) {
      let Contdownminutes = Math.floor(this.NBduration / 60);
      let Contdownseconds = this.NBduration % 60;
      this.NBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.NBcountdown = setInterval( () => {
        if(this.NBduration == 0){
          clearInterval(this.NBcountdown); 
          this.NBcountdown = null;
        }else{
          this.NBduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.NBduration / 60);
          let Contdownseconds = this.NBduration % 60;
          this.NBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.NBcountdownInput.nativeElement.value = '∞';
      this.NBcountdownInput.nativeElement.style.display = "inline";
      this.NBtimeInput.nativeElement.style.display = "none";
    }
  }
  startTimerNB(): void{ 
    this.NBcurrentValue--;
    if(this.inhaleNB && this.NBcurrentValue == 1){
      this.NBcurrentValue = parseInt(this.hold1InputNB.nativeElement.value) + 1;
      this.inhaleNB = false;
      this.hold1NB = true;
      this.audioService.playSound('exhaleRight');
      this.audioService.playBreathSound('exhaleBreath', this.NBcurrentValue); 
      if(this.isPortuguese){
        this.NBballText.nativeElement.textContent = "Espire"
      }else{
        this.NBballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, parseInt(this.hold1InputNB.nativeElement.value), this.NBball);
    }
    else if(this.hold1NB && this.NBcurrentValue == 1){
      this.NBcurrentValue = parseInt(this.exhaleInputNB.nativeElement.value) + 1;
      this.hold1NB = false;
      this.exhaleNB = true;
      this.audioService.playSound('inhaleRight');
      this.audioService.playBreathSound('inhaleBreath', this.NBcurrentValue); 
      if(this.isPortuguese){
        this.NBballText.nativeElement.textContent = "Inspire"
      }else{
        this.NBballText.nativeElement.textContent = "Inhale"
      }
      this.globalService.changeBall(1.5, parseInt(this.hold2InputNB.nativeElement.value), this.NBball);
    }
    else if(this.exhaleNB && this.NBcurrentValue == 1){
      this.NBcurrentValue = parseInt(this.hold2InputNB.nativeElement.value) + 1;
      this.exhaleNB = false;
      this.hold2NB = true;
      this.audioService.playSound('exhaleLeft');
      this.audioService.playBreathSound('exhaleBreath', this.NBcurrentValue); 
      if(this.isPortuguese){
        this.NBballText.nativeElement.textContent = "Espire"
      }else{
        this.NBballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, parseInt(this.exhaleInputNB.nativeElement.value), this.NBball);
      this.roundsNB++;
      this.roundsDoneNB.nativeElement.innerHTML = this.roundsNB.toString();
    }
    else if(this.hold2NB && this.NBcurrentValue == 1){
      if(this.NBduration !== 0){
        this.NBcurrentValue = parseInt(this.inhaleInputNB.nativeElement.value) + 1;
        this.hold2NB = false;
        this.inhaleNB = true;
        this.audioService.playSound('inhaleLeft');
        this.audioService.playBreathSound('inhaleBreath', this.NBcurrentValue); 
        if(this.isPortuguese){
          this.NBballText.nativeElement.textContent = "Inspire"
        }else{
          this.NBballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputNB.nativeElement.value), this.NBball);
      } 
      else{
         
        this.clearIntervalsNB();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnNB.nativeElement.disabled = true;
        this.settingsNB.nativeElement.disabled = false;
        this.questionNB.nativeElement.disabled = false;
        this.stopBtnNB.nativeElement.disabled = false;
        this.stopBtnNB.nativeElement.style.color = '#990000';
        this.NBSave.nativeElement.disabled = false;
        this.NBSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.NBball);
        this.NBcountdownInput.nativeElement.style.display = "none";
        this.NBtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.NBballText.nativeElement.textContent = "Iniciar"
        }else{
          this.NBballText.nativeElement.textContent = "Start"
        }
        this.audioService.playBell("bell");
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
  DisplayTimerNB(): void {
    this.NBSeconds++;
    if (this.NBSeconds === 60) {
    this.NBSeconds = 0;
    this.NBMinutes++;
    }
    const M = this.NBMinutes < 10 ? '0' + this.NBMinutes : this.NBMinutes;
    const S = this.NBSeconds < 10 ? '0' + this.NBSeconds : this.NBSeconds;
    this.timerDisplayNB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopNB(): void{
    this.clearIntervalsNB();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.NBcountdownInput.nativeElement.style.display = "none";
    this.NBtimeInput.nativeElement.style.display = "inline";
    this.NBcurrentValue = parseInt(this.inhaleInputNB.nativeElement.value) + 1;
    this.startBtnNB.nativeElement.disabled = false;
    this.stopBtnNB.nativeElement.disabled = true;
    this.stopBtnNB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.NBSave.nativeElement.disabled = true;
    this.NBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.minusNB.nativeElement.disabled = false;
    this.plusNB.nativeElement.disabled = false;
    this.inhaleNB = true;
    this.hold1NB = false;
    this.exhaleNB = false;
    this.hold2NB = false;
    this.globalService.changeBall(1, 1, this.NBball);
    if(this.isPortuguese){
      this.NBballText.nativeElement.textContent = "Iniciar"
    }else{
      this.NBballText.nativeElement.textContent = "Start"
    }
    this.roundsNB = 0;
    this.roundsDoneNB.nativeElement.innerHTML = "0";
    this.timerDisplayNB.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setNBduration();
    this.NBSeconds = 0;
    this.NBMinutes = 0;
    this.roundsNB = 0;
  }
  saveNB(): void{
    this.NBResult = this.timerDisplayNB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('NBResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.NBResult, rounds: this.roundsNB }); // Add the new result with the current date
    localStorage.setItem('NBResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.NBResultSaved.nativeElement.style.display = 'block';
    this.stopNB();
  }
  
  clearIntervalsNB(): void {
    clearInterval(this.NBinterval);
    clearInterval(this.NBcountdown); 
    clearInterval(this.NBTimer); 
    this.NBinterval = null;
    this.NBcountdown = null;
    this.NBTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopNB(); 
    this.NBResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}