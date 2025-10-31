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
  selector: 'app-ahat',
  templateUrl: './ahat.page.html',
  styleUrls: ['./ahat.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, 
    IonicModule,
    RouterModule
  ], 
})
export class AHATPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalAHAT') modalAHAT!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalAHAT') closeModalButtonAHAT!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionAHAT') questionAHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('AHATdots') AHATdots!: ElementRef<HTMLDivElement>;
  @ViewChild('AHATball') AHATball!: ElementRef<HTMLDivElement>;
  @ViewChild('AHATballText') AHATballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('AHATtimeInput') AHATtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('AHATcountdownInput') AHATcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnAHAT') startBtnAHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('AHATReset') AHATReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('AHATSave') AHATSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsAHAT') settingsAHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneAHAT') roundsDoneAHAT!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayAHAT') timerDisplayAHAT!: ElementRef<HTMLDivElement>;
  @ViewChild('AHATResultSaved') AHATResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('AHATResults') AHATResults!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private holdAHAT = true;
  private lightAHAT = false;
  private normalAHAT = false;
  private AHATinterval: any = null; 
  private AHATcurrentValue = 0;
  private AHATduration = 0; // Initialize duration as a number
  private AHATSeconds = 0;
  private AHATMinutes = 0;
  private roundsAHAT = 0;
  private AHATTimer: any = null;
  private AHATroundsResults: any[] = [];
  isModalOpen = false;
  
  
  constructor(private navCtrl: NavController, private audioService: AudioService, public globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.globalService.initBulletSlider(this.modalAHAT, this.AHATdots, 'slides');
    this.closeModalButtonAHAT.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalAHAT));
    this.questionAHAT.nativeElement.onclick = () => this.globalService.openModal(this.modalAHAT, this.AHATdots, 'slides');
    //populate input
    for (let AHATi = 2; AHATi <= 12; AHATi++) { // assuming 1 to 12 rounds
      let AHAToption = document.createElement('option');
      AHAToption.value = (AHATi).toString(); // Convert the number to a string
      AHAToption.textContent = AHATi + ' rounds';
      this.AHATtimeInput.nativeElement.appendChild(AHAToption);
    }
    // Initialize buttons
    this.startBtnAHAT.nativeElement.onclick = () => this.startAHAT();
    this.AHATReset.nativeElement.onclick = () => this.stopAHAT();
    this.AHATSave.nativeElement.onclick = () => this.saveAHAT();
    this.AHATReset.nativeElement.disabled = true;
    this.AHATReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.AHATSave.nativeElement.disabled = true;
    this.AHATSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.AHATtimeInput.nativeElement.onchange = () => this.setAHATduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true");
    //initialize sounds 
    this.globalService.changeBall(1.3, 1, this.AHATball);
    this.holdAHAT = true;
    
  }
  // Method to set the AHATduration after ViewChild is initialized
  setAHATduration(): void {
      const selectedValue = this.AHATtimeInput.nativeElement.value;
      
      // Check if the value is '∞', then set AHATduration accordingly
      if (selectedValue === 'infinity') {
        this.AHATduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.AHATduration = parseInt(selectedValue);
      }
  }

  async ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startAHAT();
          this.globalService.clearAllTimeouts();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.AHATballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.AHATballText.nativeElement.textContent = "Start"
    }
    this.setAHATduration();
    this.AHATResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong(); 
  }
  async startAHAT(): Promise<void>{
    this.audioService.resetaudio();
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsAHAT.nativeElement.disabled = true;
    this.questionAHAT.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnAHAT.nativeElement.disabled = true;
      this.AHATcountdownInput.nativeElement.style.display = "inline";
      this.AHATtimeInput.nativeElement.style.display = "none";
      this.startCountdownAHAT();
      this.AHATballText.nativeElement.textContent = "3";
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
      this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(async () => {
        await this.audioService.playSound('exhale');
        this.AHATballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.AHATballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(async () => {
        if(this.isPortuguese){
          this.AHATballText.nativeElement.textContent = "Comece a correr";
        }else{
          this.AHATballText.nativeElement.textContent = "Start running";
        }
        setTimeout(async () => {
          await this.audioService.playSound('pinchRun');
        }, 1000);
        this.AHATinterval = setInterval(() => this.startTimerAHAT(), 1000);
        this.AHATTimer = setInterval(() => this.DisplayTimerAHAT(), 1000);
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      const timeoutId5 = setTimeout(() => {
        this.startBtnAHAT.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
        this.holdAHAT = true;
      }, 6000);
      this.globalService.timeouts.push(timeoutId5); // Store the timeout ID
      
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      if(!this.holdAHAT){
        this.clearIntervalsAHAT();
        localStorage.setItem('breathingON', "false"); 
        this.AHATReset.nativeElement.disabled = false;
        this.AHATReset.nativeElement.style.color = '#990000';
        if(this.roundsAHAT > 0){
          this.AHATSave.nativeElement.disabled = false;
          this.AHATSave.nativeElement.style.color = '#49B79D';
        }
        this.settingsAHAT.nativeElement.disabled = false;
        this.questionAHAT.nativeElement.disabled = false;
        if(this.isPortuguese){
          this.AHATballText.nativeElement.textContent = "Continuar"
        }else{
          this.AHATballText.nativeElement.textContent = "Resume"
        }
        this.audioService.pauseSelectedSong();
      }else{
        this.pauseAHAT();
      }
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.normalAHAT){
          this.AHATballText.nativeElement.textContent = "Respiração Normal"
        }else if(this.lightAHAT){
          this.AHATballText.nativeElement.textContent = "Respiração Leve"
        }
      }else{
        if(this.normalAHAT){
          this.AHATballText.nativeElement.textContent = "Normal Breathing"
        }else if(this.lightAHAT){
          this.AHATballText.nativeElement.textContent = "Light Breathing"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.AHATReset.nativeElement.disabled = true;
      this.AHATReset.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.AHATSave.nativeElement.disabled = true;
      this.AHATSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.AHATinterval = setInterval(() => this.startTimerAHAT(), 1000);
      this.AHATTimer = setInterval(() => this.DisplayTimerAHAT(), 1000);
    }
  }
  startCountdownAHAT(): void {
    if (this.AHATduration !== Infinity) {
      if (this.AHATduration <= 1) {
        this.AHATcountdownInput.nativeElement.value = "Final round";   
      }else{
        this.AHATcountdownInput.nativeElement.value = this.AHATduration.toString() + " rounds left";   
      }
    } else {
      this.AHATcountdownInput.nativeElement.value = '∞';
      this.AHATcountdownInput.nativeElement.style.display = "inline";
      this.AHATtimeInput.nativeElement.style.display = "none";
    }
  }
  async startTimerAHAT(): Promise<void>{ 
    if(this.normalAHAT || this.lightAHAT){
      this.AHATcurrentValue--;
      if(this.isPortuguese){
        this.AHATballText.nativeElement.textContent = this.AHATcurrentValue.toString() + " segundos"
      }else{
        this.AHATballText.nativeElement.textContent = this.AHATcurrentValue.toString() + " seconds"
      }
    }
    if(this.holdAHAT){
      this.AHATcurrentValue++;
      if(this.isPortuguese){
        this.AHATballText.nativeElement.textContent = this.AHATcurrentValue.toString() + " segundos"
      }else{
        this.AHATballText.nativeElement.textContent = this.AHATcurrentValue.toString() + " seconds"
      }
    }
    if(this.lightAHAT && this.AHATcurrentValue == 1){
      this.AHATcurrentValue = 31;
      this.lightAHAT = false;
      this.normalAHAT = true;
      if(this.isPortuguese){
        this.AHATballText.nativeElement.textContent = "Respiração Normal"
      }else{
        this.AHATballText.nativeElement.textContent = "Normal Breathing"
      }
      await this.audioService.playSound('normalbreath');
    }
    else if(this.normalAHAT && this.AHATcurrentValue == 1){
      if(this.AHATduration !== 0){
        this.normalAHAT = false;
        this.holdAHAT = true;
        this.AHATcurrentValue = 0;
        if(this.isPortuguese){
          this.AHATballText.nativeElement.textContent = "Segure"
        }else{
          this.AHATballText.nativeElement.textContent = "Hold"
        }
        await this.audioService.playSound('exhale');
        setTimeout(async () => {
          await this.audioService.playSound('pinchRun');
        }, 1000);
      } 
      else{
        this.clearIntervalsAHAT();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnAHAT.nativeElement.disabled = true;
        this.settingsAHAT.nativeElement.disabled = false;
        this.questionAHAT.nativeElement.disabled = false;
        this.AHATReset.nativeElement.disabled = false;
        this.AHATReset.nativeElement.style.color = '#990000';
        this.AHATSave.nativeElement.disabled = false;
        this.AHATSave.nativeElement.style.color = '#49B79D';
        this.AHATcountdownInput.nativeElement.style.display = "none";
        this.AHATtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.AHATballText.nativeElement.textContent = "Respiração Normal"
        }else{
          this.AHATballText.nativeElement.textContent = "Normal Breathing"
        }
      await this.audioService.pauseSelectedSong();
      await this.audioService.playBell("bell");
      }
    }
  }
  // Method to display the timer
  DisplayTimerAHAT(): void {
    this.AHATSeconds++;
    if (this.AHATSeconds === 60) {
    this.AHATSeconds = 0;
    this.AHATMinutes++;
    }
    const M = this.AHATMinutes < 10 ? '0' + this.AHATMinutes : this.AHATMinutes;
    const S = this.AHATSeconds < 10 ? '0' + this.AHATSeconds : this.AHATSeconds;
    this.timerDisplayAHAT.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopAHAT(): void{
    this.clearIntervalsAHAT();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.AHATcountdownInput.nativeElement.style.display = "none";
    this.AHATtimeInput.nativeElement.style.display = "inline";
    this.AHATcurrentValue = 0;
    this.startBtnAHAT.nativeElement.disabled = false;
    this.AHATReset.nativeElement.disabled = true;
    this.AHATReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.AHATSave.nativeElement.disabled = true;
    this.AHATSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.holdAHAT = true;
    this.normalAHAT = false;
    this.lightAHAT = false;
    if(this.isPortuguese){
      this.AHATballText.nativeElement.textContent = "Iniciar"
    }else{
      this.AHATballText.nativeElement.textContent = "Start"
    }
    this.roundsAHAT = 0;
    this.roundsDoneAHAT.nativeElement.innerHTML = "0";
    this.timerDisplayAHAT.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setAHATduration();
    this.AHATSeconds = 0;
    this.AHATMinutes = 0;
    this.roundsAHAT = 0;
    this.AHATResults.nativeElement.innerHTML = "";

  }
  async pauseAHAT(): Promise<void>{
    this.clearIntervalsAHAT();
    this.holdAHAT = false;
    this.normalAHAT = false;
    this.lightAHAT = true;
    if(this.isPortuguese){
      this.AHATballText.nativeElement.textContent = "Respiração Leve"
    }else{
      this.AHATballText.nativeElement.textContent = "Light Breathing"
    }
    await this.audioService.playSound('lightNasal');
    this.roundsAHAT++;
    this.roundsDoneAHAT.nativeElement.innerHTML = this.roundsAHAT.toString();
    this.AHATduration = this.AHATduration - 1;
    if (this.AHATduration !== Infinity) {
      if (this.AHATduration <= 1) {
        this.AHATcountdownInput.nativeElement.value = "Final round";   
      }else{
        this.AHATcountdownInput.nativeElement.value = this.AHATduration.toString() + " rounds left";   
      }
    } else {
      this.AHATcountdownInput.nativeElement.value = '∞';
    }       
    if (this.isPortuguese) {
      this.AHATResults.nativeElement.innerHTML += "<div class='NOfSteps'> <div>Round " + this.roundsAHAT + "</div><div>" + this.AHATcurrentValue + " segundos</div></div>";
    } else {
      this.AHATResults.nativeElement.innerHTML += "<div class='NOfSteps'> <div>Round " + this.roundsAHAT + "</div><div>" + this.AHATcurrentValue + " seconds</div></div>";
    }
    this.AHATroundsResults.push(this.AHATcurrentValue);
    this.AHATcurrentValue = 16;
    this.AHATinterval = setInterval(() => this.startTimerAHAT(), 1000);
    this.AHATTimer = setInterval(() => this.DisplayTimerAHAT(), 1000);
  }
  saveAHAT(): void{
    const savedResults = JSON.parse(localStorage.getItem('AHATResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result:  this.timerDisplayAHAT.nativeElement.innerHTML, roundsResult: this.AHATroundsResults, rounds: this.roundsAHAT}); // Add the new result with the current date
    localStorage.setItem('AHATResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.AHATResultSaved.nativeElement.style.display = 'block';
    this.stopAHAT();
    this.AHATroundsResults = [];
  }
  
  clearIntervalsAHAT(): void {
    clearInterval(this.AHATinterval);
    clearInterval(this.AHATTimer); 
    this.AHATinterval = null;
    this.AHATTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    
    
    this.stopAHAT(); 
    this.AHATResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}