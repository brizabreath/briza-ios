import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CoreModule } from '../core.module'; 
import { Router, RouterModule } from '@angular/router'; // Import RouterModule
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
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CoreModule,
    RouterModule
  ],
})
export class BreathworkPage {
  @ViewChild('openScreen') openScreen!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalBREATH2') closeModalButtonBREATH2!: ElementRef<HTMLSpanElement>;
  @ViewChild('questionBREATH') questionBREATH!: ElementRef<HTMLButtonElement>;  
  @ViewChild('BREATHdots') BREATHdots!: ElementRef<HTMLDivElement>;
  @ViewChild('noBRTresult') noBRTresult!: ElementRef<HTMLDivElement>;
  @ViewChild('BRTresult') BRTresult!: ElementRef<HTMLDivElement>;
  @ViewChild('name') username!: ElementRef<HTMLDivElement>;
  @ViewChild('numberOfSessions') numberOfSessions!: ElementRef<HTMLDivElement>;

  latestBRTResultInSeconds = 0;
  numberOfWeekSessions = 0;
  isModalOpen = false;
  private static hasInitialized = false;
  selectedQuote: { text: string; author: string } | null = null;
  lastOpened = localStorage.getItem('lastOpened');
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private _sharing = false;
  showWebSplash = false;

constructor(
  private globalService: GlobalService, 
  private router: Router, 
  private firebaseService: FirebaseService, 
  private revenuecat: RevenuecatService,
  private authService: AuthService,
  private globalAlert: GlobalAlertService
) {}
  private startBreathTourNow() {
    localStorage.setItem('startHomeTour','true');
    this.router.navigateByUrl('/home');  
  }
  async ionViewWillEnter() {
    this.showWebSplash = true;

    try {
      const online = navigator.onLine;

      // Keep language greeting + UI working offline
      await this.loadRandomQuote();

      // ✅ Only do Firebase/RevenueCat/trial checks when online
      if (online) {
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

          // Only update remote results when online
          const currentDate = Date.now();
          const THREE_DAYS = 72 * 60 * 60 * 1000; // (your variable name was ONE_DAY but it's 3 days)
          if (this.lastOpened == null || (currentDate - parseInt(this.lastOpened)) >= THREE_DAYS) {
            this.authService.updateDataResults();
          }
        } catch (e) {
          console.warn('Online sync/trial logic failed (continuing):', e);
          // ✅ do nothing else; keep last known membershipStatus
        }
      } else {
        console.log('Offline: skipping trial + firestore sync. Using last known membershipStatus.');
      }

      // --- your existing modal setup + UI below here ---
      if (!BreathworkPage.hasInitialized) {
        BreathworkPage.hasInitialized = true;
        this.isModalOpen = true;
        this.globalService.openModal(this.openScreen);
      }

      this.closeModalButtonBREATH2.nativeElement.onclick = () => {
        this.globalService.closeModal(this.openScreen);
        this.isModalOpen = true;
      };
      this.questionBREATH.nativeElement.onclick = () => this.globalService.openModal(this.openScreen);

      this.showBRTphrase();
      this.calculateWeeklyProgress();

      /// Language greeting logic
      const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
      const fullName = localStorage.getItem('currentUserName') || '';
      const userName = fullName.split(' ')[0];
      const currentHour = new Date().getHours();

      let greeting = '';
      if (isPortuguese) {
        this.globalService.hideElementsByClass('english');
        this.globalService.showElementsByClass('portuguese');
        if (currentHour < 12) {
          greeting = 'Bom dia';
        } else if (currentHour < 18) {
          greeting = 'Boa tarde';
        } else {
          greeting = 'Boa noite';
        }
        this.username.nativeElement.innerHTML = `${greeting}, ${userName}`;
      } else {
        this.globalService.hideElementsByClass('portuguese');
        this.globalService.showElementsByClass('english');
        if (currentHour < 12) {
          greeting = 'Good morning';
        } else if (currentHour < 18) {
          greeting = 'Good afternoon';
        } else {
          greeting = 'Good evening';
        }
        this.username.nativeElement.innerHTML = `${greeting}, ${userName}`;
      }
    } finally {
      // ✅ Ensure splash always goes away even if something throws
      setTimeout(() => {
        this.showWebSplash = false;
      }, 1000);
    }
  }
  timeStringToSeconds(time: string): number {
    const [minutes, seconds] = time.split(':').map(Number);
    return minutes * 60 + seconds;
  }
 showBRTphrase() {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    const storedResults = localStorage.getItem('brtResults');
    const brtResults = storedResults ? JSON.parse(storedResults) : [];

    // ✅ Use local date in consistent format (YYYY-MM-DD)
    const today = new Date();
    const todayLocalDate = today.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

    const todayResults = brtResults.filter((result: any) => {
      const resultDate = new Date(result.date);
      const resultLocalDate = resultDate.toLocaleDateString('en-CA'); // also 'YYYY-MM-DD'
      return resultLocalDate === todayLocalDate;
    });

    if (todayResults.length === 0) {
      this.noBRTresult.nativeElement.style.display = 'block';
      this.BRTresult.nativeElement.style.display = 'none';
    } else {
      const latest = todayResults[todayResults.length - 1];
      const result = this.timeStringToSeconds(latest.result); 
      this.latestBRTResultInSeconds = result;
      this.BRTresult.nativeElement.style.display = 'block';
      this.noBRTresult.nativeElement.style.display = 'none';
    }
  }
  calculateWeeklyProgress(): void {
    const exerciseKeys = [
      'brtResults','HATResults', 'HATCResults', 'AHATResults',
      'WHResults', 'KBResults', 'BBResults', 'YBResults', 'BREResults',
      'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults',
      'CBResults', 'RBResults', 'NBResults', 'CUSTResults', 'LungsResults',
      'YogaResults', 'DBResults', 'HUMResults', 'TIMERResults'
    ];

    const today = new Date();
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // --- Define current week range (Mon–Sun) ---
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday of current week
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // --- Reset weekly circles ---
    const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    for (const day of allDays) {
      const circle = document.getElementById(`circle-${day}`);
      if (circle) circle.style.backgroundColor = 'white';
    }

    const activeDays = new Set<string>();
    const activeDates = new Set<string>();
    let weeklySessionCount = 0;

    // --- Gather all exercise data ---
    for (const key of exerciseKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entries = JSON.parse(raw);

      for (const result of entries) {
        const dateUTC = new Date(result.date);
        const localDate = new Date(
          dateUTC.toLocaleString('en-US', { timeZone: localTimezone })
        );
        const localDateOnly = new Date(
          localDate.getFullYear(),
          localDate.getMonth(),
          localDate.getDate()
        );
        const dateKey = localDateOnly.toISOString().split('T')[0];
        activeDates.add(dateKey);

        // ✅ Only count sessions inside this week
        if (localDateOnly >= monday && localDateOnly <= sunday) {
          const weekday = localDateOnly.getDay(); // 0 = Sun, 6 = Sat
          const keyDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday];
          activeDays.add(keyDay);
          weeklySessionCount++;
        }
      }
    }

    this.numberOfWeekSessions = weeklySessionCount;
    const isPT = this.isPortuguese;

    // --- CURRENT streak logic (no more "longest streak ever" bullshit) ---
    const sortedDates = Array.from(activeDates).sort(); // ['2025-01-01', '2025-01-02', ...]
    let streak = 0;

    if (sortedDates.length) {
      const oneDayMs = 1000 * 60 * 60 * 24;
      streak = 1; // at least 1 day if there is any practice
      let prev = new Date(sortedDates[0]);

      for (let i = 1; i < sortedDates.length; i++) {
        const curr = new Date(sortedDates[i]);
        const diffDays = Math.round(
          (curr.getTime() - prev.getTime()) / oneDayMs
        );

        if (diffDays === 1) {
          // consecutive day → streak continues
          streak++;
        } else if (diffDays > 1) {
          // gap → streak resets and starts again from this day
          streak = 1;
        }

        prev = curr;
      }

      // 🔒 If last practice was more than 1 full day ago, streak is no longer "active"
      const lastDate = new Date(sortedDates[sortedDates.length - 1]);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const diffToToday = Math.floor(
        (todayStart.getTime() - lastDate.getTime()) / oneDayMs
      );
      if (diffToToday > 1) {
        streak = 0;
      }
    }

    // --- Display logic (bulletproof as you requested) ---
    if (streak >= 5) {
      this.numberOfSessions.nativeElement.innerHTML = isPT
        ? `Parabéns! ${streak} ${streak === 1 ? 'dia' : 'dias'} de treino seguidos!!`
        : `Well done! ${streak} ${streak === 1 ? 'day' : 'days'} of practice in a row!`;
    } else if (this.numberOfWeekSessions === 0) {
      this.numberOfSessions.nativeElement.innerHTML = isPT
        ? 'Você ainda não praticou essa semana'
        : 'You have not practiced this week yet';
    } else {
      this.numberOfSessions.nativeElement.innerHTML = isPT
        ? `Você já praticou ${this.numberOfWeekSessions}x essa semana`
        : `You have practiced ${this.numberOfWeekSessions}x this week`;
    }

    // --- Fill current week circles ---
    const filledColor = '#49B79D';
    for (const day of activeDays) {
      const circle = document.getElementById(`circle-${day}`);
      if (circle) circle.style.backgroundColor = filledColor;
    }
  }




  async shareOpenScreen() {
    if (this._sharing || !this.selectedQuote) return;
    this._sharing = true;

    try {
      const canvas = document.createElement('canvas');
      const width = 1080; // Instagram Story format
      const height = 1920;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // --- BACKGROUND GRADIENT ---
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#E8F7F6"); // soft turquoise top
      gradient.addColorStop(1, "#FFFFFF"); // white bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const quote = this.selectedQuote.text;
      const author = this.selectedQuote.author;

      

      // Load custom font (if available)
      try { await (document as any).fonts?.load?.('70px DellaRespira'); } catch {}

      // --- DRAW QUOTE BLOCK ---
      function drawQuoteBlock(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        canvasWidth: number,
        canvasHeight: number,
        baseFont: string = "70px DellaRespira",
        lineHeight: number = 85
      ) {
        const maxWidth = canvasWidth * 0.8; // balanced side margins

        ctx.font = baseFont;
        const fontFamily = baseFont.split(" ").slice(1).join(" ");
        let fontSize = parseInt(baseFont);

        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";

        // Word wrap
        for (const word of words) {
          const testLine = currentLine + word + " ";
          if (ctx.measureText(testLine).width > maxWidth) {
            lines.push(currentLine.trim());
            currentLine = word + " ";
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine.trim());

        // Shrink font if needed
        let widest = 0;
        for (const line of lines) widest = Math.max(widest, ctx.measureText(line).width);
        while (widest > maxWidth && fontSize > 28) {
          fontSize -= 2;
          ctx.font = `${fontSize}px ${fontFamily}`;
          widest = 0;
          for (const line of lines) widest = Math.max(widest, ctx.measureText(line).width);
        }

        const blockHeight = lines.length * lineHeight;
        const startY = (canvasHeight - blockHeight) / 2;

        // Draw each line normally (no letter spacing)
        ctx.textAlign = "center";
        ctx.fillStyle = "#0661AA";
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], x, startY + i * lineHeight);
        }

        return { blockHeight, startY };
      }

      const { blockHeight, startY } = drawQuoteBlock(ctx, quote, width / 2, width, height);
      
      // --- LOGO ---
      const logo = new Image();
      logo.src = 'assets/images/splash.png';
      await new Promise<void>((resolve, reject) => {
        logo.onload = () => {
          const logoSize = 400;
          ctx.drawImage(logo, (width - logoSize) / 2, 350, logoSize, logoSize/2);
          resolve();
        };
        logo.onerror = reject;
      });

      // --- AUTHOR ---
      ctx.font = "42px Arial";
      ctx.fillStyle = "#0660aa9f";
      const authorY = startY + blockHeight + 70;
      ctx.fillText(`- ${author}`, width / 2, authorY);


      // --- SAVE TO FILE ---
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

      // --- SHARE ---
      await Share.share({
        title: this.isPortuguese ? 'Compartilhar citação' : 'Share quote',
        text: 'brizabreath.com',
        files: [uri]
      });

      // --- CLEANUP OLD FILES ---
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
      }

    } catch (err) {
      console.error('shareOpenScreen error:', err);
    } finally {
      this._sharing = false;
    }
  }



  startAppGuide() {
    this.globalService.closeModal(this.openScreen);
    this.isModalOpen = true;  // ✅ unhide page
    setTimeout(() => this.startBreathTourNow(), 0);
  }
  private langKey(): 'EN' | 'PT' {
    const isPT = localStorage.getItem('isPortuguese') === 'true';
    return isPT ? 'PT' : 'EN';
  }

  private pickRandom<T>(arr: T[]): T | null {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  async loadRandomQuote(): Promise<void> {
    const db = this.firebaseService.firestore;
    const lang = this.langKey();
    const cacheKey = `cachedQuotes_${lang}`;

    // 1) Online → read Firestore
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

    // 2) Fallback → cache (offline or query failed)
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const arr = JSON.parse(cached) as { text: string; author: string }[];
      const pick = this.pickRandom(arr);
      if (pick) {
        this.selectedQuote = { text: pick.text, author: pick.author };
        return;
      }
    }

    // 3) Final fallback
    this.selectedQuote = { text: 'Breathe in. Breathe out.', author: '—' };
  }
}