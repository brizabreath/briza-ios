import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { ShepherdService } from 'angular-shepherd';

type ExerciseKey =
  | 'brtResults'
  | 'HATResults'
  | 'HATCResults'
  | 'AHATResults'
  | 'WHResults'
  | 'KBResults'
  | 'BBResults'
  | 'YBResults'
  | 'BREResults'
  | 'BRWResults'
  | 'CTResults'
  | 'APResults'
  | 'UBResults'
  | 'BOXResults'
  | 'CBResults'
  | 'RBResults'
  | 'NBResults'
  | 'LungsResults'
  | 'DBResults'
  | 'HUMResults';

type Band = -10 | -15 | -20 | -25 | -30 | -35 | -40 | 40;

type SectionKey = 'morningStart' | 'day' | 'after' | 'night';

interface ExerciseDef {
  key: ExerciseKey;
  route: string | { en: string; pt: string }; 
  title: { en: string; pt: string };
  duration: { en: string; pt: string };
  icon: string;
  checkboxClass: string;
}

interface CardVM {
  def: ExerciseDef;
}

interface SectionVM {
  heading: { en: string; pt: string };
  cards: CardVM[];
}

interface DayPlan {
  isoDate: string;      // YYYY-MM-DD in user's local timezone
  weekdayIndex: number; // 0..6 (Sun..Sat)
  sections: {
    morningStart: ExerciseKey[];
    day: ExerciseKey[];
    after: ExerciseKey[]; // 0 or 1
    night: ExerciseKey[]; // always 1
  };
  userExcludedNight?: boolean; // <-- add this
}

interface WeeklyRoutine {
  version: number;
  createdAtISO: string;
  timezone: string;
  weekStartISO: string; // Monday YYYY-MM-DD
  weekEndISO: string;   // Sunday YYYY-MM-DD
  band: Band;
  avgSeconds: number;
  daySessionCount: 1 | 2; // based on band (<25 => 1, >25 => 2)
  afterRule: 'none' | 'BRE' | 'BRW';
  days: DayPlan[];
  debug: any;
}

