import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { onAuthStateChanged } from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private firebaseService: FirebaseService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const auth = this.firebaseService.auth;

    // ✅ Case 1: Offline – allow if user was previously signed in
    if (!navigator.onLine) {
      const wasSignedIn = localStorage.getItem('wasSignedIn');
      const cachedUID = localStorage.getItem('currentUserUID');
      if (wasSignedIn === 'true' && cachedUID) {
        return true;
      } else {
        console.warn('[AuthGuard] Offline but no cached login found, redirecting to login');
        this.router.navigate(['/login']);
        return false;
      }
    }

    // ✅ Case 2: Online but Firebase not initialized
    if (!auth) {
      console.error('[AuthGuard] Firebase Auth not initialized, redirecting to login');
      this.router.navigate(['/login']);
      return false;
    }

    // ✅ Case 3: Normal online Firebase Auth check
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          localStorage.setItem('wasSignedIn', 'true');
          localStorage.setItem('currentUserUID', user.uid);
          resolve(true);
        } else {
          this.router.navigate(['/login']);
          resolve(false);
        }
      });
    });
  }
}
