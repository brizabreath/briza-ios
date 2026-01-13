import { Injectable } from '@angular/core';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

const PREF_KEY_NEXT_AT = 'briza_next_local_reminder_at';
const NOTIF_ID = 3003; // stable id for this reminder series
type YogaNewItem = {
  id: string;
  title?: string;
  category?: 'move' | 'slowdown' | 'meditate' | 'lungs' | 'mobility';
};

@Injectable({ providedIn: 'root' })
export class LocalReminderService {
  // Schedule settings
  private defaultHour = 7;      // 7:00 AM local time
  private defaultMinute = 0;    // :00
  private gapDays = 2;          // every ~2 days

  private getIsPortuguese(): boolean {
    return localStorage.getItem('isPortuguese') === 'true';
  }
    // --- Message pools (EN + PT) ---
  private messagesEN = [
    "Rise & shine 🌞 Recharge with a few mindful breaths",
    "Pause & reset 🧘 Take 5 minutes just for you",
    "Your calm is waiting ✨ Breathe & stretch today",
    "Strong mind, strong body 💪 Start with mindful breathing",
    "Quick reset 🔄 5 minutes of breath can shift your day",
    "Boost your energy ⚡ Flow and recharge body & mind",
    "Stay on track 🙌 One mindful pause makes the difference",
    "Fresh air for your mind 🌿 Breathe, stretch, relax",
    "Sharpen your focus 🎯 A few deep rounds of breath today?",
    "Gentle reminder 💚 Take a moment — breathe with us"
  ];


  private messagesPT = [
    "Bom dia 🌞 Hora de recarregar—respire e mova hoje",
    "Pausa rápida 🧘 Faça 5 min de respiração e resete o dia",
    "Sua calma está chamando ✨ Faça um flow curto agora",
    "Passos pequenos, grandes resultados 💪 Respire alguns minutos",
    "Momento de reset 🔄 Algumas respirações mudam seu dia",
    "Dose de energia ⚡ Um flow curtinho e sinta a diferença",
    "Você consegue 🙌 Uma pausa consciente para manter você no caminho.",
    "Mente clara 🌿 Respire, alongue e relaxe",
    "Foco em alta 🎯 Algumas rodadas de respiração hoje?",
    "Lembrete gentil 💚 Reserve um tempo para respirar"
  ];


  constructor() {}

  // Public: call once (e.g., from Settings toggle or after login) to ensure the next 3-day reminder exists.
  async startRollingReminders() {
    if (!(await this.ensurePermission())) return;

    const nextAt = await this.getSavedNextAt();
    if (!nextAt || nextAt <= Date.now()) {
      const when = this.computeNextDate(this.defaultHour, this.defaultMinute, this.gapDays);
      await this.scheduleOne(when, this.pickMessage());
      await this.saveNextAt(when.getTime());
    }
  }

  // Public: call on app start/resume to keep the chain alive.
  async tick() {
    if (!(await this.ensurePermission())) return;

    const nextAt = await this.getSavedNextAt();
    if (!nextAt || nextAt <= Date.now()) {
      const when = this.computeNextDate(this.defaultHour, this.defaultMinute, this.gapDays);
      await this.scheduleOne(when, this.pickMessage());
      await this.saveNextAt(when.getTime());
    }
  }

  // Public: chain the next reminder right after one is delivered or tapped.
  async chainNext() {
    const when = this.computeNextDate(this.defaultHour, this.defaultMinute, this.gapDays);
    await this.scheduleOne(when, this.pickMessage());
    await this.saveNextAt(when.getTime());
  }

