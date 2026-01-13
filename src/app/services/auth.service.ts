import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  UserCredential,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
  deleteUser,
  verifyBeforeUpdateEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { Firestore, doc, setDoc, getDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { RevenuecatService } from './revenuecat.service';
import { GlobalAlertService } from '../services/global-alert.service';

interface UserData {
  email: string;
  hashedPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private firebaseService: FirebaseService, private rc: RevenuecatService, private globalAlert: GlobalAlertService) {
    const auth = this.firebaseService.auth;
    if (auth) {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          localStorage.setItem('currentUserUID', user.uid);
          localStorage.setItem('currentUserEmail', user.email || '');

          // Fetch user name from Firestore
          try {
            const userDocRef = doc(this.getFirestore(), `users/${user.uid}`);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              const name = data?.['name'] || '';
              localStorage.setItem('currentUserName', name);
            } else {
              localStorage.setItem('currentUserName', '');
            }
          } catch (error) {
            console.error('Failed to fetch user name:', error);
            localStorage.setItem('currentUserName', '');
          }

          this.setRevenueCatUser(); // Link RevenueCat user on login
        } else {
          localStorage.removeItem('currentUserUID');
          localStorage.removeItem('currentUserName');
          localStorage.removeItem('membershipStatus');
        }
      });
    }
  }
  async getCurrentUserProviderId(): Promise<string | null> {
    const auth = this.firebaseService.auth;
    if (!auth) return null;

    const user = auth.currentUser;
    if (!user || !user.providerData || user.providerData.length === 0) {
      return null;
    }

    return user.providerData[0]?.providerId || null; // 'password', 'google.com', 'apple.com'
  }


  async syncMembershipTypeToFirestore(snap : any): Promise<void> {
    const auth = this.firebaseService.auth;
    if (!auth || !auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const newType = snap.membershipType || 'free';
    const cachedType = localStorage.getItem('membershipType');

    // Only write if changed
    if (cachedType === newType) return;

    localStorage.setItem('membershipType', newType);

    const userDocRef = doc(this.getFirestore(), `users/${uid}`);
    await setDoc(
      userDocRef,
      {
        membership: {
          type: newType,
          status: snap.status, // active/inactive
          source: snap.source,
          rcProductId: snap.rcProductId || null,
          rcPeriodType: snap.rcPeriodType || null,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );
  }

  private getFirestore(): Firestore {
    if (!this.firebaseService.firestore) {
      throw new Error('Firestore is not initialized. Please ensure Firebase is configured properly');
    }
    return this.firebaseService.firestore;
  }

  isPortuguese(): boolean {
    return localStorage.getItem('isPortuguese') === 'true';
  }

  showAlert(header: string, message: { en: string; pt: string }): void {
    this.globalAlert.showalert(header, this.isPortuguese() ? message.pt : message.en);
  }

  async register(email: string, password: string, name?: string): Promise<void> {
    const auth = this.firebaseService.auth;
    if (!auth) {
      // This is a dev/config error, not a user-facing "offline" thing.
      throw new Error('Firebase Auth is not initialized.');
    }

    // Let Firebase throw its own errors (weak-password, email-already-in-use, etc)
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const uid = user.uid;

    // Use sanitized name or fallback to first word of email
    const displayName = this.sanitizeName(name || email.split('@')[0]);

    const userDocRef = doc(this.getFirestore(), `users/${uid}`);
    await setDoc(userDocRef, {
      email: user.email,
      name: displayName,
      results: {},
      newsletterActive: true
    });
    this.saveUserLocally(email);

    // User stays logged in, link to RevenueCat
    await this.setRevenueCatUser();
  }


  async login(email: string, password: string): Promise<boolean> {
    const auth = this.firebaseService.auth;
    if (!auth) {
      this.showAlert('OFFLINE',{
        en: 'You cannot log in while offline',
        pt: 'Você não pode entrar enquanto estiver offline',
      });
      return false;
    }
  
    try {
      await this.rc.init();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      const uid = user.uid;
      // 🔥 Fetch and store user's saved results from Firestore
      const userDocRef = doc(this.getFirestore(), `users/${uid}`);
      const userDocSnap = await getDoc(userDocRef);
  
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData['results']) { // Use index signature
          this.saveResultsToLocalStorage(userData['results']);
        }
      }      
      // New: Ensure user has a name set in Firestore
      await this.ensureUserNameExists();
      // 🔥 Log in to RevenueCat with appUserID
      await Purchases.logIn({ appUserID: uid });
      // Use unified subscription logic
      await this.rc.getSnapshot();  
      return true;
    } catch (error) {
      console.error('❌ Error during login:', error);
      this.showAlert('Error',{
        en: 'Login failed. Please check your credentials',
        pt: 'Falha no login. Por favor, verifique suas credenciais',
      });
      return false;
    }
  }  
  private saveResultsToLocalStorage(results: Record<string, any>): void {
    Object.keys(results).forEach((key) => {
      localStorage.setItem(key, JSON.stringify(results[key]));
    });
  }
    

  async logout(): Promise<void> {
    const auth = this.firebaseService.auth;
    if (!auth) {
      this.showAlert('OFFLINE',{
        en: 'You cannot log out while offline',
        pt: 'Você não pode sair enquanto estiver offline',
      });
      return;
    }
  
    if (!navigator.onLine) {
      this.showAlert('OFFLINE',{
        en: 'You need to be online to log out. This ensures your results are synchronized with the database',
        pt: 'É necessário estar conectado à internet para sair. Isso garante que seus resultados sejam sincronizados com o banco de dados',
      });
      return;
    }
  
    const uid = localStorage.getItem('currentUserUID');
    if (!uid) {
      this.showAlert('Error',{
        en: 'No user found to log out',
        pt: 'Nenhum usuário encontrado para sair',
      });
      return;
    }
    const email = localStorage.getItem('currentUserEmail');
    
    try {
      // Prepare data to save
      const resultsToSave: Record<string, any> = {};
      const exerciseLinks = [
        { keys: ['brtResults', 'HATResults', 'HATCResults', 'AHATResults', 
        'WHResults', 'KBResults', 'BBResults', 'YBResults', 'BREResults', 
        'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults', 
        'CBResults', 'RBResults', 'NBResults', 'CUSTResults', 'LungsResults', 
        'YogaResults', 'DBResults', 'HUMResults', 'TIMERResults'] },
      ];

      exerciseLinks.forEach((exercise) => {
        exercise.keys.forEach((key) => {
          const data = localStorage.getItem(key);
          if (data) {
            resultsToSave[key] = JSON.parse(data);
          }
        });
      });

      // Save to Firestore using UID
      const userDocRef = doc(this.getFirestore(), `users/${uid}`);
      await setDoc(userDocRef, { results: resultsToSave }, { merge: true });

      // Clear local storage
      exerciseLinks.forEach((exercise) => {
        exercise.keys.forEach((key) => {
          localStorage.removeItem(key);
        });
      });
      // Firebase logout
      await signOut(auth);
      localStorage.removeItem('currentUserUID');
      localStorage.removeItem('membershipStatus');
      localStorage.removeItem('currentUserName');
      localStorage.setItem('currentUserEmail', email || '');
      localStorage.removeItem('wasSignedIn');
    } catch (error) {
      console.error('Error during logout:', error);
      this.showAlert('Error',{
        en: 'An error occurred during logout. Please try again',
        pt: 'Ocorreu um erro ao sair. Por favor, tente novamente',
      });
    }
  }
  
  async updateDataResults (): Promise<void> {
    const currentDate = Date.now();
    localStorage.setItem('lastOpened', String(currentDate));
    const uid = localStorage.getItem('currentUserUID');
    // Prepare data to save
      const resultsToSave: Record<string, any> = {};
      const exerciseLinks = [
        { keys: ['brtResults', 'HATResults', 'HATCResults', 'AHATResults', 
        'WHResults', 'KBResults', 'BBResults', 'YBResults', 'BREResults', 
        'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults', 
        'CBResults', 'RBResults', 'NBResults', 'CUSTResults', 'LungsResults', 
        'YogaResults', 'DBResults', 'HUMResults', 'TIMERResults'] },
      ];

      exerciseLinks.forEach((exercise) => {
        exercise.keys.forEach((key) => {
          const data = localStorage.getItem(key);
          if (data) {
            resultsToSave[key] = JSON.parse(data);
          }
        });
      });

      // Save to Firestore using UID
      const userDocRef = doc(this.getFirestore(), `users/${uid}`);
      await setDoc(userDocRef, { results: resultsToSave }, { merge: true });
  }
  

  async setRevenueCatUser() {
    const auth = this.firebaseService.auth;
    if (!auth) return;
  
    const user = auth.currentUser;
    if (!user) return;
  
    try {
      await Purchases.logIn({ appUserID: user.uid });
      await Purchases.restorePurchases();
      await this.rc.getSnapshot();  
    } catch (error) {
      console.error('Error linking user with RevenueCat:', error);
    }
  }  

  async updateUserPassword(newPassword: string): Promise<void> {
    const auth = this.firebaseService.auth;
    if (!auth) {
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user is currently logged in');

      await updatePassword(user, newPassword);
      this.showAlert('Success',{
        en: 'Password updated successfully. Please log in again',
        pt: 'Senha atualizada com sucesso. Por favor, faça login novamente',
      });

      await this.logout();
    } catch (error) {
      console.error('Error updating password:', error);
    }
  }
  // Forgot Password
  async forgotPassword(email: string): Promise<boolean> {
    const auth = this.firebaseService.auth;
    if (!auth) return false;

    const emailExists = await this.checkIfEmailExistsByTryingToRegister(email);

    if (!emailExists) {
      this.showAlert('Error',{
        en: 'This email does not exist in our database. Make sure you enter the same email as you used before',
        pt: 'Este e-mail não existe em nosso banco de dados. Certifique-se de digitar o mesmo e-mail que você usou anteriormente',
      });
      return false;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      this.showAlert('Success',{
        en: 'Password reset email sent',
        pt: 'E-mail para redefinir a senha enviado',
      });
      return true;
    } catch (error) {
      console.error('[forgotPassword] Failed to send reset email:', error);
      this.showAlert('Error',{
        en: 'An unexpected error occurred. Please try again later.',
        pt: 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.',
      });
      return false;
    }
  }

  
  private saveUserLocally(email: string) {
    const storedData = localStorage.getItem('userList');
    const userList = storedData ? JSON.parse(storedData) : [];
    const existingIndex = userList.findIndex((u: any) => u.email === email);

    if (existingIndex !== -1) {
      userList[existingIndex] = { email };
    } else {
      userList.push({ email });
    }

    localStorage.setItem('userList', JSON.stringify(userList));
  }

  async reauthenticate(email: string, password: string): Promise<void> {
    const user = this.firebaseService.auth!.currentUser;
    if (!user) throw new Error('No user is currently logged in');

    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(user, credential);
  }

  getCurrentUser(): User | null {
    return this.firebaseService.auth!.currentUser;
  }

  private getStoredResults(): Record<string, any> {
    const results: Record<string, any> = {};
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      results[key] = JSON.parse(localStorage.getItem(key) || 'null');
    });
    return results;
  }
  async deleteAccount(): Promise<void> {
    const auth = this.firebaseService.auth;
    if (!auth) {
      return;
    }
    const user = auth.currentUser;

    if (!user) {
      console.error('No user is logged in');
      return;
    }

    const userId = user.uid;
    // 🛠 Ensure Firestore is available before proceeding
    if (!this.firebaseService.firestore) {
      console.error('Firestore is not initialized');
      return;
    }

    try {
      // 🔥 Delete user from Firestore database
      const db = this.firebaseService.firestore;
      const userDocRef = doc(db, `users/${userId}`);
      await deleteDoc(userDocRef);

      // 🏷️ Delete from RevenueCat if they exist
      await Purchases.logOut(); // Ensures user is unlinked from RevenueCat

      // 🔥 Delete user from Firebase Authentication
      await deleteUser(user);

      // ✅ Clear local storage
      localStorage.clear();

      await this.logout();
    } catch (error) {
      console.error('❌ Error deleting account:', error);
    }
  }
  async updateUserEmail(newEmail: string): Promise<void> {
    const auth = this.firebaseService.auth;
    if (!auth) {
      console.error('[updateUserEmail] Auth is not initialized');
      return;
    }

    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently logged in');

    console.log('[updateUserEmail] currentUser:', {
      uid: user.uid,
      email: user.email,
      providerData: user.providerData,
    });
    console.log('[updateUserEmail] Attempting to verifyBeforeUpdateEmail to:', newEmail);

    try {
      await verifyBeforeUpdateEmail(user, newEmail);
      console.log('[updateUserEmail] verifyBeforeUpdateEmail resolved OK');

      this.showAlert('Success',{
        en: 'Verification email sent to the new address. Please confirm it to complete the update',
        pt: 'E-mail de verificação enviado para o novo endereço. Por favor, confirme para concluir a atualização',
      });

      await this.logout();
    } catch (error) {
      console.error('[updateUserEmail] Error sending verification for email update:', error);
      throw error;
    }
  }

  async checkIfEmailExistsByTryingToRegister(email: string): Promise<boolean> {
    const auth = this.firebaseService.auth;
    if (!auth) return false;

    try {
      // Try to register — this should fail if the email already exists
      await createUserWithEmailAndPassword(auth, email, 'temporary-password');
      
      // If it succeeds (unexpected), delete the user immediately
      const user = auth.currentUser;
      if (user) {
        await deleteUser(user);
      }

      // This means the user did NOT exist (we created it, now deleted it)
      return false;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // Email exists
        return true;
      }

      console.error('[checkIfEmailExistsByTryingToRegister] Unexpected error:', error);
      return false;
    }
  }
  private sanitizeName(name: string): string {
    // Remove any HTML tags
    name = name.replace(/<\/?[^>]+(>|$)/g, "");

    // Allow only letters (including accented), spaces, apostrophes, and hyphens
    name = name.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');

    return name.trim();
  }
  async ensureUserNameExists(): Promise<void> {
    const auth = this.firebaseService.auth;
    if (!auth) return;

    const user = auth.currentUser;
    if (!user) return;

    const uid = user.uid;
    const email = user.email || '';

    const userDocRef = doc(this.getFirestore(), `users/${uid}`);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      if (!data?.['name'] || data?.['name'].trim() === '') {
        // No name, so set name to sanitized first part of email
        const sanitizedName = this.sanitizeName(email.split('@')[0]);

        await setDoc(userDocRef, { name: sanitizedName }, { merge: true });
      }
    }
  }
  async updateUserName(newName: string): Promise<void> {
    const auth = this.firebaseService.auth;
    if (!auth || !auth.currentUser) throw new Error('User not authenticated');

    const uid = auth.currentUser.uid;
    const userDocRef = doc(this.getFirestore(), `users/${uid}`);

    // Update Firestore
    await setDoc(userDocRef, { name: newName }, { merge: true });

    // Update localStorage
    localStorage.setItem('currentUserName', newName);

  }
  
  async checkOrStartDeviceTrial(): Promise<{ active: boolean; expiredNow?: boolean; newlyCreated?: boolean }> {
    const db = this.getFirestore();
    const { Device } = await import('@capacitor/device');
    const device = await Device.getId();
    const deviceRef = doc(db, 'devices', device.identifier);
    const snap = await getDoc(deviceRef);
    const now = Timestamp.now();

    // ⏱️ Helper: 7 days from now
    const expires = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (!snap.exists()) {
      // 🆕 First login on this device — start new trial
      await setDoc(deviceRef, {
        trialStartedAt: now,
        trialExpiresAt: expires,
        lastMessageShown: false,
      });
      return { active: true, newlyCreated: true };
    }

    const data = snap.data();
    const expiresAt: Timestamp = data['trialExpiresAt'];
    const lastMessageShown = data['lastMessageShown'] || false;
    const expired = now.toMillis() > expiresAt.toMillis();

    if (!expired) {
      return { active: true, newlyCreated: false };
    }

    // Trial expired
    if (expired && !lastMessageShown) {
      await setDoc(deviceRef, { lastMessageShown: true }, { merge: true });
      return { active: false, expiredNow: true };
    }

    return { active: false };
  }
  async ensureUserCreatedAt(): Promise<void> {
    const auth = this.firebaseService.auth;
    if (!auth || !auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const userDocRef = doc(this.getFirestore(), `users/${uid}`);

    // 1) local cache
    const cached = localStorage.getItem('userCreatedAt');
    if (cached) {
      // Optional: if you want, you could also ensure Firestore has it, but not required
      return;
    }

    // 2) check Firestore
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const createdAt = data?.['userCreatedAt'];

      // Firestore Timestamp
      if (createdAt && typeof createdAt.toMillis === 'function') {
        localStorage.setItem('userCreatedAt', String(createdAt.toMillis()));
        return;
      }

      // if it was stored as number/string in older versions
      if (typeof createdAt === 'number') {
        localStorage.setItem('userCreatedAt', String(createdAt));
        return;
      }
      if (typeof createdAt === 'string' && createdAt.trim() !== '') {
        localStorage.setItem('userCreatedAt', createdAt);
        return;
      }
    }

    // 3) not in localStorage and not in Firestore → set it now
    // Use serverTimestamp for consistency (server time).
    await setDoc(
      userDocRef,
      { userCreatedAt: serverTimestamp() },
      { merge: true }
    );

    // We don't get serverTimestamp value back immediately without re-read.
    // If you want local cache immediately, store device time too:
    localStorage.setItem('userCreatedAt', String(Date.now()));

    // Optional (more accurate): re-read once to cache exact server time
    try {
      const snap2 = await getDoc(userDocRef);
      const data2 = snap2.data();
      const createdAt2 = data2?.['userCreatedAt'];
      if (createdAt2 && typeof createdAt2.toMillis === 'function') {
        localStorage.setItem('userCreatedAt', String(createdAt2.toMillis()));
      }
    } catch (e) {
      // ignore; cache already has a value
    }
  }
  async ensureUserLanguageSynced(): Promise<void> {
    const auth = this.firebaseService.auth;
    if (!auth || !auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const userDocRef = doc(this.getFirestore(), `users/${uid}`);

    // 1) localStorage: if missing, default to EN and persist it
    const ls = localStorage.getItem('isPortuguese');
    if (ls === null) {
      localStorage.setItem('isPortuguese', 'false');

      // Ensure Firestore has EN (merge so we don't overwrite other fields)
      await setDoc(userDocRef, { language: 'EN' }, { merge: true });
      return;
    }

    // 2) localStorage exists -> desired language
    const isPT = ls === 'true';
    const desired = isPT ? 'PT' : 'EN';

    // 3) compare against Firestore
    const snap = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data()?.['language'] as string | undefined) : undefined;

    // If missing or different -> update Firestore to match local preference
    if (current !== desired) {
      await setDoc(userDocRef, { language: desired }, { merge: true });
    }
  }
}
