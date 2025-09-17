import { Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ModalComponent } from './modal/modal.component';
import { GlobalService } from './services/global.service';
import { Platform } from '@ionic/angular';
import { LocalReminderService } from './services/local-reminder.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { Router, RouterModule } from '@angular/router'; // Import RouterModule
import { YogaUpdateService } from './services/yoga-update.service';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';


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
    IonicModule, 
    RouterModule
  ]
})
export class AppComponent implements OnInit{
  isModalOpen: boolean = false;
  isPortuguese: boolean = false;
  private inactivityTimer: any;
  showWebSplash = true;
  private listenersRegistered = false;

  constructor(private globalService: GlobalService, private reminders: LocalReminderService, private platform: Platform, private router: Router, private yogaUpdates: YogaUpdateService) {
    this.setupInactivityMonitor();
    this.initializeApp();
    Keyboard.setResizeMode({ mode: KeyboardResize.None });
  }
  async initializeApp() {
    await this.platform.ready();
     // Wait until your app or home content is ready
    setTimeout(() => {
      this.showWebSplash = false;
    }, 2000); // adjust as needed
  }
  async ngOnInit(){
    //save it for future tests
    //await this.reminders.debugFireIn(10);
    await this.reminders.startRollingReminders(); // ensure a next reminder exists
    await this.reminders.tick();                  // double-check at launch
     // ✅ Check for new yoga classes whenever the app launches
    await this.yogaUpdates.checkOnAppStart();

    App.addListener('resume', async () => {
      await this.reminders.tick();
      await this.yogaUpdates.checkOnAppStart();
      this.registerNotificationListener(); // safe due to guard
    });

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
    this.isModalOpen = false; // Fecha o modal
  }
  setupInactivityMonitor(): void {
    const events = ['touchstart', 'click', 'mousemove', 'keydown'];

    events.forEach(event => {
      document.addEventListener(event, () => this.resetInactivityTimer());
    });

    this.resetInactivityTimer();
  }

  resetInactivityTimer(): void {
    clearTimeout(this.inactivityTimer);

    const overlay = document.querySelector('.dimOverlay') as HTMLElement;
    if (overlay) overlay.style.opacity = '0';

    this.inactivityTimer = setTimeout(() => {
      if (overlay) overlay.style.opacity = '0.8';
    }, 60000); // 30 seconds
  }
}
