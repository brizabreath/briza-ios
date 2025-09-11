import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AudioService } from '../services/audio.service'; 
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-kb',
  templateUrl: './kb.page.html',
  styleUrls: ['./kb.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class KBPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalKB') modalKB!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalKB') closeModalButtonKB!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionKB') questionKB!: ElementRef<HTMLButtonElement>;
  @ViewChild('KBdots') KBdots!: ElementRef<HTMLDivElement>;
  @ViewChild('KBball') KBball!: ElementRef<HTMLDivElement>;
  @ViewChild('KBballText') KBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('KBtimeInput') KBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('KBcountdownInput') KBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnKB') startBtnKB!: ElementRef<HTMLButtonElement>;
  @ViewChild('KBReset') KBReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('KBSave') KBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsKB') settingsKB!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneKB') roundsDoneKB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayKB') timerDisplayKB!: ElementRef<HTMLDivElement>;
  @ViewChild('KBResultSaved') KBResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('KBResults') KBResults!: ElementRef<HTMLDivElement>;
  @ViewChild('breathsInputKB') breathsInputKB!: ElementRef<HTMLInputElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private breathsKB = true;
  private hold1KB = false;
  private hold2KB = false;
  private KBinterval: any = null; 
  private KBcurrentValue = 0;
  private KBduration = 0; // Initialize duration as a number
  private KBSeconds = 0;
  private KBMinutes = 0;
  private roundsKB = 0;
  private KBTimer: any = null;
  private KBroundsResults: any[] = [];
  private KBbreaths: any = null;
  private KBbreathSpeed: any = null;
  isModalOpen = false;

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.globalService.initBulletSlider(this.modalKB, this.KBdots, 'slides');
    this.closeModalButtonKB.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalKB));
    this.questionKB.nativeElement.onclick = () => this.globalService.openModal(this.modalKB, this.KBdots, 'slides');
     //populate input
    for (let KBi = 2; KBi <= 8; KBi++) { // assuming 1 to 8 rounds
      let KBoption = document.createElement('option');
      KBoption.value = (KBi).toString(); // Convert the number to a string
      KBoption.textContent = KBi + ' rounds';
      this.KBtimeInput.nativeElement.appendChild(KBoption);
    }
    // Initialize buttons
    this.startBtnKB.nativeElement.onclick = () => this.startKB();
    this.KBReset.nativeElement.onclick = () => this.stopKB();
    this.KBSave.nativeElement.onclick = () => this.saveKB();
    this.KBReset.nativeElement.disabled = true;
    this.KBReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.KBSave.nativeElement.disabled = true;
    this.KBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.KBtimeInput.nativeElement.onchange = () => this.setKBduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true");
    this.globalService.changeBall(1, 1, this.KBball);
  }
  // Method to set the KBduration after ViewChild is initialized
  setKBduration(): void {
      const selectedValue = this.KBtimeInput.nativeElement.value;
      
      // Check if the value is '∞', then set KBduration accordingly
      if (selectedValue === 'infinity') {
        this.KBduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.KBduration = parseInt(selectedValue);
      }
  }

  ionViewWillEnter() {
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.KBballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.KBballText.nativeElement.textContent = "Start"
    }
    this.setKBduration();
    this.KBResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    //initialize sounds
    this.audioService.initializeSong(); 
    //set up breaths
    this.KBbreaths = localStorage.getItem('numberOfBreaths');
    // Check if it doesn't exist or is null
    if (this.KBbreaths === null) {
      this.KBbreaths = 31; // Default value
      localStorage.setItem('numberOfBreaths', this.KBbreaths.toString()); // Store it in localStorage
    } else {
      this.KBbreaths = parseInt(this.KBbreaths); // Convert the stored string to a number
    }
    this.KBbreathSpeed = localStorage.getItem('speedOfBreathsKB');
    // Check if it doesn't exist or is null
    if (this.KBbreathSpeed === null) {
      this.KBbreathSpeed = 650; // Default value
      localStorage.setItem('speedOfBreathsKB', this.KBbreathSpeed.toString()); // Store it in localStorage
    } else {
      this.KBbreathSpeed = parseInt(this.KBbreathSpeed); // Convert the stored string to a number
    }
    this.breathsInputKB.nativeElement.value = (this.KBbreaths - 1).toString();
  }
   
  startKB(): void{
    //initialize sounds
    this.audioService.initializeSong(); 
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsKB.nativeElement.disabled = true;
    this.questionKB.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnKB.nativeElement.disabled = true;
      this.breathsKB = true;
      this.KBcountdownInput.nativeElement.style.display = "inline";
      this.KBtimeInput.nativeElement.style.display = "none";
      this.startCountdownKB();
      this.KBballText.nativeElement.textContent = "3";
      this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.KBballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.KBballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        if(this.isPortuguese){
          this.KBballText.nativeElement.textContent = "Comece";
        }else{
          this.KBballText.nativeElement.textContent = "Get started";
        }
        this.KBinterval = setInterval(() => {
          this.audioService.playBreath('fullyout2');
          this.globalService.changeBall(1.3 , 0.2, this.KBball);
          this.startBreathsKB();
        }, this.KBbreathSpeed);
        this.KBTimer = setInterval(() => this.DisplayTimerKB(), 1000);
        this.startBtnKB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      if(!this.hold1KB){
        this.clearIntervalsKB();
        localStorage.setItem('breathingON', "false"); 
        this.KBReset.nativeElement.disabled = false;
        this.KBReset.nativeElement.style.color = '#990000';
        if(this.roundsKB > 0){
          this.KBSave.nativeElement.disabled = false;
          this.KBSave.nativeElement.style.color = '#49B79D';
        }
        this.settingsKB.nativeElement.disabled = false;
        this.questionKB.nativeElement.disabled = false;
        if(this.isPortuguese){
          this.KBballText.nativeElement.textContent = "Continuar"
        }else{
          this.KBballText.nativeElement.textContent = "Resume"
        }
        this.audioService.pauseSelectedSong();
        this.globalService.changeBall(1.3, 1, this.KBball);
      }else{
        this.pauseKB();
      }
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.hold2KB){
          this.KBballText.nativeElement.textContent = "Segure"
        }else if(this.breathsKB){
          this.KBballText.nativeElement.textContent = "Respire"
        }
      }else{
        if(this.hold2KB){
          this.KBballText.nativeElement.textContent = "Hold"
        }else if(this.breathsKB){
          this.KBballText.nativeElement.textContent = "Breath"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.KBReset.nativeElement.disabled = true;
      this.KBReset.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.KBSave.nativeElement.disabled = true;
      this.KBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      if(this.hold2KB){
        this.KBinterval = setInterval(() => this.startTimerKB(), 1000);
        this.KBTimer = setInterval(() => this.DisplayTimerKB(), 1000);
      }else if(this.breathsKB){
        this.KBinterval = setInterval(() => {
          this.audioService.playBreath('fullyout2');
          this.globalService.changeBall(1.3 , 0.2, this.KBball);
          this.startBreathsKB();
        }, this.KBbreathSpeed);
        this.KBTimer = setInterval(() => this.DisplayTimerKB(), 1000);
      }
    }
  }
  startBreathsKB(): void{
    this.KBbreaths--;
    if(this.KBbreaths < 1){
      this.globalService.changeBall(0.5 , 1, this.KBball);
      clearInterval(this.KBinterval);
      this.KBinterval = null;
      this.globalService.changeBall(1.3 , 1, this.KBball);
      this.breathsKB = false;
      this.hold1KB = true;
      this.KBbreaths = parseInt(this.breathsInputKB.nativeElement.value) + 1;
      const timeoutId9 = setTimeout(() => {
        if(this.isPortuguese){
          this.KBballText.nativeElement.textContent = "Inspire e Segure"    
        }else{
          this.KBballText.nativeElement.textContent = "Inhale and Hold"    
        }
        this.audioService.playSound('fullyinHold');
      }, 700);
      this.globalService.timeouts.push(timeoutId9); // Store the timeout ID
      const timeoutId8 = setTimeout(() => {
        this.KBinterval = setInterval(() => this.startTimerKB(), 1000);
      }, 2000);
      this.globalService.timeouts.push(timeoutId8); // Store the timeout ID
    }else{
      this.KBballText.nativeElement.textContent = this.KBbreaths.toString();
      const timeoutId6 = setTimeout(() => {
        this.globalService.changeBall(0.5 , this.KBbreathSpeed/2000, this.KBball);
    }, this.KBbreathSpeed/2);
    this.globalService.timeouts.push(timeoutId6); // Store the timeout ID
    }
  }
  startCountdownKB(): void {
    if (this.KBduration !== Infinity) {
      this.KBcountdownInput.nativeElement.value = this.KBduration.toString() + " rounds left";   
    } else {
      this.KBcountdownInput.nativeElement.value = '∞';
      this.KBcountdownInput.nativeElement.style.display = "inline";
      this.KBtimeInput.nativeElement.style.display = "none";
    }
  }
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60); // Calculate minutes
    const remainingSeconds = seconds % 60; // Calculate remaining seconds
  
    // Pad minutes and seconds to always have two digits
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
  
    return `${formattedMinutes}:${formattedSeconds}`;
  }
  startTimerKB(): void{ 
    if(this.hold2KB){
      this.KBcurrentValue--;
      if(this.isPortuguese){
        this.KBballText.nativeElement.textContent = this.KBcurrentValue.toString() + " segundos";
      }else{
        this.KBballText.nativeElement.textContent = this.KBcurrentValue.toString() + " seconds";
      }
    }
    if(this.hold1KB){
      this.KBcurrentValue++;
      if(this.isPortuguese){
        this.KBballText.nativeElement.textContent = this.formatTime(this.KBcurrentValue);
      }else{
        this.KBballText.nativeElement.textContent = this.formatTime(this.KBcurrentValue);
      }
    }
    if(this.hold2KB && this.KBcurrentValue == 1){
      if(this.KBduration !== 0){
        this.hold2KB = false;
        this.breathsKB = true;
        this.KBcurrentValue = 0;
        clearInterval(this.KBinterval);
        this.KBinterval = null;
        if(this.isPortuguese){
          this.KBballText.nativeElement.textContent = "Próximo Round"
        }else{
          this.KBballText.nativeElement.textContent = "Next Round"
        }
        this.audioService.playSound('nextRound');
        const timeoutId7 = setTimeout(() => {
          this.KBinterval = setInterval(() => {
            this.audioService.playBreath('fullyout2');
            this.globalService.changeBall(1.3 , this.KBbreathSpeed/2000, this.KBball);
            this.startBreathsKB();
          }, this.KBbreathSpeed);
        }, 2000);
        this.globalService.timeouts.push(timeoutId7); // Store the timeout ID
      }
      else{
         
        this.clearIntervalsKB();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnKB.nativeElement.disabled = true;
        this.settingsKB.nativeElement.disabled = false;
        this.questionKB.nativeElement.disabled = false;
        this.KBReset.nativeElement.disabled = false;
        this.KBReset.nativeElement.style.color = '#990000';
        this.KBSave.nativeElement.disabled = false;
        this.KBSave.nativeElement.style.color = '#49B79D';
        this.KBcountdownInput.nativeElement.style.display = "none";
        this.KBtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.KBballText.nativeElement.textContent = "Respiração Normal"
        }else{
          this.KBballText.nativeElement.textContent = "Normal Breathing"
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
  DisplayTimerKB(): void {
    this.KBSeconds++;
    if (this.KBSeconds === 60) {
    this.KBSeconds = 0;
    this.KBMinutes++;
    }
    const M = this.KBMinutes < 10 ? '0' + this.KBMinutes : this.KBMinutes;
    const S = this.KBSeconds < 10 ? '0' + this.KBSeconds : this.KBSeconds;
    this.timerDisplayKB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopKB(): void{
    this.clearIntervalsKB();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.KBcountdownInput.nativeElement.style.display = "none";
    this.KBtimeInput.nativeElement.style.display = "inline";
    this.KBcurrentValue = 0;
    this.startBtnKB.nativeElement.disabled = false;
    this.KBReset.nativeElement.disabled = true;
    this.KBReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.KBSave.nativeElement.disabled = true;
    this.KBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.breathsKB = true;
    this.hold2KB = false;
    this.hold1KB = false;
    if(this.isPortuguese){
      this.KBballText.nativeElement.textContent = "Iniciar"
    }else{
      this.KBballText.nativeElement.textContent = "Start"
    }
    this.roundsKB = 0;
    this.roundsDoneKB.nativeElement.innerHTML = "0";
    this.timerDisplayKB.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setKBduration();
    this.KBSeconds = 0;
    this.KBMinutes = 0;
    this.roundsKB = 0;
    this.KBResults.nativeElement.innerHTML = "";
    this.globalService.changeBall(1.3, 1, this.KBball);
  }
  pauseKB(): void{
    clearInterval(this.KBinterval);
    this.KBinterval = null;
    if(this.isPortuguese){
      this.KBballText.nativeElement.textContent = "Respiração Normal"
    }else{
      this.KBballText.nativeElement.textContent = "Normal Breath"
    }
    this.audioService.playSound('normalbreath');
    this.hold1KB = false;
    this.hold2KB = true;
    this.roundsKB++;
    this.roundsDoneKB.nativeElement.innerHTML = this.roundsKB.toString();
    this.KBduration = this.KBduration - 1;
    if (this.KBduration !== Infinity) {
      this.KBcountdownInput.nativeElement.value = this.KBduration.toString() + " rounds left";   
    } else {
      this.KBcountdownInput.nativeElement.value = '∞';
    }
    this.KBResults.nativeElement.innerHTML += "<div class='NOfSteps'> <div>Round " + this.roundsKB + "</div><div>" + this.formatTime(this.KBcurrentValue) + "</div></div>";
    this.KBroundsResults.push(this.KBcurrentValue);
    this.KBcurrentValue = 31;
    this.KBinterval = setInterval(() => this.startTimerKB(), 1000);
  }
  saveKB(): void{
    const savedResults = JSON.parse(localStorage.getItem('KBResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), roundsResult: this.KBroundsResults, result: this.timerDisplayKB.nativeElement.innerHTML, rounds: this.roundsKB }); // Add the new result with the current date
    localStorage.setItem('KBResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.KBResultSaved.nativeElement.style.display = 'block';
    this.stopKB();
    this.KBroundsResults = [];
  }
  
  clearIntervalsKB(): void {
    clearInterval(this.KBinterval);
    clearInterval(this.KBTimer); 
    this.KBinterval = null;
    this.KBTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopKB(); 
    this.KBResultSaved.nativeElement.style.display = 'none';
  }
}