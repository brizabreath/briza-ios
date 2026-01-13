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
  isAndroid = false;
  showWebSplash = false;
  private readonly LANG_KEY = 'isPortuguese';
  private readonly LANG_CHOSEN_KEY = 'languageChosen';

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
    this.isAndroid = this.platform.is('android');

    // IMPORTANT:
    // - iOS uses its iOS client ID (already working)
    // - Android uses the WEB client ID
    const iosClientId = '740921696216-hmlq7oqqjlvdl0abnlb9pg7qmiv7j54b.apps.googleusercontent.com';
    const androidWebClientId = '1062876241537-mcfda9bkmgmtcm5m2kfjdirht1uigush.apps.googleusercontent.com'; // from Google Cloud (Web client)

    const clientId = this.isIOS
      ? iosClientId
      : this.isAndroid
      ? androidWebClientId
      : '';

    try {
      if (clientId) {
        await GoogleOneTapAuth.initialize({ clientId });
      } else {
        console.warn('GoogleOneTapAuth: no clientId for this platform (likely web).');
      }
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

    // If doc doesn't exist yet, default to true
    if (!userSnap.exists()) {
      await setDoc(userDocRef, { newsletterActive: true }, { merge: true });
      return;
    }

    const data = userSnap.data() as Record<string, any>;

    // Do nothing if the field already exists (true or false)
    if (Object.prototype.hasOwnProperty.call(data, "newsletterActive")) {
      return;
    }

    // Field missing -> default to true (one-time)
    await setDoc(userDocRef, { newsletterActive: true }, { merge: true });
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

    if (!db) {
      console.error('❌ Firestore is not initialized');
      return;
    }

    // This will:
    // - sign in existing Google user
    // - or create a new Firebase user if it's first time
    // - or throw auth/account-exists-with-different-credential (handled by caller)
    const result = await signInWithCredential(auth, credential);
    const user = result.user;
    const uid = user.uid;

    const userDocRef = doc(db, `users/${uid}`);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      await setDoc(userDocRef, {
        email,
        name,
        results: {},
        newsletterActive: true,
      });
    }

    await this.promptNewsletterConsent(uid);
  }


  ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.showLanguagePickerIfNeeded();
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
    localStorage.setItem('languageChosen', 'true');
    window.location.reload();
  }

  toPortuguese(): void {
    localStorage.setItem('isPortuguese', 'true');
    localStorage.setItem('languageChosen', 'true');
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

    this.showWebSplash = true;

    try {
      // Try to sign out previous Google session (best effort)
      try {
        await (GoogleOneTapAuth as any).signOut?.();
      } catch (err) {
        console.warn('⚠️ Could not sign out previous Google session:', err);
      }

      let result: any;

      // 1) Try auto / one-tap sign-in first
      try {
        result = await GoogleOneTapAuth.tryAutoOrOneTapSignIn();
      } catch (err) {
        console.warn('One Tap auto sign-in failed, will fall back to button flow:', err);
        result = null;
      }

      // 2) If that wasn’t successful, force the button flow (android + iOS)
      if (!result || !result.isSuccess) {
        result = await GoogleOneTapAuth.signInWithGoogleButtonFlowForNativePlatform();
      }

      if (!result?.isSuccess || !result.success) {
        console.warn('❌ Google Sign-In: no success result');
        this.showWebSplash = false;
        return;
      }

      const success = result.success;

      // Plugin guarantees idToken as base64 JWT string 
      const rawIdToken: string | undefined = success.idToken;
      if (!rawIdToken) {
        console.error('❌ Google Sign-In: missing idToken');
        this.showWebSplash = false;
        return;
      }

      // Decode JWT payload to extract email / name
      const payload = this.decodeJwtPayload(rawIdToken);
      const email = payload?.email || 'unknown@user.com';
      const name =
        payload?.name ||
        payload?.given_name ||
        (email.includes('@') ? email.split('@')[0] : 'User');

      const credential = GoogleAuthProvider.credential(rawIdToken);
      const auth = getAuth();

      try {
        // Normal path: sign in or create user
        await this.linkOrLoginWithCredential(credential, email, name);

        localStorage.setItem('wasSignedIn', 'true');
        this.showWebSplash = false;
        this.navCtrl.navigateRoot('/breathwork');
      } catch (err: any) {
        // Handle "account exists with different credential" here
        this.showWebSplash = false;

        if (err?.code === 'auth/account-exists-with-different-credential') {
          const methods = await fetchSignInMethodsForEmail(auth, email);

          if (methods.includes('password')) {
            // User originally registered with email/password.
            // Ask for the password ONCE and then link Google so next time is smooth.
            const pwd = prompt(
              this.isPortuguese
                ? 'Você já tem uma conta com esse email usando senha. Digite sua senha para conectar o Google a essa conta:'
                : 'You already have an account with this email using a password. Enter your password to link Google to this account:'
            );

            if (!pwd) {
              return; // user canceled
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, pwd);
            await linkWithCredential(userCredential.user, credential);
            await this.promptNewsletterConsent(userCredential.user.uid);

            localStorage.setItem('wasSignedIn', 'true');
            this.navCtrl.navigateRoot('/breathwork');
          } else {
            console.warn('Existing providers for this email:', methods);
            this.authService.showAlert('Error', {
              en: 'This email is already used with a different sign-in method.',
              pt: 'Este email já está sendo usado com outro método de login.',
            });
          }
        } else {
          console.error('❌ Google Sign-In error:', err);
          this.authService.showAlert('Error', {
            en: 'Google Sign-In failed. Please try again.',
            pt: 'Falha no login com Google. Por favor, tente novamente.',
          });
        }
      }
    } catch (err: any) {
      this.showWebSplash = false;
      console.error('❌ Google Sign-In failed (outer):', err);
      this.authService.showAlert('Error', {
        en: 'Google Sign-In failed. Please try again.',
        pt: 'Falha no login com Google. Por favor, tente novamente.',
      });
    }
  }
  // Decode a JWT payload safely
  private decodeJwtPayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to decode JWT payload', e);
      return null;
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
      if (userData['newsletterActive'] === true) {
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
  private async showLanguagePickerIfNeeded(): Promise<void> {
    // Only show if user never chose language before
    const alreadyChosen = localStorage.getItem(this.LANG_CHOSEN_KEY) === 'true';
    if (alreadyChosen) return;

    // Prevent showing twice (if page lifecycle runs multiple times)
    // Optional: you can add a class flag if needed.
    const alert = await this.alertCtrl.create({
      header: 'Choose your language',
      message: 'Escolha seu idioma',
      backdropDismiss: false,
      cssClass: 'briza-alert briza-alert-confirm',
      buttons: [
        {
          text: 'Português',
          handler: () => {
            localStorage.setItem(this.LANG_KEY, 'true');
            localStorage.setItem(this.LANG_CHOSEN_KEY, 'true');
            window.location.reload();
          },
        },
        {
          text: 'English',
          handler: () => {
            localStorage.setItem(this.LANG_KEY, 'false');
            localStorage.setItem(this.LANG_CHOSEN_KEY, 'true');
            window.location.reload();
          },
        },
      ],
    });

    await alert.present();
  }
}
