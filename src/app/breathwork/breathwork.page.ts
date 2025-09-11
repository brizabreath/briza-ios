import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CoreModule } from '../core.module'; 
import { Router, RouterModule } from '@angular/router'; // Import RouterModule
import { GlobalService } from '../services/global.service';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ShepherdService } from 'angular-shepherd';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FirebaseService } from '../services/firebase.service';



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
export class BreathworkPage implements AfterViewInit {
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
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private _sharing = false;

constructor(private globalService: GlobalService, private shepherd: ShepherdService, private router: Router, private firebaseService: FirebaseService) {}
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
      popperOptions: { strategy: 'fixed' } // keeps it from sticking to the top
    } as any;
    this.shepherd.modal = true;

    const anchor =
    (document.querySelector('#hp-brt') as HTMLElement)?.offsetParent
      ? '#hp-brt'
      : '.logoimg';

    this.shepherd.addSteps([
      {
        id: 'hp-brt',
        text: `<h3>${t('Briza Retention Test','Teste de Retenção Briza')}</h3>
              <p>${t('Do this quick test daily to track how your breathing and fitness improvement',
                      'Faça este teste rápido diariamente para acompanhar a evolução da sua respiração e condicionamento')}</p>`,
        attachTo: { element: anchor, on: 'bottom' },
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

     // Hook events on the raw Shepherd tour (not on the service)
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
  }
  ionViewDidLeave() {
    this.unlockUIForTour();
  }
  async ngAfterViewInit(): Promise<void> {
    await this.loadRandomQuote();

    if (!BreathworkPage.hasInitialized) {
      BreathworkPage.hasInitialized = true;
      // ✅ This code only runs once after app launch
      this.globalService.openModal(this.openScreen);
    } 
    //modal events set up
    this.closeModalButtonBREATH2.nativeElement.onclick = () => this.globalService.closeModal(this.openScreen);
    this.questionBREATH.nativeElement.onclick = () => this.globalService.openModal(this.openScreen);
  }
  ionViewWillEnter() {
    localStorage.setItem('isPortuguese', 'false');
    this.showBRTphrase();
    this.calculateWeeklyProgress();
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    const userName = localStorage.getItem('currentUserName') || '';
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
      'HATResults', 'HATCResults', 'AHATResults', 
      'WHResults', 'KBResults', 'BBResults', 'YBResults', 'BREResults', 
      'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults', 
      'CBResults', 'RBResults', 'NBResults', 'CUSTResults', "LungsResults"
    ];

    const today = new Date();
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    // Reset all circles to white first
    const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    for (const day of allDays) {
      const circle = document.getElementById(`circle-${day}`);
      if (circle) circle.style.backgroundColor = 'white';
    }

    const activeDays = new Set<string>();
    let sessionCount = 0;

    for (const key of exerciseKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const entries = JSON.parse(raw);
      for (const result of entries) {
        const dateUTC = new Date(result.date);
        const localDate = new Date(dateUTC.toLocaleString('en-US', { timeZone: localTimezone }));
        const localDateOnly = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate());

        if (localDateOnly >= monday) {
          const weekday = localDateOnly.getDay(); // 0 (Sun) to 6 (Sat)
          const key = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday];
          activeDays.add(key);
          sessionCount++;
        }
      }
    }

    this.numberOfWeekSessions = sessionCount;
    if(this.numberOfWeekSessions == 0){
      this.numberOfSessions.nativeElement.innerHTML = this.isPortuguese? "Voce ainda nao praticou essa semana" : "You have not practiced this week yet";
    }
    else{
      this.numberOfSessions.nativeElement.innerHTML = this.isPortuguese? "Você já praticou " + this.numberOfWeekSessions + "x essa semana" : "You have practiced " + this.numberOfWeekSessions + "x this week";
    }
    // Fill circles based on actual data
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
      const width = 800, height = 500;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Logo
      const logo = new Image();
      logo.src = 'assets/images/splash.png';
      await new Promise<void>((resolve, reject) => {
        logo.onload = () => {
          const logoSize = 150;
          ctx.drawImage(logo, (width - logoSize * 2) / 2, 60, logoSize * 2, logoSize);
          resolve();
        };
        logo.onerror = reject;
      });
      const quote = this.selectedQuote.text;
      const author = this.selectedQuote.author;
      ctx.fillStyle = '#0661AA';
      try { await (document as any).fonts?.load?.('36px DellaRespira'); } catch {}
      ctx.font = '40px DellaRespira';
      ctx.textAlign = 'center';

      const words = quote.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine + word + ' ';
        if (ctx.measureText(testLine).width > width - 120) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine.trim());

      const startY = 300;
      const lineHeight = 50;
      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, startY + i * lineHeight);
      });

      ctx.font = 'italic 28px Arial';
      ctx.fillText(`- ${author}`, width / 2, startY + lines.length * lineHeight + 40);

      // Save to file
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

      // Short delay to prevent UI race conditions
      await new Promise(r => setTimeout(r, 80));

      // Share
      await Share.share({
        title: this.isPortuguese ? 'Compartilhar citação' : 'Share quote',
        text: this.isPortuguese
          ? 'Confira esta citação inspiradora do aplicativo Briza Breath and Performance'
          : 'Check out this inspiring quote from the Briza Breath and Performance App',
        files: [uri]
      });

      // ✅ Cleanup: remove older briza_* files, keep only the last 3
      try {
        const dir = await Filesystem.readdir({ directory: Directory.Cache, path: '' });
        const brizaFiles = dir.files
          .filter(f => f.name.startsWith('briza_') && f.name.endsWith('.jpeg'))
          .sort((a, b) => (a.name > b.name ? -1 : 1)); // newest first

        const oldFiles = brizaFiles.slice(3); // keep 3 latest
        for (const file of oldFiles) {
          await Filesystem.deleteFile({ directory: Directory.Cache, path: file.name });
        }
      } catch (cleanupErr) {
        console.warn('Cleanup skipped:', cleanupErr);
      }

    } catch (err) {
      console.error('shareOpenScreen error:', err);
      alert(this.isPortuguese
        ? 'Não foi possível compartilhar agora.'
        : 'Couldn’t share right now.');
    } finally {
      this._sharing = false;
    }
  }

  startAppGuide() {
    this.globalService.closeModal(this.openScreen);
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
  private lockUIForTour = () => {
    document.documentElement.classList.add('tour-active');
    document.body.style.overflow = 'hidden'; // stop background scroll
  };

  private unlockUIForTour = () => {
    document.documentElement.classList.remove('tour-active');
    document.body.style.overflow = '';
  };
}