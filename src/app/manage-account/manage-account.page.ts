import { Component } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { GlobalAlertService } from '../services/global-alert.service';

@Component({
  selector: 'app-manage-account',
  templateUrl: './manage-account.page.html',
  styleUrls: ['./manage-account.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class ManageAccountPage {
  newEmail: string = '';
  name: string = '';
  email: string = '';
  newPassword: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isPortuguese: boolean = false;

  // Provider flags
  isGoogleUser: boolean = false;
  isAppleUser: boolean = false;

  // To detect if name actually changed
  originalName: string = '';

  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
    private globalService: GlobalService,
    private alertController: AlertController,
    private globalAlert: GlobalAlertService,
  ) {}

  // Password is only required when changing email/password for password-based accounts
  get mustProvidePassword(): boolean {
    if (this.isGoogleUser || this.isAppleUser) return false;
    return !!this.newEmail.trim() || !!this.newPassword.trim();
  }

  async ionViewWillEnter() {
    this.email = localStorage.getItem('currentUserEmail') || '';
    this.name = localStorage.getItem('currentUserName') || '';
    this.originalName = this.name;

    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    // Detect auth provider (google.com, apple.com, password, etc.)
    try {
      const providerId = await this.authService.getCurrentUserProviderId();
      this.isGoogleUser = providerId === 'google.com';
      this.isAppleUser = providerId === 'apple.com';
    } catch (e) {
      console.warn('Could not determine auth provider', e);
      this.isGoogleUser = false;
      this.isAppleUser = false;
    }
  }

  async onManageAccount() {
    this.errorMessage = '';
    this.successMessage = '';

    const trimmedName = this.name.trim();
    const changingEmail = !!this.newEmail.trim();
    const changingPassword = !!this.newPassword.trim();
    const changingName = trimmedName !== this.originalName;

    if (!changingEmail && !changingPassword && !changingName) {
      this.errorMessage = this.isPortuguese
        ? 'Preencha novo nome.'
        : 'Please fill in new name.';
      return;
    }

    // Block email/password changes for Google or Apple accounts
    if ((this.isGoogleUser || this.isAppleUser) && (changingEmail || changingPassword)) {
      this.errorMessage = this.isPortuguese
        ? 'Contas criadas com Google ou Apple não podem alterar e-mail ou senha aqui.'
        : 'Accounts created with Google or Apple cannot change email or password here.';
      return;
    }

    // For password-based accounts, require reauth IF changing email or password
    if (!this.isGoogleUser && !this.isAppleUser && (changingEmail || changingPassword)) {
      if (!this.email || !this.password) {
        this.errorMessage = this.isPortuguese
          ? 'Informe seu e-mail e senha atuais para alterar e-mail ou senha.'
          : 'Please provide your current email and password to change email or password.';
        return;
      }

      try {
        await this.authService.reauthenticate(this.email, this.password);
      } catch (error: any) {
        console.error('Error reauthenticating:', error);
        switch (error.code) {
          case 'auth/user-mismatch':
          case 'auth/user-not-found':
            this.errorMessage = this.isPortuguese
              ? 'Usuário não encontrado. Verifique o e-mail informado.'
              : 'User not found. Please check your email.';
            break;
          case 'auth/invalid-email':
            this.errorMessage = this.isPortuguese
              ? 'Formato de e-mail inválido.'
              : 'Invalid email format.';
            break;
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
            this.errorMessage = this.isPortuguese
              ? 'Senha incorreta. Tente novamente.'
              : 'Incorrect password. Please try again.';
            break;
          default:
            this.errorMessage = this.isPortuguese
              ? 'Erro ao reautenticar. Tente novamente mais tarde.'
              : (error.message || 'Error reauthenticating. Please try again later.');
            break;
        }
        return; // stop if reauth failed
      }
    }

    // If we’re here:
    // - either we only changed name (any provider, no reauth)
    // - or reauth succeeded for email/password changes

    try {
      // EMAIL CHANGE (password accounts only)
      if (changingEmail && !this.isGoogleUser && !this.isAppleUser) {
        const newEmailTrimmed = this.newEmail.trim();
        await this.authService.updateUserEmail(newEmailTrimmed);
        this.successMessage += this.isPortuguese
          ? ' E-mail atualizado com sucesso.'
          : ' Email updated successfully.';
        this.email = newEmailTrimmed;
        localStorage.setItem('currentUserEmail', this.email);
        this.newEmail = '';
      }

      // PASSWORD CHANGE (password accounts only)
      if (changingPassword && !this.isGoogleUser && !this.isAppleUser) {
        if (this.newPassword !== this.confirmPassword) {
          this.errorMessage = this.isPortuguese
            ? 'A confirmação da senha não corresponde.'
            : 'Password confirmation does not match.';
          return;
        }
        await this.authService.updateUserPassword(this.newPassword.trim());
        this.successMessage += this.isPortuguese
          ? ' Senha atualizada com sucesso.'
          : ' Password updated successfully.';
        this.newPassword = '';
        this.confirmPassword = '';
      }

      // NAME CHANGE (all providers)
      if (changingName) {
        localStorage.setItem('currentUserName', trimmedName);
        await this.authService.updateUserName(trimmedName);
        this.originalName = trimmedName;
        this.successMessage += this.isPortuguese
          ? ' Nome atualizado com sucesso.'
          : ' Name updated successfully.';
      }
    } catch (error: any) {
      console.error('Error managing account:', error);
      switch (error.code) {
        case 'auth/invalid-email':
          this.errorMessage = this.isPortuguese
            ? 'Formato de e-mail inválido.'
            : 'Invalid email format.';
          break;
        case 'auth/email-already-in-use':
          this.errorMessage = this.isPortuguese
            ? 'Este e-mail já está em uso.'
            : 'This email is already in use.';
          break;
        default:
          this.errorMessage = this.isPortuguese
            ? 'Ocorreu um erro inesperado. Tente novamente mais tarde.'
            : (error.message || 'An unexpected error occurred.');
          break;
      }
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  async confirmAccountDeletion(): Promise<void> {
    const online = navigator.onLine;
    if(online){
      const alert = await this.alertController.create({
        header: this.isPortuguese ? 'Deletar conta' : 'Delete Account',
        message: this.isPortuguese
          ? 'Deletar sua conta é permanente. Você deve cancelar manualmente sua assinatura na App Store para evitar futuras cobranças. Tem certeza de que deseja deletar sua conta?'
          : 'Deleting your account is permanent. You must manually cancel your subscription in the App Store to avoid future charges. Are you sure you want to delete your account?',
        buttons: [
          {
            text: this.isPortuguese ? 'Não' : 'No',
            role: 'cancel',
          },
          {
            text: this.isPortuguese ? 'Sim, deletar' : 'Yes, Delete',
            handler: async () => {
              await this.authService.deleteAccount();
            },
          },
        ],
      });
      await alert.present();
    }else{
      const msg = this.isPortuguese
        ? '🌐 Você está offline.\n\nConecte-se à internet para deletar conta'
        : '🌐 You are offline.\n\nConnect to the internet to delete account';
      this.globalAlert.showalert('OFFLINE', msg);
      return;
    }
  }
}
