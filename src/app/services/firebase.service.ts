import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  Auth 
} from 'firebase/auth';
import { getFirestore, Firestore, doc, getDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { onAuthStateChanged } from 'firebase/auth';
const firebaseConfig = {
  apiKey: 'AIzaSyD3sn0T8BX0MX2LegPfGqfW4uVvf8ZfDjI',
  authDomain: 'brizabreath-ea097.firebaseapp.com',
  projectId: 'brizabreath-ea097',
  storageBucket: 'brizabreath-ea097.appspot.com',
  messagingSenderId: '1062876241537',
  appId: '1:1062876241537:web:2e877ddd3eb63796637780',
  measurementId: 'G-BB586K1045',
};

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  firebaseApp: FirebaseApp | null = null;
  auth: Auth | null = null;
  firestore: Firestore | null = null;
  private _email: string | null = null;

  constructor() {    
    if (navigator.onLine) {
      try {
        this.firebaseApp = initializeApp(firebaseConfig);
        this.auth = initializeAuth(this.firebaseApp, {
          persistence: indexedDBLocalPersistence
        });
        this.firestore = getFirestore(this.firebaseApp);
        onAuthStateChanged(this.auth, (u) => {
          this._email = u?.email ?? null;
        });

      } catch (error) {
        console.error("❌ Error initializing Firebase:", error);
      }
    } else {
      console.warn("⚠️ Offline mode detected. Firebase services are not initialized.");
    }
  }

  isAdminEmail(email: string | null | undefined): boolean {
    const e = (email || '').toLowerCase().trim();
    return e === 'info@brizabreath.com' || e === 'mariiana.coutinho@gmail.com';
  }
  async isAdminUid(): Promise<boolean> {
    if (!this.auth || !this.firestore) return false;

    const user = this.auth.currentUser;
    if (!user) return false;

    try {
      const adminRef = doc(this.firestore, `admins/${user.uid}`);
      const snap = await getDoc(adminRef);
      return snap.exists();
    } catch (e) {
      console.error('Failed to check admin UID:', e);
      return false;
    }
  }
  isAdmin(): boolean {
    return this.isAdminEmail(this._email);
  }
}
