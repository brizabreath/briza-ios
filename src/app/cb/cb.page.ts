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
  selector: 'app-cb',
  templateUrl: './cb.page.html',
  styleUrls: ['./cb.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class CBPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionCB') questionCB!: ElementRef<HTMLButtonElement>;
  @ViewChild('CBball') CBball!: ElementRef<HTMLDivElement>;
  @ViewChild('CBballText') CBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('CBtimeInput') CBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('CBcountdownInput') CBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnCB') startBtnCB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnCB') stopBtnCB!: ElementRef<HTMLButtonElement>;
  @ViewChild('CBSave') CBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsCB') settingsCB!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneCB') roundsDoneCB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayCB') timerDisplayCB!: ElementRef<HTMLDivElement>;
  @ViewChild('CBResultSaved') CBResultSaved!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleCB = true;
  private exhaleCB = false;
  private CBinterval: any = null;
  private CBcountdown: any = null;
  private CBcurrentValue = 6.5;
  private CBduration = 0;
  private CBSeconds = 0;
  private CBMinutes = 0;
  private roundsCB = 0;
  private CBTimer: any = null;
  private CBResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let CBi = 2; CBi <= 60; CBi++) {
      const CBoption = document.createElement('option');
      CBoption.value = (CBi * 60).toString();
      CBoption.textContent = this.isPortuguese ? `${CBi} minutos` : `${CBi} minutes`;
      this.CBtimeInput.nativeElement.appendChild(CBoption);
    }

    this.startBtnCB.nativeElement.onclick = () => this.startCB();
    this.stopBtnCB.nativeElement.onclick = () => this.stopCB();
    this.CBSave.nativeElement.onclick = () => this.saveCB();

    this.stopBtnCB.nativeElement.disabled = true;
    this.stopBtnCB.nativeElement.style.display = 'none';
    this.CBSave.nativeElement.disabled = true;
    this.CBSave.nativeElement.style.display = 'none';

    this.CBtimeInput.nativeElement.onchange = () => this.setCBduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setCBduration(): void {
    const selectedValue = this.CBtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.CBduration = Infinity;
    } else {
      this.CBduration = parseInt(selectedValue, 10);
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
          await this.startCB();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopCB();
        }
      }
    });

    this.CBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setCBduration();
    this.CBResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('cb_guide_seen')) {
      localStorage.setItem('cb_guide_seen', 'true');
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
        id: 'cb-intro',
        text: `<h3>${t('Coherent Breathing', 'Respiração Coerente')}</h3>
               <p>${t(
                 'Coherent breathing involves inhaling and exhaling for 5.5 seconds each, resulting in approximately 5.5 breaths per minute. This rhythm has been shown to maximise heart rate variability, reduce stress, and bring the nervous system into a balanced state.',
                 'A respiração coerente envolve inspirar e expirar por 5,5 segundos cada, resultando em aproximadamente 5,5 respirações por minuto. Este ritmo demonstrou maximizar a variabilidade da frequência cardíaca, reduzir o estresse e trazer o sistema nervoso a um estado equilibrado.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'cb-posture',
        text: `<h3>${t('Get comfortable', 'Fique confortável')}</h3>
               <p>${t(
                 'Find a comfortable seat or lie down. Ease your shoulders, facial muscles, and jaw into relaxation. Let your tongue rest on the roof of your mouth, with its tip lightly touching your upper front teeth.',
                 'Encontre um assento confortável ou deite-se. Relaxe os ombros, os músculos faciais e a mandíbula. Coloque a língua no céu da boca, a ponta deve tocar o topo dos seus dentes da frente.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Inhale
      steps.push({
        id: 'cb-inhale-item',
        text: `<h3>${t('Inhale — 5.5 seconds', 'Inspire — 5,5 segundos')}</h3>
               <p>${t(
                 'Breathe in slowly and gently through the nose for 5.5 seconds. Breathe into your belly first, then let the chest rise naturally. Keep the breath smooth and unforced.',
                 'Inspire lenta e suavemente pelo nariz por 5,5 segundos. Respire primeiro para a barriga, depois deixe o peito subir naturalmente. Mantenha a respiração suave e sem esforço.'
               )}</p>`,
        attachTo: { element: '#cb-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Exhale
      steps.push({
        id: 'cb-exhale-item',
        text: `<h3>${t('Exhale — 5.5 seconds', 'Expire — 5,5 segundos')}</h3>
               <p>${t(
                 'Breathe out slowly through the nose for 5.5 seconds. Let the air release naturally without forcing — the exhale should feel as effortless as the inhale. Always breathe through the nose throughout the session.',
                 'Expire lentamente pelo nariz por 5,5 segundos. Deixe o ar sair naturalmente sem forçar — a expiração deve parecer tão sem esforço quanto a inspiração. Respire sempre pelo nariz durante toda a sessão.'
               )}</p>`,
        attachTo: { element: '#cb-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Duration
      steps.push({
        id: 'cb-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. Even 5 minutes of coherent breathing can have a noticeable calming effect. You can set it to infinite and stop whenever you feel ready.',
                 'Selecione por quanto tempo deseja que a sessão dure. Mesmo 5 minutos de respiração coerente podem ter um efeito calmante perceptível. Você pode deixar no infinito e parar quando quiser.'
               )}</p>`,
        attachTo: { element: '#cb-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Start circle
      steps.push({
        id: 'cb-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm. Press it again at any time to pause. Remember to save your results at the end to track your progress over time.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final para acompanhar sua evolução.'
               )}</p>`,
        attachTo: { element: '#cb-start-ball', on: 'top' },
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

  async startCB(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsCB.nativeElement.disabled = true;
    this.questionCB.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnCB.nativeElement.disabled = true;
      this.inhaleCB = true;
      this.CBcountdownInput.nativeElement.style.display = 'inline';
      this.CBtimeInput.nativeElement.style.display = 'none';
      this.startCountdownCB();
      this.CBballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => {
        this.CBballText.nativeElement.textContent = '2';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.CBballText.nativeElement.textContent = '1';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.CBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.CBcurrentValue);
        this.globalService.changeBall(1.5, 5, this.CBball);
        this.CBinterval = setInterval(() => this.startTimerCB(), 500);
        this.CBTimer = setInterval(() => this.DisplayTimerCB(), 1000);
        this.startBtnCB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsCB();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnCB.nativeElement.disabled = false;
      this.stopBtnCB.nativeElement.style.display = 'inline-flex';

      if (this.roundsCB > 0) {
        this.CBSave.nativeElement.disabled = false;
        this.CBSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsCB.nativeElement.disabled = false;
      this.questionCB.nativeElement.disabled = false;
      this.CBballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleCB) this.CBballText.nativeElement.textContent = 'Inspire';
        else if (this.exhaleCB) this.CBballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleCB) this.CBballText.nativeElement.textContent = 'Inhale';
        else if (this.exhaleCB) this.CBballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnCB.nativeElement.disabled = true;
      this.stopBtnCB.nativeElement.style.display = 'none';
      this.CBSave.nativeElement.disabled = true;
      this.CBSave.nativeElement.style.display = 'none';
      this.CBinterval = setInterval(() => this.startTimerCB(), 500);
      this.CBTimer = setInterval(() => this.DisplayTimerCB(), 1000);
      this.startCountdownCB();
    }
  }

  startCountdownCB(): void {
    if (this.CBduration !== Infinity) {
      const Contdownminutes = Math.floor(this.CBduration / 60);
      const Contdownseconds = this.CBduration % 60;
      this.CBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.CBcountdown = setInterval(() => {
        if (this.CBduration === 0) {
          clearInterval(this.CBcountdown);
          this.CBcountdown = null;
        } else {
          this.CBduration--;
          const Contdownminutes = Math.floor(this.CBduration / 60);
          const Contdownseconds = this.CBduration % 60;
          this.CBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.CBcountdownInput.nativeElement.value = '∞';
      this.CBcountdownInput.nativeElement.style.display = 'inline';
      this.CBtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerCB(): Promise<void> {
    this.CBcurrentValue = this.CBcurrentValue - 0.5;

    if (this.inhaleCB && this.CBcurrentValue === 0.5) {
      this.CBcurrentValue = 6.5;
      this.inhaleCB = false;
      this.exhaleCB = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.CBcurrentValue);
      this.CBballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, 5, this.CBball);
      this.roundsCB++;
      this.roundsDoneCB.nativeElement.innerHTML = this.roundsCB.toString();

    } else if (this.exhaleCB && this.CBcurrentValue === 0.5) {
      if (this.CBduration !== 0) {
        this.CBcurrentValue = 6.5;
        this.exhaleCB = false;
        this.inhaleCB = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.CBcurrentValue);
        this.CBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, 5, this.CBball);
      } else {
        this.clearIntervalsCB();
        localStorage.setItem('breathingON', 'false');
        this.startBtnCB.nativeElement.disabled = true;
        this.settingsCB.nativeElement.disabled = false;
        this.questionCB.nativeElement.disabled = false;
        this.stopBtnCB.nativeElement.disabled = false;
        this.stopBtnCB.nativeElement.style.display = 'inline-flex';
        this.CBSave.nativeElement.disabled = false;
        this.CBSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.CBball);
        this.CBcountdownInput.nativeElement.style.display = 'none';
        this.CBtimeInput.nativeElement.style.display = 'inline';
        this.CBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }
    }
  }

  DisplayTimerCB(): void {
    this.CBSeconds++;
    if (this.CBSeconds === 60) {
      this.CBSeconds = 0;
      this.CBMinutes++;
    }
    const M = this.CBMinutes < 10 ? '0' + this.CBMinutes : this.CBMinutes;
    const S = this.CBSeconds < 10 ? '0' + this.CBSeconds : this.CBSeconds;
    this.timerDisplayCB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopCB(): void {
    this.clearIntervalsCB();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.CBcountdownInput.nativeElement.style.display = 'none';
    this.CBtimeInput.nativeElement.style.display = 'inline';
    this.CBcurrentValue = 6.5;
    this.startBtnCB.nativeElement.disabled = false;
    this.stopBtnCB.nativeElement.disabled = true;
    this.stopBtnCB.nativeElement.style.display = 'none';
    this.CBSave.nativeElement.disabled = true;
    this.CBSave.nativeElement.style.display = 'none';
    this.inhaleCB = true;
    this.exhaleCB = false;
    this.globalService.changeBall(1, 1, this.CBball);
    this.CBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsCB = 0;
    this.roundsDoneCB.nativeElement.innerHTML = '0';
    this.timerDisplayCB.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setCBduration();
    this.CBSeconds = 0;
    this.CBMinutes = 0;
    this.roundsCB = 0;
  }

  saveCB(): void {
    this.CBResult = this.timerDisplayCB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('CBResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.CBResult, rounds: this.roundsCB });
    localStorage.setItem('CBResults', JSON.stringify(savedResults));
    this.CBResultSaved.nativeElement.style.display = 'block';
    this.stopCB();
  }

  clearIntervalsCB(): void {
    clearInterval(this.CBinterval);
    clearInterval(this.CBcountdown);
    clearInterval(this.CBTimer);
    this.CBinterval = null;
    this.CBcountdown = null;
    this.CBTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopCB();
    if (this.CBResultSaved?.nativeElement) {
      this.CBResultSaved.nativeElement.style.display = 'none';
    }
  }
}