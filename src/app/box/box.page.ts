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
  selector: 'app-box',
  templateUrl: './box.page.html',
  styleUrls: ['./box.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BOXPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionBOX') questionBOX!: ElementRef<HTMLButtonElement>;
  @ViewChild('BOXball') BOXball!: ElementRef<HTMLDivElement>;
  @ViewChild('BOXballText') BOXballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('BOXtimeInput') BOXtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('BOXcountdownInput') BOXcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnBOX') startBtnBOX!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnBOX') stopBtnBOX!: ElementRef<HTMLButtonElement>;
  @ViewChild('BOXSave') BOXSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsBOX') settingsBOX!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputBOX') inhaleInputBOX!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputBOX') hold1InputBOX!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputBOX') exhaleInputBOX!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputBOX') hold2InputBOX!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneBOX') roundsDoneBOX!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayBOX') timerDisplayBOX!: ElementRef<HTMLDivElement>;
  @ViewChild('BOXResultSaved') BOXResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusBOX') minusBOX!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusBOX') plusBOX!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleBOX = true;
  private hold1BOX = false;
  private exhaleBOX = false;
  private hold2BOX = false;
  private BOXinterval: any = null;
  private BOXcountdown: any = null;
  private BOXcurrentValue = 5;
  private BOXduration = 0;
  private roundsBOX = 0;
  private BOXSeconds = 0;
  private BOXMinutes = 0;
  private BOXTimer: any = null;
  private BOXResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let BOXi = 2; BOXi <= 60; BOXi++) {
      const BOXoption = document.createElement('option');
      BOXoption.value = (BOXi * 60).toString();
      BOXoption.textContent = this.isPortuguese ? `${BOXi} minutos` : `${BOXi} minutes`;
      this.BOXtimeInput.nativeElement.appendChild(BOXoption);
    }

    this.minusBOX.nativeElement.onclick = () => this.minusRatioBOX();
    this.plusBOX.nativeElement.onclick = () => this.plusRatioBOX();
    this.startBtnBOX.nativeElement.onclick = () => this.startBOX();
    this.stopBtnBOX.nativeElement.onclick = () => this.stopBOX();
    this.BOXSave.nativeElement.onclick = () => this.saveBOX();

    this.stopBtnBOX.nativeElement.disabled = true;
    this.stopBtnBOX.nativeElement.style.display = 'none';
    this.BOXSave.nativeElement.disabled = true;
    this.BOXSave.nativeElement.style.display = 'none';

    this.BOXtimeInput.nativeElement.onchange = () => this.setBOXduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setBOXduration(): void {
    const selectedValue = this.BOXtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.BOXduration = Infinity;
    } else {
      this.BOXduration = parseInt(selectedValue, 10);
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
          await this.startBOX();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopBOX();
        }
      }
    });

    this.BOXballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setBOXduration();
    this.BOXResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('box_guide_seen')) {
      localStorage.setItem('box_guide_seen', 'true');
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
        id: 'box-intro',
        text: `<h3>${t('Box Breathing', 'Respiração da Caixa')}</h3>
               <p>${t(
                 'Sama Vritti, or Box Breathing, is based on the principles of deep diaphragmatic breathing. Its equal-sided rhythm — inhale, hold, exhale, hold — creates a powerful pattern for calming the nervous system, improving focus, and building breath control.',
                 'Sama Vritti, ou Respiração da Caixa, é baseada nos princípios da respiração diafragmática profunda. Seu ritmo de lados iguais — inspirar, segurar, expirar, segurar — cria um padrão poderoso para acalmar o sistema nervoso, melhorar o foco e desenvolver o controle respiratório.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'box-posture',
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

      // 3 - Minus button
      steps.push({
        id: 'box-minus-btn',
        text: `<h3>${t('Decrease ratio', 'Diminuir proporção')}</h3>
               <p>${t(
                 'Use the minus button to lower all four phases equally. Start with a ratio that feels comfortable — if your heart rate accelerates or the hold feels too hard, reduce it.',
                 'Use o botão de menos para diminuir todas as quatro fases igualmente. Comece com uma proporção confortável — se o coração acelerar ou a retenção parecer muito difícil, reduza.'
               )}</p>`,
        attachTo: { element: '#box-minus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Inhale
      steps.push({
        id: 'box-inhale-item',
        text: `<h3>${t('Inhale', 'Inspire')}</h3>
               <p>${t(
                 'Breathe in slowly and deeply through the nose for this many seconds, filling your lungs from the bottom up.',
                 'Inspire lenta e profundamente pelo nariz por este número de segundos, enchendo os pulmões de baixo para cima.'
               )}</p>`,
        attachTo: { element: '#box-inhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Hold 1
      steps.push({
        id: 'box-hold1-item',
        text: `<h3>${t('Hold after inhale', 'Segure após inspirar')}</h3>
               <p>${t(
                 'Hold your breath at the top for this many seconds. Keep your body relaxed — this pause builds CO₂ tolerance and deepens the calming effect.',
                 'Segure a respiração no topo por este número de segundos. Mantenha o corpo relaxado — essa pausa aumenta a tolerância ao CO₂ e aprofunda o efeito calmante.'
               )}</p>`,
        attachTo: { element: '#box-hold1-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Exhale
      steps.push({
        id: 'box-exhale-item',
        text: `<h3>${t('Exhale', 'Espire')}</h3>
               <p>${t(
                 'Breathe out slowly through the nose for this many seconds, releasing fully. Always breathe nasally throughout the exercise.',
                 'Expire lentamente pelo nariz por este número de segundos, soltando completamente. Respire sempre pelo nariz durante todo o exercício.'
               )}</p>`,
        attachTo: { element: '#box-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Hold 2
      steps.push({
        id: 'box-hold2-item',
        text: `<h3>${t('Hold after exhale', 'Segure após expirar')}</h3>
               <p>${t(
                 'Hold at the bottom for this many seconds before the next inhale. This completes the box and is key to the technique — stay calm and let the urge to breathe pass gently.',
                 'Segure no fundo por este número de segundos antes da próxima inspiração. Isso completa a caixa e é fundamental para a técnica — fique calmo e deixe a vontade de respirar passar suavemente.'
               )}</p>`,
        attachTo: { element: '#box-hold2-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Plus button
      steps.push({
        id: 'box-plus-btn',
        text: `<h3>${t('Increase ratio', 'Aumentar proporção')}</h3>
               <p>${t(
                 'Use the plus button to raise all four phases equally as you progress. Increase gradually — only when the current ratio feels easy and controlled.',
                 'Use o botão de mais para aumentar todas as quatro fases igualmente conforme você avança. Aumente gradualmente — apenas quando a proporção atual parecer fácil e controlada.'
               )}</p>`,
        attachTo: { element: '#box-plus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 9 - Duration
      steps.push({
        id: 'box-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to stay on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#box-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 10 - Start ball
      steps.push({
        id: 'box-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the cricle to start and follow the guided rhythm. Press it again at any time to pause. Remember to save your results at the end to track your progress over time.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final para acompanhar sua evolução.'
               )}</p>`,
        attachTo: { element: '#box-start-ball', on: 'top' },
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

  minusRatioBOX(): void {
    if (parseInt(this.inhaleInputBOX.nativeElement.value) > 3) {
      this.inhaleInputBOX.nativeElement.value = ((parseInt(this.inhaleInputBOX.nativeElement.value) || 0) - 1).toString();
      this.hold1InputBOX.nativeElement.value = ((parseInt(this.hold1InputBOX.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputBOX.nativeElement.value = ((parseInt(this.exhaleInputBOX.nativeElement.value) || 0) - 1).toString();
      this.hold2InputBOX.nativeElement.value = ((parseInt(this.hold2InputBOX.nativeElement.value) || 0) - 1).toString();
    }
  }

  plusRatioBOX(): void {
    if (parseInt(this.inhaleInputBOX.nativeElement.value) < 40) {
      this.inhaleInputBOX.nativeElement.value = ((parseInt(this.inhaleInputBOX.nativeElement.value) || 0) + 1).toString();
      this.hold1InputBOX.nativeElement.value = ((parseInt(this.hold1InputBOX.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputBOX.nativeElement.value = ((parseInt(this.exhaleInputBOX.nativeElement.value) || 0) + 1).toString();
      this.hold2InputBOX.nativeElement.value = ((parseInt(this.hold2InputBOX.nativeElement.value) || 0) + 1).toString();
    }
  }

  async startBOX(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsBOX.nativeElement.disabled = true;
    this.questionBOX.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnBOX.nativeElement.disabled = true;
      this.inhaleBOX = true;
      this.BOXcountdownInput.nativeElement.style.display = 'inline';
      this.BOXtimeInput.nativeElement.style.display = 'none';
      this.startCountdownBOX();
      this.BOXballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => {
        this.BOXballText.nativeElement.textContent = '2';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.BOXballText.nativeElement.textContent = '1';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.BOXballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        this.BOXcurrentValue = parseInt(this.inhaleInputBOX.nativeElement.value) + 1;
        await this.audioService.playBreathSound('inhaleBreath', this.BOXcurrentValue);
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputBOX.nativeElement.value), this.BOXball);
        this.BOXinterval = setInterval(() => this.startTimerBOX(), 1000);
        this.BOXTimer = setInterval(() => this.DisplayTimerBOX(), 1000);
        this.startBtnBOX.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsBOX();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnBOX.nativeElement.disabled = false;
      this.stopBtnBOX.nativeElement.style.display = 'inline-flex';

      if (this.roundsBOX > 0) {
        this.BOXSave.nativeElement.disabled = false;
        this.BOXSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsBOX.nativeElement.disabled = false;
      this.questionBOX.nativeElement.disabled = false;
      this.BOXballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleBOX) this.BOXballText.nativeElement.textContent = 'Inspire';
        else if (this.hold1BOX || this.hold2BOX) this.BOXballText.nativeElement.textContent = 'Segure';
        else if (this.exhaleBOX) this.BOXballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleBOX) this.BOXballText.nativeElement.textContent = 'Inhale';
        else if (this.hold1BOX || this.hold2BOX) this.BOXballText.nativeElement.textContent = 'Hold';
        else if (this.exhaleBOX) this.BOXballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnBOX.nativeElement.disabled = true;
      this.stopBtnBOX.nativeElement.style.display = 'none';
      this.BOXSave.nativeElement.disabled = true;
      this.BOXSave.nativeElement.style.display = 'none';
      this.BOXinterval = setInterval(() => this.startTimerBOX(), 1000);
      this.BOXTimer = setInterval(() => this.DisplayTimerBOX(), 1000);
      this.startCountdownBOX();
    }
  }

  startCountdownBOX(): void {
    if (this.BOXduration !== Infinity) {
      const Contdownminutes = Math.floor(this.BOXduration / 60);
      const Contdownseconds = this.BOXduration % 60;
      this.BOXcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.BOXcountdown = setInterval(() => {
        if (this.BOXduration === 0) {
          clearInterval(this.BOXcountdown);
          this.BOXcountdown = null;
        } else {
          this.BOXduration--;
          const Contdownminutes = Math.floor(this.BOXduration / 60);
          const Contdownseconds = this.BOXduration % 60;
          this.BOXcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.BOXcountdownInput.nativeElement.value = '∞';
      this.BOXcountdownInput.nativeElement.style.display = 'inline';
      this.BOXtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerBOX(): Promise<void> {
    this.BOXcurrentValue--;

    if (this.inhaleBOX && this.BOXcurrentValue === 1) {
      this.BOXcurrentValue = parseInt(this.hold1InputBOX.nativeElement.value) + 1;
      this.inhaleBOX = false;
      this.hold1BOX = true;
      await this.audioService.playSound('hold');
      this.BOXballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
      this.globalService.changeBall(1.3, parseInt(this.hold1InputBOX.nativeElement.value), this.BOXball);

    } else if (this.hold1BOX && this.BOXcurrentValue === 1) {
      this.BOXcurrentValue = parseInt(this.exhaleInputBOX.nativeElement.value) + 1;
      this.hold1BOX = false;
      this.exhaleBOX = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.BOXcurrentValue);
      this.BOXballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, parseInt(this.exhaleInputBOX.nativeElement.value), this.BOXball);

    } else if (this.exhaleBOX && this.BOXcurrentValue === 1) {
      this.BOXcurrentValue = parseInt(this.hold2InputBOX.nativeElement.value) + 1;
      this.exhaleBOX = false;
      this.hold2BOX = true;
      await this.audioService.playSound('hold');
      this.BOXballText.nativeElement.textContent = this.isPortuguese ? 'Segure' : 'Hold';
      this.globalService.changeBall(1, parseInt(this.hold2InputBOX.nativeElement.value), this.BOXball);
      this.roundsBOX++;
      this.roundsDoneBOX.nativeElement.innerHTML = this.roundsBOX.toString();

    } else if (this.hold2BOX && this.BOXcurrentValue === 1) {
      if (this.BOXduration !== 0) {
        this.BOXcurrentValue = parseInt(this.inhaleInputBOX.nativeElement.value) + 1;
        this.hold2BOX = false;
        this.inhaleBOX = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.BOXcurrentValue);
        this.BOXballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.5, parseInt(this.inhaleInputBOX.nativeElement.value), this.BOXball);
      } else {
        this.clearIntervalsBOX();
        localStorage.setItem('breathingON', 'false');
        this.startBtnBOX.nativeElement.disabled = true;
        this.settingsBOX.nativeElement.disabled = false;
        this.questionBOX.nativeElement.disabled = false;
        this.stopBtnBOX.nativeElement.disabled = false;
        this.stopBtnBOX.nativeElement.style.display = 'inline-flex';
        this.BOXSave.nativeElement.disabled = false;
        this.BOXSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.BOXball);
        this.BOXcountdownInput.nativeElement.style.display = 'none';
        this.BOXtimeInput.nativeElement.style.display = 'inline';
        this.BOXballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }
    }
  }

  DisplayTimerBOX(): void {
    this.BOXSeconds++;
    if (this.BOXSeconds === 60) {
      this.BOXSeconds = 0;
      this.BOXMinutes++;
    }
    const M = this.BOXMinutes < 10 ? '0' + this.BOXMinutes : this.BOXMinutes;
    const S = this.BOXSeconds < 10 ? '0' + this.BOXSeconds : this.BOXSeconds;
    this.timerDisplayBOX.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopBOX(): void {
    this.clearIntervalsBOX();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.BOXcountdownInput.nativeElement.style.display = 'none';
    this.BOXtimeInput.nativeElement.style.display = 'inline';
    this.BOXcurrentValue = parseInt(this.inhaleInputBOX.nativeElement.value) + 1;
    this.startBtnBOX.nativeElement.disabled = false;
    this.stopBtnBOX.nativeElement.disabled = true;
    this.stopBtnBOX.nativeElement.style.display = 'none';
    this.BOXSave.nativeElement.disabled = true;
    this.BOXSave.nativeElement.style.display = 'none';
    this.inhaleBOX = true;
    this.hold1BOX = false;
    this.exhaleBOX = false;
    this.hold2BOX = false;
    this.globalService.changeBall(1, 1, this.BOXball);
    this.BOXballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsBOX = 0;
    this.roundsDoneBOX.nativeElement.innerHTML = '0';
    this.timerDisplayBOX.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setBOXduration();
    this.BOXSeconds = 0;
    this.BOXMinutes = 0;
    this.roundsBOX = 0;
  }

  saveBOX(): void {
    this.BOXResult = this.timerDisplayBOX.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('BOXResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.BOXResult, rounds: this.roundsBOX });
    localStorage.setItem('BOXResults', JSON.stringify(savedResults));
    this.BOXResultSaved.nativeElement.style.display = 'block';
    this.stopBOX();
  }

  clearIntervalsBOX(): void {
    clearInterval(this.BOXinterval);
    clearInterval(this.BOXcountdown);
    clearInterval(this.BOXTimer);
    this.BOXinterval = null;
    this.BOXcountdown = null;
    this.BOXTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopBOX();
    if (this.BOXResultSaved?.nativeElement) {
      this.BOXResultSaved.nativeElement.style.display = 'none';
    }
  }
}