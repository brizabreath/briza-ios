import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { ShepherdService } from 'angular-shepherd';
import { AlertController } from '@ionic/angular';

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
  | 'TIMERResults'
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
  isoDate: string;
  weekdayIndex: number;
  sections: {
    morningStart: ExerciseKey[];
    day: ExerciseKey[];
    after: ExerciseKey[];
    night: ExerciseKey[];
  };
  userExcludedNight?: boolean;
}

interface WeeklyRoutine {
  version: number;
  createdAtISO: string;
  timezone: string;
  weekStartISO: string;
  weekEndISO: string;
  band: Band;
  avgSeconds: number;
  daySessionCount: 1 | 2;
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
  @ViewChild('questionP') questionP!: ElementRef<HTMLAnchorElement>;

  pendingAddKey: ExerciseKey | null = null;
  showAddWhereAlert = false;

  get addWhereAlertButtons() {
    const t = (en: string, pt: string) => (this.isPortuguese ? pt : en);
    return [
      { text: t('Cancel', 'Cancelar'), role: 'cancel' },
      { text: t('Morning start', 'Ao acordar'), handler: () => this.confirmAddToSection('morningStart') },
      { text: t('Day session(s)', 'Sessão do dia'), handler: () => this.confirmAddToSection('day') },
      { text: t('After intense activities', 'Depois de atividades intensas'), handler: () => this.confirmAddToSection('after') },
      { text: t('Evening wind down', 'Antes de dormir'), handler: () => this.confirmAddToSection('night') },
    ];
  }

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  resultsByDate: { [date: string]: any[] } = {};
  todayProgram: SectionVM[] = [];

  private readonly ROUTINE_LS_KEY = 'brizaWeeklyRoutineV1';
  private readonly ROUTINE_HISTORY_LS_KEY = 'brizaWeeklyRoutineHistoryV1';
  private readonly ROUTINE_VERSION = 1;

  removeSelection: '' | ExerciseKey = '';
  addSelection: '' | ExerciseKey = '';
  todayExerciseOptionsForRemove: Array<{ key: ExerciseKey; label: { en: string; pt: string } }> = [];
  allExerciseOptionsForAdd: Array<{ key: ExerciseKey; label: { en: string; pt: string } }> = [];
  selectedISO: string = '';
  readonly MAX_FUTURE_DAYS = 1;
  navCanGoBack = false;
  navCanGoForward = false;
  constructor(
    private navCtrl: NavController,
    public globalService: GlobalService,
    private shepherd: ShepherdService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}
  private updateNavState(): void {
    const history = this.getRoutineHistory();
    const current = this.getStoredRoutine();

    if (history.length === 0 || !current) {
      this.navCanGoBack = false;
    } else {
      // Check the day before selectedISO actually exists in a routine
      const [y, m, d] = this.selectedISO.split('-').map(Number);
      const prev = new Date(y, m - 1, d, 12);
      prev.setDate(prev.getDate() - 1);
      const prevISO = this.localISODate(prev);
      const prevRoutine = this.findRoutineForDate(prevISO, current);
      this.navCanGoBack = !!prevRoutine && !!prevRoutine.days.find(day => day.isoDate === prevISO);
    }

    this.navCanGoForward = this.selectedDayOffset < this.MAX_FUTURE_DAYS;
  }
  loadResults(): void {
    const exerciseKeys = [
      'brtResults', 'HATResults', 'HATCResults', 'AHATResults', 'WHResults',
      'KBResults', 'BBResults', 'YBResults', 'BREResults', 'BRWResults',
      'CTResults', 'APResults', 'UBResults', 'BOXResults', 'CBResults',
      'RBResults', 'NBResults', 'LungsResults', 'YogaResults', 'DBResults',
      'HUMResults', 'BMResults', 'MobilityResults', 'SeriesResults', 'TIMERResults'
    ];

    this.resultsByDate = {};

    exerciseKeys.forEach((key) => {
      const results = JSON.parse(localStorage.getItem(key) || '[]');
      results.forEach((result: { date: string; result: string; rounds?: number }) => {
        const resultDateUTC = new Date(result.date);
        const localDateString = resultDateUTC.toLocaleDateString('en-CA', {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          year: 'numeric', month: '2-digit', day: '2-digit'
        });
        if (!this.resultsByDate[localDateString]) {
          this.resultsByDate[localDateString] = [];
        }
        this.resultsByDate[localDateString].push({ ...result, exerciseKey: key });
      });
    });
  }

