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
  selector: 'app-brw',
  templateUrl: './brw.page.html',
  styleUrls: ['./brw.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BRWPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionBRW') questionBRW!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRWball') BRWball!: ElementRef<HTMLDivElement>;
  @ViewChild('BRWballText') BRWballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('BRWtimeInput') BRWtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('BRWcountdownInput') BRWcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnBRW') startBtnBRW!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnBRW') stopBtnBRW!: ElementRef<HTMLButtonElement>;
  @ViewChild('BRWSave') BRWSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsBRW') settingsBRW!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputBRW') inhaleInputBRW!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputBRW') hold1InputBRW!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputBRW') exhaleInputBRW!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputBRW') hold2InputBRW!: ElementRef<HTMLInputElement>;
  @ViewChild('hold3InputBRW') hold3InputBRW!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneBRW') roundsDoneBRW!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayBRW') timerDisplayBRW!: ElementRef<HTMLDivElement>;
  @ViewChild('BRWResultSaved') BRWResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusBRW') minusBRW!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusBRW') plusBRW!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleBRW = true;
  private hold1BRW = false;
  private exhaleBRW = false;
  private hold2BRW = false;
  private hold3BRW = false;
  private BRWinterval: any = null;
  private BRWcountdown: any = null;
  private BRWcurrentValue = 5;
  private BRWduration = 0;
  private roundsBRW = 0;
  private BRWSeconds = 0;
  private BRWMinutes = 0;
  private BRWTimer: any = null;
  private BRWResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let BRWi = 2; BRWi <= 60; BRWi++) {
      const BRWoption = document.createElement('option');
      BRWoption.value = (BRWi * 60).toString();
      BRWoption.textContent = this.isPortuguese ? `${BRWi} minutos` : `${BRWi} minutes`;
      this.BRWtimeInput.nativeElement.appendChild(BRWoption);
    }

    this.minusBRW.nativeElement.onclick = () => this.minusRatioBRW();
    this.plusBRW.nativeElement.onclick = () => this.plusRatioBRW();
    this.startBtnBRW.nativeElement.onclick = () => this.startBRW();
    this.stopBtnBRW.nativeElement.onclick = () => this.stopBRW();
    this.BRWSave.nativeElement.onclick = () => this.saveBRW();

    this.stopBtnBRW.nativeElement.disabled = true;
    this.stopBtnBRW.nativeElement.style.display = 'none';
    this.BRWSave.nativeElement.disabled = true;
    this.BRWSave.nativeElement.style.display = 'none';

    this.BRWtimeInput.nativeElement.onchange = () => this.setBRWduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setBRWduration(): void {
    const selectedValue = this.BRWtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.BRWduration = Infinity;
    } else {
      this.BRWduration = parseInt(selectedValue, 10);
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
          await this.startBRW();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopBRW();
        }
      }
    });

    this.BRWballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setBRWduration();
    this.BRWResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('brw_guide_seen')) {
      localStorage.setItem('brw_guide_seen', 'true');
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
        id: 'brw-intro',
        text: `<h3>${t('Breath Recovery Walk', 'Caminhada de Recuperação Respiratória')}</h3>
               <p>${t(
                 'A simple exercise to recover your breath after physical activity. By combining light breathing with short breath holds while walking, it helps reset your breathing pattern and reduce residual breathlessness after exertion.',
                 'Um exercício simples para recuperar sua respiração após uma atividade física. Ao combinar respiração leve com curtas retenções enquanto caminha, ele ajuda a redefinir o padrão respiratório e reduzir a falta de ar residual após o esforço.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Minus button
      steps.push({
        id: 'brw-minus-btn',
        text: `<h3>${t('Decrease breath hold', 'Diminuir retenção')}</h3>
               <p>${t(
                 'Use the minus button to shorten the breath hold. If this is your first attempt, start with 2 seconds. The hold can be set between 2 and 10 seconds — reduce it if it feels too hard while walking.',
                 'Use o botão de menos para diminuir a retenção. Se for sua primeira vez, comece com 2 segundos. A retenção pode ser ajustada entre 2 e 10 segundos — reduza se parecer muito difícil durante a caminhada.'
               )}</p>`,
        attachTo: { element: '#brw-minus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Inhale 1
      steps.push({
        id: 'brw-inhale-item',
        text: `<h3>${t('Inhale', 'Inspire')}</h3>
               <p>${t(
                 'Breathe in lightly through the nose while walking. Allow your breathing to dictate the pace of your walk — keep the volume small and gentle.',
                 'Inspire levemente pelo nariz enquanto caminha. Deixe sua respiração ditar o ritmo da caminhada — mantenha o volume pequeno e suave.'
               )}</p>`,
        attachTo: { element: '#brw-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Exhale 1
      steps.push({
        id: 'brw-hold1-item',
        text: `<h3>${t('Exhale', 'Espire')}</h3>
               <p>${t(
                 'Breathe out lightly through the nose while continuing to walk. Keep it slow and quiet — match the same gentle volume as the inhale.',
                 'Expire levemente pelo nariz enquanto continua caminhando. Mantenha lento e silencioso — combine o mesmo volume suave da inspiração.'
               )}</p>`,
        attachTo: { element: '#brw-hold1-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Inhale 2
      steps.push({
        id: 'brw-exhale-item',
        text: `<h3>${t('Inhale again', 'Inspire novamente')}</h3>
               <p>${t(
                 'A second light inhale through the nose. The double cycle before the hold helps build a gentle air hunger, making the subsequent hold more effective for recovery.',
                 'Uma segunda inspiração leve pelo nariz. O ciclo duplo antes da retenção ajuda a criar uma leve fome de ar, tornando a retenção subsequente mais eficaz para a recuperação.'
               )}</p>`,
        attachTo: { element: '#brw-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Exhale 2
      steps.push({
        id: 'brw-hold2-item',
        text: `<h3>${t('Exhale again', 'Espire novamente')}</h3>
               <p>${t(
                 'A second light exhale through the nose while walking. After this the breath hold begins — keep walking at a steady pace through the hold.',
                 'Uma segunda expiração leve pelo nariz enquanto caminha. Após isso, a retenção começa — continue caminhando em ritmo constante durante a retenção.'
               )}</p>`,
        attachTo: { element: '#brw-hold2-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Hold
      steps.push({
        id: 'brw-hold3-item',
        text: `<h3>${t('Breath hold', 'Retenção')}</h3>
               <p>${t(
                 'Hold your breath for this many seconds while continuing to walk. Keep walking at a steady pace — do not stop. If the hold feels too hard, use the minus button to reduce it before your next session.',
                 'Segure a respiração por este número de segundos enquanto continua caminhando. Mantenha o ritmo constante — não pare. Se a retenção parecer muito difícil, use o botão de menos para reduzi-la antes da próxima sessão.'
               )}</p>`,
        attachTo: { element: '#brw-hold3-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Plus button
      steps.push({
        id: 'brw-plus-btn',
        text: `<h3>${t('Increase breath hold', 'Aumentar retenção')}</h3>
               <p>${t(
                 'Use the plus button to extend the breath hold as you progress. Increase gradually — only when the current hold feels comfortable and your breathing recovers smoothly after each round.',
                 'Use o botão de mais para aumentar a retenção conforme você avança. Aumente gradualmente — apenas quando a retenção atual parecer confortável e sua respiração se recuperar suavemente após cada rodada.'
               )}</p>`,
        attachTo: { element: '#brw-plus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 9 - Duration
      steps.push({
        id: 'brw-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to stay on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#brw-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 10 - Start circle
      steps.push({
        id: 'brw-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm while walking. Press it again at any time to pause. Remember to save your results at the end to track your progress over time.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado enquanto caminha. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final para acompanhar sua evolução.'
               )}</p>`,
        attachTo: { element: '#brw-start-ball', on: 'top' },
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

  minusRatioBRW(): void {
    if (parseInt(this.hold3InputBRW.nativeElement.value) > 2) {
      this.hold3InputBRW.nativeElement.value = ((parseInt(this.hold3InputBRW.nativeElement.value) || 0) - 1).toString();
    }
  }

  plusRatioBRW(): void {
    if (parseInt(this.hold3InputBRW.nativeElement.value) < 10) {
      this.hold3InputBRW.nativeElement.value = ((parseInt(this.hold3InputBRW.nativeElement.value) || 0) + 1).toString();
    }
  }

  async startBRW(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsBRW.nativeElement.disabled = true;
    this.questionBRW.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnBRW.nativeElement.disabled = true;
      this.inhaleBRW = true;
      this.BRWcountdownInput.nativeElement.style.display = 'inline';
      this.BRWtimeInput.nativeElement.style.display = 'none';
      this.startCountdownBRW();
      this.BRWballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => {
        this.BRWballText.nativeElement.textContent = '2';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.BRWballText.nativeElement.textContent = '1';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.BRWballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.BRWcurrentValue);
        this.globalService.changeBall(1.5, 5, this.BRWball);
        this.BRWinterval = setInterval(() => this.startTimerBRW(), 1000);
        this.BRWTimer = setInterval(() => this.DisplayTimerBRW(), 1000);
        this.startBtnBRW.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsBRW();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnBRW.nativeElement.disabled = false;
      this.stopBtnBRW.nativeElement.style.display = 'inline-flex';

      if (this.roundsBRW > 0) {
        this.BRWSave.nativeElement.disabled = false;
        this.BRWSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsBRW.nativeElement.disabled = false;
      this.questionBRW.nativeElement.disabled = false;
      this.BRWballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleBRW || this.exhaleBRW) this.BRWballText.nativeElement.textContent = 'Inspire';
        else if (this.hold1BRW || this.hold2BRW) this.BRWballText.nativeElement.textContent = 'Espire';
        else if (this.hold3BRW) this.BRWballText.nativeElement.textContent = 'Segure';
      } else {
        if (this.inhaleBRW || this.exhaleBRW) this.BRWballText.nativeElement.textContent = 'Inhale';
        else if (this.hold1BRW || this.hold2BRW) this.BRWballText.nativeElement.textContent = 'Exhale';
        else if (this.hold3BRW) this.BRWballText.nativeElement.textContent = 'Hold';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnBRW.nativeElement.disabled = true;
      this.stopBtnBRW.nativeElement.style.display = 'none';
      this.BRWSave.nativeElement.disabled = true;
      this.BRWSave.nativeElement.style.display = 'none';
      this.BRWinterval = setInterval(() => this.startTimerBRW(), 1000);
      this.BRWTimer = setInterval(() => this.DisplayTimerBRW(), 1000);
      this.startCountdownBRW();
    }
  }

  startCountdownBRW(): void {
    if (this.BRWduration !== Infinity) {
      const Contdownminutes = Math.floor(this.BRWduration / 60);
      const Contdownseconds = this.BRWduration % 60;
      this.BRWcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.BRWcountdown = setInterval(() => {
        if (this.BRWduration === 0) {
          clearInterval(this.BRWcountdown);
          this.BRWcountdown = null;
        } else {
          this.BRWduration--;
          const Contdownminutes = Math.floor(this.BRWduration / 60);
          const Contdownseconds = this.BRWduration % 60;
          this.BRWcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.BRWcountdownInput.nativeElement.value = '∞';
      this.BRWcountdownInput.nativeElement.style.display = 'inline';
      this.BRWtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerBRW(): Promise<void> {
    this.BRWcurrentValue--;

    if (this.inhaleBRW && this.BRWcurrentValue === 1) {
      this.BRWcurrentValue = parseInt(this.hold1InputBRW.nativeElement.value) + 2;
      this.inhaleBRW = false;
      this.hold1BRW = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.BRWcurrentValue - 1);
      this.BRWballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, 5, this.BRWball);

    } else if (this.hold1BRW && this.BRWcurrentValue === 1) {
      this.BRWcurrentValue = parseInt(this.exhaleInputBRW.nativeElement.value) + 2;
      this.hold1BRW = false;
      this.exhaleBRW = true;
      await this.audioService.playSound('inhale');
      await this.audioService.playBreathSound('inhaleBreath', this.BRWcurrentValue - 1);
      this.BRWballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
      this.globalService.changeBall(1.5, 5, this.BRWball);

    } else if (this.exhaleBRW && this.BRWcurrentValue === 1) {
      this.BRWcurrentValue = parseInt(this.hold2InputBRW.nativeElement.value) + 2;
      this.exhaleBRW = false;
      this.hold2BRW = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.BRWcurrentValue - 1);
      this.BRWballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, 5, this.BRWball);

    } else if (this.hold2BRW && this.BRWcurrentValue === 1) {
      this.BRWcurrentValue = parseInt(this.hold3InputBRW.nativeElement.value) + 1;
      this.hold2BRW = false;
      this.hold3BRW = true;
      await this.audioService.playSound('hold');
      this.BRWballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
      this.roundsBRW++;
      this.roundsDoneBRW.nativeElement.innerHTML = this.roundsBRW.toString();

    } else if (this.hold3BRW && this.BRWcurrentValue === 1) {
      if (this.BRWduration !== 0) {
        this.BRWcurrentValue = parseInt(this.inhaleInputBRW.nativeElement.value) + 2;
        this.hold3BRW = false;
        this.inhaleBRW = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.BRWcurrentValue - 1);
        this.BRWballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, 5, this.BRWball);
      } else {
        this.clearIntervalsBRW();
        localStorage.setItem('breathingON', 'false');
        this.startBtnBRW.nativeElement.disabled = true;
        this.settingsBRW.nativeElement.disabled = false;
        this.questionBRW.nativeElement.disabled = false;
        this.stopBtnBRW.nativeElement.disabled = false;
        this.stopBtnBRW.nativeElement.style.display = 'inline-flex';
        this.BRWSave.nativeElement.disabled = false;
        this.BRWSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.BRWball);
        this.BRWcountdownInput.nativeElement.style.display = 'none';
        this.BRWtimeInput.nativeElement.style.display = 'inline';
        this.BRWballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }
    }
  }

  DisplayTimerBRW(): void {
    this.BRWSeconds++;
    if (this.BRWSeconds === 60) {
      this.BRWSeconds = 0;
      this.BRWMinutes++;
    }
    const M = this.BRWMinutes < 10 ? '0' + this.BRWMinutes : this.BRWMinutes;
    const S = this.BRWSeconds < 10 ? '0' + this.BRWSeconds : this.BRWSeconds;
    this.timerDisplayBRW.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopBRW(): void {
    this.clearIntervalsBRW();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.BRWcountdownInput.nativeElement.style.display = 'none';
    this.BRWtimeInput.nativeElement.style.display = 'inline';
    this.BRWcurrentValue = parseInt(this.inhaleInputBRW.nativeElement.value) + 1;
    this.startBtnBRW.nativeElement.disabled = false;
    this.stopBtnBRW.nativeElement.disabled = true;
    this.stopBtnBRW.nativeElement.style.display = 'none';
    this.BRWSave.nativeElement.disabled = true;
    this.BRWSave.nativeElement.style.display = 'none';
    this.inhaleBRW = true;
    this.hold1BRW = false;
    this.exhaleBRW = false;
    this.hold2BRW = false;
    this.hold3BRW = false;
    this.globalService.changeBall(1, 1, this.BRWball);
    this.BRWballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsBRW = 0;
    this.roundsDoneBRW.nativeElement.innerHTML = '0';
    this.timerDisplayBRW.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setBRWduration();
    this.BRWSeconds = 0;
    this.BRWMinutes = 0;
    this.roundsBRW = 0;
  }

  saveBRW(): void {
    this.BRWResult = this.timerDisplayBRW.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('BRWResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.BRWResult, rounds: this.roundsBRW });
    localStorage.setItem('BRWResults', JSON.stringify(savedResults));
    this.BRWResultSaved.nativeElement.style.display = 'block';
    this.stopBRW();
  }

  clearIntervalsBRW(): void {
    clearInterval(this.BRWinterval);
    clearInterval(this.BRWcountdown);
    clearInterval(this.BRWTimer);
    this.BRWinterval = null;
    this.BRWcountdown = null;
    this.BRWTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopBRW();
    if (this.BRWResultSaved?.nativeElement) {
      this.BRWResultSaved.nativeElement.style.display = 'none';
    }
  }
}