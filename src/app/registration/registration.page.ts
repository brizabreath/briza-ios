import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';  // Needed for ngModel
import { IonicModule } from '@ionic/angular';  // Required for Ionic components
import { RouterModule } from '@angular/router'; // Import RouterModule

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
  isLoggingIn: boolean = false; // Add this variable to track login status
  isPortuguese: boolean = localStorage.getItem('isPortuguese') === 'true';



  constructor(private navCtrl: NavController, private authService: AuthService) {}

  async onRegister() {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.isLoggingIn = true; // Start blinking animation

    if (this.password !== this.confirmPassword) {
      // Passwords do not match, show localized error
      this.registrationError = isPortuguese
        ? 'As senhas não correspondem.'
        : 'Passwords do not match.';
    } else if (!navigator.onLine) {
      // User is offline, show localized error
      this.registrationError = isPortuguese
        ? 'Você está offline. Para registrar uma nova conta, você precisa de acesso à internet.'
        : 'You are offline. To register a new account, you must have internet access.';
    } else {
      try {
        // Call register() method from AuthService
        const success = await this.authService.register(this.email, this.password, this.name);

        if (success) {
          // Registration successful, redirect to login
          this.registrationError = '';
          this.navCtrl.navigateRoot('/breathwork');
        } else {
          // Registration failed (e.g., user already exists)
          this.registrationError = isPortuguese
            ? 'Falha no registro. O usuário pode já existir.'
            : 'Registration failed. User may already exist.';
        }
      } catch (error) {
        // Handle any unexpected errors
        this.registrationError = isPortuguese
          ? 'Ocorreu um erro durante o registro.'
          : 'An error occurred during registration.';
        console.error('Error during registration:', error);
      }finally {
        this.isLoggingIn = false; // Stop blinking animation
      }
    }
  }
}
