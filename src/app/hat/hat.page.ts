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
  selector: 'app-hat',
  templateUrl: './hat.page.html',
  styleUrls: ['./hat.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class HATPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionHAT') questionHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATball') HATball!: ElementRef<HTMLDivElement>;
  @ViewChild('HATballText') HATballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('HATtimeInput') HATtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('HATcountdownInput') HATcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnHAT') startBtnHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATReset') HATReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('HATSave') HATSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsHAT') settingsHAT!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneHAT') roundsDoneHAT!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayHAT') timerDisplayHAT!: ElementRef<HTMLDivElement>;
  @ViewChild('HATResultSaved') HATResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('HATResults') HATResults!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private holdHAT = true;
  private lightHAT = false;
  private normalHAT = false;
  private HATinterval: any = null;
  private HATcurrentValue = 0;
  private HATduration = 0;
  private HATSeconds = 0;
  private HATMinutes = 0;
  private roundsHAT = 0;
  private HATTimer: any = null;
  private HATroundsResults: any[] = [];
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    if (this.HATtimeInput.nativeElement.options.length <= 2) {
      for (let HATi = 2; HATi <= 12; HATi++) {
        const HAToption = document.createElement('option');
        HAToption.value = HATi.toString();
        HAToption.textContent = this.isPortuguese ? `${HATi} rodadas` : `${HATi} rounds`;
        this.HATtimeInput.nativeElement.appendChild(HAToption);
      }
    }

    this.startBtnHAT.nativeElement.onclick = () => this.startHAT();
    this.HATReset.nativeElement.onclick = () => this.stopHAT();
    this.HATSave.nativeElement.onclick = () => this.saveHAT();

    this.HATReset.nativeElement.disabled = true;
    this.HATReset.nativeElement.style.display = 'none';
    this.HATSave.nativeElement.disabled = true;
    this.HATSave.nativeElement.style.display = 'none';

    this.HATtimeInput.nativeElement.onchange = () => this.setHATduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');

    this.globalService.changeBall(1.3, 1, this.HATball);
  }

  setHATduration(): void {
    const selectedValue = this.HATtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.HATduration = Infinity;
    } else {
      this.HATduration = parseInt(selectedValue, 10);
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
          await this.startHAT();
        }
      }
    });

    this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setHATduration();
    this.HATResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
    this.holdHAT = true;
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('hat_guide_seen')) {
      localStorage.setItem('hat_guide_seen', 'true');
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
        id: 'hat-intro',
        text: `<h3>${t('Altitude Training', 'Treino em Altitude')}</h3>
               <p>${t(
                 'This technique simulates altitude training by combining breath holds with walking. Altitude environments improve cardiovascular fitness, strengthen muscles, stimulate red blood cell production, and support immune function. Breathe normally for about 1 minute while walking before you begin.',
                 'Esta técnica simula o treino em altitude combinando retenções de respiração com caminhada. Ambientes de altitude melhoram o condicionamento cardiovascular, fortalecem os músculos, estimulam a produção de glóbulos vermelhos e apoiam a função imunológica. Respire normalmente por cerca de 1 minuto enquanto caminha antes de começar.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Rounds selector
      steps.push({
        id: 'hat-rounds-box',
        text: `<h3>${t('Choose number of rounds', 'Escolha o número de rodadas')}</h3>
               <p>${t(
                 'Select how many rounds you want to complete. You can set it to infinite and stop whenever you feel ready, or pick a fixed number to stay on track.',
                 'Escolha quantas rodadas deseja completar. Você pode deixar no infinito e parar quando quiser, ou escolher um número fixo para manter o foco.'
               )}</p>`,
        attachTo: { element: '#hat-rounds-box', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Start circle
      steps.push({
        id: 'hat-start-ball',
        text: `<h3>${t('Start the exercise', 'Inicie o exercício')}</h3>
               <p>${t(
                 'Press the circle when ready. Exhale, pinch your nose, hold your breath and keep walking. The timer counts how long you hold. Once you feel a strong air hunger and can no longer hold, press the circle again.',
                 'Pressione o círculo quando estiver pronto. Expire, aperte o nariz, segure a respiração e continue caminhando. O cronômetro conta quanto tempo você aguenta. Quando sentir uma forte necessidade de ar, pressione o círculo novamente.'
               )}</p>`,
        attachTo: { element: '#hat-start-ball', on: 'top' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Hold phase
      steps.push({
        id: 'hat-hold-item',
        text: `<h3>${t('Hold', 'Segure')}</h3>
               <p>${t(
                 'Hold your breath for as long as you can while keeping your walking pace. Avoid pushing yourself to the point of dizziness or struggling to recover gently — that means you held for too long.',
                 'Segure a respiração o máximo que conseguir mantendo o ritmo da caminhada. Evite forçar a ponto de sentir tontura ou dificuldade em recuperar a respiração de forma suave — isso significa que segurou por tempo demais.'
               )}</p>`,
        attachTo: { element: '#hat-hold-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Light breathing phase
      steps.push({
        id: 'hat-light-item',
        text: `<h3>${t('Light breathing — 15 seconds', 'Respiração leve — 15 segundos')}</h3>
               <p>${t(
                 'Do not stop walking. Inhale and breathe as lightly as possible for 15 seconds. If you cannot breathe lightly after releasing, it means you held your breath for too long — shorten the hold next round.',
                 'Não pare de caminhar. Inspire e respire o mais levemente possível por 15 segundos. Se não conseguir respirar levemente após soltar, significa que segurou por tempo demais — reduza a retenção na próxima rodada.'
               )}</p>`,
        attachTo: { element: '#hat-light-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Normal breathing phase
      steps.push({
        id: 'hat-normal-item',
        text: `<h3>${t('Normal breathing — 30 seconds', 'Respiração normal — 30 segundos')}</h3>
               <p>${t(
                 'Keep walking and breathe normally for 30 seconds to fully recover. After this, a new round starts automatically. Your individual round times are shown below the circle.',
                 'Continue caminhando e respire normalmente por 30 segundos para se recuperar completamente. Após isso, uma nova rodada começa automaticamente. Os tempos individuais de cada rodada aparecem abaixo do círculo.'
               )}</p>`,
        attachTo: { element: '#hat-normal-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Pause & save (centered)
      steps.push({
        id: 'hat-extra-info',
        text: `<h3>${t('Pause & save', 'Pausar e salvar')}</h3>
               <p>${t(
                 'You can press the circle during the light or normal breathing phases to pause the session. Remember to save your results at the end to track your hold times and progress over time.',
                 'Você pode pressionar o círculo durante as fases de respiração leve ou normal para pausar a sessão. Lembre-se de salvar seus resultados ao final para acompanhar seus tempos de retenção e evolução.'
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

  async startHAT(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsHAT.nativeElement.disabled = true;
    this.questionHAT.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnHAT.nativeElement.disabled = true;
      this.HATcountdownInput.nativeElement.style.display = 'inline';
      this.HATtimeInput.nativeElement.style.display = 'none';
      this.startCountdownHAT();
      this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(async () => {
        this.audioService.playSelectedSong();
        await this.audioService.playSound('inhale');
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(async () => {
        this.HATballText.nativeElement.textContent = '1';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.HATballText.nativeElement.textContent = '2';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(() => {
        this.HATballText.nativeElement.textContent = '3';
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);
      const timeoutId7 = setTimeout(async () => {
        await this.audioService.playSound('exhale');
        this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      }, 4000);
      this.globalService.timeouts.push(timeoutId7);

      const timeoutId8 = setTimeout(() => {
        this.HATballText.nativeElement.textContent = '3';
      }, 5000);
      this.globalService.timeouts.push(timeoutId8);

      const timeoutId9 = setTimeout(() => {
        this.HATballText.nativeElement.textContent = '2';
      }, 6000);
      this.globalService.timeouts.push(timeoutId9);

      const timeoutId10 = setTimeout(() => {
        this.HATballText.nativeElement.textContent = '1';
      }, 7000);
      this.globalService.timeouts.push(timeoutId10);

      const timeoutId5 = setTimeout(async () => {
        this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Segure e ande' : 'Hold and walk';
        await this.audioService.playSound('pinchWalk');

        this.HATinterval = setInterval(() => this.startTimerHAT(), 1000);
        this.HATTimer = setInterval(() => this.DisplayTimerHAT(), 1000);
      }, 8000);
      this.globalService.timeouts.push(timeoutId5);

      const timeoutId6 = setTimeout(() => {
        this.startBtnHAT.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
        this.holdHAT = true;
      }, 9000);
      this.globalService.timeouts.push(timeoutId6);

    } else if (firstClick === 'false' && breathingON === 'true') {
      if (!this.holdHAT) {
        this.clearIntervalsHAT();
        localStorage.setItem('breathingON', 'false');
        this.HATReset.nativeElement.disabled = false;
        this.HATReset.nativeElement.style.display = 'inline-flex';

        if (this.roundsHAT > 0) {
          this.HATSave.nativeElement.disabled = false;
          this.HATSave.nativeElement.style.display = 'inline-flex';
        }

        this.settingsHAT.nativeElement.disabled = false;
        this.questionHAT.nativeElement.disabled = false;
        this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
        this.audioService.pauseSelectedSong();
      } else {
        await this.pauseHAT();
      }

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.normalHAT) this.HATballText.nativeElement.textContent = 'Respiração Normal';
        else if (this.lightHAT) this.HATballText.nativeElement.textContent = 'Respiração Leve';
      } else {
        if (this.normalHAT) this.HATballText.nativeElement.textContent = 'Normal Breathing';
        else if (this.lightHAT) this.HATballText.nativeElement.textContent = 'Light Breathing';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.HATReset.nativeElement.disabled = true;
      this.HATReset.nativeElement.style.display = 'none';
      this.HATSave.nativeElement.disabled = true;
      this.HATSave.nativeElement.style.display = 'none';
      this.HATinterval = setInterval(() => this.startTimerHAT(), 1000);
      this.HATTimer = setInterval(() => this.DisplayTimerHAT(), 1000);
    }
  }

  startCountdownHAT(): void {
    if (this.HATduration !== Infinity) {
      if (this.HATduration <= 1) {
        this.HATcountdownInput.nativeElement.value = this.isPortuguese ? 'Rodada final' : 'Final round';
      } else {
        this.HATcountdownInput.nativeElement.value = this.isPortuguese
          ? `${this.HATduration} rodadas restantes`
          : `${this.HATduration} rounds left`;
      }
    } else {
      this.HATcountdownInput.nativeElement.value = '∞';
      this.HATcountdownInput.nativeElement.style.display = 'inline';
      this.HATtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerHAT(): Promise<void> {
    if (this.normalHAT || this.lightHAT) {
      this.HATcurrentValue--;
      this.HATballText.nativeElement.textContent = this.isPortuguese
        ? `${this.HATcurrentValue} segundos`
        : `${this.HATcurrentValue} seconds`;
    }

    if (this.holdHAT) {
      this.HATcurrentValue++;
      this.HATballText.nativeElement.textContent = this.isPortuguese
        ? `${this.HATcurrentValue} segundos`
        : `${this.HATcurrentValue} seconds`;
    }

    if (this.lightHAT && this.HATcurrentValue === 1) {
      this.HATcurrentValue = 31;
      this.lightHAT = false;
      this.normalHAT = true;
      this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Normal' : 'Normal Breathing';
      await this.audioService.playSound('normalbreath');

    } else if (this.normalHAT && this.HATcurrentValue === 1) {
      if (this.HATduration !== 0) {
        this.normalHAT = false;
        this.startBtnHAT.nativeElement.disabled = true;
        this.HATcurrentValue = 0;
        this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        const timeoutId = setTimeout(() => {
          this.HATballText.nativeElement.textContent = '1';
          }, 1000);
        this.globalService.timeouts.push(timeoutId);
         const timeoutId1 = setTimeout(() => {
          this.HATballText.nativeElement.textContent = '2';
          }, 2000);
        this.globalService.timeouts.push(timeoutId1);
        const timeoutId3 = setTimeout(() => {
          this.HATballText.nativeElement.textContent = '3';
          }, 3000);
        this.globalService.timeouts.push(timeoutId3);
         const timeoutId4 = setTimeout(async () => {
              await this.audioService.playSound('exhale');
        this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
          }, 4000);
        this.globalService.timeouts.push(timeoutId4);
        const timeoutId5 = setTimeout(() => {
          this.HATballText.nativeElement.textContent = '3';
          }, 5000);
        this.globalService.timeouts.push(timeoutId5);
         const timeoutId6 = setTimeout(() => {
          this.HATballText.nativeElement.textContent = '2';
          }, 6000);
        this.globalService.timeouts.push(timeoutId6);
        const timeoutId7 = setTimeout(() => {
          this.HATballText.nativeElement.textContent = '1';
          }, 7000);
        this.globalService.timeouts.push(timeoutId7);
         const timeoutId8 = setTimeout(async () => {
          this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Segure e ande' : 'Hold and walk';
          await this.audioService.playSound('pinchWalk');
          setTimeout(async () => {
            this.startBtnHAT.nativeElement.disabled = false;
            this.holdHAT = true;
            }, 1000);
          }, 8000);
        this.globalService.timeouts.push(timeoutId8);
      } else {
        this.clearIntervalsHAT();
        localStorage.setItem('breathingON', 'false');
        this.startBtnHAT.nativeElement.disabled = true;
        this.settingsHAT.nativeElement.disabled = false;
        this.questionHAT.nativeElement.disabled = false;
        this.HATReset.nativeElement.disabled = false;
        this.HATReset.nativeElement.style.display = 'inline-flex';
        this.HATSave.nativeElement.disabled = false;
        this.HATSave.nativeElement.style.display = 'inline-flex';
        this.HATcountdownInput.nativeElement.style.display = 'none';
        this.HATtimeInput.nativeElement.style.display = 'inline';
        this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Normal' : 'Normal Breathing';
        this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
      }
    }
  }

  DisplayTimerHAT(): void {
    this.HATSeconds++;
    if (this.HATSeconds === 60) {
      this.HATSeconds = 0;
      this.HATMinutes++;
    }
    const M = this.HATMinutes < 10 ? '0' + this.HATMinutes : this.HATMinutes;
    const S = this.HATSeconds < 10 ? '0' + this.HATSeconds : this.HATSeconds;
    this.timerDisplayHAT.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopHAT(): void {
    this.clearIntervalsHAT();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.HATcountdownInput.nativeElement.style.display = 'none';
    this.HATtimeInput.nativeElement.style.display = 'inline';
    this.HATcurrentValue = 0;
    this.startBtnHAT.nativeElement.disabled = false;
    this.HATReset.nativeElement.disabled = true;
    this.HATReset.nativeElement.style.display = 'none';
    this.HATSave.nativeElement.disabled = true;
    this.HATSave.nativeElement.style.display = 'none';
    this.holdHAT = true;
    this.normalHAT = false;
    this.lightHAT = false;
    this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsHAT = 0;
    this.roundsDoneHAT.nativeElement.innerHTML = '0';
    this.timerDisplayHAT.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setHATduration();
    this.HATSeconds = 0;
    this.HATMinutes = 0;
    this.roundsHAT = 0;
    this.HATResults.nativeElement.innerHTML = '';
  }

  async pauseHAT(): Promise<void> {
    this.clearIntervalsHAT();
    this.holdHAT = false;
    this.normalHAT = false;
    this.lightHAT = true;
    this.HATballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Leve' : 'Light Breathing';
    await this.audioService.playSound('lightNasal');

    this.roundsHAT++;
    this.roundsDoneHAT.nativeElement.innerHTML = this.roundsHAT.toString();
    this.HATduration = this.HATduration - 1;

    if (this.HATduration !== Infinity) {
      if (this.HATduration <= 1) {
        this.HATcountdownInput.nativeElement.value = this.isPortuguese ? 'Rodada final' : 'Final round';
      } else {
        this.HATcountdownInput.nativeElement.value = this.isPortuguese
          ? `${this.HATduration} rodadas restantes`
          : `${this.HATduration} rounds left`;
      }
    } else {
      this.HATcountdownInput.nativeElement.value = '∞';
    }

    if (this.isPortuguese) {
      this.HATResults.nativeElement.innerHTML += `<div class='NOfSteps'><div>Round ${this.roundsHAT}</div><div>${this.HATcurrentValue} segundos</div></div>`;
    } else {
      this.HATResults.nativeElement.innerHTML += `<div class='NOfSteps'><div>Round ${this.roundsHAT}</div><div>${this.HATcurrentValue} seconds</div></div>`;
    }

    this.HATroundsResults.push(this.HATcurrentValue);
    this.HATcurrentValue = 16;
    this.HATinterval = setInterval(() => this.startTimerHAT(), 1000);
    this.HATTimer = setInterval(() => this.DisplayTimerHAT(), 1000);
  }

  saveHAT(): void {
    const savedResults = JSON.parse(localStorage.getItem('HATResults') || '[]');
    savedResults.push({
      date: new Date().toISOString(),
      roundsResult: this.HATroundsResults,
      result: this.timerDisplayHAT.nativeElement.innerHTML,
      rounds: this.roundsHAT
    });
    localStorage.setItem('HATResults', JSON.stringify(savedResults));
    this.HATResultSaved.nativeElement.style.display = 'block';
    this.stopHAT();
    this.HATroundsResults = [];
  }

  clearIntervalsHAT(): void {
    clearInterval(this.HATinterval);
    clearInterval(this.HATTimer);
    this.HATinterval = null;
    this.HATTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopHAT();
    if (this.HATResultSaved?.nativeElement) {
      this.HATResultSaved.nativeElement.style.display = 'none';
    }
  }
}