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
  selector: 'app-rb',
  templateUrl: './rb.page.html',
  styleUrls: ['./rb.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class RBPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalRB') modalRB!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalRB') closeModalButtonRB!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionRB') questionRB!: ElementRef<HTMLButtonElement>;
  @ViewChild('RBdots') RBdots!: ElementRef<HTMLDivElement>;
  @ViewChild('RBball') RBball!: ElementRef<HTMLDivElement>;
  @ViewChild('RBballText') RBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('RBtimeInput') RBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('RBcountdownInput') RBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnRB') startBtnRB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnRB') stopBtnRB!: ElementRef<HTMLButtonElement>;
  @ViewChild('RBSave') RBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsRB') settingsRB!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputRB') inhaleInputRB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputRB') hold1InputRB!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputRB') exhaleInputRB!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneRB') roundsDoneRB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayRB') timerDisplayRB!: ElementRef<HTMLDivElement>;
  @ViewChild('RBResultSaved') RBResultSaved!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleRB = true;
  private hold1RB = false;
  private exhaleRB = false;
  private RBinterval: any = null; 
  private RBcountdown: any = null; // Use 'any' or specify the correct type if known
  private RBcurrentValue = 5;
  private RBduration = 0; // Initialize duration as a number
  private roundsRB = 0;
  private RBSeconds = 0;
  private RBMinutes = 0;
  private RBTimer: any = null;
  private RBResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
   this.globalService.initBulletSlider(this.modalRB, this.RBdots, 'slides');
    this.closeModalButtonRB.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalRB));
    this.questionRB.nativeElement.onclick = () => this.globalService.openModal(this.modalRB, this.RBdots, 'slides');
    //populate input
    for (let RBi = 2; RBi <= 60; RBi++) { // assuming 1 to 60 minutes
      let RBoption = document.createElement('option');
      RBoption.value = (RBi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        RBoption.textContent = RBi + ' minutos';
      } else {
        RBoption.textContent = RBi + ' minutes';
      }
      this.RBtimeInput.nativeElement.appendChild(RBoption);
    }
    // Initialize buttons
    //modal events set up
    this.startBtnRB.nativeElement.onclick = () => this.startRB();
    this.stopBtnRB.nativeElement.onclick = () => this.stopRB();
    this.RBSave.nativeElement.onclick = () => this.saveRB();
    this.stopBtnRB.nativeElement.disabled = true;
    this.stopBtnRB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.RBSave.nativeElement.disabled = true;
    this.RBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.RBtimeInput.nativeElement.onchange = () => this.setRBduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
  }
  // Method to set the RBduration after ViewChild is initialized
  setRBduration(): void {
      const selectedValue = this.RBtimeInput.nativeElement.value;
      // Check if the value is '∞', then set RBduration accordingly
      if (selectedValue === 'infinity') {
        this.RBduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.RBduration = parseInt(selectedValue);
      }
  }

  async ionViewWillEnter() {
      this.audioService.resetaudio();
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startRB();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopRB();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.RBballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.RBballText.nativeElement.textContent = "Start"
    }
    this.setRBduration();
    this.RBResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    //initialize sounds
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong(); 
  }
   
  async startRB(): Promise<void>{
    this.RBcurrentValue = parseInt(this.inhaleInputRB.nativeElement.value) + 1;
    //initialize sounds
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsRB.nativeElement.disabled = true;
    this.questionRB.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnRB.nativeElement.disabled = true;
      this.inhaleRB = true;
      this.RBcountdownInput.nativeElement.style.display = "inline";
      this.RBtimeInput.nativeElement.style.display = "none";
      this.startCountdownRB();
      this.RBballText.nativeElement.textContent = "3";
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.RBballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.RBballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(async () => {
        if(this.isPortuguese){
          this.RBballText.nativeElement.textContent = "Inspire";
        }else{
          this.RBballText.nativeElement.textContent = "Inhale";
        }
        await this.audioService.playSound('inhale');        
        await this.audioService.playBreathSound('inhaleBreath', this.RBcurrentValue); 
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputRB.nativeElement.value), this.RBball);
        this.RBinterval = setInterval(() => this.startTimerRB(), 1000);
        this.RBTimer = setInterval(() => this.DisplayTimerRB(), 1000);
        this.startBtnRB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsRB();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnRB.nativeElement.disabled = false;
      this.stopBtnRB.nativeElement.style.color = '#990000';
      if(this.roundsRB > 0){
        this.RBSave.nativeElement.disabled = false;
        this.RBSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsRB.nativeElement.disabled = false;
      this.questionRB.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.RBballText.nativeElement.textContent = "Continuar"
      }else{
        this.RBballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleRB){
          this.RBballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1RB){
          this.RBballText.nativeElement.textContent = "Segure"
        }else if(this.exhaleRB){
          this.RBballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleRB){
          this.RBballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1RB){
          this.RBballText.nativeElement.textContent = "Hold"
        }else if(this.exhaleRB){
          this.RBballText.nativeElement.textContent = "Exhale"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnRB.nativeElement.disabled = true;
      this.stopBtnRB.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.RBSave.nativeElement.disabled = true;
      this.RBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.RBinterval = setInterval(() => this.startTimerRB(), 1000);
      this.RBTimer = setInterval(() => this.DisplayTimerRB(), 1000);
      this.startCountdownRB();
    }
  }
  startCountdownRB(): void {
    if (this.RBduration !== Infinity) {
      let Contdownminutes = Math.floor(this.RBduration / 60);
      let Contdownseconds = this.RBduration % 60;
      this.RBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.RBcountdown = setInterval( () => {
        if(this.RBduration == 0){
          clearInterval(this.RBcountdown); 
          this.RBcountdown = null;
        }else{
          this.RBduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.RBduration / 60);
          let Contdownseconds = this.RBduration % 60;
          this.RBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.RBcountdownInput.nativeElement.value = '∞';
      this.RBcountdownInput.nativeElement.style.display = "inline";
      this.RBtimeInput.nativeElement.style.display = "none";
    }
  }
  async startTimerRB(): Promise<void>{ 
    this.RBcurrentValue--;
    if(this.inhaleRB && this.RBcurrentValue == 1){
      this.RBcurrentValue = parseInt(this.hold1InputRB.nativeElement.value) + 1;
      this.inhaleRB = false;
      this.hold1RB = true;
      await this.audioService.playSound('hold');
      if(this.isPortuguese){
        this.RBballText.nativeElement.textContent = "Segure"
      }else{
        this.RBballText.nativeElement.textContent = "Hold"
      }
      this.globalService.changeBall(1.3, parseInt(this.hold1InputRB.nativeElement.value), this.RBball);
    }
    else if(this.hold1RB && this.RBcurrentValue == 1){
      this.RBcurrentValue = parseInt(this.exhaleInputRB.nativeElement.value) + 1;
      this.hold1RB = false;
      this.exhaleRB = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.RBcurrentValue); 
      if(this.isPortuguese){
        this.RBballText.nativeElement.textContent = "Espire"
      }else{
        this.RBballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, parseInt(this.exhaleInputRB.nativeElement.value), this.RBball);
      this.roundsRB++;
      this.roundsDoneRB.nativeElement.innerHTML = this.roundsRB.toString();
    }
    else if(this.exhaleRB && this.RBcurrentValue == 1){
      if(this.RBduration !== 0){
        this.RBcurrentValue = parseInt(this.inhaleInputRB.nativeElement.value) + 1;
        this.exhaleRB = false;
        this.inhaleRB = true;
        await this.audioService.playSound('inhale');        
        await this.audioService.playBreathSound('inhaleBreath', this.RBcurrentValue); 
        if(this.isPortuguese){
          this.RBballText.nativeElement.textContent = "Inspire"
        }else{
          this.RBballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputRB.nativeElement.value), this.RBball);
      } 
      else{
        this.clearIntervalsRB();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnRB.nativeElement.disabled = true;
        this.settingsRB.nativeElement.disabled = false;
        this.questionRB.nativeElement.disabled = false;
        this.stopBtnRB.nativeElement.disabled = false;
        this.stopBtnRB.nativeElement.style.color = '#990000';
        this.RBSave.nativeElement.disabled = false;
        this.RBSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.RBball);
        this.RBcountdownInput.nativeElement.style.display = "none";
        this.RBtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.RBballText.nativeElement.textContent = "Iniciar"
        }else{
          this.RBballText.nativeElement.textContent = "Start"
        }
        await this.audioService.playBell("bell");
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 500);
        setTimeout(() => {
          this.audioService.pauseSelectedSong();
        }, 4000);
      }
    }
  }
  // Method to display the timer
  DisplayTimerRB(): void {
    this.RBSeconds++;
    if (this.RBSeconds === 60) {
    this.RBSeconds = 0;
    this.RBMinutes++;
    }
    const M = this.RBMinutes < 10 ? '0' + this.RBMinutes : this.RBMinutes;
    const S = this.RBSeconds < 10 ? '0' + this.RBSeconds : this.RBSeconds;
    this.timerDisplayRB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopRB(): void{
    this.clearIntervalsRB();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.RBcountdownInput.nativeElement.style.display = "none";
    this.RBtimeInput.nativeElement.style.display = "inline";
    this.RBcurrentValue = parseInt(this.inhaleInputRB.nativeElement.value) + 1;
    this.startBtnRB.nativeElement.disabled = false;
    this.stopBtnRB.nativeElement.disabled = true;
    this.stopBtnRB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.RBSave.nativeElement.disabled = true;
    this.RBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.inhaleRB = true;
    this.hold1RB = false;
    this.exhaleRB = false;
    this.globalService.changeBall(1, 1, this.RBball);
    if(this.isPortuguese){
      this.RBballText.nativeElement.textContent = "Iniciar"
    }else{
      this.RBballText.nativeElement.textContent = "Start"
    }
    this.roundsRB = 0;
    this.roundsDoneRB.nativeElement.innerHTML = "0";
    this.timerDisplayRB.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setRBduration();
    this.RBSeconds = 0;
    this.RBMinutes = 0;
  }
  saveRB(): void{
    this.RBResult = this.timerDisplayRB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('RBResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.RBResult, rounds: this.roundsRB }); // Add the new result with the current date
    localStorage.setItem('RBResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.RBResultSaved.nativeElement.style.display = 'block';
    this.stopRB();
  }
  
  clearIntervalsRB(): void {
    clearInterval(this.RBinterval);
    clearInterval(this.RBcountdown); 
    clearInterval(this.RBTimer); 
    this.RBinterval = null;
    this.RBcountdown = null;
    this.RBTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopRB(); 
    this.RBResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}