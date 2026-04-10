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
  selector: 'app-bre',
  templateUrl: './bre.page.html',
  styleUrls: ['./bre.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BREPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionBRE') questionBRE!: ElementRef<HTMLButtonElement>;
  @ViewChild('BREball') BREball!: ElementRef<HTMLDivElement>;
  @ViewChild('BREballText') BREballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('BREtimeInput') BREtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('BREcountdownInput') BREcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnBRE') startBtnBRE!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnBRE') stopBtnBRE!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRESave') BRESave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsBRE') settingsBRE!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputBRE') inhaleInputBRE!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputBRE') hold1InputBRE!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputBRE') exhaleInputBRE!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputBRE') hold2InputBRE!: ElementRef<HTMLInputElement>;
  @ViewChild('hold3InputBRE') hold3InputBRE!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneBRE') roundsDoneBRE!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayBRE') timerDisplayBRE!: ElementRef<HTMLDivElement>;
  @ViewChild('BREResultSaved') BREResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusBRE') minusBRE!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusBRE') plusBRE!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleBRE = true;
  private hold1BRE = false;
  private exhaleBRE = false;
  private hold2BRE = false;
  private hold3BRE = false;
  private BREinterval: any = null;
  private BREcountdown: any = null;
  private BREcurrentValue = 6;
  private BREduration = 0;
  private roundsBRE = 0;
  private BRESeconds = 0;
  private BREMinutes = 0;
  private BRETimer: any = null;
  private BREResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let BREi = 2; BREi <= 60; BREi++) {
      const BREoption = document.createElement('option');
      BREoption.value = (BREi * 60).toString();
      BREoption.textContent = this.isPortuguese ? `${BREi} minutos` : `${BREi} minutes`;
      this.BREtimeInput.nativeElement.appendChild(BREoption);
    }

    this.minusBRE.nativeElement.onclick = () => this.minusRatioBRE();
    this.plusBRE.nativeElement.onclick = () => this.plusRatioBRE();
    this.startBtnBRE.nativeElement.onclick = () => this.startBRE();
    this.stopBtnBRE.nativeElement.onclick = () => this.stopBRE();
    this.BRESave.nativeElement.onclick = () => this.saveBRE();

    this.stopBtnBRE.nativeElement.disabled = true;
    this.stopBtnBRE.nativeElement.style.display = 'none';
    this.BRESave.nativeElement.disabled = true;
    this.BRESave.nativeElement.style.display = 'none';

    this.BREtimeInput.nativeElement.onchange = () => this.setBREduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setBREduration(): void {
    const selectedValue = this.BREtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.BREduration = Infinity;
    } else {
      this.BREduration = parseInt(selectedValue, 10);
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
          await this.startBRE();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopBRE();
        }
      }
    });

    this.BREballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setBREduration();
    this.BREResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('bre_guide_seen')) {
      localStorage.setItem('bre_guide_seen', 'true');
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
        id: 'bre-intro',
        text: `<h3>${t('Breath Recovery Exercise', 'Exercício de Recuperação Respiratória')}</h3>
               <p>${t(
                 'A simple exercise designed to recover your breath after physical activity. By combining light breathing with a short breath hold, it helps reset your breathing pattern and calm your nervous system after exertion.',
                 'Um exercício simples para recuperar sua respiração após uma atividade física. Ao combinar respiração leve com uma curta retenção, ele ajuda a redefinir o padrão respiratório e acalmar o sistema nervoso após o esforço.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'bre-posture',
        text: `<h3>${t('Get comfortable', 'Fique confortável')}</h3>
               <p>${t(
                 'Find a comfortable seat or lay down. Relax your shoulders, face muscles and jaw. Place your tongue on the roof of your mouth, its tip touching the top of your front teeth.',
                 'Encontre um assento confortável ou deite-se. Relaxe os ombros, músculos faciais e a mandíbula. Coloque a língua no céu da boca, a ponta deve tocar o topo dos seus dentes da frente.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Minus button
      steps.push({
        id: 'bre-minus-btn',
        text: `<h3>${t('Decrease breath hold', 'Diminuir retenção')}</h3>
               <p>${t(
                 'Use the minus button to shorten the breath hold time. The hold can be set between 2 and 10 seconds — if it feels too hard, reduce it until you find a comfortable level.',
                 'Use o botão de menos para diminuir o tempo de retenção. A retenção pode ser ajustada entre 2 e 10 segundos — se parecer muito difícil, reduza até encontrar um nível confortável.'
               )}</p>`,
        attachTo: { element: '#bre-minus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Inhale 1
      steps.push({
        id: 'bre-inhale-item',
        text: `<h3>${t('Inhale', 'Inspire')}</h3>
               <p>${t(
                 'Breathe in lightly through the nose. Keep the volume small and gentle — you should barely hear your breath coming in.',
                 'Inspire levemente pelo nariz. Mantenha o volume pequeno e suave — você mal deve ouvir a respiração entrando.'
               )}</p>`,
        attachTo: { element: '#bre-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Exhale 1
      steps.push({
        id: 'bre-hold1-item',
        text: `<h3>${t('Exhale', 'Espire')}</h3>
               <p>${t(
                 'Breathe out lightly through the nose. Keep the exhalation slow and quiet — match the same gentle volume as the inhale.',
                 'Expire levemente pelo nariz. Mantenha a expiração lenta e silenciosa — combine o mesmo volume suave da inspiração.'
               )}</p>`,
        attachTo: { element: '#bre-hold1-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Inhale 2
      steps.push({
        id: 'bre-exhale-item',
        text: `<h3>${t('Inhale again', 'Inspire novamente')}</h3>
               <p>${t(
                 'A second light inhale through the nose. The double inhale-exhale cycle before the hold helps build a gentle air hunger, making the hold more effective.',
                 'Uma segunda inspiração leve pelo nariz. O ciclo duplo de inspirar-expirar antes da retenção ajuda a criar uma leve fome de ar, tornando a retenção mais eficaz.'
               )}</p>`,
        attachTo: { element: '#bre-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Exhale 2
      steps.push({
        id: 'bre-hold2-item',
        text: `<h3>${t('Exhale again', 'Espire novamente')}</h3>
               <p>${t(
                 'A second light exhale through the nose. After this the breath hold begins — release all tension from your body as you finish this exhale.',
                 'Uma segunda expiração leve pelo nariz. Após isso, a retenção começa — solte toda a tensão do corpo ao terminar esta expiração.'
               )}</p>`,
        attachTo: { element: '#bre-hold2-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Hold
      steps.push({
        id: 'bre-hold3-item',
        text: `<h3>${t('Breath hold', 'Retenção')}</h3>
               <p>${t(
                 'Hold your breath for this many seconds — adjustable between 2 and 10. Stay relaxed and calm. If the hold feels too hard, use the minus button to reduce it before your next session.',
                 'Segure a respiração por este número de segundos — ajustável entre 2 e 10. Fique relaxado e calmo. Se a retenção parecer muito difícil, use o botão de menos para reduzi-la antes da próxima sessão.'
               )}</p>`,
        attachTo: { element: '#bre-hold3-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 9 - Plus button
      steps.push({
        id: 'bre-plus-btn',
        text: `<h3>${t('Increase breath hold', 'Aumentar retenção')}</h3>
               <p>${t(
                 'Use the plus button to extend the breath hold as you progress. Increase gradually — only when the current hold feels easy and your breathing recovers smoothly after each round.',
                 'Use o botão de mais para aumentar a retenção conforme você avança. Aumente gradualmente — apenas quando a retenção atual parecer fácil e sua respiração se recuperar suavemente após cada rodada.'
               )}</p>`,
        attachTo: { element: '#bre-plus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 10 - Duration
      steps.push({
        id: 'bre-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to stay on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#bre-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 11 - Start circle
      steps.push({
        id: 'bre-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm. Press it again at any time to pause. Remember to save your results at the end to track your progress over time.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final para acompanhar sua evolução.'
               )}</p>`,
        attachTo: { element: '#bre-start-ball', on: 'top' },
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

  minusRatioBRE(): void {
    if (parseInt(this.hold3InputBRE.nativeElement.value) > 2) {
      this.hold3InputBRE.nativeElement.value = ((parseInt(this.hold3InputBRE.nativeElement.value) || 0) - 1).toString();
    }
  }

  plusRatioBRE(): void {
    if (parseInt(this.hold3InputBRE.nativeElement.value) < 10) {
      this.hold3InputBRE.nativeElement.value = ((parseInt(this.hold3InputBRE.nativeElement.value) || 0) + 1).toString();
    }
  }

  async startBRE(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsBRE.nativeElement.disabled = true;
    this.questionBRE.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnBRE.nativeElement.disabled = true;
      this.inhaleBRE = true;
      this.BREcountdownInput.nativeElement.style.display = 'inline';
      this.BREtimeInput.nativeElement.style.display = 'none';
      this.startCountdownBRE();
      this.BREballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => {
        this.BREballText.nativeElement.textContent = '2';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.BREballText.nativeElement.textContent = '1';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.BREballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.BREcurrentValue - 1);
        this.globalService.changeBall(1.5, 5, this.BREball);
        this.BREinterval = setInterval(() => this.startTimerBRE(), 1000);
        this.BRETimer = setInterval(() => this.DisplayTimerBRE(), 1000);
        this.startBtnBRE.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsBRE();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnBRE.nativeElement.disabled = false;
      this.stopBtnBRE.nativeElement.style.display = 'inline-flex';

      if (this.roundsBRE > 0) {
        this.BRESave.nativeElement.disabled = false;
        this.BRESave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsBRE.nativeElement.disabled = false;
      this.questionBRE.nativeElement.disabled = false;
      this.BREballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleBRE || this.exhaleBRE) this.BREballText.nativeElement.textContent = 'Inspire';
        else if (this.hold1BRE || this.hold2BRE) this.BREballText.nativeElement.textContent = 'Espire';
        else if (this.hold3BRE) this.BREballText.nativeElement.textContent = 'Segure';
      } else {
        if (this.inhaleBRE || this.exhaleBRE) this.BREballText.nativeElement.textContent = 'Inhale';
        else if (this.hold1BRE || this.hold2BRE) this.BREballText.nativeElement.textContent = 'Exhale';
        else if (this.hold3BRE) this.BREballText.nativeElement.textContent = 'Hold';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnBRE.nativeElement.disabled = true;
      this.stopBtnBRE.nativeElement.style.display = 'none';
      this.BRESave.nativeElement.disabled = true;
      this.BRESave.nativeElement.style.display = 'none';
      this.BREinterval = setInterval(() => this.startTimerBRE(), 1000);
      this.BRETimer = setInterval(() => this.DisplayTimerBRE(), 1000);
      this.startCountdownBRE();
    }
  }

  startCountdownBRE(): void {
    if (this.BREduration !== Infinity) {
      const Contdownminutes = Math.floor(this.BREduration / 60);
      const Contdownseconds = this.BREduration % 60;
      this.BREcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.BREcountdown = setInterval(() => {
        if (this.BREduration === 0) {
          clearInterval(this.BREcountdown);
          this.BREcountdown = null;
        } else {
          this.BREduration--;
          const Contdownminutes = Math.floor(this.BREduration / 60);
          const Contdownseconds = this.BREduration % 60;
          this.BREcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.BREcountdownInput.nativeElement.value = '∞';
      this.BREcountdownInput.nativeElement.style.display = 'inline';
      this.BREtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerBRE(): Promise<void> {
    this.BREcurrentValue--;

    if (this.inhaleBRE && this.BREcurrentValue === 1) {
      this.BREcurrentValue = parseInt(this.hold1InputBRE.nativeElement.value) + 2;
      this.inhaleBRE = false;
      this.hold1BRE = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.BREcurrentValue - 1);
      this.BREballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, 5, this.BREball);

    } else if (this.hold1BRE && this.BREcurrentValue === 1) {
      this.BREcurrentValue = parseInt(this.exhaleInputBRE.nativeElement.value) + 2;
      this.hold1BRE = false;
      this.exhaleBRE = true;
      await this.audioService.playSound('inhale');
      await this.audioService.playBreathSound('inhaleBreath', this.BREcurrentValue - 1);
      this.BREballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
      this.globalService.changeBall(1.5, 5, this.BREball);

    } else if (this.exhaleBRE && this.BREcurrentValue === 1) {
      this.BREcurrentValue = parseInt(this.hold2InputBRE.nativeElement.value) + 2;
      this.exhaleBRE = false;
      this.hold2BRE = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.BREcurrentValue - 1);
      this.BREballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, 5, this.BREball);

    } else if (this.hold2BRE && this.BREcurrentValue === 1) {
      this.BREcurrentValue = parseInt(this.hold3InputBRE.nativeElement.value) + 1;
      this.hold2BRE = false;
      this.hold3BRE = true;
      await this.audioService.playSound('hold');
      this.BREballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
      this.roundsBRE++;
      this.roundsDoneBRE.nativeElement.innerHTML = this.roundsBRE.toString();

    } else if (this.hold3BRE && this.BREcurrentValue === 1) {
      if (this.BREduration !== 0) {
        this.BREcurrentValue = parseInt(this.inhaleInputBRE.nativeElement.value) + 2;
        this.hold3BRE = false;
        this.inhaleBRE = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.BREcurrentValue - 1);
        this.BREballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, 5, this.BREball);
      } else {
        this.clearIntervalsBRE();
        localStorage.setItem('breathingON', 'false');
        this.startBtnBRE.nativeElement.disabled = true;
        this.settingsBRE.nativeElement.disabled = false;
        this.questionBRE.nativeElement.disabled = false;
        this.stopBtnBRE.nativeElement.disabled = false;
        this.stopBtnBRE.nativeElement.style.display = 'inline-flex';
        this.BRESave.nativeElement.disabled = false;
        this.BRESave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.BREball);
        this.BREcountdownInput.nativeElement.style.display = 'none';
        this.BREtimeInput.nativeElement.style.display = 'inline';
        this.BREballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }
    }
  }

  DisplayTimerBRE(): void {
    this.BRESeconds++;
    if (this.BRESeconds === 60) {
      this.BRESeconds = 0;
      this.BREMinutes++;
    }
    const M = this.BREMinutes < 10 ? '0' + this.BREMinutes : this.BREMinutes;
    const S = this.BRESeconds < 10 ? '0' + this.BRESeconds : this.BRESeconds;
    this.timerDisplayBRE.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopBRE(): void {
    this.clearIntervalsBRE();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.BREcountdownInput.nativeElement.style.display = 'none';
    this.BREtimeInput.nativeElement.style.display = 'inline';
    this.BREcurrentValue = parseInt(this.inhaleInputBRE.nativeElement.value) + 1;
    this.startBtnBRE.nativeElement.disabled = false;
    this.stopBtnBRE.nativeElement.disabled = true;
    this.stopBtnBRE.nativeElement.style.display = 'none';
    this.BRESave.nativeElement.disabled = true;
    this.BRESave.nativeElement.style.display = 'none';
    this.inhaleBRE = true;
    this.hold1BRE = false;
    this.exhaleBRE = false;
    this.hold2BRE = false;
    this.hold3BRE = false;
    this.globalService.changeBall(1, 1, this.BREball);
    this.BREballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsBRE = 0;
    this.roundsDoneBRE.nativeElement.innerHTML = '0';
    this.timerDisplayBRE.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setBREduration();
    this.BRESeconds = 0;
    this.BREMinutes = 0;
    this.roundsBRE = 0;
  }

  saveBRE(): void {
    this.BREResult = this.timerDisplayBRE.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('BREResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.BREResult, rounds: this.roundsBRE });
    localStorage.setItem('BREResults', JSON.stringify(savedResults));
    this.BREResultSaved.nativeElement.style.display = 'block';
    this.stopBRE();
  }

  clearIntervalsBRE(): void {
    clearInterval(this.BREinterval);
    clearInterval(this.BREcountdown);
    clearInterval(this.BRETimer);
    this.BREinterval = null;
    this.BREcountdown = null;
    this.BRETimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopBRE();
    if (this.BREResultSaved?.nativeElement) {
      this.BREResultSaved.nativeElement.style.display = 'none';
    }
  }
}