import { Component, OnInit } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { VideoModalComponent } from '../modals/video-modal.component';
import { FirebaseService } from '../services/firebase.service';
import { collection } from 'firebase/firestore';
import { VimeoMetaService } from '../services/vimeo-meta.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { getDocsFromServer } from 'firebase/firestore';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-lungs',
  templateUrl: './lungs.page.html',
  styleUrls: ['./lungs.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, VideoModalComponent],
})
export class LungsPage implements OnInit {
  selectedSegment: 'lungs' | 'meditate' = 'lungs';
  isPortuguese = false;

  allVideos: any[] = [];
  filteredVideos: any[] = [];

  activeVideo: { title: string; url: SafeResourceUrl } | null = null;
  showWebSplash = false;

  private watchedKey = 'watchedYogaIds';
  private openingVideo = false;

  constructor(
    private navCtrl: NavController,
    private globalService: GlobalService,
    private sanitizer: DomSanitizer,
    private modalCtrl: ModalController,
    private firebaseService: FirebaseService,
    private vimeoMeta: VimeoMetaService,
    private globalAlert: GlobalAlertService,
    private route: ActivatedRoute, 
    private router: Router
  ) {}

  isWatched(videoId: string): boolean {
    const ids: string[] = JSON.parse(localStorage.getItem(this.watchedKey) || '[]');
    return ids.includes(videoId);
  }
  ngOnInit() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    const seg = (this.route.snapshot.queryParamMap.get('seg') || '').toLowerCase();

