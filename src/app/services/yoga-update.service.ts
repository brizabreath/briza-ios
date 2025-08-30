import { Injectable } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { LocalReminderService } from './local-reminder.service';

const SEEN_KEY = 'seenYogaIds';

@Injectable({ providedIn: 'root' })
export class YogaUpdateService {
  constructor(
    private firebaseService: FirebaseService,
    private reminders: LocalReminderService
  ) {}

  /** Call this on app launch: compares IDs and notifies once if there are new ones. */
  async checkOnAppStart() {
    try {
      const colRef = collection(this.firebaseService.firestore!, 'videos');
      const snapshot = await getDocs(colRef);
      const currentIds = snapshot.docs.map(d => d.id);

      const prevSeenRaw = localStorage.getItem(SEEN_KEY);
      const prevSeen: string[] = prevSeenRaw ? JSON.parse(prevSeenRaw) : [];

      // If first run, just save baseline — no notification.
      if (prevSeen.length === 0) {
        localStorage.setItem(SEEN_KEY, JSON.stringify(currentIds));
        return;
      }

      const newIds = currentIds.filter(id => !prevSeen.includes(id));

      if (newIds.length > 0) {
        // ✅ Prevent duplicates even if user ignores the notif:
        // Save the new baseline BEFORE notifying.
        localStorage.setItem(SEEN_KEY, JSON.stringify(currentIds));

        // Fire the local notification with IDs for deep link
        await this.reminders.notifyNewYogaClass(newIds.length, newIds);
      } else {
        // Keep baseline fresh in case of deletions/edits
        localStorage.setItem(SEEN_KEY, JSON.stringify(currentIds));
      }
    } catch (e) {
      console.warn('YogaUpdateService.checkOnAppStart failed:', e);
    }
  }
}
