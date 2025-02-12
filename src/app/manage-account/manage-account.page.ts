import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-manage-account',
  templateUrl: './manage-account.page.html',
  styleUrls: ['./manage-account.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class ManageAccountPage {
  newEmail: string = '';
  email: string = '';
  confirmEmail: string = '';
  newPassword: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isPortuguese: boolean = false;

  constructor(private authService: AuthService, private navCtrl: NavController, private globalService: GlobalService) {}

  async ionViewWillEnter() {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    if (isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    }else{
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
  }

  async onManageAccount() {
    this.errorMessage = '';
    this.successMessage = '';
  
    try {
      if (this.email && this.password) {
        // Reauthenticate the user
        await this.authService.reauthenticate(this.email, this.password);
      } else {
        this.errorMessage = 'Please provide your current email and password for verification.';
        return;
      }
  
      if (this.newPassword && this.newPassword === this.confirmPassword) {
        await this.authService.updateUserPassword(this.newPassword);
        this.successMessage += ' Password updated successfully.';
      } else if (this.newPassword) {
        this.errorMessage = 'Password confirmation does not match.';
        return;
      }
    } catch (error: any) { // Explicitly specify 'any' for error
      if (error.code === 'auth/requires-recent-login') {
        this.errorMessage = 'You need to log in again to perform this action.';
      } else {
        this.errorMessage = error.message || 'An unexpected error occurred.';
      }
      console.error('Error managing account:', error);
    }
  }
  

  goBack() {
    this.navCtrl.back();
  }
}
