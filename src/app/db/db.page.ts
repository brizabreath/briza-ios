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
  selector: 'app-db',
  templateUrl: './db.page.html',
  styleUrls: ['./db.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class DbPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalDB') modalDB!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalDB') closeModalButtonDB!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionDB') questionDB!: ElementRef<HTMLButtonElement>;
  @ViewChild('DBdots') DBdots!: ElementRef<HTMLDivElement>;
  @ViewChild('DBball') DBball!: ElementRef<HTMLDivElement>;
  @ViewChild('DBballText') DBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('DBtimeInput') DBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('DBcountdownInput') DBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnDB') startBtnDB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnDB') stopBtnDB!: ElementRef<HTMLButtonElement>;
  @ViewChild('DBSave') DBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsDB') settingsDB!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputDB') inhaleInputDB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputDB') hold1InputDB!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputDB') exhaleInputDB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputDB') hold2InputDB!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneDB') roundsDoneDB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayDB') timerDisplayDB!: ElementRef<HTMLDivElement>;
  @ViewChild('DBResultSaved') DBResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusDB') minusDB!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusDB') plusDB!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleDB = true;
  private hold1DB = false;
  private exhaleDB = false;
  private hold2DB = false;
  private DBinterval: any = null; 
  private DBcountdown: any = null; // Use 'any' or specify the correct type if known
  private DBcurrentValue = 5;
  private DBduration = 0; // Initialize duration as a number
  private roundsDB = 0;
  private DBSeconds = 0;
  private DBMinutes = 0;
  private DBTimer: any = null;
  private DBResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
     this.globalService.initBulletSlider(this.modalDB, this.DBdots, 'slides');
    this.closeModalButtonDB.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalDB));
    this.questionDB.nativeElement.onclick = () => this.globalService.openModal(this.modalDB, this.DBdots, 'slides');
    //populate input
    for (let DBi = 2; DBi <= 60; DBi++) { // assuming 1 to 60 minutes
      let DBoption = document.createElement('option');
      DBoption.value = (DBi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        DBoption.textContent = DBi + ' minutos';
      } else {
        DBoption.textContent = DBi + ' minutes';
      }
      this.DBtimeInput.nativeElement.appendChild(DBoption);
    }
    // Initialize buttons
    //modal events set up
    this.minusDB.nativeElement.onclick = () => this.minusRatioDB();
    this.plusDB.nativeElement.onclick = () => this.plusRatioDB();
    this.startBtnDB.nativeElement.onclick = () => this.startDB();
    this.stopBtnDB.nativeElement.onclick = () => this.stopDB();
    this.DBSave.nativeElement.onclick = () => this.saveDB();
    this.stopBtnDB.nativeElement.disabled = true;
    this.stopBtnDB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.DBSave.nativeElement.disabled = true;
    this.DBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.DBtimeInput.nativeElement.onchange = () => this.setDBduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
  }
  // Method to set the DBduration after ViewChild is initialized
  setDBduration(): void {
      const selectedValue = this.DBtimeInput.nativeElement.value;
      // Check if the value is '∞', then set DBduration accordingly
      if (selectedValue === 'infinity') {
        this.DBduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.DBduration = parseInt(selectedValue);
      }
  }

  ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startDB();
          this.globalService.clearAllTimeouts();
        }else if(firstClick == "false" && breathingON == "false"){
        }else{
          this.globalService.clearAllTimeouts();
          this.stopDB();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.DBballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.DBballText.nativeElement.textContent = "Start"
    }
    this.setDBduration();
    this.DBResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.initializeSong(); 
  }
   
  minusRatioDB(): void{
    if(parseInt(this.inhaleInputDB.nativeElement.value) > 3){
      this.inhaleInputDB.nativeElement.value = 
      ((parseInt(this.inhaleInputDB.nativeElement.value) || 0) - 1).toString();
      this.hold1InputDB.nativeElement.value = 
      ((parseInt(this.hold1InputDB.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputDB.nativeElement.value = 
      ((parseInt(this.exhaleInputDB.nativeElement.value) || 0) - 1).toString();
      this.hold2InputDB.nativeElement.value = 
      ((parseInt(this.hold2InputDB.nativeElement.value) || 0) - 2).toString();
    }
  }
  plusRatioDB():void{
    if(parseInt(this.inhaleInputDB.nativeElement.value) < 20){
      this.inhaleInputDB.nativeElement.value = 
      ((parseInt(this.inhaleInputDB.nativeElement.value) || 0) + 1).toString();
      this.hold1InputDB.nativeElement.value = 
      ((parseInt(this.hold1InputDB.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputDB.nativeElement.value = 
      ((parseInt(this.exhaleInputDB.nativeElement.value) || 0) + 1).toString();
      this.hold2InputDB.nativeElement.value = 
      ((parseInt(this.hold2InputDB.nativeElement.value) || 0) + 2).toString();
    }
  }
  startDB(): void{
    this.DBcurrentValue = parseInt(this.inhaleInputDB.nativeElement.value) + 1;
    this.audioService.initializeSong(); 
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsDB.nativeElement.disabled = true;
    this.questionDB.nativeElement.disabled = true;
    this.minusDB.nativeElement.disabled = true;
    this.plusDB.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnDB.nativeElement.disabled = true;
      this.inhaleDB = true;
      this.DBcountdownInput.nativeElement.style.display = "inline";
      this.DBtimeInput.nativeElement.style.display = "none";
      this.startCountdownDB();
      this.DBballText.nativeElement.textContent = "3";
      this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
      this. audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.DBballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.DBballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        if(this.isPortuguese){
          this.DBballText.nativeElement.textContent = "Inspire";
        }else{
          this.DBballText.nativeElement.textContent = "Inhale";
        }
        this.audioService.playSound('inhale');        
        this.audioService.playBreathSound('inhaleBreath', this.DBcurrentValue); 
        this.globalService.changeBall(1.3, parseInt(this.inhaleInputDB.nativeElement.value), this.DBball);
        this.DBinterval = setInterval(() => this.startTimerDB(), 1000);
        this.DBTimer = setInterval(() => this.DisplayTimerDB(), 1000);
        this.startBtnDB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsDB();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnDB.nativeElement.disabled = false;
      this.stopBtnDB.nativeElement.style.color = '#990000';
      if(this.roundsDB > 0){
        this.DBSave.nativeElement.disabled = false;
        this.DBSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsDB.nativeElement.disabled = false;
      this.questionDB.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.DBballText.nativeElement.textContent = "Continuar"
      }else{
        this.DBballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese || this.exhaleDB){
        if(this.inhaleDB){
          this.DBballText.nativeElement.textContent = "Inspire"
        }else if(this.hold1DB){
          this.DBballText.nativeElement.textContent = "Pause"
        }else if(this.hold2DB){
          this.DBballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleDB || this.exhaleDB){
          this.DBballText.nativeElement.textContent = "Inhale"
        }else if(this.hold1DB){
          this.DBballText.nativeElement.textContent = "Pause"
        }else if(this.hold2DB){
          this.DBballText.nativeElement.textContent = "Exhale"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnDB.nativeElement.disabled = true;
      this.stopBtnDB.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.DBSave.nativeElement.disabled = true;
      this.DBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.DBinterval = setInterval(() => this.startTimerDB(), 1000);
      this.DBTimer = setInterval(() => this.DisplayTimerDB(), 1000);
      this.startCountdownDB();
    }
  }
  startCountdownDB(): void {
    if (this.DBduration !== Infinity) {
      let Contdownminutes = Math.floor(this.DBduration / 60);
      let Contdownseconds = this.DBduration % 60;
      this.DBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.DBcountdown = setInterval( () => {
        if(this.DBduration == 0){
          clearInterval(this.DBcountdown); 
          this.DBcountdown = null;
        }else{
          this.DBduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.DBduration / 60);
          let Contdownseconds = this.DBduration % 60;
          this.DBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.DBcountdownInput.nativeElement.value = '∞';
      this.DBcountdownInput.nativeElement.style.display = "inline";
      this.DBtimeInput.nativeElement.style.display = "none";
    }
  }
  startTimerDB(): void{ 
    this.DBcurrentValue--;
    if(this.inhaleDB && this.DBcurrentValue == 1){
      this.DBcurrentValue = parseInt(this.hold1InputDB.nativeElement.value) + 1;
      this.inhaleDB = false;
      this.hold1DB = true;
      this.audioService.playSound('pause');
      this.DBballText.nativeElement.textContent = "Pause"
      this.globalService.changeBall(1.3, parseInt(this.hold1InputDB.nativeElement.value), this.DBball);
    }
    else if(this.hold1DB && this.DBcurrentValue == 1){
      this.DBcurrentValue = parseInt(this.exhaleInputDB.nativeElement.value) + 1;
      this.hold1DB = false;
      this.exhaleDB = true;
      this.audioService.playSound('inagain');        
      this.audioService.playBreathSound('inhaleBreath', this.DBcurrentValue); 
      if(this.isPortuguese){
        this.DBballText.nativeElement.textContent = "Inspire"
      }else{
        this.DBballText.nativeElement.textContent = "Inhale"
      }
      this.globalService.changeBall(1.5, parseInt(this.exhaleInputDB.nativeElement.value), this.DBball);
    }
    else if(this.exhaleDB && this.DBcurrentValue == 1){
      this.DBcurrentValue = parseInt(this.hold2InputDB.nativeElement.value) + 1;
      this.exhaleDB = false;
      this.hold2DB = true;
      this.audioService.playSound('exhale');
      this.audioService.playBreathSound('exhaleBreath', this.DBcurrentValue);       
      if(this.isPortuguese){
        this.DBballText.nativeElement.textContent = "Espire"
      }else{
        this.DBballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, parseInt(this.hold2InputDB.nativeElement.value), this.DBball);
      this.roundsDB++;
      this.roundsDoneDB.nativeElement.innerHTML = this.roundsDB.toString();
    }
    else if(this.hold2DB && this.DBcurrentValue == 1){
      if(this.DBduration !== 0){
        this.DBcurrentValue = parseInt(this.inhaleInputDB.nativeElement.value) + 1;
        this.hold2DB = false;
        this.inhaleDB = true;
        this.audioService.playSound('inhale');        
        this.audioService.playBreathSound('inhaleBreath', this.DBcurrentValue); 
        if(this.isPortuguese){
          this.DBballText.nativeElement.textContent = "Inspire"
        }else{
          this.DBballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.3, parseInt(this.inhaleInputDB.nativeElement.value), this.DBball);
      } 
      else{
        this.clearIntervalsDB();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnDB.nativeElement.disabled = true;
        this.settingsDB.nativeElement.disabled = false;
        this.questionDB.nativeElement.disabled = false;
        this.stopBtnDB.nativeElement.disabled = false;
        this.stopBtnDB.nativeElement.style.color = '#990000';
        this.DBSave.nativeElement.disabled = false;
        this.DBSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.DBball);
        this.DBcountdownInput.nativeElement.style.display = "none";
        this.DBtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.DBballText.nativeElement.textContent = "Iniciar"
        }else{
          this.DBballText.nativeElement.textContent = "Start"
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
  DisplayTimerDB(): void {
    this.DBSeconds++;
    if (this.DBSeconds === 60) {
    this.DBSeconds = 0;
    this.DBMinutes++;
    }
    const M = this.DBMinutes < 10 ? '0' + this.DBMinutes : this.DBMinutes;
    const S = this.DBSeconds < 10 ? '0' + this.DBSeconds : this.DBSeconds;
    this.timerDisplayDB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopDB(): void{
    this.clearIntervalsDB();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.DBcountdownInput.nativeElement.style.display = "none";
    this.DBtimeInput.nativeElement.style.display = "inline";
    this.DBcurrentValue = parseInt(this.inhaleInputDB.nativeElement.value) + 1;
    this.startBtnDB.nativeElement.disabled = false;
    this.stopBtnDB.nativeElement.disabled = true;
    this.stopBtnDB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.DBSave.nativeElement.disabled = true;
    this.DBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.minusDB.nativeElement.disabled = false;
    this.plusDB.nativeElement.disabled = false;
    this.inhaleDB = true;
    this.hold1DB = false;
    this.exhaleDB = false;
    this.hold2DB = false;
    this.globalService.changeBall(1, 1, this.DBball);
    if(this.isPortuguese){
      this.DBballText.nativeElement.textContent = "Iniciar"
    }else{
      this.DBballText.nativeElement.textContent = "Start"
    }
    this.roundsDB = 0;
    this.roundsDoneDB.nativeElement.innerHTML = "0";
    this.timerDisplayDB.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setDBduration();
    this.DBSeconds = 0;
    this.DBMinutes = 0;
    this.roundsDB = 0;
  }
  saveDB(): void{
    this.DBResult = this.timerDisplayDB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('DBResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.DBResult, rounds: this.roundsDB }); // Add the new result with the current date
    localStorage.setItem('DBResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.DBResultSaved.nativeElement.style.display = 'block';
    this.stopDB();
  }
  
  clearIntervalsDB(): void {
    clearInterval(this.DBinterval);
    clearInterval(this.DBcountdown); 
    clearInterval(this.DBTimer); 
    this.DBinterval = null;
    this.DBcountdown = null;
    this.DBTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopDB(); 
    this.DBResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
}