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
  selector: 'app-bre',
  templateUrl: './bre.page.html',
  styleUrls: ['./bre.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BREPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalBRE') modalBRE!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalBRE') closeModalButtonBRE!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionBRE') questionBRE!: ElementRef<HTMLButtonElement>;
  @ViewChild('BREdots') BREdots!: ElementRef<HTMLDivElement>;
  @ViewChild('BREball') BREball!: ElementRef<HTMLDivElement>;
  @ViewChild('BREballText') BREballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('BREtimeInput') BREtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('BREcountdownInput') BREcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnBRE') startBtnBRE!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnBRE') stopBtnBRE!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRESave') BRESave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsBRE') settingsBRE!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputBRE') inhaleInputBRE!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputBRE') hold1InputBRE!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputBRE') exhaleInputBRE!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputBRE') hold2InputBRE!: ElementRef<HTMLInputElement>;
  @ViewChild('hold3InputBRE') hold3InputBRE!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneBRE') roundsDoneBRE!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayBRE') timerDisplayBRE!: ElementRef<HTMLDivElement>;
  @ViewChild('BREResultSaved') BREResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusBRE') minusBRE!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusBRE') plusBRE!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleBRE = true;
  private hold1BRE = false;
  private exhaleBRE = false;
  private hold2BRE = false;
  private hold3BRE = false;
  private BREinterval: any = null; 
  private BREcountdown: any = null; // Use 'any' or specify the correct type if known
  private BREcurrentValue = 6;
  private BREduration = 0; // Initialize duration as a number
  private roundsBRE = 0;
  private BRESeconds = 0;
  private BREMinutes = 0;
  private BRETimer: any = null;
  private BREResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;
  
  
  constructor(private navCtrl: NavController, private audioService: AudioService, public globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.globalService.initBulletSlider(this.modalBRE, this.BREdots, 'slides');
    this.closeModalButtonBRE.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalBRE));
    this.questionBRE.nativeElement.onclick = () => this.globalService.openModal(this.modalBRE, this.BREdots, 'slides');
    //populate input
    for (let BREi = 2; BREi <= 60; BREi++) { // assuming 1 to 60 minutes
      let BREoption = document.createElement('option');
      BREoption.value = (BREi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        BREoption.textContent = BREi + ' minutos';
      } else {
        BREoption.textContent = BREi + ' minutes';
      }
      this.BREtimeInput.nativeElement.appendChild(BREoption);
    }
    // Initialize buttons
    //modal events set up
    this.minusBRE.nativeElement.onclick = () => this.minusRatioBRE();
    this.plusBRE.nativeElement.onclick = () => this.plusRatioBRE();
    this.startBtnBRE.nativeElement.onclick = () => this.startBRE();
    this.stopBtnBRE.nativeElement.onclick = () => this.stopBRE();
    this.BRESave.nativeElement.onclick = () => this.saveBRE();
    this.stopBtnBRE.nativeElement.disabled = true;
    this.stopBtnBRE.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BRESave.nativeElement.disabled = true;
    this.BRESave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BREtimeInput.nativeElement.onchange = () => this.setBREduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
    
  }

  // Method to set the BREduration after ViewChild is initialized
  setBREduration(): void {
      const selectedValue = this.BREtimeInput.nativeElement.value;
      // Check if the value is '∞', then set BREduration accordingly
      if (selectedValue === 'infinity') {
        this.BREduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.BREduration = parseInt(selectedValue);
      }
  }

  async ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startBRE();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopBRE();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.BREballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.BREballText.nativeElement.textContent = "Start"
    }
    this.setBREduration();
    this.BREResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong();   
  }
  minusRatioBRE(): void{
    if(parseInt(this.hold3InputBRE.nativeElement.value) > 2){
      this.hold3InputBRE.nativeElement.value = 
      ((parseInt(this.hold3InputBRE.nativeElement.value) || 0) - 1).toString();
    }
  }
  plusRatioBRE():void{
    if(parseInt(this.hold3InputBRE.nativeElement.value) < 10){
      this.hold3InputBRE.nativeElement.value = 
      ((parseInt(this.hold3InputBRE.nativeElement.value) || 0) + 1).toString();
    }
  }
  async startBRE(): Promise<void>{
    this.audioService.resetaudio(); 
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsBRE.nativeElement.disabled = true;
    this.questionBRE.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnBRE.nativeElement.disabled = true;
      this.inhaleBRE = true;
      this.BREcountdownInput.nativeElement.style.display = "inline";
      this.BREtimeInput.nativeElement.style.display = "none";
      this.startCountdownBRE();
      this.BREballText.nativeElement.textContent = "3";
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.BREballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.BREballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(async () => {
        if(this.isPortuguese){
          this.BREballText.nativeElement.textContent = "Inspire";
        }else{
          this.BREballText.nativeElement.textContent = "Inhale";
        }
        await this.audioService.playSound('inhale');        
        await this.audioService.playBreathSound('inhaleBreath', this.BREcurrentValue - 1); 
        this.globalService.changeBall(1.5, 5, this.BREball);
        this.BREinterval = setInterval(() => this.startTimerBRE(), 1000);
        this.BRETimer = setInterval(() => this.DisplayTimerBRE(), 1000);
        this.startBtnBRE.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsBRE();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnBRE.nativeElement.disabled = false;
      this.stopBtnBRE.nativeElement.style.color = '#990000';
      if(this.roundsBRE > 0){
        this.BRESave.nativeElement.disabled = false;
        this.BRESave.nativeElement.style.color = '#49B79D';
      }
      this.settingsBRE.nativeElement.disabled = false;
      this.questionBRE.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.BREballText.nativeElement.textContent = "Continuar"
      }else{
        this.BREballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleBRE || this.exhaleBRE){
          this.BREballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1BRE || this.hold2BRE){
          this.BREballText.nativeElement.textContent = "Espire"
        }else if(this.hold3BRE){
          this.BREballText.nativeElement.textContent = "Segure"
        }
      }else{
        if(this.inhaleBRE || this.exhaleBRE){
          this.BREballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1BRE || this.hold2BRE){
          this.BREballText.nativeElement.textContent = "Exhale"
        }else if(this.hold3BRE){
          this.BREballText.nativeElement.textContent = "Hold"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnBRE.nativeElement.disabled = true;
      this.stopBtnBRE.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.BRESave.nativeElement.disabled = true;
      this.BRESave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.BREinterval = setInterval(() => this.startTimerBRE(), 1000);
      this.BRETimer = setInterval(() => this.DisplayTimerBRE(), 1000);
      this.startCountdownBRE();
    }
  }
  startCountdownBRE(): void {
    if (this.BREduration !== Infinity) {
      let Contdownminutes = Math.floor(this.BREduration / 60);
      let Contdownseconds = this.BREduration % 60;
      this.BREcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.BREcountdown = setInterval( () => {
        if(this.BREduration == 0){
          clearInterval(this.BREcountdown); 
          this.BREcountdown = null;
        }else{
          this.BREduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.BREduration / 60);
          let Contdownseconds = this.BREduration % 60;
          this.BREcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.BREcountdownInput.nativeElement.value = '∞';
      this.BREcountdownInput.nativeElement.style.display = "inline";
      this.BREtimeInput.nativeElement.style.display = "none";
    }
  }
  async startTimerBRE(): Promise<void>{ 
    this.BREcurrentValue--;
    if(this.inhaleBRE && this.BREcurrentValue == 1){
      this.BREcurrentValue = parseInt(this.hold1InputBRE.nativeElement.value) + 2;
      this.inhaleBRE = false;
      this.hold1BRE = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.BREcurrentValue - 1); 
      if(this.isPortuguese){
        this.BREballText.nativeElement.textContent = "Espire"
      }else{
        this.BREballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, 5, this.BREball);
    }
    else if(this.hold1BRE && this.BREcurrentValue == 1){
      this.BREcurrentValue = parseInt(this.exhaleInputBRE.nativeElement.value) + 2;
      this.hold1BRE = false;
      this.exhaleBRE = true;
      await this.audioService.playSound('inhale');
      await this.audioService.playBreathSound('inhaleBreath', this.BREcurrentValue - 1 ); 
      if(this.isPortuguese){
        this.BREballText.nativeElement.textContent = "Inspire"
      }else{
        this.BREballText.nativeElement.textContent = "Inhale"
      }
      this.globalService.changeBall(1.5, 5, this.BREball);
    }
    else if(this.exhaleBRE && this.BREcurrentValue == 1){
      this.BREcurrentValue = parseInt(this.hold2InputBRE.nativeElement.value) + 2;
      this.exhaleBRE = false;
      this.hold2BRE = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.BREcurrentValue - 1); 
      if(this.isPortuguese){
        this.BREballText.nativeElement.textContent = "Espire"
      }else{
        this.BREballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, 5, this.BREball);
    }
    else if(this.hold2BRE && this.BREcurrentValue == 1){
      this.BREcurrentValue = parseInt(this.hold3InputBRE.nativeElement.value) + 1;
      this.hold2BRE = false;
      this.hold3BRE = true;
      await this.audioService.playSound('hold');
      if(this.isPortuguese){
        this.BREballText.nativeElement.textContent = "Segure"
      }else{
        this.BREballText.nativeElement.textContent = "Hold"
      }
      this.roundsBRE++;
      this.roundsDoneBRE.nativeElement.innerHTML = this.roundsBRE.toString();
    }
    else if(this.hold3BRE && this.BREcurrentValue == 1){
      if(this.BREduration !== 0){  
        this.BREcurrentValue = parseInt(this.inhaleInputBRE.nativeElement.value) + 2;
        this.hold3BRE = false;
        this.inhaleBRE = true;
        await this.audioService.playSound('inhale');        
        await this.audioService.playBreathSound('inhaleBreath', this.BREcurrentValue - 1); 
        if(this.isPortuguese){
          this.BREballText.nativeElement.textContent = "Inspire"
        }else{
          this.BREballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, 5, this.BREball);
      } 
      else{   
        this.clearIntervalsBRE();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnBRE.nativeElement.disabled = true;
        this.settingsBRE.nativeElement.disabled = false;
        this.questionBRE.nativeElement.disabled = false;
        this.stopBtnBRE.nativeElement.disabled = false;
        this.stopBtnBRE.nativeElement.style.color = '#990000';
        this.BRESave.nativeElement.disabled = false;
        this.BRESave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.BREball);
        this.BREcountdownInput.nativeElement.style.display = "none";
        this.BREtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.BREballText.nativeElement.textContent = "Iniciar"
        }else{
          this.BREballText.nativeElement.textContent = "Start"
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
  DisplayTimerBRE(): void {
    this.BRESeconds++;
    if (this.BRESeconds === 60) {
    this.BRESeconds = 0;
    this.BREMinutes++;
    }
    const M = this.BREMinutes < 10 ? '0' + this.BREMinutes : this.BREMinutes;
    const S = this.BRESeconds < 10 ? '0' + this.BRESeconds : this.BRESeconds;
    this.timerDisplayBRE.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopBRE(): void{
    this.clearIntervalsBRE();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.BREcountdownInput.nativeElement.style.display = "none";
    this.BREtimeInput.nativeElement.style.display = "inline";
    this.BREcurrentValue = parseInt(this.inhaleInputBRE.nativeElement.value) + 1;
    this.startBtnBRE.nativeElement.disabled = false;
    this.stopBtnBRE.nativeElement.disabled = true;
    this.stopBtnBRE.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BRESave.nativeElement.disabled = true;
    this.BRESave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.inhaleBRE = true;
    this.hold1BRE = false;
    this.exhaleBRE = false;
    this.hold2BRE = false;
    this.hold3BRE = false;
    this.globalService.changeBall(1, 1, this.BREball);
    if(this.isPortuguese){
      this.BREballText.nativeElement.textContent = "Iniciar"
    }else{
      this.BREballText.nativeElement.textContent = "Start"
    }
    this.roundsBRE = 0;
    this.roundsDoneBRE.nativeElement.innerHTML = "0";
    this.timerDisplayBRE.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setBREduration();
    this.BRESeconds = 0;
    this.BREMinutes = 0;
    this.roundsBRE = 0;
  }
  saveBRE(): void{
    this.BREResult = this.timerDisplayBRE.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('BREResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.BREResult, rounds: this.roundsBRE }); // Add the new result with the current date
    localStorage.setItem('BREResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.BREResultSaved.nativeElement.style.display = 'block';
    this.stopBRE();
  }
  
  clearIntervalsBRE(): void {
    clearInterval(this.BREinterval);
    clearInterval(this.BREcountdown); 
    clearInterval(this.BRETimer); 
    this.BREinterval = null;
    this.BREcountdown = null;
    this.BRETimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    
    
    this.stopBRE(); 
    this.BREResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}