    if (seg === 'meditate') this.selectedSegment = 'meditate';
    else if (seg === 'lungs') this.selectedSegment = 'lungs';
    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
        this.filterVideos();
      }
    });

    this.initVideos().then(async () => {
      this.filterVideos();
      await this.openFromQueryParamIfAny();
    });
  }
  private async openFromQueryParamIfAny(): Promise<void> {
    const openId = this.route.snapshot.queryParamMap.get('open');
    if (!openId) return;

    // Ensure lungs segment so the pinned free class is visible
    this.selectedSegment = 'lungs';
    this.filterVideos();

    const video = this.allVideos.find(v => v.id === openId);

    if (video) {
      await this.onVideoClick(video);
    } else {
      console.warn('openFromQueryParamIfAny: video not found for id', openId);
    }

    // Optional: remove the query param so it doesn't auto-open again on back/refresh
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { open: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  private async initVideos() {
    this.showWebSplash = true;

    try {
      const cacheKey = 'cachedYogaVideos';
      const cachedRaw = localStorage.getItem(cacheKey);

      let cachedVideos: any[] = [];
      let cacheAge = Infinity;

      if (cachedRaw) {
        try {
          const cachedObj = JSON.parse(cachedRaw);
          cacheAge = Date.now() - (cachedObj.ts || 0);
          cachedVideos = cachedObj.videos ?? [];

          // ✅ show cache instantly
          this.allVideos = cachedVideos
            .filter((v: any) => v?.category === 'lungs' || v?.category === 'meditate')
            .map((v: any) => ({
              ...v,
              url: this.sanitizer.bypassSecurityTrustResourceUrl(v.videoUrl || v.url),
            }));
        } catch (err) {
          console.warn('Failed to parse cached lungs videos', err);
        }
      }

      if (!navigator.onLine) {
        console.log('📴 Offline – using cache only');
        return;
      }

      // ✅ only fetch if cache expired or server updatedAt changed
      const colRef = collection(this.firebaseService.firestore!, 'videos');
      const snapshot = await getDocsFromServer(colRef);

      const serverMeta = snapshot.docs
        .map((d) => {
          const data = d.data() as any;
          const cat = data?.category;
          if (cat !== 'lungs' && cat !== 'meditate') return null;

          const ts =
            typeof data?.updatedAt?.toMillis === 'function'
              ? data.updatedAt.toMillis()
              : (typeof data?.updatedAt === 'number' ? data.updatedAt : 0);

          return { id: d.id, updatedAt: ts };
        })
        .filter(Boolean as any)
        .sort((a: any, b: any) => a.id.localeCompare(b.id));

      const localMeta = (cachedVideos || [])
        .filter((v: any) => v?.category === 'lungs' || v?.category === 'meditate')
        .map((v: any) => {
          const ts =
            typeof v?.updatedAt?.toMillis === 'function'
              ? v.updatedAt.toMillis()
              : (typeof v?.updatedAt === 'number' ? v.updatedAt : 0);

          return { id: v.id, updatedAt: ts };
        })
        .sort((a: any, b: any) => a.id.localeCompare(b.id));

      const metaChanged =
        serverMeta.length !== localMeta.length ||
        serverMeta.some((s: any, i: number) => {
          const l = localMeta[i];
          return !l || s.id !== l.id || (s.updatedAt || 0) !== (l.updatedAt || 0);
        });

      const TTL = 72 * 60 * 60 * 1000;

      if (cacheAge > TTL || metaChanged) {
        await this.fetchVideosFromFirebase();
      }

    } catch (err) {
      console.error('❌ Failed to init lungs videos:', err);
    } finally {
      this.showWebSplash = false;
    }
  }

  async fetchVideosFromFirebase() {
    try {
      const colRef = collection(this.firebaseService.firestore!, 'videos');
      const snapshot = await getDocsFromServer(colRef);

      const base = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      const filteredBase = base.filter(
        (v) => v?.category === 'lungs' || v?.category === 'meditate'
      );

      const enriched = filteredBase.map((v) => {
        const rawUrl = v.url || v.videoUrl;
        const playerUrl = this.vimeoMeta.toPlayerUrl(rawUrl);

        return {
          id: v.id,
          category: v.category,
          language: v.language,
          duration: v.duration ?? null,
          title: (v.title || '').trim() || 'Untitled',
          description: (v.description || '').trim() || '',
          thumbnail: (v.thumbnail || '').trim() || 'assets/images/default.jpg',
          videoUrl: playerUrl,
          rawUrl,
          addedOn: v.addedOn || '',
          isFree: !!v.isFree, // set below
          updatedAt: (v as any).updatedAt ?? null,
        };
      });

      this.allVideos = enriched;

      const cacheKey = 'cachedYogaVideos';
      let cached: any[] = [];

      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) cached = (JSON.parse(raw)?.videos ?? []);
      } catch {}

      const byId = new Map<string, any>();
      for (const v of cached) byId.set(v.id, v);
      for (const v of this.allVideos) byId.set(v.id, v); // lungs/meditate override same id

      const mergedVideos = Array.from(byId.values());

      localStorage.setItem(
        cacheKey,
        JSON.stringify({ ts: Date.now(), videos: mergedVideos })
      );
    } catch (err) {
      console.error('❌ Failed to fetch lungs videos from Firestore:', err);
    }
  }

  filterVideos() {
    const selectedLanguage = this.isPortuguese ? 'PT' : 'EN';
    const isMember = this.isMemberActive();

    const base = this.allVideos.filter((v) => {
      const matchesCategory = v.category === this.selectedSegment;
      const matchesLanguage = v.language === selectedLanguage;
      return matchesCategory && matchesLanguage;
    });

    // newest-first helper (Firestore Timestamp / ISO string / number)
    const toTime = (x: any) => {
      const d = x?.addedOn;
      if (!d) return 0;

      if (typeof d === 'number') return d;

      if (typeof d?.toMillis === 'function') return d.toMillis();

      if (d?.seconds != null) {
        return (d.seconds * 1000) + Math.floor((d.nanoseconds || 0) / 1e6);
      }

      if (typeof d === 'string') {
        const s = d.trim();

        // dd/mm/yy or dd/mm/yyyy
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
        if (m) {
          const dd = Number(m[1]);
          const mm = Number(m[2]);
          let yy = Number(m[3]);

          if (m[3].length === 2) yy = 2000 + yy;

          const date = new Date(yy, mm - 1, dd, 12, 0, 0);
          const ts = date.getTime();
          return Number.isFinite(ts) ? ts : 0;
        }

        const parsed = Date.parse(s);
        return Number.isFinite(parsed) ? parsed : 0;
      }

      return 0;
    };

    // Special pin for Lungs: "Intro" always first
    const isIntro = (v: any) =>
      (v?.title || '').trim().toLowerCase() === 'intro';

    let pinnedFirst: any[] = [];
    let list = base;

    if (this.selectedSegment === 'lungs') {
      const intro = base.find(isIntro);
      pinnedFirst = intro ? [intro] : [];
      list = base.filter(v => !isIntro(v));
    }

    // Now apply ordering rules
    if (!isMember) {
      const free = list.filter(v => !!v.isFree).sort((a, b) => toTime(b) - toTime(a));
      const paid = list.filter(v => !v.isFree).sort((a, b) => toTime(b) - toTime(a));
      this.filteredVideos = [...pinnedFirst, ...free, ...paid];
    } else {
      const all = list.sort((a, b) => toTime(b) - toTime(a));
      this.filteredVideos = [...pinnedFirst, ...all];
    }
  }

  selectSegment(segment: 'lungs' | 'meditate') {
    this.selectedSegment = segment;
    this.filterVideos();
  }

  isMemberActive(): boolean {
    return localStorage.getItem('membershipStatus') === 'active';
  }

  async onVideoClick(video: any) {
    if (this.openingVideo) return;
    this.openingVideo = true;

    try {
      if (!navigator.onLine) {
        const msg = this.isPortuguese
          ? '🌐 Você está offline.\n\nConecte-se à internet para assistir a este vídeo'
          : '🌐 You are offline.\n\nConnect to the internet to watch this video';
        this.globalAlert.showalert('OFFLINE', msg);
        return;
      }

      if (!video.isFree && !this.isMemberActive()) {
        this.globalService.openModal2Safe();
        return;
      }

      await this.playVideo(video);
    } finally {
      // small delay prevents instant double-tap after dismiss on some devices
      setTimeout(() => (this.openingVideo = false), 250);
    }
  }


  async playVideo(video: any) {
    await this.enrichVideoOnOpen(video);
    const url = this.sanitizer.bypassSecurityTrustResourceUrl(video.videoUrl || video.url);

    const modal = await this.modalCtrl.create({
      component: VideoModalComponent,
      componentProps: {
        url,
        title: video.title,
        description: video.description,
        duration: video.duration, // not displayed here, but modal can still use it if present
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

  private isAdmin(): boolean {
    // Use whatever you already use in Yoga page; if you have firebaseService.isAdmin(), use it.
    return !!(this.firebaseService as any)?.isAdmin?.() && (this.firebaseService as any).isAdmin();
  }

  private async enrichVideoOnOpen(video: any): Promise<any> {
    // Only admins should do Vimeo fetch + DB writes
    if (!this.isAdmin()) return video;

    const rawUrl = video.rawUrl || video.url || video.videoUrl || '';
    if (!rawUrl) return video;

    try {
      const meta = await this.vimeoMeta.getMeta(rawUrl, true); // force refresh
      const playerUrl = this.vimeoMeta.toPlayerUrl(rawUrl);

      const title = (meta.title || video.title || '').trim();
      const description = (meta.description || video.description || '').trim();
      const thumbnail = (meta.thumbnail_url || video.thumbnail || '').trim();
      const durationMinutes =
        typeof meta.duration === 'number' ? Math.round(meta.duration / 60) : video.duration ?? null;

      const patch: any = {
      title,
      description,
      thumbnail,
      duration: durationMinutes,
      videoUrl: playerUrl,
      url: rawUrl,
      updatedAt: Timestamp.now(), // ✅ ADD THIS
    };

    const ref = doc(this.firebaseService.firestore!, 'videos', video.id);
    await updateDoc(ref, patch);


      // Return enriched object for immediate UI/modal
      return { ...video, ...patch };
    } catch (e) {
      console.warn('enrichVideoOnOpen failed:', e);
      return video;
    }
  }
}