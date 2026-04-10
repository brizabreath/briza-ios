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
  selector: 'app-wh',
  templateUrl: './wh.page.html',
  styleUrls: ['./wh.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class WHPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionWH') questionWH!: ElementRef<HTMLButtonElement>;
  @ViewChild('WHball') WHball!: ElementRef<HTMLDivElement>;
  @ViewChild('WHballText') WHballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('WHtimeInput') WHtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('WHcountdownInput') WHcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnWH') startBtnWH!: ElementRef<HTMLButtonElement>;
  @ViewChild('WHReset') WHReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('WHSave') WHSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsWH') settingsWH!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneWH') roundsDoneWH!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayWH') timerDisplayWH!: ElementRef<HTMLDivElement>;
  @ViewChild('WHResultSaved') WHResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('WHResults') WHResults!: ElementRef<HTMLDivElement>;
  @ViewChild('breathsInputWH') breathsInputWH!: ElementRef<HTMLInputElement>;
  @ViewChild('fixedRoundsModal') fixedRoundsModal!: ElementRef<HTMLDivElement>;

  showFixedRoundButton = false;
  fixedRoundDurations: { minutes: number; seconds: number }[] = [];
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private breathsWH = true;
  private hold1WH = false;
  private hold2WH = false;
  private WHinterval: any = null;
  private WHcurrentValue = 0;
  private WHduration = 0;
  private WHSeconds = 0;
  private WHMinutes = 0;
  private roundsWH = 0;
  private WHTimer: any = null;
  private WHroundsResults: any[] = [];
  private WHbreaths: any = null;
  private WHbreathSpeed: any = null;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let WHi = 2; WHi <= 8; WHi++) {
      const WHoption = document.createElement('option');
      WHoption.value = WHi.toString();
      WHoption.textContent = this.isPortuguese ? `${WHi} rodadas` : `${WHi} rounds`;
      this.WHtimeInput.nativeElement.appendChild(WHoption);
    }

    this.startBtnWH.nativeElement.onclick = () => this.startWH();
    this.WHReset.nativeElement.onclick = () => this.stopWH();
    this.WHSave.nativeElement.onclick = () => this.saveWH();

    this.WHReset.nativeElement.disabled = true;
    this.WHReset.nativeElement.style.display = 'none';
    this.WHSave.nativeElement.disabled = true;
    this.WHSave.nativeElement.style.display = 'none';

    this.WHtimeInput.nativeElement.onchange = () => this.setWHduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');

    this.globalService.changeBall(1, 1, this.WHball);
  }

  openFixedRoundsModal(): void { this.fixedRoundsModal.nativeElement.style.display = 'block'; }
  closeFixedRoundsModal(): void { this.fixedRoundsModal.nativeElement.style.display = 'none'; }

  setWHduration(): void {
    const selectedValue = this.WHtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.WHduration = Infinity;
      this.showFixedRoundButton = false;
      this.fixedRoundDurations = [];
    } else {
      this.WHduration = parseInt(selectedValue, 10);
      this.showFixedRoundButton = true;
      this.fixedRoundDurations = Array.from({ length: this.WHduration }, (_, i) => {
        return this.fixedRoundDurations[i] || { minutes: 0, seconds: 0 };
      });
    }
  }

  async ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.WHballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setWHduration();
    this.WHResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();

    this.WHbreaths = localStorage.getItem('numberOfBreaths');
    if (this.WHbreaths === null) {
      this.WHbreaths = 31;
      localStorage.setItem('numberOfBreaths', this.WHbreaths.toString());
    } else {
      this.WHbreaths = parseInt(this.WHbreaths);
    }

    this.WHbreathSpeed = localStorage.getItem('speedOfBreaths');
    if (this.WHbreathSpeed === null) {
      this.WHbreathSpeed = 3000;
      localStorage.setItem('speedOfBreaths', this.WHbreathSpeed.toString());
    } else {
      this.WHbreathSpeed = parseInt(this.WHbreathSpeed);
    }

    this.breathsInputWH.nativeElement.value = (this.WHbreaths - 1).toString();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('wh_guide_seen')) {
      localStorage.setItem('wh_guide_seen', 'true');
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
        id: 'wh-intro',
        text: `<h3>${t('Oxygen Boost', 'Boost de Oxigênio')}</h3>
               <p>${t(
                 'This controlled hyperventilation technique is based on diaphragmatic and circular breathing. The rapid breathing phase fully oxygenates your body, which then allows you to hold your breath with empty lungs for extended periods. It is safe on land but must never be practiced in or near water.',
                 'Esta técnica de hiperventilação controlada é baseada na respiração diafragmática e circular. A fase de respiração rápida oxigena completamente o seu corpo, permitindo então segurar a respiração com os pulmões vazios por períodos prolongados. É segura em terra, mas nunca deve ser praticada dentro ou perto da água.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Rounds
      steps.push({
        id: 'wh-rounds-box',
        text: `<h3>${t('Choose number of rounds', 'Escolha o número de rodadas')}</h3>
               <p>${t(
                 'Select how many rounds you want to complete. When you select a fixed number, you can set target hold times for each round using the "Set holding times" button that appears below.',
                 'Escolha quantas rodadas deseja completar. Ao selecionar um número fixo, você pode definir tempos de retenção para cada rodada usando o botão "Definir tempos de retenção" que aparece abaixo.'
               )}</p>`,
        attachTo: { element: '#wh-rounds-box', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Breaths
      steps.push({
        id: 'wh-breaths-item',
        text: `<h3>${t('Number of breaths', 'Número de respirações')}</h3>
               <p>${t(
                 'This shows the number of rapid breaths per round, set in Settings. Breathe in fully through your nose or mouth, then exhale forcefully. The exhalation should be strong — this is what drives the oxygenation effect. Repeat rapidly for the full count.',
                 'Isso mostra o número de respirações rápidas por rodada, definido nas Configurações. Inspire completamente pelo nariz ou boca, depois expire com força. A expiração deve ser forte — é isso que impulsiona o efeito de oxigenação. Repita rapidamente pelo número total.'
               )}</p>`,
        attachTo: { element: '#wh-breaths-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Hold
      steps.push({
        id: 'wh-hold-item',
        text: `<h3>${t('Breath hold', 'Retenção')}</h3>
               <p>${t(
                 'After the rapid breathing, exhale about 70% and hold with empty lungs for as long as you can. Stay calm and focus on your heartbeat. Press the circle the moment you can no longer hold — never push to the point of passing out.',
                 'Após a respiração rápida, expire cerca de 70% e segure com os pulmões vazios pelo maior tempo que puder. Fique calmo e foque no seu batimento cardíaco. Pressione o círculo quando não conseguir mais segurar — nunca force ao ponto de desmaiar.'
               )}</p>`,
        attachTo: { element: '#wh-hold-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Recovery hold
      steps.push({
        id: 'wh-recovery-item',
        text: `<h3>${t('Recovery hold — 15 seconds', 'Retenção de recuperação — 15 segundos')}</h3>
               <p>${t(
                 'After releasing, inhale fully and hold again for 15 seconds in the recovery round. This pressurised hold helps circulate the oxygen through the body. After the recovery, a new round of rapid breathing begins.',
                 'Após soltar, inspire completamente e segure novamente por 15 segundos na rodada de recuperação. Essa retenção pressurizada ajuda a circular o oxigênio pelo corpo. Após a recuperação, uma nova rodada de respiração rápida começa.'
               )}</p>`,
        attachTo: { element: '#wh-recovery-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Start circle
      steps.push({
        id: 'wh-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start the guided rapid breathing. Press it again during the breath hold when you can no longer hold. Never practice in water or any place where losing consciousness could be dangerous. Remember to save your results at the end.',
                 'Pressione o círculo para iniciar a respiração rápida guiada. Pressione novamente durante a retenção quando não conseguir mais segurar. Nunca pratique na água ou em lugar onde perder a consciência possa ser perigoso. Lembre-se de salvar seus resultados ao final.'
               )}</p>`,
        attachTo: { element: '#wh-start-ball', on: 'top' },
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

  async startWH(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsWH.nativeElement.disabled = true;
    this.questionWH.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnWH.nativeElement.disabled = true;
      this.breathsWH = true;
      this.WHcountdownInput.nativeElement.style.display = 'inline';
      this.WHtimeInput.nativeElement.style.display = 'none';
      this.startCountdownWH();
      this.WHballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => { this.audioService.playSelectedSong(); }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => { this.WHballText.nativeElement.textContent = '2'; }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => { this.WHballText.nativeElement.textContent = '1'; }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.WHballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Fully In';
        this.WHinterval = setInterval(async () => {
          await this.audioService.playBreath('fullyin');
          this.globalService.changeBall(1.3, this.WHbreathSpeed / 2000, this.WHball);
          this.startBreathsWH();
        }, this.WHbreathSpeed);
        this.WHTimer = setInterval(() => this.DisplayTimerWH(), 1000);
        this.startBtnWH.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      if (!this.hold1WH) {
        this.clearIntervalsWH();
        localStorage.setItem('breathingON', 'false');
        this.WHReset.nativeElement.disabled = false;
        this.WHReset.nativeElement.style.display = 'inline-flex';

        if (this.roundsWH > 0) {
          this.WHSave.nativeElement.disabled = false;
          this.WHSave.nativeElement.style.display = 'inline-flex';
        }

        this.settingsWH.nativeElement.disabled = false;
        this.questionWH.nativeElement.disabled = false;
        this.WHballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
        this.audioService.pauseSelectedSong();
        this.globalService.changeBall(1.3, 1, this.WHball);
      } else {
        await this.pauseWH();
      }

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.hold2WH) this.WHballText.nativeElement.textContent = 'Segure';
        else if (this.breathsWH) this.WHballText.nativeElement.textContent = 'Respire';
      } else {
        if (this.hold2WH) this.WHballText.nativeElement.textContent = 'Hold';
        else if (this.breathsWH) this.WHballText.nativeElement.textContent = 'Breath';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.WHReset.nativeElement.disabled = true;
      this.WHReset.nativeElement.style.display = 'none';
      this.WHSave.nativeElement.disabled = true;
      this.WHSave.nativeElement.style.display = 'none';

      if (this.hold2WH) {
        this.WHinterval = setInterval(() => this.startTimerWH(), 1000);
        this.WHTimer = setInterval(() => this.DisplayTimerWH(), 1000);
      } else if (this.breathsWH) {
        this.WHinterval = setInterval(async () => {
          await this.audioService.playBreath('fullyin');
          this.globalService.changeBall(1.3, this.WHbreathSpeed / 2000, this.WHball);
          this.startBreathsWH();
        }, this.WHbreathSpeed);
        this.WHTimer = setInterval(() => this.DisplayTimerWH(), 1000);
      }
    }
  }

  startBreathsWH(): void {
    this.WHbreaths--;
    if (this.WHbreaths < 1) {
      clearInterval(this.WHinterval);
      this.startBtnWH.nativeElement.disabled = true;
      this.WHinterval = null;
      this.WHballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';

      setTimeout(async () => { await this.audioService.playBell('bell'); }, 1000);
      setTimeout(async () => {
        await this.audioService.playSound('letgoandhold');
        await this.audioService.playBreathSound('exhaleBreath', 3);
      }, 2000);

      this.breathsWH = false;
      this.hold1WH = true;
      this.WHbreaths = this.breathsInputWH.nativeElement.value;

      const timeoutId8 = setTimeout(() => {
        this.WHinterval = setInterval(() => this.startTimerWH(), 1000);
        this.startBtnWH.nativeElement.disabled = false;
      }, 4000);
      this.globalService.timeouts.push(timeoutId8);
    } else {
      this.WHballText.nativeElement.textContent = this.WHbreaths.toString();
      const timeoutId6 = setTimeout(() => {
        this.globalService.changeBall(0.5, this.WHbreathSpeed / 2000, this.WHball);
        this.audioService.playBreath('fullyout');
      }, this.WHbreathSpeed / 2);
      this.globalService.timeouts.push(timeoutId6);
    }
  }

  startCountdownWH(): void {
    if (this.WHduration !== Infinity) {
      if (this.WHduration <= 1) {
        this.WHcountdownInput.nativeElement.value = this.isPortuguese ? 'Rodada final' : 'Final round';
      } else {
        this.WHcountdownInput.nativeElement.value = this.isPortuguese
          ? `${this.WHduration} rodadas restantes`
          : `${this.WHduration} rounds left`;
      }
    } else {
      this.WHcountdownInput.nativeElement.value = '∞';
      this.WHcountdownInput.nativeElement.style.display = 'inline';
      this.WHtimeInput.nativeElement.style.display = 'none';
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

  async startTimerWH(): Promise<void> {
    if (this.hold2WH) {
      this.WHcurrentValue--;
      this.WHballText.nativeElement.textContent = this.isPortuguese
        ? `${this.WHcurrentValue} segundos`
        : `${this.WHcurrentValue} seconds`;
    }

    if (this.hold1WH) {
      this.WHcurrentValue++;
      this.WHballText.nativeElement.textContent = this.formatTime(this.WHcurrentValue);
      const roundTime = this.getRoundTime(this.roundsWH);
      if (roundTime > 0 && this.WHcurrentValue >= roundTime) {
        await this.pauseWH();
      }
    }

    if (this.hold2WH && this.WHcurrentValue === 1) {
      if (this.WHduration !== 0) {
        this.hold2WH = false;
        this.breathsWH = true;
        this.WHcurrentValue = 0;
        clearInterval(this.WHinterval);
        this.WHinterval = null;
        this.WHballText.nativeElement.textContent = this.isPortuguese ? 'Próximo Round' : 'Next Round';
        await this.audioService.playSound('letGo');

        const timeoutId7 = setTimeout(() => {
          this.WHinterval = setInterval(async () => {
            await this.audioService.playBreath('fullyin');
            this.globalService.changeBall(1.3, this.WHbreathSpeed / 2000, this.WHball);
            this.startBreathsWH();
          }, this.WHbreathSpeed);
        }, 2000);
        this.globalService.timeouts.push(timeoutId7);
      } else {
        this.clearIntervalsWH();
        localStorage.setItem('breathingON', 'false');
        this.startBtnWH.nativeElement.disabled = true;
        this.settingsWH.nativeElement.disabled = false;
        this.questionWH.nativeElement.disabled = false;
        this.WHReset.nativeElement.disabled = false;
        this.WHReset.nativeElement.style.display = 'inline-flex';
        this.WHSave.nativeElement.disabled = false;
        this.WHSave.nativeElement.style.display = 'inline-flex';
        this.WHcountdownInput.nativeElement.style.display = 'none';
        this.WHtimeInput.nativeElement.style.display = 'inline';
        this.WHballText.nativeElement.textContent = this.isPortuguese ? 'Respiração Normal' : 'Normal Breathing';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => { await this.audioService.playSound('normalbreath'); }, 1000);
      }
    }
  }

  DisplayTimerWH(): void {
    this.WHSeconds++;
    if (this.WHSeconds === 60) { this.WHSeconds = 0; this.WHMinutes++; }
    const M = this.WHMinutes < 10 ? '0' + this.WHMinutes : this.WHMinutes;
    const S = this.WHSeconds < 10 ? '0' + this.WHSeconds : this.WHSeconds;
    this.timerDisplayWH.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopWH(): void {
    this.clearIntervalsWH();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.WHcountdownInput.nativeElement.style.display = 'none';
    this.WHtimeInput.nativeElement.style.display = 'inline';
    this.WHcurrentValue = 0;
    this.startBtnWH.nativeElement.disabled = false;
    this.WHReset.nativeElement.disabled = true;
    this.WHReset.nativeElement.style.display = 'none';
    this.WHSave.nativeElement.disabled = true;
    this.WHSave.nativeElement.style.display = 'none';
    this.breathsWH = true;
    this.hold2WH = false;
    this.hold1WH = false;
    this.WHballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsWH = 0;
    this.roundsDoneWH.nativeElement.innerHTML = '0';
    this.timerDisplayWH.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setWHduration();
    this.WHSeconds = 0;
    this.WHMinutes = 0;
    this.roundsWH = 0;
    this.WHResults.nativeElement.innerHTML = '';
    this.globalService.changeBall(1.3, 1, this.WHball);
    this.WHbreaths = this.breathsInputWH.nativeElement.value;
  }

  async pauseWH(): Promise<void> {
    clearInterval(this.WHinterval);
    this.WHinterval = null;
    this.WHballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
    await this.audioService.playSound('fullyinHold');
    this.hold1WH = false;
    this.hold2WH = true;
    this.roundsWH++;
    this.roundsDoneWH.nativeElement.innerHTML = this.roundsWH.toString();
    this.WHduration = this.WHduration - 1;

    if (this.WHduration !== Infinity) {
      if (this.WHduration <= 1) {
        this.WHcountdownInput.nativeElement.value = this.isPortuguese ? 'Rodada final' : 'Final round';
      } else {
        this.WHcountdownInput.nativeElement.value = this.isPortuguese
          ? `${this.WHduration} rodadas restantes`
          : `${this.WHduration} rounds left`;
      }
    } else {
      this.WHcountdownInput.nativeElement.value = '∞';
    }

    this.WHResults.nativeElement.innerHTML += `<div class='NOfSteps'><div>Round ${this.roundsWH}</div><div>${this.formatTime(this.WHcurrentValue)}</div></div>`;
    this.WHroundsResults.push(this.WHcurrentValue);
    this.WHcurrentValue = 16;
    this.WHinterval = setInterval(() => this.startTimerWH(), 1000);
  }

  saveWH(): void {
    const savedResults = JSON.parse(localStorage.getItem('WHResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), roundsResult: this.WHroundsResults, result: this.timerDisplayWH.nativeElement.innerHTML, rounds: this.roundsWH });
    localStorage.setItem('WHResults', JSON.stringify(savedResults));
    this.WHResultSaved.nativeElement.style.display = 'block';
    this.stopWH();
    this.WHroundsResults = [];
  }

  clearIntervalsWH(): void {
    clearInterval(this.WHinterval);
    clearInterval(this.WHTimer);
    this.WHinterval = null;
    this.WHTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopWH();
    if (this.WHResultSaved?.nativeElement) {
      this.WHResultSaved.nativeElement.style.display = 'none';
    }
  }
}