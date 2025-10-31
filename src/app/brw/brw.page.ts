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
  selector: 'app-brw',
  templateUrl: './brw.page.html',
  styleUrls: ['./brw.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BRWPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalBRW') modalBRW!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalBRW') closeModalButtonBRW!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionBRW') questionBRW!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRWdots') BRWdots!: ElementRef<HTMLDivElement>;
  @ViewChild('BRWball') BRWball!: ElementRef<HTMLDivElement>;
  @ViewChild('BRWballText') BRWballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('BRWtimeInput') BRWtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('BRWcountdownInput') BRWcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnBRW') startBtnBRW!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnBRW') stopBtnBRW!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRWSave') BRWSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsBRW') settingsBRW!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputBRW') inhaleInputBRW!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputBRW') hold1InputBRW!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputBRW') exhaleInputBRW!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputBRW') hold2InputBRW!: ElementRef<HTMLInputElement>;
  @ViewChild('hold3InputBRW') hold3InputBRW!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneBRW') roundsDoneBRW!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayBRW') timerDisplayBRW!: ElementRef<HTMLDivElement>;
  @ViewChild('BRWResultSaved') BRWResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusBRW') minusBRW!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusBRW') plusBRW!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleBRW = true;
  private hold1BRW = false;
  private exhaleBRW = false;
  private hold2BRW = false;
  private hold3BRW = false;
  private BRWinterval: any = null; 
  private BRWcountdown: any = null; // Use 'any' or specify the correct type if known
  private BRWcurrentValue = 5;
  private BRWduration = 0; // Initialize duration as a number
  private roundsBRW = 0;
  private BRWSeconds = 0;
  private BRWMinutes = 0;
  private BRWTimer: any = null;
  private BRWResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;
  
  
  constructor(private navCtrl: NavController, private audioService: AudioService, public globalService: GlobalService) {}
  ngAfterViewInit(): void {
   this.globalService.initBulletSlider(this.modalBRW, this.BRWdots, 'slides');
    this.closeModalButtonBRW.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalBRW));
    this.questionBRW.nativeElement.onclick = () => this.globalService.openModal(this.modalBRW, this.BRWdots, 'slides');
    //populate input
    for (let BRWi = 2; BRWi <= 60; BRWi++) { // assuming 1 to 60 minutes
      let BRWoption = document.createElement('option');
      BRWoption.value = (BRWi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        BRWoption.textContent = BRWi + ' minutos';
      } else {
        BRWoption.textContent = BRWi + ' minutes';
      }
      this.BRWtimeInput.nativeElement.appendChild(BRWoption);
    }
    // Initialize buttons
    //modal events set up
    this.minusBRW.nativeElement.onclick = () => this.minusRatioBRW();
    this.plusBRW.nativeElement.onclick = () => this.plusRatioBRW();
    this.startBtnBRW.nativeElement.onclick = () => this.startBRW();
    this.stopBtnBRW.nativeElement.onclick = () => this.stopBRW();
    this.BRWSave.nativeElement.onclick = () => this.saveBRW();
    this.stopBtnBRW.nativeElement.disabled = true;
    this.stopBtnBRW.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BRWSave.nativeElement.disabled = true;
    this.BRWSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BRWtimeInput.nativeElement.onchange = () => this.setBRWduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
    
  }

  // Method to set the BRWduration after ViewChild is initialized
  setBRWduration(): void {
      const selectedValue = this.BRWtimeInput.nativeElement.value;
      // Check if the value is '∞', then set BRWduration accordingly
      if (selectedValue === 'infinity') {
        this.BRWduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.BRWduration = parseInt(selectedValue);
      }
  }

  async ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startBRW();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopBRW();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.BRWballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.BRWballText.nativeElement.textContent = "Start"
    }
    this.setBRWduration();
    this.BRWResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong(); 
  }
   
  minusRatioBRW(): void{
    if(parseInt(this.hold3InputBRW.nativeElement.value) > 2){
      this.hold3InputBRW.nativeElement.value = 
      ((parseInt(this.hold3InputBRW.nativeElement.value) || 0) - 1).toString();
    }
  }
  plusRatioBRW():void{
    if(parseInt(this.hold3InputBRW.nativeElement.value) < 10){
      this.hold3InputBRW.nativeElement.value = 
      ((parseInt(this.hold3InputBRW.nativeElement.value) || 0) + 1).toString();
    }
  }
  async startBRW(): Promise<void>{
    this.audioService.resetaudio(); 
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsBRW.nativeElement.disabled = true;
    this.questionBRW.nativeElement.disabled = true;
    this.minusBRW.nativeElement.disabled = true;
    this.plusBRW.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnBRW.nativeElement.disabled = true;
      this.inhaleBRW = true; 
      this.BRWcountdownInput.nativeElement.style.display = "inline";
      this.BRWtimeInput.nativeElement.style.display = "none";
      this.startCountdownBRW();
      this.BRWballText.nativeElement.textContent = "3";
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.BRWballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.BRWballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(async () => {
        if(this.isPortuguese){
          this.BRWballText.nativeElement.textContent = "Inspire";
        }else{
          this.BRWballText.nativeElement.textContent = "Inhale";
        }
        await this.audioService.playSound('inhale');        
        await this.audioService.playBreathSound('inhaleBreath', this.BRWcurrentValue); 
        this.globalService.changeBall(1.5, 5, this.BRWball);
        this.BRWinterval = setInterval(() => this.startTimerBRW(), 1000);
        this.BRWTimer = setInterval(() => this.DisplayTimerBRW(), 1000);
        this.startBtnBRW.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false");
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsBRW();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnBRW.nativeElement.disabled = false;
      this.stopBtnBRW.nativeElement.style.color = '#990000';
      if(this.roundsBRW > 0){
        this.BRWSave.nativeElement.disabled = false;
        this.BRWSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsBRW.nativeElement.disabled = false;
      this.questionBRW.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.BRWballText.nativeElement.textContent = "Continuar"
      }else{
        this.BRWballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
     //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleBRW || this.exhaleBRW){
          this.BRWballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1BRW || this.hold2BRW){
          this.BRWballText.nativeElement.textContent = "Espire"
        }else if(this.hold3BRW){
          this.BRWballText.nativeElement.textContent = "Segure"
        }
      }else{
        if(this.inhaleBRW || this.exhaleBRW){
          this.BRWballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1BRW || this.hold2BRW){
          this.BRWballText.nativeElement.textContent = "Exhale"
        }else if(this.hold3BRW){
          this.BRWballText.nativeElement.textContent = "Hold"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnBRW.nativeElement.disabled = true;
      this.stopBtnBRW.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.BRWSave.nativeElement.disabled = true;
      this.BRWSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.BRWinterval = setInterval(() => this.startTimerBRW(), 1000);
      this.BRWTimer = setInterval(() => this.DisplayTimerBRW(), 1000);
      this.startCountdownBRW();
    }
  }
  startCountdownBRW(): void {
    if (this.BRWduration !== Infinity) {
      let Contdownminutes = Math.floor(this.BRWduration / 60);
      let Contdownseconds = this.BRWduration % 60;
      this.BRWcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.BRWcountdown = setInterval( () => {
        if(this.BRWduration == 0){
          clearInterval(this.BRWcountdown); 
          this.BRWcountdown = null;
        }else{
          this.BRWduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.BRWduration / 60);
          let Contdownseconds = this.BRWduration % 60;
          this.BRWcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.BRWcountdownInput.nativeElement.value = '∞';
      this.BRWcountdownInput.nativeElement.style.display = "inline";
      this.BRWtimeInput.nativeElement.style.display = "none";
    }
  }
  async startTimerBRW(): Promise<void>{ 
    this.BRWcurrentValue--;
    if(this.inhaleBRW && this.BRWcurrentValue == 1){
      this.BRWcurrentValue = parseInt(this.hold1InputBRW.nativeElement.value) + 1;
      this.inhaleBRW = false;
      this.hold1BRW = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.BRWcurrentValue); 
      if(this.isPortuguese){
        this.BRWballText.nativeElement.textContent = "Espire"
      }else{
        this.BRWballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, 5, this.BRWball);
    }
    else if(this.hold1BRW && this.BRWcurrentValue == 1){
      this.BRWcurrentValue = parseInt(this.exhaleInputBRW.nativeElement.value) + 1;
      this.hold1BRW = false;
      this.exhaleBRW = true;
      await this.audioService.playSound('inhale');
      if(this.isPortuguese){
        this.BRWballText.nativeElement.textContent = "Inspire"
      }else{
        this.BRWballText.nativeElement.textContent = "Inhale"
      }
      this.globalService.changeBall(1.5, 5, this.BRWball);
    }
    else if(this.exhaleBRW && this.BRWcurrentValue == 1){
      this.BRWcurrentValue = parseInt(this.hold2InputBRW.nativeElement.value) + 1;
      this.exhaleBRW = false;
      this.hold2BRW = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.BRWcurrentValue); 
      if(this.isPortuguese){
        this.BRWballText.nativeElement.textContent = "Espire"
      }else{
        this.BRWballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, 5, this.BRWball);
    }
    else if(this.hold2BRW && this.BRWcurrentValue == 1){
      this.BRWcurrentValue = parseInt(this.hold3InputBRW.nativeElement.value) + 1;
      this.hold2BRW = false;
      this.hold3BRW = true;
      await this.audioService.playSound('hold');
      if(this.isPortuguese){
        this.BRWballText.nativeElement.textContent = "Segure"
      }else{
        this.BRWballText.nativeElement.textContent = "Hold"
      }
      this.roundsBRW++;
      this.roundsDoneBRW.nativeElement.innerHTML = this.roundsBRW.toString();
    }
    else if(this.hold3BRW && this.BRWcurrentValue == 1){
      if(this.BRWduration !== 0){  
        this.BRWcurrentValue = parseInt(this.inhaleInputBRW.nativeElement.value) + 1;
        this.hold3BRW = false;
        this.inhaleBRW = true;
        await this.audioService.playSound('inhale');        
        await this.audioService.playBreathSound('inhaleBreath', this.BRWcurrentValue); 
        if(this.isPortuguese){
          this.BRWballText.nativeElement.textContent = "Inspire"
        }else{
          this.BRWballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, 5, this.BRWball);
      } 
      else{
         
        this.clearIntervalsBRW();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnBRW.nativeElement.disabled = true;
        this.settingsBRW.nativeElement.disabled = false;
        this.questionBRW.nativeElement.disabled = false;
        this.stopBtnBRW.nativeElement.disabled = false;
        this.stopBtnBRW.nativeElement.style.color = '#990000';
        this.BRWSave.nativeElement.disabled = false;
        this.BRWSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.BRWball);
        this.BRWcountdownInput.nativeElement.style.display = "none";
        this.BRWtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.BRWballText.nativeElement.textContent = "Iniciar"
        }else{
          this.BRWballText.nativeElement.textContent = "Start"
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
  DisplayTimerBRW(): void {
    this.BRWSeconds++;
    if (this.BRWSeconds === 60) {
    this.BRWSeconds = 0;
    this.BRWMinutes++;
    }
    const M = this.BRWMinutes < 10 ? '0' + this.BRWMinutes : this.BRWMinutes;
    const S = this.BRWSeconds < 10 ? '0' + this.BRWSeconds : this.BRWSeconds;
    this.timerDisplayBRW.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopBRW(): void{
    this.clearIntervalsBRW();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.BRWcountdownInput.nativeElement.style.display = "none";
    this.BRWtimeInput.nativeElement.style.display = "inline";
    this.BRWcurrentValue = parseInt(this.inhaleInputBRW.nativeElement.value) + 1;
    this.startBtnBRW.nativeElement.disabled = false;
    this.stopBtnBRW.nativeElement.disabled = true;
    this.stopBtnBRW.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BRWSave.nativeElement.disabled = true;
    this.BRWSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.minusBRW.nativeElement.disabled = false;
    this.plusBRW.nativeElement.disabled = false;
    this.inhaleBRW = true;
    this.hold1BRW = false;
    this.exhaleBRW = false;
    this.hold2BRW = false;
    this.hold3BRW = false;
    this.globalService.changeBall(1, 1, this.BRWball);
    if(this.isPortuguese){
      this.BRWballText.nativeElement.textContent = "Iniciar"
    }else{
      this.BRWballText.nativeElement.textContent = "Start"
    }
    this.roundsBRW = 0;
    this.roundsDoneBRW.nativeElement.innerHTML = "0";
    this.timerDisplayBRW.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setBRWduration();
    this.BRWSeconds = 0;
    this.BRWMinutes = 0;
    this.roundsBRW = 0;
  }
  saveBRW(): void{
    this.BRWResult = this.timerDisplayBRW.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('BRWResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.BRWResult, rounds: this.roundsBRW }); // Add the new result with the current date
    localStorage.setItem('BRWResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.BRWResultSaved.nativeElement.style.display = 'block';
    this.stopBRW();
  }
  
  clearIntervalsBRW(): void {
    clearInterval(this.BRWinterval);
    clearInterval(this.BRWcountdown); 
    clearInterval(this.BRWTimer); 
    this.BRWinterval = null;
    this.BRWcountdown = null;
    this.BRWTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    
    
    this.stopBRW(); 
    this.BRWResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}