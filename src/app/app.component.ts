import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

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
export class AppComponent implements OnInit, OnDestroy {
  isModalOpen: boolean = false;
  isPortuguese: boolean = false;
  private inactivityTimer: any;
  showWebSplash = true;

  private listenersRegistered = false;

  // Capacitor listener handles (so we don't stack)
  private appStateHandle?: PluginListenerHandle;
  private resumeHandle?: PluginListenerHandle;
  private localReceivedHandle?: PluginListenerHandle;

  // Global gesture unlock handlers
  private gestureHandler?: (e: Event) => void;

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

    if (Capacitor.getPlatform() === 'ios') {
      try {
        await Keyboard.setResizeMode({ mode: KeyboardResize.None });
      } catch (err) {
        console.warn('Keyboard resize not supported:', err);
      }
    }

    setTimeout(() => {
      this.showWebSplash = false;
    }, 2000);

    // Install global gesture unlock (works for first launch and after background)
    this.installGlobalAudioGestureUnlock();
  }

  async ngOnInit() {
    this.registerNotificationListener();

    try {
      // Initialize song element (safe to set up early; playback still needs gesture on iOS)
      await this.audioService.initializeSong();

      // Start reminders and update checks
      await this.reminders.startRollingReminders();
      await this.reminders.tick();
      await this.yogaUpdates.checkOnAppStart();
      await this.commentNotifications.checkOnAppStart();

      // App state: foreground/background
      await this.appStateHandle?.remove();
      this.appStateHandle = await App.addListener('appStateChange', async (state) => {
        if (state.isActive) {
          // Try to recover context (may still need gesture)
          await this.audioService.onAppBecameActive();
          await this.reminders.tick();
          await this.yogaUpdates.checkOnAppStart();
          await this.commentNotifications.checkOnAppStart();
        } else {
          // Mark that iOS will likely suspend WebAudio; next tap will re-unlock
          this.audioService.markNeedsUnlock();
        }
      });

      // Resume: keep it, but don't rely on it for iOS
      await this.resumeHandle?.remove();
      this.resumeHandle = await App.addListener('resume', async () => {
        await this.audioService.onAppBecameActive();
        await this.reminders.tick();
        await this.yogaUpdates.checkOnAppStart();
        this.registerNotificationListener();
      });

      // Foreground local notification received
      await this.localReceivedHandle?.remove();
      this.localReceivedHandle = await LocalNotifications.addListener('localNotificationReceived', async () => {
        await this.reminders.chainNext();
      });

      // Load user language
      const isPortugueseValue = localStorage.getItem('isPortuguese');
      this.isPortuguese = isPortugueseValue === 'true';

      // Modal visibility
      this.globalService.isModalOpen$.subscribe({
        next: (isOpen) => (this.isModalOpen = isOpen),
        error: (err) => console.error('Error in modal state subscription:', err),
      });

    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  ngOnDestroy(): void {
    this.appStateHandle?.remove();
    this.resumeHandle?.remove();
    this.localReceivedHandle?.remove();

    if (this.gestureHandler) {
      window.removeEventListener('touchend', this.gestureHandler, true);
      window.removeEventListener('click', this.gestureHandler, true);
    }
  }

  private installGlobalAudioGestureUnlock() {
    if (this.gestureHandler) return;

    this.gestureHandler = async () => {
      // Unlock WebAudio if needed (works only from user gesture on iOS)
      await this.audioService.unlockFromGestureIfNeeded();
    };

    // capture=true so it fires early
    window.addEventListener('touchend', this.gestureHandler, true);
    window.addEventListener('click', this.gestureHandler, true);
  }

  private registerNotificationListener() {
    if (this.listenersRegistered) return;
    this.listenersRegistered = true;

    LocalNotifications.addListener('localNotificationActionPerformed', async (event) => {
      await this.reminders.chainNext();

      const data = (event?.notification as any)?.extra;
      if (!data) return;

      if (data.type === 'yogaNew') {
        const firstItem = data.items?.[0];
        const firstId = firstItem?.id || data.ids?.[0];
        const cat = firstItem?.category;

        if (!firstId) return;

        if (cat === 'lungs' || cat === 'mobility') {
          this.router.navigate(['/lungs'], { queryParams: { open: firstId } });
        } else {
          this.router.navigate(['/yoga'], { queryParams: { open: firstId } });
        }
      } else if (data.type === 'commentReply') {
        await this.commentNotifications.handleNotificationTap(data);
      } else {
        this.router.navigateByUrl('/breathwork');
      }
    });
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
    }, 60000);
  }
}
