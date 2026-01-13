import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, NavController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
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
  selector: 'app-perform',
  templateUrl: './perform.page.html',
  styleUrls: ['./perform.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, CoreModule, RouterModule],
})
export class PerformPage {
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  isMember = false;

  performYoga: any[] = [];
  showWebSplash = false;


  constructor(
    private globalService: GlobalService,
    private navCtrl: NavController,
    private firebaseService: FirebaseService,
    private sanitizer: DomSanitizer,
    private modalCtrl: ModalController,
    private globalAlert: GlobalAlertService,
    private vimeoMeta: VimeoMetaService
  ) {}

  async ngOnInit() {
    this.isMember = localStorage.getItem('membershipStatus') === 'active';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
        // refresh list for language
        this.loadPerformYoga().catch(() => {});
      }
      if (e.key === 'membershipStatus') {
        this.isMember = e.newValue === 'active';
      }
    });

    await this.loadPerformYoga();
  }

  async ionViewWillEnter() {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    if (isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
  }

  private async loadPerformYoga() {
    this.showWebSplash = true;
    try {
      // 1) try cache first (fast, also supports offline display)
      const cachedRaw = localStorage.getItem('cachedYogaVideos');
      let cachedVideos: any[] = [];

      if (cachedRaw) {
        try {
          const cachedObj = JSON.parse(cachedRaw);
          cachedVideos = cachedObj?.videos ?? [];
        } catch {}
      }

      // normalize cached immediately
      const cachedNormalized = (cachedVideos || []).map((v: any) => ({
        ...v,
        // ensure player url exists
        videoUrl: v.videoUrl || this.vimeoMeta.toPlayerUrl(v.url || ''),
        isFree: !!v.isFree,
      }));

      // show cached instantly
      this.performYoga = this.filterPerformYoga(cachedNormalized);

      // 2) if offline, stop here
      if (!navigator.onLine || !this.firebaseService.firestore) return;

      // 3) server fetch (fresh)
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

      this.performYoga = this.filterPerformYoga(serverVideos);
    } finally {
      this.showWebSplash = false;
    }
  }

  private filterPerformYoga(list: any[]): any[] {
    const selectedLanguage = this.isPortuguese ? 'PT' : 'EN';
    const word = this.normalize('perform');

    const filtered = (list || []).filter((v) => {
      if (v.language !== selectedLanguage) return false;

      const title = v.title ?? '';
      const description = v.description ?? '';
      return this.textHasWord(title, description, word);
    });

    // optional: keep FREE first for non-members like Yoga page
    const member = this.isMemberActive();
    filtered.sort((a, b) => {
      if (!member && !!a.isFree !== !!b.isFree) return a.isFree ? -1 : 1;
      return (a.title || '').localeCompare(b.title || '');
    });

    return filtered;
  }

  // same membership check as YogaPage
  isMemberActive(): boolean {
    return localStorage.getItem('membershipStatus') === 'active';
  }

  // click behavior: same as YogaPage (offline guard + lock)
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

  // ===== search helpers copied from YogaPage =====
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

  goBack(): void {
    this.navCtrl.back();
  }
}