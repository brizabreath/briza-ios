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
  selector: 'app-cust',
  templateUrl: './cust.page.html',
  styleUrls: ['./cust.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class CUSTPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionCUST') questionCUST!: ElementRef<HTMLButtonElement>;
  @ViewChild('CUSTball') CUSTball!: ElementRef<HTMLDivElement>;
  @ViewChild('CUSTballText') CUSTballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('CUSTtimeInput') CUSTtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('CUSTcountdownInput') CUSTcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnCUST') startBtnCUST!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnCUST') stopBtnCUST!: ElementRef<HTMLButtonElement>;
  @ViewChild('CUSTSave') CUSTSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsCUST') settingsCUST!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputCUST') inhaleInputCUST!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputCUST') hold1InputCUST!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputCUST') exhaleInputCUST!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputCUST') hold2InputCUST!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneCUST') roundsDoneCUST!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayCUST') timerDisplayCUST!: ElementRef<HTMLDivElement>;
  @ViewChild('CUSTResultSaved') CUSTResultSaved!: ElementRef<HTMLDivElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  customizableIn = localStorage.getItem('customizableIn') || '4';
  customizableH1 = localStorage.getItem('customizableH1') || '4';
  customizableOut = localStorage.getItem('customizableOut') || '4';
  customizableH2 = localStorage.getItem('customizableH2') || '4';

  private inhaleCUST = true;
  private hold1CUST = false;
  private exhaleCUST = false;
  private hold2CUST = false;
  private CUSTinterval: any = null;
  private CUSTcountdown: any = null;
  private CUSTcurrentValue = 5;
  private CUSTduration = 0;
  private roundsCUST = 0;
  private CUSTSeconds = 0;
  private CUSTMinutes = 0;
  private CUSTTimer: any = null;
  private CUSTResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let CUSTi = 2; CUSTi <= 60; CUSTi++) {
      const CUSToption = document.createElement('option');
      CUSToption.value = (CUSTi * 60).toString();
      CUSToption.textContent = this.isPortuguese ? `${CUSTi} minutos` : `${CUSTi} minutes`;
      this.CUSTtimeInput.nativeElement.appendChild(CUSToption);
    }

    this.startBtnCUST.nativeElement.onclick = () => this.startCUST();
    this.stopBtnCUST.nativeElement.onclick = () => this.stopCUST();
    this.CUSTSave.nativeElement.onclick = () => this.saveCUST();

    this.stopBtnCUST.nativeElement.disabled = true;
    this.stopBtnCUST.nativeElement.style.display = 'none';
    this.CUSTSave.nativeElement.disabled = true;
    this.CUSTSave.nativeElement.style.display = 'none';

    this.CUSTtimeInput.nativeElement.onchange = () => this.setCUSTduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setCUSTduration(): void {
    const selectedValue = this.CUSTtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.CUSTduration = Infinity;
    } else {
      this.CUSTduration = parseInt(selectedValue, 10);
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
          await this.startCUST();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopCUST();
        }
      }
    });

    this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setCUSTduration();
    this.CUSTResultSaved.nativeElement.style.display = 'none';

    this.inhaleInputCUST.nativeElement.value = this.customizableIn.toString();
    this.hold1InputCUST.nativeElement.value = this.customizableH1.toString();
    this.exhaleInputCUST.nativeElement.value = this.customizableOut.toString();
    this.hold2InputCUST.nativeElement.value = this.customizableH2.toString();

    this.inhaleInputCUST.nativeElement.disabled = false;
    this.hold1InputCUST.nativeElement.disabled = false;
    this.exhaleInputCUST.nativeElement.disabled = false;
    this.hold2InputCUST.nativeElement.disabled = false;

    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('cust_guide_seen')) {
      localStorage.setItem('cust_guide_seen', 'true');
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
        id: 'cust-intro',
        text: `<h3>${t('Custom Breathing', 'Respiração Personalizada')}</h3>
               <p>${t(
                 'Personalise your training by choosing the exact breathing ratio that works best for you. Tap any number to edit it before starting — your settings are saved automatically for next time.',
                 'Personalize seu treino escolhendo a proporção de respiração ideal para você. Toque em qualquer número para editá-lo antes de começar — suas configurações são salvas automaticamente para a próxima vez.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'cust-posture',
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
        id: 'cust-inhale-item',
        text: `<h3>${t('Inhale', 'Inspire')}</h3>
               <p>${t(
                 'Tap this number to set your inhale duration in seconds. Minimum is 2 seconds. Breathe in slowly through the nose.',
                 'Toque neste número para definir a duração da inspiração em segundos. O mínimo é 2 segundos. Inspire lentamente pelo nariz.'
               )}</p>`,
        attachTo: { element: '#cust-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Hold 1
      steps.push({
        id: 'cust-hold1-item',
        text: `<h3>${t('Hold after inhale', 'Segure após inspirar')}</h3>
               <p>${t(
                 'Tap this number to set a pause after the inhale. Set it to 0 if you do not want a hold here — the exercise will move directly from inhale to exhale.',
                 'Toque neste número para definir uma pausa após a inspiração. Defina como 0 se não quiser uma retenção aqui — o exercício passará diretamente da inspiração para a expiração.'
               )}</p>`,
        attachTo: { element: '#cust-hold1-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Exhale
      steps.push({
        id: 'cust-exhale-item',
        text: `<h3>${t('Exhale', 'Espire')}</h3>
               <p>${t(
                 'Tap this number to set your exhale duration in seconds. Minimum is 2 seconds. Breathe out slowly through the nose. A longer exhale than inhale activates the parasympathetic nervous system and promotes calm.',
                 'Toque neste número para definir a duração da expiração em segundos. O mínimo é 2 segundos. Expire lentamente pelo nariz. Uma expiração mais longa que a inspiração ativa o sistema nervoso parassimpático e promove calma.'
               )}</p>`,
        attachTo: { element: '#cust-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Hold 2
      steps.push({
        id: 'cust-hold2-item',
        text: `<h3>${t('Hold after exhale', 'Segure após expirar')}</h3>
               <p>${t(
                 'Tap this number to set a pause after the exhale. Set it to 0 if you do not want a hold here. A hold after the exhale builds CO₂ tolerance and deepens the breathing effect.',
                 'Toque neste número para definir uma pausa após a expiração. Defina como 0 se não quiser uma retenção aqui. Uma retenção após a expiração aumenta a tolerância ao CO₂ e aprofunda o efeito respiratório.'
               )}</p>`,
        attachTo: { element: '#cust-hold2-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Duration
      steps.push({
        id: 'cust-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to stay on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#cust-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Start circle
      steps.push({
        id: 'cust-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm. The numbers lock once the session begins. Press the circle again at any time to pause. If the ratio feels too hard and your heart rate accelerates, stop and choose a lower ratio. Remember to save your results at the end.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Os números travam quando a sessão começa. Pressione o círculo novamente a qualquer momento para pausar. Se a proporção parecer muito difícil e seu coração acelerar, pare e escolha uma proporção menor. Lembre-se de salvar seus resultados ao final.'
               )}</p>`,
        attachTo: { element: '#cust-start-ball', on: 'top' },
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

  async startCUST(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    this.customizableIn = this.inhaleInputCUST.nativeElement.value;
    this.customizableH1 = this.hold1InputCUST.nativeElement.value;
    this.customizableOut = this.exhaleInputCUST.nativeElement.value;
    this.customizableH2 = this.hold2InputCUST.nativeElement.value;

    localStorage.setItem('customizableIn', this.customizableIn.toString());
    localStorage.setItem('customizableH1', this.customizableH1.toString());
    localStorage.setItem('customizableOut', this.customizableOut.toString());
    localStorage.setItem('customizableH2', this.customizableH2.toString());

    this.CUSTcurrentValue = parseInt(this.customizableIn) + 1;
    this.inhaleInputCUST.nativeElement.disabled = true;
    this.hold1InputCUST.nativeElement.disabled = true;
    this.exhaleInputCUST.nativeElement.disabled = true;
    this.hold2InputCUST.nativeElement.disabled = true;

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsCUST.nativeElement.disabled = true;
    this.questionCUST.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnCUST.nativeElement.disabled = true;
      this.inhaleCUST = true;
      this.CUSTcountdownInput.nativeElement.style.display = 'inline';
      this.CUSTtimeInput.nativeElement.style.display = 'none';
      this.startCountdownCUST();
      this.CUSTballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => {
        this.CUSTballText.nativeElement.textContent = '2';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.CUSTballText.nativeElement.textContent = '1';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.CUSTcurrentValue);
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputCUST.nativeElement.value), this.CUSTball);
        this.CUSTinterval = setInterval(() => this.startTimerCUST(), 1000);
        this.CUSTTimer = setInterval(() => this.DisplayTimerCUST(), 1000);
        this.startBtnCUST.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsCUST();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnCUST.nativeElement.disabled = false;
      this.stopBtnCUST.nativeElement.style.display = 'inline-flex';

      if (this.roundsCUST > 0) {
        this.CUSTSave.nativeElement.disabled = false;
        this.CUSTSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsCUST.nativeElement.disabled = false;
      this.questionCUST.nativeElement.disabled = false;
      this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleCUST) this.CUSTballText.nativeElement.textContent = 'Inspire';
        else if (this.hold1CUST || this.hold2CUST) this.CUSTballText.nativeElement.textContent = 'Segure';
        else if (this.exhaleCUST) this.CUSTballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleCUST) this.CUSTballText.nativeElement.textContent = 'Inhale';
        else if (this.hold1CUST || this.hold2CUST) this.CUSTballText.nativeElement.textContent = 'Hold';
        else if (this.exhaleCUST) this.CUSTballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnCUST.nativeElement.disabled = true;
      this.stopBtnCUST.nativeElement.style.display = 'none';
      this.CUSTSave.nativeElement.disabled = true;
      this.CUSTSave.nativeElement.style.display = 'none';
      this.CUSTinterval = setInterval(() => this.startTimerCUST(), 1000);
      this.CUSTTimer = setInterval(() => this.DisplayTimerCUST(), 1000);
      this.startCountdownCUST();
    }
  }

  startCountdownCUST(): void {
    if (this.CUSTduration !== Infinity) {
      const Contdownminutes = Math.floor(this.CUSTduration / 60);
      const Contdownseconds = this.CUSTduration % 60;
      this.CUSTcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.CUSTcountdown = setInterval(() => {
        if (this.CUSTduration === 0) {
          clearInterval(this.CUSTcountdown);
          this.CUSTcountdown = null;
        } else {
          this.CUSTduration--;
          const Contdownminutes = Math.floor(this.CUSTduration / 60);
          const Contdownseconds = this.CUSTduration % 60;
          this.CUSTcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.CUSTcountdownInput.nativeElement.value = '∞';
      this.CUSTcountdownInput.nativeElement.style.display = 'inline';
      this.CUSTtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerCUST(): Promise<void> {
    this.CUSTcurrentValue--;

    if (this.inhaleCUST && (this.CUSTcurrentValue === 1 || this.CUSTcurrentValue === 0)) {
      this.CUSTcurrentValue = parseInt(this.hold1InputCUST.nativeElement.value) + 1;
      if (this.CUSTcurrentValue === 1) {
        this.CUSTcurrentValue = parseInt(this.exhaleInputCUST.nativeElement.value) + 1;
        this.inhaleCUST = false;
        this.exhaleCUST = true;
        await this.audioService.playSound('exhale');
        await this.audioService.playBreathSound('exhaleBreath', this.CUSTcurrentValue);
        this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
        this.globalService.changeBall(1, parseInt(this.exhaleInputCUST.nativeElement.value), this.CUSTball);
      } else {
        this.inhaleCUST = false;
        this.hold1CUST = true;
        await this.audioService.playSound('hold');
        this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
        this.globalService.changeBall(1.3, parseInt(this.hold1InputCUST.nativeElement.value), this.CUSTball);
      }

    } else if (this.hold1CUST && this.CUSTcurrentValue === 1) {
      this.CUSTcurrentValue = parseInt(this.exhaleInputCUST.nativeElement.value) + 1;
      this.hold1CUST = false;
      this.exhaleCUST = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.CUSTcurrentValue);
      this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, parseInt(this.exhaleInputCUST.nativeElement.value), this.CUSTball);

    } else if (this.exhaleCUST && (this.CUSTcurrentValue === 1 || this.CUSTcurrentValue === 0)) {
      if (this.CUSTduration !== 0) {
        this.CUSTcurrentValue = parseInt(this.hold2InputCUST.nativeElement.value) + 1;
        if (this.CUSTcurrentValue === 1) {
          this.CUSTcurrentValue = parseInt(this.inhaleInputCUST.nativeElement.value) + 1;
          this.exhaleCUST = false;
          this.inhaleCUST = true;
          await this.audioService.playSound('inhale');
          await this.audioService.playBreathSound('inhaleBreath', this.CUSTcurrentValue);
          this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
          this.globalService.changeBall(1.5, parseInt(this.inhaleInputCUST.nativeElement.value), this.CUSTball);
          this.roundsCUST++;
          this.roundsDoneCUST.nativeElement.innerHTML = this.roundsCUST.toString();
        } else {
          this.exhaleCUST = false;
          this.hold2CUST = true;
          await this.audioService.playSound('hold');
          this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
          this.globalService.changeBall(1, parseInt(this.hold2InputCUST.nativeElement.value), this.CUSTball);
          this.roundsCUST++;
          this.roundsDoneCUST.nativeElement.innerHTML = this.roundsCUST.toString();
        }
      } else {
        this.clearIntervalsCUST();
        localStorage.setItem('breathingON', 'false');
        this.startBtnCUST.nativeElement.disabled = true;
        this.settingsCUST.nativeElement.disabled = false;
        this.questionCUST.nativeElement.disabled = false;
        this.stopBtnCUST.nativeElement.disabled = false;
        this.stopBtnCUST.nativeElement.style.display = 'inline-flex';
        this.CUSTSave.nativeElement.disabled = false;
        this.CUSTSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.CUSTball);
        this.CUSTcountdownInput.nativeElement.style.display = 'none';
        this.CUSTtimeInput.nativeElement.style.display = 'inline';
        this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }

    } else if (this.hold2CUST && this.CUSTcurrentValue === 1) {
      this.CUSTcurrentValue = parseInt(this.inhaleInputCUST.nativeElement.value) + 1;
      this.hold2CUST = false;
      this.inhaleCUST = true;
      await this.audioService.playSound('inhale');
      this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
      this.globalService.changeBall(1.5, parseInt(this.inhaleInputCUST.nativeElement.value), this.CUSTball);
    }
  }

  DisplayTimerCUST(): void {
    this.CUSTSeconds++;
    if (this.CUSTSeconds === 60) {
      this.CUSTSeconds = 0;
      this.CUSTMinutes++;
    }
    const M = this.CUSTMinutes < 10 ? '0' + this.CUSTMinutes : this.CUSTMinutes;
    const S = this.CUSTSeconds < 10 ? '0' + this.CUSTSeconds : this.CUSTSeconds;
    this.timerDisplayCUST.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopCUST(): void {
    this.clearIntervalsCUST();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.CUSTcountdownInput.nativeElement.style.display = 'none';
    this.CUSTtimeInput.nativeElement.style.display = 'inline';
    this.CUSTcurrentValue = parseInt(this.inhaleInputCUST.nativeElement.value) + 1;
    this.startBtnCUST.nativeElement.disabled = false;
    this.stopBtnCUST.nativeElement.disabled = true;
    this.stopBtnCUST.nativeElement.style.display = 'none';
    this.CUSTSave.nativeElement.disabled = true;
    this.CUSTSave.nativeElement.style.display = 'none';
    this.inhaleCUST = true;
    this.hold1CUST = false;
    this.exhaleCUST = false;
    this.hold2CUST = false;
    this.globalService.changeBall(1, 1, this.CUSTball);
    this.CUSTballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsCUST = 0;
    this.roundsDoneCUST.nativeElement.innerHTML = '0';
    this.timerDisplayCUST.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setCUSTduration();
    this.CUSTSeconds = 0;
    this.CUSTMinutes = 0;
    this.roundsCUST = 0;
    this.inhaleInputCUST.nativeElement.disabled = false;
    this.hold1InputCUST.nativeElement.disabled = false;
    this.exhaleInputCUST.nativeElement.disabled = false;
    this.hold2InputCUST.nativeElement.disabled = false;
  }

  saveCUST(): void {
    this.CUSTResult = this.timerDisplayCUST.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('CUSTResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.CUSTResult, rounds: this.roundsCUST });
    localStorage.setItem('CUSTResults', JSON.stringify(savedResults));
    this.CUSTResultSaved.nativeElement.style.display = 'block';
    this.stopCUST();
  }

  clearIntervalsCUST(): void {
    clearInterval(this.CUSTinterval);
    clearInterval(this.CUSTcountdown);
    clearInterval(this.CUSTTimer);
    this.CUSTinterval = null;
    this.CUSTcountdown = null;
    this.CUSTTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopCUST();
    if (this.CUSTResultSaved?.nativeElement) {
      this.CUSTResultSaved.nativeElement.style.display = 'none';
    }
  }
}