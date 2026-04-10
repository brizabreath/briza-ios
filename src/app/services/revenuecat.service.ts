// revenuecat.service.ts
import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { Purchases, PurchasesOfferings } from '@revenuecat/purchases-capacitor';

type MembershipType =
  | 'whitelist'
  | 'deviceTrial'
  | 'rcTrial'
  | 'monthlySubscriber'
  | 'annualSubscriber'
  | 'free'
  | 'code';

type Snapshot = {
  online: boolean;
  platform: 'ios' | 'android' | 'web';
  status: 'active' | 'inactive';
  source: 'none' | 'whitelist' | 'trial' | 'revenuecat' | 'code' | 'cache';
  whitelistActive: boolean;
  trialActive: boolean;
  trialDaysLeft: number;
  rcActive: boolean;
  membershipType: MembershipType;
  rcPeriodType: string | null;
  rcProductId: string | null;
  codeActive: boolean;
  codeDaysLeft: number;
};

@Injectable({ providedIn: 'root' })
export class RevenuecatService {
  constructor(private firebaseService: FirebaseService) {}

  private readonly ENTITLEMENT_ID = 'premium_access';

  private readonly MONTHLY_PRODUCT_IDS = new Set([
    'montly_subscription',
    'montly_subscription:monthly-payment1',
  ]);

  private readonly ANNUAL_PRODUCT_IDS = new Set([
    'annual_subscription',
    'annual_subscription:annual-payment1',
  ]);

  private normalizeEmail(e: any): string {
    return String(e || '').trim().toLowerCase();
  }

  private baseSnapshot(): Snapshot {
    return {
      online: navigator.onLine,
      platform: this.getPlatform(),
      status: 'inactive',
      source: 'none',
      whitelistActive: false,
      trialActive: false,
      trialDaysLeft: 0,
      rcActive: false,
      membershipType: 'free',
      rcPeriodType: null,
      rcProductId: null,
      codeActive: false,
      codeDaysLeft: 0,
    };
  }

  // -------------------------
  // Persist membership
  // -------------------------
  private async persistMembershipFromSnapshot(s: Snapshot): Promise<void> {
    const db = this.firebaseService.firestore;
    const user = this.firebaseService.auth?.currentUser;
    if (!db || !user) return;

    const userRef = doc(db, `users/${user.uid}`);

    // Always write these
    const patch: any = {
      membership: {
        type: s.membershipType,
        status: s.status,
        source: s.source,
        rcPeriodType: s.rcPeriodType ?? null,
        rcProductId: s.rcProductId ?? null,
        updatedAt: Timestamp.now(),
      },
    };

    // Set activatedAt ONCE (first time user becomes active)
    if (s.status === 'active') {
      try {
        const snap = await getDoc(userRef);
        const existing = snap.exists() ? (snap.data() as any) : {};
        const activatedAt = existing?.membership?.activatedAt;

        if (!activatedAt) {
          patch.membership.activatedAt = Timestamp.now();
        }
      } catch {
        // If read fails, still do safe write without activatedAt
      }
    }

    // Merge patch
    await setDoc(userRef, patch, { merge: true });
  }

