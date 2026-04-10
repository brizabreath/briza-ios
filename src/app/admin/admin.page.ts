// admin.page.ts
import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController, ModalController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../services/firebase.service';
import { VimeoMetaService } from '../services/vimeo-meta.service';

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  Timestamp,
  where,
  Query,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  updateDoc,
} from 'firebase/firestore';

import { Chart, registerables } from 'chart.js';
import { UserListModal } from '../user-list/modal'; // adjust path if needed

Chart.register(...registerables);

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule],
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class Admin {
  usersCount: number | null = null;
  loadingUsersCount = false;

  freeUsersCount: number | null = null;
  loadingFreeUsersCount = false;

  devicesCount: number | null = null;
  loadingDevicesCount = false;

  trialDevicesCount: number | null = null;
  loadingTrialDevicesCount = false;

  freeNoMembershipCount: number | null = null;
  loadingFreeNoMembershipCount = false;

  membershipUsersCount: number | null = null;
  loadingMembershipUsersCount = false;

  membershipTrialCount: number | null = null;
  loadingMembershipTrialCount = false;

  membershipMonthlyCount: number | null = null;
  loadingMembershipMonthlyCount = false;

  membershipAnnualCount: number | null = null;
  loadingMembershipAnnualCount = false;

  newUsersThisMonthCount: number | null = null;
  loadingNewUsersThisMonthCount = false;

  newUsersThisWeekCount: number | null = null;
  loadingNewUsersThisWeekCount = false;

  // monthly saved stats
  computingMonthlyStats = false;
  computeMonthlyMsg = '';

  loadingMonthlyThisMonth = false;
  monthlyNewUsersThisMonth: number | null = null;
  monthlyNewSubsThisMonth: number | null = null;

  // live fallback for subs this month
  monthlyNewSubsThisMonthLive: number | null = null;
  loadingNewSubsThisMonthLive = false;

  promoCodeUsersCount: number | null = null;
  loadingPromoCodeUsersCount = false;

  // charts
  loadingChartData = false;
  showCharts = false;
  private usersChart: Chart | null = null;
  private subsChart: Chart | null = null;

  // exercise stats
  loadingGlobalExerciseStats = false;
  globalTotalExercises: number | null = null;
  globalTotalVideoClasses: number | null = null;  // NEW
  globalBrtTests: number | null = null;
  globalTop3: { key: string; count: number }[] = [];

  recomputingExerciseStats = false;
  recomputeExerciseMsg = '';

  @ViewChild('usersCanvas') usersCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('subsCanvas') subsCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly RESULT_KEYS = [
    'brtResults', 'YogaResults',
    'HATResults', 'HATCResults', 'AHATResults',
    'WHResults', 'KBResults',
    'BBResults', 'YBResults', 'BREResults', 'BRWResults',
    'CTResults', 'APResults', 'UBResults', 'BOXResults',
    'CBResults', 'RBResults', 'NBResults', 'CUSTResults',
    'LungsResults', 'DBResults', 'HUMResults', 'TIMERResults', 'BMResults', 'MobilityResults', 'SeriesResults'
  ];

  updatingVideos = false;
  updateProgressText = '';

  constructor(
    private firebase: FirebaseService,
    private navCtrl: NavController,
    private vimeoMeta: VimeoMetaService,
    private modalCtrl: ModalController,
  ) {}

  async ionViewWillEnter() {
    const ok = await this.firebase.isAdminUid();
    if (!ok) {
      alert('not administrator');
      this.navCtrl.navigateRoot('/breathwork');
      return;
    }

    await Promise.all([
      this.loadUsersCount(),
      this.loadFreeUsersCount(),
      this.loadDevicesCount(),
      this.loadTrialDevicesCount(),
      this.loadFreeNoMembershipCount(),
      this.loadMembershipUsersCount(),
      this.loadMembershipTrialCount(),
      this.loadMembershipMonthlyCount(),
      this.loadMembershipAnnualCount(),
      this.loadNewUsersThisMonthCount(),
      this.loadNewUsersThisWeekCount(),
      this.loadPromoCodeUsersCount(),

      this.loadGlobalExerciseStatsFromDb(),
      this.loadMonthlyThisMonthFromDb(),
      this.loadChartsFromDb(),
      this.loadNewSubsThisMonthLive(), // fallback so you don't see —
    ]);
  }

  // ---------------------------
  // Modal openers
  // ---------------------------
  async openUsersModal(kind: string) {
    const ok = await this.firebase.isAdminUid();
    if (!ok) { alert('not administrator'); return; }

    const titles: Record<string, string> = {
      totalUsers: 'Total users',
      freeLifetime: 'Free lifetime users',
      freeNoMembership: 'Free version users',
      promoCodeActive: 'Promo code users',
      subsTotal: 'Total subscriptions',
      subsTrial: 'Subscriptions on trial',
      subsMonthly: 'Monthly subscribers',
      subsAnnual: 'Annual subscribers',

      newUsersThisMonth: 'New users this month',
      newUsersThisWeek: 'New users this week',
      subsNewThisMonth: 'New subscriptions this month',
    };

    const modal = await this.modalCtrl.create({
      component: UserListModal,
      componentProps: {
        kind,
        title: titles[kind] || 'Users',
      }
    });

    await modal.present();
  }

  // ---------------------------
  // Navigation
  // ---------------------------
  goToAdminComments() { this.navCtrl.navigateForward('/manage-comments'); }
  goBack(): void { this.navCtrl.back(); }

  // ---------------------------
  // Helpers
  // ---------------------------
  private currentMonthId(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
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
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diffToMonday);
    date.setHours(0, 0, 0, 0);
    return date;
  }


  private async countQuery(qry: any): Promise<number> {
    const snap = await getCountFromServer(qry);
    return snap.data().count;
  }

  // ---------------------------
  // Exercise name mapping
  // ---------------------------
  getExerciseName(key: string): string {
    const exerciseNames: { [key: string]: string } = {
      brtResults: 'Briza Retention Test',
      HATResults: 'Altitude Training',
      HATCResults: 'Altitude Training PRO',
      AHATResults: 'Altitude Training Advanced',
      WHResults: 'Oxygen Boost',
      KBResults: 'Kapalabhati',
      BBResults: 'Briza Breathing',
      YBResults: 'Yogic Breathing',
      DBResults: 'Reset Breathing',
      HUMResults: 'Humming Breathing',
      BREResults: 'Breath Recovery Exercise',
      BRWResults: 'Walking Recovery Exercise',
      CTResults: 'CO2 Tolerance Training',
      APResults: 'Apnea Training',
      UBResults: 'Ujjayi Breathing',
      BOXResults: 'Box Breathing',
      CUSTResults: 'Custom Breathwork',
      CBResults: 'Coherent Breathing',
      RBResults: 'Relaxation Breathing',
      NBResults: 'Nadi Shodhana',
      LungsResults: 'Lungs Expansion',
      YogaResults: 'Yoga Classes',
      TIMERResults: 'Meditation',
      BMResults: 'Breathe & Meditate',
      MobilityResults: 'Mobility',
      SeriesResults: 'Series'
    };
    return exerciseNames[key] || key;
  }

  // ---------------------------
  // Monthly saved stats: compute + save
  // ---------------------------
  async computeAndSaveMonthlyAdminStats(): Promise<void> {
    const db = this.firebase.firestore;
    if (!db) return;

    this.computingMonthlyStats = true;
    this.computeMonthlyMsg = 'Computing...';

    try {
      const monthId = this.currentMonthId();
      const start = Timestamp.fromDate(this.startOfMonth(new Date()));
      const end = Timestamp.fromDate(this.startOfNextMonth(new Date()));

      const qNewUsers = query(
        collection(db, 'users'),
        where('userCreatedAt', '>=', start),
        where('userCreatedAt', '<', end),
      );
      const newUsers = await this.countQuery(qNewUsers);

      const qNewSubs = query(
        collection(db, 'users'),
        where('membership.activatedAt', '>=', start),
        where('membership.activatedAt', '<', end),
      );
      const newSubs = await this.countQuery(qNewSubs);

      await setDoc(doc(db, 'admin_monthly', monthId), {
        monthId,
        computedAt: Timestamp.now(),
        newUsers,
        newSubs,
      }, { merge: true });

      this.computeMonthlyMsg = `Saved ${monthId}: newUsers=${newUsers}, newSubs=${newSubs}`;

      await Promise.all([
        this.loadMonthlyThisMonthFromDb(),
        this.loadChartsFromDb(),
        this.loadNewSubsThisMonthLive(),
      ]);
    } catch (e) {
      console.error('computeAndSaveMonthlyAdminStats failed:', e);
      this.computeMonthlyMsg = 'Failed (see console).';
    } finally {
      this.computingMonthlyStats = false;
    }
  }

  async loadMonthlyThisMonthFromDb(): Promise<void> {
    const db = this.firebase.firestore;
    if (!db) return;

    this.loadingMonthlyThisMonth = true;
    try {
      const monthId = this.currentMonthId();
      const ref = doc(db, 'admin_monthly', monthId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        this.monthlyNewUsersThisMonth = null;
        this.monthlyNewSubsThisMonth = null;
        return;
      }

      const data = snap.data() as any;
      this.monthlyNewUsersThisMonth = typeof data.newUsers === 'number' ? data.newUsers : null;
      this.monthlyNewSubsThisMonth = typeof data.newSubs === 'number' ? data.newSubs : null;
    } catch (e) {
      console.error('Failed to load monthly this month:', e);
      this.monthlyNewUsersThisMonth = null;
      this.monthlyNewSubsThisMonth = null;
    } finally {
      this.loadingMonthlyThisMonth = false;
    }
  }

  async loadNewSubsThisMonthLive(): Promise<void> {
    const db = this.firebase.firestore;
    if (!db) { this.monthlyNewSubsThisMonthLive = null; return; }

    this.loadingNewSubsThisMonthLive = true;
    try {
      const start = Timestamp.fromDate(this.startOfMonth(new Date()));
      const end = Timestamp.fromDate(this.startOfNextMonth(new Date()));

      const qNewSubs = query(
        collection(db, 'users'),
        where('membership.activatedAt', '>=', start),
        where('membership.activatedAt', '<', end),
      );

      this.monthlyNewSubsThisMonthLive = await this.countQuery(qNewSubs);
    } catch (e) {
      console.error('Failed to count new subs live:', e);
      this.monthlyNewSubsThisMonthLive = null;
    } finally {
      this.loadingNewSubsThisMonthLive = false;
    }
  }

  private lastNMonthIds(n: number, from = new Date()): string[] {
    const out: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
      out.push(this.currentMonthId(d));
    }
    return out;
  }

  async loadChartsFromDb(): Promise<void> {
    const db = this.firebase.firestore;
    if (!db) return;

    this.loadingChartData = true;
    try {
      const monthIds = this.lastNMonthIds(6);
      const labels = monthIds;

      const newUsersSeries: number[] = [];
      const newSubsSeries: number[] = [];

      for (const monthId of monthIds) {
        const snap = await getDoc(doc(db, 'admin_monthly', monthId));
        const data = snap.exists() ? (snap.data() as any) : {};
        newUsersSeries.push(typeof data.newUsers === 'number' ? data.newUsers : 0);
        newSubsSeries.push(typeof data.newSubs === 'number' ? data.newSubs : 0);
      }

      const monthsWithAnyData =
        monthIds.filter((_, i) => (newUsersSeries[i] || 0) > 0 || (newSubsSeries[i] || 0) > 0).length;

      this.showCharts = monthsWithAnyData >= 2;

      if (!this.showCharts) {
        if (this.usersChart) { this.usersChart.destroy(); this.usersChart = null; }
        if (this.subsChart) { this.subsChart.destroy(); this.subsChart = null; }
        return;
      }

      setTimeout(() => {
        this.renderUsersChart(labels, newUsersSeries);
        this.renderSubsChart(labels, newSubsSeries);
      }, 0);
    } catch (e) {
      console.error('Failed to load chart data:', e);
      this.showCharts = false;
    } finally {
      this.loadingChartData = false;
    }
  }

  private renderUsersChart(labels: string[], data: number[]) {
    if (!this.usersCanvas?.nativeElement) return;
    const ctx = this.usersCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.usersChart) this.usersChart.destroy();

    this.usersChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'New users',
          data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.15)',
          tension: 0.25,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  private renderSubsChart(labels: string[], data: number[]) {
    if (!this.subsCanvas?.nativeElement) return;
    const ctx = this.subsCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.subsChart) this.subsChart.destroy();

    this.subsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'New subscriptions',
          data,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.15)',
          tension: 0.25,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // ---------------------------
  // Global exercise stats from DB
  // ---------------------------
  async loadGlobalExerciseStatsFromDb(): Promise<void> {
    const db = this.firebase.firestore;
    if (!db) return;

    this.loadingGlobalExerciseStats = true;
    try {
      const ref = doc(db, 'stats', 'global_exercise');
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        this.globalTotalExercises = null;
        this.globalTotalVideoClasses = null;
        this.globalBrtTests = null;
        this.globalTop3 = [];
        return;
      }

      const data = snap.data() as any;

      this.globalTotalExercises =
        typeof data.totalExercises === 'number' ? data.totalExercises : null;

      this.globalTotalVideoClasses =
        typeof data.totalVideoClasses === 'number' ? data.totalVideoClasses : null;

      this.globalBrtTests =
        typeof data.totalBrtTests === 'number' ? data.totalBrtTests : null;

      this.globalTop3 = Array.isArray(data.top3) ? data.top3 : [];
    } catch (e) {
      console.error('Failed to load global exercise stats:', e);
    } finally {
      this.loadingGlobalExerciseStats = false;
    }
  }

  // ---------------------------
  // Existing count loaders
  // ---------------------------
  async loadUsersCount() {
    const db = this.firebase.firestore;
    if (!db) { this.usersCount = null; return; }

    this.loadingUsersCount = true;
    try {
      const colRef = collection(db, 'users');
      const snap = await getCountFromServer(colRef);
      this.usersCount = snap.data().count;
    } catch (e) {
      console.error('Failed to count users:', e);
      this.usersCount = null;
    } finally {
      this.loadingUsersCount = false;
    }
  }

  async loadFreeUsersCount() {
    const db = this.firebase.firestore;
    if (!db) { this.freeUsersCount = null; return; }

    this.loadingFreeUsersCount = true;
    try {
      const colRef = collection(db, 'freeAccessUsers');
      const snap = await getCountFromServer(colRef);
      this.freeUsersCount = snap.data().count;
    } catch (e) {
      console.error('Failed to count free users:', e);
      this.freeUsersCount = null;
    } finally {
      this.loadingFreeUsersCount = false;
    }
  }

  async loadDevicesCount() {
    const db = this.firebase.firestore;
    if (!db) { this.devicesCount = null; return; }

    this.loadingDevicesCount = true;
    try {
      const colRef = collection(db, 'devices');
      const snap = await getCountFromServer(colRef);
      this.devicesCount = snap.data().count;
    } catch (e) {
      console.error('Failed to count devices:', e);
      this.devicesCount = null;
    } finally {
      this.loadingDevicesCount = false;
    }
  }

  async loadTrialDevicesCount() {
    const db = this.firebase.firestore;
    if (!db) { this.trialDevicesCount = null; return; }

    this.loadingTrialDevicesCount = true;
    try {
      const now = Timestamp.now();
      const qDev = query(collection(db, 'devices'), where('trialExpiresAt', '>', now));
      const snap = await getCountFromServer(qDev);
      this.trialDevicesCount = snap.data().count;
    } catch (e) {
      console.error('Failed to count trial devices:', e);
      this.trialDevicesCount = null;
    } finally {
      this.loadingTrialDevicesCount = false;
    }
  }
  
  async loadFreeNoMembershipCount() {
    const db = this.firebase.firestore;
    if (!db) { this.freeNoMembershipCount = null; return; }

    this.loadingFreeNoMembershipCount = true;
    try {
      const qUsers = query(collection(db, 'users'), where('membership.type', '==', 'free'));
      this.freeNoMembershipCount = await this.countQuery(qUsers);
    } catch (e) {
      console.error('Failed to count free users:', e);
      this.freeNoMembershipCount = null;
    } finally {
      this.loadingFreeNoMembershipCount = false;
    }
  }

  async loadMembershipUsersCount() {
    const db = this.firebase.firestore;
    if (!db) { this.membershipUsersCount = null; return; }

    this.loadingMembershipUsersCount = true;
    try {
      const qUsers = query(
        collection(db, 'users'),
        where('membership.type', 'in', [
          'rcTrial',
          'monthlySubscriber',
          'annualSubscriber'
        ])
      );
      this.membershipUsersCount = await this.countQuery(qUsers);
    } catch (e) {
      console.error('Failed to count membership users:', e);
      this.membershipUsersCount = null;
    } finally {
      this.loadingMembershipUsersCount = false;
    }
  }


  async loadMembershipTrialCount() {
    const db = this.firebase.firestore;
    if (!db) { this.membershipTrialCount = null; return; }

    this.loadingMembershipTrialCount = true;
    try {
      const qUsers = query(collection(db, 'users'), where('membership.type', '==', 'rcTrial'));
      this.membershipTrialCount = await this.countQuery(qUsers);
    } catch (e) {
      console.error('Failed to count RC trial users:', e);
      this.membershipTrialCount = null;
    } finally {
      this.loadingMembershipTrialCount = false;
    }
  }

  async loadMembershipMonthlyCount() {
    const db = this.firebase.firestore;
    if (!db) { this.membershipMonthlyCount = null; return; }

    this.loadingMembershipMonthlyCount = true;
    try {
      const qUsers = query(collection(db, 'users'), where('membership.type', '==', 'monthlySubscriber'));
      this.membershipMonthlyCount = await this.countQuery(qUsers);
    } catch (e) {
      console.error('Failed to count monthly subscribers:', e);
      this.membershipMonthlyCount = null;
    } finally {
      this.loadingMembershipMonthlyCount = false;
    }
  }

  async loadMembershipAnnualCount() {
    const db = this.firebase.firestore;
    if (!db) { this.membershipAnnualCount = null; return; }

    this.loadingMembershipAnnualCount = true;
    try {
      const qUsers = query(collection(db, 'users'), where('membership.type', '==', 'annualSubscriber'));
      this.membershipAnnualCount = await this.countQuery(qUsers);
    } catch (e) {
      console.error('Failed to count annual subscribers:', e);
      this.membershipAnnualCount = null;
    } finally {
      this.loadingMembershipAnnualCount = false;
    }
  }

  async loadNewUsersThisMonthCount() {
    const db = this.firebase.firestore;
    if (!db) { this.newUsersThisMonthCount = null; return; }

    this.loadingNewUsersThisMonthCount = true;
    try {
      const start = Timestamp.fromDate(this.startOfMonth(new Date()));
      const end = Timestamp.fromDate(this.startOfNextMonth(new Date()));

      const qUsers = query(
        collection(db, 'users'),
        where('userCreatedAt', '>=', start),
        where('userCreatedAt', '<', end),
      );

      this.newUsersThisMonthCount = await this.countQuery(qUsers);
    } catch (e) {
      console.error('Failed to count new users this month:', e);
      this.newUsersThisMonthCount = null;
    } finally {
      this.loadingNewUsersThisMonthCount = false;
    }
  }

  async loadNewUsersThisWeekCount() {
    const db = this.firebase.firestore;
    if (!db) { this.newUsersThisWeekCount = null; return; }

    this.loadingNewUsersThisWeekCount = true;
    try {
      const start = Timestamp.fromDate(this.startOfWeek(new Date()));
      const qUsers = query(collection(db, 'users'), where('userCreatedAt', '>=', start));
      this.newUsersThisWeekCount = await this.countQuery(qUsers);
    } catch (e) {
      console.error('Failed to count new users this week:', e);
      this.newUsersThisWeekCount = null;
    } finally {
      this.loadingNewUsersThisWeekCount = false;
    }
  }

  async loadPromoCodeUsersCount() {
    const db = this.firebase.firestore;
    if (!db) { this.promoCodeUsersCount = null; return; }

    this.loadingPromoCodeUsersCount = true;
    try {
      const now = Timestamp.now();

      // ✅ Works even if membership.source/type got overwritten to "whitelist"
      const qUsers = query(
        collection(db, 'users'),
        where('membership.status', '==', 'active'),
        where('membership.codeEndsAt', '>', now),
        orderBy('membership.codeEndsAt', 'asc'),
        orderBy('__name__', 'desc'),
      );

      this.promoCodeUsersCount = await this.countQuery(qUsers);
    } catch (e) {
      console.error('Failed to count promo code users:', e);
      this.promoCodeUsersCount = null;
    } finally {
      this.loadingPromoCodeUsersCount = false;
    }
  }


  // ---------------------------
  // Update video metadata
  // ---------------------------
  async updateAllVideoMetadata(): Promise<void> {
    const db = this.firebase.firestore;
    if (!db) return;

    if (!navigator.onLine) {
      alert('You are offline');
      return;
    }

    const ok = await this.firebase.isAdminUid();
    if (!ok) {
      alert('not administrator');
      return;
    }

    this.updatingVideos = true;
    this.updateProgressText = 'Starting...';

    try {
      const allowed = new Set(['move','slowdown','meditate','lungs','mobility', 'series']);

      const snap = await getDocs(collection(db, 'videos'));
      const docs = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter(v => allowed.has(v.category))
        .filter(v => !!(v.url || v.videoUrl));

      const total = docs.length;
      let updated = 0;
      let failed = 0;

      const CONCURRENCY = 5;
      let idx = 0;

      const worker = async () => {
        while (idx < docs.length) {
          const i = idx++;
          const v = docs[i];
          const rawUrl: string = v.url || v.videoUrl;

          this.updateProgressText = `${i + 1}/${total} ${v.category || ''} — ${v.title || v.id}`;

          try {
            const meta = await this.vimeoMeta.getMeta(rawUrl, true);
            const playerUrl = this.vimeoMeta.toPlayerUrl(rawUrl);

            const newTitle = (meta.title || '').trim();
            const newDesc = (meta.description || '').trim();
            const newThumb = (meta.thumbnail_url || '').trim();
            const newDurMin = typeof meta.duration === 'number' ? Math.round(meta.duration / 60) : null;

            const patch: any = {};
            if (newTitle && newTitle !== (v.title || '').trim()) patch.title = newTitle;
            if (newDesc !== (v.description || '').trim()) patch.description = newDesc;
            if (newThumb && newThumb !== (v.thumbnail || '').trim()) patch.thumbnail = newThumb;
            if (newDurMin && newDurMin !== (v.duration ?? null)) patch.duration = newDurMin;
            if (playerUrl && playerUrl !== (v.videoUrl || '')) patch.videoUrl = playerUrl;

            if (Object.keys(patch).length > 0) {
              patch.updatedAt = Timestamp.now();
              await updateDoc(doc(db, 'videos', v.id), patch);
              updated++;
            }
          } catch (e) {
            console.warn('Failed updating video meta', v.id, e);
            failed++;
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      this.updateProgressText = `Done. Updated ${updated}/${total}. Failed ${failed}.`;
    } catch (e) {
      console.error('updateAllVideoMetadata failed:', e);
      this.updateProgressText = 'Failed (see console).';
    } finally {
      this.updatingVideos = false;
    }
  }
  membershipDebugMsg = '';
  debuggingMembership = false;
  private countAny(value: any): number {
    if (!value) return 0;

    // If you stored as a number counter
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    // Most common: array of session objects
    if (Array.isArray(value)) return value.length;

    // Sometimes you store as map/object: {id: {...}, id2: {...}}
    if (typeof value === 'object') {
      // Firestore Timestamp objects etc shouldn't be counted
      // so we only count plain object keys
      return Object.keys(value).length;
    }

    return 0;
  }

  private buildTop3ExercisesFromCounts(
    byKey: Record<string, number>,
    excludeKeys: Set<string>,
  ): { key: string; count: number }[] {
    return Object.entries(byKey)
      .filter(([k, c]) => !excludeKeys.has(k) && (c || 0) > 0)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 3)
      .map(([key, count]) => ({ key, count }));
  }

  async recomputeAndSaveGlobalExerciseStats(): Promise<void> {
    const db = this.firebase.firestore;
    if (!db) return;

    if (!navigator.onLine) {
      alert('You are offline');
      return;
    }

    const ok = await this.firebase.isAdminUid();
    if (!ok) {
      alert('not administrator');
      return;
    }

    this.recomputingExerciseStats = true;
    this.recomputeExerciseMsg = 'Scanning users...';

    try {
      const usersCol = collection(db, 'users');

      const VIDEO_CLASS_KEYS = new Set([
        'YogaResults',
        'MobilityResults',
        'LungsResults',
        'BMResults',
        'SeriesResults',
      ]);

      const TOP3_EXCLUDE = new Set<string>(['brtResults', ...Array.from(VIDEO_CLASS_KEYS)]);

      const byKey: Record<string, number> = {};
      let scannedUsers = 0;

      const PAGE_SIZE = 300;
      let last: QueryDocumentSnapshot<DocumentData> | null = null;

      while (true) {
        // ✅ Explicit types fix the implicit-any error
        const qUsers: Query<DocumentData> = last
          ? query(usersCol, orderBy('__name__'), startAfter(last), limit(PAGE_SIZE))
          : query(usersCol, orderBy('__name__'), limit(PAGE_SIZE));

        const snapUsers: QuerySnapshot<DocumentData> = await getDocs(qUsers);
        if (snapUsers.empty) break;

        for (const userDoc of snapUsers.docs) {
          scannedUsers++;

          const data = userDoc.data() as any;
          const results = data?.results; // ✅ NESTED HERE

          if (!results || typeof results !== 'object') continue;

          for (const key of this.RESULT_KEYS) {
            const c = this.countAny(results?.[key]);
            if (c > 0) byKey[key] = (byKey[key] || 0) + c;
          }
        }

        last = snapUsers.docs[snapUsers.docs.length - 1];

        this.recomputeExerciseMsg = `Scanned ${scannedUsers} users...`;

        if (snapUsers.size < PAGE_SIZE) break;
      }

      const totalExercises = Object.values(byKey).reduce((sum, n) => sum + (n || 0), 0);
      const totalBrtTests = byKey['brtResults'] || 0;

      const totalVideoClasses = Array.from(VIDEO_CLASS_KEYS)
        .reduce((sum, key) => sum + (byKey[key] || 0), 0);

      const top3 = this.buildTop3ExercisesFromCounts(byKey, TOP3_EXCLUDE);

      await setDoc(doc(db, 'stats', 'global_exercise'), {
        computedAt: Timestamp.now(),
        scannedUsers,
        byKey,
        totalExercises,
        totalBrtTests,
        totalVideoClasses,
        top3,
      }, { merge: false });

      this.recomputeExerciseMsg =
        `Saved stats/global_exercise. Users=${scannedUsers}, total=${totalExercises}, videos=${totalVideoClasses}, brt=${totalBrtTests}`;

      await this.loadGlobalExerciseStatsFromDb();
    } catch (e) {
      console.error('recomputeAndSaveGlobalExerciseStats failed:', e);
      this.recomputeExerciseMsg = 'Failed (see console).';
    } finally {
      this.recomputingExerciseStats = false;
    }
  }

}
