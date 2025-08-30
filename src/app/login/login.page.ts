import { Component } from '@angular/core';
import { ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CoreModule } from '../core.module'; 
import { RouterModule } from '@angular/router'; // Import RouterModule
import { GlobalService } from '../services/global.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CoreModule,
    RouterModule
  ],
})
export class LoginPage {
  @ViewChild('portuguese') portuguese!: ElementRef<HTMLButtonElement>;
  @ViewChild('english') english!: ElementRef<HTMLButtonElement>;
  email: string = '';
  password: string = '';
  loginError: string = ''; // Display localized error messages
  isLoggingIn: boolean = false; // Add this variable to track login status
  isPortuguese: boolean = localStorage.getItem('isPortuguese') === 'true';
  
  constructor(private navCtrl: NavController, private authService: AuthService, private globalService: GlobalService) {}

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
    const lastEmail = localStorage.getItem('currentUserEmail');
    if (lastEmail) {
      this.email = lastEmail;
    }
  }
  toEnglish(): void {
    localStorage.setItem('isPortuguese', 'false');
    window.location.reload();
  }

  toPortuguese(): void {
    localStorage.setItem('isPortuguese', 'true');
    window.location.reload();
  }
  async onLogin() {
    if (!navigator.onLine) {
      this.authService.showAlert({
        en: 'You need to be online to log in. After logging in, you can use the app without an internet connection',
        pt: 'É necessário estar conectado à internet para fazer login. Após o login, você poderá usar o aplicativo sem conexão com a internet',
      });
      return;
    }

    this.isLoggingIn = true; // Start blinking animation

    try {
      const success = await this.authService.login(this.email, this.password);
      if (success) {
        localStorage.setItem('wasSignedIn', 'true');
        this.loginError = ''; // Clear any error
        this.navCtrl.navigateRoot('/breathwork');
      } else {
        this.loginError = this.isPortuguese
          ? 'Email ou senha inválidos.'
          : 'Invalid email or password.';
      }
    } catch (error) {
      this.loginError = this.isPortuguese
        ? 'Ocorreu um erro durante o login. Por favor, tente novamente.'
        : 'An error occurred during login. Please try again.';
      console.error('Login error:', error);
    } finally {
      this.isLoggingIn = false; // Stop blinking animation
    }
  }
}
