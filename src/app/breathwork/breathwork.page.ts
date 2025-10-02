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
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private _sharing = false;

constructor(private globalService: GlobalService, private router: Router, private firebaseService: FirebaseService) {}
  private startBreathTourNow() {
    localStorage.setItem('startHomeTour','true');
    this.router.navigateByUrl('/home');  
  }
  async ionViewWillEnter() {
    await this.loadRandomQuote();

    if (!BreathworkPage.hasInitialized) {
      BreathworkPage.hasInitialized = true;
      this.isModalOpen = true;
      this.globalService.openModal(this.openScreen);
    }
    //modal events set up
    this.closeModalButtonBREATH2.nativeElement.onclick = () => {
      this.globalService.closeModal(this.openScreen);
      this.isModalOpen = true;  // ✅ unhide page
    };
    this.questionBREATH.nativeElement.onclick = () => this.globalService.openModal(this.openScreen);
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
      const width = 800, height = 600;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const quote = this.selectedQuote.text;
      const author = this.selectedQuote.author;

      // Load font (if available)
      try { await (document as any).fonts?.load?.('55px DellaRespira'); } catch {}

      // --- DRAW QUOTE BLOCK ---
      function drawQuoteBlock(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        canvasWidth: number,
        canvasHeight: number,
        baseFont: string = "55px DellaRespira",
        lineHeight: number = 56
      ) {
        const maxWidth = canvasWidth * 2 / 3;

        // Start with base font
        ctx.font = baseFont;
        const fontFamily = baseFont.split(" ").slice(1).join(" ");
        let fontSize = parseInt(baseFont);

        // Split into lines (word wrap)
        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";

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

        // Check widest line
        let widest = 0;
        for (const line of lines) {
          widest = Math.max(widest, ctx.measureText(line).width);
        }

        // Shrink font if needed (affects all lines)
        while (widest > maxWidth && fontSize > 20) {
          fontSize -= 2;
          ctx.font = `${fontSize}px ${fontFamily}`;
          widest = 0;
          for (const line of lines) {
            widest = Math.max(widest, ctx.measureText(line).width);
          }
        }

        // Vertically center block
        const blockHeight = lines.length * lineHeight;
        const startY = (canvasHeight - blockHeight) / 2;

        // Draw each line
        ctx.textAlign = "center";
        ctx.fillStyle = "#0661AA";
        lines.forEach((line, i) => {
          ctx.fillText(line, x, startY + i * lineHeight);
        });

        return {
          fontSize,
          lineCount: lines.length,
          blockHeight,
          startY
        };
      }

      const { lineCount, blockHeight, startY } = drawQuoteBlock(
        ctx,
        quote,
        width / 2,
        width,
        height
      );

      // --- DRAW AUTHOR ---
      ctx.font = "italic 28px Arial";
      ctx.fillStyle = "#0661AA";
      const authorY = startY + blockHeight + 15;
      ctx.fillText(`- ${author}`, width / 2, authorY);

      // --- DRAW LOGO ---
      const logo = new Image();
      logo.src = 'assets/images/blogo.png';
      await new Promise<void>((resolve, reject) => {
        logo.onload = () => {
          const logoSize = 70;
          ctx.drawImage(logo, (width - logoSize) / 2, authorY + 35, logoSize, logoSize);
          resolve();
        };
        logo.onerror = reject;
      });

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

      await new Promise(r => setTimeout(r, 80)); // small delay

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
          .sort((a, b) => (a.name > b.name ? -1 : 1)); // newest first

        const oldFiles = brizaFiles.slice(3); // keep only 3 latest
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