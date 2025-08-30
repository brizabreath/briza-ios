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
  selector: 'app-box',
  templateUrl: './box.page.html',
  styleUrls: ['./box.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BOXPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalBOX') modalBOX!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalBOX') closeModalButtonBOX!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionBOX') questionBOX!: ElementRef<HTMLButtonElement>;
  @ViewChild('BOXdots') BOXdots!: ElementRef<HTMLDivElement>;
  @ViewChild('BOXball') BOXball!: ElementRef<HTMLDivElement>;
  @ViewChild('BOXballText') BOXballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('BOXtimeInput') BOXtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('BOXcountdownInput') BOXcountdownInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('startBtnBOX') startBtnBOX!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnBOX') stopBtnBOX!: ElementRef<HTMLButtonElement>;
  @ViewChild('BOXSave') BOXSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsBOX') settingsBOX!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputBOX') inhaleInputBOX!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputBOX') hold1InputBOX!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputBOX') exhaleInputBOX!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputBOX') hold2InputBOX!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneBOX') roundsDoneBOX!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayBOX') timerDisplayBOX!: ElementRef<HTMLInputElement>;
  @ViewChild('BOXResultSaved') BOXResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusBOX') minusBOX!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusBOX') plusBOX!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleBOX = true;
  private hold1BOX = false;
  private exhaleBOX = false;
  private hold2BOX = false;
  private BOXinterval: any = null; 
  private BOXcountdown: any = null; // Use 'any' or specify the correct type if known
  private BOXcurrentValue = 5;
  private BOXduration = 0; // Initialize duration as a number
  private roundsBOX = 0;
  private BOXSeconds = 0;
  private BOXMinutes = 0;
  private BOXTimer: any = null;
  private BOXResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.globalService.initBulletSlider(this.modalBOX, this.BOXdots, 'slides');
    this.closeModalButtonBOX.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalBOX));
    this.questionBOX.nativeElement.onclick = () => this.globalService.openModal(this.modalBOX, this.BOXdots, 'slides');
    this.questionBOX.nativeElement.onclick = () => this.globalService.openModal(this.modalBOX);
    //populate input
    for (let BOXi = 2; BOXi <= 60; BOXi++) { // assuming 1 to 60 minutes
      let BOXoption = document.createElement('option');
      BOXoption.value = (BOXi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        BOXoption.textContent = BOXi + ' minutos';
      } else {
        BOXoption.textContent = BOXi + ' minutes';
      }
      this.BOXtimeInput.nativeElement.appendChild(BOXoption);
    }
    // Initialize buttons
    //modal events set up
    this.minusBOX.nativeElement.onclick = () => this.minusRatioBOX();
    this.plusBOX.nativeElement.onclick = () => this.plusRatioBOX();
    this.startBtnBOX.nativeElement.onclick = () => this.startBOX();
    this.stopBtnBOX.nativeElement.onclick = () => this.stopBOX();
    this.BOXSave.nativeElement.onclick = () => this.saveBOX();
    this.stopBtnBOX.nativeElement.disabled = true;
    this.stopBtnBOX.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BOXSave.nativeElement.disabled = true;
    this.BOXSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BOXtimeInput.nativeElement.onchange = () => this.setBOXduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
  }
  // Method to set the BOXduration after ViewChild is initialized
  setBOXduration(): void {
      const selectedValue = this.BOXtimeInput.nativeElement.value;
      // Check if the value is '∞', then set BOXduration accordingly
      if (selectedValue === 'infinity') {
        this.BOXduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.BOXduration = parseInt(selectedValue);
      }
  }

  ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startBOX();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopBOX();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.BOXballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.BOXballText.nativeElement.textContent = "Start"
    }
    this.setBOXduration();
    this.BOXResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.initializeSong(); 
  }
   
  minusRatioBOX(): void{
    if(parseInt(this.inhaleInputBOX.nativeElement.value) > 3){
      this.inhaleInputBOX.nativeElement.value = 
      ((parseInt(this.inhaleInputBOX.nativeElement.value) || 0) - 1).toString();
      this.hold1InputBOX.nativeElement.value = 
      ((parseInt(this.hold1InputBOX.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputBOX.nativeElement.value = 
      ((parseInt(this.exhaleInputBOX.nativeElement.value) || 0) - 1).toString();
      this.hold2InputBOX.nativeElement.value = 
      ((parseInt(this.hold2InputBOX.nativeElement.value) || 0) - 1).toString();
    }
  }
  plusRatioBOX():void{
    if(parseInt(this.inhaleInputBOX.nativeElement.value) < 40){
      this.inhaleInputBOX.nativeElement.value = 
      ((parseInt(this.inhaleInputBOX.nativeElement.value) || 0) + 1).toString();
      this.hold1InputBOX.nativeElement.value = 
      ((parseInt(this.hold1InputBOX.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputBOX.nativeElement.value = 
      ((parseInt(this.exhaleInputBOX.nativeElement.value) || 0) + 1).toString();
      this.hold2InputBOX.nativeElement.value = 
      ((parseInt(this.hold2InputBOX.nativeElement.value) || 0) + 1).toString();
    }
  }
  startBOX(): void{
    this.BOXcurrentValue = parseInt(this.inhaleInputBOX.nativeElement.value) + 1;
    this.audioService.initializeSong(); 
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsBOX.nativeElement.disabled = true;
    this.questionBOX.nativeElement.disabled = true;
    this.minusBOX.nativeElement.disabled = true;
    this.plusBOX.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnBOX.nativeElement.disabled = true;
      this.inhaleBOX = true;
      this.BOXcountdownInput.nativeElement.style.display = "inline";
      this.BOXtimeInput.nativeElement.style.display = "none";
      this.startCountdownBOX();
      this.BOXballText.nativeElement.textContent = "3";
      this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
      this. audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.BOXballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.BOXballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        if(this.isPortuguese){
          this.BOXballText.nativeElement.textContent = "Inspire";
        }else{
          this.BOXballText.nativeElement.textContent = "Inhale";
        }
        this.audioService.playSound('inhale');        
        this.audioService.playBreathSound('inhaleBreath', this.BOXcurrentValue); 
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputBOX.nativeElement.value), this.BOXball);
        this.BOXinterval = setInterval(() => this.startTimerBOX(), 1000);
        this.BOXTimer = setInterval(() => this.DisplayTimerBOX(), 1000);
        this.startBtnBOX.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsBOX();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnBOX.nativeElement.disabled = false;
      this.stopBtnBOX.nativeElement.style.color = '#990000';
      if(this.roundsBOX > 0){
        this.BOXSave.nativeElement.disabled = false;
        this.BOXSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsBOX.nativeElement.disabled = false;
      this.questionBOX.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.BOXballText.nativeElement.textContent = "Continuar"
      }else{
        this.BOXballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleBOX){
          this.BOXballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1BOX || this.hold2BOX){
          this.BOXballText.nativeElement.textContent = "Segure"
        }else if(this.exhaleBOX){
          this.BOXballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleBOX){
          this.BOXballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1BOX || this.hold2BOX){
          this.BOXballText.nativeElement.textContent = "Hold"
        }else if(this.exhaleBOX){
          this.BOXballText.nativeElement.textContent = "Exhale"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnBOX.nativeElement.disabled = true;
      this.stopBtnBOX.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.BOXSave.nativeElement.disabled = true;
      this.BOXSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.BOXinterval = setInterval(() => this.startTimerBOX(), 1000);
      this.BOXTimer = setInterval(() => this.DisplayTimerBOX(), 1000);
      this.startCountdownBOX();
    }
  }
  startCountdownBOX(): void {
    if (this.BOXduration !== Infinity) {
      let Contdownminutes = Math.floor(this.BOXduration / 60);
      let Contdownseconds = this.BOXduration % 60;
      this.BOXcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.BOXcountdown = setInterval( () => {
        if(this.BOXduration == 0){
          clearInterval(this.BOXcountdown); 
          this.BOXcountdown = null;
        }else{
          this.BOXduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.BOXduration / 60);
          let Contdownseconds = this.BOXduration % 60;
          this.BOXcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.BOXcountdownInput.nativeElement.value = '∞';
      this.BOXcountdownInput.nativeElement.style.display = "inline";
      this.BOXtimeInput.nativeElement.style.display = "none";
    }
  }
  startTimerBOX(): void{ 
    this.BOXcurrentValue--;
    if(this.inhaleBOX && this.BOXcurrentValue == 1){
      this.BOXcurrentValue = parseInt(this.hold1InputBOX.nativeElement.value) + 1;
      this.inhaleBOX = false;
      this.hold1BOX = true;
      this.audioService.playSound('hold');
      if(this.isPortuguese){
        this.BOXballText.nativeElement.textContent = "Segure"
      }else{
        this.BOXballText.nativeElement.textContent = "Hold"
      }
      this.globalService.changeBall(1.3, parseInt(this.hold1InputBOX.nativeElement.value), this.BOXball);
    }
    else if(this.hold1BOX && this.BOXcurrentValue == 1){
      this.BOXcurrentValue = parseInt(this.exhaleInputBOX.nativeElement.value) + 1;
      this.hold1BOX = false;
      this.exhaleBOX = true;
      this.audioService.playSound('exhale');
      this.audioService.playBreathSound('exhaleBreath', this.BOXcurrentValue); 
      if(this.isPortuguese){
        this.BOXballText.nativeElement.textContent = "Espire"
      }else{
        this.BOXballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, parseInt(this.exhaleInputBOX.nativeElement.value), this.BOXball);
    }
    else if(this.exhaleBOX && this.BOXcurrentValue == 1){
      this.BOXcurrentValue = parseInt(this.hold2InputBOX.nativeElement.value) + 1;
      this.exhaleBOX = false;
      this.hold2BOX = true;
      this.audioService.playSound('hold');
      if(this.isPortuguese){
        this.BOXballText.nativeElement.textContent = "Segure"
      }else{
        this.BOXballText.nativeElement.textContent = "Hold"
      }
      this.globalService.changeBall(1, parseInt(this.hold2InputBOX.nativeElement.value), this.BOXball);
      this.roundsBOX++;
      this.roundsDoneBOX.nativeElement.innerHTML = this.roundsBOX.toString();
    }
    else if(this.hold2BOX && this.BOXcurrentValue == 1){
      if(this.BOXduration !== 0){
        this.BOXcurrentValue = parseInt(this.inhaleInputBOX.nativeElement.value) + 1;
        this.hold2BOX = false;
        this.inhaleBOX = true;
        this.audioService.playSound('inhale');        
        this.audioService.playBreathSound('inhaleBreath', this.BOXcurrentValue); 
        if(this.isPortuguese){
          this.BOXballText.nativeElement.textContent = "Inspire"
        }else{
          this.BOXballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputBOX.nativeElement.value), this.BOXball);
      } 
      else{
        
        this.clearIntervalsBOX();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnBOX.nativeElement.disabled = true;
        this.settingsBOX.nativeElement.disabled = false;
        this.questionBOX.nativeElement.disabled = false;
        this.stopBtnBOX.nativeElement.disabled = false;
        this.stopBtnBOX.nativeElement.style.color = '#990000';
        this.BOXSave.nativeElement.disabled = false;
        this.BOXSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.BOXball);
        this.BOXcountdownInput.nativeElement.style.display = "none";
        this.BOXtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.BOXballText.nativeElement.textContent = "Iniciar"
        }else{
          this.BOXballText.nativeElement.textContent = "Start"
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
  DisplayTimerBOX(): void {
    this.BOXSeconds++;
    if (this.BOXSeconds === 60) {
    this.BOXSeconds = 0;
    this.BOXMinutes++;
    }
    const M = this.BOXMinutes < 10 ? '0' + this.BOXMinutes : this.BOXMinutes;
    const S = this.BOXSeconds < 10 ? '0' + this.BOXSeconds : this.BOXSeconds;
    this.timerDisplayBOX.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopBOX(): void{
    this.clearIntervalsBOX();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.BOXcountdownInput.nativeElement.style.display = "none";
    this.BOXtimeInput.nativeElement.style.display = "inline";
    this.BOXcurrentValue = parseInt(this.inhaleInputBOX.nativeElement.value) + 1;
    this.startBtnBOX.nativeElement.disabled = false;
    this.stopBtnBOX.nativeElement.disabled = true;
    this.stopBtnBOX.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.BOXSave.nativeElement.disabled = true;
    this.BOXSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.minusBOX.nativeElement.disabled = false;
    this.plusBOX.nativeElement.disabled = false;
    this.inhaleBOX = true;
    this.hold1BOX = false;
    this.exhaleBOX = false;
    this.hold2BOX = false;
    this.globalService.changeBall(1, 1, this.BOXball);
    if(this.isPortuguese){
      this.BOXballText.nativeElement.textContent = "Iniciar"
    }else{
      this.BOXballText.nativeElement.textContent = "Start"
    }
    this.roundsBOX = 0;
    this.roundsDoneBOX.nativeElement.innerHTML = "0";
    this.timerDisplayBOX.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setBOXduration();
    this.BOXSeconds = 0;
    this.BOXMinutes = 0;
    this.roundsBOX = 0;
  }
  saveBOX(): void{
    this.BOXResult = this.timerDisplayBOX.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('BOXResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.BOXResult, rounds: this.roundsBOX }); // Add the new result with the current date
    localStorage.setItem('BOXResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.BOXResultSaved.nativeElement.style.display = 'block';
    this.stopBOX();
  }
  
  clearIntervalsBOX(): void {
    clearInterval(this.BOXinterval);
    clearInterval(this.BOXcountdown); 
    clearInterval(this.BOXTimer); 
    this.BOXinterval = null;
    this.BOXcountdown = null;
    this.BOXTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopBOX(); 
    this.BOXResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}