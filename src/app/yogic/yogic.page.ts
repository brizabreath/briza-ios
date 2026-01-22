import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AudioService } from '../services/audio.service'; 
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';


@Component({
  selector: 'app-yogic',
  templateUrl: './yogic.page.html',
  styleUrls: ['./yogic.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class YogicPage implements  AfterViewInit, OnDestroy {
  @ViewChild('myModalYB') modalYB!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalYB') closeModalButtonYB!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionYB') questionYB!: ElementRef<HTMLButtonElement>;
  @ViewChild('YBdots') YBdots!: ElementRef<HTMLDivElement>;
  @ViewChild('YBball') YBball!: ElementRef<HTMLDivElement>;
  @ViewChild('YBballText') YBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('YBtimeInput') YBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('YBcountdownInput') YBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnYB') startBtnYB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnYB') stopBtnYB!: ElementRef<HTMLButtonElement>;
  @ViewChild('YBSave') YBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsYB') settingsYB!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputYB') inhaleInputYB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputYB') hold1InputYB!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputYB') exhaleInputYB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputYB') hold2InputYB!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneYB') roundsDoneYB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayYB') timerDisplayYB!: ElementRef<HTMLDivElement>;
  @ViewChild('YBResultSaved') YBResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusYB') minusYB!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusYB') plusYB!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleYB = true;
  private hold1YB = false;
  private exhaleYB = false;
  private hold2YB = false;
  private YBinterval: any = null; 
  private YBcountdown: any = null; // Use 'any' or specify the correct type if known
  private YBcurrentValue = 5;
  private YBduration = 0; // Initialize duration as a number
  private roundsYB = 0;
  private YBSeconds = 0;
  private YBMinutes = 0;
  private YBTimer: any = null;
  private YBResult = ''; // Variable to store the BRT result as a string
  isModalOpen = false;
  private appStateHandle?: PluginListenerHandle;

  constructor(private navCtrl: NavController, private audioService: AudioService, public globalService: GlobalService) {}
  ngAfterViewInit(): void {
    this.globalService.initBulletSlider(this.modalYB, this.YBdots, 'slides');
    this.closeModalButtonYB.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalYB));
    this.questionYB.nativeElement.onclick = () => this.globalService.openModal(this.modalYB, this.YBdots, 'slides');
    //populate input
    for (let YBi = 2; YBi <= 60; YBi++) { // assuming 1 to 60 minutes
      let YBoption = document.createElement('option');
      YBoption.value = (YBi * 60).toString(); // Convert the number to a string
      if (this.isPortuguese) {
        YBoption.textContent = YBi + ' minutos';
      } else {
        YBoption.textContent = YBi + ' minutes';
      }
      this.YBtimeInput.nativeElement.appendChild(YBoption);
    }
    // Initialize buttons
    //modal events set up
    this.minusYB.nativeElement.onclick = () => this.minusRatioYB();
    this.plusYB.nativeElement.onclick = () => this.plusRatioYB();
    this.startBtnYB.nativeElement.onclick = () => this.startYB();
    this.stopBtnYB.nativeElement.onclick = () => this.stopYB();
    this.YBSave.nativeElement.onclick = () => this.saveYB();
    this.stopBtnYB.nativeElement.disabled = true;
    this.stopBtnYB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.YBSave.nativeElement.disabled = true;
    this.YBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.YBtimeInput.nativeElement.onchange = () => this.setYBduration();
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
    
  }

  // Method to set the YBduration after ViewChild is initialized
  setYBduration(): void {
      const selectedValue = this.YBtimeInput.nativeElement.value;
      // Check if the value is '∞', then set YBduration accordingly
      if (selectedValue === 'infinity') {
        this.YBduration = Infinity;
      } else {
        // Otherwise, parse it as a number
        this.YBduration = parseInt(selectedValue);
      }
  }
  async ionViewWillLeave() {
    await this.appStateHandle?.remove();
    this.appStateHandle = undefined;
  }
  async ionViewWillEnter() {
    await this.appStateHandle?.remove();

    this.appStateHandle = await App.addListener('appStateChange', async (state) => {
      if (!state.isActive) {
        const breathingON = localStorage.getItem('breathingON');
        const firstClick = localStorage.getItem('firstClick');

        if (firstClick === "false" && breathingON === "true") {
          this.globalService.clearAllTimeouts();
          await this.startYB(); // toggles to pause in your logic
        } else if (firstClick === "false" && breathingON === "false") {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopYB();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
       
       
      this.YBballText.nativeElement.textContent = "Iniciar"
    } else {
       
       
      this.YBballText.nativeElement.textContent = "Start"
    }
    this.setYBduration();
    this.YBResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    //initialize sounds
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong(); 
  }
   
  minusRatioYB(): void{
    if(parseInt(this.inhaleInputYB.nativeElement.value) > 2){
      this.inhaleInputYB.nativeElement.value = 
      ((parseInt(this.inhaleInputYB.nativeElement.value) || 0) - 1).toString();
      this.hold1InputYB.nativeElement.value = 
      ((parseInt(this.hold1InputYB.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputYB.nativeElement.value = 
      ((parseInt(this.exhaleInputYB.nativeElement.value) || 0) - 1).toString();
      this.hold2InputYB.nativeElement.value = 
      ((parseInt(this.hold2InputYB.nativeElement.value) || 0) - 3).toString();
    }
  }
  plusRatioYB():void{
    if(parseInt(this.inhaleInputYB.nativeElement.value) < 20){
      this.inhaleInputYB.nativeElement.value = 
      ((parseInt(this.inhaleInputYB.nativeElement.value) || 0) + 1).toString();
      this.hold1InputYB.nativeElement.value = 
      ((parseInt(this.hold1InputYB.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputYB.nativeElement.value = 
      ((parseInt(this.exhaleInputYB.nativeElement.value) || 0) + 1).toString();
      this.hold2InputYB.nativeElement.value = 
      ((parseInt(this.hold2InputYB.nativeElement.value) || 0) + 3).toString();
    }
  }
  async startYB(): Promise<void>{
    await this.audioService.resetForPlayOrResume();
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    this.settingsYB.nativeElement.disabled = true;
    this.questionYB.nativeElement.disabled = true;
    if(firstClick == "true" && breathingON == "false"){
      this.startBtnYB.nativeElement.disabled = true;
      this.inhaleYB = true;
      this.YBcountdownInput.nativeElement.style.display = "inline";
      this.YBtimeInput.nativeElement.style.display = "none";
      this.startCountdownYB();
      this.YBballText.nativeElement.textContent = "3";
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(() => {
        this.YBballText.nativeElement.textContent = "2";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.YBballText.nativeElement.textContent = "1";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(async () => {
        if(this.isPortuguese){
          this.YBballText.nativeElement.textContent = "Inspire";
        }else{
          this.YBballText.nativeElement.textContent = "Inhale";
        }
        await this.audioService.playSound('inbelly');      
        this.YBcurrentValue = parseInt(this.inhaleInputYB.nativeElement.value) + 1;  
        await this.audioService.playBreathSound('inhaleBreath', this.YBcurrentValue); 
        this.globalService.changeBall(1.3, parseInt(this.inhaleInputYB.nativeElement.value), this.YBball);
        this.YBinterval = setInterval(() => this.startTimerYB(), 1000);
        this.YBTimer = setInterval(() => this.DisplayTimerYB(), 1000);
        this.startBtnYB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false"); 
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      this.clearIntervalsYB();
      localStorage.setItem('breathingON', "false"); 
      this.stopBtnYB.nativeElement.disabled = false;
      this.stopBtnYB.nativeElement.style.color = '#990000';
      if(this.roundsYB > 0){
        this.YBSave.nativeElement.disabled = false;
        this.YBSave.nativeElement.style.color = '#49B79D';
      }
      this.settingsYB.nativeElement.disabled = false;
      this.questionYB.nativeElement.disabled = false;
      if(this.isPortuguese){
        this.YBballText.nativeElement.textContent = "Continuar"
      }else{
        this.YBballText.nativeElement.textContent = "Resume"
      }
      this.audioService.pauseSelectedSong();
      //unpause function
    }else if(firstClick == "false" && breathingON == "false"){
      if(this.isPortuguese){
        if(this.inhaleYB || this.hold1YB || this.exhaleYB){
          this.YBballText.nativeElement.textContent = "Inspire"
        }else if(this.hold2YB){
          this.YBballText.nativeElement.textContent = "Espire"
        }
      }else{
        if(this.inhaleYB || this.hold1YB || this.exhaleYB){
          this.YBballText.nativeElement.textContent = "Inhale"
        }else if(this.hold2YB){
          this.YBballText.nativeElement.textContent = "Exhale"
        }      
      }
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', "true"); 
      this.stopBtnYB.nativeElement.disabled = true;
      this.stopBtnYB.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.YBSave.nativeElement.disabled = true;
      this.YBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.YBinterval = setInterval(() => this.startTimerYB(), 1000);
      this.YBTimer = setInterval(() => this.DisplayTimerYB(), 1000);
      this.startCountdownYB();
    }
  }
  startCountdownYB(): void {
    if (this.YBduration !== Infinity) {
      let Contdownminutes = Math.floor(this.YBduration / 60);
      let Contdownseconds = this.YBduration % 60;
      this.YBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;   
      this.YBcountdown = setInterval( () => {
        if(this.YBduration == 0){
          clearInterval(this.YBcountdown); 
          this.YBcountdown = null;
        }else{
          this.YBduration--;
          // Calculate minutes and seconds
          let Contdownminutes = Math.floor(this.YBduration / 60);
          let Contdownseconds = this.YBduration % 60;
          this.YBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.YBcountdownInput.nativeElement.value = '∞';
      this.YBcountdownInput.nativeElement.style.display = "inline";
      this.YBtimeInput.nativeElement.style.display = "none";
    }
  }
  async startTimerYB(): Promise<void>{ 
    this.YBcurrentValue--;
    if(this.inhaleYB && this.YBcurrentValue == 1){
      this.YBcurrentValue = parseInt(this.hold1InputYB.nativeElement.value) + 1;
      this.inhaleYB = false;
      this.hold1YB = true;
      await this.audioService.playSound('inribs');
      await this.audioService.playBreathSound('inhaleBreath', this.YBcurrentValue);     
      if(this.isPortuguese){
        this.YBballText.nativeElement.textContent = "Inspire"
      }else{
        this.YBballText.nativeElement.textContent = "Inhale"
      }
      this.globalService.changeBall(1.4, parseInt(this.hold1InputYB.nativeElement.value), this.YBball);
    }
    else if(this.hold1YB && this.YBcurrentValue == 1){
      this.YBcurrentValue = parseInt(this.exhaleInputYB.nativeElement.value) + 1;
      this.hold1YB = false;
      this.exhaleYB = true;
      await this.audioService.playSound('inchest');
      await this.audioService.playBreathSound('inhaleBreath', this.YBcurrentValue);  
      if(this.isPortuguese){
        this.YBballText.nativeElement.textContent = "Inspire"
      }else{
        this.YBballText.nativeElement.textContent = "Inhale"
      }
      this.globalService.changeBall(1.5, parseInt(this.exhaleInputYB.nativeElement.value), this.YBball);
    }
    else if(this.exhaleYB && this.YBcurrentValue == 1){
      this.YBcurrentValue = parseInt(this.hold2InputYB.nativeElement.value) + 1;
      this.exhaleYB = false;
      this.hold2YB = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.YBcurrentValue); 
      if(this.isPortuguese){
        this.YBballText.nativeElement.textContent = "Espire"
      }else{
        this.YBballText.nativeElement.textContent = "Exhale"
      }
      this.globalService.changeBall(1, parseInt(this.hold2InputYB.nativeElement.value), this.YBball);
      this.roundsYB++;
      this.roundsDoneYB.nativeElement.innerHTML = this.roundsYB.toString();
    }
    else if(this.hold2YB && this.YBcurrentValue == 1){
      if(this.YBduration !== 0){
        this.YBcurrentValue = parseInt(this.inhaleInputYB.nativeElement.value) + 1;
        this.hold2YB = false;
        this.inhaleYB = true;
        await this.audioService.playSound('inbelly');
        await this.audioService.playBreathSound('inhaleBreath', this.YBcurrentValue); 
        if(this.isPortuguese){
          this.YBballText.nativeElement.textContent = "Inspire"
        }else{
          this.YBballText.nativeElement.textContent = "Inhale"
        }
        this.globalService.changeBall(1.3, parseInt(this.inhaleInputYB.nativeElement.value), this.YBball);
      } 
      else{
        this.clearIntervalsYB();
        localStorage.setItem('breathingON', "false"); 
        this.startBtnYB.nativeElement.disabled = true;
        this.settingsYB.nativeElement.disabled = false;
        this.questionYB.nativeElement.disabled = false;
        this.stopBtnYB.nativeElement.disabled = false;
        this.stopBtnYB.nativeElement.style.color = '#990000';
        this.YBSave.nativeElement.disabled = false;
        this.YBSave.nativeElement.style.color = '#49B79D';
        this.globalService.changeBall(1.5, 1, this.YBball);
        this.YBcountdownInput.nativeElement.style.display = "none";
        this.YBtimeInput.nativeElement.style.display = "inline"; 
        if(this.isPortuguese){
          this.YBballText.nativeElement.textContent = "Iniciar"
        }else{
          this.YBballText.nativeElement.textContent = "Start"
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
  DisplayTimerYB(): void {
    this.YBSeconds++;
    if (this.YBSeconds === 60) {
    this.YBSeconds = 0;
    this.YBMinutes++;
    }
    const M = this.YBMinutes < 10 ? '0' + this.YBMinutes : this.YBMinutes;
    const S = this.YBSeconds < 10 ? '0' + this.YBSeconds : this.YBSeconds;
    this.timerDisplayYB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }
  stopYB(): void{
    this.clearIntervalsYB();    
    localStorage.setItem('firstClick', "true"); 
    localStorage.setItem('breathingON', "false"); 
    this.YBcountdownInput.nativeElement.style.display = "none";
    this.YBtimeInput.nativeElement.style.display = "inline";
    this.YBcurrentValue = parseInt(this.inhaleInputYB.nativeElement.value) + 1;
    this.startBtnYB.nativeElement.disabled = false;
    this.stopBtnYB.nativeElement.disabled = true;
    this.stopBtnYB.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.YBSave.nativeElement.disabled = true;
    this.YBSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.inhaleYB = true;
    this.hold1YB = false;
    this.exhaleYB = false;
    this.hold2YB = false;
    this.globalService.changeBall(1, 1, this.YBball);
    if(this.isPortuguese){
      this.YBballText.nativeElement.textContent = "Iniciar"
    }else{
      this.YBballText.nativeElement.textContent = "Start"
    }
    this.roundsYB = 0;
    this.roundsDoneYB.nativeElement.innerHTML = "0";
    this.timerDisplayYB.nativeElement.innerHTML = "00 : 00";
    this.audioService.pauseSelectedSong();
    this.setYBduration();
    this.YBSeconds = 0;
    this.YBMinutes = 0;
    this.roundsYB = 0;
  }
  saveYB(): void{
    this.YBResult = this.timerDisplayYB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('YBResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.YBResult, rounds: this.roundsYB }); // Add the new result with the current date
    localStorage.setItem('YBResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.YBResultSaved.nativeElement.style.display = 'block';
    this.stopYB();
  }
  
  clearIntervalsYB(): void {
    clearInterval(this.YBinterval);
    clearInterval(this.YBcountdown); 
    clearInterval(this.YBTimer); 
    this.YBinterval = null;
    this.YBcountdown = null;
    this.YBTimer = null;
  }
 // Method to navigate back
 goBack(): void {
  this.globalService.clearAllTimeouts();
  this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  
  ngOnDestroy(): void {
    this.stopYB(); 
    this.YBResultSaved.nativeElement.style.display = 'none';
  }
}