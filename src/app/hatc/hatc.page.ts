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
  selector: 'app-hatc',
  templateUrl: './hatc.page.html',
  styleUrls: ['./hatc.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class HATCPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalHATC') modalHATC!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalHATC') closeModalButtonHATC!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionHATC') questionHATC!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATCdots') HATCdots!: ElementRef<HTMLDivElement>;
  @ViewChild('HATCball') HATCball!: ElementRef<HTMLDivElement>;
  @ViewChild('HATCballText') HATCballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('HATCtimeInput') HATCtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('HATCcountdownInput') HATCcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnHATC') startBtnHATC!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnHATC') stopBtnHATC!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATCReset') HATCReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATCSave') HATCSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsHATC') settingsHATC!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneHATC') roundsDoneHATC!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayHATC') timerDisplayHATC!: ElementRef<HTMLDivElement>;
  @ViewChild('HATCResultSaved') HATCResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('HATCResults') HATCResults!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private holdHATC = true;
  private normalHATC = false;
  private HATCinterval: any = null; 
  private HATCcurrentValue = 0;
  private HATCduration = 0; // Initialize duration as a number
  private HATCSeconds = 0;
  private HATCMinutes = 0;
  private roundsHATC = 0;
  private HATCTimer: any = null;
  private HATCroundsResults: any[] = [];
  isModalOpen = false;

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
    //modal events set up
   this.globalService.initBulletSlider(this.modalHATC, this.HATCdots, 'slides');
    this.closeModalButtonHATC.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalHATC));
    this.questionHATC.nativeElement.onclick = () => this.globalService.openModal(this.modalHATC, this.HATCdots, 'slides');
     //populate input
    for (let HATCi = 2; HATCi <= 12; HATCi++) { // assuming 1 to 12 rounds
      let HATCoption = document.createElement('option');
      HATCoption.value = (HATCi).toString(); // Convert the number to a string
      HATCoption.textContent = HATCi + ' rounds';
      this.HATCtimeInput.nativeElement.appendChild(HATCoption);
    }
    // Initialize buttons
    this.startBtnHATC.nativeElement.onclick = () => this.startHATC();
    this.stopBtnHATC.nativeElement.onclick = () => this.pauseHATC();
    this.HATCReset.nativeElement.onclick = () => this.stopHATC();
    this.HATCSave.nativeElement.onclick = () => this.saveHATC();
    this.stopBtnHATC.nativeElement.disabled = true;
    this.stopBtnHATC.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HATCReset.nativeElement.disabled = true;
    this.HATCReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HATCSave.nativeElement.disabled = true;
    this.HATCSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HATCtimeInput.nativeElement.onchange = () => this.setHATCduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true");
    this.globalService.changeBall(1.3, 1, this.HATCball);
  }
  // Method to set the HATCduration after ViewChild is initialized
  setHATCduration(): void {
      const selectedValue = this.HATCtimeInput.nativeElement.value;
      
      // Check if the value is '∞', then set HATCduration accordingly
      if (selectedValue === 'infinity') {
        this.HATCduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.HATCduration = parseInt(selectedValue);
      }
  }

  async ionViewWillEnter() {
     // Listen for app state changes
     App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startHATC();
          this.globalService.clearAllTimeouts();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.HATCballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.HATCballText.nativeElement.textContent = "Start"
    }
    this.setHATCduration();
    this.HATCResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    //initialize sounds
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong(); 
    this.holdHATC = true;
  }
   
  async startHATC(): Promise<void>{
    //initialize sounds
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsHATC.nativeElement.disabled = true;
    this.questionHATC.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnHATC.nativeElement.disabled = true;
      this.holdHATC = true;
      this.HATCcountdownInput.nativeElement.style.display = "inline";
      this.HATCtimeInput.nativeElement.style.display = "none";
      this.startCountdownHATC();
      this.HATCballText.nativeElement.textContent = "3";
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.HATCballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.HATCballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(async () => {
        if(this.isPortuguese){
          this.HATCballText.nativeElement.textContent = "Comece a correr";
        }else{
          this.HATCballText.nativeElement.textContent = "Start running";
        }
        await this.audioService.playSound('pinchRun');
        this.HATCinterval = setInterval(() => this.startTimerHATC(), 1000);
        this.HATCTimer = setInterval(() => this.DisplayTimerHATC(), 1000);
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId5 = setTimeout(() => {
        this.stopBtnHATC.nativeElement.disabled = false;
        this.stopBtnHATC.nativeElement.style.color = '#0661AA';
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 6000);
      this.globalService.timeouts.push(timeoutId5); // Store the timeout ID
      
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      if(!this.holdHATC){
        this.clearIntervalsHATC();
        localStorage.setItem('breathingON', "false"); 
        this.stopBtnHATC.nativeElement.disabled = true;
        this.stopBtnHATC.nativeElement.style.color = 'rgb(177, 177, 177)';
        this.HATCReset.nativeElement.disabled = false;
        this.HATCReset.nativeElement.style.color = '#990000';
        if(this.roundsHATC > 0){
          this.HATCSave.nativeElement.disabled = false;
          this.HATCSave.nativeElement.style.color = '#49B79D';
        }
        this.settingsHATC.nativeElement.disabled = false;
        this.questionHATC.nativeElement.disabled = false;
        if(this.isPortuguese){
          this.HATCballText.nativeElement.textContent = "Continuar"
        }else{
          this.HATCballText.nativeElement.textContent = "Resume"
        }
        this.audioService.pauseSelectedSong();
      }
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.normalHATC){
          this.HATCballText.nativeElement.textContent = "Respiração Normal"
        }
      }else{
        if(this.normalHATC){
          this.HATCballText.nativeElement.textContent = "Normal Breathing"
        }    
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.HATCReset.nativeElement.disabled = true;
      this.HATCReset.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.HATCSave.nativeElement.disabled = true;
      this.HATCSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.HATCinterval = setInterval(() => this.startTimerHATC(), 1000);
      this.HATCTimer = setInterval(() => this.DisplayTimerHATC(), 1000);
    }
  }
  startCountdownHATC(): void {
    if (this.HATCduration !== Infinity) {
      if (this.HATCduration <= 1) {
        this.HATCcountdownInput.nativeElement.value = "Final round";   
      }else{
        this.HATCcountdownInput.nativeElement.value = this.HATCduration.toString() + " rounds left";   
      }
    } else {
      this.HATCcountdownInput.nativeElement.value = '∞';
      this.HATCcountdownInput.nativeElement.style.display = "inline";
      this.HATCtimeInput.nativeElement.style.display = "none";
    }
  }
  async startTimerHATC(): Promise<void>{ 
    if(this.normalHATC){
      this.HATCcurrentValue--;
      if(this.isPortuguese){
        this.HATCballText.nativeElement.textContent = this.HATCcurrentValue.toString() + " segundos"
      }else{
        this.HATCballText.nativeElement.textContent = this.HATCcurrentValue.toString() + " seconds"
      }
    }
    if(this.holdHATC){
      this.HATCcurrentValue++;
      if(this.isPortuguese){
        this.HATCballText.nativeElement.textContent = this.HATCcurrentValue.toString() + " segundos"
      }else{
        this.HATCballText.nativeElement.textContent = this.HATCcurrentValue.toString() + " seconds"
      }
    }
    if(this.normalHATC && this.HATCcurrentValue == 1){
      if(this.HATCduration !== 0){
        this.normalHATC = false;
        this.holdHATC = true;
        this.HATCcurrentValue = 0;
        this.startBtnHATC.nativeElement.disabled = true;
        if(this.isPortuguese){
          this.HATCballText.nativeElement.textContent = "Segure"
        }else{
          this.HATCballText.nativeElement.textContent = "Hold"
        }
        await this.audioService.playSound('pinchRun');
        this.stopBtnHATC.nativeElement.disabled = false;
        this.stopBtnHATC.nativeElement.style.color = '#0661AA';
      } 
      else{
        this.clearIntervalsHATC();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnHATC.nativeElement.disabled = true;
        this.settingsHATC.nativeElement.disabled = false;
        this.questionHATC.nativeElement.disabled = false;
        this.stopBtnHATC.nativeElement.disabled = true;
        this.stopBtnHATC.nativeElement.style.color = 'rgb(177, 177, 177)';
        this.HATCReset.nativeElement.disabled = false;
        this.HATCReset.nativeElement.style.color = '#990000';
        this.HATCSave.nativeElement.disabled = false;
        this.HATCSave.nativeElement.style.color = '#49B79D';
        this.HATCcountdownInput.nativeElement.style.display = "none";
        this.HATCtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.HATCballText.nativeElement.textContent = "Respiração Normal"
        }else{
          this.HATCballText.nativeElement.textContent = "Normal Breathing"
        }
        await this.audioService.playBell("bell");
        setTimeout(() => {
          this.audioService.pauseSelectedSong();
        }, 3000);
      }
    }
  }
  // Method to display the timer
  DisplayTimerHATC(): void {
    this.HATCSeconds++;
    if (this.HATCSeconds === 60) {
    this.HATCSeconds = 0;
    this.HATCMinutes++;
    }
    const M = this.HATCMinutes < 10 ? '0' + this.HATCMinutes : this.HATCMinutes;
    const S = this.HATCSeconds < 10 ? '0' + this.HATCSeconds : this.HATCSeconds;
    this.timerDisplayHATC.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopHATC(): void{
    this.clearIntervalsHATC();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.HATCcountdownInput.nativeElement.style.display = "none";
    this.HATCtimeInput.nativeElement.style.display = "inline";
    this.HATCcurrentValue = 0;
    this.startBtnHATC.nativeElement.disabled = false;
    this.stopBtnHATC.nativeElement.disabled = true;
    this.stopBtnHATC.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HATCReset.nativeElement.disabled = true;
    this.HATCReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HATCSave.nativeElement.disabled = true;
    this.HATCSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.holdHATC = true;
    this.normalHATC = false;
    if(this.isPortuguese){
      this.HATCballText.nativeElement.textContent = "Iniciar"
    }else{
      this.HATCballText.nativeElement.textContent = "Start"
    }
    this.roundsHATC = 0;
    this.roundsDoneHATC.nativeElement.innerHTML = "0";
    this.timerDisplayHATC.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setHATCduration();
    this.HATCSeconds = 0;
    this.HATCMinutes = 0;
    this.roundsHATC = 0;
    this.HATCResults.nativeElement.innerHTML = "";

  }
  async pauseHATC(): Promise<void>{
    this.startBtnHATC.nativeElement.disabled = false;
    this.clearIntervalsHATC();
    this.holdHATC = false;
    this.normalHATC = true;
    this.stopBtnHATC.nativeElement.disabled = true;
    this.stopBtnHATC.nativeElement.style.color = 'rgb(177, 177, 177)';
    if(this.isPortuguese){
      this.HATCballText.nativeElement.textContent = "Respiração Normal"
    }else{
      this.HATCballText.nativeElement.textContent = "Normal Breathing"
    }
    await this.audioService.playSound('normalbreath');
    this.roundsHATC++;
    this.roundsDoneHATC.nativeElement.innerHTML = this.roundsHATC.toString();
    this.HATCduration = this.HATCduration - 1;
    if (this.HATCduration !== Infinity) {
      if (this.HATCduration <= 1) {
        this.HATCcountdownInput.nativeElement.value = "Final round";   
      }else{
        this.HATCcountdownInput.nativeElement.value = this.HATCduration.toString() + " rounds left";   
      }
    } else {
      this.HATCcountdownInput.nativeElement.value = '∞';
    }     
    if (this.isPortuguese) {
      this.HATCResults.nativeElement.innerHTML += "<div class='NOfSteps'> <div>Round " + this.roundsHATC + "</div><div>" + this.HATCcurrentValue + " segundos</div></div>";
    } else {
      this.HATCResults.nativeElement.innerHTML += "<div class='NOfSteps'> <div>Round " + this.roundsHATC + "</div><div>" + this.HATCcurrentValue + " seconds</div></div>";
    }
    this.HATCroundsResults.push(this.HATCcurrentValue);
    this.HATCcurrentValue = 61;
    this.HATCinterval = setInterval(() => this.startTimerHATC(), 1000);
    this.HATCTimer = setInterval(() => this.DisplayTimerHATC(), 1000);
  }
  saveHATC(): void{
    const savedResults = JSON.parse(localStorage.getItem('HATCResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), roundsResult: this.HATCroundsResults, result: this.timerDisplayHATC.nativeElement.innerHTML, rounds: this.roundsHATC }); // Add the new result with the current date
    localStorage.setItem('HATCResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.HATCResultSaved.nativeElement.style.display = 'block';
    this.stopHATC();
    this.HATCroundsResults = [];
  }
  
  clearIntervalsHATC(): void {
    clearInterval(this.HATCinterval);
    clearInterval(this.HATCTimer); 
    this.HATCinterval = null;
    this.HATCTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopHATC(); 
    this.HATCResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}