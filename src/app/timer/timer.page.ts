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
  selector: 'app-timer',
  templateUrl: './timer.page.html',
  styleUrls: ['./timer.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class TIMERPage implements AfterViewInit, OnDestroy {
  @ViewChild('TIMERball') TIMERball!: ElementRef<HTMLDivElement>;
  @ViewChild('TIMERballText') TIMERballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('TIMERtimeInput') TIMERtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('TIMERcountdownInput') TIMERcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnTIMER') startBtnTIMER!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnTIMER') stopBtnTIMER!: ElementRef<HTMLButtonElement>;
  @ViewChild('TIMERSave') TIMERSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsMED') settingsMED!: ElementRef<HTMLButtonElement>;
  @ViewChild('questionMED') questionMED!: ElementRef<HTMLButtonElement>;
  @ViewChild('timerDisplayTIMER') timerDisplayTIMER!: ElementRef<HTMLInputElement>;
  @ViewChild('TIMERResultSaved') TIMERResultSaved!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';

  private TIMERinterval: any = null;
  private TIMERcountdown: any = null;
  private TIMERTimer: any = null;

  private appStateHandle?: PluginListenerHandle;

  private isInfinityMode = false;
  private totalDurationSeconds: number | null = null;
  private remainingSeconds: number = 0;
  private elapsedSeconds: number = 0;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let TIMERi = 2; TIMERi <= 120; TIMERi++) {
      const TIMERoption = document.createElement('option');
      TIMERoption.value = (TIMERi * 60).toString();
      TIMERoption.textContent = this.isPortuguese ? `${TIMERi} minutos` : `${TIMERi} minutes`;
      this.TIMERtimeInput.nativeElement.appendChild(TIMERoption);
    }

    this.startBtnTIMER.nativeElement.onclick = () => this.startTIMER();
    this.stopBtnTIMER.nativeElement.onclick = () => this.stopTIMER();
    this.TIMERSave.nativeElement.onclick = () => this.saveTIMER();

    this.settingsMED.nativeElement.disabled = false;

    this.stopBtnTIMER.nativeElement.disabled = true;
    this.stopBtnTIMER.nativeElement.style.display = 'none';

    this.TIMERSave.nativeElement.disabled = true;
    this.TIMERSave.nativeElement.style.display = 'none';

    this.TIMERtimeInput.nativeElement.onchange = () => this.setTIMERduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setTIMERduration(): void {
    const selectedValue = this.TIMERtimeInput.nativeElement.value;
    this.isInfinityMode = selectedValue === 'infinity';

    if (this.isInfinityMode) {
      this.totalDurationSeconds = null;
      this.remainingSeconds = 0;
    } else {
      const parsed = parseInt(selectedValue, 10);
      this.totalDurationSeconds = Number.isFinite(parsed) ? parsed : 0;
      this.remainingSeconds = this.totalDurationSeconds || 0;
    }
  }

  async ionViewWillLeave() {
    await this.appStateHandle?.remove();
    this.appStateHandle = undefined;
    this.shepherd.cancel();
  }

  async ionViewWillEnter() {
    await this.appStateHandle?.remove();

    this.appStateHandle = await App.addListener('appStateChange', async (state) => {
      if (!state.isActive) {
        const breathingON = localStorage.getItem('breathingON');
        const firstClick = localStorage.getItem('firstClick');

        if (firstClick === 'false' && breathingON === 'true') {
          this.globalService.clearAllTimeouts();
          await this.startTIMER();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopTIMER();
        }
      }
    });

    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.TIMERResultSaved.nativeElement.style.display = 'none';
    this.TIMERballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    await this.audioService.initializeSong();

    if (!localStorage.getItem('timer_guide_seen')) {
      localStorage.setItem('timer_guide_seen', 'true');
      this.startGuide();
    }
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
        id: 'timer-intro',
        text: `<h3>${t('Meditation Timer', 'Temporizador de Meditação')}</h3>
               <p>${t(
                 'Meditation is one of the most well-researched tools for mental and physical wellbeing. Regular practice reduces cortisol and stress, lowers blood pressure, improves sleep quality, and sharpens focus and attention. Even short daily sessions produce measurable changes in brain structure over time.',
                 'A meditação é uma das ferramentas mais estudadas para o bem-estar mental e físico. A prática regular reduz o cortisol e o estresse, diminui a pressão arterial, melhora a qualidade do sono e aguça o foco e a atenção. Mesmo sessões curtas diárias produzem mudanças mensuráveis na estrutura cerebral ao longo do tempo.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Benefits (centered)
      steps.push({
        id: 'timer-benefits',
        text: `<h3>${t('Why meditate?', 'Por que meditar?')}</h3>
               <p>${t(
                 'Beyond stress relief, meditation increases grey matter density in areas linked to self-awareness and emotional regulation. It activates the parasympathetic nervous system, accelerates recovery after intense exercise, and builds resilience to anxiety over time. Pairing it with the breathing exercises in this app deepens all of these effects.',
                 'Além do alívio do estresse, a meditação aumenta a densidade da matéria cinzenta em áreas ligadas à autoconsciência e regulação emocional. Ela ativa o sistema nervoso parassimpático, acelera a recuperação após exercícios intensos e constrói resiliência à ansiedade ao longo do tempo. Combiná-la com os exercícios de respiração deste app aprofunda todos esses efeitos.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Duration selector
      steps.push({
        id: 'timer-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want to meditate. Even 5 minutes is worthwhile — consistency matters more than length. Set it to infinite if you prefer to sit without a countdown and stop whenever you feel ready.',
                 'Selecione por quanto tempo deseja meditar. Mesmo 5 minutos vale a pena — a consistência importa mais do que a duração. Deixe no infinito se preferir sentar sem contagem regressiva e parar quando se sentir pronto.'
               )}</p>`,
        attachTo: { element: '#timer-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Start circle
      steps.push({
        id: 'timer-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to begin. The circle will count up or down depending on your selection. Press again at any time to pause. When you finish, save your session to track your meditation streak over time.',
                 'Pressione o círculo para começar. O círculo contará para cima ou para baixo dependendo da sua seleção. Pressione novamente a qualquer momento para pausar. Ao terminar, salve sua sessão para acompanhar sua consistência de meditação ao longo do tempo.'
               )}</p>`,
        attachTo: { element: '#timer-start-ball', on: 'top' },
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

  private formatMMSS(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const mm = Math.floor(safe / 60);
    const ss = safe % 60;
    const M = mm < 10 ? '0' + mm : String(mm);
    const S = ss < 10 ? '0' + ss : String(ss);
    return `${M} : ${S}`;
  }

  private updateBallTextForCurrentMode(): void {
    if (this.isInfinityMode) {
      this.TIMERballText.nativeElement.textContent = this.formatMMSS(this.elapsedSeconds);
    } else {
      this.TIMERballText.nativeElement.textContent = this.formatMMSS(this.remainingSeconds);
    }
  }

  private startTickingIntervals(): void {
    this.TIMERinterval = setInterval(() => {
      if (!this.isInfinityMode && this.remainingSeconds <= 0) return;

      this.elapsedSeconds++;

      if (this.timerDisplayTIMER?.nativeElement) {
        this.timerDisplayTIMER.nativeElement.value = this.formatMMSS(this.elapsedSeconds);
      }
      if (this.isInfinityMode) {
        this.TIMERballText.nativeElement.textContent = this.formatMMSS(this.elapsedSeconds);
      }
    }, 1000);

    if (!this.isInfinityMode) {
      this.TIMERcountdown = setInterval(async () => {
        if (this.remainingSeconds <= 0) return;

        this.remainingSeconds--;
        this.updateBallTextForCurrentMode();

        if (this.remainingSeconds <= 0) {
          this.clearIntervalsTIMER();
          localStorage.setItem('breathingON', 'false');

          this.startBtnTIMER.nativeElement.disabled = true;
          this.settingsMED.nativeElement.disabled = false;
          this.questionMED.nativeElement.disabled = false;

          this.stopBtnTIMER.nativeElement.disabled = true;
          this.stopBtnTIMER.nativeElement.style.display = 'none';
          this.TIMERSave.nativeElement.disabled = true;
          this.TIMERSave.nativeElement.style.display = 'none';

          this.globalService.changeBall(1.3, 1, this.TIMERball);
          this.audioService.pauseSelectedSong();
          await this.audioService.playBell('bell');

          this.autoSaveTIMER();
          this.stopTIMER();
          this.TIMERResultSaved.nativeElement.style.display = 'block';
        }
      }, 1000);
    }
  }

  async startTIMER(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    if (firstClick === 'true' && breathingON === 'false') {
      this.setTIMERduration();
      this.elapsedSeconds = 0;

      if (!this.isInfinityMode) {
        this.remainingSeconds = this.totalDurationSeconds || 0;
      } else {
        this.remainingSeconds = 0;
      }

      this.startBtnTIMER.nativeElement.disabled = true;
      this.settingsMED.nativeElement.disabled = true;
      this.questionMED.nativeElement.disabled = true;

      this.TIMERcountdownInput.nativeElement.style.display = 'none';
      this.TIMERtimeInput.nativeElement.style.display = 'none';

      this.updateBallTextForCurrentMode();

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => { this.audioService.playSelectedSong(); }, 500);

      const timeoutId4 = setTimeout(async () => {
        this.globalService.changeBall(1.3, 1, this.TIMERball);
        this.startTickingIntervals();
        this.startBtnTIMER.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 1000);

      this.globalService.timeouts.push(timeoutId1);
      this.globalService.timeouts.push(timeoutId4);
      return;
    }

    if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsTIMER();
      localStorage.setItem('breathingON', 'false');

      this.TIMERSave.nativeElement.disabled = false;
      this.TIMERSave.nativeElement.style.display = 'inline-flex';
      this.settingsMED.nativeElement.disabled = false;
      this.questionMED.nativeElement.disabled = false;
      this.stopBtnTIMER.nativeElement.disabled = false;
      this.stopBtnTIMER.nativeElement.style.display = 'inline-flex';

      this.TIMERballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();
      return;
    }

    if (firstClick === 'false' && breathingON === 'false') {
      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');

      this.settingsMED.nativeElement.disabled = true;
      this.questionMED.nativeElement.disabled = true;

      this.stopBtnTIMER.nativeElement.disabled = true;
      this.stopBtnTIMER.nativeElement.style.display = 'none';
      this.TIMERSave.nativeElement.disabled = true;
      this.TIMERSave.nativeElement.style.display = 'none';

      this.updateBallTextForCurrentMode();
      this.startTickingIntervals();
    }
  }

  private autoSaveTIMER(): void {
    const resultToSave = this.formatMMSS(this.elapsedSeconds);
    const savedResults = JSON.parse(localStorage.getItem('TIMERResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: resultToSave });
    localStorage.setItem('TIMERResults', JSON.stringify(savedResults));
  }

  saveTIMER(): void {
    const resultToSave = this.formatMMSS(this.elapsedSeconds);
    const savedResults = JSON.parse(localStorage.getItem('TIMERResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: resultToSave });
    localStorage.setItem('TIMERResults', JSON.stringify(savedResults));
    this.TIMERResultSaved.nativeElement.style.display = 'block';
    this.stopTIMER();
  }

  stopTIMER(): void {
    this.clearIntervalsTIMER();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');

    this.TIMERcountdownInput.nativeElement.style.display = 'none';
    this.TIMERtimeInput.nativeElement.style.display = 'inline';
    this.startBtnTIMER.nativeElement.disabled = false;
    this.settingsMED.nativeElement.disabled = false;
    this.questionMED.nativeElement.disabled = false;

    this.stopBtnTIMER.nativeElement.disabled = true;
    this.stopBtnTIMER.nativeElement.style.display = 'none';
    this.TIMERSave.nativeElement.disabled = true;
    this.TIMERSave.nativeElement.style.display = 'none';

    this.globalService.changeBall(1.3, 1, this.TIMERball);
    this.TIMERballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';

    this.elapsedSeconds = 0;
    this.remainingSeconds = 0;
    this.totalDurationSeconds = null;
    this.isInfinityMode = false;

    this.audioService.pauseSelectedSong();
    this.setTIMERduration();
  }

  clearIntervalsTIMER(): void {
    clearInterval(this.TIMERinterval);
    clearInterval(this.TIMERcountdown);
    clearInterval(this.TIMERTimer);
    this.TIMERinterval = null;
    this.TIMERcountdown = null;
    this.TIMERTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopTIMER();
    if (this.TIMERResultSaved?.nativeElement) {
      this.TIMERResultSaved.nativeElement.style.display = 'none';
    }
  }
}