  // -------------------------
  // Unified snapshot
  // -------------------------
  async getSnapshot(): Promise<Snapshot> {
    const isOnline = navigator.onLine;
    const db = this.firebaseService.firestore;
    const user = this.firebaseService.auth?.currentUser;
    const email = this.normalizeEmail(user?.email);

    const result = this.baseSnapshot();

    // 1) WHITELIST (freeAccessUsers doc id = email)
    try {
      if (db && email) {
        // Try doc id lookup first (your real structure)
        const ref = doc(db, 'freeAccessUsers', email);
        const snap = await getDoc(ref);

        // Accept either {active:true} or {isActive:true}
        const d: any = snap.exists() ? snap.data() : null;
        const active = !!(d?.active ?? d?.isActive);

        if (snap.exists() && active) {
          result.membershipType = 'whitelist';
          result.status = 'active';
          result.source = 'whitelist';
          result.whitelistActive = true;

          localStorage.setItem('membershipStatus', 'active');
          localStorage.setItem('membershipSource', 'whitelist');

          await this.persistMembershipFromSnapshot(result);
          return result;
        }

        // Fallback: query by field if you also store email field
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(
          collection(db, 'freeAccessUsers'),
          where('email', '==', email),
          where('active', '==', true),
        );
        const qs = await getDocs(q);
        if (!qs.empty) {
          result.membershipType = 'whitelist';
          result.status = 'active';
          result.source = 'whitelist';
          result.whitelistActive = true;

          localStorage.setItem('membershipStatus', 'active');
          localStorage.setItem('membershipSource', 'whitelist');

          await this.persistMembershipFromSnapshot(result);
          return result;
        }
      }
    } catch (err) {
      console.error('⚠️ Whitelist check failed:', err);
    }

    // 2) CODE ACCESS (from user doc)
    try {
      if (db && user) {
        const userRef = doc(db, `users/${user.uid}`);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data: any = snap.data();
          const m = data?.membership;

          if (m?.source === 'code' && m?.status === 'active') {
            const endMs = m?.codeEndsAt?.toMillis?.();
            if (typeof endMs === 'number') {
              const diffDays = Math.ceil((endMs - Date.now()) / 86400000);

              if (diffDays > 0) {
                result.status = 'active';
                result.source = 'code';
                result.codeActive = true;
                result.codeDaysLeft = diffDays;
                result.membershipType = 'code';

                localStorage.setItem('membershipStatus', 'active');
                localStorage.setItem('membershipSource', 'code');

                await this.persistMembershipFromSnapshot(result);
                return result;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('⚠️ Code access check failed:', err);
    }

    // 3) DEVICE TRIAL
    try {
      const { Device } = await import('@capacitor/device');
      const device = await Device.getId();

      if (db) {
        const deviceRef = doc(db, 'devices', device.identifier);
        const snap = await getDoc(deviceRef);

        if (snap.exists()) {
          const data: any = snap.data();
          const expiresAt = data?.trialExpiresAt;
          if (expiresAt && expiresAt.toMillis && expiresAt.toMillis() > Date.now()) {
            const diffDays = Math.ceil((expiresAt.toMillis() - Date.now()) / 86400000);

            result.status = 'active';
            result.source = 'trial';
            result.trialActive = true;
            result.trialDaysLeft = diffDays;
            result.membershipType = 'deviceTrial';

            localStorage.setItem('membershipStatus', 'active');
            localStorage.setItem('membershipSource', 'trial');

            await this.persistMembershipFromSnapshot(result);
            return result;
          }
        }
      }
    } catch (err) {
      console.error('⚠️ Trial check failed:', err);
    }

    // 4) OFFLINE FALLBACK
    if (!isOnline) {
      const cachedStatus = localStorage.getItem('membershipStatus');
      const cachedSource = localStorage.getItem('membershipSource');

      if (cachedStatus === 'active') {
        result.status = 'active';
        result.source = (cachedSource as any) || 'cache';
      } else {
        result.status = 'inactive';
        result.source = 'cache';
      }

      // Do NOT persist while offline (your FirebaseService disables firestore offline)
      return result;
    }

    // 5) REVENUECAT
    try {
      await this.init();
      const { customerInfo } = await Purchases.getCustomerInfo();

      const ent = customerInfo.entitlements.active?.[this.ENTITLEMENT_ID];
      const hasEntitlement = !!ent;

      if (hasEntitlement) {
        result.status = 'active';
        result.source = 'revenuecat';
        result.rcActive = true;

        const periodType = (ent?.periodType || '').toString().toUpperCase();
        result.rcPeriodType = periodType || null;

        const activeSubs: string[] = customerInfo.activeSubscriptions || [];
        const productId = activeSubs[0] || null;
        result.rcProductId = productId;

        if (periodType === 'TRIAL') {
          result.membershipType = 'rcTrial';
        } else if (productId && this.MONTHLY_PRODUCT_IDS.has(productId)) {
          result.membershipType = 'monthlySubscriber';
        } else if (productId && this.ANNUAL_PRODUCT_IDS.has(productId)) {
          result.membershipType = 'annualSubscriber';
        } else {
          // still active; unknown paid SKU
          result.membershipType = 'monthlySubscriber';
          console.warn('[RevenueCat] Unknown productId:', productId);
        }

        localStorage.setItem('membershipStatus', 'active');
        localStorage.setItem('membershipSource', 'revenuecat');

        await this.persistMembershipFromSnapshot(result);
        return result;
      }
    } catch (err) {
      console.error('❌ RevenueCat check failed:', err);
    }

    // 6) FINAL FALLBACK → INACTIVE
    result.status = 'inactive';
    result.source = 'none';
    result.membershipType = 'free';

    localStorage.setItem('membershipStatus', 'inactive');
    localStorage.setItem('membershipSource', 'none');

    // Optional: persist inactive state (your call). Usually OK.
    try {
      await this.persistMembershipFromSnapshot(result);
    } catch {}

    return result;
  }

  // -------------------------
  // Platform + links
  // -------------------------
  getPlatform(): 'ios' | 'android' | 'web' {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'web';
  }

  getManageSubscriptionUrl(): string {
    return this.getPlatform() === 'android'
      ? 'https://play.google.com/store/account/subscriptions'
      : 'https://apps.apple.com/account/subscriptions';
  }

  // -------------------------
  // Init + offerings
  // -------------------------
  async init() {
    try {
      const apiKey =
        this.getPlatform() === 'ios'
          ? 'appl_UDDWAlWhfDSufpIcYmsNiqwTSqH'
          : 'goog_pkpJjBXrBipISmYfhOZTJEaoeuD';
      await Purchases.configure({ apiKey });
    } catch (err) {
      console.error('❌ RevenueCat init failed:', err);
    }
  }

  async getOfferings(): Promise<PurchasesOfferings | null> {
    await this.init();
    try {
      return await Purchases.getOfferings();
    } catch (err) {
      console.error('⚠️ Failed to fetch offerings:', err);
      return null;
    }
  }
}
