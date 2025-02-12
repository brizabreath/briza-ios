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
  sendEmailVerification,
} from 'firebase/auth';
import { Firestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { NavController } from '@ionic/angular';
import { onAuthStateChanged } from 'firebase/auth';
import { Purchases } from '@revenuecat/purchases-capacitor';

interface UserData {
  email: string;
  hashedPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private firebaseService: FirebaseService, private navCtrl: NavController) {
    const auth = this.firebaseService.auth;
    if (auth) {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          localStorage.setItem('currentUserUID', user.uid);
          localStorage.setItem('currentUserEmail', user.email || '');
          this.setRevenueCatUser(); // Link RevenueCat user on login
        } else {
          localStorage.removeItem('currentUserUID');
          localStorage.removeItem('currentUserEmail');
          localStorage.removeItem('membershipStatus');
        }
      });
    }
  }

  private getFirestore(): Firestore {
    if (!this.firebaseService.firestore) {
      throw new Error('Firestore is not initialized. Please ensure Firebase is configured properly.');
    }
    return this.firebaseService.firestore;
  }

  isPortuguese(): boolean {
    return localStorage.getItem('isPortuguese') === 'true';
  }

  showAlert(message: { en: string; pt: string }): void {
    alert(this.isPortuguese() ? message.pt : message.en);
  }

  async register(email: string, password: string): Promise<boolean> {
    const auth = this.firebaseService.auth;
    if (!auth) {
      this.showAlert({
        en: 'Cannot register while offline.',
        pt: 'Não é possível registrar enquanto estiver offline.',
      });
      return false;
    }

    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);

      const uid = user.uid;
      const userDocRef = doc(this.getFirestore(), `users/${uid}`);
      await setDoc(userDocRef, { email: user.email, results: {} });

      this.saveUserLocally(email);
      await signOut(auth);

      this.showAlert({
        en: 'Registration successful. Please verify your email before logging in.',
        pt: 'Registro bem-sucedido. Por favor, verifique seu e-mail antes de fazer login.',
      });

      return true;
    } catch (error) {
      console.error('Error during registration:', error);
      this.showAlert({
        en: 'Registration failed. Please try again later.',
        pt: 'Falha no registro. Por favor, tente novamente mais tarde.',
      });
      return false;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    const auth = this.firebaseService.auth;
    if (!auth) {
      this.showAlert({
        en: 'You cannot log in while offline.',
        pt: 'Você não pode entrar enquanto estiver offline.',
      });
      return false;
    }
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      if (!user.emailVerified) {
        await signOut(auth);
        throw new Error('Email not verified. Please verify your email before logging in.');
      }
  
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

      // 🔥 Log in to RevenueCat
      const { customerInfo } = await Purchases.logIn({ appUserID: uid });
  
      // Check if the user has an active entitlement
      const isSubscribed = customerInfo?.entitlements?.active["premium_access"] !== undefined;
  
      if (isSubscribed) {
        localStorage.setItem("membershipStatus", "active");
      } else {
        if (customerInfo?.allExpirationDates && Object.keys(customerInfo.allExpirationDates).length > 0) {
          localStorage.setItem("membershipStatus", "failed"); // Payment failed / expired
        } else {
          localStorage.setItem("membershipStatus", "inactive"); // Never subscribed
        }
      }
  
      return true;
    } catch (error) {
      console.error('❌ Error during login:', error);
      this.showAlert({
        en: 'Login failed. Please check your credentials.',
        pt: 'Falha no login. Por favor, verifique suas credenciais.',
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
      this.showAlert({
        en: 'You cannot log out while offline.',
        pt: 'Você não pode sair enquanto estiver offline.',
      });
      return;
    }
  
    if (!navigator.onLine) {
      this.showAlert({
        en: 'You need to be online to log out. This ensures your results are synchronized with the database.',
        pt: 'É necessário estar conectado à internet para sair. Isso garante que seus resultados sejam sincronizados com o banco de dados.',
      });
      return;
    }
  
    const uid = localStorage.getItem('currentUserUID');
    if (!uid) {
      this.showAlert({
        en: 'No user found to log out.',
        pt: 'Nenhum usuário encontrado para sair.',
      });
      return;
    }
  
    
    try {
      // Prepare data to save
      const resultsToSave: Record<string, any> = {};
      const exerciseLinks = [
        { keys: ['brtResults'] },
        { keys: ['HATResults', 'HATCResults', 'AHATResults'] },
        { keys: ['WHResults'] },
        { keys: ['KBResults'] },
        { keys: ['BBResults', 'YBResults', 'BREResults', 'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults', 'CBResults', 'RBResults', 'NBResults'] },
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
      localStorage.removeItem('currentUserEmail');
      localStorage.removeItem('membershipStatus');
    } catch (error) {
      console.error('Error during logout:', error);
      this.showAlert({
        en: 'An error occurred during logout. Please try again.',
        pt: 'Ocorreu um erro ao sair. Por favor, tente novamente.',
      });
    }
  }
  
  

  async setRevenueCatUser() {
    const auth = this.firebaseService.auth;
    if (!auth) return;
  
    const user = auth.currentUser;
    if (!user) return;
  
    try {
      const { customerInfo } = await Purchases.logIn({ appUserID: user.uid });
  
      const isSubscribed = customerInfo?.entitlements?.active?.["premium_access"] !== undefined;
      if (isSubscribed) {
        localStorage.setItem("membershipStatus", "active");
      } else {
        if (customerInfo?.allExpirationDates && Object.keys(customerInfo.allExpirationDates).length > 0) {
          localStorage.setItem("membershipStatus", "failed"); // Payment failed / expired
        } else {
          localStorage.setItem("membershipStatus", "inactive"); // Never subscribed
        }
      }  
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
      if (!user) throw new Error('No user is currently logged in.');

      await updatePassword(user, newPassword);
      this.showAlert({
        en: 'Password updated successfully. Please log in again.',
        pt: 'Senha atualizada com sucesso. Por favor, faça login novamente.',
      });

      await this.logout();
    } catch (error) {
      console.error('Error updating password:', error);
    }
  }
  // Forgot Password
  async forgotPassword(email: string): Promise<boolean> {
    const auth = this.firebaseService.auth;
    if (!auth) {
      this.showAlert({
        en: 'Cannot reset password while offline.',
        pt: 'Não é possível redefinir a senha enquanto estiver offline.',
      });
      return false;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      this.showAlert({
        en: 'Password reset email sent.',
        pt: 'E-mail para redefinir a senha enviado.',
      });
      return true;
    } catch (error) {
      console.error('Error sending reset email:', error);
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
    if (!user) throw new Error('No user is currently logged in.');

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
}
