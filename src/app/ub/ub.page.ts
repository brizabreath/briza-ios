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
  selector: 'app-ub',
  templateUrl: './ub.page.html',
  styleUrls: ['./ub.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class UBPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionUB') questionUB!: ElementRef<HTMLButtonElement>;
  @ViewChild('UBball') UBball!: ElementRef<HTMLDivElement>;
  @ViewChild('UBballText') UBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('UBtimeInput') UBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('UBcountdownInput') UBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnUB') startBtnUB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnUB') stopBtnUB!: ElementRef<HTMLButtonElement>;
  @ViewChild('UBSave') UBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsUB') settingsUB!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputUB') inhaleInputUB!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputUB') exhaleInputUB!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneUB') roundsDoneUB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayUB') timerDisplayUB!: ElementRef<HTMLDivElement>;
  @ViewChild('UBResultSaved') UBResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusUB') minusUB!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusUB') plusUB!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleUB = true;
  private exhaleUB = false;
  private UBinterval: any = null;
  private UBcountdown: any = null;
  private UBcurrentValue = 5;
  private UBduration = 0;
  private roundsUB = 0;
  private UBSeconds = 0;
  private UBMinutes = 0;
  private UBTimer: any = null;
  private UBResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let UBi = 2; UBi <= 60; UBi++) {
      const UBoption = document.createElement('option');
      UBoption.value = (UBi * 60).toString();
      UBoption.textContent = this.isPortuguese ? `${UBi} minutos` : `${UBi} minutes`;
      this.UBtimeInput.nativeElement.appendChild(UBoption);
    }

    this.minusUB.nativeElement.onclick = () => this.minusRatioUB();
    this.plusUB.nativeElement.onclick = () => this.plusRatioUB();
    this.startBtnUB.nativeElement.onclick = () => this.startUB();
    this.stopBtnUB.nativeElement.onclick = () => this.stopUB();
    this.UBSave.nativeElement.onclick = () => this.saveUB();

    this.stopBtnUB.nativeElement.disabled = true;
    this.stopBtnUB.nativeElement.style.display = 'none';
    this.UBSave.nativeElement.disabled = true;
    this.UBSave.nativeElement.style.display = 'none';

    this.UBtimeInput.nativeElement.onchange = () => this.setUBduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setUBduration(): void {
    const selectedValue = this.UBtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.UBduration = Infinity;
    } else {
      this.UBduration = parseInt(selectedValue, 10);
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
          await this.startUB();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopUB();
        }
      }
    });

    this.UBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setUBduration();
    this.UBResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('ub_guide_seen')) {
      localStorage.setItem('ub_guide_seen', 'true');
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
        id: 'ub-intro',
        text: `<h3>${t('Ujjayi — Ocean Breath', 'Ujjayi — Respiração do Oceano')}</h3>
               <p>${t(
                 'Ujjayi is a yogic breathing technique where you breathe in and out through the nose while creating a soft, whispering sound at the back of the throat — like the sound of distant ocean waves. It is widely used in yoga to calm the mind, deepen the breath, build internal heat, regulate the nervous system, and increase focus and concentration.',
                 'Ujjayi é uma técnica de respiração yogi onde você respira pelo nariz criando um som suave e sussurrante na parte de trás da garganta — como o som de ondas distantes do oceano. É amplamente usada no yoga para acalmar a mente, aprofundar a respiração, gerar calor interno, regular o sistema nervoso e aumentar o foco e a concentração.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'ub-posture',
        text: `<h3>${t('Get comfortable', 'Fique confortável')}</h3>
               <p>${t(
                 'Find a comfortable seat or lie down. Relax your shoulders, face muscles, and jaw. Place your tongue on the roof of your mouth, with its tip gently touching your upper front teeth. Breathe only through the nose throughout the entire session.',
                 'Encontre um assento confortável ou deite-se. Relaxe os ombros, os músculos faciais e a mandíbula. Coloque a língua no céu da boca, a ponta deve tocar o topo dos seus dentes da frente. Respire apenas pelo nariz durante toda a sessão.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Minus
      steps.push({
        id: 'ub-minus-btn',
        text: `<h3>${t('Decrease ratio', 'Diminuir proporção')}</h3>
               <p>${t(
                 'Use the minus button to lower both the inhale and exhale equally. Start with a count that feels comfortable — reduce it if your heart rate accelerates or the breath becomes strained.',
                 'Use o botão de menos para diminuir tanto a inspiração quanto a expiração igualmente. Comece com uma contagem confortável — reduza se o coração acelerar ou a respiração ficar forçada.'
               )}</p>`,
        attachTo: { element: '#ub-minus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Inhale
      steps.push({
        id: 'ub-inhale-item',
        text: `<h3>${t('Inhale', 'Inspire')}</h3>
               <p>${t(
                 'Inhale slowly through the nose for this many seconds. As you breathe in, gently constrict the back of your throat — the same feeling as fogging a mirror, but with your mouth closed. You should hear a soft, steady ocean sound. Fill your lungs from the bottom up.',
                 'Inspire lentamente pelo nariz por este número de segundos. Ao inspirar, contraia suavemente a parte de trás da garganta — a mesma sensação de embaçar um espelho, mas com a boca fechada. Você deve ouvir um som suave e constante de oceano. Encha os pulmões de baixo para cima.'
               )}</p>`,
        attachTo: { element: '#ub-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Exhale
      steps.push({
        id: 'ub-exhale-item',
        text: `<h3>${t('Exhale', 'Espire')}</h3>
               <p>${t(
                 'Exhale slowly through the nose for this many seconds, maintaining the same gentle throat constriction. The ocean sound should be just as audible on the exhale as on the inhale. Keep the breath smooth and steady — avoid rushing or forcing it.',
                 'Expire lentamente pelo nariz por este número de segundos, mantendo a mesma constrição suave da garganta. O som do oceano deve ser tão audível na expiração quanto na inspiração. Mantenha a respiração suave e constante — evite apressar ou forçar.'
               )}</p>`,
        attachTo: { element: '#ub-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Plus
      steps.push({
        id: 'ub-plus-btn',
        text: `<h3>${t('Increase ratio', 'Aumentar proporção')}</h3>
               <p>${t(
                 'Use the plus button to raise both phases equally. Increase gradually — only when the current count feels entirely effortless and the ocean sound remains consistent throughout both the inhale and exhale.',
                 'Use o botão de mais para aumentar ambas as fases igualmente. Aumente gradualmente — apenas quando a contagem atual parecer completamente sem esforço e o som do oceano permanecer consistente durante a inspiração e a expiração.'
               )}</p>`,
        attachTo: { element: '#ub-plus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Duration
      steps.push({
        id: 'ub-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to stay on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#ub-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Start circle
      steps.push({
        id: 'ub-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm. Focus on the sound of your breath — that audible ocean quality is the sign that Ujjayi is working. Press again at any time to pause. Remember to save your results at the end.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Foque no som da sua respiração — essa qualidade audível de oceano é o sinal de que o Ujjayi está funcionando. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final.'
               )}</p>`,
        attachTo: { element: '#ub-start-ball', on: 'top' },
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

  minusRatioUB(): void {
    if (parseInt(this.inhaleInputUB.nativeElement.value) > 4) {
      this.inhaleInputUB.nativeElement.value = ((parseInt(this.inhaleInputUB.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputUB.nativeElement.value = ((parseInt(this.exhaleInputUB.nativeElement.value) || 0) - 1).toString();
    }
  }

  plusRatioUB(): void {
    if (parseInt(this.inhaleInputUB.nativeElement.value) < 30) {
      this.inhaleInputUB.nativeElement.value = ((parseInt(this.inhaleInputUB.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputUB.nativeElement.value = ((parseInt(this.exhaleInputUB.nativeElement.value) || 0) + 1).toString();
    }
  }

  async startUB(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsUB.nativeElement.disabled = true;
    this.questionUB.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnUB.nativeElement.disabled = true;
      this.inhaleUB = true;
      this.UBcountdownInput.nativeElement.style.display = 'inline';
      this.UBtimeInput.nativeElement.style.display = 'none';
      this.startCountdownUB();
      this.UBballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => { this.audioService.playSelectedSong(); }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => { this.UBballText.nativeElement.textContent = '2'; }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => { this.UBballText.nativeElement.textContent = '1'; }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.UBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        this.UBcurrentValue = parseInt(this.inhaleInputUB.nativeElement.value) + 2;
        await this.audioService.playBreathSound('inhaleBreath', this.UBcurrentValue - 1);
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputUB.nativeElement.value), this.UBball);
        this.UBinterval = setInterval(() => this.startTimerUB(), 1000);
        this.UBTimer = setInterval(() => this.DisplayTimerUB(), 1000);
        this.startBtnUB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsUB();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnUB.nativeElement.disabled = false;
      this.stopBtnUB.nativeElement.style.display = 'inline-flex';

      if (this.roundsUB > 0) {
        this.UBSave.nativeElement.disabled = false;
        this.UBSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsUB.nativeElement.disabled = false;
      this.questionUB.nativeElement.disabled = false;
      this.UBballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleUB) this.UBballText.nativeElement.textContent = 'Inspire';
        else if (this.exhaleUB) this.UBballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleUB) this.UBballText.nativeElement.textContent = 'Inhale';
        else if (this.exhaleUB) this.UBballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnUB.nativeElement.disabled = true;
      this.stopBtnUB.nativeElement.style.display = 'none';
      this.UBSave.nativeElement.disabled = true;
      this.UBSave.nativeElement.style.display = 'none';
      this.UBinterval = setInterval(() => this.startTimerUB(), 1000);
      this.UBTimer = setInterval(() => this.DisplayTimerUB(), 1000);
      this.startCountdownUB();
    }
  }

  startCountdownUB(): void {
    if (this.UBduration !== Infinity) {
      const Contdownminutes = Math.floor(this.UBduration / 60);
      const Contdownseconds = this.UBduration % 60;
      this.UBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.UBcountdown = setInterval(() => {
        if (this.UBduration === 0) {
          clearInterval(this.UBcountdown);
          this.UBcountdown = null;
        } else {
          this.UBduration--;
          const Contdownminutes = Math.floor(this.UBduration / 60);
          const Contdownseconds = this.UBduration % 60;
          this.UBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.UBcountdownInput.nativeElement.value = '∞';
      this.UBcountdownInput.nativeElement.style.display = 'inline';
      this.UBtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerUB(): Promise<void> {
    this.UBcurrentValue--;

    if (this.inhaleUB && this.UBcurrentValue === 1) {
      this.UBcurrentValue = parseInt(this.exhaleInputUB.nativeElement.value) + 2;
      this.inhaleUB = false;
      this.exhaleUB = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.UBcurrentValue - 1);
      this.UBballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1.3, parseInt(this.exhaleInputUB.nativeElement.value), this.UBball);
      this.roundsUB++;
      this.roundsDoneUB.nativeElement.innerHTML = this.roundsUB.toString();

    } else if (this.exhaleUB && this.UBcurrentValue === 1) {
      if (this.UBduration !== 0) {
        this.UBcurrentValue = parseInt(this.inhaleInputUB.nativeElement.value) + 2;
        this.exhaleUB = false;
        this.inhaleUB = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.UBcurrentValue - 1);
        this.UBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputUB.nativeElement.value), this.UBball);
      } else {
        this.clearIntervalsUB();
        localStorage.setItem('breathingON', 'false');
        this.startBtnUB.nativeElement.disabled = true;
        this.settingsUB.nativeElement.disabled = false;
        this.questionUB.nativeElement.disabled = false;
        this.stopBtnUB.nativeElement.disabled = false;
        this.stopBtnUB.nativeElement.style.display = 'inline-flex';
        this.UBSave.nativeElement.disabled = false;
        this.UBSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.UBball);
        this.UBcountdownInput.nativeElement.style.display = 'none';
        this.UBtimeInput.nativeElement.style.display = 'inline';
        this.UBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => { await this.audioService.playSound('normalbreath'); }, 1000);
      }
    }
  }

  DisplayTimerUB(): void {
    this.UBSeconds++;
    if (this.UBSeconds === 60) { this.UBSeconds = 0; this.UBMinutes++; }
    const M = this.UBMinutes < 10 ? '0' + this.UBMinutes : this.UBMinutes;
    const S = this.UBSeconds < 10 ? '0' + this.UBSeconds : this.UBSeconds;
    this.timerDisplayUB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopUB(): void {
    this.clearIntervalsUB();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.UBcountdownInput.nativeElement.style.display = 'none';
    this.UBtimeInput.nativeElement.style.display = 'inline';
    this.UBcurrentValue = parseInt(this.inhaleInputUB.nativeElement.value) + 1;
    this.startBtnUB.nativeElement.disabled = false;
    this.stopBtnUB.nativeElement.disabled = true;
    this.stopBtnUB.nativeElement.style.display = 'none';
    this.UBSave.nativeElement.disabled = true;
    this.UBSave.nativeElement.style.display = 'none';
    this.inhaleUB = true;
    this.exhaleUB = false;
    this.globalService.changeBall(1, 1, this.UBball);
    this.UBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsDoneUB.nativeElement.innerHTML = '0';
    this.timerDisplayUB.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setUBduration();
    this.UBSeconds = 0;
    this.UBMinutes = 0;
    this.roundsUB = 0;
  }

  saveUB(): void {
    this.UBResult = this.timerDisplayUB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('UBResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.UBResult, rounds: this.roundsUB });
    localStorage.setItem('UBResults', JSON.stringify(savedResults));
    this.UBResultSaved.nativeElement.style.display = 'block';
    this.stopUB();
  }

  clearIntervalsUB(): void {
    clearInterval(this.UBinterval);
    clearInterval(this.UBcountdown);
    clearInterval(this.UBTimer);
    this.UBinterval = null;
    this.UBcountdown = null;
    this.UBTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopUB();
    if (this.UBResultSaved?.nativeElement) {
      this.UBResultSaved.nativeElement.style.display = 'none';
    }
  }
}