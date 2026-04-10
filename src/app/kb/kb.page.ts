import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AudioService } from '../services/audio.service';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ShepherdService } from 'angular-shepherd';

@Component({
  selector: 'app-kb',
  templateUrl: './kb.page.html',
  styleUrls: ['./kb.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class KBPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionKB') questionKB!: ElementRef<HTMLButtonElement>;
  @ViewChild('KBball') KBball!: ElementRef<HTMLDivElement>;
  @ViewChild('KBballText') KBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('KBtimeInput') KBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('KBcountdownInput') KBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnKB') startBtnKB!: ElementRef<HTMLButtonElement>;
  @ViewChild('KBReset') KBReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('KBSave') KBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsKB') settingsKB!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneKB') roundsDoneKB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayKB') timerDisplayKB!: ElementRef<HTMLDivElement>;
  @ViewChild('KBResultSaved') KBResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('KBResults') KBResults!: ElementRef<HTMLDivElement>;
  @ViewChild('breathsInputKB') breathsInputKB!: ElementRef<HTMLInputElement>;
  @ViewChild('fixedRoundsModalKB') fixedRoundsModalKB!: ElementRef<HTMLDivElement>;

  showFixedRoundButton = false;
  fixedRoundDurations: { minutes: number; seconds: number }[] = [];
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private breathsKB = true;
  private hold1KB = false;
  private hold2KB = false;
  private KBinterval: any = null;
  private KBcurrentValue = 0;
  private KBduration = 0;
  private KBSeconds = 0;
  private KBMinutes = 0;
  private roundsKB = 0;
  private KBTimer: any = null;
  private KBroundsResults: any[] = [];
  private KBbreaths: any = null;
  private KBbreathSpeed: any = null;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let KBi = 2; KBi <= 8; KBi++) {
      const KBoption = document.createElement('option');
      KBoption.value = KBi.toString();
      KBoption.textContent = this.isPortuguese ? `${KBi} rodadas` : `${KBi} rounds`;
      this.KBtimeInput.nativeElement.appendChild(KBoption);
    }

    this.startBtnKB.nativeElement.onclick = () => this.startKB();
    this.KBReset.nativeElement.onclick = () => this.stopKB();
    this.KBSave.nativeElement.onclick = () => this.saveKB();

    this.KBReset.nativeElement.disabled = true;
    this.KBReset.nativeElement.style.display = 'none';
    this.KBSave.nativeElement.disabled = true;
    this.KBSave.nativeElement.style.display = 'none';

    this.KBtimeInput.nativeElement.onchange = () => this.setKBduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');

    this.globalService.changeBall(1, 1, this.KBball);
  }

  openFixedRoundsModal(): void {
    this.fixedRoundsModalKB.nativeElement.style.display = 'block';
  }

  closeFixedRoundsModal(): void {
    this.fixedRoundsModalKB.nativeElement.style.display = 'none';
  }

  setKBduration(): void {
    const selectedValue = this.KBtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.KBduration = Infinity;
      this.showFixedRoundButton = false;
      this.fixedRoundDurations = [];
    } else {
      this.KBduration = parseInt(selectedValue, 10);
      this.showFixedRoundButton = true;
      this.fixedRoundDurations = Array.from({ length: this.KBduration }, (_, i) => {
        return this.fixedRoundDurations[i] || { minutes: 0, seconds: 0 };
      });
    }
  }

  async ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.KBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setKBduration();
    this.KBResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();

    this.KBbreaths = localStorage.getItem('numberOfBreaths');
    if (this.KBbreaths === null) {
      this.KBbreaths = 31;
      localStorage.setItem('numberOfBreaths', this.KBbreaths.toString());
    } else {
      this.KBbreaths = parseInt(this.KBbreaths);
    }

    this.KBbreathSpeed = localStorage.getItem('KBspeedOfBreaths');
    if (this.KBbreathSpeed === null) {
      this.KBbreathSpeed = 600;
      localStorage.setItem('KBspeedOfBreaths', this.KBbreathSpeed.toString());
    } else {
      this.KBbreathSpeed = parseInt(this.KBbreathSpeed);
    }

    this.breathsInputKB.nativeElement.value = (this.KBbreaths - 1).toString();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('kb_guide_seen')) {
      localStorage.setItem('kb_guide_seen', 'true');
      this.startGuide();
    }
  }

  ionViewWillLeave() {
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
        id: 'kb-intro',
        text: `<h3>${t('Kapalabhati', 'Kapalabhati')}</h3>
               <p>${t(
                 'Kapalabhati is a yogic breathing technique involving rapid, forceful exhalations followed by passive inhalations. It stimulates the sympathetic nervous system to increase energy and vitality. Practice on an empty stomach and avoid if you have high blood pressure, heart disease, or other medical conditions.',
                 'Kapalabhati é uma técnica de respiração yogi com exalações rápidas e vigorosas seguidas de inalações passivas. Estimula o sistema nervoso simpático para aumentar energia e vitalidade. Pratique com o estômago vazio e evite se tiver pressão alta, doenças cardíacas ou outras condições médicas.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Rounds selector
      steps.push({
        id: 'kb-rounds-box',
        text: `<h3>${t('Choose number of rounds', 'Escolha o número de rodadas')}</h3>
               <p>${t(
                 'Select how many rounds you want to complete. When you select a fixed number, you can also set target hold times for each round using the "Set holding times" button that appears.',
                 'Escolha quantas rodadas deseja completar. Ao selecionar um número fixo, você também pode definir tempos de retenção para cada rodada usando o botão "Definir tempos de retenção" que aparece.'
               )}</p>`,
        attachTo: { element: '#kb-rounds-box', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Breaths
      steps.push({
        id: 'kb-breaths-item',
        text: `<h3>${t('Number of breaths', 'Número de respirações')}</h3>
               <p>${t(
                 'This shows the number of rapid breaths per round, set in Settings. Inhale deeply through the nose, then exhale forcefully while contracting your abdominal muscles to push air out in short bursts. Relax the belly and passively inhale. Repeat rapidly.',
                 'Isso mostra o número de respirações rápidas por rodada, definido nas Configurações. Inspire profundamente pelo nariz, depois expire vigorosamente contraindo os músculos abdominais para empurrar o ar em rajadas curtas. Relaxe a barriga e inale passivamente. Repita rapidamente.'
               )}</p>`,
        attachTo: { element: '#kb-breaths-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Hold
      steps.push({
        id: 'kb-hold-item',
        text: `<h3>${t('Breath hold', 'Retenção')}</h3>
               <p>${t(
                 'After completing the rapid breaths, take a deep breath in and hold your breath for as long as you can with empty lungs. Stay calm and focus on your heartbeat. Press the circle the moment you can no longer hold.',
                 'Após completar as respirações rápidas, inspire profundamente e segure a respiração pelo maior tempo que puder com os pulmões cheios. Fique calmo e foque no seu batimento cardíaco. Pressione o círculo quando não conseguir mais segurar.'
               )}</p>`,
        attachTo: { element: '#kb-hold-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Recovery
      steps.push({
        id: 'kb-recovery-item',
        text: `<h3>${t('Recovery hold — 30 seconds', 'Retenção de recuperação — 30 segundos')}</h3>
               <p>${t(
                 'After releasing, inhale fully and hold again for 30 seconds in the recovery round. This pressurised hold helps distribute the oxygen built up during the rapid breathing phase. Then a new round begins.',
                 'Após soltar, inspire completamente e segure novamente por 30 segundos na rodada de recuperação. Essa retenção pressurizada ajuda a distribuir o oxigênio acumulado durante a fase de respiração rápida. Então uma nova rodada começa.'
               )}</p>`,
        attachTo: { element: '#kb-recovery-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Start circle
      steps.push({
        id: 'kb-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start the guided rapid breathing. Press it again during the breath hold when you can no longer hold. Never practice this technique in water or any place where losing consciousness could be dangerous. Remember to save your results at the end.',
                 'Pressione o círculo para iniciar a respiração rápida guiada. Pressione novamente durante a retenção quando não conseguir mais segurar. Nunca pratique esta técnica na água ou em lugar onde perder a consciência possa ser perigoso. Lembre-se de salvar seus resultados ao final.'
               )}</p>`,
        attachTo: { element: '#kb-start-ball', on: 'top' },
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

  async startKB(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsKB.nativeElement.disabled = true;
    this.questionKB.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnKB.nativeElement.disabled = true;
      this.breathsKB = true;
      this.KBcountdownInput.nativeElement.style.display = 'inline';
      this.KBtimeInput.nativeElement.style.display = 'none';
      this.startCountdownKB();
      this.KBballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => { this.audioService.playSelectedSong(); }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => { this.KBballText.nativeElement.textContent = '2'; }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(async () => {
        this.KBballText.nativeElement.textContent = '1';
        await this.audioService.playSound('inhale');
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(() => {
        this.KBballText.nativeElement.textContent = this.isPortuguese ? 'Comece' : 'Get started';
        this.KBinterval = setInterval(async () => {
          await this.audioService.playBreath('fullyout2');
          this.globalService.changeBall(1.3, 0.2, this.KBball);
          this.startBreathsKB();
        }, this.KBbreathSpeed);
        this.KBTimer = setInterval(() => this.DisplayTimerKB(), 1000);
        this.startBtnKB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      if (!this.hold1KB) {
        this.clearIntervalsKB();
        localStorage.setItem('breathingON', 'false');
        this.KBReset.nativeElement.disabled = false;
        this.KBReset.nativeElement.style.display = 'inline-flex';

        if (this.roundsKB > 0) {
          this.KBSave.nativeElement.disabled = false;
          this.KBSave.nativeElement.style.display = 'inline-flex';
        }

        this.settingsKB.nativeElement.disabled = false;
        this.questionKB.nativeElement.disabled = false;
        this.KBballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
        this.audioService.pauseSelectedSong();
        this.globalService.changeBall(1.3, 1, this.KBball);
      } else {
        await this.pauseKB();
      }

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.hold2KB) this.KBballText.nativeElement.textContent = 'Segure';
        else if (this.breathsKB) this.KBballText.nativeElement.textContent = 'Respire';
      } else {
        if (this.hold2KB) this.KBballText.nativeElement.textContent = 'Hold';
        else if (this.breathsKB) this.KBballText.nativeElement.textContent = 'Breath';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.KBReset.nativeElement.disabled = true;
      this.KBReset.nativeElement.style.display = 'none';
      this.KBSave.nativeElement.disabled = true;
      this.KBSave.nativeElement.style.display = 'none';

      if (this.hold2KB) {
        this.KBinterval = setInterval(() => this.startTimerKB(), 1000);
        this.KBTimer = setInterval(() => this.DisplayTimerKB(), 1000);
      } else if (this.breathsKB) {
        this.KBinterval = setInterval(async () => {
          await this.audioService.playBreath('fullyout2');
          this.globalService.changeBall(1.3, this.KBbreathSpeed / 2000, this.KBball);
          this.startBreathsKB();
        }, this.KBbreathSpeed);
        this.KBTimer = setInterval(() => this.DisplayTimerKB(), 1000);
      }
    }
  }

  async startBreathsKB(): Promise<void> {
    this.KBbreaths--;
    if (this.KBbreaths < 1) {
      this.globalService.changeBall(0.5, 1, this.KBball);
      clearInterval(this.KBinterval);
      this.KBinterval = null;
      this.globalService.changeBall(1.3, 1, this.KBball);
      this.breathsKB = false;
      this.hold1KB = true;
      this.KBbreaths = parseInt(this.breathsInputKB.nativeElement.value) + 1;

      await this.audioService.playBell('bell');
      this.startBtnKB.nativeElement.disabled = true;

      const timeoutId9 = setTimeout(async () => {
        this.KBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire e Segure' : 'Inhale and Hold';
        await this.audioService.playSound('fullyinHold');
        await this.audioService.playBreathSound('inhaleBreath', 2);
      }, 700);
      this.globalService.timeouts.push(timeoutId9);

      const timeoutId8 = setTimeout(() => {
        this.KBinterval = setInterval(() => this.startTimerKB(), 1000);
        this.startBtnKB.nativeElement.disabled = false;
      }, 2000);
      this.globalService.timeouts.push(timeoutId8);
    } else {
      this.KBballText.nativeElement.textContent = this.KBbreaths.toString();
      const timeoutId6 = setTimeout(() => {
        this.globalService.changeBall(0.5, this.KBbreathSpeed / 2000, this.KBball);
      }, this.KBbreathSpeed / 2);
      this.globalService.timeouts.push(timeoutId6);
    }
  }

  startCountdownKB(): void {
    if (this.KBduration !== Infinity) {
      if (this.KBduration <= 1) {
        this.KBcountdownInput.nativeElement.value = this.isPortuguese ? 'Rodada final' : 'Final round';
      } else {
        this.KBcountdownInput.nativeElement.value = this.isPortuguese
          ? `${this.KBduration} rodadas restantes`
          : `${this.KBduration} rounds left`;
      }
    } else {
      this.KBcountdownInput.nativeElement.value = '∞';
      this.KBcountdownInput.nativeElement.style.display = 'inline';
      this.KBtimeInput.nativeElement.style.display = 'none';
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  getRoundTime(roundIndex: number): number {
    const round = this.fixedRoundDurations[roundIndex];
    if (!round) return 0;
    return round.minutes * 60 + round.seconds;
  }

  async startTimerKB(): Promise<void> {
    if (this.hold2KB) {
      this.KBcurrentValue--;
      this.KBballText.nativeElement.textContent = this.isPortuguese
        ? `${this.KBcurrentValue} segundos`
        : `${this.KBcurrentValue} seconds`;
    }

    if (this.hold1KB) {
      this.KBcurrentValue++;
      this.KBballText.nativeElement.textContent = this.formatTime(this.KBcurrentValue);

      const roundTime = this.getRoundTime(this.roundsKB);
      if (roundTime > 0 && this.KBcurrentValue >= roundTime) {
        await this.pauseKB();
      }
    }

    if (this.hold2KB && this.KBcurrentValue === 1) {
      if (this.KBduration !== 0) {
        this.hold2KB = false;
        this.breathsKB = true;
        this.KBcurrentValue = 0;
        clearInterval(this.KBinterval);
        this.KBinterval = null;
        this.KBballText.nativeElement.textContent = this.isPortuguese ? 'Próximo Round' : 'Next Round';
        await this.audioService.playSound('nextRound');

        const timeoutId7 = setTimeout(() => {
          this.KBinterval = setInterval(async () => {
            await this.audioService.playBreath('fullyout2');
            this.globalService.changeBall(1.3, this.KBbreathSpeed / 2000, this.KBball);
            this.startBreathsKB();
          }, this.KBbreathSpeed);
        }, 2000);
        this.globalService.timeouts.push(timeoutId7);
      } else {
        this.clearIntervalsKB();
        localStorage.setItem('breathingON', 'false');
        this.startBtnKB.nativeElement.disabled = true;
        this.settingsKB.nativeElement.disabled = false;
        this.questionKB.nativeElement.disabled = false;
        this.KBReset.nativeElement.disabled = false;
        this.KBReset.nativeElement.style.display = 'inline-flex';
        this.KBSave.nativeElement.disabled = false;
        this.KBSave.nativeElement.style.display = 'inline-flex';
        this.KBcountdownInput.nativeElement.style.display = 'none';
        this.KBtimeInput.nativeElement.style.display = 'inline';
        this.KBballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Normal' : 'Normal Breathing';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => { await this.audioService.playSound('normalbreath'); }, 1000);
      }
    }
  }

  DisplayTimerKB(): void {
    this.KBSeconds++;
    if (this.KBSeconds === 60) { this.KBSeconds = 0; this.KBMinutes++; }
    const M = this.KBMinutes < 10 ? '0' + this.KBMinutes : this.KBMinutes;
    const S = this.KBSeconds < 10 ? '0' + this.KBSeconds : this.KBSeconds;
    this.timerDisplayKB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopKB(): void {
    this.clearIntervalsKB();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.KBcountdownInput.nativeElement.style.display = 'none';
    this.KBtimeInput.nativeElement.style.display = 'inline';
    this.KBcurrentValue = 0;
    this.startBtnKB.nativeElement.disabled = false;
    this.KBReset.nativeElement.disabled = true;
    this.KBReset.nativeElement.style.display = 'none';
    this.KBSave.nativeElement.disabled = true;
    this.KBSave.nativeElement.style.display = 'none';
    this.breathsKB = true;
    this.hold2KB = false;
    this.hold1KB = false;
    this.KBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsKB = 0;
    this.roundsDoneKB.nativeElement.innerHTML = '0';
    this.timerDisplayKB.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setKBduration();
    this.KBSeconds = 0;
    this.KBMinutes = 0;
    this.roundsKB = 0;
    this.KBResults.nativeElement.innerHTML = '';
    this.globalService.changeBall(1.3, 1, this.KBball);
  }

  async pauseKB(): Promise<void> {
    clearInterval(this.KBinterval);
    this.KBinterval = null;
    this.KBballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Normal' : 'Normal Breath';
    await this.audioService.playSound('normalbreath');
    this.hold1KB = false;
    this.hold2KB = true;
    this.roundsKB++;
    this.roundsDoneKB.nativeElement.innerHTML = this.roundsKB.toString();
    this.KBduration = this.KBduration - 1;

    if (this.KBduration !== Infinity) {
      if (this.KBduration <= 1) {
        this.KBcountdownInput.nativeElement.value = this.isPortuguese ? 'Rodada final' : 'Final round';
      } else {
        this.KBcountdownInput.nativeElement.value = this.isPortuguese
          ? `${this.KBduration} rodadas restantes`
          : `${this.KBduration} rounds left`;
      }
    } else {
      this.KBcountdownInput.nativeElement.value = '∞';
    }

    this.KBResults.nativeElement.innerHTML += `<div class='NOfSteps'><div>Round ${this.roundsKB}</div><div>${this.formatTime(this.KBcurrentValue)}</div></div>`;
    this.KBroundsResults.push(this.KBcurrentValue);
    this.KBcurrentValue = 31;
    this.KBinterval = setInterval(() => this.startTimerKB(), 1000);
  }

  saveKB(): void {
    const savedResults = JSON.parse(localStorage.getItem('KBResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), roundsResult: this.KBroundsResults, result: this.timerDisplayKB.nativeElement.innerHTML, rounds: this.roundsKB });
    localStorage.setItem('KBResults', JSON.stringify(savedResults));
    this.KBResultSaved.nativeElement.style.display = 'block';
    this.stopKB();
    this.KBroundsResults = [];
  }

  clearIntervalsKB(): void {
    clearInterval(this.KBinterval);
    clearInterval(this.KBTimer);
    this.KBinterval = null;
    this.KBTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopKB();
    if (this.KBResultSaved?.nativeElement) {
      this.KBResultSaved.nativeElement.style.display = 'none';
    }
  }
}