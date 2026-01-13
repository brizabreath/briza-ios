import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';  // Needed for ngModel
import { IonicModule } from '@ionic/angular';  // Required for Ionic components
import { RouterModule } from '@angular/router'; // Import RouterModule
import { Keyboard } from '@capacitor/keyboard';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.page.html',
  styleUrls: ['./registration.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class RegistrationPage {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  registrationError: string = '';
  isLoggingIn: boolean = false;
  isPortuguese: boolean = localStorage.getItem('isPortuguese') === 'true';

  constructor(
    private navCtrl: NavController,
    private authService: AuthService
  ) {}

  async onRegister() {
    const isPortuguese = this.isPortuguese;

    this.registrationError = '';
    this.isLoggingIn = true;

    // 1) Passwords must match
    if (this.password !== this.confirmPassword) {
      this.registrationError = isPortuguese
        ? 'As senhas não correspondem.'
        : 'Passwords do not match.';
      this.isLoggingIn = false;
      return;
    }

    // 2) Must be online
    if (!navigator.onLine) {
      this.registrationError = isPortuguese
        ? 'Você está offline. Para registrar uma nova conta, você precisa de acesso à internet.'
        : 'You are offline. To register a new account, you must have internet access.';
      this.isLoggingIn = false;
      return;
    }

    try {
      // 3) Call the cleaned-up AuthService
      await this.authService.register(this.email, this.password, this.name);

      // Success: clear error and go to app
      this.registrationError = '';
      this.navCtrl.navigateRoot('/breathwork');
    } catch (error: any) {
      await Keyboard.hide();
      const code = error?.code || '';

      switch (code) {
        case 'auth/weak-password':
          this.registrationError = isPortuguese
            ? 'A senha é muito fraca. Use pelo menos 6 caracteres.'
            : 'The password is too weak. Use at least 6 characters.';
          break;

        case 'auth/email-already-in-use':
          this.registrationError = isPortuguese
            ? 'Este e-mail já está em uso. Tente fazer login ou usar outro e-mail.'
            : 'This email is already in use. Try logging in or use a different email.';
          break;

        case 'auth/invalid-email':
          this.registrationError = isPortuguese
            ? 'E-mail inválido. Verifique o endereço digitado.'
            : 'Invalid email. Please check the address you entered.';
          break;

        case 'auth/network-request-failed':
          this.registrationError = isPortuguese
            ? 'Falha de rede. Verifique sua conexão com a internet.'
            : 'Network error. Please check your internet connection.';
          break;

        default:
          console.error('Unexpected registration error:', error);
          this.registrationError = isPortuguese
            ? 'Ocorreu um erro durante o registro. Tente novamente.'
            : 'An error occurred during registration. Please try again.';
          break;
      }
    } finally {
      this.isLoggingIn = false;
    }
  }
}
