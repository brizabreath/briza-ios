import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, Platform } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { ModalComponent } from './modal/modal.component';
import { GlobalService } from './services/global.service';
import { LocalReminderService } from './services/local-reminder.service';
import { YogaUpdateService } from './services/yoga-update.service';
import { AudioService } from './services/audio.service';
import { CommentNotificationService } from './services/comment-notification.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalComponent,
    RouterModule
  ]
})
export class AppComponent implements OnInit {
  isModalOpen: boolean = false;
  isPortuguese: boolean = false;
  private inactivityTimer: any;
  showWebSplash = true;
  private listenersRegistered = false;

  constructor(
    private globalService: GlobalService,
    private reminders: LocalReminderService,
    private platform: Platform,
    private router: Router,
    private yogaUpdates: YogaUpdateService,
    private audioService: AudioService,
    private commentNotifications: CommentNotificationService
  ) {
    this.setupInactivityMonitor();
    this.initializeApp();
  }

  private async initializeApp() {
    await this.platform.ready();

    // Only apply resize mode on iOS (Android throws "not implemented")
    if (Capacitor.getPlatform() === 'ios') {
      try {
        await Keyboard.setResizeMode({ mode: KeyboardResize.None });
      } catch (err) {
        console.warn('Keyboard resize not supported:', err);
      }
    }

    // Hide splash after short delay
    setTimeout(() => {
      this.showWebSplash = false;
    }, 2000);
  }

  async ngOnInit() {
    // ✅ Ensure tap listener registered once
    this.registerNotificationListener();
    try {
      // ✅ Preload and initialize audio
      await this.audioService.preloadAll();
      await this.audioService.initializeSong();

      // ✅ Start reminders and yoga updates
      await this.reminders.startRollingReminders();
      await this.reminders.tick();
      await this.yogaUpdates.checkOnAppStart();
      await this.commentNotifications.checkOnAppStart();

      // ✅ Listen for app state changes (background/foreground)
      App.addListener('appStateChange', async (state) => {
        if (state.isActive) {
          await this.audioService.resetaudio();
        }
      });

      // ✅ Resume listener for Android lifecycle
      App.addListener('resume', async () => {
        await this.audioService.resetaudio();
        await this.reminders.tick();
        await this.yogaUpdates.checkOnAppStart();
        this.registerNotificationListener();
      });

      // ✅ Local notification received while app is in foreground
      LocalNotifications.addListener('localNotificationReceived', async () => {
        await this.reminders.chainNext();
      });

      // ✅ Load user language
      const isPortugueseValue = localStorage.getItem('isPortuguese');
      this.isPortuguese = isPortugueseValue === 'true';

      // ✅ Subscribe to modal visibility changes
      this.globalService.isModalOpen$.subscribe({
        next: (isOpen) => (this.isModalOpen = isOpen),
        error: (err) =>
          console.error('Error in modal state subscription:', err),
      });
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  private registerNotificationListener() {
    if (this.listenersRegistered) return;
    this.listenersRegistered = true;

    LocalNotifications.addListener(
      'localNotificationActionPerformed',
      async (event) => {
        await this.reminders.chainNext();
        const data = (event?.notification as any)?.extra;
        if (!data) return;

        if (data.type === 'yogaNew') {
          const firstItem = data.items?.[0];
          const firstId = firstItem?.id || data.ids?.[0];
          const cat = firstItem?.category;

          if (!firstId) return;

          // Route by category
          if (cat === 'lungs' || cat === 'mobility') {
            this.router.navigate(['/lungs'], { queryParams: { open: firstId } });
          } else {
            // move / slowdown / meditate (yoga)
            this.router.navigate(['/yoga'], { queryParams: { open: firstId } });
          }
        }else if (data.type === 'commentReply') {
          await this.commentNotifications.handleNotificationTap(data);
        } else {
          this.router.navigateByUrl('/breathwork');
        }
      }
    );
  }

  onModalClose(): void {
    this.isModalOpen = false;
  }

  private setupInactivityMonitor(): void {
    const events = ['touchstart', 'click', 'mousemove', 'keydown'];
    events.forEach((event) => {
      document.addEventListener(event, () => this.resetInactivityTimer());
    });
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    clearTimeout(this.inactivityTimer);
    const overlay = document.querySelector('.dimOverlay') as HTMLElement;
    if (overlay) overlay.style.opacity = '0';

    this.inactivityTimer = setTimeout(() => {
      if (overlay) overlay.style.opacity = '0.6';
    }, 60000); // 1 min
  }
}
