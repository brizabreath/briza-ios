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
  selector: 'app-db',
  templateUrl: './db.page.html',
  styleUrls: ['./db.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class DbPage implements AfterViewInit, OnDestroy {
  @ViewChild('questionDB') questionDB!: ElementRef<HTMLButtonElement>;
  @ViewChild('DBball') DBball!: ElementRef<HTMLDivElement>;
  @ViewChild('DBballText') DBballText!: ElementRef<HTMLSpanElement>;
  @ViewChild('DBtimeInput') DBtimeInput!: ElementRef<HTMLSelectElement>;
  @ViewChild('DBcountdownInput') DBcountdownInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startBtnDB') startBtnDB!: ElementRef<HTMLButtonElement>;
  @ViewChild('stopBtnDB') stopBtnDB!: ElementRef<HTMLButtonElement>;
  @ViewChild('DBSave') DBSave!: ElementRef<HTMLButtonElement>;
  @ViewChild('settingsDB') settingsDB!: ElementRef<HTMLButtonElement>;
  @ViewChild('inhaleInputDB') inhaleInputDB!: ElementRef<HTMLInputElement>;
  @ViewChild('exhaleInputDB') exhaleInputDB!: ElementRef<HTMLInputElement>;
  @ViewChild('hold2InputDB') hold2InputDB!: ElementRef<HTMLInputElement>;
  @ViewChild('roundsDoneDB') roundsDoneDB!: ElementRef<HTMLDivElement>;
  @ViewChild('timerDisplayDB') timerDisplayDB!: ElementRef<HTMLDivElement>;
  @ViewChild('DBResultSaved') DBResultSaved!: ElementRef<HTMLDivElement>;
  @ViewChild('minusDB') minusDB!: ElementRef<HTMLButtonElement>;
  @ViewChild('plusDB') plusDB!: ElementRef<HTMLButtonElement>;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private inhaleDB = true;
  private exhaleDB = false;
  private hold2DB = false;
  private DBinterval: any = null;
  private DBcountdown: any = null;
  private DBcurrentValue = 5;
  private DBduration = 0;
  private roundsDB = 0;
  private DBSeconds = 0;
  private DBMinutes = 0;
  private DBTimer: any = null;
  private DBResult = '';
  private appStateHandle?: PluginListenerHandle;
  private songInitStarted = false;

  constructor(
    private navCtrl: NavController,
    private audioService: AudioService,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  ngAfterViewInit(): void {
    for (let DBi = 2; DBi <= 60; DBi++) {
      const DBoption = document.createElement('option');
      DBoption.value = (DBi * 60).toString();
      DBoption.textContent = this.isPortuguese ? `${DBi} minutos` : `${DBi} minutes`;
      this.DBtimeInput.nativeElement.appendChild(DBoption);
    }

    this.minusDB.nativeElement.onclick = () => this.minusRatioDB();
    this.plusDB.nativeElement.onclick = () => this.plusRatioDB();
    this.startBtnDB.nativeElement.onclick = () => this.startDB();
    this.stopBtnDB.nativeElement.onclick = () => this.stopDB();
    this.DBSave.nativeElement.onclick = () => this.saveDB();

    this.stopBtnDB.nativeElement.disabled = true;
    this.stopBtnDB.nativeElement.style.display = 'none';
    this.DBSave.nativeElement.disabled = true;
    this.DBSave.nativeElement.style.display = 'none';

    this.DBtimeInput.nativeElement.onchange = () => this.setDBduration();

    localStorage.setItem('breathingON', 'false');
    localStorage.setItem('firstClick', 'true');
  }

  setDBduration(): void {
    const selectedValue = this.DBtimeInput.nativeElement.value;
    if (selectedValue === 'infinity') {
      this.DBduration = Infinity;
    } else {
      this.DBduration = parseInt(selectedValue, 10);
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
          await this.startDB();
        } else if (firstClick === 'false' && breathingON === 'false') {
          // do nothing
        } else {
          this.globalService.clearAllTimeouts();
          this.stopDB();
        }
      }
    });

    this.DBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.setDBduration();
    this.DBResultSaved.nativeElement.style.display = 'none';
    this.audioService.clearAllAudioBuffers();
  }

  async ionViewDidEnter() {
    if (this.songInitStarted) return;
    this.songInitStarted = true;
    this.audioService.initializeSong().catch((err) => {
      console.warn('initializeSong failed:', err);
    });

    if (!localStorage.getItem('db_guide_seen')) {
      localStorage.setItem('db_guide_seen', 'true');
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
        id: 'db-intro',
        text: `<h3>${t('Reset Breathing', 'Respiração Reset')}</h3>
               <p>${t(
                 'The Reset Breathing technique calms the nervous system by combining two inhales before a long exhale. The double inhale fully inflates the lungs and activates the relaxation response, making the long exhale that follows deeply releasing.',
                 'A técnica de Respiração Reset acalma o sistema nervoso combinando duas inspirações antes de uma longa expiração. A dupla inspiração infla completamente os pulmões e ativa a resposta de relaxamento, tornando a longa expiração que se segue profundamente liberadora.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Posture (centered)
      steps.push({
        id: 'db-posture',
        text: `<h3>${t('Get comfortable', 'Fique confortável')}</h3>
               <p>${t(
                 'Find a comfortable seat or lie down. Relax your shoulders, face muscles and jaw. Place your tongue gently on the roof of your mouth.',
                 'Encontre um assento confortável ou deite-se. Relaxe os ombros, os músculos faciais e a mandíbula. Coloque suavemente a língua no céu da boca.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Minus button
      steps.push({
        id: 'db-minus-btn',
        text: `<h3>${t('Decrease ratio', 'Diminuir proporção')}</h3>
               <p>${t(
                 'Use the minus button to shorten all three phases together. Start with a ratio that feels comfortable — reduce it if the exhale feels too long or your heart rate increases.',
                 'Use o botão de menos para diminuir todas as três fases juntas. Comece com uma proporção confortável — reduza se a expiração parecer longa demais ou seu coração acelerar.'
               )}</p>`,
        attachTo: { element: '#db-minus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - First inhale
      steps.push({
        id: 'db-inhale1-item',
        text: `<h3>${t('First inhale', 'Primeira inspiração')}</h3>
               <p>${t(
                 'Breathe in slowly through the nose, filling your belly and ribs with air. This is the primary inhale that starts each cycle.',
                 'Inspire lentamente pelo nariz, enchendo o abdômen e as costelas de ar. Esta é a inspiração principal que inicia cada ciclo.'
               )}</p>`,
        attachTo: { element: '#db-inhale1-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Second inhale
      steps.push({
        id: 'db-inhale2-item',
        text: `<h3>${t('Second inhale', 'Segunda inspiração')}</h3>
               <p>${t(
                 'Take a second shorter inhale through the nose, topping up your lungs fully. This double inhale is what makes this technique unique — it maximises lung volume before the release.',
                 'Faça uma segunda inspiração mais curta pelo nariz, enchendo os pulmões completamente. Essa dupla inspiração é o que torna esta técnica única — ela maximiza o volume pulmonar antes da liberação.'
               )}</p>`,
        attachTo: { element: '#db-inhale2-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 6 - Exhale
      steps.push({
        id: 'db-exhale-item',
        text: `<h3>${t('Long exhale', 'Expiração longa')}</h3>
               <p>${t(
                 'Exhale fully and slowly through the nose or mouth, releasing all the air and tension. This extended release is what activates the calming effect on the nervous system.',
                 'Expire completamente e lentamente pelo nariz ou boca, liberando todo o ar e tensão. Essa liberação prolongada é o que ativa o efeito calmante no sistema nervoso.'
               )}</p>`,
        attachTo: { element: '#db-exhale-item', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 7 - Plus button
      steps.push({
        id: 'db-plus-btn',
        text: `<h3>${t('Increase ratio', 'Aumentar proporção')}</h3>
               <p>${t(
                 'Use the plus button to extend all three phases together as you progress. Increase gradually — only when the current ratio feels easy and natural.',
                 'Use o botão de mais para aumentar todas as três fases juntas conforme você avança. Aumente gradualmente — apenas quando a proporção atual parecer fácil e natural.'
               )}</p>`,
        attachTo: { element: '#db-plus-btn', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 8 - Duration
      steps.push({
        id: 'db-duration-select',
        text: `<h3>${t('Choose duration', 'Escolha a duração')}</h3>
               <p>${t(
                 'Select how long you want the session to last. You can set it to infinite and stop whenever you feel ready, or choose a fixed duration to stay on track.',
                 'Selecione por quanto tempo deseja que a sessão dure. Você pode deixar no infinito e parar quando quiser, ou escolher uma duração fixa para manter o foco.'
               )}</p>`,
        attachTo: { element: '#db-duration-select', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 9 - Start circle
      steps.push({
        id: 'db-start-ball',
        text: `<h3>${t('Start & pause', 'Iniciar e pausar')}</h3>
               <p>${t(
                 'Press the circle to start and follow the guided rhythm. Press it again at any time to pause. Remember to save your results at the end to track your progress over time.',
                 'Pressione o círculo para iniciar e siga o ritmo guiado. Pressione novamente a qualquer momento para pausar. Lembre-se de salvar seus resultados ao final para acompanhar sua evolução.'
               )}</p>`,
        attachTo: { element: '#db-start-ball', on: 'top' },
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

  minusRatioDB(): void {
    if (parseInt(this.inhaleInputDB.nativeElement.value) > 3) {
      this.inhaleInputDB.nativeElement.value = ((parseInt(this.inhaleInputDB.nativeElement.value) || 0) - 1).toString();
      this.exhaleInputDB.nativeElement.value = ((parseInt(this.exhaleInputDB.nativeElement.value) || 0) - 1).toString();
      this.hold2InputDB.nativeElement.value = ((parseInt(this.hold2InputDB.nativeElement.value) || 0) - 2).toString();
    }
  }

  plusRatioDB(): void {
    if (parseInt(this.inhaleInputDB.nativeElement.value) < 10) {
      this.inhaleInputDB.nativeElement.value = ((parseInt(this.inhaleInputDB.nativeElement.value) || 0) + 1).toString();
      this.exhaleInputDB.nativeElement.value = ((parseInt(this.exhaleInputDB.nativeElement.value) || 0) + 1).toString();
      this.hold2InputDB.nativeElement.value = ((parseInt(this.hold2InputDB.nativeElement.value) || 0) + 2).toString();
    }
  }

  async startDB(): Promise<void> {
    await this.audioService.unlockFromGestureIfNeeded();
    await this.audioService.resetForPlayOrResume();

    const breathingON = localStorage.getItem('breathingON');
    const firstClick = localStorage.getItem('firstClick');

    this.settingsDB.nativeElement.disabled = true;
    this.questionDB.nativeElement.disabled = true;

    if (firstClick === 'true' && breathingON === 'false') {
      this.startBtnDB.nativeElement.disabled = true;
      this.inhaleDB = true;
      this.DBcountdownInput.nativeElement.style.display = 'inline';
      this.DBtimeInput.nativeElement.style.display = 'none';
      this.startCountdownDB();
      this.DBballText.nativeElement.textContent = '3';

      await this.audioService.playBell('bell');

      const timeoutId1 = setTimeout(() => {
        this.audioService.playSelectedSong();
      }, 500);
      this.globalService.timeouts.push(timeoutId1);

      const timeoutId2 = setTimeout(() => {
        this.DBballText.nativeElement.textContent = '2';
      }, 1000);
      this.globalService.timeouts.push(timeoutId2);

      const timeoutId3 = setTimeout(() => {
        this.DBballText.nativeElement.textContent = '1';
      }, 2000);
      this.globalService.timeouts.push(timeoutId3);

      const timeoutId4 = setTimeout(async () => {
        this.DBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        await this.audioService.playSound('inhale');
        this.DBcurrentValue = parseInt(this.inhaleInputDB.nativeElement.value) + 1;
        await this.audioService.playBreathSound('inhaleBreath', this.DBcurrentValue);
        this.globalService.changeBall(1.3, parseInt(this.inhaleInputDB.nativeElement.value), this.DBball);
        this.DBinterval = setInterval(() => this.startTimerDB(), 1000);
        this.DBTimer = setInterval(() => this.DisplayTimerDB(), 1000);
        this.startBtnDB.nativeElement.disabled = false;
        localStorage.setItem('breathingON', 'true');
        localStorage.setItem('firstClick', 'false');
      }, 3000);
      this.globalService.timeouts.push(timeoutId4);

    } else if (firstClick === 'false' && breathingON === 'true') {
      this.clearIntervalsDB();
      localStorage.setItem('breathingON', 'false');
      this.stopBtnDB.nativeElement.disabled = false;
      this.stopBtnDB.nativeElement.style.display = 'inline-flex';

      if (this.roundsDB > 0) {
        this.DBSave.nativeElement.disabled = false;
        this.DBSave.nativeElement.style.display = 'inline-flex';
      }

      this.settingsDB.nativeElement.disabled = false;
      this.questionDB.nativeElement.disabled = false;
      this.DBballText.nativeElement.textContent = this.isPortuguese ? 'Continuar' : 'Resume';
      this.audioService.pauseSelectedSong();

    } else if (firstClick === 'false' && breathingON === 'false') {
      if (this.isPortuguese || this.exhaleDB) {
        if (this.inhaleDB) this.DBballText.nativeElement.textContent = 'Inspire';
        else if (this.hold2DB) this.DBballText.nativeElement.textContent = 'Espire';
      } else {
        if (this.inhaleDB || this.exhaleDB) this.DBballText.nativeElement.textContent = 'Inhale';
        else if (this.hold2DB) this.DBballText.nativeElement.textContent = 'Exhale';
      }

      this.audioService.playSelectedSong();
      localStorage.setItem('breathingON', 'true');
      this.stopBtnDB.nativeElement.disabled = true;
      this.stopBtnDB.nativeElement.style.display = 'none';
      this.DBSave.nativeElement.disabled = true;
      this.DBSave.nativeElement.style.display = 'none';
      this.DBinterval = setInterval(() => this.startTimerDB(), 1000);
      this.DBTimer = setInterval(() => this.DisplayTimerDB(), 1000);
      this.startCountdownDB();
    }
  }

  startCountdownDB(): void {
    if (this.DBduration !== Infinity) {
      const Contdownminutes = Math.floor(this.DBduration / 60);
      const Contdownseconds = this.DBduration % 60;
      this.DBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
      this.DBcountdown = setInterval(() => {
        if (this.DBduration === 0) {
          clearInterval(this.DBcountdown);
          this.DBcountdown = null;
        } else {
          this.DBduration--;
          const Contdownminutes = Math.floor(this.DBduration / 60);
          const Contdownseconds = this.DBduration % 60;
          this.DBcountdownInput.nativeElement.value = `${Contdownminutes.toString()}:${Contdownseconds.toString().padStart(2, '0')}`;
        }
      }, 1000);
    } else {
      this.DBcountdownInput.nativeElement.value = '∞';
      this.DBcountdownInput.nativeElement.style.display = 'inline';
      this.DBtimeInput.nativeElement.style.display = 'none';
    }
  }

  async startTimerDB(): Promise<void> {
    this.DBcurrentValue--;

    if (this.inhaleDB && this.DBcurrentValue === 1) {
      this.DBcurrentValue = parseInt(this.exhaleInputDB.nativeElement.value) + 1;
      this.inhaleDB = false;
      this.exhaleDB = true;
      await this.audioService.playSound('inagain');
      await this.audioService.playBreathSound('inhaleBreath', this.DBcurrentValue);
      this.DBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
      this.globalService.changeBall(1.5, parseInt(this.exhaleInputDB.nativeElement.value), this.DBball);

    } else if (this.exhaleDB && this.DBcurrentValue === 1) {
      this.DBcurrentValue = parseInt(this.hold2InputDB.nativeElement.value) + 1;
      this.exhaleDB = false;
      this.hold2DB = true;
      await this.audioService.playSound('exhale');
      await this.audioService.playBreathSound('exhaleBreath', this.DBcurrentValue);
      this.DBballText.nativeElement.textContent = this.isPortuguese ? 'Espire' : 'Exhale';
      this.globalService.changeBall(1, parseInt(this.hold2InputDB.nativeElement.value), this.DBball);
      this.roundsDB++;
      this.roundsDoneDB.nativeElement.innerHTML = this.roundsDB.toString();

    } else if (this.hold2DB && this.DBcurrentValue === 1) {
      if (this.DBduration !== 0) {
        this.DBcurrentValue = parseInt(this.inhaleInputDB.nativeElement.value) + 1;
        this.hold2DB = false;
        this.inhaleDB = true;
        await this.audioService.playSound('inhale');
        await this.audioService.playBreathSound('inhaleBreath', this.DBcurrentValue);
        this.DBballText.nativeElement.textContent = this.isPortuguese ? 'Inspire' : 'Inhale';
        this.globalService.changeBall(1.3, parseInt(this.inhaleInputDB.nativeElement.value), this.DBball);
      } else {
        this.clearIntervalsDB();
        localStorage.setItem('breathingON', 'false');
        this.startBtnDB.nativeElement.disabled = true;
        this.settingsDB.nativeElement.disabled = false;
        this.questionDB.nativeElement.disabled = false;
        this.stopBtnDB.nativeElement.disabled = false;
        this.stopBtnDB.nativeElement.style.display = 'inline-flex';
        this.DBSave.nativeElement.disabled = false;
        this.DBSave.nativeElement.style.display = 'inline-flex';
        this.globalService.changeBall(1.5, 1, this.DBball);
        this.DBcountdownInput.nativeElement.style.display = 'none';
        this.DBtimeInput.nativeElement.style.display = 'inline';
        this.DBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
        await this.audioService.pauseSelectedSong();
        await this.audioService.playBell('bell');
        setTimeout(async () => {
          await this.audioService.playSound('normalbreath');
        }, 1000);
      }
    }
  }

  DisplayTimerDB(): void {
    this.DBSeconds++;
    if (this.DBSeconds === 60) {
      this.DBSeconds = 0;
      this.DBMinutes++;
    }
    const M = this.DBMinutes < 10 ? '0' + this.DBMinutes : this.DBMinutes;
    const S = this.DBSeconds < 10 ? '0' + this.DBSeconds : this.DBSeconds;
    this.timerDisplayDB.nativeElement.innerHTML = `${M.toString()} : ${S.toString()}`;
  }

  stopDB(): void {
    this.clearIntervalsDB();
    localStorage.setItem('firstClick', 'true');
    localStorage.setItem('breathingON', 'false');
    this.DBcountdownInput.nativeElement.style.display = 'none';
    this.DBtimeInput.nativeElement.style.display = 'inline';
    this.DBcurrentValue = parseInt(this.inhaleInputDB.nativeElement.value) + 1;
    this.startBtnDB.nativeElement.disabled = false;
    this.stopBtnDB.nativeElement.disabled = true;
    this.stopBtnDB.nativeElement.style.display = 'none';
    this.DBSave.nativeElement.disabled = true;
    this.DBSave.nativeElement.style.display = 'none';
    this.inhaleDB = true;
    this.exhaleDB = false;
    this.hold2DB = false;
    this.globalService.changeBall(1, 1, this.DBball);
    this.DBballText.nativeElement.textContent = this.isPortuguese ? 'Iniciar' : 'Start';
    this.roundsDB = 0;
    this.roundsDoneDB.nativeElement.innerHTML = '0';
    this.timerDisplayDB.nativeElement.innerHTML = '00 : 00';
    this.audioService.pauseSelectedSong();
    this.setDBduration();
    this.DBSeconds = 0;
    this.DBMinutes = 0;
    this.roundsDB = 0;
  }

  saveDB(): void {
    this.DBResult = this.timerDisplayDB.nativeElement.innerHTML;
    const savedResults = JSON.parse(localStorage.getItem('DBResults') || '[]');
    savedResults.push({ date: new Date().toISOString(), result: this.DBResult, rounds: this.roundsDB });
    localStorage.setItem('DBResults', JSON.stringify(savedResults));
    this.DBResultSaved.nativeElement.style.display = 'block';
    this.stopDB();
  }

  clearIntervalsDB(): void {
    clearInterval(this.DBinterval);
    clearInterval(this.DBcountdown);
    clearInterval(this.DBTimer);
    this.DBinterval = null;
    this.DBcountdown = null;
    this.DBTimer = null;
  }

  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back();
  }

  ngOnDestroy(): void {
    this.shepherd.cancel();
    this.stopDB();
    if (this.DBResultSaved?.nativeElement) {
      this.DBResultSaved.nativeElement.style.display = 'none';
    }
  }
}