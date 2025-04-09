import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class ProfilePage implements AfterViewInit {
  @ViewChild('portuguese') portuguese!: ElementRef<HTMLButtonElement>;
  @ViewChild('english') english!: ElementRef<HTMLButtonElement>;
  @ViewChild('userEmail') userEmail!: ElementRef<HTMLDivElement>;

  membershipStatus: string = 'inactive';
  isPortuguese: boolean = false;
  isOnline: boolean = navigator.onLine;
  isLoggingOut: boolean = false; // Track loading state


  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
    private globalService: GlobalService ) {}

  async ngAfterViewInit() {
    try {
      let userEmail: string | null = null;
      let status: string | null = null;

      if (this.isOnline) {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          userEmail = currentUser.email || 'Unknown Email';
          this.userEmail.nativeElement.innerHTML = userEmail;
          status = localStorage.getItem('membershipStatus');
          this.membershipStatus = status || 'inactive';
        } else {
          console.error('No user is logged in.');
        }
      } else {
        userEmail = localStorage.getItem('currentUserEmail');
        this.userEmail.nativeElement.innerHTML = userEmail || 'Unknown Email';
        status = localStorage.getItem('membershipStatus');
        this.membershipStatus = status || 'inactive';
      }
    } catch (error) {
      console.error('Error in ngAfterViewInit:', error);
    }
  }

  ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
      this.english.nativeElement.onclick = () => this.toEnglish();
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
      this.portuguese.nativeElement.onclick = () => this.toPortuguese();
    }
  }

  async checkOnlineStatus(event: Event) {
    if (!this.isOnline) {
      event.preventDefault();
      const message = this.isPortuguese
        ? 'Você está offline. Por favor, conecte-se à internet para gerenciar sua conta/assinatura.'
        : 'You are offline. Please connect to the internet to manage your account/subscription.';
      alert(message);
      return;
    }

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const managementURL = customerInfo.managementURL;

      if (managementURL) {
        await Browser.open({ url: managementURL });
      } else {
        alert(this.isPortuguese
          ? 'Erro ao abrir configurações de assinatura. Verifique manualmente nas configurações do seu dispositivo.'
          : 'Error opening subscription settings. Please check manually in your device settings.');
      }
    } catch (error) {
      console.error('Error opening subscription settings:', error);
    }
  }

  checkOnlineStatus2(event: Event) {
    event.preventDefault();
    this.globalService.openModal2();
  }

  toEnglish(): void {
    localStorage.setItem('isPortuguese', 'false');
    window.location.reload();
  }

  toPortuguese(): void {
    localStorage.setItem('isPortuguese', 'true');
    window.location.reload();
  }

  onLogout() {
    if (this.isLoggingOut) return; // Prevent multiple clicks
    this.isLoggingOut = true;
  
    this.authService.logout().finally(() => {
      this.isLoggingOut = false;
    });
  }

  navigateToPage(page: string, event: Event) {
    if (!this.isOnline) {
      event.preventDefault();
      const message = this.isPortuguese
        ? 'Você está offline. Por favor, conecte-se à internet para gerenciar sua conta/assinatura.'
        : 'You are offline. Please connect to the internet to manage your account/subscription.';
      alert(message);
    } else {
      this.navCtrl.navigateForward(page);
    }
  }
}
