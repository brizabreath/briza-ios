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
          <ion-button (click)="dismiss()" class="brizaBlue">Close</ion-button>
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
        ></iframe>
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
  `],
  standalone: true,
  imports: [IonicModule, CommentsComponent]
})
export class VideoModalComponent implements AfterViewInit, OnDestroy {
  @Input() url!: SafeResourceUrl;
  @Input() title!: string;
  @Input() description!: string;
  @Input() videoId!: string;

  @ViewChild('vimeoIframe') vimeoIframeRef!: ElementRef<HTMLIFrameElement>;

  private player?: Player;
  private savedForThisOpen = false;

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
          this.savedForThisOpen = true;
        }
      });

      // Also save on ended (full duration)
      this.player.on('ended', async () => {
        if (this.savedForThisOpen) return;
        try {
          const duration = await this.player!.getDuration();
          this.saveYogaResult(this.formatMMSS(duration || 0));
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
    const key = 'YogaResults'; // <- consistent key
    const prev = JSON.parse(localStorage.getItem(key) || '[]');

    prev.push({
      date: new Date().toISOString(),
      result: minutesWatched,
    });

    localStorage.setItem(key, JSON.stringify(prev));
  }
}
