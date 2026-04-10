// user-list.modal.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  Timestamp,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { FirebaseService } from '../services/firebase.service'; // adjust path if needed

type UserRow = {
  uid: string;
  name: string;
  email: string;
  createdAt: Date | null;
  subscribedAt: Date | null;
  membershipType: string | null;
};

@Component({
  selector: 'app-user-list-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ title }}</ion-title>
      <ion-buttons slot="end">
        <ion-button (click)="close()">Close</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div style="padding: 12px 16px; font-size: 13px;" *ngIf="note">{{ note }}</div>

    <ion-list *ngIf="rows.length">
      <ion-item *ngFor="let u of rows">
        <ion-label>
          <div style="font-weight: 600;">{{ u.name || '—' }}</div>
          <div style="font-size: 13px;">{{ u.email || '—' }}</div>
          <div style="font-size: 12px; opacity: 0.8;">
            Created: {{ format(u.createdAt) }}
          </div>
          <div style="font-size: 12px; opacity: 0.8;" *ngIf="u.subscribedAt">
            Subscribed: {{ format(u.subscribedAt) }} ({{ u.membershipType || '—' }})
          </div>
        </ion-label>
      </ion-item>
    </ion-list>

    <div style="padding: 16px;" *ngIf="loading">Loading…</div>
    <div style="padding: 16px;" *ngIf="!loading && !rows.length">No results.</div>

    <ion-infinite-scroll *ngIf="hasMore" (ionInfinite)="loadMore($event)">
      <ion-infinite-scroll-content loadingText="Loading more..."></ion-infinite-scroll-content>
    </ion-infinite-scroll>
  </ion-content>
  `
})
export class UserListModal {
  @Input() title = 'Users';
  @Input() kind!: string;

  rows: UserRow[] = [];
  loading = false;
  hasMore = true;
  note = '';

  private lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  private readonly PAGE_SIZE = 50;

  constructor(
    private modalCtrl: ModalController,
    private firebase: FirebaseService,
  ) {}

  ionViewWillEnter() {
    this.loadFirstPage();
  }

  close() {
    this.modalCtrl.dismiss();
  }

  format(d: Date | null) {
    if (!d) return '—';
    return d.toLocaleString();
  }

  private toDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v instanceof Timestamp) return v.toDate();
    if (typeof v?.toDate === 'function') return v.toDate();
    return null;
  }

    private buildConstraints(): QueryConstraint[] {
    const base: QueryConstraint[] = [orderBy('userCreatedAt', 'desc')];

    switch (this.kind) {
        case 'totalUsers':
        this.note = 'Most recent users first.';
        return [...base];
        
        case 'newUsersThisMonth': {
          this.note = 'Users created this month (most recent first).';
          const start = Timestamp.fromDate(this.startOfMonth(new Date()));
          const end = Timestamp.fromDate(this.startOfNextMonth(new Date()));
          return [
            where('userCreatedAt', '>=', start),
            where('userCreatedAt', '<', end),
            orderBy('userCreatedAt', 'desc'),
            orderBy('__name__', 'desc'),
          ];
        }

        case 'newUsersThisWeek': {
          this.note = 'Users created this week (since Monday, most recent first).';
          const start = Timestamp.fromDate(this.startOfWeek(new Date()));
          return [
            where('userCreatedAt', '>=', start),
            orderBy('userCreatedAt', 'desc'),
            orderBy('__name__', 'desc'),
          ];
        }

        case 'subsNewThisMonth': {
          this.note = 'Subscriptions activated this month (most recent first).';
          const start = Timestamp.fromDate(this.startOfMonth(new Date()));
          const end = Timestamp.fromDate(this.startOfNextMonth(new Date()));
          return [
            where('membership.activatedAt', '>=', start),
            where('membership.activatedAt', '<', end),
            orderBy('membership.activatedAt', 'desc'),
            orderBy('__name__', 'desc'),
          ];
        }

        case 'subsTotal':
          this.note = 'RC trial + active subs (most recent first).';
          return [
            where('membership.type','in',['rcTrial','monthlySubscriber','annualSubscriber']),
            orderBy('membership.type', 'asc'),
            orderBy('userCreatedAt', 'desc'),
            orderBy('__name__', 'desc'),
          ];



       case 'subsTrial':
        return [
          where('membership.type','==','rcTrial'),
          orderBy('membership.type', 'asc'),
          orderBy('userCreatedAt', 'desc'),
          orderBy('__name__', 'desc'),
        ];

        case 'subsMonthly':
          return [
            where('membership.type','==','monthlySubscriber'),
            orderBy('membership.type', 'asc'),
            orderBy('userCreatedAt', 'desc'),
            orderBy('__name__', 'desc'),
          ];

        case 'subsAnnual':
        return [
          where('membership.type','==','annualSubscriber'),
          orderBy('membership.type', 'asc'),
          orderBy('userCreatedAt', 'desc'),
          orderBy('__name__', 'desc'),
        ];


        case 'whitelist':
        return [where('membership.type','==','whitelist'), ...base];

        case 'promoCodeActive':
          this.note = 'Active promo code users (membership.codeEndsAt > now).';
          return [
            where('membership.status', '==', 'active'),
            where('membership.codeEndsAt', '>', Timestamp.now()),
            orderBy('membership.codeEndsAt', 'asc'),
            orderBy('__name__', 'desc'),
          ];



        case 'deviceTrials':
        return [where('membership.type','==','deviceTrial'), ...base];

        case 'freeLifetime':
         this.note = 'Free lifetime (from freeAccessUsers)';
        return [orderBy('userCreatedAt', 'desc')]; // not used, but fine
        

        default:
        this.note = '';
        return [...base];
    }
    }


  async loadFirstPage() {
    this.rows = [];
    this.lastDoc = null;
    this.hasMore = true;
    await this.fetchPage();
  }

  async loadMore(ev: any) {
    await this.fetchPage();
    ev?.target?.complete?.();
  }

  private async fetchPage() {
   if (this.kind === 'freeLifetime') {
    await this.fetchFreeLifetimePage();
    return;
  }

  if (this.kind === 'freeNoMembership') {
    await this.fetchFreeNoMembershipPage();
    return;
  }

    const db = this.firebase.firestore;
    if (!db) return;

    if (this.loading || !this.hasMore) return;

    this.loading = true;
    try {
      const constraints = this.buildConstraints();

      const paging: QueryConstraint[] = this.lastDoc
        ? [startAfter(this.lastDoc), limit(this.PAGE_SIZE)]
        : [limit(this.PAGE_SIZE)];

      const q = query(collection(db, 'users'), ...constraints, ...paging);
      const snap = await getDocs(q);

      if (snap.empty) {
        this.hasMore = false;
        return;
      }

      this.lastDoc = snap.docs[snap.docs.length - 1] || null;

      const mapped = snap.docs.map(d => {
        const u = d.data() as any;
        return {
          uid: d.id,
          name: (u.displayName || u.name || '').trim(),
          email: (u.email || '').trim(),
          createdAt: this.toDate(u.userCreatedAt),
          subscribedAt: this.toDate(u?.membership?.activatedAt),
          membershipType: u?.membership?.type || null,
        } as UserRow;
      });

      this.rows.push(...mapped);

      if (snap.size < this.PAGE_SIZE) this.hasMore = false;
    } catch (e: any) {
      console.error('UserListModal fetch failed:', e);
      console.error('Firestore message:', e?.message);
      this.note = `Query failed: ${e?.code || ''} ${e?.message || ''}`.trim();
      this.hasMore = false;
    }
    finally {
      this.loading = false;
    }
  }
    private normalizeEmail(e: any): string {
    return String(e || '').trim().toLowerCase();
    }

  private async fetchFreeLifetimePage() {
    const db = this.firebase.firestore;
    if (!db) return;

    if (this.loading || !this.hasMore) return;
    this.loading = true;

    try {
      // Page through freeAccessUsers by EMAIL FIELD (doc id is random)
      const baseQ = query(
        collection(db, 'freeAccessUsers'),
        orderBy('email'),
        ...(this.lastDoc ? [startAfter(this.lastDoc)] : []),
        limit(this.PAGE_SIZE)
      );

      const snap = await getDocs(baseQ);
      if (snap.empty) { this.hasMore = false; return; }

      this.lastDoc = snap.docs[snap.docs.length - 1];

      // Emails come from document FIELD
      const emails = snap.docs
        .map(d => this.normalizeEmail((d.data() as any)?.email))
        .filter(Boolean);

      // Firestore "in" supports max 10 values
      const chunks: string[][] = [];
      for (let i = 0; i < emails.length; i += 10) chunks.push(emails.slice(i, i + 10));

      const users: any[] = [];
      for (const chunk of chunks) {
        const qUsers = query(collection(db, 'users'), where('email', 'in', chunk));
        const uSnap = await getDocs(qUsers);
        uSnap.docs.forEach(d => users.push({ uid: d.id, ...(d.data() as any) }));
      }

      // Map users by normalized email
      const byEmail = new Map<string, any>();
      for (const u of users) byEmail.set(this.normalizeEmail(u.email), u);

      const mapped = emails.map(email => {
        const u = byEmail.get(email);
        return {
          uid: u?.uid || '—',
          name: ((u?.displayName || u?.name || '') as string).trim(),
          email: (u?.email || email).trim(),
          createdAt: this.toDate(u?.userCreatedAt) || null,
          subscribedAt: this.toDate(u?.membership?.activatedAt) || null,
          membershipType: u?.membership?.type || null,
        } as UserRow;
      });

      this.rows.push(...mapped);

      if (snap.size < this.PAGE_SIZE) this.hasMore = false;
    } catch (e) {
      console.error('fetchFreeLifetimePage failed:', e);
      this.hasMore = false;
    } finally {
      this.loading = false;
    }
  }


  private isFreeNoMembershipUser(u: any): boolean {
  const m = u?.membership || {};

  // Exclude anyone active in whitelist
  if (m?.type === 'whitelist' || m?.source === 'whitelist') return false;

  // Exclude RevenueCat subs/trials
  if (m?.type === 'rcTrial' || m?.type === 'monthlySubscriber' || m?.type === 'annualSubscriber') return false;
  if (m?.source === 'revenuecat') return false;

  // Exclude device trials (if you persist membership.type = deviceTrial)
  if (m?.type === 'deviceTrial' || m?.source === 'trial') return false;

  // Exclude promo code active users (codeEndsAt in future + active)
  const endMs = m?.codeEndsAt?.toMillis?.();
  if (m?.status === 'active' && typeof endMs === 'number' && endMs > Date.now()) return false;

  // If they’re not in any access bucket, they’re "free version"
  return true;
}

private async fetchFreeNoMembershipPage() {
  const db = this.firebase.firestore;
  if (!db) return;

  if (this.loading || !this.hasMore) return;
  this.loading = true;

  try {
    this.note = 'Free version = not whitelist, not device trial, not RevenueCat trial/sub, not promo code.';

    // We will keep scanning until we collect PAGE_SIZE matches or exhaust data
    const matches: UserRow[] = [];

    while (matches.length < this.PAGE_SIZE && this.hasMore) {
      const base = [orderBy('userCreatedAt', 'desc')];

      const paging = this.lastDoc
        ? [startAfter(this.lastDoc), limit(this.PAGE_SIZE)]
        : [limit(this.PAGE_SIZE)];

      const q = query(collection(db, 'users'), ...base, ...paging);
      const snap = await getDocs(q);

      if (snap.empty) { this.hasMore = false; break; }

      this.lastDoc = snap.docs[snap.docs.length - 1] || null;

      for (const d of snap.docs) {
        const u = d.data() as any;
        if (!this.isFreeNoMembershipUser(u)) continue;

        matches.push({
          uid: d.id,
          name: (u.displayName || u.name || '').trim(),
          email: (u.email || '').trim(),
          createdAt: this.toDate(u.userCreatedAt),
          subscribedAt: this.toDate(u?.membership?.activatedAt),
          membershipType: u?.membership?.type || null,
        });
        if (matches.length >= this.PAGE_SIZE) break;
      }

      // If we got fewer docs than PAGE_SIZE in the scan chunk, we’re done
      if (snap.size < this.PAGE_SIZE) this.hasMore = false;
    }

    this.rows.push(...matches);
    if (!this.lastDoc) this.hasMore = false;
  } catch (e) {
    console.error('fetchFreeNoMembershipPage failed:', e);
    this.hasMore = false;
  } finally {
    this.loading = false;
  }
}

private startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
private startOfNextMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}
private startOfWeek(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day; // Monday start
  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

}
