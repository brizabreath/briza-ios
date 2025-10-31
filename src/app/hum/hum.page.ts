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
  selector: 'app-hum',
  templateUrl: './hum.page.html',
  styleUrls: ['./hum.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule, 
    RouterModule
  ],
})
export class HUMPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalHUM') modalHUM!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalHUM') closeModalButtonHUM!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionHUM') questionHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('HUMdots') HUMdots!: ElementRef<HTMLDivElement>;
  @ViewChild('HUMball') HUMball!: ElementRef<HTMLDivElement>;
  @ViewChild('HUMballText') HUMballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('HUMtimeInput') HUMtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('HUMcountdownInput') HUMcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnHUM') startBtnHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnHUM') stopBtnHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('HUMSave') HUMSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsHUM') settingsHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneHUM') roundsDoneHUM!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayHUM') timerDisplayHUM!: ElementRef<HTMLDivElement>;
  @ViewChild('HUMResultSaved') HUMResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusHUM') minusHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusHUM') plusHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputHUM') inhaleInputHUM!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputHUM') hold1InputHUM!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputHUM') exhaleInputHUM!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputHUM') hold2InputHUM!: ElementRef<HTMLInputElement>;
  

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleHUM = true;
  private hold1HUM = false;
  private exhaleHUM = false;
  private hold2HUM = false;
  private HUMinterval: any = null; 
  private HUMcountdown: any = null; // Use 'any' or specify the correct type if known
  private HUMcurrentValue = 5;
  private HUMduration = 0; // Initialize duration as a number
  private HUMSeconds = 0;
  private HUMMinutes = 0;
  private roundsHUM = 0;
  private HUMTimer: any = null;
  private HUMResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;
  
  
  constructor(private navCtrl: NavController, private audioService: AudioService, public globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.minusHUM.nativeElement.onclick = () => this.minusRatioHUM();
    this.plusHUM.nativeElement.onclick = () => this.plusRatioHUM();
    this.globalService.initBulletSlider(this.modalHUM, this.HUMdots, 'slides');
    this.closeModalButtonHUM.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalHUM));
    this.questionHUM.nativeElement.onclick = () => this.globalService.openModal(this.modalHUM, this.HUMdots, 'slides');
      //populate input
    for (let HUMi = 2; HUMi <= 60; HUMi++) { // assuming 1 to 60 minutes
      let HUMoption = document.createElement('option');
      HUMoption.value = (HUMi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        HUMoption.textContent = HUMi + ' minutos';
      } else {
        HUMoption.textContent = HUMi + ' minutes';
      }
      this.HUMtimeInput.nativeElement.appendChild(HUMoption);
    }
    // Initialize buttons
    this.startBtnHUM.nativeElement.onclick = () => this.startHUM();
    this.stopBtnHUM.nativeElement.onclick = () => this.stopHUM();
    this.HUMSave.nativeElement.onclick = () => this.saveHUM();
    this.stopBtnHUM.nativeElement.disabled = true;
    this.stopBtnHUM.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HUMSave.nativeElement.disabled = true;
    this.HUMSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HUMtimeInput.nativeElement.onchange = () => this.setHUMduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
    
  }

  // Method to set the HUMduration after ViewChild is initialized
  setHUMduration(): void {
      const selectedValue = this.HUMtimeInput.nativeElement.value;
      
      // Check if the value is '∞', then set HUMduration accordingly
      if (selectedValue === 'infinity') {
        this.HUMduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.HUMduration = parseInt(selectedValue);
      }
  }

  async ionViewWillEnter() { 
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startHUM();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopHUM();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.HUMballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.HUMballText.nativeElement.textContent = "Start"
    }
    this.setHUMduration();
    this.HUMResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong(); 
  }
   minusRatioHUM(): void{
    if(parseInt(this.inhaleInputHUM.nativeElement.value) > 4){
      this.inhaleInputHUM.nativeElement.value = 
      ((parseInt(this.inhaleInputHUM.nativeElement.value) || 0) - 2).toString();
      this.hold1InputHUM.nativeElement.value = 
      ((parseInt(this.hold1InputHUM.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputHUM.nativeElement.value = 
      ((parseInt(this.exhaleInputHUM.nativeElement.value) || 0) - 3).toString();
      this.hold2InputHUM.nativeElement.value = 
      ((parseInt(this.hold2InputHUM.nativeElement.value) || 0) - 1).toString();
    }
  }
  plusRatioHUM():void{
    if(parseInt(this.inhaleInputHUM.nativeElement.value) < 30){
      this.inhaleInputHUM.nativeElement.value = 
      ((parseInt(this.inhaleInputHUM.nativeElement.value) || 0) + 2).toString();
      this.hold1InputHUM.nativeElement.value = 
      ((parseInt(this.hold1InputHUM.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputHUM.nativeElement.value = 
      ((parseInt(this.exhaleInputHUM.nativeElement.value) || 0) + 3).toString();
      this.hold2InputHUM.nativeElement.value = 
      ((parseInt(this.hold2InputHUM.nativeElement.value) || 0) + 1).toString();
    }
  }
  async startHUM(): Promise<void>{
    this.audioService.resetaudio(); 
    this.HUMcurrentValue = parseInt(this.inhaleInputHUM.nativeElement.value) + 1;
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsHUM.nativeElement.disabled = true;
    this.questionHUM.nativeElement.disabled = true;
    this.minusHUM.nativeElement.disabled = true;
    this.plusHUM.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnHUM.nativeElement.disabled = true;
      this.inhaleHUM = true;
      this.HUMcountdownInput.nativeElement.style.display = "inline";
      this.HUMtimeInput.nativeElement.style.display = "none";
      this.startCountdownHUM();
      this.HUMballText.nativeElement.textContent = "3";
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.HUMballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.HUMballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(async () => {
        if(this.isPortuguese){
          this.HUMballText.nativeElement.textContent = "Inspire";
        }else{
          this.HUMballText.nativeElement.textContent = "Inhale";
        }
        await this.audioService.playSound('inhale');        
        await this.audioService.playBreathSound('inhaleBreath', this.HUMcurrentValue); 
        this.globalService.changeBall(1.5, 5, this.HUMball);
        this.HUMinterval = setInterval(() => this.startTimerHUM(), 1000);
        this.HUMTimer = setInterval(() => this.DisplayTimerHUM(), 1000);
        this.startBtnHUM.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsHUM();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnHUM.nativeElement.disabled = false;
      this.stopBtnHUM.nativeElement.style.color = '#990000';
      if(this.roundsHUM > 0){
        this.HUMSave.nativeElement.disabled = false;
        this.HUMSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsHUM.nativeElement.disabled = false;
      this.questionHUM.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.HUMballText.nativeElement.textContent = "Continuar"
      }else{
        this.HUMballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleHUM){
          this.HUMballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1HUM || this.hold2HUM){
          this.HUMballText.nativeElement.textContent = "Segure"
        }else if(this.exhaleHUM){
          this.HUMballText.nativeElement.textContent = "Zumbir"
        }
      }else{
        if(this.inhaleHUM){
          this.HUMballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1HUM || this.hold2HUM){
          this.HUMballText.nativeElement.textContent = "Hold"
        }else if(this.exhaleHUM){
          this.HUMballText.nativeElement.textContent = "Hum"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnHUM.nativeElement.disabled = true;
      this.stopBtnHUM.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.HUMSave.nativeElement.disabled = true;
      this.HUMSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.HUMinterval = setInterval(() => this.startTimerHUM(), 1000);
      this.HUMTimer = setInterval(() => this.DisplayTimerHUM(), 1000);
      this.startCountdownHUM();
    }
  }
  startCountdownHUM(): void {
    if (this.HUMduration !== Infinity) {
      let Contdownminutes = Math.floor(this.HUMduration / 60);
      let Contdownseconds = this.HUMduration % 60;
      this.HUMcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.HUMcountdown = setInterval( () => {
        if(this.HUMduration == 0){
          clearInterval(this.HUMcountdown); 
          this.HUMcountdown = null;
        }else{
          this.HUMduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.HUMduration / 60);
          let Contdownseconds = this.HUMduration % 60;
          this.HUMcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.HUMcountdownInput.nativeElement.value = '∞';
      this.HUMcountdownInput.nativeElement.style.display = "inline";
      this.HUMtimeInput.nativeElement.style.display = "none";
    }
  }
  async startTimerHUM(): Promise<void>{ 
    this.HUMcurrentValue--;
    if(this.inhaleHUM && this.HUMcurrentValue == 1){
      this.HUMcurrentValue = parseInt(this.hold1InputHUM.nativeElement.value) + 1;
      this.inhaleHUM = false;
      this.hold1HUM = true;
      await this.audioService.playSound('pause');
      this.HUMballText.nativeElement.textContent = "Pause"
      this.globalService.changeBall(1.3, 3, this.HUMball);
    }
    else if(this.hold1HUM && this.HUMcurrentValue == 1){
      this.HUMcurrentValue = parseInt(this.exhaleInputHUM.nativeElement.value) + 1;
      this.hold1HUM = false;
      this.exhaleHUM = true;
      await this.audioService.playSound('hum');
      await this.audioService.playBreathSound('humming', this.HUMcurrentValue - 1); 
      if(this.isPortuguese){
        this.HUMballText.nativeElement.textContent = "Zumbir"
      }else{
        this.HUMballText.nativeElement.textContent = "Hum"
      }
      this.globalService.changeBall(1, 7, this.HUMball);
    }
    else if(this.exhaleHUM && this.HUMcurrentValue == 1){
      this.HUMcurrentValue = parseInt(this.hold2InputHUM.nativeElement.value) + 1;
      this.exhaleHUM = false;
      this.hold2HUM = true;
      await this.audioService.playSound('pause');
      this.HUMballText.nativeElement.textContent = "Pause"
      this.globalService.changeBall(1, 3, this.HUMball);
      this.roundsHUM++;
      this.roundsDoneHUM.nativeElement.innerHTML = this.roundsHUM.toString();
    }
    else if(this.hold2HUM && this.HUMcurrentValue == 1){
      if(this.HUMduration !== 0){
      this.HUMcurrentValue = parseInt(this.inhaleInputHUM.nativeElement.value) + 1;
        this.hold2HUM = false;
        this.inhaleHUM = true;
        await this.audioService.playSound('inhale');        
        await this.audioService.playBreathSound('inhaleBreath', this.HUMcurrentValue); 
        if(this.isPortuguese){
          this.HUMballText.nativeElement.textContent = "Inspire"
        }else{
          this.HUMballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, 5, this.HUMball);
      } 
      else{
        this.clearIntervalsHUM();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnHUM.nativeElement.disabled = true;
        this.settingsHUM.nativeElement.disabled = false;
        this.questionHUM.nativeElement.disabled = false;
        this.stopBtnHUM.nativeElement.disabled = false;
        this.stopBtnHUM.nativeElement.style.color = '#990000';
        this.HUMSave.nativeElement.disabled = false;
        this.HUMSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.HUMball);
        this.HUMcountdownInput.nativeElement.style.display = "none";
        this.HUMtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.HUMballText.nativeElement.textContent = "Iniciar"
        }else{
          this.HUMballText.nativeElement.textContent = "Start"
        }
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell("bell");
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }
    }
  }
  // Method to display the timer
  DisplayTimerHUM(): void {
    this.HUMSeconds++;
    if (this.HUMSeconds === 60) {
    this.HUMSeconds = 0;
    this.HUMMinutes++;
    }
    const M = this.HUMMinutes < 10 ? '0' + this.HUMMinutes : this.HUMMinutes;
    const S = this.HUMSeconds < 10 ? '0' + this.HUMSeconds : this.HUMSeconds;
    this.timerDisplayHUM.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopHUM(): void{
    this.clearIntervalsHUM();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.HUMcountdownInput.nativeElement.style.display = "none";
    this.HUMtimeInput.nativeElement.style.display = "inline";
    this.HUMcurrentValue = parseInt(this.inhaleInputHUM.nativeElement.value) + 1;
    this.startBtnHUM.nativeElement.disabled = false;
    this.stopBtnHUM.nativeElement.disabled = true;
    this.stopBtnHUM.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.HUMSave.nativeElement.disabled = true;
    this.HUMSave.nativeElement.style.color = 'rgb(177, 177, 177)';
     this.minusHUM.nativeElement.disabled = false;
    this.plusHUM.nativeElement.disabled = false;
    this.inhaleHUM = true;
    this.hold1HUM = false;
    this.exhaleHUM = false;
    this.hold2HUM = false;
    this.globalService.changeBall(1, 1, this.HUMball);
    if(this.isPortuguese){
      this.HUMballText.nativeElement.textContent = "Iniciar"
    }else{
      this.HUMballText.nativeElement.textContent = "Start"
    }
    this.roundsHUM = 0;
    this.roundsDoneHUM.nativeElement.innerHTML = "0";
    this.timerDisplayHUM.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setHUMduration();
    this.HUMSeconds = 0;
    this.HUMMinutes = 0;
    this.roundsHUM = 0;
  }
  saveHUM(): void{
    this.HUMResult = this.timerDisplayHUM.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('HUMResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.HUMResult, rounds: this.roundsHUM }); // Add the new result with the current date
    localStorage.setItem('HUMResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.HUMResultSaved.nativeElement.style.display = 'block';
    this.stopHUM();
  }
  
  clearIntervalsHUM(): void {
    clearInterval(this.HUMinterval);
    clearInterval(this.HUMcountdown); 
    clearInterval(this.HUMTimer); 
    this.HUMinterval = null;
    this.HUMcountdown = null;
    this.HUMTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    
    
    this.stopHUM(); 
    this.HUMResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}