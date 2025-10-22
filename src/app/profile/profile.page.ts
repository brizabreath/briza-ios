import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { RevenuecatService } from '../services/revenuecat.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class ProfilePage implements OnInit, AfterViewInit {
  @ViewChild('userEmail') userEmail!: ElementRef<HTMLDivElement>;

  membershipStatus: string = 'inactive';
  isPortuguese = false;
  isOnline = navigator.onLine;
  isLoggingOut = false;
  newsletterActive = false;
  private t(s: { en: string; pt: string }) {
    return this.isPortuguese ? s.pt : s.en;
  }

  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
    private globalService: GlobalService,
    private firebaseService: FirebaseService,
    private globalAlert: GlobalAlertService,
    private revenuecat: RevenuecatService
  ) {}

  ngOnInit() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
      }
    });
  }

  async ngAfterViewInit() {
    try {
      const currentUser = this.authService.getCurrentUser();
      let email: string | null = null;
      if (currentUser) {
        email = currentUser.email || 'Unknown Email';
      } else {
        email = localStorage.getItem('currentUserEmail') || 'Unknown Email';
      }
      this.userEmail.nativeElement.innerHTML = email;

      // Membership
      this.membershipStatus = localStorage.getItem('membershipStatus') || 'inactive';

      // Newsletter
      if (currentUser && this.firebaseService.firestore) {
        const userDocRef = doc(this.firebaseService.firestore, `users/${currentUser.uid}`);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          this.newsletterActive = !!data['newsletterActive'];
        }
      }
    } catch (error) {
      console.error('Error in ngAfterViewInit:', error);
    }
  }

  // Newsletter
  async toggleNewsletter(subscribe: boolean) {
    if (!this.firebaseService.firestore) return;
    const user = this.authService.getCurrentUser();
    if (!user) return;
    const userDocRef = doc(this.firebaseService.firestore, `users/${user.uid}`);
    await setDoc(userDocRef, { newsletterActive: subscribe }, { merge: true });
    this.newsletterActive = subscribe;

    this.globalAlert.showalert(
      'Newsletter',
      subscribe
        ? this.t({
            en: 'You have successfully subscribed to the newsletter!',
            pt: 'Você foi inscrito na newsletter com sucesso!',
          })
        : this.t({
            en: 'You have unsubscribed from the newsletter.',
            pt: 'Você cancelou sua inscrição na newsletter.',
          })
    );
  }

  isAdmin() {
    const user = this.firebaseService.auth?.currentUser;
    return user?.email === 'info@brizabreath.com';
  }

  goToAdminComments() {
    this.navCtrl.navigateForward('/manage-comments');
  }

  ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  }

  // =========================================
  // MANAGE SUBSCRIPTION (FINAL CLEAN LOGIC)
  // =========================================
  async onManageSubscriptionClick(ev: Event) {
    ev.preventDefault();
    const snapshot = await this.revenuecat.getSnapshot();
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    const t = (en: string, pt: string) => (isPortuguese ? pt : en);
    const storeName = snapshot.platform === 'ios' ? 'Apple' : 'Google';
    const storeURL = snapshot.managementURL || this.revenuecat.getManageSubscriptionUrl?.();

    // Always update cache
    localStorage.setItem('membershipStatus', snapshot.status);
    localStorage.setItem('membershipSource', snapshot.source);

    // ============================================================
    // OFFLINE LOGIC
    // ============================================================
    if (!snapshot.online) {
      this.globalAlert.showalert(
        ('Offline'),
        t(
          'You are offline. Go online to manage your subscription',
          'Você está offline. Vá online para administrar sua assinatura'
        )
      );
      return;
    }

    // ============================================================
    // ONLINE LOGIC
    // ============================================================
    if (snapshot.source === 'whitelist') {
      this.globalAlert.showalert(
        t('Unlimited Access', 'Acesso Ilimitado'),
        t('Your account has unlimited access.', 'Sua conta possui acesso ilimitado.')
      );
      return;
    }

    // ============================================================
    // 3️⃣ 7-DAY TRIAL ACTIVE
    // ============================================================
    if (snapshot.source === 'trial' || snapshot.trialActive) {
      this.globalAlert.showalert(
        t('Trial Active', 'Teste Ativo'),
        t(
          `${snapshot.trialDaysLeft} days left in your trial.`,
          `Faltam ${snapshot.trialDaysLeft} dias para o fim do seu teste.`
        )
      );
      return;
    }
    if (snapshot.status === 'active'){
      if (storeURL) {
        window.open(storeURL, '_blank');
      } else {
        this.globalAlert.showalert(
          t('Subscription', 'Assinatura'),
          t(
            `Unable to open your ${storeName} subscription settings.`,
            `Não foi possível abrir as configurações de assinatura da sua conta ${storeName}.`
          )
        );
      }
    }else{
       // ============================================================
      // MEMBERSHIP REQUIRED (no sub, inactive, expired, or logged out)
      // ============================================================
      this.globalAlert.showalert(
        t('Subscription Required', 'Assinatura Necessária'),
        t(
          `Choose a subscription to have full access of the app`,
          `Escolha uma assinatura para ter acesso total do app`
        )
      );
      this.globalService.openModal2Safe();
    }
  }


  // =========================================
  // LOGOUT
  // =========================================
  onLogout() {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    this.authService.logout().finally(() => (this.isLoggingOut = false));
  }

  // =========================================
  // NAVIGATION
  // =========================================
  navigateToPage(page: string, event: Event) {
    if (!this.isOnline) {
      event.preventDefault();
      this.globalAlert.showalert(
        'OFFLINE',
        this.t({
          en: 'You are offline. Connect to manage your account.',
          pt: 'Você está offline. Conecte-se para gerenciar sua conta.',
        })
      );
    } else {
      this.navCtrl.navigateForward(page);
    }
  }
}
