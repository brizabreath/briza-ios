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
  selector: 'app-rb',
  templateUrl: './rb.page.html',
  styleUrls: ['./rb.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class RBPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionRB') questionRB!: ElementRef<HTMLButtonElement>;
  @ViewChild('RBball') RBball!: ElementRef<HTMLDivElement>;
  @ViewChild('RBballText') RBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('RBtimeInput') RBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('RBcountdownInput') RBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnRB') startBtnRB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnRB') stopBtnRB!: ElementRef<HTMLButtonElement>;
  @ViewChild('RBSave') RBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsRB') settingsRB!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputRB') inhaleInputRB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputRB') hold1InputRB!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputRB') exhaleInputRB!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneRB') roundsDoneRB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayRB') timerDisplayRB!: ElementRef<HTMLDivElement>;
  @ViewChild('RBResultSaved') RBResultSaved!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleRB = true;
  private hold1RB = false;
  private exhaleRB = false;
  private RBinterval: any = null;
  private RBcountdown: any = null;
  private RBcurrentValue = 5;
  private RBduration = 0;
  private roundsRB = 0;
  private RBSeconds = 0;
  private RBMinutes = 0;
  private RBTimer: any = null;
  private RBResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let RBi = 2; RBi <= 60; RBi++) {
      const RBoption = document.createElement('option');
      RBoption.value = (RBi * 60).toString();
      RBoption.textContent = this.isPortuguese ? `${RBi} minutos` : `${RBi} minutes`;
      this.RBtimeInput.nativeElement.appendChild(RBoption);
    }

    this.startBtnRB.nativeElement.onclick = () => this.startRB();
    this.stopBtnRB.nativeElement.onclick = () => this.stopRB();
    this.RBSave.nativeElement.onclick = () => this.saveRB();

    this.stopBtnRB.nativeElement.disabled = true;
    this.stopBtnRB.nativeElement.style.display = 'none';
    this.RBSave.nativeElement.disabled = true;
    this.RBSave.nativeElement.style.display = 'none';

    this.RBtimeInput.nativeElement.onchange = () => this.setRBduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setRBduration(): void {
    const selectedValue = this.RBtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.RBduration = Infinity;
    } else {
      this.RBduration = parseInt(selectedValue, 10);
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
          await this.startRB();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopRB();
        }
      }
    });

    this.RBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setRBduration();
    this.RBResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('rb_guide_seen')) {
      localStorage.setItem('rb_guide_seen', 'true');
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
        id: 'rb-intro',
        text: `<h3>${t('4-7-8 Breathing', 'Respiração 4-7-8')}</h3>
               <p>${t(
                 'The 4-7-8 technique is based on deep diaphragmatic breathing and activates the body\'s relaxation response. By slowing the breath and focusing on the pattern, the mind becomes calmer and more centred. It is particularly effective for stress, anxiety, and preparing for sleep.',
                 'A técnica 4-7-8 é baseada na respiração diafragmática profunda e ativa a resposta de relaxamento do corpo. Ao desacelerar a respiração e focar no padrão, a mente fica mais calma e centrada. É particularmente eficaz para estresse, ansiedade e preparação para o sono.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'rb-posture',
        text: `<h3>${t('Get comfortable', 'Fique confortável')}</h3>
               <p>${t(
                 'Find a comfortable seat or lay down. Relax your shoulders, face muscles and jaw. Place your tongue on the roof of your mouth, its tip touching the top of your front teeth.',
                 'Encontre um assento confortável ou deite-se. Relaxe os ombros, os músculos faciais e a mandíbula. Coloque a língua no céu da boca, a ponta deve tocar o topo dos seus dentes da frente.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Inhale
      steps.push({
        id: 'rb-inhale-item',
        text: `<h3>${t('Inhale — 4 seconds', 'Inspire — 4 segundos')}</h3>
               <p>${t(
                 'Breathe in slowly and quietly through the nose for 4 seconds. Fill your lungs from the bottom up, letting the belly expand first.',
                 'Inspire lenta e silenciosamente pelo nariz por 4 segundos. Encha os pulmões de baixo para cima, deixando a barriga expandir primeiro.'
               )}</p>`,
        attachTo: { element: '#rb-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Hold
      steps.push({
        id: 'rb-hold-item',
        text: `<h3>${t('Hold — 7 seconds', 'Segure — 7 segundos')}</h3>
               <p>${t(
                 'Hold your breath for 7 seconds. Keep your body completely relaxed — this is the most important phase. The extended hold allows oxygen to fully saturate the bloodstream and deepens the calming effect.',
                 'Segure a respiração por 7 segundos. Mantenha o corpo completamente relaxado — esta é a fase mais importante. A retenção prolongada permite que o oxigênio sature completamente a corrente sanguínea e aprofunda o efeito calmante.'
               )}</p>`,
        attachTo: { element: '#rb-hold-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Exhale
      steps.push({
        id: 'rb-exhale-item',
        text: `<h3>${t('Exhale — 8 seconds', 'Espire — 8 segundos')}</h3>
               <p>${t(
                 'Exhale completely through the nose for 8 seconds. The exhale is intentionally the longest phase — this extended release activates the parasympathetic nervous system and is what produces the relaxation effect.',
                 'Expire completamente pelo nariz por 8 segundos. A expiração é intencionalmente a fase mais longa — essa liberação prolongada ativa o sistema nervoso parassimpático e é o que produz o efeito de relaxamento.'
               )}</p>`,
        attachTo: { element: '#rb-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Duration
      steps.push({
        id: 'rb-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. Even just a few rounds can have a noticeable effect. You can set it to infinite and stop whenever you feel ready.',
                 'Selecione por quanto tempo deseja que a sessão dure. Mesmo algumas rodadas podem ter um efeito perceptível. Você pode deixar no infinito e parar quando quiser.'
               )}</p>`,
        attachTo: { element: '#rb-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Start circle
      steps.push({
        id: 'rb-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm. Press it again at any time to pause. Remember to save your results at the end to track your progress over time.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final para acompanhar sua evolução.'
               )}</p>`,
        attachTo: { element: '#rb-start-ball', on: 'top' },
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

  async startRB(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsRB.nativeElement.disabled = true;
    this.questionRB.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnRB.nativeElement.disabled = true;
      this.inhaleRB = true;
      this.RBcountdownInput.nativeElement.style.display = 'inline';
      this.RBtimeInput.nativeElement.style.display = 'none';
      this.startCountdownRB();
      this.RBballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => { this.audioService.playSelectedSong(); }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => { this.RBballText.nativeElement.textContent = '2'; }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => { this.RBballText.nativeElement.textContent = '1'; }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.RBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        this.RBcurrentValue = parseInt(this.inhaleInputRB.nativeElement.value) + 1;
        await this.audioService.playBreathSound('inhaleBreath', this.RBcurrentValue);
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputRB.nativeElement.value), this.RBball);
        this.RBinterval = setInterval(() => this.startTimerRB(), 1000);
        this.RBTimer = setInterval(() => this.DisplayTimerRB(), 1000);
        this.startBtnRB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsRB();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnRB.nativeElement.disabled = false;
      this.stopBtnRB.nativeElement.style.display = 'inline-flex';

      if (this.roundsRB > 0) {
        this.RBSave.nativeElement.disabled = false;
        this.RBSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsRB.nativeElement.disabled = false;
      this.questionRB.nativeElement.disabled = false;
      this.RBballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleRB) this.RBballText.nativeElement.textContent = 'Inspire';
        else if (this.hold1RB) this.RBballText.nativeElement.textContent = 'Segure';
        else if (this.exhaleRB) this.RBballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleRB) this.RBballText.nativeElement.textContent = 'Inhale';
        else if (this.hold1RB) this.RBballText.nativeElement.textContent = 'Hold';
        else if (this.exhaleRB) this.RBballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnRB.nativeElement.disabled = true;
      this.stopBtnRB.nativeElement.style.display = 'none';
      this.RBSave.nativeElement.disabled = true;
      this.RBSave.nativeElement.style.display = 'none';
      this.RBinterval = setInterval(() => this.startTimerRB(), 1000);
      this.RBTimer = setInterval(() => this.DisplayTimerRB(), 1000);
      this.startCountdownRB();
    }
  }

  startCountdownRB(): void {
    if (this.RBduration !== Infinity) {
      const Contdownminutes = Math.floor(this.RBduration / 60);
      const Contdownseconds = this.RBduration % 60;
      this.RBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.RBcountdown = setInterval(() => {
        if (this.RBduration === 0) {
          clearInterval(this.RBcountdown);
          this.RBcountdown = null;
        } else {
          this.RBduration--;
          const Contdownminutes = Math.floor(this.RBduration / 60);
          const Contdownseconds = this.RBduration % 60;
          this.RBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.RBcountdownInput.nativeElement.value = '∞';
      this.RBcountdownInput.nativeElement.style.display = 'inline';
      this.RBtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerRB(): Promise<void> {
    this.RBcurrentValue--;

    if (this.inhaleRB && this.RBcurrentValue === 1) {
      this.RBcurrentValue = parseInt(this.hold1InputRB.nativeElement.value) + 1;
      this.inhaleRB = false;
      this.hold1RB = true;
      await this.audioService.playSound('hold');
      this.RBballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
      this.globalService.changeBall(1.3, parseInt(this.hold1InputRB.nativeElement.value), this.RBball);

    } else if (this.hold1RB && this.RBcurrentValue === 1) {
      this.RBcurrentValue = parseInt(this.exhaleInputRB.nativeElement.value) + 1;
      this.hold1RB = false;
      this.exhaleRB = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.RBcurrentValue);
      this.RBballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, parseInt(this.exhaleInputRB.nativeElement.value), this.RBball);
      this.roundsRB++;
      this.roundsDoneRB.nativeElement.innerHTML = this.roundsRB.toString();

    } else if (this.exhaleRB && this.RBcurrentValue === 1) {
      if (this.RBduration !== 0) {
        this.RBcurrentValue = parseInt(this.inhaleInputRB.nativeElement.value) + 1;
        this.exhaleRB = false;
        this.inhaleRB = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.RBcurrentValue);
        this.RBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputRB.nativeElement.value), this.RBball);
      } else {
        this.clearIntervalsRB();
        localStorage.setItem('breathingON', 'false');
        this.startBtnRB.nativeElement.disabled = true;
        this.settingsRB.nativeElement.disabled = false;
        this.questionRB.nativeElement.disabled = false;
        this.stopBtnRB.nativeElement.disabled = false;
        this.stopBtnRB.nativeElement.style.display = 'inline-flex';
        this.RBSave.nativeElement.disabled = false;
        this.RBSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.RBball);
        this.RBcountdownInput.nativeElement.style.display = 'none';
        this.RBtimeInput.nativeElement.style.display = 'inline';
        this.RBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => { await this.audioService.playSound('normalbreath'); }, 1000);
      }
    }
  }

  DisplayTimerRB(): void {
    this.RBSeconds++;
    if (this.RBSeconds === 60) { this.RBSeconds = 0; this.RBMinutes++; }
    const M = this.RBMinutes < 10 ? '0' + this.RBMinutes : this.RBMinutes;
    const S = this.RBSeconds < 10 ? '0' + this.RBSeconds : this.RBSeconds;
    this.timerDisplayRB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopRB(): void {
    this.clearIntervalsRB();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.RBcountdownInput.nativeElement.style.display = 'none';
    this.RBtimeInput.nativeElement.style.display = 'inline';
    this.RBcurrentValue = parseInt(this.inhaleInputRB.nativeElement.value) + 1;
    this.startBtnRB.nativeElement.disabled = false;
    this.stopBtnRB.nativeElement.disabled = true;
    this.stopBtnRB.nativeElement.style.display = 'none';
    this.RBSave.nativeElement.disabled = true;
    this.RBSave.nativeElement.style.display = 'none';
    this.inhaleRB = true;
    this.hold1RB = false;
    this.exhaleRB = false;
    this.globalService.changeBall(1, 1, this.RBball);
    this.RBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsRB = 0;
    this.roundsDoneRB.nativeElement.innerHTML = '0';
    this.timerDisplayRB.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setRBduration();
    this.RBSeconds = 0;
    this.RBMinutes = 0;
  }

  saveRB(): void {
    this.RBResult = this.timerDisplayRB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('RBResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.RBResult, rounds: this.roundsRB });
    localStorage.setItem('RBResults', JSON.stringify(savedResults));
    this.RBResultSaved.nativeElement.style.display = 'block';
    this.stopRB();
  }

  clearIntervalsRB(): void {
    clearInterval(this.RBinterval);
    clearInterval(this.RBcountdown);
    clearInterval(this.RBTimer);
    this.RBinterval = null;
    this.RBcountdown = null;
    this.RBTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopRB();
    if (this.RBResultSaved?.nativeElement) {
      this.RBResultSaved.nativeElement.style.display = 'none';
    }
  }
}