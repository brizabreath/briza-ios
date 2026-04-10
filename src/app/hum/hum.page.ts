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
  selector: 'app-hum',
  templateUrl: './hum.page.html',
  styleUrls: ['./hum.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class HUMPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionHUM') questionHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('HUMball') HUMball!: ElementRef<HTMLDivElement>;
  @ViewChild('HUMballText') HUMballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('HUMtimeInput') HUMtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('HUMcountdownInput') HUMcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnHUM') startBtnHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnHUM') stopBtnHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('HUMSave') HUMSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsHUM') settingsHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneHUM') roundsDoneHUM!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayHUM') timerDisplayHUM!: ElementRef<HTMLDivElement>;
  @ViewChild('HUMResultSaved') HUMResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusHUM') minusHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusHUM') plusHUM!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputHUM') inhaleInputHUM!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputHUM') hold1InputHUM!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputHUM') exhaleInputHUM!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputHUM') hold2InputHUM!: ElementRef<HTMLInputElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleHUM = true;
  private hold1HUM = false;
  private exhaleHUM = false;
  private hold2HUM = false;
  private HUMinterval: any = null;
  private HUMcountdown: any = null;
  private HUMcurrentValue = 5;
  private HUMduration = 0;
  private HUMSeconds = 0;
  private HUMMinutes = 0;
  private roundsHUM = 0;
  private HUMTimer: any = null;
  private HUMResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let HUMi = 2; HUMi <= 60; HUMi++) {
      const HUMoption = document.createElement('option');
      HUMoption.value = (HUMi * 60).toString();
      HUMoption.textContent = this.isPortuguese ? `${HUMi} minutos` : `${HUMi} minutes`;
      this.HUMtimeInput.nativeElement.appendChild(HUMoption);
    }

    this.minusHUM.nativeElement.onclick = () => this.minusRatioHUM();
    this.plusHUM.nativeElement.onclick = () => this.plusRatioHUM();
    this.startBtnHUM.nativeElement.onclick = () => this.startHUM();
    this.stopBtnHUM.nativeElement.onclick = () => this.stopHUM();
    this.HUMSave.nativeElement.onclick = () => this.saveHUM();

    this.stopBtnHUM.nativeElement.disabled = true;
    this.stopBtnHUM.nativeElement.style.display = 'none';
    this.HUMSave.nativeElement.disabled = true;
    this.HUMSave.nativeElement.style.display = 'none';

    this.HUMtimeInput.nativeElement.onchange = () => this.setHUMduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setHUMduration(): void {
    const selectedValue = this.HUMtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.HUMduration = Infinity;
    } else {
      this.HUMduration = parseInt(selectedValue, 10);
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
          await this.startHUM();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopHUM();
        }
      }
    });

    this.HUMballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setHUMduration();
    this.HUMResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('hum_guide_seen')) {
      localStorage.setItem('hum_guide_seen', 'true');
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
        id: 'hum-intro',
        text: `<h3>${t('Bhramari — Humming Breath', 'Bhramari — Respiração com Zumbido')}</h3>
               <p>${t(
                 'Bhramari is a simple breathing technique with powerful health benefits. Its key advantage is stimulating the production of nitric oxide — a molecule that promotes vasodilation, improves blood flow, lowers blood pressure, and has anti-inflammatory and antimicrobial properties.',
                 'Bhramari é uma técnica de respiração simples com poderosos benefícios à saúde. Seu principal benefício é estimular a produção de óxido nítrico — uma molécula que promove vasodilatação, melhora o fluxo sanguíneo, reduz a pressão arterial e possui propriedades anti-inflamatórias e antimicrobianas.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'hum-posture',
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

      // 3 - Minus button
      steps.push({
        id: 'hum-minus-btn',
        text: `<h3>${t('Decrease ratio', 'Diminuir proporção')}</h3>
               <p>${t(
                 'Use the minus button to lower all four phases together. Start with a ratio that feels comfortable — reduce it if the humming phase feels too long or your heart rate increases.',
                 'Use o botão de menos para diminuir todas as quatro fases juntas. Comece com uma proporção confortável — reduza se a fase de zumbido parecer longa demais ou seu coração acelerar.'
               )}</p>`,
        attachTo: { element: '#hum-minus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Inhale
      steps.push({
        id: 'hum-inhale-item',
        text: `<h3>${t('Inhale', 'Inspire')}</h3>
               <p>${t(
                 'Breathe in slowly and deeply through the nose. Fill your lungs from the bottom up, letting the belly expand first.',
                 'Inspire lenta e profundamente pelo nariz. Encha os pulmões de baixo para cima, deixando a barriga expandir primeiro.'
               )}</p>`,
        attachTo: { element: '#hum-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Hold 1
      steps.push({
        id: 'hum-hold1-item',
        text: `<h3>${t('Pause after inhale', 'Pausa após inspirar')}</h3>
               <p>${t(
                 'Hold briefly after the inhale. Keep your body relaxed — this short pause prepares you for the humming exhalation.',
                 'Segure brevemente após a inspiração. Mantenha o corpo relaxado — essa pequena pausa prepara você para a expiração com zumbido.'
               )}</p>`,
        attachTo: { element: '#hum-hold1-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Hum exhale
      steps.push({
        id: 'hum-exhale-item',
        text: `<h3>${t('Hum', 'Zumbir')}</h3>
               <p>${t(
                 'This is what makes the technique unique. Gently seal your lips and exhale while creating a humming sound — like a quiet "mmm". The vibration from the hum is what stimulates nitric oxide production in the sinuses. Keep it soft and steady.',
                 'É isso que torna a técnica única. Sele suavemente os lábios e expire criando um som de zumbido — como um "mmm" suave. A vibração do zumbido é o que estimula a produção de óxido nítrico nos seios nasais. Mantenha suave e constante.'
               )}</p>`,
        attachTo: { element: '#hum-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Hold 2
      steps.push({
        id: 'hum-hold2-item',
        text: `<h3>${t('Pause after hum', 'Pausa após o zumbido')}</h3>
               <p>${t(
                 'Hold briefly after the hum before the next inhale. Stay relaxed — this pause completes the cycle and allows the effects of the humming to settle.',
                 'Segure brevemente após o zumbido antes da próxima inspiração. Fique relaxado — essa pausa completa o ciclo e permite que os efeitos do zumbido se assentem.'
               )}</p>`,
        attachTo: { element: '#hum-hold2-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Plus button
      steps.push({
        id: 'hum-plus-btn',
        text: `<h3>${t('Increase ratio', 'Aumentar proporção')}</h3>
               <p>${t(
                 'Use the plus button to extend all phases together as you progress. Increase gradually — a longer hum duration produces more nitric oxide, but only increase when the current ratio feels easy.',
                 'Use o botão de mais para aumentar todas as fases juntas conforme você avança. Aumente gradualmente — uma duração de zumbido mais longa produz mais óxido nítrico, mas aumente apenas quando a proporção atual parecer fácil.'
               )}</p>`,
        attachTo: { element: '#hum-plus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 9 - Duration
      steps.push({
        id: 'hum-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to stay on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#hum-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 10 - Start circle
      steps.push({
        id: 'hum-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm. Press it again at any time to pause. Remember to save your results at the end to track your progress over time.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final para acompanhar sua evolução.'
               )}</p>`,
        attachTo: { element: '#hum-start-ball', on: 'top' },
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

  minusRatioHUM(): void {
    if (parseInt(this.inhaleInputHUM.nativeElement.value) > 4) {
      this.inhaleInputHUM.nativeElement.value = ((parseInt(this.inhaleInputHUM.nativeElement.value) || 0) - 2).toString();
      this.hold1InputHUM.nativeElement.value = ((parseInt(this.hold1InputHUM.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputHUM.nativeElement.value = ((parseInt(this.exhaleInputHUM.nativeElement.value) || 0) - 3).toString();
      this.hold2InputHUM.nativeElement.value = ((parseInt(this.hold2InputHUM.nativeElement.value) || 0) - 1).toString();
    }
  }

  plusRatioHUM(): void {
    if (parseInt(this.inhaleInputHUM.nativeElement.value) < 30) {
      this.inhaleInputHUM.nativeElement.value = ((parseInt(this.inhaleInputHUM.nativeElement.value) || 0) + 2).toString();
      this.hold1InputHUM.nativeElement.value = ((parseInt(this.hold1InputHUM.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputHUM.nativeElement.value = ((parseInt(this.exhaleInputHUM.nativeElement.value) || 0) + 3).toString();
      this.hold2InputHUM.nativeElement.value = ((parseInt(this.hold2InputHUM.nativeElement.value) || 0) + 1).toString();
    }
  }

  async startHUM(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsHUM.nativeElement.disabled = true;
    this.questionHUM.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnHUM.nativeElement.disabled = true;
      this.inhaleHUM = true;
      this.HUMcountdownInput.nativeElement.style.display = 'inline';
      this.HUMtimeInput.nativeElement.style.display = 'none';
      this.startCountdownHUM();
      this.HUMballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => {
        this.HUMballText.nativeElement.textContent = '2';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.HUMballText.nativeElement.textContent = '1';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.HUMballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        this.HUMcurrentValue = parseInt(this.inhaleInputHUM.nativeElement.value) + 1;
        await this.audioService.playBreathSound('inhaleBreath', this.HUMcurrentValue);
        this.globalService.changeBall(1.5, 5, this.HUMball);
        this.HUMinterval = setInterval(() => this.startTimerHUM(), 1000);
        this.HUMTimer = setInterval(() => this.DisplayTimerHUM(), 1000);
        this.startBtnHUM.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsHUM();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnHUM.nativeElement.disabled = false;
      this.stopBtnHUM.nativeElement.style.display = 'inline-flex';

      if (this.roundsHUM > 0) {
        this.HUMSave.nativeElement.disabled = false;
        this.HUMSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsHUM.nativeElement.disabled = false;
      this.questionHUM.nativeElement.disabled = false;
      this.HUMballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleHUM) this.HUMballText.nativeElement.textContent = 'Inspire';
        else if (this.hold1HUM || this.hold2HUM) this.HUMballText.nativeElement.textContent = 'Segure';
        else if (this.exhaleHUM) this.HUMballText.nativeElement.textContent = 'Zumbir';
      } else {
        if (this.inhaleHUM) this.HUMballText.nativeElement.textContent = 'Inhale';
        else if (this.hold1HUM || this.hold2HUM) this.HUMballText.nativeElement.textContent = 'Hold';
        else if (this.exhaleHUM) this.HUMballText.nativeElement.textContent = 'Hum';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnHUM.nativeElement.disabled = true;
      this.stopBtnHUM.nativeElement.style.display = 'none';
      this.HUMSave.nativeElement.disabled = true;
      this.HUMSave.nativeElement.style.display = 'none';
      this.HUMinterval = setInterval(() => this.startTimerHUM(), 1000);
      this.HUMTimer = setInterval(() => this.DisplayTimerHUM(), 1000);
      this.startCountdownHUM();
    }
  }

  startCountdownHUM(): void {
    if (this.HUMduration !== Infinity) {
      const Contdownminutes = Math.floor(this.HUMduration / 60);
      const Contdownseconds = this.HUMduration % 60;
      this.HUMcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.HUMcountdown = setInterval(() => {
        if (this.HUMduration === 0) {
          clearInterval(this.HUMcountdown);
          this.HUMcountdown = null;
        } else {
          this.HUMduration--;
          const Contdownminutes = Math.floor(this.HUMduration / 60);
          const Contdownseconds = this.HUMduration % 60;
          this.HUMcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.HUMcountdownInput.nativeElement.value = '∞';
      this.HUMcountdownInput.nativeElement.style.display = 'inline';
      this.HUMtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerHUM(): Promise<void> {
    this.HUMcurrentValue--;

    if (this.inhaleHUM && this.HUMcurrentValue === 1) {
      this.HUMcurrentValue = parseInt(this.hold1InputHUM.nativeElement.value) + 1;
      this.inhaleHUM = false;
      this.hold1HUM = true;
      await this.audioService.playSound('pause');
      this.HUMballText.nativeElement.textContent = 'Pause';
      this.globalService.changeBall(1.3, 3, this.HUMball);

    } else if (this.hold1HUM && this.HUMcurrentValue === 1) {
      this.HUMcurrentValue = parseInt(this.exhaleInputHUM.nativeElement.value) + 1;
      this.hold1HUM = false;
      this.exhaleHUM = true;
      await this.audioService.playSound('hum');
      await this.audioService.playBreathSound('humming', this.HUMcurrentValue - 1);
      this.HUMballText.nativeElement.textContent = this.isPortuguese ? 'Zumbir' : 'Hum';
      this.globalService.changeBall(1, 7, this.HUMball);

    } else if (this.exhaleHUM && this.HUMcurrentValue === 1) {
      this.HUMcurrentValue = parseInt(this.hold2InputHUM.nativeElement.value) + 1;
      this.exhaleHUM = false;
      this.hold2HUM = true;
      await this.audioService.playSound('pause');
      this.HUMballText.nativeElement.textContent = 'Pause';
      this.globalService.changeBall(1, 3, this.HUMball);
      this.roundsHUM++;
      this.roundsDoneHUM.nativeElement.innerHTML = this.roundsHUM.toString();

    } else if (this.hold2HUM && this.HUMcurrentValue === 1) {
      if (this.HUMduration !== 0) {
        this.HUMcurrentValue = parseInt(this.inhaleInputHUM.nativeElement.value) + 1;
        this.hold2HUM = false;
        this.inhaleHUM = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.HUMcurrentValue);
        this.HUMballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, 5, this.HUMball);
      } else {
        this.clearIntervalsHUM();
        localStorage.setItem('breathingON', 'false');
        this.startBtnHUM.nativeElement.disabled = true;
        this.settingsHUM.nativeElement.disabled = false;
        this.questionHUM.nativeElement.disabled = false;
        this.stopBtnHUM.nativeElement.disabled = false;
        this.stopBtnHUM.nativeElement.style.display = 'inline-flex';
        this.HUMSave.nativeElement.disabled = false;
        this.HUMSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.HUMball);
        this.HUMcountdownInput.nativeElement.style.display = 'none';
        this.HUMtimeInput.nativeElement.style.display = 'inline';
        this.HUMballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }
    }
  }

  DisplayTimerHUM(): void {
    this.HUMSeconds++;
    if (this.HUMSeconds === 60) {
      this.HUMSeconds = 0;
      this.HUMMinutes++;
    }
    const M = this.HUMMinutes < 10 ? '0' + this.HUMMinutes : this.HUMMinutes;
    const S = this.HUMSeconds < 10 ? '0' + this.HUMSeconds : this.HUMSeconds;
    this.timerDisplayHUM.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopHUM(): void {
    this.clearIntervalsHUM();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.HUMcountdownInput.nativeElement.style.display = 'none';
    this.HUMtimeInput.nativeElement.style.display = 'inline';
    this.HUMcurrentValue = parseInt(this.inhaleInputHUM.nativeElement.value) + 1;
    this.startBtnHUM.nativeElement.disabled = false;
    this.stopBtnHUM.nativeElement.disabled = true;
    this.stopBtnHUM.nativeElement.style.display = 'none';
    this.HUMSave.nativeElement.disabled = true;
    this.HUMSave.nativeElement.style.display = 'none';
    this.inhaleHUM = true;
    this.hold1HUM = false;
    this.exhaleHUM = false;
    this.hold2HUM = false;
    this.globalService.changeBall(1, 1, this.HUMball);
    this.HUMballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsHUM = 0;
    this.roundsDoneHUM.nativeElement.innerHTML = '0';
    this.timerDisplayHUM.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setHUMduration();
    this.HUMSeconds = 0;
    this.HUMMinutes = 0;
    this.roundsHUM = 0;
  }

  saveHUM(): void {
    this.HUMResult = this.timerDisplayHUM.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('HUMResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.HUMResult, rounds: this.roundsHUM });
    localStorage.setItem('HUMResults', JSON.stringify(savedResults));
    this.HUMResultSaved.nativeElement.style.display = 'block';
    this.stopHUM();
  }

  clearIntervalsHUM(): void {
    clearInterval(this.HUMinterval);
    clearInterval(this.HUMcountdown);
    clearInterval(this.HUMTimer);
    this.HUMinterval = null;
    this.HUMcountdown = null;
    this.HUMTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopHUM();
    if (this.HUMResultSaved?.nativeElement) {
      this.HUMResultSaved.nativeElement.style.display = 'none';
    }
  }
}