  // Public: stop/cancel this series.
  async stop() {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] });
    await Preferences.remove({ key: PREF_KEY_NEXT_AT });
  }

  /** Ask for permission if not already granted */
  private async ensurePermission(): Promise<boolean> {
    const p = await LocalNotifications.checkPermissions();
    if (p.display !== 'granted') {
      const r: PermissionStatus = await LocalNotifications.requestPermissions();
      return r.display === 'granted';
    }
    return true;
  }

  /** Pick a random, language-aware message */
  private pickMessage(): { title: string; body: string } {
    const isPT = this.getIsPortuguese();
    const pool = isPT ? this.messagesPT : this.messagesEN;
    const body = pool[Math.floor(Math.random() * pool.length)];
    return { title: 'Briza', body };
  }

  private computeNextDate(hour: number, minute: number, daysFromNow: number): Date {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysFromNow,
      hour, minute, 0, 0
    );
  }

  private async scheduleOne(when: Date, message: { title: string; body: string }) {
    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIF_ID,
        title: message.title,
        body: message.body,
        schedule: { at: when }, // single fire; we’ll chain the next one
        sound: 'default',
      }]
    });
  }

  private async saveNextAt(ts: number) {
    await Preferences.set({ key: PREF_KEY_NEXT_AT, value: String(ts) });
  }

  private async getSavedNextAt(): Promise<number | null> {
    const r = await Preferences.get({ key: PREF_KEY_NEXT_AT });
    if (!r.value) return null;
    const n = Number(r.value);
    return Number.isFinite(n) ? n : null;
  }

  private categoryLabel(category: YogaNewItem['category'], isPT: boolean): string {
    const mapEN: Record<string, string> = {
      move: 'Flow',
      slowdown: 'Gentle',
      meditate: 'Mindfulness',
      lungs: 'Lungs',
      mobility: 'Mobility',
    };

    const mapPT: Record<string, string> = {
      move: 'Flow',
      slowdown: 'Suave',
      meditate: 'Mindfulness',
      lungs: 'Pulmões',
      mobility: 'Mobilidade',
    };
    if (!category) return isPT ? 'Yoga' : 'Yoga';
    return (isPT ? mapPT : mapEN)[category] ?? (isPT ? 'Yoga' : 'Yoga');
  }

  /** Notify user about new yoga classes (fires immediately). */
  async notifyNewYogaClass(items: YogaNewItem[]) {
    if (!(await this.ensurePermission())) return;

    const isPT = this.getIsPortuguese();
    const title = 'Briza';

    // Keep notification short (OS truncates long bodies)
    const first = items[0];
    const firstTitle = (first?.title || '').trim();
    const section = this.categoryLabel(first?.category, isPT);

    let body = '';

    if (items.length === 1) {
      body = isPT
        ? `🆕 Nova aula: ${firstTitle || 'disponível'} — confira na seção ${section}`
        : `🆕 New class: ${firstTitle || 'available'} — check it out in the ${section} section`;
    } else {
      const more = items.length - 1;
      body = isPT
        ? `🆕 Nova aula: ${firstTitle || 'disponível'} (+${more}) — veja na seção ${section}`
        : `🆕 New class: ${firstTitle || 'available'} (+${more}) — see it in ${section}`;
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: 4010,
        title,
        body,
        schedule: { at: new Date(Date.now() + 500) },
        sound: 'default',
        extra: { type: 'yogaNew', items }, // keep IDs + meta for deep link handling
      }]
    });
  }

  async notifyCommentReply(replierName: string, videoId: string) {
  console.log('📨 notifyCommentReply() called for video:', videoId);

  if (!(await this.ensurePermission())) {
    console.warn('⚠️ No notification permission');
    return;
  }

  const title = 'Briza 💬';
  const body = `${replierName} replied to your comment`;

  const notificationData = {
    id: Date.now(),
    title,
    body,
    sound: 'default',
    extra: { type: 'commentReply', videoId },
  };

  const isActive = document.visibilityState === 'visible';
  console.log('📱 App visibility:', isActive ? 'ACTIVE' : 'BACKGROUND');

  if (isActive) {
    console.log('💬 Showing immediate local notification');
    await LocalNotifications.schedule({
      notifications: [{ ...notificationData, schedule: { at: new Date() } }],
    });
  } else {
    console.log('💾 Saving pending notification for next app open...');
    await Preferences.set({
      key: 'pending_comment_reply',
      value: JSON.stringify(notificationData),
    });
  }
}

}
