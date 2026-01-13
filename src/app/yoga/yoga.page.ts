import { Component, OnInit } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { VideoModalComponent } from '../modals/video-modal.component';
import { FirebaseService } from '../services/firebase.service';
import { collection, doc, setDoc } from 'firebase/firestore';
import { VimeoMetaService } from '../services/vimeo-meta.service';
import { ActivatedRoute } from '@angular/router';
import { LocalReminderService } from '../services/local-reminder.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { getDocsFromServer } from 'firebase/firestore';

@Component({
  selector: 'app-yoga',
  templateUrl: './yoga.page.html',
  styleUrls: ['./yoga.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, VideoModalComponent],
})
export class YogaPage implements OnInit {
  selectedSegment: 'move' | 'slowdown' | 'meditate' = 'move';
  isPortuguese = false;

  selectedFilter: 'duration' | '0-20 min' | '20-35 min' | '35-50 min' | '50+ min' = 'duration';
  filters = ['0-20 min', '20-35 min', '35-50 min', '50+ min'] as const;

  allVideos: any[] = [];
  filteredVideos: any[] = [];

  activeVideo: { title: string; url: SafeResourceUrl } | null = null;
  showWebSplash = false;
  private watchedKey = 'watchedYogaIds';
  private likedKey = 'likedYogaIds';

  // 🔎 SEARCH: state (enforce one word)
  searchTerm = '';
  private searchNorm = '';

  constructor(
    private navCtrl: NavController,
    private globalService: GlobalService,
    private sanitizer: DomSanitizer,
    private modalCtrl: ModalController,
    private firebaseService: FirebaseService,
    private vimeoMeta: VimeoMetaService,
    private reminders: LocalReminderService,
    private route: ActivatedRoute,
    private globalAlert: GlobalAlertService
  ) {}
  isWatched(videoId: string): boolean {
    const ids: string[] = JSON.parse(localStorage.getItem(this.watchedKey) || '[]');
    return ids.includes(videoId);
  }
  hasLikedClasses(): boolean {
    const ids: string[] = JSON.parse(localStorage.getItem(this.likedKey) || '[]');
    return ids.length > 0;
  }
  goToLikedClasses(): void{
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    if(this.hasLikedClasses()){
      this.navCtrl.navigateRoot('/yogaLikedPage');
    }
    else{
      this.globalAlert.showalert(
        this.isPortuguese ? 'Aulas curtidas' : 'Liked classes',
        this.isPortuguese
          ? 'Você ainda não curtiu de nenhuma aula'
          : 'You did not like any classes yet'
      );
    }
  }
  ngOnInit() {
    // Initialize language BEFORE first render to avoid any flicker
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    // Stay in sync if another page changes the language
    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
        this.filterVideos();
      }
    });

    // Load videos on init similarly to ionViewWillEnter
    this.initVideos().then(() => {
      this.filterVideos();
      this.maybeOpenDeepLink();
    });
  }

  // 🔎 SEARCH: input handler — keep only the first “word” (letters/numbers), strip spaces/accents
  onSearchInput(ev: any) {
    const raw: string = ev?.detail?.value ?? '';
    const oneWord =
      raw
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .split(' ')[0] || '';
    this.searchTerm = oneWord;
    this.searchNorm = this.normalize(oneWord);
    this.filterVideos();
  }

  // 🔎 SEARCH: clear button
  clearSearch() {
    this.searchTerm = '';
    this.searchNorm = '';
    this.filterVideos();
  }

  private async initVideos() {
    this.showWebSplash = true;

    try {
      const cachedRaw = localStorage.getItem('cachedYogaVideos');
      let cachedVideos: any[] = [];
      let cacheAge = Infinity;

      if (cachedRaw) {
        try {
          const cachedObj = JSON.parse(cachedRaw);
          cacheAge = Date.now() - cachedObj.ts;
          cachedVideos = cachedObj.videos ?? [];

          // ✅ Instantly display cached content
          this.allVideos = cachedVideos.map((v: any) => ({
            ...v,
            url: this.sanitizer.bypassSecurityTrustResourceUrl(v.videoUrl || v.url),
          }));
        } catch (err) {
          console.warn('Failed to parse cached yoga videos', err);
        }
      }

      // 🧠 If offline, skip everything else
      if (!navigator.onLine) {
        console.log('📴 Offline – using cache only');
        return;
      }

      const colRef = collection(this.firebaseService.firestore!, 'videos');

      // FORCE server so you actually see new docs/changes
      const snapshot = await getDocsFromServer(colRef);

      const serverIds = snapshot.docs.map((d) => d.id).sort();
      const localIds = (cachedVideos || []).map((v) => v.id).sort();

      const idsChanged =
        serverIds.length !== localIds.length ||
        serverIds.some((id, i) => id !== localIds[i]);

      // Refresh if cache expired OR IDs changed
      if (cacheAge > 72 * 60 * 60 * 1000 || idsChanged) {
        console.log('🔄 Refreshing yoga videos (cache expired or IDs changed)');
        await this.fetchVideosFromFirebase();
      } else {
        console.log('✅ Cache fresh and IDs unchanged');
      }
    } catch (err) {
      console.error('❌ Failed to init videos:', err);
    } finally {
      this.showWebSplash = false;
    }
  }

  async fetchVideosFromFirebase() {
    try {
      const isAdmin = !!this.firebaseService.isAdmin?.() && this.firebaseService.isAdmin();
      const colRef = collection(this.firebaseService.firestore!, 'videos');

      // Always server fetch so title edits propagate
      const snapshot = await getDocsFromServer(colRef);
      const base = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      const enriched = await Promise.all(
        base.map(async (v) => {
          const rawUrl = v.url || v.videoUrl;
          const computedAddedOn = this.formatDDMMYY(new Date());

          // Build player URL always (fast)
          const playerUrl = this.vimeoMeta.toPlayerUrl(rawUrl);

          // Default to Firestore values for everyone
          let finalTitle = (v.title || '').trim();
          let finalDescription = (v.description || '').trim();
          let finalThumbnail = (v.thumbnail || '').trim();
          let durationMinutes: number | null = v.duration ?? null;

          // Admin-only: Vimeo fetch + Firestore write back, but ONLY if missing fields
          const needsEnrich =
            !finalTitle ||
            finalTitle === 'Untitled' ||
            !finalThumbnail ||
            finalThumbnail === 'assets/images/lungs.svg' ||
            !v.addedOn ||
            durationMinutes == null;

          if (isAdmin && needsEnrich && rawUrl) {
            try {
              // IMPORTANT: do NOT force refresh here; let TTL work
              const meta = await this.vimeoMeta.getMeta(rawUrl, false);

              if (!finalTitle || finalTitle === 'Untitled') {
                finalTitle = (meta?.title || finalTitle || 'Untitled').trim();
              }
              if (!finalDescription) {
                finalDescription = (meta?.description || finalDescription || '').trim();
              }
              if (!finalThumbnail || finalThumbnail === 'assets/images/lungs.svg') {
                finalThumbnail = (meta?.thumbnail_url || finalThumbnail || 'assets/images/lungs.svg').trim();
              }
              if (durationMinutes == null && typeof meta?.duration === 'number') {
                durationMinutes = Math.round(meta.duration / 60);
              }

              const payload: any = {
                title: finalTitle || 'Untitled',
                description: finalDescription || '',
                thumbnail: finalThumbnail || 'assets/images/lungs.svg',
              };

              // write addedOn only once
              if (!v.addedOn) payload.addedOn = computedAddedOn;

              // ✅ write duration if we have it
              if (typeof durationMinutes === 'number' && Number.isFinite(durationMinutes)) {
                payload.duration = durationMinutes;
              }

              await setDoc(doc(this.firebaseService.firestore!, 'videos', v.id), payload, { merge: true });

            } catch (e) {
              console.warn('Admin enrich failed for', v.id, e);
            }
          }

          // Final fallbacks for everyone
          if (!finalTitle) finalTitle = 'Untitled';
          if (!finalThumbnail) finalThumbnail = 'assets/images/lungs.svg';
          if (!finalDescription) finalDescription = '';

          return {
            id: v.id,
            category: v.category,
            language: v.language,
            duration: durationMinutes,
            title: finalTitle,
            description: finalDescription,
            thumbnail: finalThumbnail,
            videoUrl: playerUrl,
            rawUrl, // keep raw url for admin enrich-on-open
            addedOn: v.addedOn || (isAdmin ? computedAddedOn : v.addedOn), // non-admin won't invent dates
            isFree: !!v.isFree,
          };
        })
      );

      // Keep your original “free first within category” baseline ordering
        this.allVideos = enriched.sort((a, b) => {
          if (a.category === b.category) {
          if (a.isFree && !b.isFree) return -1;
          if (!a.isFree && b.isFree) return 1;
        }
        return 0;
      });

      // 💾 Cache
      const cachePayload = {
        ts: Date.now(),
        videos: this.allVideos,
      };
      localStorage.setItem('cachedYogaVideos', JSON.stringify(cachePayload));
    } catch (err) {
      console.error('❌ Failed to fetch videos from Firestore:', err);
    }
  }

  // Admin-only enrich when opening a video (covers notification deep-link opens)
  private async enrichVideoOnOpen(video: any): Promise<void> {
    // Only admin should ever hit Vimeo or write to /videos
    const isAdmin = !!this.firebaseService.isAdmin?.() && this.firebaseService.isAdmin();
    if (!isAdmin) return;

    if (!navigator.onLine) return;

    try {
      const rawUrl = video.rawUrl || video.url || video.videoUrl || '';
      if (!rawUrl) return;

      const missing =
        !video.addedOn ||
        !video.title ||
        video.title === 'Untitled' ||
        !video.thumbnail ||
        video.thumbnail === 'assets/images/lungs.svg';

      if (!missing) return;

      // If admin explicitly opens, we can force refresh for that ONE video
      const meta = await this.vimeoMeta.getMeta(rawUrl, true);
      const computedAddedOn = video.addedOn || this.formatDDMMYY(new Date());

      const payload: any = {
        title: (meta?.title?.trim() || video.title || 'Untitled'),
        description: (meta?.description?.trim() || video.description || ''),
        thumbnail: (meta?.thumbnail_url?.trim() || video.thumbnail || 'assets/images/lungs.svg'),
      };
      if (!video.addedOn) payload.addedOn = computedAddedOn;

      // ✅ duration from Vimeo (seconds → minutes)
      if (typeof meta?.duration === 'number' && Number.isFinite(meta.duration)) {
        payload.duration = Math.round(meta.duration / 60);
      }
      await setDoc(doc(this.firebaseService.firestore!, 'videos', video.id), payload, { merge: true });

      // ✅ Update in-memory object so UI + modal update immediately
      video.title = payload.title;
      video.description = payload.description;
      video.thumbnail = payload.thumbnail;
      if (payload.addedOn) video.addedOn = payload.addedOn;

      // ✅ THIS LINE GOES HERE
      if (payload.duration != null) {
        video.duration = payload.duration;
      }

      // Update cache so it persists
      const cachedRaw = localStorage.getItem('cachedYogaVideos');
      if (cachedRaw) {
        const cachedObj = JSON.parse(cachedRaw);
        const vids = cachedObj?.videos || [];
        const idx = vids.findIndex((x: any) => x.id === video.id);
        if (idx >= 0) vids[idx] = { ...vids[idx], ...video };
        localStorage.setItem(
          'cachedYogaVideos',
          JSON.stringify({ ...cachedObj, videos: vids })
        );
      }

    } catch (e) {
      console.warn('enrichVideoOnOpen failed:', e);
    }
  }

  // 🔎 SEARCH: helpers (accent-insensitive, whole-word match)
  private normalize(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private tokenizeWords(s: string): string[] {
    const m = this.normalize(s).match(/[\p{L}\p{N}]+/gu);
    return m ? m : [];
  }

  private textHasWord(title: string, description: string, word: string): boolean {
    if (!word) return true;
    const tokens = [...this.tokenizeWords(title), ...this.tokenizeWords(description)];
    return tokens.some((t) => t.startsWith(word));
  }

  private formatDDMMYY(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  filterVideos() {
    const selectedLanguage = this.isPortuguese ? 'PT' : 'EN';

    this.filteredVideos = this.allVideos.filter((v) => {
      const matchesCategory = v.category === this.selectedSegment;
      const matchesDuration =
        this.selectedFilter === 'duration' ||
        (this.selectedFilter === '0-20 min' && v.duration <= 20) ||
        (this.selectedFilter === '20-35 min' && v.duration > 20 && v.duration <= 35) ||
        (this.selectedFilter === '35-50 min' && v.duration > 35 && v.duration <= 50) ||
        (this.selectedFilter === '50+ min' && v.duration > 50);

      const matchesLanguage = v.language === selectedLanguage;

      const matchesText =
        !this.searchNorm || this.textHasWord(v.title ?? '', v.description ?? '', this.searchNorm);

      return matchesCategory && matchesDuration && matchesLanguage && matchesText;
    });

    this.sortFilteredVideos();
  }

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

  async playVideo(video: any) {
    // Yes, keep this. It’s a no-op for non-admin users.
    await this.enrichVideoOnOpen(video);

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

  closeVideo() {
    this.activeVideo = null;
  }

  selectSegment(segment: 'move' | 'slowdown' | 'meditate') {
    this.selectedSegment = segment;
    this.filterVideos();
  }

  private async maybeOpenDeepLink() {
    const openId = this.route.snapshot.queryParamMap.get('open');
    if (openId) {
      const match = this.allVideos.find((v) => v.id === openId);
      if (match) {
        await this.playVideo(match);
      }
    }
  }

  private parseAddedOnToTs(v: any): number | null {
    const s = (v?.addedOn || '').toString().trim();
    if (!s) return null;

    // dd/mm/yy or dd/mm/yyyy
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      let yy = Number(m[3]);
      if (m[3].length === 2) yy = 2000 + yy;
      const d = new Date(yy, mm - 1, dd);
      const ts = d.getTime();
      return Number.isFinite(ts) ? ts : null;
    }

    const ts = Date.parse(s);
    return Number.isFinite(ts) ? ts : null;
  }

  private sortFilteredVideos(): void {
    const member = this.isMemberActive();

    this.filteredVideos.sort((a, b) => {
      // Non-members: FREE first, then locked
      if (!member) {
        if (!!a.isFree !== !!b.isFree) return a.isFree ? -1 : 1;
      }

      // Date sorting (missing dates stay on top)
      const aTs = this.parseAddedOnToTs(a);
      const bTs = this.parseAddedOnToTs(b);
      const aMissing = aTs == null;
      const bMissing = bTs == null;

      if (aMissing !== bMissing) return aMissing ? -1 : 1; // missing first
      if (aTs != null && bTs != null && aTs !== bTs) return bTs - aTs; // newest first

      return (a.title || '').localeCompare(b.title || '');
    });
  }

  goBack(): void {
    this.navCtrl.back();
  }
}
