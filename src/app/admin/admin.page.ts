import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { FirebaseService } from '../services/firebase.service';
import { updateDoc } from 'firebase/firestore';
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
} from 'firebase/firestore';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule],
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class Admin {
  // ===== Existing stats =====
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

  newUsersThisMonthCount: number | null = null; // live query (still used if you want)
  loadingNewUsersThisMonthCount = false;

  newUsersThisWeekCount: number | null = null;
  loadingNewUsersThisWeekCount = false;

  // ===== Monthly saved stats (users + subs) =====
  computingMonthlyStats = false;
  computeMonthlyMsg = '';

  loadingMonthlyThisMonth = false;
  monthlyNewUsersThisMonth: number | null = null; // from DB
  monthlyNewSubsThisMonth: number | null = null;  // from DB

  // Chart data (last 6 months)
  loadingChartData = false;
  showCharts = false;

  private usersChart: Chart | null = null;
  private subsChart: Chart | null = null;

  // ===== Exercise stats (all time) =====
  loadingGlobalExerciseStats = false;
  globalTotalExercises: number | null = null; // excludes BRT + Yoga
  globalYogaClasses: number | null = null;
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
    'LungsResults', 'DBResults', 'HUMResults', 'TIMERResults'
  ];
  updatingVideos = false;
  updateProgressText = '';  
  constructor(
    private firebase: FirebaseService,
    private navCtrl: NavController,
    private vimeoMeta: VimeoMetaService,
  ) {}

  async ionViewWillEnter() {
    const ok = await this.firebase.isAdminUid();
    if (!ok) {
      alert('not administrator');
      this.navCtrl.navigateRoot('/breathwork');
      return;
    }

    await Promise.all([
      // existing live counts
      this.loadUsersCount(),
      this.loadFreeUsersCount(),
      this.loadDevicesCount(),
      this.loadTrialDevicesCount(),
      this.loadFreeNoMembershipCount(),
      this.loadMembershipUsersCount(),
      this.loadMembershipTrialCount(),
      this.loadMembershipMonthlyCount(),
      this.loadMembershipAnnualCount(),
      this.loadNewUsersThisMonthCount(), // optional live
      this.loadNewUsersThisWeekCount(),

      // exercise all-time from DB
      this.loadGlobalExerciseStatsFromDb(),

      // monthly saved + charts
      this.loadMonthlyThisMonthFromDb(),
      this.loadChartsFromDb(),
      this.recomputeAndSaveExerciseStats()
    ]);
  }

  // ===========================
  // Navigation
  // ===========================
  goToAdminComments() {
    this.navCtrl.navigateForward('/manage-comments');
  }

  goBack(): void {
    this.navCtrl.back();
  }

  // ===========================
  // Helpers
  // ===========================
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

  // Week starting Monday
  private startOfWeek(d = new Date()): Date {
    const date = new Date(d);
    const day = date.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diffToMonday);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private monthIdFromISODate(iso: any): string | null {
    if (!iso || typeof iso !== 'string' || iso.length < 7) return null;
    return iso.slice(0, 7);
  }

  private buildTop3Exercises(byKey: Record<string, number>): { key: string; count: number }[] {
    return Object.entries(byKey || {})
      .filter(([k]) => k !== 'brtResults' && k !== 'YogaResults')
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 3)
      .map(([key, count]) => ({ key, count }));
  }

  private async countQuery(qry: any): Promise<number> {
    const snap = await getCountFromServer(qry);
    return snap.data().count;
  }

  // ===========================
  // Exercise name mapping
  // ===========================
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
      TIMERResults: 'Mindfulness',
    };
    return exerciseNames[key] || key;
  }

  // ===========================
  // Monthly saved stats: compute + save
  // ===========================
  async computeAndSaveMonthlyAdminStats(): Promise<void> {
    const db = this.firebase.firestore;
    if (!db) return;

    this.computingMonthlyStats = true;
    this.computeMonthlyMsg = 'Computing...';

    try {
      const monthId = this.currentMonthId();
      const start = Timestamp.fromDate(this.startOfMonth(new Date()));
      const end = Timestamp.fromDate(this.startOfNextMonth(new Date()));

      // New users in current month (based on userCreatedAt)
      const qNewUsers = query(
        collection(db, 'users'),
        where('userCreatedAt', '>=', start),
        where('userCreatedAt', '<', end),
      );
      const newUsers = await this.countQuery(qNewUsers);

      // New subscriptions in current month:
      // Requires users/{uid}.membership.activatedAt to be set when subscription starts
      const qNewSubs = query(
        collection(db, 'users'),
        where('membership.activatedAt', '>=', start),
        where('membership.activatedAt', '<', end),
      );
      const newSubs = await this.countQuery(qNewSubs);

      // Save snapshot
      await setDoc(doc(db, 'admin_monthly', monthId), {
        monthId,
        computedAt: Timestamp.now(),
        newUsers,
        newSubs,
      }, { merge: true });

      this.computeMonthlyMsg = `Saved ${monthId}: newUsers=${newUsers}, newSubs=${newSubs}`;

      // refresh DB-backed widgets + charts
      await Promise.all([
        this.loadMonthlyThisMonthFromDb(),
        this.loadChartsFromDb(),
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

  private lastNMonthIds(n: number, from = new Date()): string[] {
    const out: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
      out.push(this.currentMonthId(d));
    }
    return out; // oldest -> newest
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

      // Only show charts if we have at least 2 months with any saved values
      const monthsWithAnyData =
        monthIds.filter((_, i) => (newUsersSeries[i] || 0) > 0 || (newSubsSeries[i] || 0) > 0).length;

      this.showCharts = monthsWithAnyData >= 2;
      if (!this.showCharts) {
        // destroy if previously shown
        if (this.usersChart) { this.usersChart.destroy(); this.usersChart = null; }
        if (this.subsChart) { this.subsChart.destroy(); this.subsChart = null; }
        return;
      }

      // render after view is ready
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

  // ===========================
  // Exercise stats (All Time) from DB
  // ===========================
  async loadGlobalExerciseStatsFromDb(): Promise<void> {
    const db = this.firebase.firestore;
    if (!db) return;

    this.loadingGlobalExerciseStats = true;
    try {
      const ref = doc(db, 'stats', 'global_exercise');
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        this.globalTotalExercises = null;
        this.globalYogaClasses = null;
        this.globalBrtTests = null;
        this.globalTop3 = [];
        return;
      }

      const data = snap.data() as any;
      this.globalTotalExercises = typeof data.totalExercises === 'number' ? data.totalExercises : null;
      this.globalYogaClasses = typeof data.totalYoga === 'number' ? data.totalYoga : null;
      this.globalBrtTests = typeof data.totalTests === 'number' ? data.totalTests : null;
      this.globalTop3 = Array.isArray(data.top3) ? data.top3 : [];
    } catch (e) {
      console.error('Failed to load global exercise stats:', e);
    } finally {
      this.loadingGlobalExerciseStats = false;
    }
  }

  // ===========================
  // Recompute Exercise Stats (All Time) and save
  // ===========================
  async recomputeAndSaveExerciseStats(): Promise<void> {
    const db = this.firebase.firestore;
    if (!db) return;

    this.recomputingExerciseStats = true;
    this.recomputeExerciseMsg = 'Starting...';

    try {
      let totalTests = 0;
      let totalYoga = 0;
      let totalExercises = 0;

      const byKeyGlobal: Record<string, number> = {};

      const usersCol = collection(db, 'users');
      const pageSize = 200;

      let last: QueryDocumentSnapshot<DocumentData> | null = null;
      let scanned = 0;

      while (true) {
        const qUsers: Query<DocumentData> = last
          ? query(usersCol, orderBy('__name__'), startAfter(last), limit(pageSize))
          : query(usersCol, orderBy('__name__'), limit(pageSize));

        const snapUsers: QuerySnapshot<DocumentData> = await getDocs(qUsers);
        if (snapUsers.empty) break;

        for (const userDoc of snapUsers.docs) {
          scanned++;
          const u = userDoc.data() as any;
          const results = u?.results || {};

          for (const key of this.RESULT_KEYS) {
            const arr = Array.isArray(results[key]) ? results[key] : [];
            const c = arr.length;
            if (!c) continue;

            byKeyGlobal[key] = (byKeyGlobal[key] || 0) + c;

            if (key === 'brtResults') totalTests += c;
            else if (key === 'YogaResults') totalYoga += c;
            else totalExercises += c;
          }
        }

        last = snapUsers.docs[snapUsers.docs.length - 1] || null;
        this.recomputeExerciseMsg = `Scanned users: ${scanned}`;

        if (snapUsers.size < pageSize) break;
      }

      const globalTop3 = this.buildTop3Exercises(byKeyGlobal);

      await setDoc(doc(db, 'stats', 'global_exercise'), {
        computedAt: Timestamp.now(),
        scannedUsers: scanned,
        totalTests,
        totalYoga,
        totalExercises,
        byKey: byKeyGlobal,
        top3: globalTop3,
      }, { merge: true });

      this.recomputeExerciseMsg = 'Done.';

      await this.loadGlobalExerciseStatsFromDb();
    } catch (e) {
      console.error('recomputeAndSaveExerciseStats failed:', e);
      this.recomputeExerciseMsg = 'Failed (see console).';
    } finally {
      this.recomputingExerciseStats = false;
    }
  }

  // ===========================
  // Existing count loaders
  // ===========================
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
        where('membership.type', 'in', ['rcTrial', 'monthlySubscriber', 'annualSubscriber'])
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
      const qUsers = query(collection(db, 'users'), where('userCreatedAt', '>=', start));
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

      const allowed = new Set(['move','slowdown','meditate','lungs','mobility']);

      const snap = await getDocs(collection(db, 'videos'));
      const docs = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter(v => allowed.has(v.category))
        .filter(v => !!(v.url || v.videoUrl)); // must have vimeo url

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
            const meta = await this.vimeoMeta.getMeta(rawUrl, true); // keep true if you want max correctness
            const playerUrl = this.vimeoMeta.toPlayerUrl(rawUrl);

            const newTitle = (meta.title || '').trim();
            const newDesc = (meta.description || '').trim();
            const newThumb = (meta.thumbnail_url || '').trim();
            const newDurMin =
              typeof meta.duration === 'number' ? Math.round(meta.duration / 60) : null;

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
}