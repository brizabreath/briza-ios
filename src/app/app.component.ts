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
    private audioService: AudioService
  ) {
    this.setupInactivityMonitor();
    this.initializeApp();

    // Prevent keyboard from resizing UI
    Keyboard.setResizeMode({ mode: KeyboardResize.None });
  }

  private async initializeApp() {
    await this.platform.ready();

    // Hide splash after a short delay
    setTimeout(() => {
      this.showWebSplash = false;
    }, 2000);
  } 

  async ngOnInit() {
    await this.audioService.preloadAll();
    await this.audioService.initializeSong();     
    App.addListener('appStateChange', async (state) => {
      if (state.isActive) {
        this.audioService.clearAllAudioBuffers();   // 🧹 clear
        await this.audioService.preloadAll();       // 🔄 reload
        await this.audioService.initializeSong();   // 🎵 reload bg music
      }
    });

    // Start reminders & yoga updates
    await this.reminders.startRollingReminders();
    await this.reminders.tick();
    await this.yogaUpdates.checkOnAppStart();

    // Resume events
    App.addListener('resume', async () => {
      await this.reminders.tick();
      await this.yogaUpdates.checkOnAppStart();
      this.registerNotificationListener();
    });

    // Handle foreground notifications
    LocalNotifications.addListener('localNotificationReceived', async () => {
      await this.reminders.chainNext();
    });

    this.registerNotificationListener();

    // Initialize language preference safely
    const isPortugueseValue = localStorage.getItem('isPortuguese');
    this.isPortuguese = isPortugueseValue === 'true';

    // Subscribe to modal visibility changes
    this.globalService.isModalOpen$.subscribe({
      next: (isOpen) => (this.isModalOpen = isOpen),
      error: (err) => console.error('Error in modal state subscription:', err),
    });
  }

  private registerNotificationListener() {
    if (this.listenersRegistered) return;
    this.listenersRegistered = true;

    LocalNotifications.addListener('localNotificationActionPerformed', async (event) => {
      // Always chain the next 3-day reminder
      await this.reminders.chainNext();

      const data = (event?.notification as any)?.extra;

      if (data?.type === 'yogaNew' && Array.isArray(data.ids) && data.ids.length) {
        // Deep link to Yoga and auto-open the first new class
        const firstId = data.ids[0];
        this.router.navigate(['/yoga'], { queryParams: { open: firstId } });
      } else {
        // Default: take them to Breathwork
        this.router.navigateByUrl('/breathwork');
      }
    });
  }

  onModalClose(): void {
    this.isModalOpen = false;
  }

  private setupInactivityMonitor(): void {
    const events = ['touchstart', 'click', 'mousemove', 'keydown'];

    events.forEach(event => {
      document.addEventListener(event, () => this.resetInactivityTimer());
    });

    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    clearTimeout(this.inactivityTimer);

    const overlay = document.querySelector('.dimOverlay') as HTMLElement;
    if (overlay) overlay.style.opacity = '0';

    this.inactivityTimer = setTimeout(() => {
      if (overlay) overlay.style.opacity = '0.8';
    }, 60000); // 1 min (adjust as needed)
  }
}
