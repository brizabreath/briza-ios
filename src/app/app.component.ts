import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ModalComponent } from './modal/modal.component';
import { GlobalService } from './services/global.service';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { AuthService } from './services/auth.service'; // Your authentication service
import { KeepAwake } from '@capacitor-community/keep-awake';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
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

  constructor(private globalService: GlobalService, private authService: AuthService) {
    this.globalService.initializeApp();
    this.preventSleepMode();
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
  async preventSleepMode() {
    try {
      await KeepAwake.keepAwake();
      console.log('Screen will stay awake.');
    } catch (error) {
      console.error('Error keeping screen awake:', error);
    }
  }
}
