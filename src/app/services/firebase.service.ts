import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  Auth 
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

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

  constructor() {    
    if (navigator.onLine) {
      try {
        this.firebaseApp = initializeApp(firebaseConfig);
        this.auth = initializeAuth(this.firebaseApp, {
          persistence: indexedDBLocalPersistence
        });
        this.firestore = getFirestore(this.firebaseApp);
      } catch (error) {
        console.error("❌ Error initializing Firebase:", error);
      }
    } else {
      console.warn("⚠️ Offline mode detected. Firebase services are not initialized.");
    }
  }
}
