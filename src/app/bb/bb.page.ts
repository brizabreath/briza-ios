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
  selector: 'app-bb',
  templateUrl: './bb.page.html',
  styleUrls: ['./bb.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BBPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalBB') modalBB!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalBB') closeModalButtonBB!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionBB') questionBB!: ElementRef<HTMLButtonElement>;
  @ViewChild('BBdots') BBdots!: ElementRef<HTMLDivElement>;
  @ViewChild('BBball') BBball!: ElementRef<HTMLDivElement>;
  @ViewChild('BBballText') BBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('BBtimeInput') BBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('BBcountdownInput') BBcountdownInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('startBtnBB') startBtnBB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnBB') stopBtnBB!: ElementRef<HTMLButtonElement>;
  @ViewChild('BBSave') BBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsBB') settingsBB!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneBB') roundsDoneBB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayBB') timerDisplayBB!: ElementRef<HTMLInputElement>;
  @ViewChild('BBResultSaved') BBResultSaved!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleBB = true;
  private hold1BB = false;
  private exhaleBB = false;
  private hold2BB = false;
  private BBinterval: any = null; 
  private BBcountdown: any = null; // Use 'any' or specify the correct type if known
  private BBcurrentValue = 5;
  private BBduration = 0; // Initialize duration as a number
  private BBSeconds = 0;
  private BBMinutes = 0;
  private roundsBB = 0;
  private BBTimer: any = null;
  private BBResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.globalService.initBulletSlider(this.modalBB, this.BBdots, 'slides');
    this.closeModalButtonBB.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalBB));
    this.questionBB.nativeElement.onclick = () => this.globalService.openModal(this.modalBB, this.BBdots, 'slides');
    this.questionBB.nativeElement.onclick = () => this.globalService.openModal(this.modalBB);
    //populate input
    for (let BBi = 2; BBi <= 60; BBi++) { // assuming 1 to 60 minutes
      let BBoption = document.createElement('option');
      BBoption.value = (BBi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        BBoption.textContent = BBi + ' minutos';
      } else {
        BBoption.textContent = BBi + ' minutes';
      }
      this.BBtimeInput.nativeElement.appendChild(BBoption);
    }
    // Initialize buttons
    this.startBtnBB.nativeElement.onclick = () => this.startBB();
    this.stopBtnBB.nativeElement.onclick = () => this.stopBB();
    this.BBSave.nativeElement.onclick = () => this.saveBB();
    this.stopBtnBB.nativeElement.disabled = true;
    this.stopBtnBB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BBSave.nativeElement.disabled = true;
    this.BBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BBtimeInput.nativeElement.onchange = () => this.setBBduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
  }
  // Method to set the BBduration after ViewChild is initialized
  setBBduration(): void {
      const selectedValue = this.BBtimeInput.nativeElement.value;
      
      // Check if the value is '∞', then set BBduration accordingly
      if (selectedValue === 'infinity') {
        this.BBduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.BBduration = parseInt(selectedValue);
      }
  }

  ionViewWillEnter() { 
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startBB();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopBB();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.BBballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.BBballText.nativeElement.textContent = "Start"
    }
    this.setBBduration();
    this.BBResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.initializeSong(); 
  }
   
  startBB(): void{
    this.audioService.initializeSong(); 
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsBB.nativeElement.disabled = true;
    this.questionBB.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnBB.nativeElement.disabled = true;
      this.inhaleBB = true;
      this.BBcountdownInput.nativeElement.style.display = "inline";
      this.BBtimeInput.nativeElement.style.display = "none";
      this.startCountdownBB();
      this.BBballText.nativeElement.textContent = "3";
      this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.BBballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.BBballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        if(this.isPortuguese){
          this.BBballText.nativeElement.textContent = "Inspire";
        }else{
          this.BBballText.nativeElement.textContent = "Inhale";
        }
        this.audioService.playSound('inhale');        
        this.audioService.playBreathSound('inhaleBreath', this.BBcurrentValue); 
        this.globalService.changeBall(1.5, 5, this.BBball);
        this.BBinterval = setInterval(() => this.startTimerBB(), 1000);
        this.BBTimer = setInterval(() => this.DisplayTimerBB(), 1000);
        this.startBtnBB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsBB();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnBB.nativeElement.disabled = false;
      this.stopBtnBB.nativeElement.style.color = '#990000';
      if(this.roundsBB > 0){
        this.BBSave.nativeElement.disabled = false;
        this.BBSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsBB.nativeElement.disabled = false;
      this.questionBB.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.BBballText.nativeElement.textContent = "Continuar"
      }else{
        this.BBballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleBB){
          this.BBballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1BB || this.hold2BB){
          this.BBballText.nativeElement.textContent = "Segure"
        }else if(this.exhaleBB){
          this.BBballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleBB){
          this.BBballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1BB || this.hold2BB){
          this.BBballText.nativeElement.textContent = "Hold"
        }else if(this.exhaleBB){
          this.BBballText.nativeElement.textContent = "Exhale"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnBB.nativeElement.disabled = true;
      this.stopBtnBB.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.BBSave.nativeElement.disabled = true;
      this.BBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.BBinterval = setInterval(() => this.startTimerBB(), 1000);
      this.BBTimer = setInterval(() => this.DisplayTimerBB(), 1000);
      this.startCountdownBB();
    }
  }
  startCountdownBB(): void {
    if (this.BBduration !== Infinity) {
      let Contdownminutes = Math.floor(this.BBduration / 60);
      let Contdownseconds = this.BBduration % 60;
      this.BBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.BBcountdown = setInterval( () => {
        if(this.BBduration == 0){
          clearInterval(this.BBcountdown); 
          this.BBcountdown = null;
        }else{
          this.BBduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.BBduration / 60);
          let Contdownseconds = this.BBduration % 60;
          this.BBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.BBcountdownInput.nativeElement.value = '∞';
      this.BBcountdownInput.nativeElement.style.display = "inline";
      this.BBtimeInput.nativeElement.style.display = "none";
    }
  }
  startTimerBB(): void{ 
    this.BBcurrentValue--;
    if(this.inhaleBB && this.BBcurrentValue == 1){
      this.BBcurrentValue = 3;
      this.inhaleBB = false;
      this.hold1BB = true;
      this.audioService.playSound('pause');
      this.BBballText.nativeElement.textContent = "Pause"
      this.globalService.changeBall(1.3, 3, this.BBball);
    }
    else if(this.hold1BB && this.BBcurrentValue == 1){
      this.BBcurrentValue = 7;
      this.hold1BB = false;
      this.exhaleBB = true;
      this.audioService.playSound('exhale');
      this.audioService.playBreathSound('exhaleBreath', this.BBcurrentValue); 
      if(this.isPortuguese){
        this.BBballText.nativeElement.textContent = "Espire"
      }else{
        this.BBballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, 7, this.BBball);
    }
    else if(this.exhaleBB && this.BBcurrentValue == 1){
      this.BBcurrentValue = 3;
      this.exhaleBB = false;
      this.hold2BB = true;
      this.audioService.playSound('pause');
              this.BBballText.nativeElement.textContent = "Pause"
      this.globalService.changeBall(1, 3, this.BBball);
      this.roundsBB++;
      this.roundsDoneBB.nativeElement.innerHTML = this.roundsBB.toString();
    }
    else if(this.hold2BB && this.BBcurrentValue == 1){
      if(this.BBduration !== 0){
        this.BBcurrentValue = 5;
        this.hold2BB = false;
        this.inhaleBB = true;
        
        this.audioService.playBreathSound('inhaleBreath', this.BBcurrentValue); 

        if(this.isPortuguese){
          this.BBballText.nativeElement.textContent = "Inspire"
        }else{
          this.BBballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, 5, this.BBball);
      } 
      else{
        this.clearIntervalsBB();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnBB.nativeElement.disabled = true;
        this.settingsBB.nativeElement.disabled = false;
        this.questionBB.nativeElement.disabled = false;
        this.stopBtnBB.nativeElement.disabled = false;
        this.stopBtnBB.nativeElement.style.color = '#990000';
        this.BBSave.nativeElement.disabled = false;
        this.BBSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.BBball);
        this.BBcountdownInput.nativeElement.style.display = "none";
        this.BBtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.BBballText.nativeElement.textContent = "Iniciar"
        }else{
          this.BBballText.nativeElement.textContent = "Start"
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
  DisplayTimerBB(): void {
    this.BBSeconds++;
    if (this.BBSeconds === 60) {
    this.BBSeconds = 0;
    this.BBMinutes++;
    }
    const M = this.BBMinutes < 10 ? '0' + this.BBMinutes : this.BBMinutes;
    const S = this.BBSeconds < 10 ? '0' + this.BBSeconds : this.BBSeconds;
    this.timerDisplayBB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopBB(): void{
    this.clearIntervalsBB();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.BBcountdownInput.nativeElement.style.display = "none";
    this.BBtimeInput.nativeElement.style.display = "inline";
    this.BBcurrentValue = 5;
    this.startBtnBB.nativeElement.disabled = false;
    this.stopBtnBB.nativeElement.disabled = true;
    this.stopBtnBB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BBSave.nativeElement.disabled = true;
    this.BBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.inhaleBB = true;
    this.hold1BB = false;
    this.exhaleBB = false;
    this.hold2BB = false;
    this.globalService.changeBall(1, 1, this.BBball);
    if(this.isPortuguese){
      this.BBballText.nativeElement.textContent = "Iniciar"
    }else{
      this.BBballText.nativeElement.textContent = "Start"
    }
    this.roundsBB = 0;
    this.roundsDoneBB.nativeElement.innerHTML = "0";
    this.timerDisplayBB.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setBBduration();
    this.BBSeconds = 0;
    this.BBMinutes = 0;
    this.roundsBB = 0;
  }
  saveBB(): void{
    this.BBResult = this.timerDisplayBB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('BBResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.BBResult, rounds: this.roundsBB }); // Add the new result with the current date
    localStorage.setItem('BBResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.BBResultSaved.nativeElement.style.display = 'block';
    this.stopBB();
  }
  
  clearIntervalsBB(): void {
    clearInterval(this.BBinterval);
    clearInterval(this.BBcountdown); 
    clearInterval(this.BBTimer); 
    this.BBinterval = null;
    this.BBcountdown = null;
    this.BBTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopBB(); 
    this.BBResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}