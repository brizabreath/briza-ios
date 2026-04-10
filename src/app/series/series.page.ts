import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { doc, getDoc, collection } from 'firebase/firestore';
import { FirebaseService } from '../services/firebase.service';
import { VimeoMetaService } from '../services/vimeo-meta.service';
import { GlobalService } from '../services/global.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { VideoModalComponent } from '../modals/video-modal.component';
import { getDocsFromServer } from 'firebase/firestore';

@Component({
  selector: 'app-series',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './series.page.html',
  styleUrls: ['./series.page.scss'],
})
export class SeriesPage {
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  isMember = localStorage.getItem('membershipStatus') === 'active';

  seriesId = '';
  series: any = null;
  seriesVideos: any[] = [];
  isSeriesUnlocked = false;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private firebase: FirebaseService,
    private vimeoMeta: VimeoMetaService,
    private sanitizer: DomSanitizer,
    private modalCtrl: ModalController,
    private globalService: GlobalService,
    private globalAlert: GlobalAlertService
  ) {}

  async ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.isMember = localStorage.getItem('membershipStatus') === 'active';

    this.seriesId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.seriesId) return;

    await this.loadSeries();
  }
  ionViewDidEnter() {
    window.addEventListener('briza:seriesAccessUpdated', this.onSeriesAccessUpdated);
  }

  ionViewDidLeave() {
    window.removeEventListener('briza:seriesAccessUpdated', this.onSeriesAccessUpdated);
  }
  private watchedKey = 'watchedYogaIds';

  isWatched(videoId: string): boolean {
    const ids: string[] = JSON.parse(localStorage.getItem(this.watchedKey) || '[]');
    return ids.includes(videoId);
  }
  private onSeriesAccessUpdated = () => {
    // refresh member state too (in case user subscribed)
    this.isMember = localStorage.getItem('membershipStatus') === 'active';
    this.isSeriesUnlocked = this.isMember || this.hasActiveSeriesAccess(this.seriesId);
  };
  private async loadSeries() {
    const db = this.firebase.firestore;
    if (!db) return;

    const sSnap = await getDoc(doc(db, 'series', this.seriesId));
    if (!sSnap.exists()) {
      this.series = null;
      this.seriesVideos = [];
      this.isSeriesUnlocked = false;
      return;
    }

    const s = sSnap.data() as any;

    const selectedLanguage = this.isPortuguese ? 'PT' : 'EN';
    const urls: string[] = Array.isArray(s.urls) ? s.urls : [];

    // ✅ unlock check (does not depend on cache)
    this.isSeriesUnlocked = this.isMember || this.hasActiveSeriesAccess(this.seriesId);

    // -----------------------------
    // 1) Try resolve using cache first
    // -----------------------------
    let videoSource = this.readCachedYogaVideos().videos || [];
    let resolved = this.resolveSeriesVideos(videoSource, urls, selectedLanguage);

    // -----------------------------
    // 2) If nothing resolved, and online, fetch from Firestore and retry
    // -----------------------------
    if (resolved.length === 0 && navigator.onLine) {
      try {
        const snap = await getDocsFromServer(collection(db, 'videos'));
        const serverVideos = snap.docs.map((d) => {
          const v = d.data() as any;
          const raw = v.url || v.videoUrl || '';
          return {
            id: d.id,
            ...v,
            rawUrl: raw,
            videoUrl: this.vimeoMeta.toPlayerUrl(raw),
            thumbnail: (v.thumbnail || '').trim(),
            title: (v.title || '').trim(),
            description: (v.description || '').trim(),
            duration: v.duration ?? null,
          };
        });

        // retry resolve with server list
        resolved = this.resolveSeriesVideos(serverVideos, urls, selectedLanguage);

        // ✅ update cache so next time is instant
        try {
          localStorage.setItem(
            'cachedYogaVideos',
            JSON.stringify({ ts: Date.now(), videos: serverVideos })
          );
        } catch {}
      } catch (e) {
        console.warn('[SeriesPage] Failed to fetch videos from server:', e);
      }
    }

    // -----------------------------
    // 3) Hero thumbnail (use resolved first, else fallback)
    // -----------------------------
    const heroImg = (s.imgUrl || '').trim(); 
    const heroFirst =
      resolved[0] ||
      this.findVideoByRawUrl(videoSource, urls[0] || '');

    const thumbnail =
      heroImg ||
      (heroFirst?.thumbnail || 'assets/images/default.jpg').trim();

    this.series = {
      id: sSnap.id,
      title: (s.title || '').trim(),
      description: (s.description || '').trim(),
      language: s.language,
      urls,
      accessCodeId: s.accessCodeId ? String(s.accessCodeId) : undefined,
      thumbnail,
      imgUrl: heroImg, // optional
    };

    // -----------------------------
    // 4) Save + sort final list
    // -----------------------------
    this.seriesVideos = this.sortByHashOrder(resolved);
  }
  private resolveSeriesVideos(videoList: any[], urls: string[], selectedLanguage: 'EN' | 'PT'): any[] {
    const resolved = (urls || [])
      .map((u) => this.findVideoByRawUrl(videoList, u))
      .filter(Boolean)
      .filter((v: any) => v.language === selectedLanguage);

    return resolved as any[];
  }
  private sortByHashOrder(list: any[]): any[] {
    const getN = (v: any): number => {
      const d = (v?.description || '').toString();
      const m = d.match(/#\s*(\d{1,3})/); // "#1" or "# 2"
      if (!m) return 9999;
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : 9999;
    };

    return [...(list || [])].sort((a, b) => getN(a) - getN(b));
  }

  private hasActiveSeriesAccess(seriesId: string): boolean {
    try {
      const raw = localStorage.getItem('seriesAccessCache');
      if (!raw) return false;
      const obj = JSON.parse(raw) || {};
      const endsAtMs = Number(obj?.[seriesId]?.endsAtMs || 0);
      return endsAtMs > Date.now();
    } catch {
      return false;
    }
  }

  openPaywall() {
    // premium modal
    this.globalService.openModal2Safe({ unlockType: 'premium' });
  }

  openRedeemSeriesCode() {
    // open same modal but in "series unlock" mode
    this.globalService.openModal2Safe({ unlockType: 'series', seriesId: this.seriesId });
  }

  async onVideoClick(video: any) {
    if (!navigator.onLine) {
      const msg = this.isPortuguese
        ? '🌐 Você está offline.\n\nConecte-se à internet para assistir a este vídeo'
        : '🌐 You are offline.\n\nConnect to the internet to watch this video';
      this.globalAlert.showalert('OFFLINE', msg);
      return;
    }

    if (!this.isSeriesUnlocked) {
      // series modal
      this.globalService.openModal2Safe({ unlockType: 'series', seriesId: this.seriesId });
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

  goBack(): void {
    this.navCtrl.back();
  }

  // helpers
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

  private findVideoByRawUrl(videoList: any[], rawUrl: string): any | null {
    if (!rawUrl) return null;

    const norm = this.normalizeUrl(rawUrl);
    const playerNorm = this.normalizeUrl(this.vimeoMeta.toPlayerUrl(rawUrl));

    // 1) Direct match against url/rawUrl/videoUrl
    const direct = (videoList || []).find((v) => {
      const a = this.normalizeUrl(v?.url || '');
      const b = this.normalizeUrl(v?.rawUrl || '');
      const c = this.normalizeUrl(v?.videoUrl || '');
      return a === norm || b === norm || c === norm || a === playerNorm || b === playerNorm || c === playerNorm;
    });
    if (direct) return direct;

    // 2) Fallback: match by Vimeo ID (ignores ?h= tokens)
    const targetId = this.extractVimeoId(rawUrl);
    if (!targetId) return null;

    const byId = (videoList || []).find((v) => {
      const idA = this.extractVimeoId(v?.url || '');
      const idB = this.extractVimeoId(v?.rawUrl || '');
      const idC = this.extractVimeoId(v?.videoUrl || '');
      return idA === targetId || idB === targetId || idC === targetId;
    });

    return byId || null;
  }

  private normalizeUrl(u: string): string {
    return (u || '').trim();
  }

  private extractVimeoId(u: string): string | null {
    const s = (u || '').trim();
    if (!s) return null;

    // player.vimeo.com/video/1166309668?h=...
    let m = s.match(/vimeo\.com\/video\/(\d+)/);
    if (m?.[1]) return m[1];

    // vimeo.com/1166309668
    m = s.match(/vimeo\.com\/(\d+)/);
    if (m?.[1]) return m[1];

    return null;
  }
}