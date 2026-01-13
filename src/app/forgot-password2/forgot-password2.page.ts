import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule
import { GlobalService } from '../services/global.service';

@Component({
  selector: 'app-forgot-password2',
  templateUrl: './forgot-password2.page.html',
  styleUrls: ['./forgot-password2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class ForgotPassword2Page {
  email: string = '';
  resetError: string = '';
  resetSuccess: boolean = false;
  isLoggingIn: boolean = false; // Add this variable to track login status
  isPortuguese: boolean = localStorage.getItem('isPortuguese') === 'true';

  constructor(private navCtrl: NavController, private authService: AuthService, public globalService: GlobalService) {}
  async ionViewWillEnter() {
    this.email = localStorage.getItem('currentUserEmail') || '';
  }
  async onSubmit() {
    this.isLoggingIn = true; // Start blinking animation

    if (!this.email) {
      this.resetError = 'Please enter a valid email';
      return;
    }

    try {
      // Call AuthService's forgotPassword method to send reset email
      const success = await this.authService.forgotPassword(this.email);

      if (success) {
        // Display success message if the email was sent
        this.resetSuccess = true;
        this.resetError = '';
      } else {
        // Handle cases where the reset email could not be sent
        this.resetError = 'Failed to send reset email. Try again later.';
        this.resetSuccess = false;
      }
    } catch (error) {
      // Handle unexpected errors
      this.resetError = 'Error sending reset email. Please try again later.';
      console.error('Error during forgot password:', error);
    }
    finally {
      this.isLoggingIn = false; // Stop blinking animation
    }
  }
   // Method to navigate back
  goBack(): void {
    this.globalService.clearAllTimeouts();
    this.navCtrl.back(); // Goes back to the previous page in the history stack
    }
}
