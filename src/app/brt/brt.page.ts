import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AudioService } from '../services/audio.service'; // Import the AudioService
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router'; // Import RouterModule
import { App } from '@capacitor/app';
import { ShepherdService } from 'angular-shepherd';


@Component({
  selector: 'app-brt',
  templateUrl: './brt.page.html',
  styleUrls: ['./brt.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BRTPage implements AfterViewInit, OnDestroy {
  @ViewChild('myModalBRT') modalBRT!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalBRT') closeModalButtonBRT!: ElementRef<HTMLSpanElement>;
  @ViewChild('BRTdots') BRTdots!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayBRT') timerDisplayBRT!: ElementRef<HTMLInputElement>;
  @ViewChild('brtStart') brtStart!: ElementRef<HTMLButtonElement>;
  @ViewChild('brtStop') brtStop!: ElementRef<HTMLButtonElement>;
  @ViewChild('brtSave') brtSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRTSettings') BRTSettings!: ElementRef<HTMLButtonElement>;
  @ViewChild('brtResultSaved') brtResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('BRTball') BRTball!: ElementRef<HTMLDivElement>;
  @ViewChild('settingsBRT') settingsBRT!: ElementRef<HTMLButtonElement>;
  @ViewChild('questionBRT') questionBRT!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRTballText') BRTballText!: ElementRef<HTMLSpanElement>;

  private brtSeconds = 0;
  private brtMinutes = 0;
  private brtInt: any = null;
  private brtResult = ''; // Variable to store the BRT result as a string
  private isPortuguese = localStorage.getItem('isPortuguese') === 'true';

  constructor(private navCtrl: NavController, private audioService: AudioService, private globalService: GlobalService, private shepherd: ShepherdService, private router: Router) {}
  ionViewDidEnter() {
    const shouldStart = localStorage.getItem('startBRTTour') === 'true';
    if (shouldStart) {
      localStorage.removeItem('startBRTTour');
      this.startBRTTour();
    }
  }
 startBRTTour() {
    (this.shepherd as any).defaultStepOptions = {
      cancelIcon: { enabled: true },
      scrollTo: true,
      canClickTarget: false,
      classes: 'briza-tour',
      modalOverlayOpeningPadding: 4,   
      modalOverlayOpeningRadius: 10, 
      popperOptions: {
        strategy: 'fixed',
        modifiers: [
          { name: 'preventOverflow', options: { boundary: 'viewport' } },
          { name: 'flip', options: { fallbackPlacements: ['top','right','left','bottom'] } }
        ]
      }
    } as any;

    this.shepherd.modal = true;

    const isPT = localStorage.getItem('isPortuguese') === 'true';
    const t = (en: string, pt: string) => (isPT ? pt : en);

    // Defer a tick so header/layout are fully ready
    setTimeout(() => {
      this.shepherd.addSteps([
        {
          id: 'hp-settings',
          text: `<h3>${t('Settings','Configurações')}</h3>
                <p>${t('Adjust exercises preferences',
                        'Ajuste as preferências de exercícios')}</p>`,
          attachTo: { element: '#hp-settings', on: 'bottom' }, // bottom is safer near header
          highlightClass: 'briza-highlight',
          buttons: [
            { text: t('Next','Próximo'), action: () => this.shepherd.next() }
          ]
        },
        {
          id: 'hp-question',
          text: `<h3>${t('Help','Ajuda')}</h3>
                <p>${t('Check how to do the breathing exercises correctly',
                        'Veja como fazer os exercícios de respiração corretamente')}</p>`,
          attachTo: { element: '#hp-question', on: 'bottom' },
          highlightClass: 'briza-highlight',
          buttons: [
            { text: t('Back','Voltar'), action: () => this.shepherd.back() },
            { text: t('Next','Próximo'), action: () => this.shepherd.next() }
          ]
        },
        {
          id: 'hp-ball',
          text: `<h3>${t('Start Button','Botão Iniciar')}</h3>
                <p>${t('To start the exercise, press this circle, press it again if you would like to pause it',
                        'Para iniciar os exercícios, pressione este círculo, pressione-o novamente se desejar pausá-lo')}</p>`,
          attachTo: { element: '#hp-ball', on: 'top' },
          highlightClass: 'briza-highlight',
          buttons: [
            { text: t('Back','Voltar'), action: () => this.shepherd.back() },
            { text: t('Next','Próximo'), action: () => this.shepherd.next() }
          ]
        },
        {
          id: 'hp-controls',
          text: `<h3>${t('Save your result','Salvar resultado')}</h3>
                <p>${t('After pausing the exercise, tap Save to track your progress',
                        'Clique em Salvar ao terminar para acompanhar seu progresso')}</p>`,
          // attach tightly to the Save button instead of the whole bar
          attachTo: { element: '#brtSave', on: 'top' },
          buttons: [
            { text: t('Back','Voltar'), action: () => this.shepherd.back() },
            { text: t('Get Started','Comece Agora'),
              action: () => {
                this.shepherd.complete();
                this.globalService.openModal(this.modalBRT, this.BRTdots, 'slides');    
              }
            },
          ]
        },
         
      ]);
      const tour: any = (this.shepherd as any).tourObject || (this.shepherd as any).tour;
      if (tour?.on) {
        tour.off?.('start', this.lockUIForTour);
        tour.off?.('complete', this.unlockUIForTour);
        tour.off?.('cancel', this.unlockUIForTour);
        tour.off?.('inactive', this.unlockUIForTour);

        tour.on('start', this.lockUIForTour);
        tour.on('complete', this.unlockUIForTour);
        tour.on('cancel', this.unlockUIForTour);
        tour.on('inactive', this.unlockUIForTour);
      }

      this.shepherd.start();  
    }, 0);
  }
  ionViewDidLeave() {
    this.unlockUIForTour();
  }
  ngAfterViewInit(): void {
    // Add event listeners for start, pause, stop, and save buttons
    this.brtStart.nativeElement.addEventListener('click', () => this.startTimerBRT());
    this.brtStop.nativeElement.addEventListener('click', () => this.stopTimerBRT());
    this.brtSave.nativeElement.addEventListener('click', () => this.saveResultBRT());

    // Initialize button states
    this.brtStart.nativeElement.disabled = false;
    this.brtStop.nativeElement.disabled = true;
    this.brtStop.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.brtSave.nativeElement.disabled = true;
    this.brtSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.brtResultSaved.nativeElement.style.display = 'none'; // Ensure the saved message is hidden initially
    this.globalService.changeBall(1.2,1,this.BRTball);
    //set up booleans
    localStorage.setItem('breathingON', "false"); 
    localStorage.setItem('firstClick', "true"); 
    //initiate button
    this.globalService.initBulletSlider(this.modalBRT, this.BRTdots, 'slides');
    this.closeModalButtonBRT.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalBRT));
    this.questionBRT.nativeElement.onclick = () => this.globalService.openModal(this.modalBRT, this.BRTdots, 'slides');
  }
  async ionViewWillEnter() {
    // Listen for app state changes
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        let breathingON = localStorage.getItem('breathingON');
        let firstClick = localStorage.getItem('firstClick');
        if(firstClick == "false" && breathingON == "true"){
          this.startTimerBRT();
          this.globalService.clearAllTimeouts();
        }else{
          this.globalService.clearAllTimeouts();
          this.stopTimerBRT();
        }
      }
    });
    // Refresh the content every time the page becomes active
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.BRTballText.nativeElement.textContent = "Iniciar"
    }else{
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.BRTballText.nativeElement.textContent = "Start"
    }
    this.brtResultSaved.nativeElement.style.display = 'none';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.audioService.clearAllAudioBuffers();   // 🧹 clear
    await this.audioService.preloadAll();       // 🔄 reload
    await this.audioService.initializeSong(); 
  }
  
  // Method to start the timer
  async startTimerBRT(): Promise<void> {
    try{
    let breathingON = localStorage.getItem('breathingON');
    let firstClick = localStorage.getItem('firstClick');
    if(firstClick == "true" && breathingON == "false"){
      this.BRTSettings.nativeElement.disabled = true;
      this.questionBRT.nativeElement.disabled = true;
      this.brtStop.nativeElement.disabled = true;
      this.brtStop.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.brtSave.nativeElement.disabled = true;
      this.brtSave.nativeElement.style.color = 'rgb(177, 177, 177)';
      this.brtStart.nativeElement.disabled = true;
      if(this.isPortuguese){
        this.BRTballText.nativeElement.textContent = "Inspire";
      }else{
        this.BRTballText.nativeElement.textContent = "Inhale";
      }
      await this.audioService.playBell("bell");
      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1); // Store the timeout ID
      const timeoutId2 = setTimeout(async () => {
        await this.audioService.playSound('inhale');        
        await this.audioService.playBreathSound('inhaleBreath', 3); 
        this.BRTballText.nativeElement.textContent = "3";
      }, 1000);
      this.globalService.timeouts.push(timeoutId2); // Store the timeout ID
      const timeoutId3 = setTimeout(() => {
        this.BRTballText.nativeElement.textContent = "2";
      }, 2000);
      this.globalService.timeouts.push(timeoutId3); // Store the timeout ID
      const timeoutId4 = setTimeout(() => {
        this.BRTballText.nativeElement.textContent = "1";
      }, 3000);
      this.globalService.timeouts.push(timeoutId4); // Store the timeout ID
      const timeoutId5 = setTimeout(async () => {
        if(this.isPortuguese){
          this.BRTballText.nativeElement.textContent = "Espire";
        }else{
          this.BRTballText.nativeElement.textContent = "Exhale";
        }
        await this.audioService.playSound('exhale');
        await this.audioService.playBreathSound('exhaleBreath', 3); 
      }, 4000);
      this.globalService.timeouts.push(timeoutId5); // Store the timeout ID
      const timeoutId6 = setTimeout(() => {
        this.BRTballText.nativeElement.textContent = "3";
      }, 5000);
      this.globalService.timeouts.push(timeoutId6); // Store the timeout ID
      const timeoutId7 = setTimeout(() => {
        this.BRTballText.nativeElement.textContent = "2";
      }, 6000);
      this.globalService.timeouts.push(timeoutId7); // Store the timeout ID
      const timeoutId8 = setTimeout(() => {
        this.BRTballText.nativeElement.textContent = "1";
      }, 7000);
      this.globalService.timeouts.push(timeoutId8); // Store the timeout ID
      const timeoutId9 = setTimeout(async () => {
        if(this.isPortuguese){
          this.BRTballText.nativeElement.textContent = "Segure";
        }else{
          this.BRTballText.nativeElement.textContent = "Hold";
        }
        await this.audioService.playSound('hold');
        this.brtInt = setInterval(() => this.brtDisplayTimer(), 1000);
        this.brtStart.nativeElement.disabled = false;
        localStorage.setItem('breathingON', "true"); 
        localStorage.setItem('firstClick', "false");
      }, 8000);
      this.globalService.timeouts.push(timeoutId9); // Store the timeout ID
      //pause function
    }else if(firstClick == "false" && breathingON == "true"){
      localStorage.setItem('breathingON', "false"); 
      localStorage.setItem('firstClick', "true"); 
      clearInterval(this.brtInt);
      this.BRTSettings.nativeElement.disabled = false;
      this.questionBRT.nativeElement.disabled = false;
      this.brtStop.nativeElement.disabled = false;
      this.brtStop.nativeElement.style.color = '#990000';
      this.brtSave.nativeElement.disabled = false;
      this.brtSave.nativeElement.style.color = '#49B79D';
      this.brtStart.nativeElement.disabled = true;

      // Capture the BRT result when paused
      this.brtResult = this.timerDisplayBRT.nativeElement.value;

      // Pause the selected song
      this.audioService.pauseSelectedSong();
    }
    }catch (error) {
    console.error("startTimerBRT error:", error);
    alert("Error: " + (error instanceof Error ? error.message : JSON.stringify(error)));
  }
  }
    // Method to display the timer
    brtDisplayTimer(): void {
      this.brtSeconds++;
      if (this.brtSeconds === 60) {
        this.brtSeconds = 0;
        this.brtMinutes++;
      }
      const brtM = this.brtMinutes < 10 ? '0' + this.brtMinutes : this.brtMinutes;
      const brtS = this.brtSeconds < 10 ? '0' + this.brtSeconds : this.brtSeconds;
      this.timerDisplayBRT.nativeElement.value = `${brtM} : ${brtS}`;
      this.BRTballText.nativeElement.innerText = this.timerDisplayBRT.nativeElement.value;
    }
  // Method to stop the timer
  stopTimerBRT(): void {
    clearInterval(this.brtInt);
    [this.brtSeconds, this.brtMinutes] = [0, 0];
    this.timerDisplayBRT.nativeElement.value = '00 : 00';
    this.brtStart.nativeElement.disabled = false;
    this.brtStop.nativeElement.disabled = true;
    this.brtStop.nativeElement.style.color = 'rgb(177, 177, 177)';
    this.brtSave.nativeElement.disabled = true;
    this.brtSave.nativeElement.style.color = 'rgb(177, 177, 177)';
    if (this.isPortuguese) {
      this.BRTballText.nativeElement.textContent = "Iniciar"
    }else{
      this.BRTballText.nativeElement.textContent = "Start"

    }
    this.audioService.pauseSelectedSong();
  }

  // Method to save the BRT result to local storage and reset
  saveResultBRT(): void {
    const savedResults = JSON.parse(localStorage.getItem('brtResults') || '[]'); // Retrieve existing results or initialize an empty array
    savedResults.push({ date: new Date().toISOString(), result: this.brtResult }); // Add the new result with the current date
    localStorage.setItem('brtResults', JSON.stringify(savedResults)); // Save updated results back to local storage

    // Show the saved message
    this.brtResultSaved.nativeElement.style.display = 'block';
    // Reset the timer and audio
    this.stopTimerBRT();
  }
  // Method to navigate back
  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back(); // Goes back to the previous page in the history stack
  }
  ngOnDestroy(): void {
    clearInterval(this.brtInt);
    this.audioService.pauseSelectedSong();
    // Hide the "Result Successfully Saved" message when navigating away
    this.brtResultSaved.nativeElement.style.display = 'none';
    App.removeAllListeners();
  }
  private lockUIForTour = () => {
    document.documentElement.classList.add('tour-active');
    document.body.style.overflow = 'hidden'; // stop background scroll
  };

  private unlockUIForTour = () => {
    document.documentElement.classList.remove('tour-active');
    document.body.style.overflow = '';
  };
}
