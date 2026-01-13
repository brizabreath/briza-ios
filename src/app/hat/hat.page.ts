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
  selector: 'app-hat',
  templateUrl: './hat.page.html',
  styleUrls: ['./hat.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class HATPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalHAT') modalHAT!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalHAT') closeModalButtonHAT!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionHAT') questionHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATdots') HATdots!: ElementRef<HTMLDivElement>;
  @ViewChild('HATball') HATball!: ElementRef<HTMLDivElement>;
  @ViewChild('HATballText') HATballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('HATtimeInput') HATtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('HATcountdownInput') HATcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnHAT') startBtnHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATReset') HATReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATSave') HATSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsHAT') settingsHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneHAT') roundsDoneHAT!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayHAT') timerDisplayHAT!: ElementRef<HTMLDivElement>;
  @ViewChild('HATResultSaved') HATResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('HATResults') HATResults!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private holdHAT = true;
  private lightHAT = false;
  private normalHAT = false;
  private HATinterval: any = null; 
  private HATcurrentValue = 0;
  private HATduration = 0; // Initialize duration as a number
  private HATSeconds = 0;
  private HATMinutes = 0;
  private roundsHAT = 0;
  private HATTimer: any = null;
  private HATroundsResults: any[] = [];
  isModalOpen = false;
  
  
  constructor(private navCtrl: NavController, private audioService: AudioService, public globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.globalService.initBulletSlider(this.modalHAT, this.HATdots, 'slides');
    this.closeModalButtonHAT.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalHAT));
    this.questionHAT.nativeElement.onclick = () => this.globalService.openModal(this.modalHAT, this.HATdots, 'slides');
    //populate input
    for (let HATi = 2; HATi <= 12; HATi++) { // assuming 1 to 12 rounds
      let HAToption = document.createElement('option');
      HAToption.value = (HATi).toString(); // Convert the number to a string
      HAToption.textContent = HATi + ' rounds';
      this.HATtimeInput.nativeElement.appendChild(HAToption);
    }
    // Initialize buttons
    this.startBtnHAT.nativeElement.onclick = () => this.startHAT();
    this.HATReset.nativeElement.onclick = () => this.stopHAT();
    this.HATSave.nativeElement.onclick = () => this.saveHAT();
    this.HATReset.nativeElement.disabled = true;
    this.HATReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HATSave.nativeElement.disabled = true;
    this.HATSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HATtimeInput.nativeElement.onchange = () => this.setHATduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true");
    this.globalService.changeBall(1.3, 1, this.HATball);
    
  }

  // Method to set the HATduration after ViewChild is initialized
  setHATduration(): void {
      const selectedValue = this.HATtimeInput.nativeElement.value;
      
      // Check if the value is '∞', then set HATduration accordingly
      if (selectedValue === 'infinity') {
        this.HATduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.HATduration = parseInt(selectedValue);
      }
  }

  async ionViewWillEnter() {
     // Listen for app state changes
     App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startHAT();
          this.globalService.clearAllTimeouts();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.HATballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.HATballText.nativeElement.textContent = "Start"
    }
    this.setHATduration();
    this.HATResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong(); 
    this.holdHAT = true;
  }
  
  async startHAT(): Promise<void>{
    this.audioService.resetaudio(); 
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsHAT.nativeElement.disabled = true;
    this.questionHAT.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnHAT.nativeElement.disabled = true;
      this.HATcountdownInput.nativeElement.style.display = "inline";
      this.HATtimeInput.nativeElement.style.display = "none";
      this.startCountdownHAT();
      this.HATballText.nativeElement.textContent = "3";
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(async () => {
        await this.audioService.playSound('exhale');
        this.HATballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.HATballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(async () => {
        if(this.isPortuguese){
          this.HATballText.nativeElement.textContent = "Comece a andar";
        }else{
          this.HATballText.nativeElement.textContent = "Start walking";
        }
        setTimeout(async () => {
          await this.audioService.playSound('pinchWalk');
        }, 1000);
        this.HATinterval = setInterval(() => this.startTimerHAT(), 1000);
        this.HATTimer = setInterval(() => this.DisplayTimerHAT(), 1000);
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      const timeoutId5 = setTimeout(() => {
      this.startBtnHAT.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
        this.holdHAT = true;
      }, 6000);
      this.globalService.timeouts.push(timeoutId5); // Store the timeout ID
      
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      if(!this.holdHAT){
        this.clearIntervalsHAT();
        localStorage.setItem('breathingON', "false"); 
        this.HATReset.nativeElement.disabled = false;
        this.HATReset.nativeElement.style.color = '#990000';
        if(this.roundsHAT > 0){
          this.HATSave.nativeElement.disabled = false;
          this.HATSave.nativeElement.style.color = '#49B79D';
        }
        this.settingsHAT.nativeElement.disabled = false;
        this.questionHAT.nativeElement.disabled = false;
        if(this.isPortuguese){
          this.HATballText.nativeElement.textContent = "Continuar"
        }else{
          this.HATballText.nativeElement.textContent = "Resume"
        }
        this.audioService.pauseSelectedSong();
      }else{
        this.pauseHAT();
      }
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.normalHAT){
          this.HATballText.nativeElement.textContent = "Respiração Normal"
        }else if(this.lightHAT){
          this.HATballText.nativeElement.textContent = "Respiração Leve"
        }
      }else{
        if(this.normalHAT){
          this.HATballText.nativeElement.textContent = "Normal Breathing"
        }else if(this.lightHAT){
          this.HATballText.nativeElement.textContent = "Light Breathing"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.HATReset.nativeElement.disabled = true;
      this.HATReset.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.HATSave.nativeElement.disabled = true;
      this.HATSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.HATinterval = setInterval(() => this.startTimerHAT(), 1000);
      this.HATTimer = setInterval(() => this.DisplayTimerHAT(), 1000);
    }
  }
  startCountdownHAT(): void {
    if (this.HATduration !== Infinity) {
      if (this.HATduration <= 1) {
        this.HATcountdownInput.nativeElement.value = "Final round";   
      }else{
        this.HATcountdownInput.nativeElement.value = this.HATduration.toString() + " rounds left";   
      }
    } else {
      this.HATcountdownInput.nativeElement.value = '∞';
      this.HATcountdownInput.nativeElement.style.display = "inline";
      this.HATtimeInput.nativeElement.style.display = "none";
    }
  }
  async startTimerHAT(): Promise<void>{ 
    if(this.normalHAT || this.lightHAT){
      this.HATcurrentValue--;
      if(this.isPortuguese){
        this.HATballText.nativeElement.textContent = this.HATcurrentValue.toString() + " segundos"
      }else{
        this.HATballText.nativeElement.textContent = this.HATcurrentValue.toString() + " seconds"
      }
    }
    if(this.holdHAT){
      this.HATcurrentValue++;
      if(this.isPortuguese){
        this.HATballText.nativeElement.textContent = this.HATcurrentValue.toString() + " segundos"
      }else{
        this.HATballText.nativeElement.textContent = this.HATcurrentValue.toString() + " seconds"
      }
    }
    if(this.lightHAT && this.HATcurrentValue == 1){
      this.HATcurrentValue = 31;
      this.lightHAT = false;
      this.normalHAT = true;
      if(this.isPortuguese){
        this.HATballText.nativeElement.textContent = "Respiração Normal"
      }else{
        this.HATballText.nativeElement.textContent = "Normal Breathing"
      }
      await this.audioService.playSound('normalbreath');
    }
    else if(this.normalHAT && this.HATcurrentValue == 1){
      if(this.HATduration !== 0){
        this.normalHAT = false;
        this.holdHAT = true;
        this.HATcurrentValue = 0;
        if(this.isPortuguese){
          this.HATballText.nativeElement.textContent = "Segure"
        }else{
          this.HATballText.nativeElement.textContent = "Hold"
        }
        await this.audioService.playSound('pinchWalk');
      } 
      else{
        this.clearIntervalsHAT();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnHAT.nativeElement.disabled = true;
        this.settingsHAT.nativeElement.disabled = false;
        this.questionHAT.nativeElement.disabled = false;
        this.HATReset.nativeElement.disabled = false;
        this.HATReset.nativeElement.style.color = '#990000';
        this.HATSave.nativeElement.disabled = false;
        this.HATSave.nativeElement.style.color = '#49B79D';
        this.HATcountdownInput.nativeElement.style.display = "none";
        this.HATtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.HATballText.nativeElement.textContent = "Respiração Normal"
        }else{
          this.HATballText.nativeElement.textContent = "Normal Breathing"
        }
        this.audioService.pauseSelectedSong();
        await this.audioService.playBell("bell");         
      }
    }
  }
  // Method to display the timer
  DisplayTimerHAT(): void {
    this.HATSeconds++;
    if (this.HATSeconds === 60) {
    this.HATSeconds = 0;
    this.HATMinutes++;
    }
    const M = this.HATMinutes < 10 ? '0' + this.HATMinutes : this.HATMinutes;
    const S = this.HATSeconds < 10 ? '0' + this.HATSeconds : this.HATSeconds;
    this.timerDisplayHAT.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopHAT(): void{
    this.clearIntervalsHAT();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.HATcountdownInput.nativeElement.style.display = "none";
    this.HATtimeInput.nativeElement.style.display = "inline";
    this.HATcurrentValue = 0;
    this.startBtnHAT.nativeElement.disabled = false;
    this.HATReset.nativeElement.disabled = true;
    this.HATReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HATSave.nativeElement.disabled = true;
    this.HATSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.holdHAT = true;
    this.normalHAT = false;
    this.lightHAT = false;
    if(this.isPortuguese){
      this.HATballText.nativeElement.textContent = "Iniciar"
    }else{
      this.HATballText.nativeElement.textContent = "Start"
    }
    this.roundsHAT = 0;
    this.roundsDoneHAT.nativeElement.innerHTML = "0";
    this.timerDisplayHAT.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setHATduration();
    this.HATSeconds = 0;
    this.HATMinutes = 0;
    this.roundsHAT = 0;
    this.HATResults.nativeElement.innerHTML = "";

  }
  async pauseHAT(): Promise<void>{
    this.clearIntervalsHAT();
    this.holdHAT = false;
    this.normalHAT = false;
    this.lightHAT = true;
    if(this.isPortuguese){
      this.HATballText.nativeElement.textContent = "Respiração Leve"
    }else{
      this.HATballText.nativeElement.textContent = "Light Breathing"
    }
    await this.audioService.playSound('lightNasal');
    this.roundsHAT++;
    this.roundsDoneHAT.nativeElement.innerHTML = this.roundsHAT.toString();
    this.HATduration = this.HATduration - 1;
    if (this.HATduration !== Infinity) {
      if (this.HATduration <= 1) {
        this.HATcountdownInput.nativeElement.value = "Final round";   
      }else{
        this.HATcountdownInput.nativeElement.value = this.HATduration.toString() + " rounds left";   
      }
    } else {
      this.HATcountdownInput.nativeElement.value = '∞';
    }        
    if (this.isPortuguese) {
      this.HATResults.nativeElement.innerHTML += "<div class='NOfSteps'> <div>Round " + this.roundsHAT + "</div><div>" + this.HATcurrentValue + " segundos</div></div>";
    } else {
      this.HATResults.nativeElement.innerHTML += "<div class='NOfSteps'> <div>Round " + this.roundsHAT + "</div><div>" + this.HATcurrentValue + " seconds</div></div>";
    }
    this.HATroundsResults.push(this.HATcurrentValue);
    this.HATcurrentValue = 16;
    this.HATinterval = setInterval(() => this.startTimerHAT(), 1000);
    this.HATTimer = setInterval(() => this.DisplayTimerHAT(), 1000);
  }
  saveHAT(): void{
    const savedResults = JSON.parse(localStorage.getItem('HATResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), roundsResult: this.HATroundsResults, result: this.timerDisplayHAT.nativeElement.innerHTML,  rounds: this.roundsHAT }); // Add the new result with the current date
    localStorage.setItem('HATResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.HATResultSaved.nativeElement.style.display = 'block';
    this.stopHAT();
    this.HATroundsResults = [];
  }
  
  clearIntervalsHAT(): void {
    clearInterval(this.HATinterval);
    clearInterval(this.HATTimer); 
    this.HATinterval = null;
    this.HATTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    
    
    this.stopHAT(); 
    this.HATResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}