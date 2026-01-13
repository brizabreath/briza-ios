// YogaUpdateService
import { Injectable } from '@angular/core';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { LocalReminderService } from './local-reminder.service';
import { VimeoMetaService } from './vimeo-meta.service';

@Injectable({ providedIn: 'root' })
export class YogaUpdateService {
  constructor(
    private firebaseService: FirebaseService,
    private reminders: LocalReminderService,
    private vimeoMeta: VimeoMetaService
  ) {}

  private getIsPortuguese(): boolean {
    return localStorage.getItem('isPortuguese') === 'true';
  }

  private getUserVideoLang(): 'PT' | 'EN' {
    return this.getIsPortuguese() ? 'PT' : 'EN';
  }

  private seenKeyFor(lang: string): string {
    return `seenVideoIds_${lang}`; // instead of seenYogaIds_
  }

  async checkOnAppStart() {
    if (!navigator.onLine || !this.firebaseService.firestore) return;
    try {
      const userLang = this.getUserVideoLang();

      const colRef = collection(this.firebaseService.firestore!, 'videos');
      const q = query(colRef, where('language', '==', userLang));
      const snapshot = await getDocs(q);

      const allowed = new Set(['move','slowdown','meditate','lungs','mobility']);

      // Pull doc data too (we need url + category)
      const current = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter(v => allowed.has(v.category));

      const currentIds = current.map(x => x.id);

      const key = this.seenKeyFor(userLang);
      const prevSeenRaw = localStorage.getItem(key);
      const prevSeen: string[] = prevSeenRaw ? JSON.parse(prevSeenRaw) : [];

      // First run baseline
      if (prevSeen.length === 0) {
        localStorage.setItem(key, JSON.stringify(currentIds));
        return;
      }

      const newDocs = current.filter(x => !prevSeen.includes(x.id));

      // Refresh baseline always
      localStorage.setItem(key, JSON.stringify(currentIds));

      if (newDocs.length === 0) return;

      // Enrich each new doc with Vimeo title (best-effort)
      const items = await Promise.all(
        newDocs.map(async (v) => {
          const rawUrl = v.url || v.videoUrl || '';
          let title = '';

          try {
            if (rawUrl) {
              const meta = await this.vimeoMeta.getMeta(rawUrl, true); // force fresh
              title = (meta?.title || '').trim();
            }
          } catch {}

          return {
            id: v.id,
            title,
            category: v.category as 'move' | 'slowdown' | 'meditate' | 'lungs' | 'mobility' | undefined,
          };
        })
      );

      await this.reminders.notifyNewYogaClass(items);

    } catch (e) {
      console.warn('YogaUpdateService.checkOnAppStart failed:', e);
    }
  }
}
