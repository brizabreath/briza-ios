import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CoreModule } from '../core.module';
import { Router, RouterModule } from '@angular/router';
import { GlobalService } from '../services/global.service';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FirebaseService } from '../services/firebase.service';
import { RevenuecatService } from '../services/revenuecat.service';
import { AuthService } from '../services/auth.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { ShepherdService } from 'angular-shepherd';

@Component({
  selector: 'app-breathwork',
  templateUrl: './breathwork.page.html',
  styleUrls: ['./breathwork.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, CoreModule, RouterModule],
})
export class BreathworkPage {
  @ViewChild('openScreen') openScreen!: ElementRef<HTMLDivElement>;
  @ViewChild('brworkPage') brworkPage!: ElementRef<HTMLDivElement>;

  numberOfWeekSessions = 0;
  hasBrtToday = false;

  selectedQuote: { text: string; author: string } | null = null;
  private _sharing = false;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  greetingText = '';
  progressText = '';
  showWebSplash = false;

  private static hasInitialized = false;
  private static hasSyncedResultsOnce = false;
  private _pendingActiveDays: Set<string> | null = null;
  isContentReady = false;
  private readonly EXERCISE_KEYS = [
    'brtResults', 'HATResults', 'HATCResults', 'AHATResults',
    'WHResults', 'KBResults', 'BBResults', 'YBResults', 'BREResults',
    'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults',
    'CBResults', 'RBResults', 'NBResults', 'CUSTResults', 'LungsResults',
    'YogaResults', 'DBResults', 'HUMResults', 'TIMERResults', 'BMResults', 'MobilityResults', 'SeriesResults'
  ];
  todayWeekdayKey: 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat' = 'mon';
  constructor(
    private globalService: GlobalService,
    private router: Router,
    private firebaseService: FirebaseService,
    private revenuecat: RevenuecatService,
    private authService: AuthService,
    private globalAlert: GlobalAlertService,
    private shepherd: ShepherdService
  ) {}

  openOpenScreen() {
    try {
      this.globalService.openModal(this.openScreen);
    } catch (e) {
      console.warn('openOpenScreen failed:', e);
    }
  }

  closeOpenScreen() {
    try {
      this.isContentReady = true; // ensure visible
      if (!localStorage.getItem('home_guide_seen')) {
        localStorage.setItem('home_guide_seen', 'true');
        this.startAppGuide();
      } else {
        this.globalService.closeModal(this.openScreen);
      }
    } catch (e) {
      console.warn('closeOpenScreen failed:', e);
    }
  }
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
  ionViewDidLeave() {
    this.unlockUIForTour();
  }
  private lockUIForTour = () => {
    document.documentElement.classList.add('tour-active');
    document.body.style.overflow = 'hidden'; // stop background scroll
  };

  private unlockUIForTour = () => {
    document.documentElement.classList.remove('tour-active');
    document.body.style.overflow = '';
  };
  async ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.computeTodayWeekdayKey();
    this.computeGreeting();
    this.computeBrtToday();
    this.computeWeeklyProgressCached();

    if (this._pendingActiveDays) {
      requestAnimationFrame(() => {
        this.paintWeekCircles(this._pendingActiveDays!);
        this._pendingActiveDays = null;
      });
    }

    if (localStorage.getItem('isFemale') === null) {
      localStorage.setItem('isFemale', 'true');
    }

    // show cached quote immediately
    this.loadQuoteFast();

    if (!BreathworkPage.hasInitialized) {
      BreathworkPage.hasInitialized = true;
      this.showWebSplash = true;
      setTimeout(() => {
        this.isContentReady = true;
        this.showWebSplash = false;
        this.openOpenScreen();
      }, 0);
    } else {
      this.isContentReady = true;
      this.showWebSplash = false;
    }
    // background refreshes
    this.refreshInBackground();

    // sync results only once per app session
    if (!BreathworkPage.hasSyncedResultsOnce) {
      BreathworkPage.hasSyncedResultsOnce = true;

      this.authService.updateDataResults().catch(e => {
        console.warn('updateDataResults failed:', e);
      });
    }
  }
  private async refreshInBackground() {
    // refresh quotes pool without blocking UI
    this.refreshQuotePoolSilently();

    if (!navigator.onLine) return;

    const lastSync = Number(localStorage.getItem('breathwork_last_sync') || '0');
    const now = Date.now();
    const TEN_MIN = 10 * 60 * 1000;

    if (now - lastSync < TEN_MIN) return;

    localStorage.setItem('breathwork_last_sync', String(now));

    try {
      await this.authService.ensureUserCreatedAt();
    } catch (e) {
      console.warn('ensureUserCreatedAt failed:', e);
    }

    try {
      await this.authService.ensureUserLanguageSynced();
    } catch (e) {
      console.warn('ensureUserLanguageSynced failed:', e);
    }

    try {
      await this.authService.expireCodeIfNeeded();
    } catch (e) {
      console.warn('expireCodeIfNeeded failed:', e);
    }

    try {
      const snapshot = await this.revenuecat.getSnapshot();
      await this.authService.syncMembershipTypeToFirestore(snapshot);

      if (snapshot.status !== 'active') {
        await this.authService.checkOrStartDeviceTrial();
      }
    } catch (e) {
      console.warn('RevenueCat sync failed:', e);
    }
  }
  private computeGreeting() {
    this.applyGreeting(localStorage.getItem('currentUserName') || '');

    const hasName = !!(localStorage.getItem('currentUserName') || '').trim();
    if (!hasName && navigator.onLine) {
      this.authService.getNameFromFirestore()
        .then(name => {
          if (name) {
            localStorage.setItem('currentUserName', name);
            this.applyGreeting(name);
          }
        })
        .catch(e => console.warn('Could not fetch name:', e));
    }
  }

  private applyGreeting(fullName: string) {
    const userName = (fullName.split(' ')[0] || '').trim();
    const currentHour = new Date().getHours();

    if (this.isPortuguese) {
      const g = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';
      this.greetingText = userName ? `${g}, ${userName}` : g;
    } else {
      const g = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
      this.greetingText = userName ? `${g}, ${userName}` : g;
    }
  }

  private timeStringToSeconds(time: string): number {
    const parts = (time || '').split(':').map(Number);
    const minutes = parts[0] || 0;
    const seconds = parts[1] || 0;
    return minutes * 60 + seconds;
  }

  private computeBrtToday() {
    const raw = localStorage.getItem('brtResults');
    let brtResults: any[] = [];

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        brtResults = Array.isArray(parsed) ? parsed : [];
      } catch {
        brtResults = [];
      }
    }

    const todayKey = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

    let latestSeconds = 0;
    let has = false;

    for (const r of brtResults) {
      if (!r?.date) continue;
      const d = new Date(r.date);
      const key = d.toLocaleDateString('en-CA');
      if (key !== todayKey) continue;
      has = true;
      latestSeconds = this.timeStringToSeconds(r.result);
    }

    this.hasBrtToday = has;
  }

  private storageSignature(): string {
    // Fast signature: raw string length per key (no JSON.parse)
    const parts: string[] = [];
    for (const key of this.EXERCISE_KEYS) {
      const raw = localStorage.getItem(key) || '';
      parts.push(`${key}:${raw.length}`);
    }
    return parts.join('|');
  }

  private computeWeeklyProgressCached() {
    const sig = this.storageSignature();
    
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekKey = monday.toLocaleDateString('en-CA'); // e.g. "2025-03-31"

    const cacheKey = `home_weekly_cache_v3_${this.isPortuguese ? 'PT' : 'EN'}_${weekKey}`;


    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as any;
        if (cached && cached.sig === sig) {
          this.numberOfWeekSessions = cached.weekSessions || 0;
          this.progressText = cached.progressText || '';
          this._pendingActiveDays = new Set<string>(cached.activeDays || []);
          return;
        }
      } catch {}
    }

    const { weekSessions, progressText, activeDays } = this.computeWeeklyProgressFresh();
    this.numberOfWeekSessions = weekSessions;
    this.progressText = progressText;
    this._pendingActiveDays = activeDays;

    localStorage.setItem(cacheKey, JSON.stringify({
      sig,
      ts: Date.now(),
      weekSessions,
      progressText,
      activeDays: Array.from(activeDays),
    }));
  }

  private computeWeeklyProgressFresh(): {
    weekSessions: number;
    progressText: string;
    activeDays: Set<string>;
  } {
    const today = new Date();

    // Monday start (local)
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const activeDays = new Set<string>();
    const activeDates = new Set<string>();
    let weeklySessionCount = 0;

    for (const key of this.EXERCISE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      let entries: any[] = [];
      try { entries = JSON.parse(raw); } catch { entries = []; }
      if (!Array.isArray(entries) || !entries.length) continue;

      for (const result of entries) {
        if (!result?.date) continue;

        const d = new Date(result.date);
        const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dateKey = dayOnly.toLocaleDateString('en-CA');
        activeDates.add(dateKey);

        if (dayOnly >= monday && dayOnly <= sunday) {
          const weekday = dayOnly.getDay(); // 0=Sun..6=Sat
          const keyDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday];
          activeDays.add(keyDay);
          weeklySessionCount++;
        }
      }
    }

    const streak = this.computeActiveStreakFromDates(activeDates);
    let text = '';

    if (streak >= 5) {
      text = this.isPortuguese
        ? `Parabéns! ${streak} ${streak === 1 ? 'dia' : 'dias'} de treino seguidos!`
        : `Well done! ${streak} ${streak === 1 ? 'day' : 'days'} of practice in a row!`;
    } else if (weeklySessionCount === 0) {
      text = this.isPortuguese
        ? 'Você ainda não praticou essa semana'
        : 'You have not practiced this week yet';
    } else {
      text = this.isPortuguese
        ? `Você já praticou ${weeklySessionCount}x essa semana`
        : `You have practiced ${weeklySessionCount}x this week`;
    }

    return { weekSessions: weeklySessionCount, progressText: text, activeDays };
  }

  private computeActiveStreakFromDates(activeDates: Set<string>): number {
    const sorted = Array.from(activeDates).sort(); // YYYY-MM-DD (lex sort works)
    if (!sorted.length) return 0;

    const oneDayMs = 86400000;

    let streak = 1;
    let prev = new Date(sorted[0] + 'T00:00:00');

    for (let i = 1; i < sorted.length; i++) {
      const curr = new Date(sorted[i] + 'T00:00:00');
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / oneDayMs);

      if (diffDays === 1) streak++;
      else if (diffDays > 1) streak = 1;

      prev = curr;
    }

    // Active only if last practice is today or yesterday
    const last = new Date(sorted[sorted.length - 1] + 'T00:00:00');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const diffToToday = Math.floor((todayStart.getTime() - last.getTime()) / oneDayMs);
    if (diffToToday > 1) return 0;

    return streak;
  }

  private paintWeekCircles(activeDays: Set<string>) {
    const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    for (const day of allDays) {
      const circle = document.getElementById(`circle-${day}`);
      if (circle) circle.style.backgroundColor = 'white';
    }

    const filledColor = '#49B79D';
    for (const day of activeDays) {
      const circle = document.getElementById(`circle-${day}`);
      if (circle) circle.style.backgroundColor = filledColor;
    }
  }

  startAppGuide() {
    this.globalService.closeModal(this.openScreen);
    const isPT = localStorage.getItem('isPortuguese') === 'true';
    const t = (en: string, pt: string) => (isPT ? pt : en);
    const sel = (enSel: string, ptSel: string) => (isPT ? ptSel : enSel);

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

      // Step: Program
      if (document.querySelector('#hp-progHome')) {
        steps.push({
          id: 'hp-progHome',
          text: `<h3>${t('The Briza Program', 'O Programa Briza')}</h3>
                <p>${t(
                  'Your personalised daily training plan. It adapts week by week based on your Briza Retention Test results — getting more challenging as your breathing improves. Every day starts with the same foundation: retention test, Briza breathing, and meditation.',
                  'Seu plano de treino diário personalizado. Ele se adapta semana a semana com base nos seus resultados do Teste de Retenção Briza — ficando mais desafiador conforme sua respiração melhora. Todo dia começa com a mesma base: teste de retenção, respiração Briza e meditação.'
                )}</p>`,
          attachTo: { element: '#hp-progHome', on: 'bottom' },
          buttons: [
            { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
          ]
        });
      }

      // Step: BRT
      if (document.querySelector('#hp-brtHome')) {
        steps.push({
          id: 'hp-brtHome',
          text: `<h3>${t('Briza Retention Test', 'Teste de Retenção Briza')}</h3>
                <p>${t(
                  'This test measures how long you can comfortably hold your breath after a normal exhale — a reliable indicator of CO₂ tolerance and overall breathing efficiency. Do it every morning and your program automatically adapts to your level.',
                  'Este teste mede por quanto tempo você consegue confortavelmente segurar a respiração após uma expiração normal — um indicador confiável de tolerância ao CO₂ e eficiência respiratória geral. Faça todo dia pela manhã e seu programa se adapta automaticamente ao seu nível.'
                )}</p>`,
          attachTo: { element: '#hp-brtHome', on: 'bottom' },
          buttons: [
            { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
            { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
          ]
        });
      }

      // Step: Mood / How Briza can help
      steps.push({
        id: 'hp-moodScroll',
        text: `<h3>${t('How Briza can help', 'Como Briza pode te ajudar')}</h3>
              <p>${t(
                'Browse exercises grouped by what you need right now — energy, calm, focus, recovery, sleep, or performance. Each category contains targeted breathing techniques and guided classes chosen for that specific outcome.',
                'Navegue por exercícios agrupados pelo que você precisa agora — energia, calma, foco, recuperação, sono ou desempenho. Cada categoria contém técnicas de respiração e aulas guiadas específicas para aquele objetivo.'
              )}</p>`,
        attachTo: { element: '#hp-moodScroll', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // Step: Weekly progress
      steps.push({
        id: 'hp-progress',
        text: `<h3>${t('Your weekly progress', 'Seu progresso semanal')}</h3>
              <p>${t(
                'The circles show which days of this week you have already practiced. Consistency matters more than intensity — even a single session a day adds up.',
                'Os círculos mostram quais dias desta semana você já praticou. Consistência importa mais do que intensidade — mesmo uma sessão por dia faz diferença.'
              )}</p>`,
        attachTo: { element: '#hp-progress', on: 'top' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // Step: Mindfulness / Program section
      steps.push({
        id: 'hp-program',
        text: `<h3>${t('Mindfulness', 'Mindfulness')}</h3>
              <p>${t(
                'Guided breathing sessions, meditation, and breathwork classes for specific purposes — from stress relief and sleep preparation to energy and focus. The techniques here draw from pranayama, CO₂ training, and modern breathwork research.',
                'Sessões guiadas de respiração, meditação e aulas de breathwork para fins específicos — desde alívio do estresse e preparação para o sono até energia e foco. As técnicas aqui são baseadas em pranayama, treinamento de CO₂ e pesquisas modernas de respiração.'
              )}</p>`,
        attachTo: { element: sel('#hp-program', '#hp-programPT'), on: 'top' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // Step: Movement / Yoga
      steps.push({
        id: 'hp-yoga',
        text: `<h3>${t('Movement', 'Movimento')}</h3>
              <p>${t(
                'Yoga and mobility classes that complement your breathing practice. Movement and breathwork reinforce each other.',
                'Aulas de yoga e mobilidade que complementam sua prática de respiração. Movimento e respiração se reforçam mutuamente.'
              )}</p>`,
        attachTo: { element: sel('#hp-yoga', '#hp-yogaPT'), on: 'top' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // Step: Results
      steps.push({
        id: 'hp-bpr',
        text: `<h3>${t('Results', 'Resultados')}</h3>
              <p>${t(
                'A complete history of every exercise you have done, your Briza Retention Test scores over time, and charts showing your long-term progress. Use this to see how far you have come and to stay motivated to keep going.',
                'Um histórico completo de todos os exercícios que você fez, suas pontuações do Teste de Retenção Briza ao longo do tempo e gráficos mostrando seu progresso a longo prazo. Use isso para ver o quanto você evoluiu e para manter a motivação.'
              )}</p>`,
        attachTo: { element: sel('#hp-bpr', '#hp-bprPT'), on: 'top' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // Step: Profile
      steps.push({
        id: 'hp-profile',
        text: `<h3>${t('Profile', 'Perfil')}</h3>
              <p>${t(
                'Manage your account, subscription, language settings, and app preferences. You can also find your membership details and access support from here.',
                'Gerencie sua conta, assinatura, configurações de idioma e preferências do app. Você também pode encontrar os detalhes da sua assinatura e acessar o suporte por aqui.'
              )}</p>`,
        attachTo: { element: sel('#hp-profile', '#hp-profilePT'), on: 'top' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          {
            text: t('Next', 'Próximo'),
            action: () => {
              this.shepherd.complete();
              localStorage.setItem('startHomeTour', 'true');
              this.router.navigateByUrl('/home');
            },
          },
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

  private langKey(): 'EN' | 'PT' {
    return this.isPortuguese ? 'PT' : 'EN';
  }

  private loadQuoteFast(): void {
    const lang = this.langKey();
    const today = this.localDayKey();
    const stateKey = this.quoteStateKey(lang);

    const savedState = localStorage.getItem(stateKey);
    if (savedState) {
      try {
        const state = JSON.parse(savedState) as { day: string; quote: { text: string; author: string } };
        if (state?.day === today && state?.quote?.text) {
          this.selectedQuote = state.quote;
          return;
        }
      } catch {}
    }

    const cachedPoolRaw = localStorage.getItem(this.quotePoolKey(lang));
    if (cachedPoolRaw) {
      try {
        const pool = JSON.parse(cachedPoolRaw) as { text: string; author: string }[];
        if (Array.isArray(pool) && pool.length) {
          const remainingKey = this.quoteRemainingKey(lang);
          let remaining: number[] = [];

          try {
            const rawRemaining = localStorage.getItem(remainingKey);
            if (rawRemaining) {
              const arr = JSON.parse(rawRemaining);
              if (Array.isArray(arr)) remaining = arr.filter((n: any) => Number.isInteger(n));
            }
          } catch {}

          if (!remaining.length || remaining.some(i => i < 0 || i >= pool.length)) {
            remaining = this.shuffle(Array.from({ length: pool.length }, (_, i) => i));
          }

          const nextIndex = remaining.shift()!;
          localStorage.setItem(remainingKey, JSON.stringify(remaining));

          const pick = pool[nextIndex] || pool[0];
          this.selectedQuote = pick;
          localStorage.setItem(stateKey, JSON.stringify({ day: today, quote: pick }));
          return;
        }
      } catch {}
    }

    this.selectedQuote = { text: 'Breathe in. Breathe out.', author: '—' };
  }
  private async refreshQuotePoolSilently(): Promise<void> {
    if (!navigator.onLine || !this.firebaseService.firestore) return;

    const lang = this.langKey();

    try {
      const db = this.firebaseService.firestore;
      const colRef = collection(db, 'quotes');
      const qRef = query(colRef, where('language', '==', lang));
      const snap = await getDocs(qRef);

      const docs = snap.docs
        .map(d => d.data() as any)
        .filter(x => typeof x?.text === 'string' && x.text.trim().length)
        .map(x => ({
          text: String(x.text).trim(),
          author: (x.author || '—').trim()
        }));

      if (docs.length) {
        localStorage.setItem(this.quotePoolKey(lang), JSON.stringify(docs));
      }
    } catch (e) {
      console.warn('Quotes refresh failed:', e);
    }
  }

  async shareOpenScreen() {
    if (this._sharing || !this.selectedQuote) return;
    this._sharing = true;

    try {
      const canvas = document.createElement('canvas');
      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#E8F7F6");
      gradient.addColorStop(1, "#FFFFFF");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const quote = this.selectedQuote.text;
      const author = this.selectedQuote.author;

      try { await (document as any).fonts?.load?.('70px DellaRespira'); } catch {}

      const drawQuoteBlock = (
        ctx2: CanvasRenderingContext2D,
        text: string,
        x: number,
        canvasWidth: number,
        canvasHeight: number,
        baseFont: string = "70px DellaRespira",
        lineHeight: number = 85
      ) => {
        const maxWidth = canvasWidth * 0.8;

        ctx2.font = baseFont;
        const fontFamily = baseFont.split(" ").slice(1).join(" ");
        let fontSize = parseInt(baseFont, 10);

        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine + word + " ";
          if (ctx2.measureText(testLine).width > maxWidth) {
            lines.push(currentLine.trim());
            currentLine = word + " ";
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine.trim());

        let widest = 0;
        for (const line of lines) widest = Math.max(widest, ctx2.measureText(line).width);
        while (widest > maxWidth && fontSize > 28) {
          fontSize -= 2;
          ctx2.font = `${fontSize}px ${fontFamily}`;
          widest = 0;
          for (const line of lines) widest = Math.max(widest, ctx2.measureText(line).width);
        }

        const blockHeight = lines.length * lineHeight;
        const startY = (canvasHeight - blockHeight) / 2;

        ctx2.textAlign = "center";
        ctx2.fillStyle = "#0661AA";
        for (let i = 0; i < lines.length; i++) {
          ctx2.fillText(lines[i], x, startY + i * lineHeight);
        }

        return { blockHeight, startY };
      };

      const { blockHeight, startY } = drawQuoteBlock(ctx, quote, width / 2, width, height);

      const logo = new Image();
      logo.src = 'assets/images/splash.png';
      await new Promise<void>((resolve, reject) => {
        logo.onload = () => {
          const logoSize = 400;
          ctx.drawImage(logo, (width - logoSize) / 2, 350, logoSize, logoSize / 2);
          resolve();
        };
        logo.onerror = reject;
      });

      ctx.font = "42px Arial";
      ctx.fillStyle = "#0660aa9f";
      const authorY = startY + blockHeight + 70;
      ctx.fillText(`- ${author}`, width / 2, authorY);

      const base64 = canvas.toDataURL('image/jpeg', 0.95);
      const base64Data = base64.split(',')[1];
      const fileName = `briza_${Date.now()}.jpeg`;

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      const { uri } = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });

      await Share.share({
        title: this.isPortuguese ? 'Compartilhar citação' : 'Share quote',
        text: 'brizabreath.com',
        files: [uri]
      });

      try {
        const dir = await Filesystem.readdir({ directory: Directory.Cache, path: '' });
        const brizaFiles = dir.files
          .filter(f => f.name.startsWith('briza_') && f.name.endsWith('.jpeg'))
          .sort((a, b) => (a.name > b.name ? -1 : 1));

        const oldFiles = brizaFiles.slice(3);
        for (const file of oldFiles) {
          await Filesystem.deleteFile({ directory: Directory.Cache, path: file.name });
        }
      } catch (cleanupErr) {
        console.warn('Cleanup skipped:', cleanupErr);
      } finally {
        // reduce memory pressure
        canvas.width = 0;
        canvas.height = 0;
      }

    } catch (err) {
      console.error('shareOpenScreen error:', err);
    } finally {
      this._sharing = false;
    }
  }
  private quotePoolKey(lang: 'EN'|'PT') { return `quote_pool_${lang}`; }
  private quoteRemainingKey(lang: 'EN'|'PT') { return `quote_remaining_${lang}`; }
  private quoteStateKey(lang: 'EN'|'PT') { return `quote_state_${lang}`; }

  private localDayKey(): string {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (local)
  }
  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  private async getQuotePool(lang: 'EN'|'PT'): Promise<{ text: string; author: string }[]> {
    const poolKey = this.quotePoolKey(lang);
    let pool: { text: string; author: string }[] = [];

    const cached = localStorage.getItem(poolKey);
    if (cached) {
      try {
        const arr = JSON.parse(cached);
        if (Array.isArray(arr)) pool = arr;
      } catch {}
    }

    // Refresh pool if online (keeps app updated)
    if (navigator.onLine && this.firebaseService.firestore) {
      try {
        const db = this.firebaseService.firestore;
        const colRef = collection(db, 'quotes');
        const qRef = query(colRef, where('language', '==', lang));
        const snap = await getDocs(qRef);

        const docs = snap.docs
          .map(d => d.data() as any)
          .filter(x => typeof x?.text === 'string' && x.text.trim().length)
          .map(x => ({ text: String(x.text).trim(), author: (x.author || '—').trim() }));

        if (docs.length) {
          pool = docs;
          localStorage.setItem(poolKey, JSON.stringify(pool));
        }
      } catch (e) {
        console.warn('Quotes fetch failed, using cached pool:', e);
      }
    }

    return pool;
  }
  private computeTodayWeekdayKey(): void {
    // local device day-of-week (uses the user’s current timezone)
    const dow = new Date().getDay(); // 0=Sun..6=Sat
    this.todayWeekdayKey = (['sun','mon','tue','wed','thu','fri','sat'][dow] as any);
  }
}
