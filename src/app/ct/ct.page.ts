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
  selector: 'app-ct',
  templateUrl: './ct.page.html',
  styleUrls: ['./ct.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class CTPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionCT') questionCT!: ElementRef<HTMLButtonElement>;
  @ViewChild('CTball') CTball!: ElementRef<HTMLDivElement>;
  @ViewChild('CTballText') CTballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('CTtimeInput') CTtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('CTcountdownInput') CTcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnCT') startBtnCT!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnCT') stopBtnCT!: ElementRef<HTMLButtonElement>;
  @ViewChild('CTReset') CTReset!: ElementRef<HTMLButtonElement>;
  @ViewChild('CTSave') CTSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsCT') settingsCT!: ElementRef<HTMLButtonElement>;
  @ViewChild('roundsDoneCT') roundsDoneCT!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayCT') timerDisplayCT!: ElementRef<HTMLDivElement>;
  @ViewChild('CTResultSaved') CTResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('inhaleInputCT') inhaleInputCT!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputCT') hold1InputCT!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputCT') exhaleInputCT!: ElementRef<HTMLInputElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleCT = true;
  private exhaleCT = false;
  private hold1CT = false;
  private CTinterval: any = null;
  private CTcountdown: any = null;
  private CTcurrentValue = 4;
  private CTduration = 0;
  private CTSeconds = 0;
  private CTMinutes = 0;
  private roundsCT = 0;
  private CTTimer: any = null;
  private CTResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let CTi = 2; CTi <= 60; CTi++) {
      const CToption = document.createElement('option');
      CToption.value = (CTi * 60).toString();
      CToption.textContent = this.isPortuguese ? `${CTi} minutos` : `${CTi} minutes`;
      this.CTtimeInput.nativeElement.appendChild(CToption);
    }

    this.startBtnCT.nativeElement.onclick = () => this.startCT();
    this.stopBtnCT.nativeElement.onclick = () => this.resetCT();
    this.CTReset.nativeElement.onclick = () => this.stopCT();
    this.CTSave.nativeElement.onclick = () => this.saveCT();

    this.stopBtnCT.nativeElement.disabled = true;
    this.stopBtnCT.nativeElement.style.display = 'none';
    this.CTReset.nativeElement.disabled = true;
    this.CTReset.nativeElement.style.display = 'none';
    this.CTSave.nativeElement.disabled = true;
    this.CTSave.nativeElement.style.display = 'none';

    this.CTtimeInput.nativeElement.onchange = () => this.setCTduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setCTduration(): void {
    const selectedValue = this.CTtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.CTduration = Infinity;
    } else {
      this.CTduration = parseInt(selectedValue, 10);
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
          await this.startCT();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopCT();
        }
      }
    });

    this.CTballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setCTduration();
    this.CTResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('ct_guide_seen')) {
      localStorage.setItem('ct_guide_seen', 'true');
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
        id: 'ct-intro',
        text: `<h3>${t('CO₂ Tolerance Training', 'Treinamento de Tolerância ao CO₂')}</h3>
               <p>${t(
                 'This technique trains your body to tolerate higher levels of carbon dioxide, which delays the urge to breathe and improves overall breathing efficiency. Each round the exhale and hold automatically increase, progressively challenging your tolerance.',
                 'Esta técnica treina seu corpo a tolerar níveis mais altos de dióxido de carbono, o que atrasa a vontade de respirar e melhora a eficiência respiratória geral. A cada rodada, a expiração e a retenção aumentam automaticamente, desafiando progressivamente sua tolerância.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'ct-posture',
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

      // 3 - Inhale
      steps.push({
        id: 'ct-inhale-item',
        text: `<h3>${t('Inhale', 'Inspire')}</h3>
               <p>${t(
                 'Breathe in slowly through the nose for 3 seconds. This phase stays fixed throughout the session — only the exhale and hold increase each round.',
                 'Inspire lentamente pelo nariz por 3 segundos. Esta fase permanece fixa durante toda a sessão — apenas a expiração e a retenção aumentam a cada rodada.'
               )}</p>`,
        attachTo: { element: '#ct-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Exhale
      steps.push({
        id: 'ct-exhale-item',
        text: `<h3>${t('Exhale — increases each round', 'Espire — aumenta a cada rodada')}</h3>
               <p>${t(
                 'Breathe out slowly through the nose. The exhale duration increases by 1 second after each round, progressively building CO₂ tolerance. Always breathe through the nose throughout the session.',
                 'Expire lentamente pelo nariz. A duração da expiração aumenta 1 segundo após cada rodada, construindo progressivamente a tolerância ao CO₂. Respire sempre pelo nariz durante toda a sessão.'
               )}</p>`,
        attachTo: { element: '#ct-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Hold
      steps.push({
        id: 'ct-hold-item',
        text: `<h3>${t('Hold — increases each round', 'Segure — aumenta a cada rodada')}</h3>
               <p>${t(
                 'Hold your breath after the exhale. The hold duration increases by 2 seconds after each round. Stay calm and relaxed — the growing discomfort is the training effect.',
                 'Segure a respiração após a expiração. A duração da retenção aumenta 2 segundos após cada rodada. Fique calmo e relaxado — o desconforto crescente é o efeito do treinamento.'
               )}</p>`,
        attachTo: { element: '#ct-hold-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Duration
      steps.push({
        id: 'ct-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to stay on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#ct-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Start circle
      steps.push({
        id: 'ct-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm. Press it again at any time to pause. When the exhale or hold becomes too long to cope with, press Restart — you will have 3 seconds to recover and the session begins again from the start. Remember to save your results at the end.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Pressione novamente a qualquer momento para pausar. Quando a expiração ou retenção ficar longa demais, pressione Reiniciar — você terá 3 segundos para se recuperar e a sessão recomeça do início. Lembre-se de salvar seus resultados ao final.'
               )}</p>`,
        attachTo: { element: '#ct-start-ball', on: 'top' },
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

  async startCT(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsCT.nativeElement.disabled = true;
    this.questionCT.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnCT.nativeElement.disabled = true;
      this.inhaleCT = true;
      this.CTcountdownInput.nativeElement.style.display = 'inline';
      this.CTtimeInput.nativeElement.style.display = 'none';
      this.startCountdownCT();
      this.CTballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => {
        this.CTballText.nativeElement.textContent = '2';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.CTballText.nativeElement.textContent = '1';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.CTballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.CTcurrentValue);
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputCT.nativeElement.value), this.CTball);
        this.CTinterval = setInterval(() => this.startTimerCT(), 1000);
        this.CTTimer = setInterval(() => this.DisplayTimerCT(), 1000);
        this.startBtnCT.nativeElement.disabled = false;
        this.stopBtnCT.nativeElement.disabled = false;
        this.stopBtnCT.nativeElement.style.display = 'inline-flex';
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsCT();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnCT.nativeElement.disabled = true;
      this.stopBtnCT.nativeElement.style.display = 'none';
      this.CTReset.nativeElement.disabled = false;
      this.CTReset.nativeElement.style.display = 'inline-flex';

      if (this.roundsCT > 0) {
        this.CTSave.nativeElement.disabled = false;
        this.CTSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsCT.nativeElement.disabled = false;
      this.questionCT.nativeElement.disabled = false;
      this.CTballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleCT) this.CTballText.nativeElement.textContent = 'Inspire';
        else if (this.hold1CT) this.CTballText.nativeElement.textContent = 'Segure';
        else if (this.exhaleCT) this.CTballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleCT) this.CTballText.nativeElement.textContent = 'Inhale';
        else if (this.hold1CT) this.CTballText.nativeElement.textContent = 'Hold';
        else if (this.exhaleCT) this.CTballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnCT.nativeElement.disabled = false;
      this.stopBtnCT.nativeElement.style.display = 'inline-flex';
      this.CTReset.nativeElement.disabled = true;
      this.CTReset.nativeElement.style.display = 'none';
      this.CTSave.nativeElement.disabled = true;
      this.CTSave.nativeElement.style.display = 'none';
      this.CTinterval = setInterval(() => this.startTimerCT(), 1000);
      this.CTTimer = setInterval(() => this.DisplayTimerCT(), 1000);
      this.startCountdownCT();
    }
  }

  startCountdownCT(): void {
    if (this.CTduration !== Infinity) {
      const Contdownminutes = Math.floor(this.CTduration / 60);
      const Contdownseconds = this.CTduration % 60;
      this.CTcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.CTcountdown = setInterval(() => {
        if (this.CTduration === 0) {
          clearInterval(this.CTcountdown);
          this.CTcountdown = null;
        } else {
          this.CTduration--;
          const Contdownminutes = Math.floor(this.CTduration / 60);
          const Contdownseconds = this.CTduration % 60;
          this.CTcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.CTcountdownInput.nativeElement.value = '∞';
      this.CTcountdownInput.nativeElement.style.display = 'inline';
      this.CTtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerCT(): Promise<void> {
    this.CTcurrentValue--;

    if (this.inhaleCT && this.CTcurrentValue === 1) {
      this.CTcurrentValue = parseInt(this.exhaleInputCT.nativeElement.value) + 1;
      this.inhaleCT = false;
      this.exhaleCT = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.CTcurrentValue);
      this.CTballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, parseInt(this.exhaleInputCT.nativeElement.value), this.CTball);

    } else if (this.exhaleCT && this.CTcurrentValue === 1) {
      this.CTcurrentValue = parseInt(this.hold1InputCT.nativeElement.value) + 1;
      this.exhaleCT = false;
      this.hold1CT = true;
      await this.audioService.playSound('hold');
      this.CTballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
      this.globalService.changeBall(1, parseInt(this.hold1InputCT.nativeElement.value), this.CTball);
      this.roundsCT++;
      this.roundsDoneCT.nativeElement.innerHTML = this.roundsCT.toString();

    } else if (this.hold1CT && this.CTcurrentValue === 1) {
      if (this.CTduration !== 0) {
        this.exhaleInputCT.nativeElement.value = (parseInt(this.exhaleInputCT.nativeElement.value) + 1).toString();
        this.hold1InputCT.nativeElement.value = (parseInt(this.hold1InputCT.nativeElement.value) + 2).toString();
        this.CTcurrentValue = parseInt(this.inhaleInputCT.nativeElement.value) + 1;
        this.hold1CT = false;
        this.inhaleCT = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.CTcurrentValue);
        this.CTballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputCT.nativeElement.value), this.CTball);
      } else {
        this.clearIntervalsCT();
        localStorage.setItem('breathingON', 'false');
        this.startBtnCT.nativeElement.disabled = true;
        this.settingsCT.nativeElement.disabled = false;
        this.questionCT.nativeElement.disabled = false;
        this.stopBtnCT.nativeElement.disabled = true;
        this.stopBtnCT.nativeElement.style.display = 'none';
        this.CTReset.nativeElement.disabled = false;
        this.CTReset.nativeElement.style.display = 'inline-flex';
        this.CTSave.nativeElement.disabled = false;
        this.CTSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.CTball);
        this.CTcountdownInput.nativeElement.style.display = 'none';
        this.CTtimeInput.nativeElement.style.display = 'inline';
        this.CTballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }
    }
  }

  DisplayTimerCT(): void {
    this.CTSeconds++;
    if (this.CTSeconds === 60) {
      this.CTSeconds = 0;
      this.CTMinutes++;
    }
    const M = this.CTMinutes < 10 ? '0' + this.CTMinutes : this.CTMinutes;
    const S = this.CTSeconds < 10 ? '0' + this.CTSeconds : this.CTSeconds;
    this.timerDisplayCT.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopCT(): void {
    this.clearIntervalsCT();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.CTcountdownInput.nativeElement.style.display = 'none';
    this.CTtimeInput.nativeElement.style.display = 'inline';
    this.CTcurrentValue = 4;
    this.startBtnCT.nativeElement.disabled = false;
    this.stopBtnCT.nativeElement.disabled = true;
    this.stopBtnCT.nativeElement.style.display = 'none';
    this.CTReset.nativeElement.disabled = true;
    this.CTReset.nativeElement.style.display = 'none';
    this.CTSave.nativeElement.disabled = true;
    this.CTSave.nativeElement.style.display = 'none';
    this.inhaleCT = true;
    this.hold1CT = false;
    this.exhaleCT = false;
    this.globalService.changeBall(1, 1, this.CTball);
    this.CTballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsCT = 0;
    this.roundsDoneCT.nativeElement.innerHTML = '0';
    this.timerDisplayCT.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setCTduration();
    this.CTSeconds = 0;
    this.CTMinutes = 0;
    this.roundsCT = 0;
    this.exhaleInputCT.nativeElement.value = '3';
    this.hold1InputCT.nativeElement.value = '4';
  }

  resetCT(): void {
    this.stopBtnCT.nativeElement.disabled = true;
    this.audioService.pauseSelectedSong();
    this.clearIntervalsCT();
    this.CTcurrentValue = 4;
    this.exhaleInputCT.nativeElement.value = '3';
    this.hold1InputCT.nativeElement.value = '4';
    this.inhaleCT = true;
    this.hold1CT = false;
    this.exhaleCT = false;
    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
    this.startCT();
  }

  saveCT(): void {
    this.CTResult = this.timerDisplayCT.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('CTResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.CTResult, rounds: this.roundsCT });
    localStorage.setItem('CTResults', JSON.stringify(savedResults));
    this.CTResultSaved.nativeElement.style.display = 'block';
    this.stopCT();
  }

  clearIntervalsCT(): void {
    clearInterval(this.CTinterval);
    clearInterval(this.CTcountdown);
    clearInterval(this.CTTimer);
    this.CTinterval = null;
    this.CTcountdown = null;
    this.CTTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopCT();
    if (this.CTResultSaved?.nativeElement) {
      this.CTResultSaved.nativeElement.style.display = 'none';
    }
  }
}