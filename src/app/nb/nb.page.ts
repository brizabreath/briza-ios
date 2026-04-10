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
  selector: 'app-nb',
  templateUrl: './nb.page.html',
  styleUrls: ['./nb.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class NBPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionNB') questionNB!: ElementRef<HTMLButtonElement>;
  @ViewChild('NBball') NBball!: ElementRef<HTMLDivElement>;
  @ViewChild('NBballText') NBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('NBtimeInput') NBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('NBcountdownInput') NBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnNB') startBtnNB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnNB') stopBtnNB!: ElementRef<HTMLButtonElement>;
  @ViewChild('NBSave') NBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsNB') settingsNB!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputNB') inhaleInputNB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputNB') hold1InputNB!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputNB') exhaleInputNB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputNB') hold2InputNB!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneNB') roundsDoneNB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayNB') timerDisplayNB!: ElementRef<HTMLDivElement>;
  @ViewChild('NBResultSaved') NBResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusNB') minusNB!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusNB') plusNB!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleNB = true;
  private hold1NB = false;
  private exhaleNB = false;
  private hold2NB = false;
  private NBinterval: any = null;
  private NBcountdown: any = null;
  private NBcurrentValue = 5;
  private NBduration = 0;
  private roundsNB = 0;
  private NBSeconds = 0;
  private NBMinutes = 0;
  private NBTimer: any = null;
  private NBResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let NBi = 2; NBi <= 60; NBi++) {
      const NBoption = document.createElement('option');
      NBoption.value = (NBi * 60).toString();
      NBoption.textContent = this.isPortuguese ? `${NBi} minutos` : `${NBi} minutes`;
      this.NBtimeInput.nativeElement.appendChild(NBoption);
    }

    this.minusNB.nativeElement.onclick = () => this.minusRatioNB();
    this.plusNB.nativeElement.onclick = () => this.plusRatioNB();
    this.startBtnNB.nativeElement.onclick = () => this.startNB();
    this.stopBtnNB.nativeElement.onclick = () => this.stopNB();
    this.NBSave.nativeElement.onclick = () => this.saveNB();

    this.stopBtnNB.nativeElement.disabled = true;
    this.stopBtnNB.nativeElement.style.display = 'none';
    this.NBSave.nativeElement.disabled = true;
    this.NBSave.nativeElement.style.display = 'none';

    this.NBtimeInput.nativeElement.onchange = () => this.setNBduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setNBduration(): void {
    const selectedValue = this.NBtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.NBduration = Infinity;
    } else {
      this.NBduration = parseInt(selectedValue, 10);
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
          await this.startNB();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopNB();
        }
      }
    });

    this.NBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setNBduration();
    this.NBResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('nb_guide_seen')) {
      localStorage.setItem('nb_guide_seen', 'true');
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
        id: 'nb-intro',
        text: `<h3>${t('Nadi Shodhana', 'Nadi Shodhana')}</h3>
               <p>${t(
                 'Nadi Shodhana, or alternate nostril breathing, alternates which side of your nose you breathe through each cycle. This balances the left and right hemispheres of the brain, calms the nervous system, and brings balance to the body and mind.',
                 'Nadi Shodhana, ou respiração alternada pelas narinas, alterna por qual lado do nariz você respira a cada ciclo. Isso equilibra os hemisférios esquerdo e direito do cérebro, acalma o sistema nervoso e traz equilíbrio para o corpo e mente.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'nb-posture',
        text: `<h3>${t('Hand position', 'Posição da mão')}</h3>
               <p>${t(
                 'Find a comfortable seat. Using your right hand, use the thumb to close your right nostril and the ring finger to close the left. Alternate between nostrils as you follow the guided technique. Relax your shoulders, face, and jaw.',
                 'Encontre um assento confortável. Com a mão direita, use o polegar para fechar a narina direita e o dedo anelar para fechar a esquerda. Alterne entre as narinas conforme segue a técnica guiada. Relaxe os ombros, o rosto e a mandíbula.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Minus
      steps.push({
        id: 'nb-minus-btn',
        text: `<h3>${t('Decrease ratio', 'Diminuir proporção')}</h3>
               <p>${t(
                 'Use the minus button to lower all four phases equally. Start with a ratio that feels comfortable — reduce it if your heart rate accelerates or the practice feels too hard.',
                 'Use o botão de menos para diminuir todas as quatro fases igualmente. Comece com uma proporção confortável — reduza se o coração acelerar ou a prática parecer muito difícil.'
               )}</p>`,
        attachTo: { element: '#nb-minus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Inhale right
      steps.push({
        id: 'nb-inhale-right-item',
        text: `<h3>${t('Inhale — right nostril', 'Inspire — narina direita')}</h3>
               <p>${t(
                 'Close the left nostril with your ring finger and inhale slowly through the right nostril for this many seconds.',
                 'Feche a narina esquerda com o dedo anelar e inspire lentamente pela narina direita por este número de segundos.'
               )}</p>`,
        attachTo: { element: '#nb-inhale-right-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Exhale right
      steps.push({
        id: 'nb-exhale-right-item',
        text: `<h3>${t('Exhale — left nostril', 'Espire — narina esquerda')}</h3>
               <p>${t(
                 'Close the right nostril with your thumb and exhale slowly through the left nostril for this many seconds.',
                 'Feche a narina direita com o polegar e expire lentamente pela narina esquerda por este número de segundos.'
               )}</p>`,
        attachTo: { element: '#nb-exhale-right-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Inhale left
      steps.push({
        id: 'nb-inhale-left-item',
        text: `<h3>${t('Inhale — left nostril', 'Inspire — narina esquerda')}</h3>
               <p>${t(
                 'Keep the right nostril closed and inhale slowly through the left nostril for this many seconds.',
                 'Mantenha a narina direita fechada e inspire lentamente pela narina esquerda por este número de segundos.'
               )}</p>`,
        attachTo: { element: '#nb-inhale-left-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Exhale left
      steps.push({
        id: 'nb-exhale-left-item',
        text: `<h3>${t('Exhale — right nostril', 'Espire — narina direita')}</h3>
               <p>${t(
                 'Close the left nostril and exhale slowly through the right nostril. This completes one full round — then the cycle repeats.',
                 'Feche a narina esquerda e expire lentamente pela narina direita. Isso completa uma rodada completa — então o ciclo se repete.'
               )}</p>`,
        attachTo: { element: '#nb-exhale-left-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Plus
      steps.push({
        id: 'nb-plus-btn',
        text: `<h3>${t('Increase ratio', 'Aumentar proporção')}</h3>
               <p>${t(
                 'Use the plus button to raise all four phases equally. Increase gradually — only when the current ratio feels easy and your breathing is steady throughout.',
                 'Use o botão de mais para aumentar todas as quatro fases igualmente. Aumente gradualmente — apenas quando a proporção atual parecer fácil e sua respiração estiver constante.'
               )}</p>`,
        attachTo: { element: '#nb-plus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 9 - Duration
      steps.push({
        id: 'nb-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to stay on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#nb-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 10 - Start circle
      steps.push({
        id: 'nb-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm. The audio cues will tell you which nostril to use. Press again at any time to pause. Remember to save your results at the end.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Os sinais de áudio indicarão qual narina usar. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final.'
               )}</p>`,
        attachTo: { element: '#nb-start-ball', on: 'top' },
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

  minusRatioNB(): void {
    if (parseInt(this.inhaleInputNB.nativeElement.value) > 3) {
      this.inhaleInputNB.nativeElement.value = ((parseInt(this.inhaleInputNB.nativeElement.value) || 0) - 1).toString();
      this.hold1InputNB.nativeElement.value = ((parseInt(this.hold1InputNB.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputNB.nativeElement.value = ((parseInt(this.exhaleInputNB.nativeElement.value) || 0) - 1).toString();
      this.hold2InputNB.nativeElement.value = ((parseInt(this.hold2InputNB.nativeElement.value) || 0) - 1).toString();
    }
  }

  plusRatioNB(): void {
    if (parseInt(this.inhaleInputNB.nativeElement.value) < 40) {
      this.inhaleInputNB.nativeElement.value = ((parseInt(this.inhaleInputNB.nativeElement.value) || 0) + 1).toString();
      this.hold1InputNB.nativeElement.value = ((parseInt(this.hold1InputNB.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputNB.nativeElement.value = ((parseInt(this.exhaleInputNB.nativeElement.value) || 0) + 1).toString();
      this.hold2InputNB.nativeElement.value = ((parseInt(this.hold2InputNB.nativeElement.value) || 0) + 1).toString();
    }
  }

  async startNB(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsNB.nativeElement.disabled = true;
    this.questionNB.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnNB.nativeElement.disabled = true;
      this.inhaleNB = true;
      this.NBcountdownInput.nativeElement.style.display = 'inline';
      this.NBtimeInput.nativeElement.style.display = 'none';
      this.startCountdownNB();
      this.NBballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => { this.audioService.playSelectedSong(); }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => { this.NBballText.nativeElement.textContent = '2'; }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => { this.NBballText.nativeElement.textContent = '1'; }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.NBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhaleLeft');
        this.NBcurrentValue = parseInt(this.inhaleInputNB.nativeElement.value) + 2;
        await this.audioService.playBreathSound('inhaleBreath', this.NBcurrentValue - 1);
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputNB.nativeElement.value), this.NBball);
        this.NBinterval = setInterval(() => this.startTimerNB(), 1000);
        this.NBTimer = setInterval(() => this.DisplayTimerNB(), 1000);
        this.startBtnNB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsNB();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnNB.nativeElement.disabled = false;
      this.stopBtnNB.nativeElement.style.display = 'inline-flex';

      if (this.roundsNB > 0) {
        this.NBSave.nativeElement.disabled = false;
        this.NBSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsNB.nativeElement.disabled = false;
      this.questionNB.nativeElement.disabled = false;
      this.NBballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleNB) this.NBballText.nativeElement.textContent = 'Inspire';
        else if (this.hold1NB) this.NBballText.nativeElement.textContent = 'Espire';
        else if (this.exhaleNB) this.NBballText.nativeElement.textContent = 'Inspire';
        else if (this.hold2NB) this.NBballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleNB) this.NBballText.nativeElement.textContent = 'Inhale';
        else if (this.hold1NB) this.NBballText.nativeElement.textContent = 'Exhale';
        else if (this.exhaleNB) this.NBballText.nativeElement.textContent = 'Inhale';
        else if (this.hold2NB) this.NBballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnNB.nativeElement.disabled = true;
      this.stopBtnNB.nativeElement.style.display = 'none';
      this.NBSave.nativeElement.disabled = true;
      this.NBSave.nativeElement.style.display = 'none';
      this.NBinterval = setInterval(() => this.startTimerNB(), 1000);
      this.NBTimer = setInterval(() => this.DisplayTimerNB(), 1000);
      this.startCountdownNB();
    }
  }

  startCountdownNB(): void {
    if (this.NBduration !== Infinity) {
      const Contdownminutes = Math.floor(this.NBduration / 60);
      const Contdownseconds = this.NBduration % 60;
      this.NBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.NBcountdown = setInterval(() => {
        if (this.NBduration === 0) {
          clearInterval(this.NBcountdown);
          this.NBcountdown = null;
        } else {
          this.NBduration--;
          const Contdownminutes = Math.floor(this.NBduration / 60);
          const Contdownseconds = this.NBduration % 60;
          this.NBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.NBcountdownInput.nativeElement.value = '∞';
      this.NBcountdownInput.nativeElement.style.display = 'inline';
      this.NBtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerNB(): Promise<void> {
    this.NBcurrentValue--;

    if (this.inhaleNB && this.NBcurrentValue === 1) {
      this.NBcurrentValue = parseInt(this.hold1InputNB.nativeElement.value) + 2;
      this.inhaleNB = false;
      this.hold1NB = true;
      await this.audioService.playSound('exhaleRight');
      await this.audioService.playBreathSound('exhaleBreath', this.NBcurrentValue - 1);
      this.NBballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, parseInt(this.hold1InputNB.nativeElement.value), this.NBball);

    } else if (this.hold1NB && this.NBcurrentValue === 1) {
      this.NBcurrentValue = parseInt(this.exhaleInputNB.nativeElement.value) + 2;
      this.hold1NB = false;
      this.exhaleNB = true;
      await this.audioService.playSound('inhaleRight');
      await this.audioService.playBreathSound('inhaleBreath', this.NBcurrentValue - 1);
      this.NBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
      this.globalService.changeBall(1.5, parseInt(this.hold2InputNB.nativeElement.value), this.NBball);

    } else if (this.exhaleNB && this.NBcurrentValue === 1) {
      this.NBcurrentValue = parseInt(this.hold2InputNB.nativeElement.value) + 2;
      this.exhaleNB = false;
      this.hold2NB = true;
      await this.audioService.playSound('exhaleLeft');
      await this.audioService.playBreathSound('exhaleBreath', this.NBcurrentValue - 1);
      this.NBballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, parseInt(this.exhaleInputNB.nativeElement.value), this.NBball);
      this.roundsNB++;
      this.roundsDoneNB.nativeElement.innerHTML = this.roundsNB.toString();

    } else if (this.hold2NB && this.NBcurrentValue === 1) {
      if (this.NBduration !== 0) {
        this.NBcurrentValue = parseInt(this.inhaleInputNB.nativeElement.value) + 2;
        this.hold2NB = false;
        this.inhaleNB = true;
        await this.audioService.playSound('inhaleLeft');
        await this.audioService.playBreathSound('inhaleBreath', this.NBcurrentValue - 1);
        this.NBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputNB.nativeElement.value), this.NBball);
      } else {
        this.clearIntervalsNB();
        localStorage.setItem('breathingON', 'false');
        this.startBtnNB.nativeElement.disabled = true;
        this.settingsNB.nativeElement.disabled = false;
        this.questionNB.nativeElement.disabled = false;
        this.stopBtnNB.nativeElement.disabled = false;
        this.stopBtnNB.nativeElement.style.display = 'inline-flex';
        this.NBSave.nativeElement.disabled = false;
        this.NBSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.NBball);
        this.NBcountdownInput.nativeElement.style.display = 'none';
        this.NBtimeInput.nativeElement.style.display = 'inline';
        this.NBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => { await this.audioService.playSound('normalbreath'); }, 1000);
      }
    }
  }

  DisplayTimerNB(): void {
    this.NBSeconds++;
    if (this.NBSeconds === 60) { this.NBSeconds = 0; this.NBMinutes++; }
    const M = this.NBMinutes < 10 ? '0' + this.NBMinutes : this.NBMinutes;
    const S = this.NBSeconds < 10 ? '0' + this.NBSeconds : this.NBSeconds;
    this.timerDisplayNB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopNB(): void {
    this.clearIntervalsNB();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.NBcountdownInput.nativeElement.style.display = 'none';
    this.NBtimeInput.nativeElement.style.display = 'inline';
    this.NBcurrentValue = parseInt(this.inhaleInputNB.nativeElement.value) + 1;
    this.startBtnNB.nativeElement.disabled = false;
    this.stopBtnNB.nativeElement.disabled = true;
    this.stopBtnNB.nativeElement.style.display = 'none';
    this.NBSave.nativeElement.disabled = true;
    this.NBSave.nativeElement.style.display = 'none';
    this.inhaleNB = true;
    this.hold1NB = false;
    this.exhaleNB = false;
    this.hold2NB = false;
    this.globalService.changeBall(1, 1, this.NBball);
    this.NBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsNB = 0;
    this.roundsDoneNB.nativeElement.innerHTML = '0';
    this.timerDisplayNB.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setNBduration();
    this.NBSeconds = 0;
    this.NBMinutes = 0;
    this.roundsNB = 0;
  }

  saveNB(): void {
    this.NBResult = this.timerDisplayNB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('NBResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.NBResult, rounds: this.roundsNB });
    localStorage.setItem('NBResults', JSON.stringify(savedResults));
    this.NBResultSaved.nativeElement.style.display = 'block';
    this.stopNB();
  }

  clearIntervalsNB(): void {
    clearInterval(this.NBinterval);
    clearInterval(this.NBcountdown);
    clearInterval(this.NBTimer);
    this.NBinterval = null;
    this.NBcountdown = null;
    this.NBTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopNB();
    if (this.NBResultSaved?.nativeElement) {
      this.NBResultSaved.nativeElement.style.display = 'none';
    }
  }
}