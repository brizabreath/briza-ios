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
  selector: 'app-ap',
  templateUrl: './ap.page.html',
  styleUrls: ['./ap.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class APPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionAP') questionAP!: ElementRef<HTMLButtonElement>;
  @ViewChild('APball') APball!: ElementRef<HTMLDivElement>;
  @ViewChild('APballText') APballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('APtimeInput') APtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('APcountdownInput') APcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnAP') startBtnAP!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnAP') stopBtnAP!: ElementRef<HTMLButtonElement>;
  @ViewChild('APSave') APSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsAP') settingsAP!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputAP') inhaleInputAP!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputAP') hold1InputAP!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputAP') exhaleInputAP!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneAP') roundsDoneAP!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayAP') timerDisplayAP!: ElementRef<HTMLDivElement>;
  @ViewChild('APResultSaved') APResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusAP') minusAP!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusAP') plusAP!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleAP = true;
  private hold1AP = false;
  private exhaleAP = false;
  private APinterval: any = null;
  private APcountdown: any = null;
  private APcurrentValue = 5;
  private APduration = 0;
  private roundsAP = 0;
  private APSeconds = 0;
  private APMinutes = 0;
  private APTimer: any = null;
  private APResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let APi = 2; APi <= 60; APi++) {
      const APoption = document.createElement('option');
      APoption.value = (APi * 60).toString();
      APoption.textContent = this.isPortuguese ? `${APi} minutos` : `${APi} minutes`;
      this.APtimeInput.nativeElement.appendChild(APoption);
    }

    this.minusAP.nativeElement.onclick = () => this.minusRatioAP();
    this.plusAP.nativeElement.onclick = () => this.plusRatioAP();
    this.startBtnAP.nativeElement.onclick = () => this.startAP();
    this.stopBtnAP.nativeElement.onclick = () => this.stopAP();
    this.APSave.nativeElement.onclick = () => this.saveAP();

    this.stopBtnAP.nativeElement.disabled = true;
    this.stopBtnAP.nativeElement.style.display = 'none';
    this.APSave.nativeElement.disabled = true;
    this.APSave.nativeElement.style.display = 'none';

    this.APtimeInput.nativeElement.onchange = () => this.setAPduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setAPduration(): void {
    const selectedValue = this.APtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.APduration = Infinity;
    } else {
      this.APduration = parseInt(selectedValue, 10);
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
          await this.startAP();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopAP();
        }
      }
    });

    this.APballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setAPduration();
    this.APResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('ap_guide_seen')) {
      localStorage.setItem('ap_guide_seen', 'true');
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

      // 1 - What is this technique (centered)
      steps.push({
        id: 'ap-intro',
        text: `<h3>${t('Apnea Breathing', 'Respiração Apneica')}</h3>
               <p>${t(
                 'This technique is based on deep and diaphragmatic breathing, allowing you to use the full capacity of your lungs and build greater tolerance to breath-holding.',
                 'Esta técnica é baseada na respiração profunda e diafragmática, permitindo usar a capacidade total dos pulmões e aumentar a tolerância à retenção da respiração.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture
      steps.push({
        id: 'ap-posture',
        text: `<h3>${t('Get comfortable', 'Fique confortável')}</h3>
               <p>${t(
                 'Find a comfortable seat or lay down. Relax your shoulders, face muscles and jaw. Place your tongue on the roof of your mouth, its tip touching the top of your front teeth.',
                 'Encontre um assento confortável ou deite-se. Relaxe os ombros, músculos faciais e mandíbula. Coloque a língua no céu da boca, a ponta tocando o topo dos dentes da frente.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Minus button
      steps.push({
        id: 'ap-minus-btn',
        text: `<h3>${t('Decrease ratio', 'Diminuir proporção')}</h3>
               <p>${t(
                 'Use the minus button to lower the breathing ratio. Choose a ratio that challenges you but stays comfortable — if your heart rate accelerates too much, reduce it.',
                 'Use o botão de menos para diminuir a proporção de respiração. Escolha uma proporção que desafie, mas seja confortável — se o coração acelerar demais, reduza.'
               )}</p>`,
        attachTo: { element: '#ap-minus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Inhale
      steps.push({
        id: 'ap-inhale-item',
        text: `<h3>${t('Inhale', 'Inspire')}</h3>
               <p>${t(
                 'Breathe in slowly through the nose for this many seconds.',
                 'Inspire lentamente pelo nariz por este número de segundos.'
               )}</p>`,
        attachTo: { element: '#ap-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Hold
      steps.push({
        id: 'ap-hold-item',
        text: `<h3>${t('Hold', 'Segure')}</h3>
               <p>${t(
                 'Hold your breath for this many seconds. This is the core of the apnea technique — stay calm and relaxed.',
                 'Segure a respiração por este número de segundos. Este é o núcleo da técnica apneica — mantenha-se calmo e relaxado.'
               )}</p>`,
        attachTo: { element: '#ap-hold-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Exhale
      steps.push({
        id: 'ap-exhale-item',
        text: `<h3>${t('Exhale', 'Espire')}</h3>
               <p>${t(
                 'Breathe out slowly through the nose for this many seconds. Always breathe nasally throughout the exercise.',
                 'Expire lentamente pelo nariz por este número de segundos. Respire sempre pelo nariz durante todo o exercício.'
               )}</p>`,
        attachTo: { element: '#ap-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Plus button
      steps.push({
        id: 'ap-plus-btn',
        text: `<h3>${t('Increase ratio', 'Aumentar proporção')}</h3>
               <p>${t(
                 'Use the plus button to raise the ratio as you progress. Increase gradually — only when the current ratio feels easy.',
                 'Use o botão de mais para aumentar a proporção conforme você avança. Aumente gradualmente — apenas quando a proporção atual parecer fácil.'
               )}</p>`,
        attachTo: { element: '#ap-plus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Duration
      steps.push({
        id: 'ap-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can also set it to infinite and stop whenever you feel ready.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você também pode deixar no infinito e parar quando quiser.'
               )}</p>`,
        attachTo: { element: '#ap-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 9 - Start ball
      steps.push({
        id: 'ap-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start. Press it again at any time to pause. Remember to save your results at the end.',
                 'Pressione o círculo para iniciar. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final.'
               )}</p>`,
        attachTo: { element: '#ap-start-ball', on: 'top' },
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

  minusRatioAP(): void {
    if (parseInt(this.inhaleInputAP.nativeElement.value) > 2) {
      this.inhaleInputAP.nativeElement.value = ((parseInt(this.inhaleInputAP.nativeElement.value) || 0) - 1).toString();
      this.hold1InputAP.nativeElement.value = ((parseInt(this.hold1InputAP.nativeElement.value) || 0) - 4).toString();
      this.exhaleInputAP.nativeElement.value = ((parseInt(this.exhaleInputAP.nativeElement.value) || 0) - 2).toString();
    }
  }

  plusRatioAP(): void {
    if (parseInt(this.inhaleInputAP.nativeElement.value) < 30) {
      this.inhaleInputAP.nativeElement.value = ((parseInt(this.inhaleInputAP.nativeElement.value) || 0) + 1).toString();
      this.hold1InputAP.nativeElement.value = ((parseInt(this.hold1InputAP.nativeElement.value) || 0) + 4).toString();
      this.exhaleInputAP.nativeElement.value = ((parseInt(this.exhaleInputAP.nativeElement.value) || 0) + 2).toString();
    }
  }

  async startAP(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsAP.nativeElement.disabled = true;
    this.questionAP.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnAP.nativeElement.disabled = true;
      this.inhaleAP = true;
      this.APcountdownInput.nativeElement.style.display = 'inline';
      this.APtimeInput.nativeElement.style.display = 'none';
      this.startCountdownAP();
      this.APballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => {
        this.APballText.nativeElement.textContent = '2';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.APballText.nativeElement.textContent = '1';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
        this.APballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        this.APcurrentValue = parseInt(this.inhaleInputAP.nativeElement.value) + 1;
        await this.audioService.playBreathSound('inhaleBreath', this.APcurrentValue);
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputAP.nativeElement.value), this.APball);
        this.APinterval = setInterval(() => this.startTimerAP(), 1000);
        this.APTimer = setInterval(() => this.DisplayTimerAP(), 1000);
        this.startBtnAP.nativeElement.disabled = false;
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsAP();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnAP.nativeElement.disabled = false;
      this.stopBtnAP.nativeElement.style.display = 'inline-flex';

      if (this.roundsAP > 0) {
        this.APSave.nativeElement.disabled = false;
        this.APSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsAP.nativeElement.disabled = false;
      this.questionAP.nativeElement.disabled = false;
      this.APballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleAP) this.APballText.nativeElement.textContent = 'Inspire';
        else if (this.hold1AP) this.APballText.nativeElement.textContent = 'Segure';
        else if (this.exhaleAP) this.APballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleAP) this.APballText.nativeElement.textContent = 'Inhale';
        else if (this.hold1AP) this.APballText.nativeElement.textContent = 'Hold';
        else if (this.exhaleAP) this.APballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnAP.nativeElement.disabled = true;
      this.stopBtnAP.nativeElement.style.display = 'none';
      this.APSave.nativeElement.disabled = true;
      this.APSave.nativeElement.style.display = 'none';
      this.APinterval = setInterval(() => this.startTimerAP(), 1000);
      this.APTimer = setInterval(() => this.DisplayTimerAP(), 1000);
      this.startCountdownAP();
    }
  }

  startCountdownAP(): void {
    if (this.APduration !== Infinity) {
      let Contdownminutes = Math.floor(this.APduration / 60);
      let Contdownseconds = this.APduration % 60;
      this.APcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.APcountdown = setInterval(() => {
        if (this.APduration === 0) {
          clearInterval(this.APcountdown);
          this.APcountdown = null;
        } else {
          this.APduration--;
          let Contdownminutes = Math.floor(this.APduration / 60);
          let Contdownseconds = this.APduration % 60;
          this.APcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.APcountdownInput.nativeElement.value = '∞';
      this.APcountdownInput.nativeElement.style.display = 'inline';
      this.APtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerAP(): Promise<void> {
    this.APcurrentValue--;

    if (this.inhaleAP && this.APcurrentValue === 1) {
      this.APcurrentValue = parseInt(this.hold1InputAP.nativeElement.value) + 1;
      this.inhaleAP = false;
      this.hold1AP = true;
      await this.audioService.playSound('hold');
      this.APballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
      this.globalService.changeBall(1.3, parseInt(this.hold1InputAP.nativeElement.value), this.APball);

    } else if (this.hold1AP && this.APcurrentValue === 1) {
      this.APcurrentValue = parseInt(this.exhaleInputAP.nativeElement.value) + 1;
      this.hold1AP = false;
      this.exhaleAP = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.APcurrentValue);
      this.APballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, parseInt(this.exhaleInputAP.nativeElement.value), this.APball);
      this.roundsAP++;
      this.roundsDoneAP.nativeElement.innerHTML = this.roundsAP.toString();

    } else if (this.exhaleAP && this.APcurrentValue === 1) {
      if (this.APduration !== 0) {
        this.APcurrentValue = parseInt(this.inhaleInputAP.nativeElement.value) + 1;
        this.exhaleAP = false;
        this.inhaleAP = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.APcurrentValue);
        this.APballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputAP.nativeElement.value), this.APball);
      } else {
        this.clearIntervalsAP();
        localStorage.setItem('breathingON', 'false');
        this.startBtnAP.nativeElement.disabled = true;
        this.settingsAP.nativeElement.disabled = false;
        this.questionAP.nativeElement.disabled = false;
        this.stopBtnAP.nativeElement.disabled = false;
        this.stopBtnAP.nativeElement.style.display = 'inline-flex';
        this.APSave.nativeElement.disabled = false;
        this.APSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.APball);
        this.APcountdownInput.nativeElement.style.display = 'none';
        this.APtimeInput.nativeElement.style.display = 'inline';
        this.APballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }
    }
  }

  DisplayTimerAP(): void {
    this.APSeconds++;
    if (this.APSeconds === 60) {
      this.APSeconds = 0;
      this.APMinutes++;
    }
    const M = this.APMinutes < 10 ? '0' + this.APMinutes : this.APMinutes;
    const S = this.APSeconds < 10 ? '0' + this.APSeconds : this.APSeconds;
    this.timerDisplayAP.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopAP(): void {
    this.clearIntervalsAP();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.APcountdownInput.nativeElement.style.display = 'none';
    this.APtimeInput.nativeElement.style.display = 'inline';
    this.APcurrentValue = parseInt(this.inhaleInputAP.nativeElement.value) + 1;
    this.startBtnAP.nativeElement.disabled = false;
    this.stopBtnAP.nativeElement.disabled = true;
    this.stopBtnAP.nativeElement.style.display = 'none';
    this.APSave.nativeElement.disabled = true;
    this.APSave.nativeElement.style.display = 'none';
    this.inhaleAP = true;
    this.hold1AP = false;
    this.exhaleAP = false;
    this.globalService.changeBall(1, 1, this.APball);
    this.APballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsAP = 0;
    this.roundsDoneAP.nativeElement.innerHTML = '0';
    this.timerDisplayAP.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setAPduration();
    this.APSeconds = 0;
    this.APMinutes = 0;
    this.roundsAP = 0;
  }

  saveAP(): void {
    this.APResult = this.timerDisplayAP.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('APResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.APResult, rounds: this.roundsAP });
    localStorage.setItem('APResults', JSON.stringify(savedResults));
    this.APResultSaved.nativeElement.style.display = 'block';
    this.stopAP();
  }

  clearIntervalsAP(): void {
    clearInterval(this.APinterval);
    clearInterval(this.APcountdown);
    clearInterval(this.APTimer);
    this.APinterval = null;
    this.APcountdown = null;
    this.APTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopAP();
    if (this.APResultSaved?.nativeElement) {
      this.APResultSaved.nativeElement.style.display = 'none';
    }
  }
}