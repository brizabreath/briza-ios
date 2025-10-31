import { Injectable } from '@angular/core';
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class CommentNotificationService {
  private readonly PREF_LAST_CHECK = 'briza_last_comment_notif_check';
  private unsubscribe: (() => void) | null = null;

  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  // Called once at app startup
  async checkOnAppStart() {
    // 🔒 Skip immediately if offline or Firebase not ready
    if (!navigator.onLine || !this.firebaseService.firestore || !this.firebaseService.auth?.currentUser) {
      console.log('📴 Offline or Firebase unavailable — skipping comment notification check');
      return;
    }

    try {
      const user = this.firebaseService.auth.currentUser!;
      const db = this.firebaseService.firestore!;
      const colRef = collection(db, `users/${user.uid}/notifications`);
      const snap = await getDocs(query(colRef, where('seen', '==', false)));

      for (const d of snap.docs) {
        const data = d.data() as any;
        await this.triggerLocalNotification(data.replierName, data.videoId);
        await updateDoc(doc(db, `users/${user.uid}/notifications/${d.id}`), { seen: true });
      }

      // Remember when we last checked
      await Preferences.set({ key: this.PREF_LAST_CHECK, value: Date.now().toString() });

      // Enable real-time listener for online sessions
      this.listenForNewReplies();
    } catch (err) {
      console.warn('⚠️ CommentNotificationService.checkOnAppStart failed:', err);
    }
  }

  // Real-time listener (only runs online)
  private listenForNewReplies() {
    if (this.unsubscribe || !navigator.onLine || !this.firebaseService.auth?.currentUser) return;

    const user = this.firebaseService.auth.currentUser!;
    const db = this.firebaseService.firestore!;
    const colRef = collection(db, `users/${user.uid}/notifications`);
    const q = query(colRef, where('seen', '==', false));

    this.unsubscribe = onSnapshot(q, async (snap) => {
      for (const d of snap.docChanges()) {
        if (d.type === 'added') {
          const data = d.doc.data() as any;
          await this.triggerLocalNotification(data.replierName, data.videoId);
          await updateDoc(doc(db, `users/${user.uid}/notifications/${d.doc.id}`), { seen: true });
        }
      }
    }, (err) => {
      console.warn('⚠️ Comment reply listener failed (maybe offline):', err);
    });
  }

  // Fire local notification
  private async triggerLocalNotification(replierName: string, videoId: string) {
    const title = 'Briza 💬';
    const body = `${replierName} replied to your comment`;

    try {
      // ✅ Check Android 13+ notification permission
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('⚠️ Notifications permission denied — skipping local notification.');
          return;
        }
      }

      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title,
          body,
          sound: 'default',
          schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
          extra: { type:'commentReply', videoId }
        }]
      });
      console.log('✅ Notification scheduled for comment reply:', { replierName, videoId });
    } catch (err) {
      console.warn('⚠️ Failed to schedule comment reply notification:', err);
    }
  }


  // Handle notification taps
  async handleNotificationTap(data: any) {
    if (data?.type === 'commentReply' && data.videoId) {
      this.router.navigate(['/yoga'], { queryParams: { open: data.videoId } });
    }
  }
}
