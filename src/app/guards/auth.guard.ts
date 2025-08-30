import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { onAuthStateChanged } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private firebaseService: FirebaseService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const auth = this.firebaseService.auth;

    if (!auth) {
      if (!navigator.onLine) {
        const wasSignedIn = localStorage.getItem('wasSignedIn');
        if (wasSignedIn === 'true') {
          return true;
        } else {
          this.router.navigate(['/login']);
          return false;
        }
      }else{
        console.error('Firebase Auth is not initialized.');
        this.router.navigate(['/login']);
        return false;
      }     
    }
 
    // Wait for the Auth state to initialize
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          resolve(true);
        } else {
          this.router.navigate(['/login']);
          resolve(false);
        }
      });
    });
  }
}
