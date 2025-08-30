import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { SafeResourceUrl } from '@angular/platform-browser';
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
    .video-wrapper {
      width: 100%;
      aspect-ratio: 16/9;
    }
    iframe {
      width: 100%;
      height: 100%;
    }
    .video-meta {
      padding: 1rem;
      font-size: 16px;
    }
  `],
  standalone: true,
  imports: [IonicModule, CommentsComponent]
})
export class VideoModalComponent {
  @Input() url!: SafeResourceUrl;
  @Input() title!: string;
  @Input() description!: string;
  @Input() videoId!: string; // <-- new


  constructor(private modalCtrl: ModalController) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
