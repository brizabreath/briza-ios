import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AudioService } from '../services/audio.service';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { App } from '@capacitor/app';
import { ShepherdService } from 'angular-shepherd';
import type { PluginListenerHandle } from '@capacitor/core';

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
  @ViewChild('timerDisplayBRT') timerDisplayBRT!: ElementRef<HTMLInputElement>;
  @ViewChild('brtStart') brtStart!: ElementRef<HTMLButtonElement>;
  @ViewChild('brtStop') brtStop!: ElementRef<HTMLButtonElement>;
  @ViewChild('brtSave') brtSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRTSettings') BRTSettings!: ElementRef<HTMLButtonElement>;
  @ViewChild('brtResultSaved') brtResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('BRTball') BRTball!: ElementRef<HTMLDivElement>;
  @ViewChild('questionBRT') questionBRT!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRTballText') BRTballText!: ElementRef<HTMLSpanElement>;

  private brtSeconds = 0;
  private brtMinutes = 0;
  private brtInt: any = null;
  private brtResult = '';
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService,
    private router: Router
  ) {}

  ngAfterViewInit(): void {
    this.brtStart.nativeElement.addEventListener('click', () => this.startTimerBRT());
    this.brtStop.nativeElement.addEventListener('click', () => this.stopTimerBRT());
    this.brtSave.nativeElement.addEventListener('click', () => this.saveResultBRT());

    this.brtStart.nativeElement.disabled = false;
    this.brtStop.nativeElement.disabled = true;
    this.brtStop.nativeElement.style.display = 'none';
    this.brtSave.nativeElement.disabled = true;
    this.brtSave.nativeElement.style.display = 'none';
    this.brtResultSaved.nativeElement.style.display = 'none';

    this.globalService.changeBall(1.2, 1, this.BRTball);

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
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
          await this.startTimerBRT();
        } else {
          this.globalService.clearAllTimeouts();
          this.stopTimerBRT();
        }
      }
    });

    this.BRTballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.brtResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    // Triggered from another page (e.g. app onboarding flow)
    const shouldStart = localStorage.getItem('startBRTTour') === 'true';
    if (shouldStart) {
      localStorage.removeItem('startBRTTour');
      this.startGuide();
      return;
    }

    // First time ever visiting this page
    if (!localStorage.getItem('brt_guide_seen')) {
      localStorage.setItem('brt_guide_seen', 'true');
      this.startGuide();
    }
  }

  async ionViewWillLeave() {
    await this.appStateHandle?.remove();
    this.appStateHandle = undefined;
    this.shepherd.cancel();
  }

  ionViewDidLeave() {
    this.unlockUIForTour();
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
        id: 'brt-intro',
        text: `<h3>${t('Briza Retention Test', 'Teste de Retenção Briza')}</h3>
               <p>${t(
                 'The Briza Retention Test measures how long you can hold your breath with empty lungs, offering insights into your breathing efficiency and CO₂ tolerance. This is not a competition — accuracy matters more than a long time.',
                 'O Teste de Retenção Briza mede por quanto tempo você consegue segurar a respiração com os pulmões vazios, oferecendo informações sobre sua eficiência respiratória e tolerância ao CO₂. Isso não é uma competição — a precisão importa mais do que um tempo longo.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Inhale
      steps.push({
        id: 'brt-inhale-item',
        text: `<h3>${t('Inhale gently', 'Inspire suavemente')}</h3>
               <p>${t(
                 'When you press the circle, the test begins with a gentle 3-second inhale through the nose. Keep it light — this is not a deep breath, just a normal relaxed inhale.',
                 'Quando você pressionar o círculo, o teste começa com uma inspiração suave de 3 segundos pelo nariz. Mantenha-a leve — não é uma respiração profunda, apenas uma inspiração relaxada e normal.'
               )}</p>`,
        attachTo: { element: '#brt-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Exhale
      steps.push({
        id: 'brt-exhale-item',
        text: `<h3>${t('Exhale gently', 'Espire suavemente')}</h3>
               <p>${t(
                 'After the inhale, exhale gently for 3 seconds through the nose. Do not force the air out — a natural relaxed exhale. At the end of this exhale, pinch your nose to begin the hold.',
                 'Após a inspiração, expire suavemente por 3 segundos pelo nariz. Não force a saída do ar — uma expiração relaxada e natural. Ao final dessa expiração, aperte o nariz para iniciar a retenção.'
               )}</p>`,
        attachTo: { element: '#brt-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Hold
      steps.push({
        id: 'brt-hold-item',
        text: `<h3>${t('Hold', 'Segure')}</h3>
               <p>${t(
                 'Hold your breath with empty lungs for as long as it takes to feel the first natural urge to breathe — not the strongest urge, just the first gentle signal. The timer counts automatically.',
                 'Segure a respiração com os pulmões vazios até sentir o primeiro impulso natural de respirar — não o mais forte, apenas o primeiro sinal suave. O cronômetro conta automaticamente.'
               )}</p>`,
        attachTo: { element: '#brt-hold-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Circle (start/pause)
      steps.push({
        id: 'hp-ball',
        text: `<h3>${t('Start & stop', 'Iniciar e parar')}</h3>
               <p>${t(
                 'Press the circle to start the test. Press it again the moment you feel the first urge to breathe. Return to calm nasal breathing immediately after. If your breath is not calm, this is a indicator that you held your breath for too long.',
                 'Pressione o círculo para iniciar o teste. Pressione novamente no momento em que sentir o primeiro impulso de respirar. Volte a respirar pelo nariz calmamente logo após. Se sua respiração não estiver calma, é um indicador de que você prendeu a respiração por muito tempo.'
               )}</p>`,
        attachTo: { element: '#hp-ball', on: 'top' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Save (centered)
      steps.push({
        id: 'brt-finish',
        text: `<h3>${t('Save your result', 'Salvar resultado')}</h3>
               <p>${t(
                 'After stopping the timer, tap Save to record your score. Track it over time to monitor improvements in your breathing efficiency. Remember — stop at the first urge, not the strongest, for accurate and comparable results.',
                 'Após parar o cronômetro, toque em Salvar para registrar sua pontuação. Acompanhe ao longo do tempo para monitorar melhorias na sua eficiência respiratória. Lembre-se — pare ao primeiro impulso, não ao mais forte, para resultados precisos e comparáveis.'
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

  async startTimerBRT(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();
    try {
      const breathingON = localStorage.getItem('breathingON');
      const firstClick = localStorage.getItem('firstClick');

      if (firstClick === 'true' && breathingON === 'false') {
        this.BRTSettings.nativeElement.disabled = true;
        this.questionBRT.nativeElement.disabled = true;
        this.brtStop.nativeElement.disabled = true;
        this.brtStop.nativeElement.style.display = 'none';
        this.brtSave.nativeElement.disabled = true;
        this.brtSave.nativeElement.style.display = 'none';
        this.brtStart.nativeElement.disabled = true;
        this.BRTballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';

        await this.audioService.playBell('bell');

        const timeoutId1 = setTimeout(() => {
          this.audioService.playSelectedSong();
        }, 500);
        this.globalService.timeouts.push(timeoutId1);

        const timeoutId2 = setTimeout(async () => {
          this.globalService.changeBall(1.5, 3, this.BRTball);
          await this.audioService.playSound('inhale');
          await this.audioService.playBreathSound('inhaleBreath', 3);
          this.BRTballText.nativeElement.textContent = '3';
        }, 1000);
        this.globalService.timeouts.push(timeoutId2);

        const timeoutId3 = setTimeout(() => {
          this.BRTballText.nativeElement.textContent = '2';
        }, 2000);
        this.globalService.timeouts.push(timeoutId3);

        const timeoutId4 = setTimeout(() => {
          this.BRTballText.nativeElement.textContent = '1';
        }, 3000);
        this.globalService.timeouts.push(timeoutId4);

        const timeoutId5 = setTimeout(async () => {
          this.BRTballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
          this.globalService.changeBall(1.2, 3, this.BRTball);
          await this.audioService.playSound('exhale');
          await this.audioService.playBreathSound('exhaleBreath', 3);
        }, 4000);
        this.globalService.timeouts.push(timeoutId5);

        const timeoutId6 = setTimeout(() => {
          this.BRTballText.nativeElement.textContent = '3';
        }, 5000);
        this.globalService.timeouts.push(timeoutId6);

        const timeoutId7 = setTimeout(() => {
          this.BRTballText.nativeElement.textContent = '2';
        }, 6000);
        this.globalService.timeouts.push(timeoutId7);

        const timeoutId8 = setTimeout(() => {
          this.BRTballText.nativeElement.textContent = '1';
        }, 7000);
        this.globalService.timeouts.push(timeoutId8);

        const timeoutId9 = setTimeout(async () => {
          this.BRTballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
          await this.audioService.playSound('hold');
          this.brtInt = setInterval(() => this.brtDisplayTimer(), 1000);
          this.brtStart.nativeElement.disabled = false;
          localStorage.setItem('breathingON', 'true');
          localStorage.setItem('firstClick', 'false');
        }, 8000);
        this.globalService.timeouts.push(timeoutId9);

      } else if (firstClick === 'false' && breathingON === 'true') {
        localStorage.setItem('breathingON', 'false');
        localStorage.setItem('firstClick', 'true');
        clearInterval(this.brtInt);
        this.BRTSettings.nativeElement.disabled = false;
        this.questionBRT.nativeElement.disabled = false;
        this.brtStop.nativeElement.disabled = false;
        this.brtStop.nativeElement.style.display = 'inline-flex';
        this.brtSave.nativeElement.disabled = false;
        this.brtSave.nativeElement.style.display = 'inline-flex';
        this.brtStart.nativeElement.disabled = true;
        this.brtResult = this.timerDisplayBRT.nativeElement.value;
        this.audioService.pauseSelectedSong();
      }
    } catch (error) {
      console.error('startTimerBRT error:', error);
    }
  }

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

  stopTimerBRT(): void {
    clearInterval(this.brtInt);
    [this.brtSeconds, this.brtMinutes] = [0, 0];
    this.timerDisplayBRT.nativeElement.value = '00 : 00';
    this.brtStart.nativeElement.disabled = false;
    this.brtStop.nativeElement.disabled = true;
    this.brtStop.nativeElement.style.display = 'none';
    this.brtSave.nativeElement.disabled = true;
    this.brtSave.nativeElement.style.display = 'none';
    this.BRTballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.audioService.pauseSelectedSong();
  }

  saveResultBRT(): void {
    const savedResults = JSON.parse(localStorage.getItem('brtResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.brtResult });
    localStorage.setItem('brtResults', JSON.stringify(savedResults));
    this.brtResultSaved.nativeElement.style.display = 'block';
    this.stopTimerBRT();
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    clearInterval(this.brtInt);
    this.audioService.pauseSelectedSong();
    if (this.brtResultSaved?.nativeElement) {
      this.brtResultSaved.nativeElement.style.display = 'none';
    }
  }
}