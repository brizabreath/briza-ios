import { Component, Input, ViewChild, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { SafeResourceUrl } from '@angular/platform-browser';
import Player from '@vimeo/player';
import { CommentsComponent } from '../comments/comments.component';

@Component({
  selector: 'app-video-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title class="brizaBlue">{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()" class="brizaBlue">X</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="video-wrapper">
        <iframe
          #vimeoIframe
          [src]="url"
          class="video-player-iframe"
          frameborder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen
          webkit-playsinline
        ></iframe>
      </div>

      <div class="video-date-row">
        <div class="video-date brizaBlue">
          {{ addedOn }}
        </div>

        <button class="like-btn" type="button" (click)="toggleLike()" aria-label="Like class">
          <img
            class="heartIMG"
            [src]="isLiked() ? 'assets/images/heartB.png' : 'assets/images/heartG.png'"
            alt="like"
          />
        </button>
      </div>

      <div class="video-meta">
        <p class="brizaBlue">{{ description }}</p>
      </div>

      <app-comments [videoId]="videoId"></app-comments>
    </ion-content>
  `,
  styles: [`
    .video-wrapper { width: 100%; aspect-ratio: 16/9; }
    iframe { width: 100%; height: 100%; border: 0; }
    .video-meta { padding: 1rem; font-size: 16px; text-align: justify; }

    .video-date-row{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding: 0.5rem 1rem 0;
    }
    .video-date { padding: 0; font-size: 13px; opacity: 0.7; }

    .like-btn{
      background: transparent;
      border: 0;
      padding: 0;
      margin: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .heartIMG{
      width: 28px;
      height: 28px;
      object-fit: contain;
    }
  `],
  standalone: true,
  imports: [IonicModule, CommentsComponent]
})
export class VideoModalComponent implements AfterViewInit, OnDestroy {
  @Input() url!: SafeResourceUrl;
  @Input() title!: string;
  @Input() description!: string;
  @Input() videoId!: string;
  @Input() addedOn?: string;
  @Input() category?: 'move' | 'slowdown' | 'meditate' | 'lungs' | 'mobility';
  @Input() duration?: number;

  @ViewChild('vimeoIframe') vimeoIframeRef!: ElementRef<HTMLIFrameElement>;

  private player?: Player;
  private savedForThisOpen = false;

  private likedKey = 'likedYogaIds';
  private watchedKey = 'watchedYogaIds';

  constructor(private modalCtrl: ModalController) {}

  ngAfterViewInit(): void {
    // Attach Vimeo SDK to the already-loaded iframe
    if (this.vimeoIframeRef?.nativeElement) {
      this.player = new Player(this.vimeoIframeRef.nativeElement);

      // (optional) log SDK errors to help debugging
      this.player.on('error', (e: any) => console.warn('Vimeo modal error', e));

      // Save once when hitting 95%
      this.player.on('timeupdate', (data: { seconds: number; duration: number }) => {
        if (this.savedForThisOpen) return;
        const { seconds, duration } = data || { seconds: 0, duration: 0 };
        if (duration > 0 && seconds / duration >= 0.95) {
          this.saveYogaResult(this.formatMMSS(seconds));
          this.markWatched(this.videoId);
          this.savedForThisOpen = true;
        }
      });

      // Also save on ended (full duration)
      this.player.on('ended', async () => {
        if (this.savedForThisOpen) return;
        try {
          const duration = await this.player!.getDuration();
          this.saveYogaResult(this.formatMMSS(duration || 0));
          this.markWatched(this.videoId);
          this.savedForThisOpen = true;
        } catch {}
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up the player instance
    if (this.player) {
      this.player.unload().catch(() => {});
      this.player = undefined;
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  // ----- Like helpers -----
  isLiked(): boolean {
    const ids: string[] = this.getStringArrayFromStorage(this.likedKey);
    return ids.includes(this.videoId);
  }

  toggleLike(): void {
    const ids: string[] = this.getStringArrayFromStorage(this.likedKey);
    const has = ids.includes(this.videoId);

    const next = has ? ids.filter(id => id !== this.videoId) : [...ids, this.videoId];
    localStorage.setItem(this.likedKey, JSON.stringify(next));
    // Angular will re-render immediately because isLiked() reads localStorage each time
  }

  // ----- Watched helpers -----
  private markWatched(videoId: string) {
    const ids: string[] = this.getStringArrayFromStorage(this.watchedKey);
    if (!ids.includes(videoId)) {
      ids.push(videoId);
      localStorage.setItem(this.watchedKey, JSON.stringify(ids));
    }
  }

  // ----- helpers -----
  private formatMMSS(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${this.pad(m)} : ${this.pad(sec)}`;
    // Matches "MM : SS" used elsewhere in your app
  }

  private pad(v: number) { return v < 10 ? `0${v}` : `${v}`; }

  private saveYogaResult(minutesWatched: string) {
    // ✅ Results bucket selection
    let key = 'YogaResults';

    if (this.category === 'meditate') {
      key = 'TIMERResults';
    } else if (this.category === 'lungs' || this.category === 'mobility') {
      key = 'LungsResults';
    }

    const prev = JSON.parse(localStorage.getItem(key) || '[]');

    prev.push({
      date: new Date().toISOString(),
      result: minutesWatched,
      videoId: this.videoId,
      category: this.category || null,
    });

    localStorage.setItem(key, JSON.stringify(prev));
  }

  private getStringArrayFromStorage(key: string): string[] {
    try {
      const v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
}