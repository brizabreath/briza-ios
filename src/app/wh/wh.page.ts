import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AudioService } from '../services/audio.service'; 
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-wh',
  templateUrl: './wh.page.html',
  styleUrls: ['./wh.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class WHPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalWH') modalWH!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalWH') closeModalButtonWH!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionWH') questionWH!: ElementRef<HTMLButtonElement>;
  @ViewChild('WHdots') WHdots!: ElementRef<HTMLDivElement>;
  @ViewChild('WHball') WHball!: ElementRef<HTMLDivElement>;
  @ViewChild('WHballText') WHballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('WHtimeInput') WHtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('WHcountdownInput') WHcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnWH') startBtnWH!: ElementRef<HTMLButtonElement>;
  @ViewChild('WHReset') WHReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('WHSave') WHSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsWH') settingsWH!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneWH') roundsDoneWH!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayWH') timerDisplayWH!: ElementRef<HTMLDivElement>;
  @ViewChild('WHResultSaved') WHResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('WHResults') WHResults!: ElementRef<HTMLDivElement>;
  @ViewChild('breathsInputWH') breathsInputWH!: ElementRef<HTMLInputElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private breathsWH = true;
  private hold1WH = false;
  private hold2WH = false;
  private WHinterval: any = null; 
  private WHcurrentValue = 0;
  private WHduration = 0; // Initialize duration as a number
  private WHSeconds = 0;
  private WHMinutes = 0;
  private roundsWH = 0;
  private WHTimer: any = null;
  private WHroundsResults: any[] = [];
  private WHbreaths: any = null;
  private WHbreathSpeed: any = null;
  isModalOpen = false;

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.globalService.initBulletSlider(this.modalWH, this.WHdots, 'slides');
    this.closeModalButtonWH.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalWH));
    this.questionWH.nativeElement.onclick = () => this.globalService.openModal(this.modalWH, this.WHdots, 'slides');
    //populate input
    for (let WHi = 2; WHi <= 8; WHi++) { // assuming 1 to 8 rounds
      let WHoption = document.createElement('option');
      WHoption.value = (WHi).toString(); // Convert the number to a string
      WHoption.textContent = WHi + ' rounds';
      this.WHtimeInput.nativeElement.appendChild(WHoption);
    }
    // Initialize buttons
    this.startBtnWH.nativeElement.onclick = () => this.startWH();
    this.WHReset.nativeElement.onclick = () => this.stopWH();
    this.WHSave.nativeElement.onclick = () => this.saveWH();
    this.WHReset.nativeElement.disabled = true;
    this.WHReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.WHSave.nativeElement.disabled = true;
    this.WHSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.WHtimeInput.nativeElement.onchange = () => this.setWHduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true");
    this.globalService.changeBall(1, 1, this.WHball);
    
  }
  // Method to set the WHduration after ViewChild is initialized
  setWHduration(): void {
      const selectedValue = this.WHtimeInput.nativeElement.value;
      
      // Check if the value is '∞', then set WHduration accordingly
      if (selectedValue === 'infinity') {
        this.WHduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.WHduration = parseInt(selectedValue);
      }
  }

  ionViewWillEnter() {
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.WHballText.nativeElement.textContent = "Iniciar"
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.WHballText.nativeElement.textContent = "Start"
    }
    this.setWHduration();
    this.WHResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    //initialize sounds
    this.audioService.initializeSong(); 
    //set up breaths
    this.WHbreaths = localStorage.getItem('numberOfBreaths');
    // Check if it doesn't exist or is null
    if (this.WHbreaths === null) {
      this.WHbreaths = 31; // Default value
      localStorage.setItem('numberOfBreaths', this.WHbreaths.toString()); // Store it in localStorage
    } else {
      this.WHbreaths = parseInt(this.WHbreaths); // Convert the stored string to a number
    }
    this.WHbreathSpeed = localStorage.getItem('speedOfBreaths');
    // Check if it doesn't exist or is null
    if (this.WHbreathSpeed === null) {
      this.WHbreathSpeed = 1900; // Default value
      localStorage.setItem('speedOfBreaths', this.WHbreathSpeed.toString()); // Store it in localStorage
    } else {
      this.WHbreathSpeed = parseInt(this.WHbreathSpeed); // Convert the stored string to a number
    }
    this.breathsInputWH.nativeElement.value = (this.WHbreaths - 1).toString();
  }
   
  startWH(): void{
     //initialize sounds
    this.audioService.initializeSong(); 
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsWH.nativeElement.disabled = true;
    this.questionWH.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnWH.nativeElement.disabled = true;
      this.breathsWH = true;
      this.WHcountdownInput.nativeElement.style.display = "inline";
      this.WHtimeInput.nativeElement.style.display = "none";
      this.startCountdownWH();
      this.WHballText.nativeElement.textContent = "3";
      this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.WHballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.WHballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        if(this.isPortuguese){
          this.WHballText.nativeElement.textContent = "Inspire";
        }else{
          this.WHballText.nativeElement.textContent = "Fully In";
        }
        this.WHinterval = setInterval(() => {
          this.audioService.playBreath('fullyin');
          this.globalService.changeBall(1.3 , this.WHbreathSpeed/2000, this.WHball);
          this.startBreathsWH();
        }, this.WHbreathSpeed);
        this.WHTimer = setInterval(() => this.DisplayTimerWH(), 1000);
        this.startBtnWH.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      if(!this.hold1WH){
        this.clearIntervalsWH();
        localStorage.setItem('breathingON', "false"); 
        this.WHReset.nativeElement.disabled = false;
        this.WHReset.nativeElement.style.color = '#990000';
        if(this.roundsWH > 0){
          this.WHSave.nativeElement.disabled = false;
          this.WHSave.nativeElement.style.color = '#49B79D';
        }
        this.settingsWH.nativeElement.disabled = false;
        this.questionWH.nativeElement.disabled = false;
        if(this.isPortuguese){
          this.WHballText.nativeElement.textContent = "Continuar"
        }else{
          this.WHballText.nativeElement.textContent = "Resume"
        }
        this.audioService.pauseSelectedSong();
        this.globalService.changeBall(1.3, 1, this.WHball);
      }else{
        this.pauseWH();
      }
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.hold2WH){
          this.WHballText.nativeElement.textContent = "Segure"
        }else if(this.breathsWH){
          this.WHballText.nativeElement.textContent = "Respire"
        }
      }else{
        if(this.hold2WH){
          this.WHballText.nativeElement.textContent = "Hold"
        }else if(this.breathsWH){
          this.WHballText.nativeElement.textContent = "Breath"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.WHReset.nativeElement.disabled = true;
      this.WHReset.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.WHSave.nativeElement.disabled = true;
      this.WHSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      if(this.hold2WH){
        this.WHinterval = setInterval(() => this.startTimerWH(), 1000);
        this.WHTimer = setInterval(() => this.DisplayTimerWH(), 1000);
      }else if(this.breathsWH){
        this.WHinterval = setInterval(() => {
          this.audioService.playBreath('fullyin');
          this.globalService.changeBall(1.3 , this.WHbreathSpeed/2000, this.WHball);
          this.startBreathsWH();
        }, this.WHbreathSpeed);
        this.WHTimer = setInterval(() => this.DisplayTimerWH(), 1000);
      }
    }
  }
  startBreathsWH(): void{
    this.WHbreaths--;
    if(this.WHbreaths < 1){
      clearInterval(this.WHinterval);
      this.WHinterval = null;
      if(this.isPortuguese){
        this.WHballText.nativeElement.textContent = "Segure"    
      }else{
        this.WHballText.nativeElement.textContent = "Hold"    
      }
      setTimeout(() => {
          this.audioService.playSound('letgoandhold');
      },1000);
      this.breathsWH = false;
      this.hold1WH = true;
      this.WHbreaths = this.breathsInputWH.nativeElement.value;
      const timeoutId8 = setTimeout(() => {
        this.WHinterval = setInterval(() => this.startTimerWH(), 1000);
      }, 2000);
      this.globalService.timeouts.push(timeoutId8); // Store the timeout ID
    }else{
    this.WHballText.nativeElement.textContent = this.WHbreaths.toString();
    const timeoutId6 = setTimeout(() => {
      this.globalService.changeBall(0.5 , this.WHbreathSpeed/2000, this.WHball);
      this.audioService.playBreath('fullyout');
    }, this.WHbreathSpeed/2);
    this.globalService.timeouts.push(timeoutId6); // Store the timeout ID
    }
  }
  startCountdownWH(): void {
    if (this.WHduration !== Infinity) {
      this.WHcountdownInput.nativeElement.value = this.WHduration.toString() + " rounds left";   
    } else {
      this.WHcountdownInput.nativeElement.value = '∞';
      this.WHcountdownInput.nativeElement.style.display = "inline";
      this.WHtimeInput.nativeElement.style.display = "none";
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
  startTimerWH(): void{ 
    if(this.hold2WH){
      this.WHcurrentValue--;
      if(this.isPortuguese){
        this.WHballText.nativeElement.textContent = this.WHcurrentValue.toString() + " segundos";
      }else{
        this.WHballText.nativeElement.textContent = this.WHcurrentValue.toString() + " seconds";
      }
    }
    if(this.hold1WH){
      this.WHcurrentValue++;
      if(this.isPortuguese){
        this.WHballText.nativeElement.textContent = this.formatTime(this.WHcurrentValue);
      }else{
        this.WHballText.nativeElement.textContent = this.formatTime(this.WHcurrentValue);
      }
    }
    if(this.hold2WH && this.WHcurrentValue == 1){
      if(this.WHduration !== 0){
        this.hold2WH = false;
        this.breathsWH = true;
        this.WHcurrentValue = 0;
        clearInterval(this.WHinterval);
        this.WHinterval = null;
        if(this.isPortuguese){
          this.WHballText.nativeElement.textContent = "Próximo Round"
        }else{
          this.WHballText.nativeElement.textContent = "Next Round"
        }
        this.audioService.playSound('letGo');
        const timeoutId7 = setTimeout(() => {
          this.WHinterval = setInterval(() => {
            this.audioService.playBreath('fullyin');
            this.globalService.changeBall(1.3 , this.WHbreathSpeed/2000, this.WHball);
            this.startBreathsWH();
          }, this.WHbreathSpeed);
        }, 2000);
        this.globalService.timeouts.push(timeoutId7); // Store the timeout ID
      }
      else{
         
        this.clearIntervalsWH();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnWH.nativeElement.disabled = true;
        this.settingsWH.nativeElement.disabled = false;
        this.questionWH.nativeElement.disabled = false;
        this.WHReset.nativeElement.disabled = false;
        this.WHReset.nativeElement.style.color = '#990000';
        this.WHSave.nativeElement.disabled = false;
        this.WHSave.nativeElement.style.color = '#49B79D';
        this.WHcountdownInput.nativeElement.style.display = "none";
        this.WHtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.WHballText.nativeElement.textContent = "Respiração Normal"
        }else{
          this.WHballText.nativeElement.textContent = "Normal Breathing"
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
  DisplayTimerWH(): void {
    this.WHSeconds++;
    if (this.WHSeconds === 60) {
    this.WHSeconds = 0;
    this.WHMinutes++;
    }
    const M = this.WHMinutes < 10 ? '0' + this.WHMinutes : this.WHMinutes;
    const S = this.WHSeconds < 10 ? '0' + this.WHSeconds : this.WHSeconds;
    this.timerDisplayWH.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopWH(): void{
    this.clearIntervalsWH();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.WHcountdownInput.nativeElement.style.display = "none";
    this.WHtimeInput.nativeElement.style.display = "inline";
    this.WHcurrentValue = 0;
    this.startBtnWH.nativeElement.disabled = false;
    this.WHReset.nativeElement.disabled = true;
    this.WHReset.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.WHSave.nativeElement.disabled = true;
    this.WHSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.breathsWH = true;
    this.hold2WH = false;
    this.hold1WH = false;
    if(this.isPortuguese){
      this.WHballText.nativeElement.textContent = "Iniciar"
    }else{
      this.WHballText.nativeElement.textContent = "Start"
    }
    this.roundsWH = 0;
    this.roundsDoneWH.nativeElement.innerHTML = "0";
    this.timerDisplayWH.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setWHduration();
    this.WHSeconds = 0;
    this.WHMinutes = 0;
    this.roundsWH = 0;
    this.WHResults.nativeElement.innerHTML = "";
    this.globalService.changeBall(1.3, 1, this.WHball);
    this.WHbreaths = this.breathsInputWH.nativeElement.value;
  }
  pauseWH(): void{
    clearInterval(this.WHinterval);
    this.WHinterval = null;
    if(this.isPortuguese){
      this.WHballText.nativeElement.textContent = "Segure"
    }else{
      this.WHballText.nativeElement.textContent = "Hold"
    }
    this.audioService.playSound('fullyinHold');
    this.hold1WH = false;
    this.hold2WH = true;
    this.roundsWH++;
    this.roundsDoneWH.nativeElement.innerHTML = this.roundsWH.toString();
    this.WHduration = this.WHduration - 1;
    if (this.WHduration !== Infinity) {
      this.WHcountdownInput.nativeElement.value = this.WHduration.toString() + " rounds left";   
    } else {
      this.WHcountdownInput.nativeElement.value = '∞';
    }
    this.WHResults.nativeElement.innerHTML += "<div class='NOfSteps'> <div>Round " + this.roundsWH + "</div><div>" + this.formatTime(this.WHcurrentValue) + "</div></div>";
    this.WHroundsResults.push(this.WHcurrentValue);
    this.WHcurrentValue = 16;
    this.WHinterval = setInterval(() => this.startTimerWH(), 1000);
  }
  saveWH(): void{
    const savedResults = JSON.parse(localStorage.getItem('WHResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), roundsResult: this.WHroundsResults, result: this.timerDisplayWH.nativeElement.innerHTML, rounds: this.roundsWH }); // Add the new result with the current date
    localStorage.setItem('WHResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.WHResultSaved.nativeElement.style.display = 'block';
    this.stopWH();
    this.WHroundsResults = [];
  }
  
  clearIntervalsWH(): void {
    clearInterval(this.WHinterval);
    clearInterval(this.WHTimer); 
    this.WHinterval = null;
    this.WHTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopWH(); 
    this.WHResultSaved.nativeElement.style.display = 'none';
  }
}