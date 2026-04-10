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
  selector: 'app-bb',
  templateUrl: './bb.page.html',
  styleUrls: ['./bb.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BBPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionBB') questionBB!: ElementRef<HTMLButtonElement>;
  @ViewChild('BBball') BBball!: ElementRef<HTMLDivElement>;
  @ViewChild('BBballText') BBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('BBtimeInput') BBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('BBcountdownInput') BBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnBB') startBtnBB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnBB') stopBtnBB!: ElementRef<HTMLButtonElement>;
  @ViewChild('BBSave') BBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsBB') settingsBB!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneBB') roundsDoneBB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayBB') timerDisplayBB!: ElementRef<HTMLDivElement>;
  @ViewChild('BBResultSaved') BBResultSaved!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleBB = true;
  private hold1BB = false;
  private exhaleBB = false;
  private hold2BB = false;
  private BBinterval: any = null;
  private BBcountdown: any = null;
  private BBcurrentValue = 5;
  private BBduration = 0;
  private BBSeconds = 0;
  private BBMinutes = 0;
  private roundsBB = 0;
  private BBTimer: any = null;
  private BBResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let BBi = 2; BBi <= 60; BBi++) {
      const BBoption = document.createElement('option');
      BBoption.value = (BBi * 60).toString();
      BBoption.textContent = this.isPortuguese ? `${BBi} minutos` : `${BBi} minutes`;
      this.BBtimeInput.nativeElement.appendChild(BBoption);
    }

    this.startBtnBB.nativeElement.onclick = () => this.startBB();
    this.stopBtnBB.nativeElement.onclick = () => this.stopBB();
    this.BBSave.nativeElement.onclick = () => this.saveBB();

    this.stopBtnBB.nativeElement.disabled = true;
    this.stopBtnBB.nativeElement.style.display = 'none';
    this.BBSave.nativeElement.disabled = true;
    this.BBSave.nativeElement.style.display = 'none';

    this.BBtimeInput.nativeElement.onchange = () => this.setBBduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setBBduration(): void {
    const selectedValue = this.BBtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.BBduration = Infinity;
    } else {
      this.BBduration = parseInt(selectedValue, 10);
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
          await this.startBB();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopBB();
        }
      }
    });

    this.BBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setBBduration();
    this.BBResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
      if (this.songInitStarted) return;
      this.songInitStarted = true;
      this.audioService.initializeSong().catch((err) => {
        console.warn('initializeSong failed:', err);
      });

      if (!localStorage.getItem('bb_guide_seen')) {
        localStorage.setItem('bb_guide_seen', 'true');
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
        id: 'bb-intro',
        text: `<h3>${t('Briza Breathing', 'Respiração Briza')}</h3>
               <p>${t(
                 'Learn how to breathe so gently and lightly that a feather placed beneath your nose would remain still. This technique trains your body to breathe less, building tolerance to CO₂ and improving overall breathing efficiency.',
                 'Aprenda a respirar tão suavemente que uma pena sob seu nariz não se moveria. Esta técnica treina seu corpo a respirar menos, aumentando a tolerância ao CO₂ e melhorando a eficiência respiratória.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'bb-posture',
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
        id: 'bb-inhale-item',
        text: `<h3>${t('Inhale — lightly', 'Inspire — levemente')}</h3>
               <p>${t(
                 'Breathe in through the nose for 4 seconds, but reduce the volume of air as much as possible. You should barely feel or hear your breath coming in.',
                 'Inspire pelo nariz por 4 segundos, mas reduza o volume de ar ao máximo. Você mal deve sentir ou ouvir a respiração entrando.'
               )}</p>`,
        attachTo: { element: '#bb-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Hold 1
      steps.push({
        id: 'bb-hold1-item',
        text: `<h3>${t('Pause after inhale', 'Pausa após inspirar')}</h3>
               <p>${t(
                 'Hold briefly for 2 seconds after inhaling. Stay relaxed — this short pause helps build a gentle air hunger.',
                 'Segure brevemente por 2 segundos após inspirar. Fique relaxado — essa pequena pausa ajuda a criar uma leve sensação de fome de ar.'
               )}</p>`,
        attachTo: { element: '#bb-hold1-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Exhale
      steps.push({
        id: 'bb-exhale-item',
        text: `<h3>${t('Exhale — lightly', 'Espire — levemente')}</h3>
               <p>${t(
                 'Breathe out through the nose for 6 seconds, again keeping the volume as light as possible. The exhalation should be slow, quiet and barely noticeable.',
                 'Expire pelo nariz por 6 segundos, mantendo o volume o mais leve possível. A expiração deve ser lenta, silenciosa e quase imperceptível.'
               )}</p>`,
        attachTo: { element: '#bb-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Hold 2
      steps.push({
        id: 'bb-hold2-item',
        text: `<h3>${t('Pause after exhale', 'Pausa após expirar')}</h3>
               <p>${t(
                 'Hold again for 2 seconds after exhaling. This second pause completes the cycle and deepens the air hunger effect. Then a new round begins.',
                 'Segure novamente por 2 segundos após expirar. Essa segunda pausa completa o ciclo e aprofunda o efeito de fome de ar. Então uma nova rodada começa.'
               )}</p>`,
        attachTo: { element: '#bb-hold2-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Duration
      steps.push({
        id: 'bb-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to keep yourself on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#bb-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Start ball & air hunger reminder
      steps.push({
        id: 'bb-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Maintain a slight air hunger throughout — if it becomes too strong, keep the rhythm but allow yourself to breathe naturally until you can reduce volume again. Press the circle at any time to pause. Remember to save your results at the end.',
                 'Mantenha uma leve fome de ar durante toda a sessão — se ficar intensa demais, mantenha o ritmo mas respire normalmente até conseguir reduzir o volume novamente. Pressione o círculo para pausar. Lembre-se de salvar seus resultados ao final.'
               )}</p>`,
        attachTo: { element: '#bb-start-ball', on: 'top' },
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

  async startBB(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsBB.nativeElement.disabled = true;
    this.questionBB.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnBB.nativeElement.disabled = true;
      this.inhaleBB = true;
      this.BBcountdownInput.nativeElement.style.display = 'inline';
      this.BBtimeInput.nativeElement.style.display = 'none';
      this.startCountdownBB();
      this.BBballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => {
        this.BBballText.nativeElement.textContent = '2';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.BBballText.nativeElement.textContent = '1';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.BBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.BBcurrentValue);
        this.globalService.changeBall(1.5, 5, this.BBball);
        this.BBinterval = setInterval(() => this.startTimerBB(), 1000);
        this.BBTimer = setInterval(() => this.DisplayTimerBB(), 1000);
        this.startBtnBB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsBB();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnBB.nativeElement.disabled = false;
      this.stopBtnBB.nativeElement.style.display = 'inline-flex';

      if (this.roundsBB > 0) {
        this.BBSave.nativeElement.disabled = false;
        this.BBSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsBB.nativeElement.disabled = false;
      this.questionBB.nativeElement.disabled = false;
      this.BBballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleBB) this.BBballText.nativeElement.textContent = 'Inspire';
        else if (this.hold1BB || this.hold2BB) this.BBballText.nativeElement.textContent = 'Segure';
        else if (this.exhaleBB) this.BBballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleBB) this.BBballText.nativeElement.textContent = 'Inhale';
        else if (this.hold1BB || this.hold2BB) this.BBballText.nativeElement.textContent = 'Hold';
        else if (this.exhaleBB) this.BBballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnBB.nativeElement.disabled = true;
      this.stopBtnBB.nativeElement.style.display = 'none';
      this.BBSave.nativeElement.disabled = true;
      this.BBSave.nativeElement.style.display = 'none';
      this.BBinterval = setInterval(() => this.startTimerBB(), 1000);
      this.BBTimer = setInterval(() => this.DisplayTimerBB(), 1000);
      this.startCountdownBB();
    }
  }

  startCountdownBB(): void {
    if (this.BBduration !== Infinity) {
      const Contdownminutes = Math.floor(this.BBduration / 60);
      const Contdownseconds = this.BBduration % 60;
      this.BBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.BBcountdown = setInterval(() => {
        if (this.BBduration === 0) {
          clearInterval(this.BBcountdown);
          this.BBcountdown = null;
        } else {
          this.BBduration--;
          const Contdownminutes = Math.floor(this.BBduration / 60);
          const Contdownseconds = this.BBduration % 60;
          this.BBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.BBcountdownInput.nativeElement.value = '∞';
      this.BBcountdownInput.nativeElement.style.display = 'inline';
      this.BBtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerBB(): Promise<void> {
    this.BBcurrentValue--;

    if (this.inhaleBB && this.BBcurrentValue === 1) {
      this.BBcurrentValue = 3;
      this.inhaleBB = false;
      this.hold1BB = true;
      await this.audioService.playSound('pause');
      this.BBballText.nativeElement.textContent = 'Pause';
      this.globalService.changeBall(1.3, 3, this.BBball);

    } else if (this.hold1BB && this.BBcurrentValue === 1) {
      this.BBcurrentValue = 7;
      this.hold1BB = false;
      this.exhaleBB = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.BBcurrentValue);
      this.BBballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, 7, this.BBball);

    } else if (this.exhaleBB && this.BBcurrentValue === 1) {
      this.BBcurrentValue = 3;
      this.exhaleBB = false;
      this.hold2BB = true;
      await this.audioService.playSound('pause');
      this.BBballText.nativeElement.textContent = 'Pause';
      this.globalService.changeBall(1, 3, this.BBball);
      this.roundsBB++;
      this.roundsDoneBB.nativeElement.innerHTML = this.roundsBB.toString();

    } else if (this.hold2BB && this.BBcurrentValue === 1) {
      if (this.BBduration !== 0) {
        this.BBcurrentValue = 5;
        this.hold2BB = false;
        this.inhaleBB = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.BBcurrentValue);
        this.BBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, 5, this.BBball);
      } else {
        this.clearIntervalsBB();
        localStorage.setItem('breathingON', 'false');
        this.startBtnBB.nativeElement.disabled = true;
        this.settingsBB.nativeElement.disabled = false;
        this.questionBB.nativeElement.disabled = false;
        this.stopBtnBB.nativeElement.disabled = false;
        this.stopBtnBB.nativeElement.style.display = 'inline-flex';
        this.BBSave.nativeElement.disabled = false;
        this.BBSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.BBball);
        this.BBcountdownInput.nativeElement.style.display = 'none';
        this.BBtimeInput.nativeElement.style.display = 'inline';
        this.BBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }
    }
  }

  DisplayTimerBB(): void {
    this.BBSeconds++;
    if (this.BBSeconds === 60) {
      this.BBSeconds = 0;
      this.BBMinutes++;
    }
    const M = this.BBMinutes < 10 ? '0' + this.BBMinutes : this.BBMinutes;
    const S = this.BBSeconds < 10 ? '0' + this.BBSeconds : this.BBSeconds;
    this.timerDisplayBB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopBB(): void {
    this.clearIntervalsBB();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.BBcountdownInput.nativeElement.style.display = 'none';
    this.BBtimeInput.nativeElement.style.display = 'inline';
    this.BBcurrentValue = 5;
    this.startBtnBB.nativeElement.disabled = false;
    this.stopBtnBB.nativeElement.disabled = true;
    this.stopBtnBB.nativeElement.style.display = 'none';
    this.BBSave.nativeElement.disabled = true;
    this.BBSave.nativeElement.style.display = 'none';
    this.inhaleBB = true;
    this.hold1BB = false;
    this.exhaleBB = false;
    this.hold2BB = false;
    this.globalService.changeBall(1, 1, this.BBball);
    this.BBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsBB = 0;
    this.roundsDoneBB.nativeElement.innerHTML = '0';
    this.timerDisplayBB.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setBBduration();
    this.BBSeconds = 0;
    this.BBMinutes = 0;
    this.roundsBB = 0;
  }

  saveBB(): void {
    this.BBResult = this.timerDisplayBB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('BBResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.BBResult, rounds: this.roundsBB });
    localStorage.setItem('BBResults', JSON.stringify(savedResults));
    this.BBResultSaved.nativeElement.style.display = 'block';
    this.stopBB();
  }

  clearIntervalsBB(): void {
    clearInterval(this.BBinterval);
    clearInterval(this.BBcountdown);
    clearInterval(this.BBTimer);
    this.BBinterval = null;
    this.BBcountdown = null;
    this.BBTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopBB();
    if (this.BBResultSaved?.nativeElement) {
      this.BBResultSaved.nativeElement.style.display = 'none';
    }
  }
}