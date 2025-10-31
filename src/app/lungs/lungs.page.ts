import { Component, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import Player from '@vimeo/player';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FirebaseService } from '../services/firebase.service';
import { VimeoMetaService } from '../services/vimeo-meta.service';
import { GlobalAlertService } from '../services/global-alert.service';


@Component({
  selector: 'app-lungs',
  templateUrl: './lungs.page.html',
  styleUrls: ['./lungs.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class LungsPage implements OnDestroy {
  isModalOpen = false;
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  watchedLE = false;

  vimeoUrlEN: SafeResourceUrl | null = null;
  vimeoUrlPT: SafeResourceUrl | null = null;

  @ViewChild('vimeoEN') vimeoENRef!: ElementRef<HTMLIFrameElement>;
  @ViewChild('vimeoPT') vimeoPTRef!: ElementRef<HTMLIFrameElement>;

  private enPlayer?: Player;
  private ptPlayer?: Player;

  private enLoaded = false;
  private ptLoaded = false;
  showWebSplash = false;

  constructor(
    private navCtrl: NavController,
    private globalService: GlobalService,
    private firebaseService: FirebaseService,
    private vimeoMeta: VimeoMetaService,
    private sanitizer: DomSanitizer,
    private globalAlert: GlobalAlertService
  ) {}

  async ionViewWillEnter() {
    this.showWebSplash = true;
    // Toggle language visibility (same as before)
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    // Load URLs (online → Firestore, offline → cache)
    if (navigator.onLine) {
      try {
        await this.loadLungsVideosFromFirestore();
      } catch (e) {
        console.warn('Lungs fetch failed, trying cache:', e);
        this.showWebSplash = false;
      }
    }else{
      if (!this.isPortuguese) {
        this.globalAlert.showalert('OFFLINE', '🌐 You are offline.\n\nConnect to the internet to watch this video');
      } else {
        this.globalAlert.showalert('OFFLINE', '🌐 Você está offline.\n\nConecte-se à internet para assistir a este vídeo');
      }
      this.showWebSplash = false;
    }
    if (!this.vimeoUrlEN || !this.vimeoUrlPT) {
      const cached = localStorage.getItem('cachedLungs');
      if (cached) {
        const { en, pt } = JSON.parse(cached);
        if (en && !this.vimeoUrlEN) this.vimeoUrlEN = this.toSafePlayerUrl(en);
        if (pt && !this.vimeoUrlPT) this.vimeoUrlPT = this.toSafePlayerUrl(pt);
      }
    }

    // Now that src is set, init players and tracking
    this.initPlayers();
    this.setupActivePlayerTracking();
  }

  ionViewWillLeave() {
    this.destroyPlayers();
  }

  ngOnDestroy(): void {
    this.destroyPlayers();
  }

  goBack(): void {
    this.navCtrl.back();
  }

  /**
   * Optional: if you add (load)="onIframeLoad('EN'|'PT')" in the template,
   * this guarantees the Vimeo iframe finished loading before creating a Player.
   */
  onIframeLoad(lang: 'EN' | 'PT') {
    if (lang === 'EN') this.enLoaded = true;
    if (lang === 'PT') this.ptLoaded = true;

    // Create players if not already created
    if (lang === 'EN' && !this.enPlayer && this.vimeoENRef?.nativeElement) {
      this.enPlayer = new Player(this.vimeoENRef.nativeElement);
      this.enPlayer.on('error', (e: any) => console.warn('Vimeo EN error', e));
    }
    if (lang === 'PT' && !this.ptPlayer && this.vimeoPTRef?.nativeElement) {
      this.ptPlayer = new Player(this.vimeoPTRef.nativeElement);
      this.ptPlayer.on('error', (e: any) => console.warn('Vimeo PT error', e));
    }

    // (Re)wire events for the active language
    this.setupActivePlayerTracking();
  }

  private initPlayers() {
    // Creates players if iframe elements are present.
    // Safe even if onIframeLoad is also used; we call .off() before wiring events.
    if (!this.enPlayer && this.vimeoENRef?.nativeElement) {
      this.enPlayer = new Player(this.vimeoENRef.nativeElement);
      this.enPlayer.on('error', (e: any) => console.warn('Vimeo EN error', e));
    }
    if (!this.ptPlayer && this.vimeoPTRef?.nativeElement) {
      this.ptPlayer = new Player(this.vimeoPTRef.nativeElement);
      this.ptPlayer.on('error', (e: any) => console.warn('Vimeo PT error', e));
    }
  } 

  private setupActivePlayerTracking() {
    this.watchedLE = false;

    const player = this.isPortuguese ? this.ptPlayer : this.enPlayer;
    if (!player) return;

    player.off('play');
    player.off('timeupdate');
    player.off('ended');


    player.on('timeupdate', (data: { seconds: number; duration: number }) => {
      if (this.watchedLE) return;
      if (data.duration > 0 && data.seconds / data.duration >= 0.95) {
        this.saveLungsExpansion(this.formatTime(data.seconds));
        this.watchedLE = true;
      }
    });

    player.on('ended', async () => {
      const duration = await player.getDuration();
      if (!this.watchedLE) {
        this.saveLungsExpansion(this.formatTime(duration));
        this.watchedLE = true;
      }
    });
  }

  private destroyPlayers() {
    if (this.enPlayer) {
      this.enPlayer.unload().catch(() => {});
      this.enPlayer = undefined;
    }
    if (this.ptPlayer) {
      this.ptPlayer.unload().catch(() => {});
      this.ptPlayer = undefined;
    }
    this.enLoaded = false;
    this.ptLoaded = false;
  }

  private formatTime(secondsFloat: number): string {
    const seconds = Math.max(0, Math.floor(secondsFloat));
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${this.padZero(minutes)} : ${this.padZero(secs)}`;
  }

  private padZero(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }

  private saveLungsExpansion(minutesWatched: string): void {
    const savedResults = JSON.parse(localStorage.getItem('LungsResults') || '[]');
    savedResults.push({
      date: new Date().toISOString(),
      result: minutesWatched,
    });
    localStorage.setItem('LungsResults', JSON.stringify(savedResults));
  }

  private pickLatest(docs: any[]) {
    if (!docs.length) return null;
    // Prefer by createdAt if present (Firestore Timestamp); fallback to first
    return docs
      .slice()
      .sort((a, b) => {
        const as = a?.createdAt?.seconds ?? 0;
        const bs = b?.createdAt?.seconds ?? 0;
        return bs - as;
      })[0];
  }

  private toSafePlayerUrl(raw: string): SafeResourceUrl {
    // Reuse your VimeoMetaService transformer if the DB stores normal Vimeo links
    const player = this.vimeoMeta.toPlayerUrl(raw); // e.g., https://player.vimeo.com/video/12345?h=...
    return this.sanitizer.bypassSecurityTrustResourceUrl(player);
  }

  private async loadLungsVideosFromFirestore(): Promise<void> {
    this.showWebSplash = true;
    const db = this.firebaseService.firestore;
    if (!db) return;

    // Pull every video with category === 'lungs'
    const colRef = collection(db, 'videos');
    const qRef = query(colRef, where('category', '==', 'lungs'));
    const snap = await getDocs(qRef);
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const enList = list.filter(v => (v.language || v.lang) === 'EN');
    const ptList = list.filter(v => (v.language || v.lang) === 'PT');

    const enPick = this.pickLatest(enList) || enList[0] || list.find(v => (v.language || v.lang) === 'EN') || list[0];
    const ptPick = this.pickLatest(ptList) || ptList[0] || list.find(v => (v.language || v.lang) === 'PT') || list[0];

    // Fallbacks if you only have one language in DB
    const enUrlRaw = enPick?.videoUrl || enPick?.url || '';
    const ptUrlRaw = ptPick?.videoUrl || ptPick?.url || '';

    // If URLs are already player URLs, toPlayerUrl will no-op or still work fine.
    if (enUrlRaw) this.vimeoUrlEN = this.toSafePlayerUrl(enUrlRaw);
    if (ptUrlRaw) this.vimeoUrlPT = this.toSafePlayerUrl(ptUrlRaw);

    // Cache for offline (optional)
    const cache = { en: enUrlRaw || null, pt: ptUrlRaw || null };
    localStorage.setItem('cachedLungs', JSON.stringify(cache));
    setTimeout(() => {
      this.showWebSplash = false;
    }, 1000);  
  }
}
