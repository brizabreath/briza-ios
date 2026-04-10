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
  selector: 'app-hatc',
  templateUrl: './hatc.page.html',
  styleUrls: ['./hatc.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class HATCPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionHATC') questionHATC!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATCball') HATCball!: ElementRef<HTMLDivElement>;
  @ViewChild('HATCballText') HATCballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('HATCtimeInput') HATCtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('HATCcountdownInput') HATCcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnHATC') startBtnHATC!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATCReset') HATCReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATCSave') HATCSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsHATC') settingsHATC!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneHATC') roundsDoneHATC!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayHATC') timerDisplayHATC!: ElementRef<HTMLDivElement>;
  @ViewChild('HATCResultSaved') HATCResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('HATCResults') HATCResults!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private holdHATC = true;
  private normalHATC = false;
  private HATCinterval: any = null;
  private HATCcurrentValue = 0;
  private HATCduration = 0;
  private HATCSeconds = 0;
  private HATCMinutes = 0;
  private roundsHATC = 0;
  private HATCTimer: any = null;
  private HATCroundsResults: any[] = [];
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    if (this.HATCtimeInput.nativeElement.options.length <= 2) {
      for (let HATCi = 2; HATCi <= 12; HATCi++) {
        const HATCoption = document.createElement('option');
        HATCoption.value = HATCi.toString();
        HATCoption.textContent = this.isPortuguese ? `${HATCi} rodadas` : `${HATCi} rounds`;
        this.HATCtimeInput.nativeElement.appendChild(HATCoption);
      }
    }

    this.startBtnHATC.nativeElement.onclick = () => this.startHATC();
    this.HATCReset.nativeElement.onclick = () => this.stopHATC();
    this.HATCSave.nativeElement.onclick = () => this.saveHATC();

    this.HATCReset.nativeElement.disabled = true;
    this.HATCReset.nativeElement.style.display = 'none';
    this.HATCSave.nativeElement.disabled = true;
    this.HATCSave.nativeElement.style.display = 'none';

    this.HATCtimeInput.nativeElement.onchange = () => this.setHATCduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');

    this.globalService.changeBall(1.3, 1, this.HATCball);
  }

  setHATCduration(): void {
    const selectedValue = this.HATCtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.HATCduration = Infinity;
    } else {
      this.HATCduration = parseInt(selectedValue, 10);
    }
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
          await this.startHATC();
        }
      }
    });

    this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setHATCduration();
    this.HATCResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
    this.holdHATC = true;
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('hatc_guide_seen')) {
      localStorage.setItem('hatc_guide_seen', 'true');
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
      scrollTo: true,
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
        id: 'hatc-intro',
        text: `<h3>${t('Altitude Training - Running', 'Treino em Altitude - Correndo')}</h3>
               <p>${t(
                 'This is a more challenging version of the Altitude Training. Breathe normally for about 1 minute while running or cycling before you begin.',
                 'Esta é uma versão mais desafiadora do Treino em Altitude. Respire normalmente por cerca de 1 minuto enquanto corre ou anda de bicicleta antes de começar.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Rounds selector
      steps.push({
        id: 'hatc-rounds-box',
        text: `<h3>${t('Choose number of rounds', 'Escolha o número de rodadas')}</h3>
               <p>${t(
                 'Select how many rounds you want to complete. You can set it to infinite and stop whenever you feel ready, or pick a fixed number to stay on track.',
                 'Escolha quantas rodadas deseja completar. Você pode deixar no infinito e parar quando quiser, ou escolher um número fixo para manter o foco.'
               )}</p>`,
        attachTo: { element: '#hatc-rounds-box', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Start circle
      steps.push({
        id: 'hatc-start-ball',
        text: `<h3>${t('Start the exercise', 'Inicie o exercício')}</h3>
               <p>${t(
                 'Press the circle when ready. Exhale, pinch your nose, hold your breath and keep running. The timer counts how long you hold. Once you feel a strong air hunger and can no longer hold, press the circle again.',
                 'Pressione o círculo quando estiver pronto. Expire, aperte o nariz, segure a respiração e continue correndo. O cronômetro conta quanto tempo você aguenta. Quando sentir uma forte necessidade de ar, pressione o círculo novamente.'
               )}</p>`,
        attachTo: { element: '#hatc-start-ball', on: 'top' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Hold phase
      steps.push({
        id: 'hatc-hold-item',
        text: `<h3>${t('Hold', 'Segure')}</h3>
               <p>${t(
                 'Hold your breath for as long as you can while keeping your running pace. Avoid pushing yourself to the point of dizziness or struggling to recover gently — that means you held for too long.',
                 'Segure a respiração o máximo que conseguir mantendo o ritmo da corrida. Evite forçar a ponto de sentir tontura ou dificuldade em recuperar a respiração de forma suave — isso significa que segurou por tempo demais.'
               )}</p>`,
        attachTo: { element: '#hatc-hold-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Normal breathing phase
      steps.push({
        id: 'hatc-normal-item',
        text: `<h3>${t('Normal breathing — 60 seconds', 'Respiração normal — 60 segundos')}</h3>
               <p>${t(
                 'Keep running and breathe normally for 60 seconds to fully recover. After that, get ready for a new round. ',
                 'Continue correndo e respire normalmente por 60 segundos para se recuperar completamente. Depois disso, prepare-se para uma nova rodada.'
               )}</p>`,
        attachTo: { element: '#hatc-normal-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Pause & save (centered)
      steps.push({
        id: 'hatc-extra-info',
        text: `<h3>${t('Pause & save', 'Pausar e salvar')}</h3>
               <p>${t(
                 'You can press the circle during the normal breathing phase to pause the session. Remember to save your results at the end to track your hold times and progress over time.',
                 'Você pode pressionar o círculo durante a fase de respiração normal para pausar a sessão. Lembre-se de salvar seus resultados ao final para acompanhar seus tempos de retenção e evolução.'
               )}</p>`,
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
    }, 0);
  }

  async startHATC(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsHATC.nativeElement.disabled = true;
    this.questionHATC.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnHATC.nativeElement.disabled = true;
      this.HATCcountdownInput.nativeElement.style.display = 'inline';
      this.HATCtimeInput.nativeElement.style.display = 'none';
      this.startCountdownHATC();
      this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(async () => {
        this.audioService.playSelectedSong();
        await this.audioService.playSound('inhale');
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(async () => {
        this.HATCballText.nativeElement.textContent = '1';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.HATCballText.nativeElement.textContent = '2';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(() => {
        this.HATCballText.nativeElement.textContent = '3';
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);
      const timeoutId7 = setTimeout(async () => {
        await this.audioService.playSound('exhale');
        this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      }, 4000);
      this.globalService.timeouts.push(timeoutId7);

      const timeoutId8 = setTimeout(() => {
        this.HATCballText.nativeElement.textContent = '3';
      }, 5000);
      this.globalService.timeouts.push(timeoutId8);

      const timeoutId9 = setTimeout(() => {
        this.HATCballText.nativeElement.textContent = '2';
      }, 6000);
      this.globalService.timeouts.push(timeoutId9);

      const timeoutId10 = setTimeout(() => {
        this.HATCballText.nativeElement.textContent = '1';
      }, 7000);
      this.globalService.timeouts.push(timeoutId10);

      const timeoutId5 = setTimeout(async () => {
        this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Segure e corra' : 'Hold and run';
        await this.audioService.playSound('pinchRun');
        this.HATCinterval = setInterval(() => this.startTimerHATC(), 1000);
        this.HATCTimer = setInterval(() => this.DisplayTimerHATC(), 1000);
      }, 8000);
      this.globalService.timeouts.push(timeoutId5);

      const timeoutId6 = setTimeout(() => {
        this.startBtnHATC.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
        this.holdHATC = true;
      }, 9000);
      this.globalService.timeouts.push(timeoutId6);


    } else if (firstClick === 'false' && breathingON === 'true') {
      if (!this.holdHATC) {
        this.clearIntervalsHATC();
        localStorage.setItem('breathingON', 'false');
        this.HATCReset.nativeElement.disabled = false;
        this.HATCReset.nativeElement.style.display = 'inline-flex';

        if (this.roundsHATC > 0) {
          this.HATCSave.nativeElement.disabled = false;
          this.HATCSave.nativeElement.style.display = 'inline-flex';
        }

        this.settingsHATC.nativeElement.disabled = false;
        this.questionHATC.nativeElement.disabled = false;
        this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
        this.audioService.pauseSelectedSong();
      } else {
        await this.pauseHATC();
      }

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.normalHATC) {
        this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Normal' : 'Normal Breathing';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.HATCReset.nativeElement.disabled = true;
      this.HATCReset.nativeElement.style.display = 'none';
      this.HATCSave.nativeElement.disabled = true;
      this.HATCSave.nativeElement.style.display = 'none';
      this.HATCinterval = setInterval(() => this.startTimerHATC(), 1000);
      this.HATCTimer = setInterval(() => this.DisplayTimerHATC(), 1000);
    }
  }

  startCountdownHATC(): void {
    if (this.HATCduration !== Infinity) {
      if (this.HATCduration <= 1) {
        this.HATCcountdownInput.nativeElement.value = this.isPortuguese ? 'Rodada final' : 'Final round';
      } else {
        this.HATCcountdownInput.nativeElement.value = this.isPortuguese
          ? `${this.HATCduration} rodadas restantes`
          : `${this.HATCduration} rounds left`;
      }
    } else {
      this.HATCcountdownInput.nativeElement.value = '∞';
      this.HATCcountdownInput.nativeElement.style.display = 'inline';
      this.HATCtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerHATC(): Promise<void> {
    if (this.normalHATC) {
      this.HATCcurrentValue--;
      this.HATCballText.nativeElement.textContent = this.isPortuguese
        ? `${this.HATCcurrentValue} segundos`
        : `${this.HATCcurrentValue} seconds`;
    }

    if (this.holdHATC) {
      this.HATCcurrentValue++;
      this.HATCballText.nativeElement.textContent = this.isPortuguese
        ? `${this.HATCcurrentValue} segundos`
        : `${this.HATCcurrentValue} seconds`;
    }

    if (this.normalHATC && this.HATCcurrentValue === 1) {
      if (this.HATCduration !== 0) {
        this.normalHATC = false;
        this.startBtnHATC.nativeElement.disabled = true;
        this.HATCcurrentValue = 0;
        this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        const timeoutId = setTimeout(() => {
          this.HATCballText.nativeElement.textContent = '1';
          }, 1000);
        this.globalService.timeouts.push(timeoutId);
         const timeoutId1 = setTimeout(() => {
          this.HATCballText.nativeElement.textContent = '2';
          }, 2000);
        this.globalService.timeouts.push(timeoutId1);
        const timeoutId3 = setTimeout(() => {
          this.HATCballText.nativeElement.textContent = '3';
          }, 3000);
        this.globalService.timeouts.push(timeoutId3);
         const timeoutId4 = setTimeout(async () => {
              await this.audioService.playSound('exhale');
        this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
          }, 4000);
        this.globalService.timeouts.push(timeoutId4);
        const timeoutId5 = setTimeout(() => {
          this.HATCballText.nativeElement.textContent = '3';
          }, 5000);
        this.globalService.timeouts.push(timeoutId5);
         const timeoutId6 = setTimeout(() => {
          this.HATCballText.nativeElement.textContent = '2';
          }, 6000);
        this.globalService.timeouts.push(timeoutId6);
        const timeoutId7 = setTimeout(() => {
          this.HATCballText.nativeElement.textContent = '1';
          }, 7000);
        this.globalService.timeouts.push(timeoutId7);
         const timeoutId8 = setTimeout(async () => {
          this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Segure e corra' : 'Hold and run';
          await this.audioService.playSound('pinchRun');
          setTimeout(async () => {
            this.startBtnHATC.nativeElement.disabled = false;
            this.holdHATC = true;
            }, 1000);
          }, 8000);
        this.globalService.timeouts.push(timeoutId8);
      } else {
        this.clearIntervalsHATC();
        localStorage.setItem('breathingON', 'false');
        this.startBtnHATC.nativeElement.disabled = true;
        this.settingsHATC.nativeElement.disabled = false;
        this.questionHATC.nativeElement.disabled = false;
        this.HATCReset.nativeElement.disabled = false;
        this.HATCReset.nativeElement.style.display = 'inline-flex';
        this.HATCSave.nativeElement.disabled = false;
        this.HATCSave.nativeElement.style.display = 'inline-flex';
        this.HATCcountdownInput.nativeElement.style.display = 'none';
        this.HATCtimeInput.nativeElement.style.display = 'inline';
        this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Normal' : 'Normal Breathing';
        this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
      }
    }
  }

  DisplayTimerHATC(): void {
    this.HATCSeconds++;
    if (this.HATCSeconds === 60) {
      this.HATCSeconds = 0;
      this.HATCMinutes++;
    }
    const M = this.HATCMinutes < 10 ? '0' + this.HATCMinutes : this.HATCMinutes;
    const S = this.HATCSeconds < 10 ? '0' + this.HATCSeconds : this.HATCSeconds;
    this.timerDisplayHATC.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopHATC(): void {
    this.clearIntervalsHATC();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.HATCcountdownInput.nativeElement.style.display = 'none';
    this.HATCtimeInput.nativeElement.style.display = 'inline';
    this.HATCcurrentValue = 0;
    this.startBtnHATC.nativeElement.disabled = false;
    this.HATCReset.nativeElement.disabled = true;
    this.HATCReset.nativeElement.style.display = 'none';
    this.HATCSave.nativeElement.disabled = true;
    this.HATCSave.nativeElement.style.display = 'none';
    this.holdHATC = true;
    this.normalHATC = false;
    this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsHATC = 0;
    this.roundsDoneHATC.nativeElement.innerHTML = '0';
    this.timerDisplayHATC.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setHATCduration();
    this.HATCSeconds = 0;
    this.HATCMinutes = 0;
    this.roundsHATC = 0;
    this.HATCResults.nativeElement.innerHTML = '';
  }

  async pauseHATC(): Promise<void> {
    this.clearIntervalsHATC();
    this.holdHATC = false;
    this.normalHATC = true;
    this.HATCballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Normal' : 'Normal Breathing';
    await this.audioService.playSound('normalbreath');

    this.roundsHATC++;
    this.roundsDoneHATC.nativeElement.innerHTML = this.roundsHATC.toString();
    this.HATCduration = this.HATCduration - 1;

    if (this.HATCduration !== Infinity) {
      if (this.HATCduration <= 1) {
        this.HATCcountdownInput.nativeElement.value = this.isPortuguese ? 'Rodada final' : 'Final round';
      } else {
        this.HATCcountdownInput.nativeElement.value = this.isPortuguese
          ? `${this.HATCduration} rodadas restantes`
          : `${this.HATCduration} rounds left`;
      }
    } else {
      this.HATCcountdownInput.nativeElement.value = '∞';
    }

    if (this.isPortuguese) {
      this.HATCResults.nativeElement.innerHTML += `<div class='NOfSteps'><div>Round ${this.roundsHATC}</div><div>${this.HATCcurrentValue} segundos</div></div>`;
    } else {
      this.HATCResults.nativeElement.innerHTML += `<div class='NOfSteps'><div>Round ${this.roundsHATC}</div><div>${this.HATCcurrentValue} seconds</div></div>`;
    }

    this.HATCroundsResults.push(this.HATCcurrentValue);
    this.HATCcurrentValue = 61;
    this.HATCinterval = setInterval(() => this.startTimerHATC(), 1000);
    this.HATCTimer = setInterval(() => this.DisplayTimerHATC(), 1000);
  }

  saveHATC(): void {
    const savedResults = JSON.parse(localStorage.getItem('HATCResults') || '[]');
    savedResults.push({
      date: new Date().toISOString(),
      roundsResult: this.HATCroundsResults,
      result: this.timerDisplayHATC.nativeElement.innerHTML,
      rounds: this.roundsHATC
    });
    localStorage.setItem('HATCResults', JSON.stringify(savedResults));
    this.HATCResultSaved.nativeElement.style.display = 'block';
    this.stopHATC();
    this.HATCroundsResults = [];
  }

  clearIntervalsHATC(): void {
    clearInterval(this.HATCinterval);
    clearInterval(this.HATCTimer);
    this.HATCinterval = null;
    this.HATCTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopHATC();
    if (this.HATCResultSaved?.nativeElement) {
      this.HATCResultSaved.nativeElement.style.display = 'none';
    }
  }
}