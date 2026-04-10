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
  selector: 'app-yogic',
  templateUrl: './yogic.page.html',
  styleUrls: ['./yogic.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class YogicPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionYB') questionYB!: ElementRef<HTMLButtonElement>;
  @ViewChild('YBball') YBball!: ElementRef<HTMLDivElement>;
  @ViewChild('YBballText') YBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('YBtimeInput') YBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('YBcountdownInput') YBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnYB') startBtnYB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnYB') stopBtnYB!: ElementRef<HTMLButtonElement>;
  @ViewChild('YBSave') YBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsYB') settingsYB!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputYB') inhaleInputYB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold1InputYB') hold1InputYB!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputYB') exhaleInputYB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputYB') hold2InputYB!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneYB') roundsDoneYB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayYB') timerDisplayYB!: ElementRef<HTMLDivElement>;
  @ViewChild('YBResultSaved') YBResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusYB') minusYB!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusYB') plusYB!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleYB = true;
  private hold1YB = false;
  private exhaleYB = false;
  private hold2YB = false;
  private YBinterval: any = null;
  private YBcountdown: any = null;
  private YBcurrentValue = 5;
  private YBduration = 0;
  private roundsYB = 0;
  private YBSeconds = 0;
  private YBMinutes = 0;
  private YBTimer: any = null;
  private YBResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let YBi = 2; YBi <= 60; YBi++) {
      const YBoption = document.createElement('option');
      YBoption.value = (YBi * 60).toString();
      YBoption.textContent = this.isPortuguese ? `${YBi} minutos` : `${YBi} minutes`;
      this.YBtimeInput.nativeElement.appendChild(YBoption);
    }

    this.minusYB.nativeElement.onclick = () => this.minusRatioYB();
    this.plusYB.nativeElement.onclick = () => this.plusRatioYB();
    this.startBtnYB.nativeElement.onclick = () => this.startYB();
    this.stopBtnYB.nativeElement.onclick = () => this.stopYB();
    this.YBSave.nativeElement.onclick = () => this.saveYB();

    this.stopBtnYB.nativeElement.disabled = true;
    this.stopBtnYB.nativeElement.style.display = 'none';
    this.YBSave.nativeElement.disabled = true;
    this.YBSave.nativeElement.style.display = 'none';

    this.YBtimeInput.nativeElement.onchange = () => this.setYBduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setYBduration(): void {
    const selectedValue = this.YBtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.YBduration = Infinity;
    } else {
      this.YBduration = parseInt(selectedValue, 10);
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
          await this.startYB();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopYB();
        }
      }
    });

    this.YBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setYBduration();
    this.YBResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('yb_guide_seen')) {
      localStorage.setItem('yb_guide_seen', 'true');
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
        id: 'yb-intro',
        text: `<h3>${t('Dirga — Three-Part Breath', 'Dirga — Respiração em Três Partes')}</h3>
               <p>${t(
                 'Dirga is a mindful yogic practice involving breathing in three sequential parts: first filling the belly, then expanding the ribs, and finally lifting the chest. When exhaling, you reverse the order — chest first, then ribs, then belly. This technique maximises lung capacity and improves oxygen flow.',
                 'Dirga é uma prática yogi consciente com três partes sequenciais: primeiro enchendo a barriga, depois expandindo as costelas e por fim elevando o peito. Ao expirar, inverte a ordem — peito primeiro, depois costelas e por fim barriga. Esta técnica maximiza a capacidade pulmonar e melhora o fluxo de oxigênio.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'yb-posture',
        text: `<h3>${t('Get comfortable', 'Fique confortável')}</h3>
               <p>${t(
                 'Find a comfortable seat or lie down. Relax your shoulders, facial muscles, and jaw. Place your tongue on the roof of your mouth, with its tip gently touching your upper front teeth.',
                 'Encontre um assento confortável ou deite-se. Relaxe os ombros, os músculos faciais e a mandíbula. Coloque a língua no céu da boca, a ponta deve tocar o topo dos seus dentes da frente.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Minus
      steps.push({
        id: 'yb-minus-btn',
        text: `<h3>${t('Decrease ratio', 'Diminuir proporção')}</h3>
               <p>${t(
                 'Use the minus button to lower all phases together. Choose a count that is manageable but gently extends your limits — reduce it if your heart rate accelerates or the practice feels too hard.',
                 'Use o botão de menos para diminuir todas as fases juntas. Escolha uma contagem gerenciável que ainda desafie seus limites suavemente — reduza se o coração acelerar ou a prática parecer muito difícil.'
               )}</p>`,
        attachTo: { element: '#yb-minus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Inhale belly
      steps.push({
        id: 'yb-inhale-belly-item',
        text: `<h3>${t('Inhale — belly', 'Inspire — barriga')}</h3>
               <p>${t(
                 'Begin the inhale by breathing into your belly. Let your abdomen expand outward first, without moving your chest yet. This engages the diaphragm and forms the foundation of each breath.',
                 'Comece a inspiração respirando para a barriga. Deixe o abdômen expandir para fora primeiro, sem mover o peito ainda. Isso engaja o diafragma e forma a base de cada respiração.'
               )}</p>`,
        attachTo: { element: '#yb-inhale-belly-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Inhale ribs
      steps.push({
        id: 'yb-inhale-ribs-item',
        text: `<h3>${t('Inhale — ribs', 'Inspire — costelas')}</h3>
               <p>${t(
                 'Continue the inhale by expanding your ribcage outward to the sides. Keep the belly full and let the ribs widen without straining. This fills the middle portion of the lungs.',
                 'Continue a inspiração expandindo a caixa torácica para os lados. Mantenha a barriga cheia e deixe as costelas se alargarem sem forçar. Isso enche a porção média dos pulmões.'
               )}</p>`,
        attachTo: { element: '#yb-inhale-ribs-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Inhale chest
      steps.push({
        id: 'yb-inhale-chest-item',
        text: `<h3>${t('Inhale — chest', 'Inspire — peito')}</h3>
               <p>${t(
                 'Complete the inhale by lifting the chest upward. Keep the belly and ribs full — this final phase fills the upper lungs completely. The three parts together create a full diaphragmatic breath.',
                 'Complete a inspiração elevando o peito para cima. Mantenha a barriga e as costelas cheias — esta fase final enche completamente a parte superior dos pulmões. As três partes juntas criam uma respiração diafragmática completa.'
               )}</p>`,
        attachTo: { element: '#yb-inhale-chest-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Exhale
      steps.push({
        id: 'yb-exhale-item',
        text: `<h3>${t('Exhale — chest, ribs, belly', 'Espire — peito, costelas, barriga')}</h3>
               <p>${t(
                 'Exhale in reverse order — chest drops first, then ribs contract, then belly draws in last. The exhale is intentionally longer to activate the parasympathetic nervous system. Always breathe through the nose throughout the session.',
                 'Expire na ordem inversa — o peito desce primeiro, depois as costelas se contraem, e por último a barriga se recolhe. A expiração é intencionalmente mais longa para ativar o sistema nervoso parassimpático. Respire sempre pelo nariz durante toda a sessão.'
               )}</p>`,
        attachTo: { element: '#yb-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Plus
      steps.push({
        id: 'yb-plus-btn',
        text: `<h3>${t('Increase ratio', 'Aumentar proporção')}</h3>
               <p>${t(
                 'Use the plus button to raise all phases together. Increase gradually — only when the current ratio feels easy and your breath flows smoothly through all three parts.',
                 'Use o botão de mais para aumentar todas as fases juntas. Aumente gradualmente — apenas quando a proporção atual parecer fácil e sua respiração fluir suavemente pelas três partes.'
               )}</p>`,
        attachTo: { element: '#yb-plus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 9 - Duration
      steps.push({
        id: 'yb-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to stay on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#yb-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 10 - Start circle
      steps.push({
        id: 'yb-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm. The audio cues will guide you through each part of the three-part breath. Press again at any time to pause. Remember to save your results at the end.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Os sinais de áudio vão guiá-lo por cada parte da respiração em três partes. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final.'
               )}</p>`,
        attachTo: { element: '#yb-start-ball', on: 'top' },
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

  minusRatioYB(): void {
    if (parseInt(this.inhaleInputYB.nativeElement.value) > 2) {
      this.inhaleInputYB.nativeElement.value = ((parseInt(this.inhaleInputYB.nativeElement.value) || 0) - 1).toString();
      this.hold1InputYB.nativeElement.value = ((parseInt(this.hold1InputYB.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputYB.nativeElement.value = ((parseInt(this.exhaleInputYB.nativeElement.value) || 0) - 1).toString();
      this.hold2InputYB.nativeElement.value = ((parseInt(this.hold2InputYB.nativeElement.value) || 0) - 3).toString();
    }
  }

  plusRatioYB(): void {
    if (parseInt(this.inhaleInputYB.nativeElement.value) < 20) {
      this.inhaleInputYB.nativeElement.value = ((parseInt(this.inhaleInputYB.nativeElement.value) || 0) + 1).toString();
      this.hold1InputYB.nativeElement.value = ((parseInt(this.hold1InputYB.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputYB.nativeElement.value = ((parseInt(this.exhaleInputYB.nativeElement.value) || 0) + 1).toString();
      this.hold2InputYB.nativeElement.value = ((parseInt(this.hold2InputYB.nativeElement.value) || 0) + 3).toString();
    }
  }

  async startYB(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsYB.nativeElement.disabled = true;
    this.questionYB.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnYB.nativeElement.disabled = true;
      this.inhaleYB = true;
      this.YBcountdownInput.nativeElement.style.display = 'inline';
      this.YBtimeInput.nativeElement.style.display = 'none';
      this.startCountdownYB();
      this.YBballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => { this.audioService.playSelectedSong(); }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => { this.YBballText.nativeElement.textContent = '2'; }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => { this.YBballText.nativeElement.textContent = '1'; }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.YBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inbelly');
        this.YBcurrentValue = parseInt(this.inhaleInputYB.nativeElement.value) + 1;
        await this.audioService.playBreathSound('inhaleBreath', this.YBcurrentValue);
        this.globalService.changeBall(1.3, parseInt(this.inhaleInputYB.nativeElement.value), this.YBball);
        this.YBinterval = setInterval(() => this.startTimerYB(), 1000);
        this.YBTimer = setInterval(() => this.DisplayTimerYB(), 1000);
        this.startBtnYB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsYB();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnYB.nativeElement.disabled = false;
      this.stopBtnYB.nativeElement.style.display = 'inline-flex';

      if (this.roundsYB > 0) {
        this.YBSave.nativeElement.disabled = false;
        this.YBSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsYB.nativeElement.disabled = false;
      this.questionYB.nativeElement.disabled = false;
      this.YBballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese) {
        if (this.inhaleYB || this.hold1YB || this.exhaleYB) this.YBballText.nativeElement.textContent = 'Inspire';
        else if (this.hold2YB) this.YBballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleYB || this.hold1YB || this.exhaleYB) this.YBballText.nativeElement.textContent = 'Inhale';
        else if (this.hold2YB) this.YBballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnYB.nativeElement.disabled = true;
      this.stopBtnYB.nativeElement.style.display = 'none';
      this.YBSave.nativeElement.disabled = true;
      this.YBSave.nativeElement.style.display = 'none';
      this.YBinterval = setInterval(() => this.startTimerYB(), 1000);
      this.YBTimer = setInterval(() => this.DisplayTimerYB(), 1000);
      this.startCountdownYB();
    }
  }

  startCountdownYB(): void {
    if (this.YBduration !== Infinity) {
      const Contdownminutes = Math.floor(this.YBduration / 60);
      const Contdownseconds = this.YBduration % 60;
      this.YBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.YBcountdown = setInterval(() => {
        if (this.YBduration === 0) {
          clearInterval(this.YBcountdown);
          this.YBcountdown = null;
        } else {
          this.YBduration--;
          const Contdownminutes = Math.floor(this.YBduration / 60);
          const Contdownseconds = this.YBduration % 60;
          this.YBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.YBcountdownInput.nativeElement.value = '∞';
      this.YBcountdownInput.nativeElement.style.display = 'inline';
      this.YBtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerYB(): Promise<void> {
    this.YBcurrentValue--;

    if (this.inhaleYB && this.YBcurrentValue === 1) {
      this.YBcurrentValue = parseInt(this.hold1InputYB.nativeElement.value) + 1;
      this.inhaleYB = false;
      this.hold1YB = true;
      await this.audioService.playSound('inribs');
      await this.audioService.playBreathSound('inhaleBreath', this.YBcurrentValue);
      this.YBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
      this.globalService.changeBall(1.4, parseInt(this.hold1InputYB.nativeElement.value), this.YBball);

    } else if (this.hold1YB && this.YBcurrentValue === 1) {
      this.YBcurrentValue = parseInt(this.exhaleInputYB.nativeElement.value) + 1;
      this.hold1YB = false;
      this.exhaleYB = true;
      await this.audioService.playSound('inchest');
      await this.audioService.playBreathSound('inhaleBreath', this.YBcurrentValue);
      this.YBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
      this.globalService.changeBall(1.5, parseInt(this.exhaleInputYB.nativeElement.value), this.YBball);

    } else if (this.exhaleYB && this.YBcurrentValue === 1) {
      this.YBcurrentValue = parseInt(this.hold2InputYB.nativeElement.value) + 1;
      this.exhaleYB = false;
      this.hold2YB = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.YBcurrentValue);
      this.YBballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, parseInt(this.hold2InputYB.nativeElement.value), this.YBball);
      this.roundsYB++;
      this.roundsDoneYB.nativeElement.innerHTML = this.roundsYB.toString();

    } else if (this.hold2YB && this.YBcurrentValue === 1) {
      if (this.YBduration !== 0) {
        this.YBcurrentValue = parseInt(this.inhaleInputYB.nativeElement.value) + 1;
        this.hold2YB = false;
        this.inhaleYB = true;
        await this.audioService.playSound('inbelly');
        await this.audioService.playBreathSound('inhaleBreath', this.YBcurrentValue);
        this.YBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.3, parseInt(this.inhaleInputYB.nativeElement.value), this.YBball);
      } else {
        this.clearIntervalsYB();
        localStorage.setItem('breathingON', 'false');
        this.startBtnYB.nativeElement.disabled = true;
        this.settingsYB.nativeElement.disabled = false;
        this.questionYB.nativeElement.disabled = false;
        this.stopBtnYB.nativeElement.disabled = false;
        this.stopBtnYB.nativeElement.style.display = 'inline-flex';
        this.YBSave.nativeElement.disabled = false;
        this.YBSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.YBball);
        this.YBcountdownInput.nativeElement.style.display = 'none';
        this.YBtimeInput.nativeElement.style.display = 'inline';
        this.YBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => { await this.audioService.playSound('normalbreath'); }, 1000);
      }
    }
  }

  DisplayTimerYB(): void {
    this.YBSeconds++;
    if (this.YBSeconds === 60) { this.YBSeconds = 0; this.YBMinutes++; }
    const M = this.YBMinutes < 10 ? '0' + this.YBMinutes : this.YBMinutes;
    const S = this.YBSeconds < 10 ? '0' + this.YBSeconds : this.YBSeconds;
    this.timerDisplayYB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopYB(): void {
    this.clearIntervalsYB();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.YBcountdownInput.nativeElement.style.display = 'none';
    this.YBtimeInput.nativeElement.style.display = 'inline';
    this.YBcurrentValue = parseInt(this.inhaleInputYB.nativeElement.value) + 1;
    this.startBtnYB.nativeElement.disabled = false;
    this.stopBtnYB.nativeElement.disabled = true;
    this.stopBtnYB.nativeElement.style.display = 'none';
    this.YBSave.nativeElement.disabled = true;
    this.YBSave.nativeElement.style.display = 'none';
    this.inhaleYB = true;
    this.hold1YB = false;
    this.exhaleYB = false;
    this.hold2YB = false;
    this.globalService.changeBall(1, 1, this.YBball);
    this.YBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsYB = 0;
    this.roundsDoneYB.nativeElement.innerHTML = '0';
    this.timerDisplayYB.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setYBduration();
    this.YBSeconds = 0;
    this.YBMinutes = 0;
    this.roundsYB = 0;
  }

  saveYB(): void {
    this.YBResult = this.timerDisplayYB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('YBResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.YBResult, rounds: this.roundsYB });
    localStorage.setItem('YBResults', JSON.stringify(savedResults));
    this.YBResultSaved.nativeElement.style.display = 'block';
    this.stopYB();
  }

  clearIntervalsYB(): void {
    clearInterval(this.YBinterval);
    clearInterval(this.YBcountdown);
    clearInterval(this.YBTimer);
    this.YBinterval = null;
    this.YBcountdown = null;
    this.YBTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopYB();
    if (this.YBResultSaved?.nativeElement) {
      this.YBResultSaved.nativeElement.style.display = 'none';
    }
  }
}