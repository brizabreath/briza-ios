import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, NavController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { collection } from 'firebase/firestore';
import { getDocsFromServer } from 'firebase/firestore';

import { CoreModule } from '../core.module';
import { GlobalService } from '../services/global.service';
import { FirebaseService } from '../services/firebase.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { VimeoMetaService } from '../services/vimeo-meta.service';
import { VideoModalComponent } from '../modals/video-modal.component';

@Component({
  selector: 'app-movement',
  templateUrl: './movement.page.html',
  styleUrls: ['./movement.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, CoreModule, RouterModule],
})
export class MovementPage {
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  isMember = false;

  private likedKey = 'likedYogaIds';

  yogaVideos: any[] = [];
  mobilityVideos: any[] = [];
  beginnerVideos: any[] = [];
  private readonly HIDDEN_SERIES_ID = 'VIPHXCMOoNOqoJS8NVkh';
  // NEW: series cards for Movement page
  seriesCards: Array<{
    id: string;
    title: string;
    thumbnail: string;
    language: 'EN' | 'PT';
    urls: string[];
    accessCodeId?: string;
    addOn?: any;
    isUnlocked: boolean;
  }> = [];

  private readonly YOGA_CATEGORY_KEYS = ['slowdown', 'move'];
  private readonly MOBILITY_CATEGORY_KEYS = ['mobility'];

  constructor(
    private globalService: GlobalService,
    private navCtrl: NavController,
    private firebaseService: FirebaseService,
    private sanitizer: DomSanitizer,
    private modalCtrl: ModalController,
    private globalAlert: GlobalAlertService,
    private vimeoMeta: VimeoMetaService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.isMember = localStorage.getItem('membershipStatus') === 'active';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    window.addEventListener('briza:seriesAccessUpdated', () => {
      this.applySeriesUnlockState();
    });
    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
        this.loadMovementData().catch(() => {});
      }
      if (e.key === 'membershipStatus') {
        this.isMember = e.newValue === 'active';
        // series cards also depend on member status (lock display)
        this.applySeriesUnlockState();
      }
      // if you store redeemed series access locally, you can refresh on that key too
      if (e.key === 'seriesAccessCache') {
        this.applySeriesUnlockState();
      }
    });

    await this.loadMovementData();
  }

  private async loadMovementData() {
    // 1) cached videos (fast/offline)
    const cachedVideoObj = this.readCachedYogaVideos();
    const cachedVideos = cachedVideoObj.videos;

    const cachedNormalized = (cachedVideos || []).map((v: any) => ({
      ...v,
      videoUrl: v.videoUrl || this.vimeoMeta.toPlayerUrl(v.url || ''),
      isFree: !!v.isFree,
    }));

    this.applyMovementFilters(cachedNormalized);

    // series cards from server (and optionally from cache later)
    await this.loadSeriesCards(cachedNormalized);

    // 2) offline? stop here
    if (!navigator.onLine || !this.firebaseService.firestore) return;

    // 3) refresh videos from server
    const colRef = collection(this.firebaseService.firestore, 'videos');
    const snap = await getDocsFromServer(colRef);

    const serverVideos = snap.docs.map((d) => {
      const v = d.data() as any;
      const rawUrl = v.url || v.videoUrl || '';
      return {
        id: d.id,
        ...v,
        videoUrl: this.vimeoMeta.toPlayerUrl(rawUrl),
        isFree: !!v.isFree,
      };
    });

    this.applyMovementFilters(serverVideos);
    localStorage.setItem(
      'cachedYogaVideos',
      JSON.stringify({ ts: Date.now(), videos: serverVideos })
    );
    // refresh series cards again using freshest video list for thumbnails
    await this.loadSeriesCards(serverVideos);
  }

  // -----------------------------
  // Videos: Yoga / Mobility / Beginner
  // -----------------------------
  private applyMovementFilters(list: any[]) {
    const selectedLanguage = this.isPortuguese ? 'PT' : 'EN';
    const member = this.isMemberActive();
    const inLang = (list || []).filter((v) => v.language === selectedLanguage);

    const yogaAll = this.filterByExactCategories(inLang, ['slowdown', 'move']);
    const mobilityAll = this.filterByExactCategories(inLang, this.MOBILITY_CATEGORY_KEYS);
    const beginnerAll = this.filterHashtagInDescription(inLang, '#beginner');

    const orderVideos = (videos: any[]) => {
      return !member
        ? [
            ...this.newestFirst(videos.filter(v => !!v.isFree)),
            ...this.newestFirst(videos.filter(v => !v.isFree)),
          ]
        : this.newestFirst(videos);
    };

    this.yogaVideos = orderVideos(yogaAll).slice(0, 10);
    this.mobilityVideos = orderVideos(mobilityAll);
    this.beginnerVideos = orderVideos(beginnerAll);
  }

  private filterByExactCategories(list: any[], categories: string[]) {
  const cats = (categories || []).map((c) => this.normalize(c));
  return (list || []).filter((v) => {
    const cat = this.normalize(v.category || '');
    return cats.includes(cat);
  });
}
  private shuffle<T>(arr: T[]): T[] {
    const a = [...(arr || [])];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  private filterHashtagInDescription(list: any[], hashtag: string) {
    const tag = (hashtag || '').toLowerCase();
    return (list || []).filter((v) => {
      const desc = (v.description || '').toString().toLowerCase();
      return desc.includes(tag);
    });
  }

  private buildFeaturedList(list: any[], randomFreeCount: number, newestCount: number): any[] {
    const arr = [...(list || [])];

    const free = arr.filter((v) => !!v.isFree);
    const randomFree = this.pickRandomUnique(free, randomFreeCount);

    const newest = this.newestFirst(arr).slice(0, newestCount);

    const out: any[] = [];
    const seen = new Set<string>();
    const keyOf = (v: any) => String(v?.id || v?.videoId || v?.videoUrl || v?.url || '');

    for (const v of [...randomFree, ...newest]) {
      const k = keyOf(v);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(v);
    }
    return out;
  }

  private pickRandomUnique(list: any[], n: number): any[] {
    const a = [...(list || [])];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.max(0, n));
  }

  private newestFirst(list: any[]): any[] {
    const arr = [...(list || [])];
    arr.sort((a, b) => this.getAddedOnMs(b) - this.getAddedOnMs(a));
    return arr;
  }

  private getAddedOnMs(v: any): number {
    const x = v?.addedOn;
    if (!x) return 0;

    if (typeof x === 'object' && typeof x.toDate === 'function') {
      try { return x.toDate().getTime(); } catch { return 0; }
    }

    if (typeof x === 'object' && typeof x.seconds === 'number') {
      return x.seconds * 1000 + Math.floor((x.nanoseconds || 0) / 1e6);
    }

    if (typeof x === 'number') return x;

    if (typeof x === 'string') {
      const s = x.trim();

      // dd/mm/yy or dd/mm/yyyy
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
      if (m) {
        const dd = Number(m[1]);
        const mm = Number(m[2]);
        let yy = Number(m[3]);

        if (m[3].length === 2) yy = 2000 + yy;

        const d = new Date(yy, mm - 1, dd, 12, 0, 0);
        const ts = d.getTime();
        return Number.isFinite(ts) ? ts : 0;
      }

      const t = Date.parse(s);
      return isNaN(t) ? 0 : t;
    }

    return 0;
  }

  // -----------------------------
  // NEW: Series cards
  // -----------------------------
  private async loadSeriesCards(knownVideos: any[]) {
    const db = this.firebaseService.firestore;
    if (!db) {
      this.seriesCards = [];
      return;
    }

    try {
      const snap = await getDocsFromServer(collection(db, 'series'));
      const selectedLanguage = this.isPortuguese ? 'PT' : 'EN';

      const allSeries = snap.docs
        .map((d) => {
          const s = d.data() as any;
          return {
            id: d.id,
            title: (s.title || '').trim(),
            language: s.language,
            urls: Array.isArray(s.urls) ? s.urls : [],
            accessCodeId: s.accessCodeId ? String(s.accessCodeId) : undefined,
            imgUrl: (s.imgUrl || '').trim(),
            addOn: s.addOn ?? null,
          };
        })
        // hide your sample series doc
        .filter((s) => s.id !== this.HIDDEN_SERIES_ID);

      const inLang = allSeries.filter((s) => s.language === selectedLanguage);

      const cards = inLang.map((s) => {
        const hero = (s.imgUrl || '').trim();

        // fallback to first video thumb if no hero image
        const firstUrl = (s.urls?.[0] || '').trim();
        const match = this.findVideoByRawUrl(knownVideos, firstUrl);
        const fallbackThumb = (match?.thumbnail || 'assets/images/default.jpg').trim();

        return {
          ...s,
          thumbnail: hero || fallbackThumb,
          isUnlocked: false,
        };
      });

      // latest added first
      this.seriesCards = cards.sort((a, b) => this.getSeriesAddedOnMs(b) - this.getSeriesAddedOnMs(a));

      this.applySeriesUnlockState();
    } catch (e) {
      console.error('Failed to load series:', e);
      this.seriesCards = [];
    }
  }
  private getSeriesAddedOnMs(s: any): number {
    const x = s?.addOn;
    if (!x) return 0;

    if (typeof x === 'object' && typeof x.toDate === 'function') {
      try { return x.toDate().getTime(); } catch { return 0; }
    }

    if (typeof x === 'object' && typeof x.seconds === 'number') {
      return x.seconds * 1000 + Math.floor((x.nanoseconds || 0) / 1e6);
    }

    if (typeof x === 'number') return x;

    if (typeof x === 'string') {
      const t = Date.parse(x);
      return isNaN(t) ? 0 : t;
    }

    return 0;
  }
  private findVideoByRawUrl(videoList: any[], rawUrl: string): any | null {
    if (!rawUrl) return null;
    const norm = this.normalizeUrl(rawUrl);

    // You said series url == videos.url (raw). So match against v.url primarily.
    const byRaw = (videoList || []).find((v) => this.normalizeUrl(v.url || '') === norm);
    if (byRaw) return byRaw;

    // Fallback: sometimes only player url exists; compare player form too.
    const playerNorm = this.normalizeUrl(this.vimeoMeta.toPlayerUrl(rawUrl));
    const byPlayer = (videoList || []).find((v) => this.normalizeUrl(v.videoUrl || '') === playerNorm);
    return byPlayer || null;
  }

  private normalizeUrl(u: string): string {
    return (u || '').trim();
  }

  /**
   * series unlock rules:
   * - If member => all series unlocked
   * - If free user => unlocked only if user has active seriesAccess for that seriesId
   */
  private applySeriesUnlockState() {
    const member = this.isMemberActive();

    const activeSeriesIds = member ? new Set<string>() : this.getActiveSeriesAccessIdsFromLocal();

    this.seriesCards = (this.seriesCards || []).map((s) => {
      const unlocked = member ? true : activeSeriesIds.has(s.id);
      return { ...s, isUnlocked: unlocked };
    });
  }

  /**
   * Local cache for series access to avoid hitting Firestore on every page view.
   * You can also load this from /users/{uid} on login and store in localStorage.
   */
  private getActiveSeriesAccessIdsFromLocal(): Set<string> {
    try {
      const raw = localStorage.getItem('seriesAccessCache');
      if (!raw) return new Set();

      const obj = JSON.parse(raw) || {};
      const now = Date.now();

      const ids = Object.keys(obj).filter((seriesId) => {
        const endsAtMs = Number(obj?.[seriesId]?.endsAtMs || 0);
        return endsAtMs > now;
      });

      return new Set(ids);
    } catch {
      return new Set();
    }
  }

  openSeries(s: any) {
    if (!navigator.onLine) {
      const msg = this.isPortuguese
        ? '🌐 Você está offline.\n\nConecte-se à internet para acessar esta série.'
        : '🌐 You are offline.\n\nConnect to the internet to open this series.';
      this.globalAlert.showalert('OFFLINE', msg);
      return;
    }

    // If locked, show modal in SERIES mode
    if (!s.isUnlocked && !this.isMemberActive()) {
      this.globalService.openModal2Safe({ unlockType: 'series', seriesId: s.id });
      return;
    }

    this.router.navigate(['/series', s.id]);
  }

  // -----------------------------
  // Video modal click (unchanged)
  // -----------------------------
  isMemberActive(): boolean {
    return localStorage.getItem('membershipStatus') === 'active';
  }

  async onVideoClick(video: any) {
    if (!navigator.onLine) {
      const msg = this.isPortuguese
        ? '🌐 Você está offline.\n\nConecte-se à internet para assistir a este vídeo'
        : '🌐 You are offline.\n\nConnect to the internet to watch this video';
      this.globalAlert.showalert('OFFLINE', msg);
      return;
    }

    if (video.isFree) {
      await this.playVideo(video);
      return;
    }

    if (!this.isMemberActive()) {
      this.globalService.openModal2Safe();
      return;
    }

    await this.playVideo(video);
  }

  private async playVideo(video: any) {
    const url = this.sanitizer.bypassSecurityTrustResourceUrl(video.videoUrl || video.url);

    const modal = await this.modalCtrl.create({
      component: VideoModalComponent,
      componentProps: {
        url,
        title: video.title,
        description: video.description,
        duration: video.duration,
        videoId: video.id,
        addedOn: video.addedOn,
        category: video.category,
      },
      cssClass: 'video-modal',
    });

    await modal.present();
  }

  // -----------------------------
  // Shared helpers
  // -----------------------------
  private readCachedYogaVideos(): { ts: number; videos: any[] } {
    const cachedRaw = localStorage.getItem('cachedYogaVideos');
    if (!cachedRaw) return { ts: 0, videos: [] };
    try {
      const obj = JSON.parse(cachedRaw);
      return { ts: obj?.ts || 0, videos: obj?.videos || [] };
    } catch {
      return { ts: 0, videos: [] };
    }
  }

  private normalize(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  goBack(): void {
    this.navCtrl.back();
  }

  hasLikedClasses(): boolean {
    const ids: string[] = JSON.parse(localStorage.getItem(this.likedKey) || '[]');
    return ids.length > 0;
  }

  goToLikedClasses(): void {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    if (this.hasLikedClasses()) {
      this.navCtrl.navigateRoot('/yogaLikedPage');
    } else {
      this.globalAlert.showalert(
        this.isPortuguese ? 'Aulas curtidas' : 'Liked classes',
        this.isPortuguese ? 'Você ainda não curtiu de nenhuma aula' : 'You did not like any classes yet'
      );
    }
  }
}