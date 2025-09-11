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
  selector: 'app-ct',
  templateUrl: './ct.page.html',
  styleUrls: ['./ct.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class CTPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalCT') modalCT!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalCT') closeModalButtonCT!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionCT') questionCT!: ElementRef<HTMLButtonElement>;
  @ViewChild('CTdots') CTdots!: ElementRef<HTMLDivElement>;
  @ViewChild('CTball') CTball!: ElementRef<HTMLDivElement>;
  @ViewChild('CTballText') CTballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('CTtimeInput') CTtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('CTcountdownInput') CTcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnCT') startBtnCT!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnCT') stopBtnCT!: ElementRef<HTMLButtonElement>;
  @ViewChild('CTReset') CTReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('CTSave') CTSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsCT') settingsCT!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneCT') roundsDoneCT!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayCT') timerDisplayCT!: ElementRef<HTMLDivElement>;
  @ViewChild('CTResultSaved') CTResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('inhaleInputCT') inhaleInputCT!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputCT') hold1InputCT!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputCT') exhaleInputCT!: ElementRef<HTMLInputElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleCT = true;
  private exhaleCT = false;
  private hold1CT = false;
  private CTinterval: any = null; 
  private CTcountdown: any = null; // Use 'any' or specify the correct type if known
  private CTcurrentValue = 4;
  private CTduration = 0; // Initialize duration as a number
  private CTSeconds = 0;
  private CTMinutes = 0;
  private roundsCT = 0;
  private CTTimer: any = null;
  private CTResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
     this.globalService.initBulletSlider(this.modalCT, this.CTdots, 'slides');
    this.closeModalButtonCT.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalCT));
    this.questionCT.nativeElement.onclick = () => this.globalService.openModal(this.modalCT, this.CTdots, 'slides');
    //populate input
    for (let CTi = 2; CTi <= 60; CTi++) { // assuming 1 to 60 minutes
      let CToption = document.createElement('option');
      CToption.value = (CTi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        CToption.textContent = CTi + ' minutos';
      } else {
        CToption.textContent = CTi + ' minutes';
      }
      this.CTtimeInput.nativeElement.appendChild(CToption);
    }
    // Initialize buttons
    this.startBtnCT.nativeElement.onclick = () => this.startCT();
    this.stopBtnCT.nativeElement.onclick = () => this.resetCT();
    this.CTReset.nativeElement.onclick = () => this.stopCT();
    this.CTSave.nativeElement.onclick = () => this.saveCT();
    this.stopBtnCT.nativeElement.disabled = true;
    this.stopBtnCT.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CTReset.nativeElement.disabled = true;
    this.CTReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CTSave.nativeElement.disabled = true;
    this.CTSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CTtimeInput.nativeElement.onchange = () => this.setCTduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true");
  }
  // Method to set the CTduration after ViewChild is initialized
  setCTduration(): void {
      const selectedValue = this.CTtimeInput.nativeElement.value;
      
      // Check if the value is '∞', then set CTduration accordingly
      if (selectedValue === 'infinity') {
        this.CTduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.CTduration = parseInt(selectedValue);
      }
  }

  ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startCT();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopCT();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.CTballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.CTballText.nativeElement.textContent = "Start"
    }
    this.setCTduration();
    this.CTResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.initializeSong(); 
  }
   
  startCT(): void{
    this.audioService.initializeSong(); 
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsCT.nativeElement.disabled = true;
    this.questionCT.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnCT.nativeElement.disabled = true;
      this.inhaleCT = true;
      this.CTcountdownInput.nativeElement.style.display = "inline";
      this.CTtimeInput.nativeElement.style.display = "none";
      this.startCountdownCT();
      this.CTballText.nativeElement.textContent = "3";
      this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.CTballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.CTballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        if(this.isPortuguese){
          this.CTballText.nativeElement.textContent = "Inspire";
        }else{
          this.CTballText.nativeElement.textContent = "Inhale";
        }
        this.audioService.playSound('inhale');        
        this.audioService.playBreathSound('inhaleBreath', this.CTcurrentValue); 
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputCT.nativeElement.value), this.CTball);
        this.CTinterval = setInterval(() => this.startTimerCT(), 1000);
        this.CTTimer = setInterval(() => this.DisplayTimerCT(), 1000);
        this.startBtnCT.nativeElement.disabled = false;
        this.stopBtnCT.nativeElement.disabled = false;
        this.stopBtnCT.nativeElement.style.color = '#0661AA';
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsCT();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnCT.nativeElement.disabled = true;
      this.stopBtnCT.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.CTReset.nativeElement.disabled = false;
      this.CTReset.nativeElement.style.color = '#990000';
      if(this.roundsCT > 0){
        this.CTSave.nativeElement.disabled = false;
        this.CTSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsCT.nativeElement.disabled = false;
      this.questionCT.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.CTballText.nativeElement.textContent = "Continuar"
      }else{
        this.CTballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleCT){
          this.CTballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1CT){
          this.CTballText.nativeElement.textContent = "Segure"
        }else if(this.exhaleCT){
          this.CTballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleCT){
          this.CTballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1CT){
          this.CTballText.nativeElement.textContent = "Hold"
        }else if(this.exhaleCT){
          this.CTballText.nativeElement.textContent = "Exhale"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnCT.nativeElement.disabled = false;
      this.stopBtnCT.nativeElement.style.color = '#0661AA';
      this.CTReset.nativeElement.disabled = true;
      this.CTReset.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.CTSave.nativeElement.disabled = true;
      this.CTSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.CTinterval = setInterval(() => this.startTimerCT(), 1000);
      this.CTTimer = setInterval(() => this.DisplayTimerCT(), 1000);
      this.startCountdownCT();
    }
  }
  startCountdownCT(): void {
    if (this.CTduration !== Infinity) {
      let Contdownminutes = Math.floor(this.CTduration / 60);
      let Contdownseconds = this.CTduration % 60;
      this.CTcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.CTcountdown = setInterval( () => {
        if(this.CTduration == 0){
          clearInterval(this.CTcountdown); 
          this.CTcountdown = null;
        }else{
          this.CTduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.CTduration / 60);
          let Contdownseconds = this.CTduration % 60;
          this.CTcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.CTcountdownInput.nativeElement.value = '∞';
      this.CTcountdownInput.nativeElement.style.display = "inline";
      this.CTtimeInput.nativeElement.style.display = "none";
    }
  }
  startTimerCT(): void{ 
    this.CTcurrentValue--;
    if(this.inhaleCT && this.CTcurrentValue == 1){
      this.CTcurrentValue = parseInt(this.exhaleInputCT.nativeElement.value) + 1;
      this.inhaleCT = false;
      this.exhaleCT = true;
      this.audioService.playSound('exhale');
      this.audioService.playBreathSound('exhaleBreath', this.CTcurrentValue); 
      if(this.isPortuguese){
        this.CTballText.nativeElement.textContent = "Espire"
      }else{
        this.CTballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, parseInt(this.exhaleInputCT.nativeElement.value), this.CTball);
    }
    else if(this.exhaleCT && this.CTcurrentValue == 1){
      this.CTcurrentValue = parseInt(this.hold1InputCT.nativeElement.value) + 1;
      this.exhaleCT = false;
      this.hold1CT = true;
      this.audioService.playSound('hold');
      if(this.isPortuguese){
        this.CTballText.nativeElement.textContent = "Segure"
      }else{
        this.CTballText.nativeElement.textContent = "Hold"
      }
      this.globalService.changeBall(1, parseInt(this.hold1InputCT.nativeElement.value), this.CTball);
      this.roundsCT++;
      this.roundsDoneCT.nativeElement.innerHTML = this.roundsCT.toString();
    }
    else if(this.hold1CT && this.CTcurrentValue == 1){
      if(this.CTduration !== 0){
        this.exhaleInputCT.nativeElement.value = (parseInt(this.exhaleInputCT.nativeElement.value) + 1).toString();
        this.hold1InputCT.nativeElement.value = (parseInt(this.hold1InputCT.nativeElement.value) + 2).toString();
        this.CTcurrentValue = parseInt(this.inhaleInputCT.nativeElement.value) + 1;
        this.hold1CT = false;
        this.inhaleCT = true;
        this.audioService.playSound('inhale');        
        this.audioService.playBreathSound('inhaleBreath', this.CTcurrentValue); 
        if(this.isPortuguese){
          this.CTballText.nativeElement.textContent = "Inspire"
        }else{
          this.CTballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputCT.nativeElement.value), this.CTball);
      } 
      else{
         
        this.clearIntervalsCT();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnCT.nativeElement.disabled = true;
        this.settingsCT.nativeElement.disabled = false;
        this.questionCT.nativeElement.disabled = false;
        this.stopBtnCT.nativeElement.disabled = true;
        this.stopBtnCT.nativeElement.style.color = 'rgb(177, 177, 177)';
        this.CTReset.nativeElement.disabled = false;
        this.CTReset.nativeElement.style.color = '#990000';
        this.CTSave.nativeElement.disabled = false;
        this.CTSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.CTball);
        this.CTcountdownInput.nativeElement.style.display = "none";
        this.CTtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.CTballText.nativeElement.textContent = "Iniciar"
        }else{
          this.CTballText.nativeElement.textContent = "Start"
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
  DisplayTimerCT(): void {
    this.CTSeconds++;
    if (this.CTSeconds === 60) {
    this.CTSeconds = 0;
    this.CTMinutes++;
    }
    const M = this.CTMinutes < 10 ? '0' + this.CTMinutes : this.CTMinutes;
    const S = this.CTSeconds < 10 ? '0' + this.CTSeconds : this.CTSeconds;
    this.timerDisplayCT.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopCT(): void{
    this.clearIntervalsCT();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.CTcountdownInput.nativeElement.style.display = "none";
    this.CTtimeInput.nativeElement.style.display = "inline";
    this.CTcurrentValue = 4;
    this.startBtnCT.nativeElement.disabled = false;
    this.stopBtnCT.nativeElement.disabled = true;
    this.stopBtnCT.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CTReset.nativeElement.disabled = true;
    this.CTReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.CTSave.nativeElement.disabled = true;
    this.CTSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.inhaleCT = true;
    this.hold1CT = false;
    this.exhaleCT = false;
    this.globalService.changeBall(1, 1, this.CTball);
    if(this.isPortuguese){
      this.CTballText.nativeElement.textContent = "Iniciar"
    }else{
      this.CTballText.nativeElement.textContent = "Start"
    }
    this.roundsCT = 0;
    this.roundsDoneCT.nativeElement.innerHTML = "0";
    this.timerDisplayCT.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setCTduration();
    this.CTSeconds = 0;
    this.CTMinutes = 0;
    this.roundsCT = 0;
    this.exhaleInputCT.nativeElement.value = "3";
    this.hold1InputCT.nativeElement.value = "4";
  }
  resetCT(): void{
    this.stopBtnCT.nativeElement.disabled = true;
    this.stopBtnCT.nativeElement.style.color = 'rgb(177, 177, 177)';
    if (this.audioService.currentAudio) {
      this.audioService.currentAudio.pause();
    }
    this.clearIntervalsCT();    
    this.CTcurrentValue = 4;
    this.exhaleInputCT.nativeElement.value = "3";
    this.hold1InputCT.nativeElement.value = "4";
    this.inhaleCT = true;
    this.hold1CT = false;
    this.exhaleCT = false;
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
    this.startCT();
  }
  saveCT(): void{
    this.CTResult = this.timerDisplayCT.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('CTResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.CTResult, rounds: this.roundsCT }); // Add the new result with the current date
    localStorage.setItem('CTResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.CTResultSaved.nativeElement.style.display = 'block';
    this.stopCT();
  }
  
  clearIntervalsCT(): void {
    clearInterval(this.CTinterval);
    clearInterval(this.CTcountdown); 
    clearInterval(this.CTTimer); 
    this.CTinterval = null;
    this.CTcountdown = null;
    this.CTTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopCT(); 
    this.CTResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}