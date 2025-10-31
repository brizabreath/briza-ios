import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NavController, Platform, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CoreModule } from '../core.module';
import { AuthService } from '../services/auth.service';
import { FirebaseService } from '../services/firebase.service';
import { GlobalService } from '../services/global.service';

// Firebase
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  linkWithCredential,
} from 'firebase/auth';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Plugins
import { GoogleOneTapAuth } from 'capacitor-native-google-one-tap-signin';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { addIcons } from 'ionicons';
import { logoGoogle, logoApple } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, CoreModule, RouterModule],
})
export class LoginPage implements OnInit {
  @ViewChild('portuguese') portuguese!: ElementRef<HTMLButtonElement>;
  @ViewChild('english') english!: ElementRef<HTMLButtonElement>;
  email: string = '';
  password: string = '';
  loginError: string = '';
  isLoggingIn: boolean = false;
  isPortuguese: boolean = localStorage.getItem('isPortuguese') === 'true';
  isIOS = false;
  showWebSplash = false;

  constructor(
    private platform: Platform,
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private globalService: GlobalService
  ) {
    addIcons({ logoGoogle, logoApple });
  }

  async ngOnInit() {
    this.isIOS = this.platform.is('ios');

    try {
      await GoogleOneTapAuth.initialize({
        clientId: this.isIOS
          ? '740921696216-hmlq7oqqjlvdl0abnlb9pg7qmiv7j54b.apps.googleusercontent.com'
          : '740921696216-u54m62rnm9793uameptrgu4a502a575h.apps.googleusercontent.com',
      });
    } catch (err) {
      console.error('⚠️ Google init failed', err);
    }
  }

