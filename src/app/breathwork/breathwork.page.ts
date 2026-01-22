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

@Component({
  selector: 'app-breathwork',
  templateUrl: './breathwork.page.html',
  styleUrls: ['./breathwork.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, CoreModule, RouterModule],
})
export class BreathworkPage {
  @ViewChild('openScreen') openScreen!: ElementRef<HTMLDivElement>;

  latestBRTResultInSeconds = 0;
  numberOfWeekSessions = 0;
  hasBrtToday = false;

  selectedQuote: { text: string; author: string } | null = null;
  private _sharing = false;

  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  greetingText = '';
  progressText = '';

  private static hasInitialized = false;

  private _pendingActiveDays: Set<string> | null = null;

  private readonly EXERCISE_KEYS = [
    'brtResults', 'HATResults', 'HATCResults', 'AHATResults',
    'WHResults', 'KBResults', 'BBResults', 'YBResults', 'BREResults',
    'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults',
    'CBResults', 'RBResults', 'NBResults', 'CUSTResults', 'LungsResults',
    'YogaResults', 'DBResults', 'HUMResults', 'TIMERResults'
  ];

  constructor(
    private globalService: GlobalService,
    private router: Router,
    private firebaseService: FirebaseService,
    private revenuecat: RevenuecatService,
    private authService: AuthService,
    private globalAlert: GlobalAlertService
  ) {}

  private startBreathTourNow() {
    localStorage.setItem('startHomeTour', 'true');
    this.router.navigateByUrl('/home');
  }

  openOpenScreen() {
    try {
      this.globalService.openModal(this.openScreen);
    } catch (e) {
      console.warn('openOpenScreen failed:', e);
    }
  }

  closeOpenScreen() {
    try {
      this.globalService.closeModal(this.openScreen);
    } catch (e) {
      console.warn('closeOpenScreen failed:', e);
    }
  }

  async ionViewWillEnter() {
    try {
      this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

      // Always load quote (online->db, else cache)
      await this.loadRandomQuote();

      // Online-only sync logic
      if (navigator.onLine) {
        try {
          await this.authService.ensureUserCreatedAt();
          await this.authService.ensureUserLanguageSynced();

          const snapshot = await this.revenuecat.getSnapshot();
          await this.authService.syncMembershipTypeToFirestore(snapshot);

          if (snapshot.status !== 'active') {
            const trialStatus = await this.authService.checkOrStartDeviceTrial();

            if (trialStatus.newlyCreated) {
              this.globalAlert.showalert(
                this.isPortuguese ? 'Período de Teste' : 'Trial Started',
                this.isPortuguese
                  ? 'Você tem 7 dias de acesso gratuito a todos os recursos do Briza'
                  : 'You have 7 days of free access to all features of Briza'
              );
              localStorage.setItem('membershipStatus', 'active');
              localStorage.setItem('membershipSource', 'trial');
            } else if (trialStatus.expiredNow) {
              this.globalAlert.showalert(
                this.isPortuguese ? 'Período de Teste Encerrado' : 'Trial Ended',
                this.isPortuguese
                  ? 'Seu período de teste terminou. Você agora está no modo gratuito. Assine para obter acesso total novamente'
                  : 'Your trial period has ended. You are now in free mode. Subscribe to regain full access'
              );
              localStorage.setItem('membershipStatus', 'inactive');
              localStorage.setItem('membershipSource', 'trialExpired');
            }
          }

          // Update remote results at most once every 3 days
          const lastOpened = localStorage.getItem('lastOpened');
          const now = Date.now();
          const THREE_DAYS = 72 * 60 * 60 * 1000;

          if (lastOpened == null || (now - parseInt(lastOpened, 10)) >= THREE_DAYS) {
            try {
              await this.authService.updateDataResults();
            } catch (e) {
              console.warn('updateDataResults failed:', e);
            }
            localStorage.setItem('lastOpened', String(now));
          }
        } catch (e) {
          console.warn('Online sync/trial logic failed (continuing):', e);
        }
      }

      // First-time modal open (once per app session)
      if (!BreathworkPage.hasInitialized) {
        BreathworkPage.hasInitialized = true;
        this.openOpenScreen();
      }

      // Fast UI updates
      this.computeGreeting();
      this.computeBrtToday();
      this.computeWeeklyProgressCached(); // prepares _pendingActiveDays, paints in ionViewDidEnter
    } catch {}
  }

  ionViewDidEnter() {
    // Paint circles only after DOM is actually in place
    if (this._pendingActiveDays) {
      this.paintWeekCircles(this._pendingActiveDays);
      this._pendingActiveDays = null;
    }
  }

  private computeGreeting() {
    const fullName = localStorage.getItem('currentUserName') || '';
    const userName = (fullName.split(' ')[0] || '').trim();
    const currentHour = new Date().getHours();

    if (this.isPortuguese) {
      const g = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';
      this.greetingText = `${g}, ${userName}`;
    } else {
      const g = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
      this.greetingText = `${g}, ${userName}`;
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
    this.latestBRTResultInSeconds = latestSeconds;
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
    const cacheKey = `home_weekly_cache_v3_${this.isPortuguese ? 'PT' : 'EN'}`;

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
    this.closeOpenScreen();
    setTimeout(() => this.startBreathTourNow(), 0);
  }

  private langKey(): 'EN' | 'PT' {
    return this.isPortuguese ? 'PT' : 'EN';
  }

  private pickRandom<T>(arr: T[]): T | null {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  async loadRandomQuote(): Promise<void> {
    const db = this.firebaseService.firestore;
    const lang = this.langKey();
    const cacheKey = `home_weekly_cache_v3_${this.isPortuguese ? 'PT' : 'EN'}`;

    // 1) Online -> Firestore
    if (navigator.onLine && db) {
      try {
        const colRef = collection(db, 'quotes');
        const qRef = query(colRef, where('language', '==', lang));
        const snap = await getDocs(qRef);

        const docs = snap.docs.map(d => d.data() as { text: string; author: string; language: string });

        if (docs.length) {
          localStorage.setItem(cacheKey, JSON.stringify(docs));
          const pick = this.pickRandom(docs)!;
          this.selectedQuote = { text: pick.text, author: pick.author };
          return;
        }
      } catch (e) {
        console.warn('Quotes fetch failed, will try cache:', e);
      }
    }

    // 2) Cache fallback
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const arr = JSON.parse(cached) as { text: string; author: string }[];
        const pick = this.pickRandom(arr);
        if (pick) {
          this.selectedQuote = { text: pick.text, author: pick.author };
          return;
        }
      } catch {}
    }

    // 3) Final fallback
    this.selectedQuote = { text: 'Breathe in. Breathe out.', author: '—' };
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
}
