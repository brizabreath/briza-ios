import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CoreModule } from '../core.module'; 
import { RouterModule } from '@angular/router'; // Import RouterModule

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
  email: string = '';
  password: string = '';
  loginError: string = ''; // Display localized error messages
  isLoggingIn: boolean = false; // Add this variable to track login status
  isPortuguese: boolean = localStorage.getItem('isPortuguese') === 'true';

  constructor(private navCtrl: NavController, private authService: AuthService) {}

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
        this.loginError = ''; // Clear any error
        this.navCtrl.navigateRoot('/home');
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
