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
  selector: 'app-cust',
  templateUrl: './cust.page.html',
  styleUrls: ['./cust.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class CUSTPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalCUST') modalCUST!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalCUST') closeModalButtonCUST!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionCUST') questionCUST!: ElementRef<HTMLButtonElement>;
  @ViewChild('CUSTdots') CUSTdots!: ElementRef<HTMLDivElement>;
  @ViewChild('CUSTball') CUSTball!: ElementRef<HTMLDivElement>;
  @ViewChild('CUSTballText') CUSTballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('CUSTtimeInput') CUSTtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('CUSTcountdownInput') CUSTcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnCUST') startBtnCUST!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnCUST') stopBtnCUST!: ElementRef<HTMLButtonElement>;
  @ViewChild('CUSTSave') CUSTSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsCUST') settingsCUST!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputCUST') inhaleInputCUST!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputCUST') hold1InputCUST!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputCUST') exhaleInputCUST!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputCUST') hold2InputCUST!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneCUST') roundsDoneCUST!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayCUST') timerDisplayCUST!: ElementRef<HTMLDivElement>;
  @ViewChild('CUSTResultSaved') CUSTResultSaved!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  customizableIn = localStorage.getItem('customizableIn') || "4";
  customizableH1 = localStorage.getItem('customizableH1') || "4";
  customizableOut = localStorage.getItem('customizableOut') || "4";
  customizableH2 = localStorage.getItem('customizableH2') || "4";
  private inhaleCUST = true;
  private hold1CUST = false;
  private exhaleCUST = false;
  private hold2CUST = false;
  private CUSTinterval: any = null; 
  private CUSTcountdown: any = null; // Use 'any' or specify the correct type if known
  private CUSTcurrentValue = 5;
  private CUSTduration = 0; // Initialize duration as a number
  private roundsCUST = 0;
  private CUSTSeconds = 0;
  private CUSTMinutes = 0;
  private CUSTTimer: any = null;
  private CUSTResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.globalService.initBulletSlider(this.modalCUST, this.CUSTdots, 'slides');
    this.closeModalButtonCUST.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalCUST));
    this.questionCUST.nativeElement.onclick = () => this.globalService.openModal(this.modalCUST, this.CUSTdots, 'slides');
    //populate input
    for (let CUSTi = 2; CUSTi <= 60; CUSTi++) { // assuming 1 to 60 minutes
      let CUSToption = document.createElement('option');
      CUSToption.value = (CUSTi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        CUSToption.textContent = CUSTi + ' minutos';
      } else {
        CUSToption.textContent = CUSTi + ' minutes';
      }
      this.CUSTtimeInput.nativeElement.appendChild(CUSToption);
    }
    // Initialize buttons
    //modal events set up
    this.startBtnCUST.nativeElement.onclick = () => this.startCUST();
    this.stopBtnCUST.nativeElement.onclick = () => this.stopCUST();
    this.CUSTSave.nativeElement.onclick = () => this.saveCUST();
    this.stopBtnCUST.nativeElement.disabled = true;
    this.stopBtnCUST.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CUSTSave.nativeElement.disabled = true;
    this.CUSTSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CUSTtimeInput.nativeElement.onchange = () => this.setCUSTduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
  }
  // Method to set the CUSTduration after ViewChild is initialized
  setCUSTduration(): void {
      const selectedValue = this.CUSTtimeInput.nativeElement.value;
      // Check if the value is '∞', then set CUSTduration accordingly
      if (selectedValue === 'infinity') {
        this.CUSTduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.CUSTduration = parseInt(selectedValue);
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
          this.startCUST();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopCUST();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.CUSTballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.CUSTballText.nativeElement.textContent = "Start"
    }
    this.setCUSTduration();
    this.CUSTResultSaved.nativeElement.style.display = 'none';
   
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.inhaleInputCUST.nativeElement.value = this.customizableIn.toString();
    this.hold1InputCUST.nativeElement.value = this.customizableH1.toString();
    this.exhaleInputCUST.nativeElement.value = this.customizableOut.toString();
    this.hold2InputCUST.nativeElement.value = this.customizableH2.toString();
    this.inhaleInputCUST.nativeElement.disabled = false;
    this.hold1InputCUST.nativeElement.disabled = false;
    this.exhaleInputCUST.nativeElement.disabled = false;
    this.hold2InputCUST.nativeElement.disabled = false;
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong();  
  }
   
  async startCUST(): Promise<void>{
    this.customizableIn = this.inhaleInputCUST.nativeElement.value;
    this.customizableH1 = this.hold1InputCUST.nativeElement.value;
    this.customizableOut = this.exhaleInputCUST.nativeElement.value;
    this.customizableH2 = this.hold2InputCUST.nativeElement.value;
    localStorage.setItem('customizableIn', this.customizableIn.toString()); 
    localStorage.setItem('customizableH1', this.customizableH1.toString()); 
    localStorage.setItem('customizableOut', this.customizableOut.toString()); 
    localStorage.setItem('customizableH2', this.customizableH2.toString()); 
    this.CUSTcurrentValue = parseInt(this.customizableIn) + 1;
    this.inhaleInputCUST.nativeElement.disabled = true;
    this.hold1InputCUST.nativeElement.disabled = true;
    this.exhaleInputCUST.nativeElement.disabled = true;
    this.hold2InputCUST.nativeElement.disabled = true;
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsCUST.nativeElement.disabled = true;
    this.questionCUST.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnCUST.nativeElement.disabled = true;
      this.inhaleCUST = true;
      this.CUSTcountdownInput.nativeElement.style.display = "inline";
      this.CUSTtimeInput.nativeElement.style.display = "none";
      this.startCountdownCUST();
      this.CUSTballText.nativeElement.textContent = "3";
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.CUSTballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.CUSTballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(async () => {
        if(this.isPortuguese){
          this.CUSTballText.nativeElement.textContent = "Inspire";
        }else{
          this.CUSTballText.nativeElement.textContent = "Inhale";
        }
        await this.audioService.playSound('inhale');        
        await this.audioService.playBreathSound('inhaleBreath', this.CUSTcurrentValue); 
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputCUST.nativeElement.value), this.CUSTball);
        this.CUSTinterval = setInterval(() => this.startTimerCUST(), 1000);
        this.CUSTTimer = setInterval(() => this.DisplayTimerCUST(), 1000);
        this.startBtnCUST.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsCUST();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnCUST.nativeElement.disabled = false;
      this.stopBtnCUST.nativeElement.style.color = '#990000';
      if(this.roundsCUST > 0){
        this.CUSTSave.nativeElement.disabled = false;
        this.CUSTSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsCUST.nativeElement.disabled = false;
      this.questionCUST.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.CUSTballText.nativeElement.textContent = "Continuar"
      }else{
        this.CUSTballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleCUST){
          this.CUSTballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1CUST || this.hold2CUST){
          this.CUSTballText.nativeElement.textContent = "Segure"
        }else if(this.exhaleCUST){
          this.CUSTballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleCUST){
          this.CUSTballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1CUST || this.hold2CUST){
          this.CUSTballText.nativeElement.textContent = "Hold"
        }else if(this.exhaleCUST){
          this.CUSTballText.nativeElement.textContent = "Exhale"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnCUST.nativeElement.disabled = true;
      this.stopBtnCUST.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.CUSTSave.nativeElement.disabled = true;
      this.CUSTSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.CUSTinterval = setInterval(() => this.startTimerCUST(), 1000);
      this.CUSTTimer = setInterval(() => this.DisplayTimerCUST(), 1000);
      this.startCountdownCUST();
    }
  }
  startCountdownCUST(): void {
    if (this.CUSTduration !== Infinity) {
      let Contdownminutes = Math.floor(this.CUSTduration / 60);
      let Contdownseconds = this.CUSTduration % 60;
      this.CUSTcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.CUSTcountdown = setInterval( () => {
        if(this.CUSTduration == 0){
          clearInterval(this.CUSTcountdown); 
          this.CUSTcountdown = null;
        }else{
          this.CUSTduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.CUSTduration / 60);
          let Contdownseconds = this.CUSTduration % 60;
          this.CUSTcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.CUSTcountdownInput.nativeElement.value = '∞';
      this.CUSTcountdownInput.nativeElement.style.display = "inline";
      this.CUSTtimeInput.nativeElement.style.display = "none";
    }
  }
  async startTimerCUST(): Promise<void>{ 
    this.CUSTcurrentValue--;
    if(this.inhaleCUST && (this.CUSTcurrentValue == 1 || this.CUSTcurrentValue == 0)){
      this.CUSTcurrentValue = parseInt(this.hold1InputCUST.nativeElement.value) + 1;
      if(this.CUSTcurrentValue == 1){
        this.CUSTcurrentValue = parseInt(this.exhaleInputCUST.nativeElement.value) + 1;
        this.inhaleCUST = false;
        this.exhaleCUST = true;
        await this.audioService.playSound('exhale');
        await this.audioService.playBreathSound('exhaleBreath', this.CUSTcurrentValue); 
        if(this.isPortuguese){
          this.CUSTballText.nativeElement.textContent = "Espire"
        }else{
          this.CUSTballText.nativeElement.textContent = "Exhale"
        }
        this.globalService.changeBall(1, parseInt(this.exhaleInputCUST.nativeElement.value), this.CUSTball);
      }else{
        this.inhaleCUST = false;
        this.hold1CUST = true;
        await this.audioService.playSound('hold');
        if(this.isPortuguese){
          this.CUSTballText.nativeElement.textContent = "Segure"
        }else{
          this.CUSTballText.nativeElement.textContent = "Hold"
        }
        this.globalService.changeBall(1.3, parseInt(this.hold1InputCUST.nativeElement.value), this.CUSTball);
      }
    }
    else if(this.hold1CUST && this.CUSTcurrentValue == 1){
      this.CUSTcurrentValue = parseInt(this.exhaleInputCUST.nativeElement.value) + 1;
      this.hold1CUST = false;
      this.exhaleCUST = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.CUSTcurrentValue); 
      if(this.isPortuguese){
        this.CUSTballText.nativeElement.textContent = "Espire"
      }else{
        this.CUSTballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, parseInt(this.exhaleInputCUST.nativeElement.value), this.CUSTball);
    }
    else if(this.exhaleCUST && (this.CUSTcurrentValue == 1 || this.CUSTcurrentValue == 0)){
      if(this.CUSTduration !== 0){
        this.CUSTcurrentValue = parseInt(this.hold2InputCUST.nativeElement.value) + 1;
        if(this.CUSTcurrentValue == 1){
          this.CUSTcurrentValue = parseInt(this.inhaleInputCUST.nativeElement.value) + 1;
          this.exhaleCUST = false;
          this.inhaleCUST = true;
          await this.audioService.playSound('inhale');        
          await this.audioService.playBreathSound('inhaleBreath', this.CUSTcurrentValue); 
          if(this.isPortuguese){
            this.CUSTballText.nativeElement.textContent = "Inspire"
          }else{
            this.CUSTballText.nativeElement.textContent = "Inhale"
          }
          this.globalService.changeBall(1.5, parseInt(this.inhaleInputCUST.nativeElement.value), this.CUSTball);
          this.roundsCUST++;
          this.roundsDoneCUST.nativeElement.innerHTML = this.roundsCUST.toString();
        }else{
          this.exhaleCUST = false;
          this.hold2CUST = true;
          await this.audioService.playSound('hold');
          if(this.isPortuguese){
            this.CUSTballText.nativeElement.textContent = "Segure"
          }else{
            this.CUSTballText.nativeElement.textContent = "Hold"
          }
          this.globalService.changeBall(1, parseInt(this.hold2InputCUST.nativeElement.value), this.CUSTball);
          this.roundsCUST++;
          this.roundsDoneCUST.nativeElement.innerHTML = this.roundsCUST.toString();
        }
      } 
      else{
        this.clearIntervalsCUST();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnCUST.nativeElement.disabled = true;
        this.settingsCUST.nativeElement.disabled = false;
        this.questionCUST.nativeElement.disabled = false;
        this.stopBtnCUST.nativeElement.disabled = false;
        this.stopBtnCUST.nativeElement.style.color = '#990000';
        this.CUSTSave.nativeElement.disabled = false;
        this.CUSTSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.CUSTball);
        this.CUSTcountdownInput.nativeElement.style.display = "none";
        this.CUSTtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.CUSTballText.nativeElement.textContent = "Iniciar"
        }else{
          this.CUSTballText.nativeElement.textContent = "Start"
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
    else if(this.hold2CUST && this.CUSTcurrentValue == 1){
      this.CUSTcurrentValue = parseInt(this.inhaleInputCUST.nativeElement.value) + 1;
      this.hold2CUST = false;
      this.inhaleCUST = true;
      await this.audioService.playSound('inhale');
      if(this.isPortuguese){
        this.CUSTballText.nativeElement.textContent = "Inspire"
      }else{
        this.CUSTballText.nativeElement.textContent = "Inhale"
      }
      this.globalService.changeBall(1.5, parseInt(this.inhaleInputCUST.nativeElement.value), this.CUSTball);
    }
  }
  // Method to display the timer
  DisplayTimerCUST(): void {
    this.CUSTSeconds++;
    if (this.CUSTSeconds === 60) {
    this.CUSTSeconds = 0;
    this.CUSTMinutes++;
    }
    const M = this.CUSTMinutes < 10 ? '0' + this.CUSTMinutes : this.CUSTMinutes;
    const S = this.CUSTSeconds < 10 ? '0' + this.CUSTSeconds : this.CUSTSeconds;
    this.timerDisplayCUST.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopCUST(): void{
    this.clearIntervalsCUST();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.CUSTcountdownInput.nativeElement.style.display = "none";
    this.CUSTtimeInput.nativeElement.style.display = "inline";
    this.CUSTcurrentValue = parseInt(this.inhaleInputCUST.nativeElement.value) + 1;
    this.startBtnCUST.nativeElement.disabled = false;
    this.stopBtnCUST.nativeElement.disabled = true;
    this.stopBtnCUST.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CUSTSave.nativeElement.disabled = true;
    this.CUSTSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.inhaleCUST = true;
    this.hold1CUST = false;
    this.exhaleCUST = false;
    this.hold2CUST = false;
    this.globalService.changeBall(1, 1, this.CUSTball);
    if(this.isPortuguese){
      this.CUSTballText.nativeElement.textContent = "Iniciar"
    }else{
      this.CUSTballText.nativeElement.textContent = "Start"
    }
    this.roundsCUST = 0;
    this.roundsDoneCUST.nativeElement.innerHTML = "0";
    this.timerDisplayCUST.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setCUSTduration();
    this.CUSTSeconds = 0;
    this.CUSTMinutes = 0;
    this.roundsCUST = 0;
    this.inhaleInputCUST.nativeElement.disabled = false;
    this.hold1InputCUST.nativeElement.disabled = false;
    this.exhaleInputCUST.nativeElement.disabled = false;
    this.hold2InputCUST.nativeElement.disabled = false;
  }
  saveCUST(): void{
    this.CUSTResult = this.timerDisplayCUST.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('CUSTResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.CUSTResult, rounds: this.roundsCUST }); // Add the new result with the current date
    localStorage.setItem('CUSTResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.CUSTResultSaved.nativeElement.style.display = 'block';
    this.stopCUST();
  }
  
  clearIntervalsCUST(): void {
    clearInterval(this.CUSTinterval);
    clearInterval(this.CUSTcountdown); 
    clearInterval(this.CUSTTimer); 
    this.CUSTinterval = null;
    this.CUSTcountdown = null;
    this.CUSTTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopCUST(); 
    this.CUSTResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}