  // =====================================================
  // Newsletter prompt shown after successful login/signup
  // =====================================================
  private async promptNewsletterConsent(uid: string): Promise<void> {
    const db = this.firebaseService.firestore;
    if (!db) return;

    const userDocRef = doc(db, `users/${uid}`);
    const userSnap = await getDoc(userDocRef);
    const data = userSnap.exists() ? userSnap.data() as Record<string, any> : {};

    // Skip if already active
    if (data && data['newsletterActive'] === true) {
      return;
    }

    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: this.isPortuguese ? 'Newsletter' : 'Newsletter',
        message: this.isPortuguese
          ? 'Gostaria de receber atualizações e dicas por e-mail?'
          : 'Would you like to receive updates and tips by email?',
        buttons: [
          {
            text: this.isPortuguese ? 'Não' : 'No',
            role: 'cancel',
            handler: async () => {
              await setDoc(userDocRef, { newsletterActive: false }, { merge: true });
              resolve(); // ✅ continue after choice
            },
          },
          {
            text: this.isPortuguese ? 'Sim' : 'Yes',
            handler: async () => {
              await setDoc(userDocRef, { newsletterActive: true }, { merge: true });
              resolve(); // ✅ continue after choice
            },
          },
        ],
      });

      await alert.present();
    });
  }




  // =============================================
  // Helper: login or create account if first time
  // =============================================
  private async linkOrLoginWithCredential(
    credential: any,
    email: string,
    name: string
  ) {
    const auth = getAuth();
    const db: Firestore | null = this.firebaseService.firestore;

    try {
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      const uid = user.uid;

      if (!db) {
        console.error('❌ Firestore is not initialized');
        return;
      }

      const userDocRef = doc(db, `users/${uid}`);
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        await setDoc(userDocRef, { email, name, results: {} });
      }

      await this.promptNewsletterConsent(uid);
    } catch (err: any) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        const existing = await fetchSignInMethodsForEmail(auth, email);
        if (existing.includes('password')) {
          const alert = await this.alertCtrl.create({
            header: 'Account Exists',
            message:
              'You already registered with this email using a password. Please log in with your email and password first, then you can link Google or Apple in your profile later.',
            buttons: ['OK'],
          });
          await alert.present();
        } else {
          console.warn('Existing provider:', existing);
        }
      } else {
        console.error('❌ Login/link error:', err);
      }
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

  // ==================
  // MANUAL LOGIN FLOW
  // ==================
  async onLogin() {
    if (!navigator.onLine) {
      this.authService.showAlert('OFFLINE', {
        en: 'You need to be online to log in. After logging in, you can use the app without an internet connection',
        pt: 'É necessário estar conectado à internet para fazer login. Após o login, você poderá usar o aplicativo sem conexão com a internet',
      });
      return;
    }

    this.isLoggingIn = true;

    try {
      const success = await this.authService.login(this.email, this.password);
      if (success) {
        localStorage.setItem('wasSignedIn', 'true');
        this.loginError = '';
        const user = getAuth().currentUser;
        if (user) await this.promptNewsletterConsent(user.uid);
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
      this.isLoggingIn = false;
    }
  }
  // =========================
  // GOOGLE SIGN-IN + LINKING
  // =========================
  async loginWithGoogle() {
    if (!navigator.onLine) {
      this.authService.showAlert('OFFLINE', {
        en: 'You need to be online to use Google Sign-In',
        pt: 'Você precisa estar online para usar o login com Google',
      });
      return;
    }

    this.showWebSplash = true; // 🟢 Start splash

    try {
      // ✅ Ensure any previous Google session is cleared
      try {
        await (GoogleOneTapAuth as any).signOut?.();
      } catch (err) {
        console.warn('⚠️ Could not sign out previous session:', err);
      }

      let result: any;

      try {
        result = await GoogleOneTapAuth.tryAutoOrOneTapSignIn();
        if (!result?.isSuccess) {
          result = await GoogleOneTapAuth.signInWithGoogleButtonFlowForNativePlatform();
        }
      } catch (err) {
        console.warn('One Tap fallback triggered:', err);
        result = await GoogleOneTapAuth.signInWithGoogleButtonFlowForNativePlatform();
      }

      const idToken =
        result?.success?.idToken ||
        result?.credential?.idToken ||
        result?.idToken ||
        null;


      if (!result?.isSuccess || !idToken) {
        console.warn('❌ No Google credential received');
        this.showWebSplash = false;
        return;
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const email = idToken?.email ?? 'unknown@user.com';
      const name = idToken?.displayName ?? email.split('@')[0];

      const auth = getAuth();
      try {
        await this.linkOrLoginWithCredential(credential, email, name);
        this.showWebSplash = false; // 🟢 Hide splash
        this.navCtrl.navigateRoot('/breathwork');
      } catch (err: any) {
        this.showWebSplash = false;
        if (err.code === 'auth/account-exists-with-different-credential') {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (methods.includes('password')) {
            const password = prompt('Enter your password for this account:') || '';
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await linkWithCredential(userCredential.user, credential);
            await this.promptNewsletterConsent(userCredential.user.uid);
            this.navCtrl.navigateRoot('/breathwork');
          } else {
            console.warn('Existing provider:', methods);
          }
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      this.showWebSplash = false; // 🟢 Hide splash on error
      console.error('❌ Google Sign-In failed:', err);
      this.authService.showAlert('Error', {
        en: 'Google Sign-In failed. Please try again.',
        pt: 'Falha no login com Google. Por favor, tente novamente.',
      });
    }
  }

async loginWithApple() {
  if (!navigator.onLine) {
    this.authService.showAlert('OFFLINE', {
      en: 'You need to be online to use Apple Sign-In',
      pt: 'Você precisa estar online para usar o login com Apple',
    });
    return;
  }

  this.showWebSplash = true;

  try {
    // 1) nonce: raw + hashed
    const rawNonce = this.generateNonce();
    const hashedNonce = await this.sha256(rawNonce);

    const res: any = await SignInWithApple.authorize({
      clientId: 'com.brizabreath.app', // must match your Service ID in Apple Developer + Firebase
      redirectURI: 'https://brizabreath-ea097.firebaseapp.com/__/auth/handler',
      scopes: 'email name', // "name" or "full_name" both fine
      nonce: hashedNonce,
    });


    const response = res?.response || res;
    const { identityToken, email, givenName, familyName } = response || {};

    if (!identityToken) throw new Error('Missing Apple identity token');

    // 3) Firebase credential: pass RAW nonce
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken: identityToken,
      rawNonce: rawNonce,
    });

    // 4) Sign in with Firebase
    const auth = getAuth();
    const result = await signInWithCredential(auth, credential);

    // 5) Firestore user
    const user = result.user;
    const db = this.firebaseService.firestore;
    if (!db) {
      console.error('❌ Firestore is not initialized');
      this.showWebSplash = false;
      return;
    }

    const userDocRef = doc(db, `users/${user.uid}`);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      const displayName =
        (givenName || familyName)
          ? `${givenName || ''} ${familyName || ''}`.trim()
          : email
            ? email.split('@')[0]
            : '';
      await setDoc(userDocRef, {
        email: email ?? null,
        name: displayName,
        results: {},
        newsletterActive: false,
      });
    }

    if (email) {
      const userData = (await getDoc(userDocRef)).data() || {};
      if (userData['newsletterActive'] === false) {
        await this.promptNewsletterConsent(user.uid);
      }
    }

    this.showWebSplash = false;
    this.navCtrl.navigateRoot('/breathwork');
  } catch (err: any) {
    this.showWebSplash = false;

    // 🔍 beefed-up diagnostics
    const friendly = {
      code: err?.code,
      message: err?.message,
      name: err?.name,
      customData: err?.customData,
      tokenResponse: err?.customData?._tokenResponse,
    };
    console.error('❌ Apple Sign-In failed (full error):', friendly);

    this.authService.showAlert('Error', {
      en: 'Apple Sign-In failed. Please try again.',
      pt: 'Falha no login com Apple. Por favor, tente novamente.',
    });
  }
}



  // 🔐 Secure random nonce generator
  private generateNonce(length: number = 32): string {
    const charset =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    const result: string[] = [];
    const cryptoObj = window.crypto || (window as any).msCrypto;
    const random = new Uint8Array(length);
    cryptoObj.getRandomValues(random);
    for (let i = 0; i < length; i++) {
      result.push(charset[random[i] % charset.length]);
    }
    return result.join('');
  }

  // 🔄 SHA-256 hash (Apple expects nonce hashed)
  private async sha256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
