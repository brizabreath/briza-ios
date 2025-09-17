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
import { collection, getDocs } from 'firebase/firestore';
import { VimeoMetaService } from '../services/vimeo-meta.service';
import { ActivatedRoute } from '@angular/router';
import { LocalReminderService } from '../services/local-reminder.service';

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

  selectedFilter: 'Duration' | '0-15 min' | '15-30 min' | '30-45 min' | '+45 min' = 'Duration';
  filters = ['Duration', '0-15 min', '15-30 min', '30-45 min', '+45 min'] as const;

  allVideos: any[] = [];
  filteredVideos: any[] = [];

  activeVideo: { title: string; url: SafeResourceUrl } | null = null;

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
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Initialize language BEFORE first render to avoid any flicker
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    // Stay in sync if another page changes the language
    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
        // Refilter in case language changed
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
    // Allow letters/numbers only; collapse to one token
    const oneWord = raw
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
    const isOnline = navigator.onLine;

    if (isOnline) {
      await this.fetchVideosFromFirebase();
    } else {
      const cached = localStorage.getItem('cachedYogaVideos');
      if (cached) {
        const parsed = JSON.parse(cached);
        this.allVideos = parsed.map((v: any) => ({
          ...v,
          url: this.sanitizer.bypassSecurityTrustResourceUrl(v.videoUrl || v.url),
        }));
      } else {
        console.warn('No cached videos available for offline use.');
        this.allVideos = [];
      }
    }
  }

  async fetchVideosFromFirebase() {
    try {
      const colRef = collection(this.firebaseService.firestore!, 'videos');
      const snapshot = await getDocs(colRef);

      const base = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      const enriched = await Promise.all(
        base.map(async (v) => {
          const rawUrl = v.url || v.videoUrl;
          let meta: any = {};
          try {
            meta = await this.vimeoMeta.getMeta(rawUrl);
          } catch (e) {
            console.warn('Vimeo meta failed for', rawUrl, e);
          }

          const playerUrl = this.vimeoMeta.toPlayerUrl(rawUrl);

          const durationMinutes = meta?.duration
            ? Math.round(meta.duration / 60)
            : v.duration ?? null;

          return {
            id: v.id,
            category: v.category,      // expected: 'move' | 'slowdown' | 'meditate'
            language: v.language,      // 'EN' | 'PT'
            duration: durationMinutes, // minutes
            title: meta?.title ?? v.title ?? 'Untitled',
            description: (meta?.description ?? v.description ?? '').toString(),
            thumbnail: meta?.thumbnail_url ?? v.thumbnail ?? 'assets/images/lungs.svg',
            videoUrl: playerUrl,
          };
        })
      );

      localStorage.setItem('cachedYogaVideos', JSON.stringify(enriched));
      this.allVideos = enriched;
    } catch (err) {
      console.error('Failed to fetch videos from Firestore:', err);
    }
  }

  // 🔎 SEARCH: helpers (accent-insensitive, whole-word match)
  private normalize(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // remove accents
  }
  private tokenizeWords(s: string): string[] {
    // pick sequences of letters/numbers as “words”
    const m = this.normalize(s).match(/[\p{L}\p{N}]+/gu);
    return m ? m : [];
  }
  // 🔎 SEARCH: match if any token starts with the search word
  private textHasWord(title: string, description: string, word: string): boolean {
    if (!word) return true;
    const tokens = [...this.tokenizeWords(title), ...this.tokenizeWords(description)];
    return tokens.some(t => t.startsWith(word));
  }


  filterVideos() {
    const selectedLanguage = this.isPortuguese ? 'PT' : 'EN';

    this.filteredVideos = this.allVideos.filter((v) => {
      const matchesCategory = v.category === this.selectedSegment;
      const matchesDuration =
        this.selectedFilter === 'Duration' ||
        (this.selectedFilter === '0-15 min' && v.duration <= 15) ||
        (this.selectedFilter === '15-30 min' && v.duration > 15 && v.duration <= 30) ||
        (this.selectedFilter === '30-45 min' && v.duration > 30 && v.duration <= 45) ||
        (this.selectedFilter === '+45 min' && v.duration > 45);
      const matchesLanguage = v.language === selectedLanguage;

      // 🔎 SEARCH: title/description must contain the single word (whole-word, accent-insensitive)
      const matchesText =
        !this.searchNorm ||
        this.textHasWord(v.title ?? '', v.description ?? '', this.searchNorm);

      return matchesCategory && matchesDuration && matchesLanguage && matchesText;
    });
  }

  private isMemberActive(): boolean {
    return localStorage.getItem('membershipStatus') === 'active';
  }

  async onVideoClick(video: any) {
    // 1) Block if offline
    if (!navigator.onLine) {
      if (!this.isPortuguese) {
        alert('🌐 You are offline.\n\nConnect to the internet to watch this video');
      } else {
        alert('🌐 Você está offline.\n\nConecte-se à internet para assistir a este vídeo');
      }
      return;
    }

    // 2) Gate by membership
    if (!this.isMemberActive()) {
      this.globalService.openModal2(); // your paywall/subscription modal
      return;
    }

    // 3) Member + online => play
    await this.playVideo(video);
  }

  async playVideo(video: any) {
    const url = this.sanitizer.bypassSecurityTrustResourceUrl(video.videoUrl || video.url);

    const modal = await this.modalCtrl.create({
      component: VideoModalComponent,
      componentProps: {
        url,
        title: video.title,
        description: video.description,
        duration: video.duration,
        videoId: video.id,
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

  goBack(): void {
    this.navCtrl.back();
  }
}