@Component({
  selector: 'app-program',
  templateUrl: './program.page.html',
  styleUrls: ['./program.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class ProgramPage implements AfterViewInit {
  @ViewChild('personalizedBriza') personalizedBriza!: ElementRef<HTMLDivElement>;
  @ViewChild('myModalP') modalP!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalP') closeModalButtonP!: ElementRef<HTMLSpanElement>;
  @ViewChild('Pdots') Pdots!: ElementRef<HTMLDivElement>;
  @ViewChild('questionP') questionP!: ElementRef<HTMLAnchorElement>;
  @ViewChild('noBrtResults') noBrtResults!: ElementRef<HTMLDivElement>;
  pendingAddKey: ExerciseKey | null = null;
  showAddWhereAlert = false;

  get addWhereAlertButtons() {
    const t = (en: string, pt: string) => (this.isPortuguese ? pt : en);

    return [
      { text: t('Cancel', 'Cancelar'), role: 'cancel' },

      {
        text: t('Morning start', 'Ao acordar'),
        handler: () => this.confirmAddToSection('morningStart'),
      },
      {
        text: t('Day session(s)', 'Sessão do dia'),
        handler: () => this.confirmAddToSection('day'),
      },
      {
        text: t('After intense activities', 'Depois de atividades intensas'),
        handler: () => this.confirmAddToSection('after'),
      },
      {
        text: t('Evening wind down', 'Antes de dormir'),
        handler: () => this.confirmAddToSection('night'),
      },
    ];
  }
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  latestBRTResultInSeconds = 0;
  resultsByDate: { [date: string]: any[] } = {};
  todayProgram: SectionVM[] = [];

  private readonly ROUTINE_LS_KEY = 'brizaWeeklyRoutineV1';
  private readonly ROUTINE_HISTORY_LS_KEY = 'brizaWeeklyRoutineHistoryV1'; // for "carry-over" prioritization
  private readonly ROUTINE_VERSION = 1;
  showWebSplash = false;
  // Dropdown state
  removeSelection: '' | ExerciseKey = '';
  addSelection: '' | ExerciseKey = '';

  // Dropdown option lists (computed each time routine renders)
  todayExerciseOptionsForRemove: Array<{ key: ExerciseKey; label: { en: string; pt: string } }> = [];
  allExerciseOptionsForAdd: Array<{ key: ExerciseKey; label: { en: string; pt: string } }> = [];
  constructor(
    private navCtrl: NavController,
    public globalService: GlobalService,
    private shepherd: ShepherdService,
    private router: Router
  ) {}
  onAddWhereAlertDismiss(): void {
    // reset UI state
    this.showAddWhereAlert = false;
    this.pendingAddKey = null;
    this.addSelection = '';
  }
  ionViewWillEnter() {
    this.showWebSplash = true;
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }

    this.populateProgramContent();
    // ✅ Ensure splash always goes away even if something throws
    setTimeout(() => {
      this.showWebSplash = false;
    }, 1000);
  }

  ionViewDidEnter() {
    const shouldStart = localStorage.getItem('startProgTour') === 'true';
    if (shouldStart) {
      localStorage.removeItem('startProgTour');
      this.startBreathTourNow();
    }

    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
  }

  ngAfterViewInit() {
    this.globalService.initBulletSlider(this.modalP, this.Pdots, 'slides');
    this.closeModalButtonP.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalP));
    this.questionP.nativeElement.onclick = () => this.globalService.openModal(this.modalP, this.Pdots, 'slides');
  }

  // =========================
  // TOUR (unchanged)
  // =========================
  private isVisible(el: HTMLElement): boolean {
    if (!el) return false;
    const style = getComputedStyle(el);
    return (
      el.offsetParent !== null &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      el.getClientRects().length > 0
    );
  }

  private firstVisible(selector: string): HTMLElement | null {
    return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(el => this.isVisible(el)) || null;
  }

  private startBreathTourNow() {
    const isPT = localStorage.getItem('isPortuguese') === 'true';
    const t = (en: string, pt: string) => (isPT ? pt : en);

    (this.shepherd as any).defaultStepOptions = {
      cancelIcon: { enabled: true },
      scrollTo: true,
      canClickTarget: false,
      modalOverlayOpeningPadding: 4,
      modalOverlayOpeningRadius: 10,
      classes: 'briza-tour',
    } as any;
    this.shepherd.modal = true;

    const anchorEl = this.firstVisible('.brt-link') || document.querySelector<HTMLElement>('.logoimg');

    this.shepherd.addSteps([
      {
        id: 'brt-step',
        text: `<h3>${t('Briza Retention Test','Teste de Retenção Briza')}</h3>
              <p>${t('Do this test daily to track your breathing and fitness',
                      'Faça este teste diariamente para acompanhar sua respiração e condicionamento')}</p>`,
        attachTo: { element: anchorEl, on: 'bottom' },
        buttons: [
          {
            text: t('Continue','Continuar'),
            action: () => {
              this.shepherd.complete();
              localStorage.setItem('startBRTTour','true');
              this.router.navigateByUrl('/brt');
            }
          }
        ]
      }
    ]);

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

    setTimeout(() => this.shepherd.start(), 0);
  }

  ionViewDidLeave() {
    this.unlockUIForTour();
  }

  private lockUIForTour = () => {
    document.documentElement.classList.add('tour-active');
    document.body.style.overflow = 'hidden';
  };

  private unlockUIForTour = () => {
    document.documentElement.classList.remove('tour-active');
    document.body.style.overflow = '';
  };

  // =========================
  // HEADERS (pluralization)
  // =========================
  private sectionTitles = {
    morningStart: { en: 'Morning start', pt: 'Ao acordar' },
    day1: { en: 'Day session', pt: 'Sessão do dia' },         // singular
    day2: { en: 'Day sessions', pt: 'Sessões do dia' },       // plural
    after: { en: 'After intense activities', pt: 'Depois de atividades intensas' },
    night: { en: 'Evening wind down', pt: 'Antes de dormir' },
  };

  // =========================
  // ICONS (as in your code)
  // =========================
  private ICON = {
    retention: 'assets/images/brizaretention.png',
    briza: 'assets/images/brizabreathing.png',
    recovery: 'assets/images/breathrecovery.png',
    co2: 'assets/images/ctt.png',
    altitude: 'assets/images/highaltitude.png',
    hum: 'assets/images/bee.png',
    hyper: 'assets/images/hyperventilation.png',
    wh: 'assets/images/anxiety.png',
    lungs: 'assets/images/lungexpansion.png',
    performance: 'assets/images/performanceIcon.png',
    yogic: 'assets/images/yogicbreathing.png',
    nadi: 'assets/images/nb.png',
    coherent: 'assets/images/vitality.png',
    double: 'assets/images/db.png',
    box: 'assets/images/box.png',
    reset: 'assets/images/reset.png',
    ub: 'assets/images/ub.png',
  };
  
  // =========================
  // EXERCISE DEFINITIONS
  // =========================
  private EX: Record<ExerciseKey, ExerciseDef> = {
    brtResults: {
      key: 'brtResults',
      route: '/brt',
      title: { en: 'Briza Retention Test', pt: 'Teste de Retenção Briza' },
      duration: { en: 'Duration: ~ 1 min', pt: 'Duração: ~ 1 min' },
      icon: this.ICON.retention,
      checkboxClass: 'BRT',
    },
    BBResults: {
      key: 'BBResults',
      route: '/bb',
      title: { en: 'Briza Breathing', pt: 'Respiração Briza' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.briza,
      checkboxClass: 'BB',
    },
    YBResults: {
      key: 'YBResults',
      route: '/yogic',
      title: { en: 'Dirga', pt: 'Dirga' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.yogic,
      checkboxClass: 'YB',
    },
    NBResults: {
      key: 'NBResults',
      route: '/nb',
      title: { en: 'Nadi Shodhana', pt: 'Nadi Shodhana' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.nadi,
      checkboxClass: 'NB',
    },
    HUMResults: {
      key: 'HUMResults',
      route: '/hum',
      title: { en: 'Bhramari', pt: 'Bhramari' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.hum,
      checkboxClass: 'HUM',
    },
    DBResults: {
      key: 'DBResults',
      route: '/db',
      title: { en: 'Reset Breathing', pt: 'Respiração Reset' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.double,
      checkboxClass: 'DB',
    },
    BOXResults: {
      key: 'BOXResults',
      route: '/box',
      title: { en: 'Sama Vritti', pt: 'Sama Vritti' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.box,
      checkboxClass: 'BOX',
    },
    RBResults: {
      key: 'RBResults',
      route: '/rb',
      title: { en: '4-7-8', pt: '4-7-8' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.reset,
      checkboxClass: 'RB',
    },
    CBResults: {
      key: 'CBResults',
      route: '/cb',
      title: { en: 'Coherent Breathing', pt: 'Respiração Coerente' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.coherent,
      checkboxClass: 'CB',
    },
    BREResults: {
      key: 'BREResults',
      route: '/bre',
      title: { en: 'Breath Recovery', pt: 'Recuperando o Fôlego' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.recovery,
      checkboxClass: 'BRE',
    },
    BRWResults: {
      key: 'BRWResults',
      route: '/brw',
      title: { en: 'Walking Recovery', pt: 'Recuperando Andando' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.performance,
      checkboxClass: 'BRW',
    },
    LungsResults: {
      key: 'LungsResults',
      route: {
        en: '/lungs?open=Lb9X1QkkDpNYEPIzw2Ga',
        pt: '/lungs?open=OlV7sIjOrmOsKhm7d83W'
      },
      title: { en: 'Lungs Expansion', pt: 'Expansão Pulmonar' },
      duration: { en: 'Duration: ~ 30 min', pt: 'Duração: ~ 30 min' },
      icon: this.ICON.lungs,
      checkboxClass: 'Lungs',
    },
    UBResults: {
      key: 'UBResults',
      route: '/ub',
      title: { en: 'Ujjayi', pt: 'Ujjayi' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.ub,
      checkboxClass: 'UB',
    },
    CTResults: {
      key: 'CTResults',
      route: '/ct',
      title: { en: 'CO₂ Tolerance', pt: 'Tolerância ao CO₂' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.co2,
      checkboxClass: 'CT',
    },
    HATResults: {
      key: 'HATResults',
      route: '/hat',
      title: { en: 'Altitude Training', pt: 'Treinamento de Altitude' },
      duration: { en: 'Duration: 4 - 10 rounds', pt: 'Duração: 4 - 10 rounds' },
      icon: this.ICON.altitude,
      checkboxClass: 'HAT',
    },
    HATCResults: {
      key: 'HATCResults',
      route: '/hatc',
      title: { en: 'Altitude (Running)', pt: 'Altitude (Correndo)' },
      duration: { en: 'Duration: 4 - 10 rounds', pt: 'Duração: 4 - 10 rounds' },
      icon: this.ICON.altitude,
      checkboxClass: 'HATC',
    },
    AHATResults: {
      key: 'AHATResults',
      route: '/ahat',
      title: { en: 'Altitude Pro', pt: 'Altitude Pro' },
      duration: { en: 'Duration: 4 - 10 rounds', pt: 'Duração: 4 - 10 rounds' },
      icon: this.ICON.altitude,
      checkboxClass: 'AHAT',
    },
    WHResults: {
      key: 'WHResults',
      route: '/wh',
      title: { en: 'Oxygen Boost', pt: 'Boost de Oxigênio' },
      duration: { en: 'Duration: 3 - 6 round', pt: 'Duração: 3 - 6 rounds' },
      icon: this.ICON.wh,
      checkboxClass: 'WH',
    },
    APResults: {
      key: 'APResults',
      route: '/ap',
      title: { en: 'Apnea Training', pt: 'Treinamento de Apneia' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.co2,
      checkboxClass: 'AP',
    },
    KBResults: {
      key: 'KBResults',
      route: '/kb',
      title: { en: 'Kapalabhati', pt: 'Kapalabhati' },
      duration: { en: 'Duration: 3 - 6 round', pt: 'Duração: 3 - 6 round' },
      icon: this.ICON.hyper,
      checkboxClass: 'KB',
    },
  };

  // =========================
  // RULES YOU PROVIDED (POOLS)
  // =========================
  private RULES: Record<Band, {
    daySessionsPerDay: 1 | 2;
    dayOptions: Array<{ key: ExerciseKey; perWeek?: number; notes?: string }>;
    nightOptions: ExerciseKey[];
  }> = {
    [-10]: {
      daySessionsPerDay: 1,
      dayOptions: [
        { key: 'YBResults' },
        { key: 'UBResults' },
        { key: 'BOXResults' },
        { key: 'NBResults' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'DBResults', 'HUMResults'],
    },
    [-15]: {
      daySessionsPerDay: 1,
      dayOptions: [
        { key: 'YBResults' },
        { key: 'BREResults' },
        { key: 'UBResults' },
        { key: 'BOXResults' },
        { key: 'NBResults' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'DBResults', 'HUMResults'],
    },
    [-20]: {
      daySessionsPerDay: 1,
      dayOptions: [
        { key: 'BRWResults' }, // your list (kept as-is even though "after intense" is disabled <20)
        { key: 'HATResults', perWeek: 2, notes: '2x per week' },
        { key: 'WHResults' },
        { key: 'HUMResults' },
        { key: 'NBResults' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'DBResults', 'UBResults', 'BOXResults', 'YBResults'],
    },
    [-25]: {
      daySessionsPerDay: 1,
      dayOptions: [
        { key: 'HATResults', perWeek: 2, notes: '2x per week' },
        { key: 'WHResults' },
        { key: 'KBResults' },
        { key: 'CTResults' },
        { key: 'APResults' },
        { key: 'LungsResults', notes: 'not on Saturday or Sunday' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'DBResults', 'YBResults', 'UBResults', 'BOXResults', 'HUMResults'],
    },
    [-30]: {
      daySessionsPerDay: 2,
      dayOptions: [
        { key: 'HATResults', perWeek: 3, notes: '3x per week' },
        { key: 'WHResults', perWeek: 3, notes: '3x per week' },
        { key: 'KBResults', perWeek: 2, notes: '2x per week' },
        { key: 'CTResults', perWeek: 2, notes: '2x per week' },
        { key: 'APResults', perWeek: 2, notes: '2x per week' },
        { key: 'LungsResults', perWeek: 2, notes: 'not on Saturday or Sunday; 2x per week' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'DBResults', 'YBResults', 'UBResults', 'BOXResults', 'HUMResults'],
    },
    [-35]: {
      daySessionsPerDay: 2,
      dayOptions: [
        { key: 'HATResults', perWeek: 2, notes: '2x per week' },
        { key: 'HATCResults', perWeek: 3, notes: '3x per week' },
        { key: 'WHResults', perWeek: 3, notes: '3x per week' },
        { key: 'KBResults', perWeek: 2, notes: '2x per week' },
        { key: 'CTResults', perWeek: 2, notes: '2x per week' },
        { key: 'LungsResults', perWeek: 2, notes: 'not on Saturday or Sunday; 2x per week' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'DBResults', 'YBResults', 'UBResults', 'BOXResults', 'HUMResults'],
    },
    [-40]: {
      daySessionsPerDay: 2,
      dayOptions: [
        { key: 'HATCResults', perWeek: 3, notes: '3x per week' },
        { key: 'AHATResults', perWeek: 3, notes: '3x per week' },
        { key: 'WHResults', perWeek: 3, notes: '3x per week' },
        { key: 'KBResults', perWeek: 2, notes: '2x per week' },
        { key: 'CTResults', perWeek: 1, notes: '1x per week' },
        { key: 'LungsResults', perWeek: 2, notes: 'not on Saturday or Sunday; 2x per week' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'DBResults', 'YBResults', 'UBResults', 'BOXResults', 'HUMResults'],
    },
    [40]: {
      daySessionsPerDay: 2,
      dayOptions: [
        { key: 'HATCResults', perWeek: 4, notes: '4x per week' },
        { key: 'AHATResults', perWeek: 2, notes: '2x per week' },
        { key: 'WHResults', perWeek: 3, notes: '3x per week' },
        { key: 'KBResults', perWeek: 2, notes: '2x per week' },
        { key: 'CTResults', perWeek: 1, notes: '1x per week' },
        { key: 'LungsResults', perWeek: 2, notes: 'not on Saturday or Sunday; 2x per week' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'DBResults', 'YBResults', 'UBResults', 'BOXResults', 'HUMResults'],
    },
  };

  // =========================
  // MAIN ENTRY: BUILD TODAY VIEW FROM WEEKLY ROUTINE
  // =========================
  populateProgramContent(): void {
    this.loadResults();

    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    // reset view state
    if (this.noBrtResults?.nativeElement) {
      this.noBrtResults.nativeElement.style.display = 'none';
    }
    this.todayProgram = [];

    const storedResults = localStorage.getItem('brtResults');
    const brtResults = storedResults ? JSON.parse(storedResults) : [];
    const BRTnumberOfTests = brtResults.length;

    if (BRTnumberOfTests === 0) {
      this.noBrtResults.nativeElement.style.display = 'block';
      return;
    }

    const avgSeconds = this.computeAvgSeconds(brtResults);
    this.latestBRTResultInSeconds = avgSeconds;

    const band = this.getRangeBand(avgSeconds);

    // Ensure routine exists and is correct for this week + band
    const routine = this.ensureWeeklyRoutine(band, avgSeconds);

    // Render today's plan from saved routine
    const todayISO = this.localISODate(new Date());
    const today = routine.days.find(d => d.isoDate === todayISO);

    if (!today) {
      const regen = this.createWeeklyRoutine(band, avgSeconds);
      this.saveRoutine(regen);
      const iso = this.localISODate(new Date());
      this.todayProgram = this.dayPlanToSections(regen, iso);
      this.rebuildDropdownOptionsFromRoutine(regen, iso);
    } else {
      this.todayProgram = this.dayPlanToSections(routine, todayISO);
      this.rebuildDropdownOptionsFromRoutine(routine, todayISO);
    }
    this.removeSelection = '';
    this.addSelection = '';
    // keep your language visibility behavior
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
  }

  private computeAvgSeconds(brtResults: any[]): number {
    const n = brtResults.length;
    if (n === 1) return this.timeStringToSeconds(brtResults[0].result);

    const last = brtResults.slice(-7);
    const totalSeconds = last.reduce((sum: number, entry: any) => sum + this.timeStringToSeconds(entry.result), 0);
    return totalSeconds / last.length;
  }

  // =========================
  // WEEKLY ROUTINE STORAGE / REGEN
  // =========================
  private ensureWeeklyRoutine(band: Band, avgSeconds: number): WeeklyRoutine {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { weekStartISO, weekEndISO } = this.getCurrentWeekWindowISO();

    const stored = this.getStoredRoutine();
    const needsNewWeek =
      !stored ||
      stored.version !== this.ROUTINE_VERSION ||
      stored.timezone !== tz ||
      stored.weekStartISO !== weekStartISO ||
      stored.weekEndISO !== weekEndISO;

    const bandChanged = stored && stored.band !== band;

    if (needsNewWeek || bandChanged) {
      const routine = this.createWeeklyRoutine(band, avgSeconds);
      this.saveRoutine(routine);
      this.appendHistoryUsedExercises(routine);
      return routine;
    }

    return stored;
  }

  private getStoredRoutine(): WeeklyRoutine | null {
    try {
      const raw = localStorage.getItem(this.ROUTINE_LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as WeeklyRoutine;
    } catch {
      return null;
    }
  }

  private saveRoutine(r: WeeklyRoutine): void {
    localStorage.setItem(this.ROUTINE_LS_KEY, JSON.stringify(r, null, 2));
  }

  // Track which exercises were used, so next week we can prioritize unused ones
  private appendHistoryUsedExercises(r: WeeklyRoutine): void {
    const used = new Set<ExerciseKey>();
    r.days.forEach(d => {
      (Object.keys(d.sections) as Array<keyof DayPlan['sections']>).forEach(sk => {
        d.sections[sk].forEach(k => used.add(k));
      });
    });

    const entry = {
      weekStartISO: r.weekStartISO,
      weekEndISO: r.weekEndISO,
      band: r.band,
      usedExercises: Array.from(used),
      createdAtISO: r.createdAtISO,
      timezone: r.timezone,
    };

    const prevRaw = localStorage.getItem(this.ROUTINE_HISTORY_LS_KEY);
    const prev = prevRaw ? JSON.parse(prevRaw) : [];

    const next = [entry, ...prev].slice(0, 12); // keep last 12 weeks
    localStorage.setItem(this.ROUTINE_HISTORY_LS_KEY, JSON.stringify(next, null, 2));
  }

  private getLastWeekUsedExercises(): Set<ExerciseKey> {
    try {
      const raw = localStorage.getItem(this.ROUTINE_HISTORY_LS_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      const last = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
      if (!last?.usedExercises) return new Set();
      return new Set(last.usedExercises as ExerciseKey[]);
    } catch {
      return new Set();
    }
  }

  // =========================
  // ROUTINE GENERATION
  // =========================
  private createWeeklyRoutine(band: Band, avgSeconds: number): WeeklyRoutine {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { weekStartISO, weekEndISO, datesISO } = this.getCurrentWeekWindowISO(true);

    const rule = this.RULES[band];

    // your rule: <25 => 1 day session; >25 => 2 day sessions
    // (band -25 is still under 25 seconds range and uses 1; band -30 and above uses 2)
    const daySessionsPerDay = rule.daySessionsPerDay;

    const afterRule = this.afterRuleForBand(band);

    // for carry-over: prioritize exercises NOT used last week (when there are more than 7 options)
    const lastWeekUsed = this.getLastWeekUsedExercises();

    // Build weekly quotas for the day pool
    const quotas = this.buildDayQuotas(band);

    // Make a shuffled "bag" of picks to satisfy perWeek quotas first
    // and then fill remaining slots with weighted picks.
    const routineDays: DayPlan[] = [];

    // Track counts across the week for enforcing perWeek quotas, and generic repeat caps for single-session weeks.
    const weekDayCounts: Record<ExerciseKey, number> = {} as any;


    // Prepare fixed quota bag (e.g. HAT 3x/week)
    let quotaBag: ExerciseKey[] = [];
    Object.entries(quotas).forEach(([k, n]) => {
      for (let i = 0; i < n; i++) quotaBag.push(k as ExerciseKey);
    });
    quotaBag = this.shuffle(quotaBag);

    // Candidate list for day options (keys)
    const dayOptionKeys = rule.dayOptions.map(o => o.key);

    // For single-session weeks (<25): cap each day option at 2/week UNLESS it has explicit perWeek
    const isSingleDaySessionWeek = daySessionsPerDay === 1;

    // We'll also obey "no Lungs on Sat/Sun" (for any band where lungs exist)
    const isLungsBlockedDay = (weekdayIndex: number) => weekdayIndex === 0 || weekdayIndex === 6; // Sun=0, Sat=6

    // Night options
    const nightOptionKeys = rule.nightOptions;

    for (let idx = 0; idx < datesISO.length; idx++) {
      const isoDate = datesISO[idx];
      const weekdayIndex = this.localWeekdayIndexFromISO(isoDate); // 0..6

      // Start day with fixed morning
      const morningStart: ExerciseKey[] = ['brtResults', 'BBResults'];

      // After intense activities section (0 or 1)
      const after: ExerciseKey[] = [];
      if (afterRule === 'BRE') after.push('BREResults');
      if (afterRule === 'BRW') after.push('BRWResults');

      // Day sessions (1 or 2)
      const day: ExerciseKey[] = [];
      const usedToday = new Set<ExerciseKey>([...morningStart, ...after]);

      for (let slot = 0; slot < daySessionsPerDay; slot++) {
        const pick = this.pickDayExercise({
          band,
          dayOptionKeys,
          quotas,
          quotaBagRef: () => quotaBag,
          setQuotaBag: (b) => (quotaBag = b),
          weekDayCounts,
          usedToday,
          weekdayIndex,
          isLungsBlocked: isLungsBlockedDay(weekdayIndex),
          lastWeekUsed,
          isSingleDaySessionWeek,
        });

        if (pick) {
          day.push(pick);
          usedToday.add(pick);
          weekDayCounts[pick] = (weekDayCounts[pick] || 0) + 1;
        }
      }

      // Night (always 1), must not repeat within same day
      const nightPick = this.pickNightExercise(nightOptionKeys, usedToday, lastWeekUsed);
      const night: ExerciseKey[] = nightPick ? [nightPick] : [nightOptionKeys[0]];

      routineDays.push({
        isoDate,
        weekdayIndex,
        sections: { morningStart, day, after, night }
      });
    }

    const routine: WeeklyRoutine = {
      version: this.ROUTINE_VERSION,
      createdAtISO: new Date().toISOString(),
      timezone: tz,
      weekStartISO,
      weekEndISO,
      band,
      avgSeconds,
      daySessionCount: daySessionsPerDay,
      afterRule,
      days: routineDays,
      debug: {
        band,
        avgSeconds,
        ruleUsed: this.RULES[band],
        localTodayISO: this.localISODate(new Date()),
        notes: [
          'Morning start always: brtResults + BBResults',
          'Night always 1 exercise (no same-day repeats).',
          'After intense: none for -10/-15/-20 and -30; BRE for -25; BRW for -35/-40/40+',
          'Single day-session weeks: generic max 2x/week per exercise applies unless perWeek is specified.',
          'Two day-session weeks: repeats are allowed; perWeek quotas are enforced for specified exercises.',
          'LungsResults blocked on Sat/Sun when selected as a day-session exercise.',
        ],
      }
    };

    return routine;
  }

  private afterRuleForBand(band: Band): 'none' | 'BRE' | 'BRW' {
    // Your rule summary:
    // - No "after intense" for under 20 (-10/-15/-20)
    // - Under 30 add BRE (but that would include -25 and -30; you explicitly exclude under 20 and implied -30 gets none)
    // - Above 30 add BRW (-35/-40/40+)
    if (band === -25) return 'BRE';
    if (band === -35 || band === -40 || band === 40) return 'BRW';
    return 'none';
  }

  private buildDayQuotas(band: Band): Record<ExerciseKey, number> {
    const rule = this.RULES[band];
    const quotas: Record<ExerciseKey, number> = {} as any;

    rule.dayOptions.forEach(o => {
      if (o.perWeek && o.perWeek > 0) quotas[o.key] = o.perWeek;
    });

    return quotas;
  }

  private pickDayExercise(args: {
    band: Band;
    dayOptionKeys: ExerciseKey[];
    quotas: Record<ExerciseKey, number>;
    quotaBagRef: () => ExerciseKey[];
    setQuotaBag: (b: ExerciseKey[]) => void;
    weekDayCounts: Record<ExerciseKey, number>;
    usedToday: Set<ExerciseKey>;
    weekdayIndex: number;
    isLungsBlocked: boolean;
    lastWeekUsed: Set<ExerciseKey>;
    isSingleDaySessionWeek: boolean;
  }): ExerciseKey | null {
    const {
      dayOptionKeys,
      quotas,
      quotaBagRef,
      setQuotaBag,
      weekDayCounts,
      usedToday,
      isLungsBlocked,
      lastWeekUsed,
      isSingleDaySessionWeek,
    } = args;

    // Helper: can we use this key today?
    const canUseToday = (k: ExerciseKey): boolean => {
      if (usedToday.has(k)) return false;
      if (k === 'LungsResults' && isLungsBlocked) return false;
      return true;
    };

    // 1) Satisfy quota bag first (perWeek items)
    let bag = quotaBagRef();
    for (let i = 0; i < bag.length; i++) {
      const k = bag[i];
      if (!canUseToday(k)) continue;

      // For single-session weeks, do not exceed 2/week unless this key has explicit perWeek
      if (isSingleDaySessionWeek && !quotas[k]) {
        const count = weekDayCounts[k] || 0;
        if (count >= 2) continue;
      }

      // consume one instance from bag
      bag.splice(i, 1);
      setQuotaBag(bag);
      return k;
    }

    // 2) Otherwise pick from general pool with weighting:
    //    prefer not used last week (carry-over rule) when there are "more than 7 options".
    //    Also enforce max 2/week for single-session weeks (unless perWeek).
    const candidates = dayOptionKeys.filter(k => canUseToday(k));

    if (candidates.length === 0) return null;

    // If single-session week: apply max 2/week (unless perWeek exists)
    const cappedCandidates = isSingleDaySessionWeek
      ? candidates.filter(k => {
          if (quotas[k]) return true;
          const c = weekDayCounts[k] || 0;
          return c < 2;
        })
      : candidates;

    const finalCandidates = cappedCandidates.length > 0 ? cappedCandidates : candidates;

    const poolSize = dayOptionKeys.length;
    const useCarryOverBias = poolSize > 7;

    const weighted = finalCandidates.map(k => {
      const base = 1;
      const carryBonus = useCarryOverBias && !lastWeekUsed.has(k) ? 3 : 0;
      // slight preference for items used less this week
      const usedCount = weekDayCounts[k] || 0;
      const freshnessBonus = Math.max(0, 2 - usedCount);
      return { k, w: base + carryBonus + freshnessBonus };
    });

    return this.weightedPick(weighted);
  }

  private pickNightExercise(
    nightOptions: ExerciseKey[],
    usedToday: Set<ExerciseKey>,
    lastWeekUsed: Set<ExerciseKey>
  ): ExerciseKey | null {
    const candidates = nightOptions.filter(k => !usedToday.has(k));
    if (candidates.length === 0) return null;

    // Prefer not used last week (carry-over bias), but softer than day.
    const weighted = candidates.map(k => {
      const base = 1;
      const carryBonus = !lastWeekUsed.has(k) ? 2 : 0;
      return { k, w: base + carryBonus };
    });
    return this.weightedPick(weighted);
  }

  private dayPlanToSections(routine: WeeklyRoutine, isoDate: string): SectionVM[] {
    const day = routine.days.find(d => d.isoDate === isoDate);
    if (!day) return [];

    const dayHeading = day.sections.day.length > 1 ? this.sectionTitles.day2 : this.sectionTitles.day1;
    
    const sections: Array<{ key: SectionKey; heading: { en: string; pt: string }; keys: ExerciseKey[] }> = [
      { key: 'morningStart', heading: this.sectionTitles.morningStart, keys: day.sections.morningStart },
      { key: 'day', heading: dayHeading, keys: day.sections.day },
    ];

    if (day.sections.after.length > 0) {
      sections.push({ key: 'after', heading: this.sectionTitles.after, keys: day.sections.after });
    }

    sections.push({ key: 'night', heading: this.sectionTitles.night, keys: day.sections.night });

    return sections
      .map(s => ({
        heading: s.heading,
        cards: s.keys.map(k => ({ def: this.EX[k] }))
      }))
      .filter(s => s.cards.length > 0);
  }

  // =========================
  // BAND LOGIC
  // =========================
  private getRangeBand(seconds: number): Band {
    if (seconds < 10) return -10;
    if (seconds < 15) return -15;
    if (seconds < 20) return -20;
    if (seconds < 25) return -25;
    if (seconds < 30) return -30;
    if (seconds < 35) return -35;
    if (seconds < 40) return -40;
    return 40;
  }

  // =========================
  // DATE/TIME HELPERS (timezone-correct for user's device)
  // =========================
  private localISODate(d: Date): string {
    // Returns YYYY-MM-DD in user's local timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);

    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const da = parts.find(p => p.type === 'day')?.value;
    return `${y}-${m}-${da}`;
  }

  private localWeekdayIndexFromISO(isoDate: string): number {
    // Convert local ISO date to a Date at noon local time and get weekday.
    // (Noon avoids DST edge cases.)
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(y, (m - 1), d, 12, 0, 0, 0);
    return dt.getDay(); // 0..6 (Sun..Sat)
  }

  private getCurrentWeekWindowISO(): {
    weekStartISO: string;
    weekEndISO: string;
  };

  private getCurrentWeekWindowISO(includeDates: true): {
    weekStartISO: string;
    weekEndISO: string;
    datesISO: string[];
  };

  private getCurrentWeekWindowISO(includeDates?: boolean): {
    weekStartISO: string;
    weekEndISO: string;
    datesISO?: string[];
  } {
    const today = new Date();
    const todayISO = this.localISODate(today);
    const [y, m, d] = todayISO.split('-').map(Number);
    const localNoon = new Date(y, m - 1, d, 12, 0, 0, 0);

    // Monday-based week:
    // JS getDay(): Sun=0, Mon=1, ... Sat=6
    const dow = localNoon.getDay();
    const diffToMonday = dow === 0 ? -6 : 1 - dow;

    const monday = new Date(localNoon);
    monday.setDate(localNoon.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekStartISO = this.localISODate(monday);
    const weekEndISO = this.localISODate(sunday);

    if (!includeDates) return { weekStartISO, weekEndISO };

    const datesISO: string[] = [];
    const cursor = new Date(monday);
    for (let i = 0; i < 7; i++) {
      datesISO.push(this.localISODate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return { weekStartISO, weekEndISO, datesISO };
  }

  // =========================
  // RANDOM HELPERS
  // =========================
  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private weightedPick(items: Array<{ k: ExerciseKey; w: number }>): ExerciseKey {
    const total = items.reduce((s, it) => s + (it.w > 0 ? it.w : 0), 0);
    if (total <= 0) return items[0].k;

    let r = Math.random() * total;
    for (const it of items) {
      const w = it.w > 0 ? it.w : 0;
      r -= w;
      if (r <= 0) return it.k;
    }
    return items[items.length - 1].k;
  }

  // =========================
  // KEEP YOUR EXISTING UTILS
  // =========================
  private timeStringToSeconds(time: string): number {
    const cleaned = time.replace(/\s+/g, '');
    const [minutes, seconds] = cleaned.split(':').map(Number);
    return (minutes || 0) * 60 + (seconds || 0);
  }

  goBack(): void {
    this.navCtrl.back();
  }

  loadResults(): void {
    const exerciseKeys = [
      'brtResults',
      'HATResults',
      'HATCResults',
      'AHATResults',
      'WHResults',
      'KBResults',
      'BBResults',
      'YBResults',
      'BREResults',
      'BRWResults',
      'CTResults',
      'APResults',
      'UBResults',
      'BOXResults',
      'CBResults',
      'RBResults',
      'NBResults',
      'LungsResults',
      'YogaResults',
      'DBResults',
      'HUMResults',
    ];

    this.resultsByDate = {};

    exerciseKeys.forEach((key) => {
      const results = JSON.parse(localStorage.getItem(key) || '[]');
      results.forEach((result: { date: string; result: string; rounds?: number }) => {
        const resultDateUTC = new Date(result.date);

        const localDateString = resultDateUTC.toLocaleDateString('en-CA', {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });

        if (!this.resultsByDate[localDateString]) {
          this.resultsByDate[localDateString] = [];
        }
        this.resultsByDate[localDateString].push({ ...result, exerciseKey: key });
      });
    });
  }

  isExerciseDoneToday(key: string): boolean {
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const todays = this.resultsByDate[today] || [];

    if (key === 'LungsResults') {
      const freeId = this.isPortuguese ? 'OlV7sIjOrmOsKhm7d83W' : 'Lb9X1QkkDpNYEPIzw2Ga';

      return todays.some((r: any) => r.exerciseKey === 'LungsResults' && r.videoId === freeId);
    }

    // default behavior for all other exercises
    return todays.some((r: any) => r.exerciseKey === key);
  }
  private rebuildDropdownOptionsFromRoutine(routine: WeeklyRoutine, isoDate: string): void {
    // Build remove list from today's exercises (excluding BRT)
    const day = routine.days.find(d => d.isoDate === isoDate);
    const removeKeys = new Set<ExerciseKey>();

    if (day) {
      const allToday = [
        ...day.sections.morningStart,
        ...day.sections.day,
        ...day.sections.after,
        ...day.sections.night,
      ];

      allToday.forEach(k => {
        if (k !== 'brtResults') removeKeys.add(k);
      });
    }

    this.todayExerciseOptionsForRemove = Array.from(removeKeys).map(k => ({
      key: k,
      label: { en: this.EX[k].title.en, pt: this.EX[k].title.pt }
    }));

    // Build add list from ALL exercises in EX (excluding BRT),
    // but exclude anything already scheduled for today
    const alreadyToday = new Set<ExerciseKey>();
    if (day) {
      [
        ...day.sections.morningStart,
        ...day.sections.day,
        ...day.sections.after,
        ...day.sections.night,
      ].forEach(k => alreadyToday.add(k));
    }

    this.allExerciseOptionsForAdd = (Object.keys(this.EX) as ExerciseKey[])
      .filter(k => k !== 'brtResults')
      .filter(k => !alreadyToday.has(k)) // ✅ hide exercises already in today's plan
      .map(k => ({
        key: k,
        label: { en: this.EX[k].title.en, pt: this.EX[k].title.pt }
      }))
      .sort((a, b) => a.label.en.localeCompare(b.label.en));
  }
  onRemoveSelectionChange(): void {
    const key = this.removeSelection;
    if (!key) return;

    const iso = this.localISODate(new Date());
    const routine = this.getStoredRoutine();
    if (!routine) return;

    const updated = this.updateTodayRoutineRemove(routine, iso, key);
    this.saveRoutine(updated);

    this.hardRefresh();
  }

  onAddSelectionChange(): void {
    const key = this.addSelection;
    if (!key) return;
    if (key === 'brtResults') {
      this.addSelection = '';
      return;
    }

    this.pendingAddKey = key;
    this.showAddWhereAlert = true;
  }
  private confirmAddToSection(section: 'morningStart' | 'day' | 'after' | 'night'): void {
    const key = this.pendingAddKey;
    if (!key) return;

    const iso = this.localISODate(new Date());
    const routine = this.getStoredRoutine();
    if (!routine) return;

    const updated = this.updateTodayRoutineAddToSection(routine, iso, key, section);
    this.saveRoutine(updated);

    this.showAddWhereAlert = false;
    this.pendingAddKey = null;
    this.hardRefresh();
  }
  // Remove an exercise from today (from day/after/night; also allow removing BB if selected)
  private updateTodayRoutineRemove(routine: WeeklyRoutine, isoDate: string, removeKey: ExerciseKey): WeeklyRoutine {
    const copy: WeeklyRoutine = JSON.parse(JSON.stringify(routine));
    const day = copy.days.find(d => d.isoDate === isoDate);
    if (!day) return copy;
    if (day.userExcludedNight) {
      // ensure night stays empty unless YOU later add a separate UX to restore it
      day.sections.night = [];
    }

    if (removeKey === 'brtResults') return copy;

    const nightHadIt = day.sections.night.includes(removeKey);

    day.sections.morningStart = day.sections.morningStart.filter(k => k !== removeKey);
    day.sections.day = day.sections.day.filter(k => k !== removeKey);
    day.sections.after = day.sections.after.filter(k => k !== removeKey);
    day.sections.night = day.sections.night.filter(k => k !== removeKey);

    if (!day.sections.morningStart.includes('brtResults')) {
      day.sections.morningStart.unshift('brtResults');
    }

    // If user removed something from night, mark override and DO NOT refill night for that day
    if (nightHadIt) {
      day.userExcludedNight = true;
      return copy;
    }

    // Otherwise keep the rule: ensure night always has 1
    if (day.sections.night.length === 0 && !day.userExcludedNight) {
      const bandRule = this.RULES[copy.band];
      const usedToday = new Set<ExerciseKey>([
        ...day.sections.morningStart,
        ...day.sections.day,
        ...day.sections.after,
      ]);
      const nightPick = this.pickNightExercise(bandRule.nightOptions, usedToday, this.getLastWeekUsedExercises());
      day.sections.night = [nightPick ?? bandRule.nightOptions[0]];
    }

    return copy;
  }

  private updateTodayRoutineAdd(routine: WeeklyRoutine, isoDate: string, addKey: ExerciseKey): WeeklyRoutine {
    const copy: WeeklyRoutine = JSON.parse(JSON.stringify(routine));
    const day = copy.days.find(d => d.isoDate === isoDate);
    if (!day) return copy;

    // Never add BRT
    if (addKey === 'brtResults') return copy;

    // If user explicitly excluded night today, keep it excluded
    if (day.userExcludedNight) {
      day.sections.night = [];
    }

    // Disallow duplicates across the whole day
    const usedToday = new Set<ExerciseKey>([
      ...day.sections.morningStart,
      ...day.sections.day,
      ...day.sections.after,
      ...day.sections.night,
    ]);
    if (usedToday.has(addKey)) return copy;

    // ✅ User override: allow ANY exercise on ANY day (including Lungs on Sat/Sun)
    // Always append to Day sessions (ignore the 1-or-2 rule for user-added items)
    day.sections.day.push(addKey);

    return copy;
  }
  private hardRefresh(): void {
    // simplest “reset everything” approach
    window.location.reload();
  }
  goTo(def: ExerciseDef): void {
    const url =
      typeof def.route === 'string'
        ? def.route
        : (this.isPortuguese ? def.route.pt : def.route.en);

    // ✅ this correctly preserves query string
    this.router.navigateByUrl(url);
  }
  private updateTodayRoutineAddToSection(
    routine: WeeklyRoutine,
    isoDate: string,
    addKey: ExerciseKey,
    section: 'morningStart' | 'day' | 'after' | 'night'
  ): WeeklyRoutine {
    const copy: WeeklyRoutine = JSON.parse(JSON.stringify(routine));
    const day = copy.days.find(d => d.isoDate === isoDate);
    if (!day) return copy;

    if (addKey === 'brtResults') return copy;

    // If user excluded night earlier, adding to night should re-enable it.
    // Adding to other sections should keep night excluded if it's currently excluded.
    if (section === 'night') {
      day.userExcludedNight = false;
    } else if (day.userExcludedNight) {
      day.sections.night = [];
    }

    // Prevent duplicates across the whole day (keep your "no repeats in a day" rule)
    const usedToday = new Set<ExerciseKey>([
      ...day.sections.morningStart,
      ...day.sections.day,
      ...day.sections.after,
      ...day.sections.night,
    ]);
    if (usedToday.has(addKey)) return copy;

    // Defensive init
    day.sections.morningStart = day.sections.morningStart || [];
    day.sections.day = day.sections.day || [];
    day.sections.after = day.sections.after || [];
    day.sections.night = day.sections.night || [];

    if (section === 'morningStart') {
      // Keep BRT present and first
      if (!day.sections.morningStart.includes('brtResults')) {
        day.sections.morningStart.unshift('brtResults');
      }

      const brtIndex = day.sections.morningStart.indexOf('brtResults');
      if (brtIndex >= 0) {
        day.sections.morningStart.splice(brtIndex + 1, 0, addKey);
      } else {
        day.sections.morningStart.push(addKey);
      }
      return copy;
    }

    if (section === 'day') {
      // Always append; no limit for user overrides
      day.sections.day.push(addKey);
      return copy;
    }

    if (section === 'after') {
      // ✅ Allow adding even if afterRule === 'none' (user override)
      // ✅ Allow multiple items (overwrites "only 1" default behavior)
      day.sections.after.push(addKey);
      return copy;
    }

    if (section === 'night') {
      // ✅ Allow multiple night items (overwrite "only 1" default behavior)
      day.sections.night.push(addKey);
      return copy;
    }

    return copy;
  }
}