import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, NavController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

import { FirebaseService } from '../services/firebase.service';
import { GlobalService } from '../services/global.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { VimeoMetaService } from '../services/vimeo-meta.service';
import { VideoModalComponent } from '../modals/video-modal.component';

import { collection } from 'firebase/firestore';
import { getDocsFromServer } from 'firebase/firestore';

@Component({
  selector: 'app-yogaLikedPage',
  templateUrl: './yogaLikedPage.page.html',
  styleUrls: ['./yogaLikedPage.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, VideoModalComponent],
})
export class YogaLikedPagePage implements OnInit {
  isPortuguese = false;

  likedVideos: any[] = [];
  showWebSplash = false;

  private likedKey = 'likedYogaIds';

  private readonly FREE_CLASSES = [
    'RiTUaMmSRhd1IdK9TynI',
    'CyJy2Uf4dC6qoRsMphlc',
    'nDqZCNnlqYj9EmylcVPx',
    'qI4bFPybnAcj7MVaTp0T',
    'YK5xX0NTnByLhGPedCan',
    'E3y6htyEr2AczT24qQQx',
  ];

  constructor(
    private navCtrl: NavController,
    private firebaseService: FirebaseService,
    private sanitizer: DomSanitizer,
    private modalCtrl: ModalController,
    private globalService: GlobalService,
    private globalAlert: GlobalAlertService,
    private vimeoMeta: VimeoMetaService
  ) {}

  ngOnInit() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
        // NOTE: we do NOT filter by language here per your request
      }
      if (e.key === this.likedKey) {
        this.loadLiked().catch(() => {});
      }
    });

    this.loadLiked().catch(() => {});
  }

  private getLikedIds(): string[] {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem(this.likedKey) || '[]');
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  }

  private normalizeVideo(v: any): any {
    const rawUrl = v.url || v.videoUrl || '';
    return {
      ...v,
      title: (v.title || '').trim() || 'Untitled',
      description: (v.description || '').trim(),
      thumbnail: (v.thumbnail || '').trim() || 'assets/images/lungs.svg',
      videoUrl: v.videoUrl || this.vimeoMeta.toPlayerUrl(rawUrl),
      isFree: !!v.isFree,
    };
  }

  private buildLikedListFromAll(allVideos: any[], likedIds: string[]): any[] {
    const likedSet = new Set(likedIds);

    const picked = (allVideos || [])
      .filter(v => likedSet.has(v.id))
      .map(v => ({
        ...this.normalizeVideo(v),
        isFree: this.FREE_CLASSES.includes(v.id),
      }));

    // Keep the order of likedIds (most people expect “most recent liked” last,
    // but your toggleLike adds at the end; we’ll preserve that list order).
    const order = new Map(likedIds.map((id, idx) => [id, idx]));
    picked.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    return picked;
  }

  private async loadLiked() {
    const likedIds = this.getLikedIds();
    if (likedIds.length === 0) {
      this.likedVideos = [];
      return;
    }

    this.showWebSplash = true;

    try {
      // 1) Cache first
      const cachedRaw = localStorage.getItem('cachedYogaVideos');
      if (cachedRaw) {
        try {
          const cachedObj = JSON.parse(cachedRaw);
          const cachedVideos = cachedObj?.videos ?? [];
          this.likedVideos = this.buildLikedListFromAll(cachedVideos, likedIds);
        } catch {}
      }

      // 2) If offline, stop here
      if (!navigator.onLine || !this.firebaseService.firestore) return;

      // 3) Server fetch for completeness/freshness
      const colRef = collection(this.firebaseService.firestore, 'videos');
      const snap = await getDocsFromServer(colRef);
      const serverVideos = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      this.likedVideos = this.buildLikedListFromAll(serverVideos, likedIds);
    } finally {
      this.showWebSplash = false;
    }
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
}