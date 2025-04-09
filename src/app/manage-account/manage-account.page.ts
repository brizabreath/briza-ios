import { Component } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
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

  constructor(private authService: AuthService, private navCtrl: NavController, private globalService: GlobalService, private alertController: AlertController) {}

  async ionViewWillEnter() {
    this.email = localStorage.getItem('currentUserEmail') || '';
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
  
    if (!this.email || !this.password) {
      this.errorMessage = 'Please provide your current email and password.';
      return;
    }
  
    const changingEmail = !!this.newEmail.trim();
    const changingPassword = !!this.newPassword.trim();
  
    if (!changingEmail && !changingPassword) {
      this.errorMessage = 'Please fill in new email or new password.';
      return;
    }
  
    try {
      // Reauthenticate before making changes
      await this.authService.reauthenticate(this.email, this.password);
  
      if (changingEmail) {
        await this.authService.updateUserEmail(this.newEmail.trim());
        this.successMessage += ' Email updated successfully.';
        this.email = this.newEmail.trim(); // Update local display
        this.newEmail = '';
      }
  
      if (changingPassword) {
        if (this.newPassword !== this.confirmPassword) {
          this.errorMessage = 'Password confirmation does not match.';
          return;
        }
        await this.authService.updateUserPassword(this.newPassword.trim());
        this.successMessage += ' Password updated successfully.';
        this.newPassword = '';
        this.confirmPassword = '';
      }
  
    } catch (error: any) {
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
  async confirmAccountDeletion(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete Account',
      message: 'Deleting your account is permanent. You must manually cancel your subscription in the App Store to avoid future charges. Are you sure you want to delete your account?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
        },
        {
          text: 'Yes, Delete',
          handler: async () => {
            await this.authService.deleteAccount();
          },
        },
      ],
    });
    await alert.present();
  }
}
