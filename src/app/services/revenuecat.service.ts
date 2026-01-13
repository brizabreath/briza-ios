import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { doc, getDoc } from 'firebase/firestore';
import {
  Purchases,
  PurchasesOfferings,
} from '@revenuecat/purchases-capacitor';

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
  // 🔹 Unified snapshot (used by Guard and Profile)
  async getSnapshot(): Promise<any> {
    const isOnline = navigator.onLine;
    const email = this.firebaseService.auth?.currentUser?.email;
    const firestore = this.firebaseService.firestore;

    // Base snapshot
    let result = {
      online: isOnline,
      platform: this.getPlatform(),
      status: 'inactive',
      source: 'none',
      whitelistActive: false,
      trialActive: false,
      trialDaysLeft: 0,
      rcActive: false,
      membershipType: 'free' as
        | 'whitelist'
        | 'deviceTrial'
        | 'rcTrial'
        | 'monthlySubscriber'
        | 'annualSubscriber'
        | 'free',
      rcPeriodType: null as string | null,
      rcProductId: null as string | null,
    };

    // ============================================================
    // 1️⃣ WHITELIST (query by email field, not document ID)
    // ============================================================
    try {
      if (firestore && email) {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(
          collection(firestore, 'freeAccessUsers'),
          where('email', '==', email),
          where('active', '==', true)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          result.membershipType = 'whitelist';
          result.status = 'active';
          result.source = 'whitelist';
          result.whitelistActive = true;
          localStorage.setItem('membershipStatus', 'active');
          localStorage.setItem('membershipSource', 'whitelist');
          return result;
        }
      }
    } catch (err) {
      console.error('⚠️ Whitelist check failed:', err);
    }


    // ============================================================
    // 2️⃣ TRIAL
    // ============================================================
    try {
      const { Device } = await import('@capacitor/device');
      const device = await Device.getId();
      const db = this.firebaseService.firestore;
      if (db) {
        const deviceRef = doc(db, 'devices', device.identifier);
        const snap = await getDoc(deviceRef);
        if (snap.exists()) {
          const data = snap.data();
          const expiresAt = data['trialExpiresAt'];
          const now = new Date();
          if (expiresAt && expiresAt.toMillis() > now.getTime()) {
            const diffDays = Math.ceil(
              (expiresAt.toMillis() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            result.status = 'active';
            result.source = 'trial';
            result.trialActive = true;
            result.trialDaysLeft = diffDays;
            localStorage.setItem('membershipStatus', 'active');
            localStorage.setItem('membershipSource', 'trial');
            result.membershipType = 'deviceTrial';
            return result;
          }
        }
      }
    } catch (err) {
      console.error('⚠️ Trial check failed:', err);
    }

    // ============================================================
    // 3️⃣ OFFLINE FALLBACK
    // ============================================================
    if (!isOnline) {
      const cachedStatus = localStorage.getItem('membershipStatus');
      const cachedSource = localStorage.getItem('membershipSource');
      if (cachedStatus === 'active') {
        result.status = 'active';
        result.source = cachedSource || 'cache';
        return result;
      } else {
        result.status = 'inactive';
        result.source = 'cache';
        return result;
      }
    }

    // ============================================================
    // 4️⃣ REVENUECAT
    // ============================================================
    try {
      await this.init();
      const { customerInfo } = await Purchases.getCustomerInfo();
      const activeEntitlements = Object.keys(customerInfo.entitlements.active || {});

      if (activeEntitlements.length > 0) {
        result.status = 'active';
        result.source = 'revenuecat';
        result.rcActive = true;

        // ✅ Added classification (non-breaking)
        const ent = customerInfo.entitlements.active?.[this.ENTITLEMENT_ID];

        // periodType is usually available on the entitlement object
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
          // Fallback if productId not in your known list
          // (still active, just unknown paid type)
          result.membershipType = 'monthlySubscriber';
          console.warn('[RevenueCat] Unknown productId:', productId);
        }

        // keep your existing cache keys
        localStorage.setItem('membershipStatus', 'active');
        localStorage.setItem('membershipSource', 'revenuecat');

        return result;
      }
    } catch (err) {
      console.error('❌ RevenueCat check failed:', err);
    }

    // ============================================================
    // 5️⃣ FINAL FALLBACK → INACTIVE
    // ============================================================
    console.warn('❌ No active membership found');
    result.status = 'inactive';
    result.source = 'none';
    localStorage.setItem('membershipStatus', 'inactive');
    localStorage.setItem('membershipSource', 'none');
    result.membershipType = 'free';
    return result;
  }


  // ============================================================
  // PLATFORM + MANAGEMENT LINKS
  // ============================================================
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

  // ============================================================
  // INIT + OFFERINGS
  // ============================================================
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
