import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ModalComponent } from './modal/modal.component';
import { GlobalService } from './services/global.service';
import { AuthService } from './services/auth.service'; // Your authentication service

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalComponent, // Certifique-se de que ModalComponent está importado aqui
  ],
})
export class AppComponent {
  isModalOpen: boolean = false;
  isPortuguese: boolean = false;
  private inactivityTimer: any;

  constructor(private globalService: GlobalService, private authService: AuthService) {
    this.setupInactivityMonitor();
  }
  async ngOnInit(){
    // Initialize language preference safely
    const isPortugueseValue = localStorage.getItem('isPortuguese');
    this.isPortuguese = isPortugueseValue === 'true';
  
    // Subscribe to modal visibility changes
    this.globalService.isModalOpen$.subscribe({
      next: (isOpen) => (this.isModalOpen = isOpen),
      error: (err) => console.error('Error in modal state subscription:', err),
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
