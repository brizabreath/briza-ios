import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AudioService } from '../services/audio.service'; 
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { ShepherdService } from 'angular-shepherd';

@Component({
  selector: 'app-ahat',
  templateUrl: './ahat.page.html',
  styleUrls: ['./ahat.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class AHATPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionAHAT') questionAHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('AHATball') AHATball!: ElementRef<HTMLDivElement>;
  @ViewChild('AHATballText') AHATballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('AHATtimeInput') AHATtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('AHATcountdownInput') AHATcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnAHAT') startBtnAHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('AHATReset') AHATReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('AHATSave') AHATSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsAHAT') settingsAHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneAHAT') roundsDoneAHAT!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayAHAT') timerDisplayAHAT!: ElementRef<HTMLDivElement>;
  @ViewChild('AHATResultSaved') AHATResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('AHATResults') AHATResults!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';

  private holdAHAT = true;
  private lightAHAT = false;
  private normalAHAT = false;

  private AHATinterval: any = null;
  private AHATcurrentValue = 0;
  private AHATduration = 0;
  private AHATSeconds = 0;
  private AHATMinutes = 0;
  private roundsAHAT = 0;
  private AHATTimer: any = null;
  private AHATroundsResults: number[] = [];

  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    if (this.AHATtimeInput.nativeElement.options.length <= 2) {
      for (let AHATi = 2; AHATi <= 12; AHATi++) {
        const AHAToption = document.createElement('option');
        AHAToption.value = AHATi.toString();
        AHAToption.textContent = this.isPortuguese ? `${AHATi} rodadas` : `${AHATi} rounds`;
        this.AHATtimeInput.nativeElement.appendChild(AHAToption);
      }
    }

    this.startBtnAHAT.nativeElement.onclick = () => this.startAHAT();
    this.AHATReset.nativeElement.onclick = () => this.stopAHAT();
    this.AHATSave.nativeElement.onclick = () => this.saveAHAT();
    this.AHATtimeInput.nativeElement.onchange = () => this.setAHATduration();

    this.AHATReset.nativeElement.disabled = true;
    this.AHATReset.nativeElement.style.display = 'none';
    this.AHATSave.nativeElement.disabled = true;
    this.AHATSave.nativeElement.style.display = 'none';

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');

    this.globalService.changeBall(1.3, 1, this.AHATball);
    this.holdAHAT = true;
  }

  async ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    await this.appStateHandle?.remove();
    this.appStateHandle = undefined;

    this.appStateHandle = await App.addListener('appStateChange', async (state) => {
      if (!state.isActive) {
        const breathingON = localStorage.getItem('breathingON');
        const firstClick = localStorage.getItem('firstClick');

        if (firstClick === 'false' && breathingON === 'true') {
          this.globalService.clearAllTimeouts();
          await this.startAHAT();
        }
      }
    });

    this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setAHATduration();
    this.AHATResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('ahat_guide_seen')) {
      localStorage.setItem('ahat_guide_seen', 'true');
      this.startGuide();
    }
  }

  async ionViewWillLeave() {
    await this.appStateHandle?.remove();
    this.appStateHandle = undefined;
    this.shepherd.cancel();
  }

  private lockUIForTour = () => {
    document.documentElement.classList.add('tour-active');
    document.body.style.overflow = 'hidden';
  };

  private unlockUIForTour = () => {
    document.documentElement.classList.remove('tour-active');
    document.body.style.overflow = '';
  };

  startGuide() {
    const isPT = localStorage.getItem('isPortuguese') === 'true';
    const t = (en: string, pt: string) => (isPT ? pt : en);

    this.shepherd.cancel();

    this.shepherd.defaultStepOptions = {
      cancelIcon: { enabled: true },
      canClickTarget: false,
      modalOverlayOpeningPadding: 4,
      modalOverlayOpeningRadius: 10,
      classes: 'briza-tour',
    };
    this.shepherd.modal = true;

    setTimeout(() => {
      const steps: any[] = [];

      // 1 - Intro (centered)
      steps.push({
        id: 'ahat-intro',
        text: `<h3>${t('Altitude Training', 'Treino em Altitude')}</h3>
               <p>${t(
                 'Bring your altitude training to another level. This technique simulates the effects of high-altitude training by combining breath holds with physical exercise like running or cycling.',
                 'Eleve seu treino em altitude para outro nível. Esta técnica simula os efeitos do treino em grande altitude combinando retenção de respiração com exercício físico como corrida ou ciclismo.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Preparation (centered)
      steps.push({
        id: 'ahat-prep',
        text: `<h3>${t('Before you start', 'Antes de começar')}</h3>
               <p>${t(
                 'Breathe normally for about 1 minute while running or cycling to settle into your rhythm before attempting any breath holds.',
                 'Respire normalmente por cerca de 1 minuto enquanto corre ou anda de bicicleta para encontrar seu ritmo antes de tentar qualquer retenção de respiração.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Hold phase
      steps.push({
        id: 'ahat-hold-item',
        text: `<h3>${t('Hold', 'Segure')}</h3>
               <p>${t(
                 'Hold your breath for as long as you can while keeping your pace. Avoid pushing yourself to the point of dizziness or struggling to recover your breath gently — that means you held for too long.',
                 'Segure a respiração o máximo que conseguir mantendo o ritmo. Evite forçar a ponto de sentir tontura ou dificuldade em recuperar a respiração de forma suave — isso significa que segurou por tempo demais.'
               )}</p>`,
        attachTo: { element: '#ahat-hold-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Light breathing phase
      steps.push({
        id: 'ahat-light-item',
        text: `<h3>${t('Light breathing — 15 seconds', 'Respiração leve — 15 segundos')}</h3>
               <p>${t(
                 'Do not stop running. Inhale and try to breathe as lightly as possible for 15 seconds. If you cannot breathe light after releasing, it means you held your breath for too long — reduce the hold next round.',
                 'Não pare de correr. Inspire e tente respirar o mais levemente possível por 15 segundos. Se não conseguir respirar levemente após soltar, significa que segurou por tempo demais — reduza a retenção na próxima rodada.'
               )}</p>`,
        attachTo: { element: '#ahat-light-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Normal breathing phase
      steps.push({
        id: 'ahat-normal-item',
        text: `<h3>${t('Normal breathing — 30 seconds', 'Respiração normal — 30 segundos')}</h3>
               <p>${t(
                 'Keep running and breathe normally for 30 seconds to fully recover. After this recovery period, a new round will start automatically.',
                 'Continue correndo e respire normalmente por 30 segundos para se recuperar completamente. Após esse período de recuperação, uma nova rodada começará automaticamente.'
               )}</p>`,
        attachTo: { element: '#ahat-normal-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });
       // 6 - Choose rounds
      steps.push({
        id: 'ahat-rounds-box',
        text: `<h3>${t('Choose number of rounds', 'Escolha o número de rodadas')}</h3>
               <p>${t(
                 'Select how many rounds you want to complete. You can set it to infinite and stop whenever you feel ready, or pick a fixed number to stay on track.',
                 'Escolha quantas rodadas deseja completar. Você pode deixar no infinito e parar quando quiser, ou escolher um número fixo para manter o foco.'
               )}</p>`,
        attachTo: { element: '#ahat-rounds-box', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });
      // 7 - Start ball
      steps.push({
        id: 'ahat-start-ball',
        text: `<h3>${t('Start the exercise', 'Inicie o exercício')}</h3>
               <p>${t(
                 'Whenever you are ready, press the circle. Exhale, pinch your nose, hold your breath and keep running. Once you feel a strong air hunger and can no longer hold, press the circle again to move to the recovery phases.',
                 'Quando estiver pronto, pressione o círculo. Expire, aperte o nariz, segure a respiração e continue correndo. Quando sentir uma forte necessidade de ar, pressione o círculo novamente para passar às fases de recuperação.'
               )}</p>`,
        attachTo: { element: '#ahat-start-ball', on: 'top' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Pause & save (centered)
      steps.push({
        id: 'ahat-extra-info',
        text: `<h3>${t('Pause & save', 'Pausar e salvar')}</h3>
               <p>${t(
                 'You can press the circle at any time during a hold to pause the exercise. Your individual round times are shown below the circle. Remember to save your results at the end so you can track your progress over time.',
                 'Você pode pressionar o círculo a qualquer momento durante a retenção para pausar o exercício. Os tempos individuais de cada rodada aparecem abaixo do círculo. Lembre-se de salvar seus resultados ao final para acompanhar sua evolução.'
               )}</p>`,
        attachTo: { element: '#ahat-start-ball', on: 'top' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Finish', 'Fechar'), action: () => this.shepherd.complete() }
        ]
      });

      this.shepherd.addSteps(steps);

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
    }, 300);
  }

  setAHATduration(): void {
    const selectedValue = this.AHATtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.AHATduration = Infinity;
    } else {
      this.AHATduration = parseInt(selectedValue, 10);
    }
  }

  async startAHAT(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsAHAT.nativeElement.disabled = true;
    this.questionAHAT.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnAHAT.nativeElement.disabled = true;
      this.AHATcountdownInput.nativeElement.style.display = 'inline';
      this.AHATtimeInput.nativeElement.style.display = 'none';
      this.startCountdownAHAT();
      this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(async () => {
        this.audioService.playSelectedSong();
        await this.audioService.playSound('inhale');
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(async () => {
        this.AHATballText.nativeElement.textContent = '1';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.AHATballText.nativeElement.textContent = '2';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(() => {
        this.AHATballText.nativeElement.textContent = '3';
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);
      const timeoutId7 = setTimeout(async () => {
        await this.audioService.playSound('exhale');
        this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      }, 4000);
      this.globalService.timeouts.push(timeoutId7);

      const timeoutId8 = setTimeout(() => {
        this.AHATballText.nativeElement.textContent = '3';
      }, 5000);
      this.globalService.timeouts.push(timeoutId8);

      const timeoutId9 = setTimeout(() => {
        this.AHATballText.nativeElement.textContent = '2';
      }, 6000);
      this.globalService.timeouts.push(timeoutId9);

      const timeoutId10 = setTimeout(() => {
        this.AHATballText.nativeElement.textContent = '1';
      }, 7000);
      this.globalService.timeouts.push(timeoutId10);

      const timeoutId5 = setTimeout(async () => {
        this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Segure e corra' : 'Hold and run';
          await this.audioService.playSound('pinchRun');

        this.AHATinterval = setInterval(() => this.startTimerAHAT(), 1000);
        this.AHATTimer = setInterval(() => this.DisplayTimerAHAT(), 1000);
      }, 8000);
      this.globalService.timeouts.push(timeoutId5);

      const timeoutId6 = setTimeout(() => {
        this.startBtnAHAT.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
        this.holdAHAT = true;
      }, 9000);
      this.globalService.timeouts.push(timeoutId6);

    } else if (firstClick === 'false' && breathingON === 'true') {
      if (!this.holdAHAT) {
        this.clearIntervalsAHAT();
        localStorage.setItem('breathingON', 'false');
        this.AHATReset.nativeElement.disabled = false;
        this.AHATReset.nativeElement.style.display = 'inline-flex';

        if (this.roundsAHAT > 0) {
          this.AHATSave.nativeElement.disabled = false;
          this.AHATSave.nativeElement.style.display = 'inline-flex';
        }

        this.settingsAHAT.nativeElement.disabled = false;
        this.questionAHAT.nativeElement.disabled = false;
        this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
        this.audioService.pauseSelectedSong();
      } else {
        await this.pauseAHAT();
      }

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.normalAHAT) this.AHATballText.nativeElement.textContent = 'Respiração Normal';
        else if (this.lightAHAT) this.AHATballText.nativeElement.textContent = 'Respiração Leve';
      } else {
        if (this.normalAHAT) this.AHATballText.nativeElement.textContent = 'Normal Breathing';
        else if (this.lightAHAT) this.AHATballText.nativeElement.textContent = 'Light Breathing';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.AHATReset.nativeElement.disabled = true;
      this.AHATReset.nativeElement.style.display = 'none';
      this.AHATSave.nativeElement.disabled = true;
      this.AHATSave.nativeElement.style.display = 'none';
      this.AHATinterval = setInterval(() => this.startTimerAHAT(), 1000);
      this.AHATTimer = setInterval(() => this.DisplayTimerAHAT(), 1000);
    }
  }

  startCountdownAHAT(): void {
    if (this.AHATduration !== Infinity) {
      if (this.AHATduration <= 1) {
        this.AHATcountdownInput.nativeElement.value = this.isPortuguese ? 'Rodada final' : 'Final round';
      } else {
        this.AHATcountdownInput.nativeElement.value = this.isPortuguese
          ? `${this.AHATduration} rodadas restantes`
          : `${this.AHATduration} rounds left`;
      }
    } else {
      this.AHATcountdownInput.nativeElement.value = '∞';
      this.AHATcountdownInput.nativeElement.style.display = 'inline';
      this.AHATtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerAHAT(): Promise<void> {
    if (this.normalAHAT || this.lightAHAT) {
      this.AHATcurrentValue--;
      this.AHATballText.nativeElement.textContent = this.isPortuguese
        ? `${this.AHATcurrentValue} segundos`
        : `${this.AHATcurrentValue} seconds`;
    }

    if (this.holdAHAT) {
      this.AHATcurrentValue++;
      this.AHATballText.nativeElement.textContent = this.isPortuguese
        ? `${this.AHATcurrentValue} segundos`
        : `${this.AHATcurrentValue} seconds`;
    }

    if (this.lightAHAT && this.AHATcurrentValue === 1) {
      this.AHATcurrentValue = 31;
      this.lightAHAT = false;
      this.normalAHAT = true;
      this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Normal' : 'Normal Breathing';
      await this.audioService.playSound('normalbreath');
    } else if (this.normalAHAT && this.AHATcurrentValue === 1) {
      if (this.AHATduration !== 0) {
        this.normalAHAT = false;
        this.startBtnAHAT.nativeElement.disabled = true;
        this.AHATcurrentValue = 0;
        this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        const timeoutId = setTimeout(() => {
          this.AHATballText.nativeElement.textContent = '1';
          }, 1000);
        this.globalService.timeouts.push(timeoutId);
         const timeoutId1 = setTimeout(() => {
          this.AHATballText.nativeElement.textContent = '2';
          }, 2000);
        this.globalService.timeouts.push(timeoutId1);
        const timeoutId3 = setTimeout(() => {
          this.AHATballText.nativeElement.textContent = '3';
          }, 3000);
        this.globalService.timeouts.push(timeoutId3);
         const timeoutId4 = setTimeout(async () => {
              await this.audioService.playSound('exhale');
        this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
          }, 4000);
        this.globalService.timeouts.push(timeoutId4);
        const timeoutId5 = setTimeout(() => {
          this.AHATballText.nativeElement.textContent = '3';
          }, 5000);
        this.globalService.timeouts.push(timeoutId5);
         const timeoutId6 = setTimeout(() => {
          this.AHATballText.nativeElement.textContent = '2';
          }, 6000);
        this.globalService.timeouts.push(timeoutId6);
        const timeoutId7 = setTimeout(() => {
          this.AHATballText.nativeElement.textContent = '1';
          }, 7000);
        this.globalService.timeouts.push(timeoutId7);
         const timeoutId8 = setTimeout(async () => {
          this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Segure e corra' : 'Hold and run';
          await this.audioService.playSound('pinchRun');
          setTimeout(async () => {
            this.startBtnAHAT.nativeElement.disabled = false;
            this.holdAHAT = true;            
            }, 1000);
          }, 8000);
        this.globalService.timeouts.push(timeoutId8);
      } else { 
        this.clearIntervalsAHAT();
        localStorage.setItem('breathingON', 'false');
        this.startBtnAHAT.nativeElement.disabled = true;
        this.settingsAHAT.nativeElement.disabled = false;
        this.questionAHAT.nativeElement.disabled = false;
        this.AHATReset.nativeElement.disabled = false;
        this.AHATReset.nativeElement.style.display = 'inline-flex';
        this.AHATSave.nativeElement.disabled = false;
        this.AHATSave.nativeElement.style.display = 'inline-flex';
        this.AHATcountdownInput.nativeElement.style.display = 'none';
        this.AHATtimeInput.nativeElement.style.display = 'inline';
        this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Normal' : 'Normal Breathing';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
      }
    }
  }

  DisplayTimerAHAT(): void {
    this.AHATSeconds++;
    if (this.AHATSeconds === 60) {
      this.AHATSeconds = 0;
      this.AHATMinutes++;
    }

    const M = this.AHATMinutes < 10 ? '0' + this.AHATMinutes : this.AHATMinutes;
    const S = this.AHATSeconds < 10 ? '0' + this.AHATSeconds : this.AHATSeconds;
    this.timerDisplayAHAT.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopAHAT(): void {
    this.clearIntervalsAHAT();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.AHATcountdownInput.nativeElement.style.display = 'none';
    this.AHATtimeInput.nativeElement.style.display = 'inline';
    this.AHATcurrentValue = 0;
    this.startBtnAHAT.nativeElement.disabled = false;
    this.AHATReset.nativeElement.disabled = true;
    this.AHATReset.nativeElement.style.display = 'none';
    this.AHATSave.nativeElement.disabled = true;
    this.AHATSave.nativeElement.style.display = 'none';
    this.holdAHAT = true;
    this.normalAHAT = false;
    this.lightAHAT = false;
    this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsAHAT = 0;
    this.roundsDoneAHAT.nativeElement.innerHTML = '0';
    this.timerDisplayAHAT.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setAHATduration();
    this.AHATSeconds = 0;
    this.AHATMinutes = 0;
    this.roundsAHAT = 0;
    this.AHATResults.nativeElement.innerHTML = '';
  }

  async pauseAHAT(): Promise<void> {
    this.clearIntervalsAHAT();
    this.holdAHAT = false;
    this.normalAHAT = false;
    this.lightAHAT = true;
    this.AHATballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Leve' : 'Light Breathing';
    await this.audioService.playSound('lightNasal');

    this.roundsAHAT++;
    this.roundsDoneAHAT.nativeElement.innerHTML = this.roundsAHAT.toString();
    this.AHATduration = this.AHATduration - 1;

    if (this.AHATduration !== Infinity) {
      if (this.AHATduration <= 1) {
        this.AHATcountdownInput.nativeElement.value = this.isPortuguese ? 'Rodada final' : 'Final round';
      } else {
        this.AHATcountdownInput.nativeElement.value = this.isPortuguese
          ? `${this.AHATduration} rodadas restantes`
          : `${this.AHATduration} rounds left`;
      }
    } else {
      this.AHATcountdownInput.nativeElement.value = '∞';
    }

    if (this.isPortuguese) {
      this.AHATResults.nativeElement.innerHTML += `<div class='NOfSteps'><div>Round ${this.roundsAHAT}</div><div>${this.AHATcurrentValue} segundos</div></div>`;
    } else {
      this.AHATResults.nativeElement.innerHTML += `<div class='NOfSteps'><div>Round ${this.roundsAHAT}</div><div>${this.AHATcurrentValue} seconds</div></div>`;
    }

    this.AHATroundsResults.push(this.AHATcurrentValue);
    this.AHATcurrentValue = 16;
    this.AHATinterval = setInterval(() => this.startTimerAHAT(), 1000);
    this.AHATTimer = setInterval(() => this.DisplayTimerAHAT(), 1000);
  }

  saveAHAT(): void {
    const savedResults = JSON.parse(localStorage.getItem('AHATResults') || '[]');
    savedResults.push({
      date: new Date().toISOString(),
      result: this.timerDisplayAHAT.nativeElement.innerHTML,
      roundsResult: this.AHATroundsResults,
      rounds: this.roundsAHAT
    });
    localStorage.setItem('AHATResults', JSON.stringify(savedResults));

    this.AHATResultSaved.nativeElement.style.display = 'block';
    this.stopAHAT();
    this.AHATroundsResults = [];
  }

  clearIntervalsAHAT(): void {
    clearInterval(this.AHATinterval);
    clearInterval(this.AHATTimer);
    this.AHATinterval = null;
    this.AHATTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopAHAT();
    if (this.AHATResultSaved?.nativeElement) {
      this.AHATResultSaved.nativeElement.style.display = 'none';
    }
  }
}