  onAddWhereAlertDismiss(): void {
    this.showAddWhereAlert = false;
    this.pendingAddKey = null;
    this.addSelection = '';
  }

  ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.selectedISO = this.localISODate(new Date());
    this.populateProgramContent();
  }

  ionViewDidEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    // The onboarding tour triggered from BRT — keep this path exactly as before
    const shouldStartOnboarding = localStorage.getItem('startProgTour') === 'true';
    if (shouldStartOnboarding) {
      localStorage.removeItem('startProgTour');
      localStorage.setItem('program_guide_seen', 'true');
      this.startProgramGuide();
      return;
    }

    // First-time program guide — only fires if onboarding tour is NOT running
    if (!localStorage.getItem('program_guide_seen')) {
      localStorage.setItem('program_guide_seen', 'true');
      this.startProgramGuide();
    }
  }

  ionViewDidLeave() {
    this.unlockUIForTour();
  }

  ngAfterViewInit() {
    // question button wired via (click)="startProgramGuide()" in template — no modal setup needed
  }

  // =========================
  // LOCK / UNLOCK UI
  // =========================
  private lockUIForTour = () => {
    document.documentElement.classList.add('tour-active');
    document.body.style.overflow = 'hidden';
  };

  private unlockUIForTour = () => {
    document.documentElement.classList.remove('tour-active');
    document.body.style.overflow = '';
  };

  // =========================
  // PROGRAM INFO GUIDE (question button + first-visit auto-open)
  // =========================
  startProgramGuide() {
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

      // 1 - What is the program (centered)
      steps.push({
        id: 'prog-intro',
        text: `<h3>${t('The Briza Program', 'O Programa Briza')}</h3>
               <p>${t(
                 'The Briza Program is a personalised collection of breathing and breath-holding exercises designed to improve your breathing efficiency — especially during intense workouts. It adapts week by week based on your Briza Retention Test results.',
                 'O Programa Briza é uma coleção personalizada de exercícios de respiração e retenção projetados para melhorar sua eficiência respiratória — especialmente durante treinos intensos. Ele se adapta semana a semana com base nos seus resultados do Teste de Retenção Briza.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Nasal breathing (centered)
      steps.push({
        id: 'prog-nasal',
        text: `<h3>${t('Breathe through your nose', 'Respire pelo nariz')}</h3>
               <p>${t(
                 'For optimal results, always breathe through your nose and use your diaphragm. Nasal breathing filters, warms, and humidifies the air, increases oxygen uptake, enhances lung function, boosts nitric oxide production, and reduces stress and anxiety.',
                 'Para resultados ideais, respire sempre pelo nariz e use o diafragma. A respiração nasal filtra, aquece e umidifica o ar, aumenta a captação de oxigênio, melhora a função pulmonar, aumenta a produção de óxido nítrico e reduz o estresse e a ansiedade.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });
      // 6 - Blocked nose tip (centered)
      steps.push({
        id: 'mouth-tape',
        text: `<h3>${t('During sleep', 'Durante o sono')}</h3>
               <p>${t(
                 'Consider taping your mouth during sleep to train nasal breathing overnight.',
                 'Considere colocar uma fita na boca enquanto dorme para treinar a respiração nasal durante a noite.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });
      // 6 - Blocked nose tip (centered)
      steps.push({
        id: 'prog-nose',
        text: `<h3>${t('Blocked nose?', 'Nariz bloqueado?')}</h3>
               <p>${t(
                 'If your nose is blocked, try this: fully exhale and pinch your nose, then nod your head quickly while holding your breath. When you feel the urge to breathe, inhale gently. Repeat 4 to 6 times to clear it.',
                 'Se o seu nariz estiver bloqueado, tente isso: expire completamente e aperte o nariz, depois balance a cabeça rapidamente enquanto segura a respiração. Quando sentir vontade de respirar, inspire suavemente. Repita de 4 a 6 vezes para desbloqueá-lo.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });
      // 3 - Diaphragm (centered)
      steps.push({
        id: 'prog-diaphragm',
        text: `<h3>${t('Use your diaphragm', 'Use o diafragma')}</h3>
               <p>${t(
                 'The diaphragm is a dome-shaped muscle at the base of your lungs. To use it correctly: place one hand on your belly and press gently — when you breathe in, your belly should push against your hand. Your shoulders should stay still. Breathe so that your belly and ribcage expand, not your chest.',
                 'O diafragma é um músculo em forma de cúpula na base dos pulmões. Para usá-lo corretamente: coloque uma mão na barriga e pressione suavemente — ao inspirar, a barriga deve empurrar sua mão. Os ombros devem ficar imóveis. Respire de forma que a barriga e a caixa torácica expandam, não o peito.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });
      // 7 - Benefits (centered)
      steps.push({
        id: 'prog-benefits',
        text: `<h3>${t('Program benefits', 'Benefícios do programa')}</h3>
               <p>${t(
                 'With consistent practice you can expect: easier and more efficient breathing, improved cardiovascular health and stamina, increased energy throughout the day, sharper focus and mindfulness, accelerated recovery, deeper sleep, and better oxygen supply to your organs and muscles.',
                 'Com prática consistente você pode esperar: respiração mais fácil e eficiente, melhor saúde cardiovascular e resistência, mais energia ao longo do dia, foco e atenção mais aguçados, recuperação acelerada, sono mais profundo e melhor fornecimento de oxigênio para órgãos e músculos.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });
      // 4 - Morning start (centered)
      steps.push({
        id: 'prog-morning',
        text: `<h3>${t('Morning start', 'Ao acordar')}</h3>
               <p>${t(
                 'Every day begins with the same foundation: the Briza Retention Test, Briza Breathing, and Meditation. These three exercises are the core of the program and should be done consistently each morning.',
                 'Todo dia começa com a mesma base: o Teste de Retenção Briza, a Respiração Briza e Meditação. Esses três exercícios são o núcleo do programa e devem ser feitos consistentemente toda manhã.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Routine adapts (centered)
      steps.push({
        id: 'prog-routine',
        text: `<h3>${t('Your routine adapts', 'Sua rotina se adapta')}</h3>
               <p>${t(
                 'The rest of your daily routine changes every day and becomes more challenging as your retention test results improve. Your progress is tracked through the Briza Retention Test — with consistent practice, it is possible to exceed 40 seconds in just a few months.',
                 'O restante da sua rotina diária muda todos os dias e se torna mais desafiadora conforme seus resultados do teste de retenção melhoram. Seu progresso é medido pelo Teste de Retenção Briza — com prática consistente, é possível ultrapassar 40 segundos em poucos meses.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      steps.push({
          id: 'brt-finish5',
          text: `
            <div class="briza-tour-finish">
            <h2>${t('Briza Retention Test','Teste de Retenção Briza')}</h2>
            <p>${t(
              'Would you like to measure your retention now?',
              'Você gostaria de medir sua retenção agora?'
            )}</p>
          </div>
        `,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          {
            text: t('Next','Próximo'),
            action: () => {
              this.shepherd.complete();
              localStorage.setItem('startBRTTour','true');
              this.router.navigateByUrl('/brt');
            }
          }
        ]
        }
      );
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

  // =========================
  // ONBOARDING TOUR (triggered from BRT via startProgTour flag — unchanged)
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


  // =========================
  // HEADERS
  // =========================
  private sectionTitles = {
    morningStart: { en: 'Morning start', pt: 'Ao acordar' },
    day1: { en: 'Day session', pt: 'Sessão do dia' },
    day2: { en: 'Day sessions', pt: 'Sessões do dia' },
    after: { en: 'After intense activities', pt: 'Depois de atividades intensas' },
    night: { en: 'Evening wind down', pt: 'Antes de dormir' },
  };

  // =========================
  // ICONS
  // =========================
  private ICON = {
    retention: 'assets/images/brizaretention.png',
    briza: 'assets/images/brizabreathing.png',
    recovery: 'assets/images/breathrecovery.png',
    co2: 'assets/images/ctt.png',
    apnea: 'assets/images/apnea.png',
    altitude: 'assets/images/highaltitude.png',
    hum: 'assets/images/bee.png',
    hyper: 'assets/images/hyperventilation.png',
    wh: 'assets/images/oxboost.png',
    lungs: 'assets/images/lungexpansion.png',
    performance: 'assets/images/performanceIcon.png',
    yogic: 'assets/images/yogicbreathing.png',
    nadi: 'assets/images/nb.png',
    coherent: 'assets/images/vitality.png',
    double: 'assets/images/reset.png',
    box: 'assets/images/box.png',
    reset: 'assets/images/db.png',
    ub: 'assets/images/ub.png',
    meditation: 'assets/images/timer2.png'
  };

  // =========================
  // EXERCISE DEFINITIONS
  // =========================
  private EX: Record<ExerciseKey, ExerciseDef> = {
    brtResults: {
      key: 'brtResults', route: '/brt',
      title: { en: 'Briza Retention Test', pt: 'Teste de Retenção Briza' },
      duration: { en: 'Duration: ~ 1 min', pt: 'Duração: ~ 1 min' },
      icon: this.ICON.retention, checkboxClass: 'BRT',
    },
    BBResults: {
      key: 'BBResults', route: '/bb',
      title: { en: 'Briza Breathing', pt: 'Respiração Briza' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.briza, checkboxClass: 'BB',
    },
    YBResults: {
      key: 'YBResults', route: '/yogic',
      title: { en: 'Dirga', pt: 'Dirga' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.yogic, checkboxClass: 'YB',
    },
    NBResults: {
      key: 'NBResults', route: '/nb',
      title: { en: 'Nadi Shodhana', pt: 'Nadi Shodhana' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.nadi, checkboxClass: 'NB',
    },
    HUMResults: {
      key: 'HUMResults', route: '/hum',
      title: { en: 'Bhramari', pt: 'Bhramari' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.hum, checkboxClass: 'HUM',
    },
    DBResults: {
      key: 'DBResults', route: '/db',
      title: { en: 'Reset Breathing', pt: 'Respiração Reset' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.double, checkboxClass: 'DB',
    },
    BOXResults: {
      key: 'BOXResults', route: '/box',
      title: { en: 'Sama Vritti', pt: 'Sama Vritti' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.box, checkboxClass: 'BOX',
    },
    RBResults: {
      key: 'RBResults', route: '/rb',
      title: { en: '4-7-8', pt: '4-7-8' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.reset, checkboxClass: 'RB',
    },
    CBResults: {
      key: 'CBResults', route: '/cb',
      title: { en: 'Coherent Breathing', pt: 'Respiração Coerente' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.coherent, checkboxClass: 'CB',
    },
    BREResults: {
      key: 'BREResults', route: '/bre',
      title: { en: 'Breath Recovery', pt: 'Recuperando o Fôlego' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.recovery, checkboxClass: 'BRE',
    },
    BRWResults: {
      key: 'BRWResults', route: '/brw',
      title: { en: 'Walking Recovery', pt: 'Recuperando Andando' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.performance, checkboxClass: 'BRW',
    },
    LungsResults: {
      key: 'LungsResults',
      route: { en: '/lungs?open=Lb9X1QkkDpNYEPIzw2Ga', pt: '/lungs?open=OlV7sIjOrmOsKhm7d83W' },
      title: { en: 'Lungs Expansion', pt: 'Expansão Pulmonar' },
      duration: { en: 'Duration: ~ 12 min', pt: 'Duração: ~ 12 min' },
      icon: this.ICON.lungs, checkboxClass: 'Lungs',
    },
    UBResults: {
      key: 'UBResults', route: '/ub',
      title: { en: 'Ujjayi', pt: 'Ujjayi' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.ub, checkboxClass: 'UB',
    },
    CTResults: {
      key: 'CTResults', route: '/ct',
      title: { en: 'CO₂ Tolerance', pt: 'Tolerância ao CO₂' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.co2, checkboxClass: 'CT',
    },
    HATResults: {
      key: 'HATResults', route: '/hat',
      title: { en: 'Altitude Training', pt: 'Treinamento de Altitude' },
      duration: { en: 'Duration: 4 - 10 rounds', pt: 'Duração: 4 - 10 rounds' },
      icon: this.ICON.altitude, checkboxClass: 'HAT',
    },
    HATCResults: {
      key: 'HATCResults', route: '/hatc',
      title: { en: 'Altitude (Running)', pt: 'Altitude (Correndo)' },
      duration: { en: 'Duration: 4 - 10 rounds', pt: 'Duração: 4 - 10 rounds' },
      icon: this.ICON.altitude, checkboxClass: 'HATC',
    },
    AHATResults: {
      key: 'AHATResults', route: '/ahat',
      title: { en: 'Altitude Pro', pt: 'Altitude Pro' },
      duration: { en: 'Duration: 4 - 10 rounds', pt: 'Duração: 4 - 10 rounds' },
      icon: this.ICON.altitude, checkboxClass: 'AHAT',
    },
    WHResults: {
      key: 'WHResults', route: '/wh',
      title: { en: 'Oxygen Boost', pt: 'Boost de Oxigênio' },
      duration: { en: 'Duration: 3 - 6 round', pt: 'Duração: 3 - 6 rounds' },
      icon: this.ICON.wh, checkboxClass: 'WH',
    },
    APResults: {
      key: 'APResults', route: '/ap',
      title: { en: 'Apnea Training', pt: 'Treinamento de Apneia' },
      duration: { en: 'Duration: 5 - 10 min', pt: 'Duração: 5 - 10 min' },
      icon: this.ICON.apnea, checkboxClass: 'AP',
    },
    KBResults: {
      key: 'KBResults', route: '/kb',
      title: { en: 'Kapalabhati', pt: 'Kapalabhati' },
      duration: { en: 'Duration: 3 - 6 round', pt: 'Duração: 3 - 6 round' },
      icon: this.ICON.hyper, checkboxClass: 'KB',
    },
    TIMERResults: {
      key: 'TIMERResults', route: '/timer',
      title: { en: 'Meditation', pt: 'Meditação' },
      duration: { en: 'Duration: 5 - 20 min', pt: 'Duração: 5 - 20 min' },
      icon: this.ICON.meditation, checkboxClass: 'MED',
    },
  };

  // =========================
  // RULES
  // =========================
  private RULES: Record<Band, {
    daySessionsPerDay: 1 | 2;
    dayOptions: Array<{ key: ExerciseKey; perWeek?: number; notes?: string }>;
    nightOptions: ExerciseKey[];
  }> = {
    [-10]: {
      daySessionsPerDay: 1,
      dayOptions: [
        { key: 'YBResults' }, { key: 'UBResults' }, { key: 'BOXResults' }, { key: 'NBResults' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'HUMResults'],
    },
    [-15]: {
      daySessionsPerDay: 1,
      dayOptions: [
        { key: 'YBResults' }, { key: 'BREResults' }, { key: 'UBResults' },
        { key: 'BOXResults' }, { key: 'NBResults' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'HUMResults'],
    },
    [-20]: {
      daySessionsPerDay: 1,
      dayOptions: [
        { key: 'BRWResults' }, { key: 'HATResults', perWeek: 2 },
        { key: 'WHResults' }, { key: 'HUMResults' }, { key: 'NBResults' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'UBResults', 'BOXResults', 'YBResults'],
    },
    [-25]: {
      daySessionsPerDay: 1,
      dayOptions: [
        { key: 'HATResults', perWeek: 2 }, { key: 'WHResults' }, { key: 'KBResults' },
        { key: 'CTResults' }, { key: 'APResults' }, { key: 'LungsResults' },
      ],
      nightOptions: ['CBResults', 'NBResults', 'YBResults', 'UBResults', 'BOXResults', 'HUMResults'],
    },
    [-30]: {
      daySessionsPerDay: 2,
      dayOptions: [
        { key: 'HATResults', perWeek: 3 }, { key: 'WHResults', perWeek: 3 },
        { key: 'KBResults', perWeek: 2 }, { key: 'CTResults', perWeek: 2 },
        { key: 'APResults', perWeek: 2 }, { key: 'LungsResults', perWeek: 2 },
      ],
      nightOptions: ['CBResults', 'NBResults', 'YBResults', 'UBResults', 'BOXResults', 'HUMResults'],
    },
    [-35]: {
      daySessionsPerDay: 2,
      dayOptions: [
        { key: 'HATResults', perWeek: 2 }, { key: 'HATCResults', perWeek: 3 },
        { key: 'WHResults', perWeek: 3 }, { key: 'KBResults', perWeek: 2 },
        { key: 'CTResults', perWeek: 2 }, { key: 'LungsResults', perWeek: 2 },
      ],
      nightOptions: ['CBResults', 'NBResults', 'YBResults', 'UBResults', 'BOXResults', 'HUMResults'],
    },
    [-40]: {
      daySessionsPerDay: 2,
      dayOptions: [
        { key: 'HATCResults', perWeek: 3 }, { key: 'AHATResults', perWeek: 3 },
        { key: 'WHResults', perWeek: 3 }, { key: 'KBResults', perWeek: 2 },
        { key: 'CTResults', perWeek: 1 }, { key: 'LungsResults', perWeek: 2 },
      ],
      nightOptions: ['CBResults', 'NBResults', 'YBResults', 'UBResults', 'BOXResults', 'HUMResults'],
    },
    [40]: {
      daySessionsPerDay: 2,
      dayOptions: [
        { key: 'HATCResults', perWeek: 4 }, { key: 'AHATResults', perWeek: 2 },
        { key: 'WHResults', perWeek: 3 }, { key: 'KBResults', perWeek: 2 },
        { key: 'CTResults', perWeek: 1 }, { key: 'LungsResults', perWeek: 2 },
      ],
      nightOptions: ['CBResults', 'NBResults', 'YBResults', 'UBResults', 'BOXResults', 'HUMResults'],
    },
  };

  // =========================
  // MAIN ENTRY
  // =========================
  populateProgramContent(targetISO?: string): void {
    this.loadResults();
    let avgSeconds = 0;
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.todayProgram = [];

    if (targetISO) {
      this.selectedISO = targetISO;
    } else {
      this.selectedISO = this.localISODate(new Date());
    }

    const storedResults = localStorage.getItem('brtResults');
    const brtResults = storedResults ? JSON.parse(storedResults) : [];
    avgSeconds = brtResults.length === 0 ? 15 : this.computeAvgSeconds(brtResults);

    const band = this.getRangeBand(avgSeconds);
    const currentRoutine = this.ensureWeeklyRoutine(band, avgSeconds);

    // Find which routine owns the selected date
    const routine = this.findRoutineForDate(this.selectedISO, currentRoutine);

    if (!routine || !routine.days.find(d => d.isoDate === this.selectedISO)) {
      // Date not found in any stored routine — show empty
      this.todayProgram = [];
      this.todayExerciseOptionsForRemove = [];
      this.allExerciseOptionsForAdd = [];
    } else {
      this.todayProgram = this.dayPlanToSections(routine, this.selectedISO);
      this.rebuildDropdownOptionsFromRoutine(routine, this.selectedISO);
    }
    this.removeSelection = '';
    this.addSelection = '';
    this.updateNavState();
  }
  private saveRoutineForDate(isoDate: string, updated: WeeklyRoutine): void {
    const current = this.getStoredRoutine();
    if (current && isoDate >= current.weekStartISO && isoDate <= current.weekEndISO) {
      this.saveRoutine(updated);
      return;
    }
    // Save back into history
    const history = this.getRoutineHistory();
    const idx = history.findIndex(r => isoDate >= r.weekStartISO && isoDate <= r.weekEndISO);
    if (idx >= 0) {
      history[idx] = updated;
      localStorage.setItem(this.ROUTINE_HISTORY_LS_KEY, JSON.stringify(history, null, 2));
    }
  }
  private findRoutineForDate(isoDate: string, currentRoutine: WeeklyRoutine): WeeklyRoutine | null {
    // Check current routine first
    if (isoDate >= currentRoutine.weekStartISO && isoDate <= currentRoutine.weekEndISO) {
      return currentRoutine;
    }
    // Search history
    const history = this.getRoutineHistory();
    for (const r of history) {
      if (isoDate >= r.weekStartISO && isoDate <= r.weekEndISO) {
        return r;
      }
    }
    return null;
  }
  get selectedDayOffset(): number {
    const todayISO = this.localISODate(new Date());
    const [ty, tm, td] = todayISO.split('-').map(Number);
    const [sy, sm, sd] = this.selectedISO.split('-').map(Number);
    const t = new Date(ty, tm - 1, td, 12);
    const s = new Date(sy, sm - 1, sd, 12);
    return Math.round((s.getTime() - t.getTime()) / 86400000);
  }
  get canGoBack(): boolean {
    const history = this.getRoutineHistory();
    if (history.length === 0) return false;
    // Check if there's actually a routine that contains at least one day before selectedISO
    const current = this.getStoredRoutine();
    const allRoutines = [current, ...history].filter(Boolean) as WeeklyRoutine[];
    const earliest = this.earliestAvailableISO;
    return this.selectedISO > earliest;
  }
  get earliestAvailableISO(): string {
    const current = this.getStoredRoutine();
    const history = this.getRoutineHistory();
    const allRoutines = [current, ...history].filter(Boolean) as WeeklyRoutine[];
    if (allRoutines.length <= 1) return current?.weekStartISO ?? this.localISODate(new Date());
    const oldest = allRoutines[Math.min(allRoutines.length - 1, 2)];
    return oldest.weekStartISO;
  }
  private getRoutineHistory(): WeeklyRoutine[] {
    try {
      const raw = localStorage.getItem(this.ROUTINE_HISTORY_LS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  get canGoForward(): boolean {
    return this.selectedDayOffset < this.MAX_FUTURE_DAYS;
  }

  get selectedDayLabel(): string {
    const off = this.selectedDayOffset;
    const isPT = this.isPortuguese;
    if (off === 0) return isPT ? 'Hoje' : 'Today';
    if (off === -1) return isPT ? 'Ontem' : 'Yesterday';
    if (off === 1) return isPT ? 'Amanhã' : 'Tomorrow';
    if (off < 0) return isPT ? `Há ${Math.abs(off)} dias` : `${Math.abs(off)} days ago`;
    return isPT ? `Em ${off} dias` : `In ${off} days`;
  }

  get selectedDateFormatted(): string {
    const [y, m, d] = this.selectedISO.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12);
    return dt.toLocaleDateString(this.isPortuguese ? 'pt-BR' : 'en-AU', {
      weekday: 'long', day: 'numeric', month: 'short'
    });
  }

  prevDay(): void {
    if (!this.canGoBack) return;
    const [y, m, d] = this.selectedISO.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12);
    dt.setDate(dt.getDate() - 1);
    const candidate = this.localISODate(dt);

    // Skip days that don't belong to any stored routine
    const current = this.getStoredRoutine();
    if (!current) return;
    const routine = this.findRoutineForDate(candidate, current);
    if (!routine || !routine.days.find(d => d.isoDate === candidate)) {
      // Jump to the end of the nearest previous routine instead
      const history = this.getRoutineHistory();
      const allRoutines = [current, ...history].filter(Boolean) as WeeklyRoutine[];
      const prevRoutine = allRoutines.find(r => r.weekEndISO < this.selectedISO);
      if (prevRoutine) {
        this.populateProgramContent(prevRoutine.weekEndISO);
      }
      return;
    }

    this.populateProgramContent(candidate);
  }

  nextDay(): void {
    if (!this.canGoForward) return;
    const [y, m, d] = this.selectedISO.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12);
    dt.setDate(dt.getDate() + 1);
    this.populateProgramContent(this.localISODate(dt));
  }
  private computeAvgSeconds(brtResults: any[]): number {
    const n = brtResults.length;
    if (n === 1) return this.timeStringToSeconds(brtResults[0].result);
    const last = brtResults.slice(-7);
    const totalSeconds = last.reduce((sum: number, entry: any) => sum + this.timeStringToSeconds(entry.result), 0);
    return totalSeconds / last.length;
  }

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
    } catch { return null; }
  }

  private saveRoutine(r: WeeklyRoutine): void {
    localStorage.setItem(this.ROUTINE_LS_KEY, JSON.stringify(r, null, 2));
  }

  private appendHistoryUsedExercises(r: WeeklyRoutine): void {
    const prevRaw = localStorage.getItem(this.ROUTINE_HISTORY_LS_KEY);
    const prev = prevRaw ? JSON.parse(prevRaw) : [];
    // Store the full routine in history, not just used exercises
    const next = [r, ...prev].slice(0, 4); // keep last 4 weeks
    localStorage.setItem(this.ROUTINE_HISTORY_LS_KEY, JSON.stringify(next, null, 2));
  }

  private getLastWeekUsedExercises(): Set<ExerciseKey> {
    try {
      const raw = localStorage.getItem(this.ROUTINE_HISTORY_LS_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      const last = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
      if (!last?.days) return new Set();
      const used = new Set<ExerciseKey>();
      last.days.forEach((d: DayPlan) => {
        Object.values(d.sections).forEach((keys: ExerciseKey[]) => keys.forEach(k => used.add(k)));
      });
      return used;
    } catch { return new Set(); }
  }

  private createWeeklyRoutine(band: Band, avgSeconds: number): WeeklyRoutine {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { weekStartISO, weekEndISO, datesISO } = this.getCurrentWeekWindowISO(true);
    const rule = this.RULES[band];
    const daySessionsPerDay = rule.daySessionsPerDay;
    const afterRule = this.afterRuleForBand(band);
    const lastWeekUsed = this.getLastWeekUsedExercises();
    const quotas = this.buildDayQuotas(band);
    const routineDays: DayPlan[] = [];
    const weekDayCounts: Record<ExerciseKey, number> = {} as any;

    let quotaBag: ExerciseKey[] = [];
    Object.entries(quotas).forEach(([k, n]) => {
      for (let i = 0; i < n; i++) quotaBag.push(k as ExerciseKey);
    });
    quotaBag = this.shuffle(quotaBag);

    const dayOptionKeys = rule.dayOptions.map(o => o.key);
    const isSingleDaySessionWeek = daySessionsPerDay === 1;
    const isLungsBlockedDay = (weekdayIndex: number) => weekdayIndex === 0 || weekdayIndex === 6;
    const nightOptionKeys = rule.nightOptions;

    for (let idx = 0; idx < datesISO.length; idx++) {
      const isoDate = datesISO[idx];
      const weekdayIndex = this.localWeekdayIndexFromISO(isoDate);
      const morningStart: ExerciseKey[] = ['brtResults', 'BBResults', 'TIMERResults'];
      const after: ExerciseKey[] = [];
      if (afterRule === 'BRE') after.push('BREResults');
      if (afterRule === 'BRW') after.push('BRWResults');
      const day: ExerciseKey[] = [];
      const usedToday = new Set<ExerciseKey>([...morningStart, ...after]);

      for (let slot = 0; slot < daySessionsPerDay; slot++) {
        const pick = this.pickDayExercise({
          band, dayOptionKeys, quotas,
          quotaBagRef: () => quotaBag,
          setQuotaBag: (b) => (quotaBag = b),
          weekDayCounts, usedToday, weekdayIndex,
          isLungsBlocked: isLungsBlockedDay(weekdayIndex),
          lastWeekUsed, isSingleDaySessionWeek,
        });
        if (pick) {
          day.push(pick);
          usedToday.add(pick);
          weekDayCounts[pick] = (weekDayCounts[pick] || 0) + 1;
        }
      }

      const nightPick = this.pickNightExercise(nightOptionKeys, usedToday, lastWeekUsed);
      const night: ExerciseKey[] = nightPick ? [nightPick] : [nightOptionKeys[0]];
      routineDays.push({ isoDate, weekdayIndex, sections: { morningStart, day, after, night } });
    }

    return {
      version: this.ROUTINE_VERSION,
      createdAtISO: new Date().toISOString(),
      timezone: tz, weekStartISO, weekEndISO, band, avgSeconds,
      daySessionCount: daySessionsPerDay, afterRule,
      days: routineDays,
      debug: { band, avgSeconds, ruleUsed: this.RULES[band], localTodayISO: this.localISODate(new Date()) }
    };
  }

  private afterRuleForBand(band: Band): 'none' | 'BRE' | 'BRW' {
    if (band === -25) return 'BRE';
    if (band === -35 || band === -40 || band === 40) return 'BRW';
    return 'none';
  }

  private buildDayQuotas(band: Band): Record<ExerciseKey, number> {
    const rule = this.RULES[band];
    const quotas: Record<ExerciseKey, number> = {} as any;
    rule.dayOptions.forEach(o => { if (o.perWeek && o.perWeek > 0) quotas[o.key] = o.perWeek; });
    return quotas;
  }

  private pickDayExercise(args: {
    band: Band; dayOptionKeys: ExerciseKey[]; quotas: Record<ExerciseKey, number>;
    quotaBagRef: () => ExerciseKey[]; setQuotaBag: (b: ExerciseKey[]) => void;
    weekDayCounts: Record<ExerciseKey, number>; usedToday: Set<ExerciseKey>;
    weekdayIndex: number; isLungsBlocked: boolean; lastWeekUsed: Set<ExerciseKey>;
    isSingleDaySessionWeek: boolean;
  }): ExerciseKey | null {
    const { dayOptionKeys, quotas, quotaBagRef, setQuotaBag, weekDayCounts, usedToday,
      isLungsBlocked, lastWeekUsed, isSingleDaySessionWeek } = args;

    const canUseToday = (k: ExerciseKey): boolean => {
      if (usedToday.has(k)) return false;
      if (k === 'LungsResults' && isLungsBlocked) return false;
      if (k === 'WHResults' && usedToday.has('KBResults')) return false;
      if (k === 'KBResults' && usedToday.has('WHResults')) return false;
      return true;
    };

    let bag = quotaBagRef();
    for (let i = 0; i < bag.length; i++) {
      const k = bag[i];
      if (!canUseToday(k)) continue;
      if (isSingleDaySessionWeek && !quotas[k]) {
        const count = weekDayCounts[k] || 0;
        if (count >= 2) continue;
      }
      bag.splice(i, 1);
      setQuotaBag(bag);
      return k;
    }

    const candidates = dayOptionKeys.filter(k => canUseToday(k));
    if (candidates.length === 0) return null;

    const cappedCandidates = isSingleDaySessionWeek
      ? candidates.filter(k => { if (quotas[k]) return true; return (weekDayCounts[k] || 0) < 2; })
      : candidates;

    const finalCandidates = cappedCandidates.length > 0 ? cappedCandidates : candidates;
    const useCarryOverBias = dayOptionKeys.length > 7;

    const weighted = finalCandidates.map(k => ({
      k,
      w: 1 + (useCarryOverBias && !lastWeekUsed.has(k) ? 3 : 0) + Math.max(0, 2 - (weekDayCounts[k] || 0))
    }));
    return this.weightedPick(weighted);
  }

  private pickNightExercise(nightOptions: ExerciseKey[], usedToday: Set<ExerciseKey>, lastWeekUsed: Set<ExerciseKey>): ExerciseKey | null {
    const candidates = nightOptions.filter(k => !usedToday.has(k));
    if (candidates.length === 0) return null;
    const weighted = candidates.map(k => ({ k, w: 1 + (!lastWeekUsed.has(k) ? 2 : 0) }));
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
      .map(s => ({ heading: s.heading, cards: s.keys.map(k => ({ def: this.EX[k] })) }))
      .filter(s => s.cards.length > 0);
  }

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

  private localISODate(d: Date): string {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const da = parts.find(p => p.type === 'day')?.value;
    return `${y}-${m}-${da}`;
  }

  private localWeekdayIndexFromISO(isoDate: string): number {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(y, (m - 1), d, 12, 0, 0, 0);
    return dt.getDay();
  }

  private getCurrentWeekWindowISO(): { weekStartISO: string; weekEndISO: string; };
  private getCurrentWeekWindowISO(includeDates: true): { weekStartISO: string; weekEndISO: string; datesISO: string[]; };
  private getCurrentWeekWindowISO(includeDates?: boolean): { weekStartISO: string; weekEndISO: string; datesISO?: string[]; } {
    const today = new Date();
    const todayISO = this.localISODate(today);
    const [y, m, d] = todayISO.split('-').map(Number);
    const localNoon = new Date(y, m - 1, d, 12, 0, 0, 0);
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

  private timeStringToSeconds(time: string): number {
    const cleaned = time.replace(/\s+/g, '');
    const [minutes, seconds] = cleaned.split(':').map(Number);
    return (minutes || 0) * 60 + (seconds || 0);
  }

  goBack(): void { this.navCtrl.back(); }

  isExerciseDoneToday(key: string): boolean {
    const dateToCheck = this.selectedISO || new Date().toLocaleDateString('en-CA', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const results = this.resultsByDate[dateToCheck] || [];
    if (key === 'LungsResults') {
      const freeId = this.isPortuguese ? 'OlV7sIjOrmOsKhm7d83W' : 'Lb9X1QkkDpNYEPIzw2Ga';
      return results.some((r: any) => r.exerciseKey === 'LungsResults' && r.videoId === freeId);
    }
    return results.some((r: any) => r.exerciseKey === key);
  }

  private rebuildDropdownOptionsFromRoutine(routine: WeeklyRoutine, isoDate: string): void {
    const day = routine.days.find(d => d.isoDate === isoDate);
    const removeKeys = new Set<ExerciseKey>();
    if (day) {
      const allToday = [...day.sections.morningStart, ...day.sections.day, ...day.sections.after, ...day.sections.night];
      allToday.forEach(k => { if (k !== 'brtResults') removeKeys.add(k); });
    }
    this.todayExerciseOptionsForRemove = Array.from(removeKeys).map(k => ({
      key: k, label: { en: this.EX[k].title.en, pt: this.EX[k].title.pt }
    }));

    const alreadyToday = new Set<ExerciseKey>();
    if (day) {
      [...day.sections.morningStart, ...day.sections.day, ...day.sections.after, ...day.sections.night]
        .forEach(k => alreadyToday.add(k));
    }
    this.allExerciseOptionsForAdd = (Object.keys(this.EX) as ExerciseKey[])
      .filter(k => k !== 'brtResults')
      .filter(k => !alreadyToday.has(k))
      .map(k => ({ key: k, label: { en: this.EX[k].title.en, pt: this.EX[k].title.pt } }))
      .sort((a, b) => a.label.en.localeCompare(b.label.en));
  }

  onRemoveSelectionChange(): void {
    const key = this.removeSelection;
    if (!key) return;
    const currentRoutine = this.getStoredRoutine();
    if (!currentRoutine) return;
    const routine = this.findRoutineForDate(this.selectedISO, currentRoutine);
    if (!routine) return;
    const updated = this.updateTodayRoutineRemove(routine, this.selectedISO, key);
    this.saveRoutineForDate(this.selectedISO, updated);
    this.hardRefresh();
  }

  onAddSelectionChange(): void {
    const key = this.addSelection;
    if (!key) return;
    if (key === 'brtResults') { this.addSelection = ''; return; }
    this.pendingAddKey = key;
    this.showAddWhereAlert = true;
  }

  private confirmAddToSection(section: 'morningStart' | 'day' | 'after' | 'night'): void {
    const key = this.pendingAddKey;
    if (!key) return;
    const currentRoutine = this.getStoredRoutine();
    if (!currentRoutine) return;
    const routine = this.findRoutineForDate(this.selectedISO, currentRoutine);
    if (!routine) return;
    const updated = this.updateTodayRoutineAddToSection(routine, this.selectedISO, key, section);
    this.saveRoutineForDate(this.selectedISO, updated);
    this.showAddWhereAlert = false;
    this.pendingAddKey = null;
    this.hardRefresh();
  }

  private updateTodayRoutineRemove(routine: WeeklyRoutine, isoDate: string, removeKey: ExerciseKey): WeeklyRoutine {
    const copy: WeeklyRoutine = JSON.parse(JSON.stringify(routine));
    const day = copy.days.find(d => d.isoDate === isoDate);
    if (!day) return copy;
    if (day.userExcludedNight) { day.sections.night = []; }
    if (removeKey === 'brtResults') return copy;
    const nightHadIt = day.sections.night.includes(removeKey);
    day.sections.morningStart = day.sections.morningStart.filter(k => k !== removeKey);
    day.sections.day = day.sections.day.filter(k => k !== removeKey);
    day.sections.after = day.sections.after.filter(k => k !== removeKey);
    day.sections.night = day.sections.night.filter(k => k !== removeKey);
    if (!day.sections.morningStart.includes('brtResults')) {
      day.sections.morningStart.unshift('brtResults');
    }
    if (nightHadIt) { day.userExcludedNight = true; return copy; }
    if (day.sections.night.length === 0 && !day.userExcludedNight) {
      const bandRule = this.RULES[copy.band];
      const usedToday = new Set<ExerciseKey>([...day.sections.morningStart, ...day.sections.day, ...day.sections.after]);
      const nightPick = this.pickNightExercise(bandRule.nightOptions, usedToday, this.getLastWeekUsedExercises());
      day.sections.night = [nightPick ?? bandRule.nightOptions[0]];
    }
    return copy;
  }

  private updateTodayRoutineAddToSection(
    routine: WeeklyRoutine, isoDate: string, addKey: ExerciseKey,
    section: 'morningStart' | 'day' | 'after' | 'night'
  ): WeeklyRoutine {
    const copy: WeeklyRoutine = JSON.parse(JSON.stringify(routine));
    const day = copy.days.find(d => d.isoDate === isoDate);
    if (!day) return copy;
    if (addKey === 'brtResults') return copy;
    if (section === 'night') { day.userExcludedNight = false; }
    else if (day.userExcludedNight) { day.sections.night = []; }
    const usedToday = new Set<ExerciseKey>([
      ...day.sections.morningStart, ...day.sections.day,
      ...day.sections.after, ...day.sections.night,
    ]);
    if (usedToday.has(addKey)) return copy;
    day.sections.morningStart = day.sections.morningStart || [];
    day.sections.day = day.sections.day || [];
    day.sections.after = day.sections.after || [];
    day.sections.night = day.sections.night || [];
    if (section === 'morningStart') {
      if (!day.sections.morningStart.includes('brtResults')) {
        day.sections.morningStart.unshift('brtResults');
      }
      const brtIndex = day.sections.morningStart.indexOf('brtResults');
      if (brtIndex >= 0) { day.sections.morningStart.splice(brtIndex + 1, 0, addKey); }
      else { day.sections.morningStart.push(addKey); }
      return copy;
    }
    if (section === 'day') { day.sections.day.push(addKey); return copy; }
    if (section === 'after') { day.sections.after.push(addKey); return copy; }
    if (section === 'night') { day.sections.night.push(addKey); return copy; }
    return copy;
  }

  private hardRefresh(): void { window.location.reload(); }

  goTo(def: ExerciseDef): void {
    const url = typeof def.route === 'string' ? def.route : (this.isPortuguese ? def.route.pt : def.route.en);
    this.navCtrl.navigateForward(url);
  }
}