import { Component, ViewChild, ElementRef  } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-lungs',
  templateUrl: './lungs.page.html',
  styleUrls: ['./lungs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})


export class LungsPage {
  isModalOpen = false;
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  watchedLE = false;
  @ViewChild('videoElement') videoElementRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoElementPT') videoElementRefPT!: ElementRef<HTMLVideoElement>;


  constructor(private navCtrl: NavController, private globalService: GlobalService) {}
  ionViewWillEnter() {

    // Refresh the content every time the page becomes active
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    if (isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.setupVideoTracking(this.videoElementRefPT);
    }else{
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.setupVideoTracking(this.videoElementRef);
    }
  }
  enterFullscreen(videoElement: HTMLVideoElement) {
    const requestFullscreen =
      videoElement.requestFullscreen ||
      (videoElement as any).webkitEnterFullscreen || // Safari iOS
      (videoElement as any).mozRequestFullScreen ||
      (videoElement as any).msRequestFullscreen;

    if (requestFullscreen) {
      requestFullscreen.call(videoElement);
    }
  }

  // Method to navigate back
  goBack(): void {
    this.navCtrl.back();
  }
  setupVideoTracking(videoRef: ElementRef<HTMLVideoElement>) {
    this.watchedLE = false;

    // Wait for view to initialize
    setTimeout(() => {
      const video = videoRef?.nativeElement;
      if (!video) return;

      const checkProgress = () => {
        if (this.watchedLE) return;

        const watchedTime = video.currentTime;
        const totalDuration = video.duration;

        if (totalDuration > 0  && watchedTime / totalDuration >= 0.95) {
          const minutes = Math.floor(watchedTime / 60);
          const seconds = Math.floor(watchedTime % 60);
          const formattedTime = `${this.padZero(minutes)} : ${this.padZero(seconds)}`;
          this.saveLungsExpansion(formattedTime);
          this.watchedLE = true;
          video.removeEventListener('timeupdate', checkProgress); // cleanup
        }
      };

      video.addEventListener('timeupdate', checkProgress);
    }, 300); // Delay to ensure DOM is ready
  }
  padZero(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }
  saveLungsExpansion(minutesWatched: string): void {
    const savedResults = JSON.parse(localStorage.getItem('LungsResults') || '[]');
    savedResults.push({
      date: new Date().toISOString(),
      result: minutesWatched
    });
    localStorage.setItem('LungsResults', JSON.stringify(savedResults));
  }
}
