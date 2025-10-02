import { Injectable } from '@angular/core';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

const PREF_KEY_NEXT_AT = 'briza_next_local_reminder_at';
const NOTIF_ID = 3003; // stable id for this reminder series

@Injectable({ providedIn: 'root' })
export class LocalReminderService {
  // Schedule settings
  private defaultHour = 9;      // 9:00 AM local time
  private defaultMinute = 0;    // :00
  private gapDays = 2;          // every ~3 days

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
    const lang = navigator.language?.toLowerCase() || 'en';
    const isPT = lang.startsWith('pt');
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
  /** DEBUG: schedule a reminder that fires in N seconds (for quick testing) 
    async debugFireIn(seconds = 10) {
    const ok = await this.ensurePermission();
    if (!ok) return;

    const message = this.pickMessage();
    const when = new Date(Date.now() + seconds * 1000);

    await LocalNotifications.schedule({
        notifications: [{
        id: 987654,            // separate id from the 3-day series
        title: message.title,
        body: message.body,
        schedule: { at: when },
        sound: 'default',
        }]
    });
    }
    */
   /** Notify user about new yoga classes (fires immediately). */
  async notifyNewYogaClass(count: number, newIds: string[]) {
    if (!(await this.ensurePermission())) return;

    const lang = navigator.language?.toLowerCase() || 'en';
    const isPT = lang.startsWith('pt');

    const title = 'Briza';
    const body = isPT
      ? (count > 1
          ? `🆕 Novas aulas de yoga disponíveis — confira!`
          : `🆕 Nova aula de yoga disponível — confira!`)
      : (count > 1
          ? `🆕 New yoga classes available — check them out!`
          : `🆕 New yoga class available — check it out!`);

    await LocalNotifications.schedule({
      notifications: [{
        id: 4010, // distinct from the 3-day series
        title,
        body,
        schedule: { at: new Date(Date.now() + 500) },
        sound: 'default',
        extra: { type: 'yogaNew', ids: newIds }, // 👈 carry the IDs for deep link
      }]
    });
  }
}
