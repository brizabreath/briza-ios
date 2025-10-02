import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  CustomerInfo,
  PurchasesOfferings,
} from '@revenuecat/purchases-capacitor';


@Injectable({ providedIn: 'root' })
export class RevenuecatService {
  private initialized = false;

  private readonly CACHE_KEY = 'lastRevenueCatStatus';

  private readonly RC_KEYS = {
    ios: 'appl_UDDWAlWhfDSufpIcYmsNiqwTSqH',
    android: 'goog_pkpJjBXrBipISmYfhOZTJEaoeuD',
  };

  async init(): Promise<void> {
    if (this.initialized) return;

    const platform = Capacitor.getPlatform();
    let apiKey = '';

    if (platform === 'ios') {
      apiKey = this.RC_KEYS.ios;
    } else if (platform === 'android') {
      apiKey = this.RC_KEYS.android;
    } else {
      // Optional: if you ever run web builds
      console.warn('[RevenueCat] Non-mobile platform detected; skipping configure.');
      this.initialized = true;
      return;
    }

    await Purchases.configure({ apiKey });
    this.initialized = true;
    console.log(`[RevenueCat] Initialized for ${platform}`);
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    await this.init();
    const result: any = await Purchases.getCustomerInfo();
    return (result?.customerInfo ?? result) as CustomerInfo;
    }

  async getOfferings(): Promise<PurchasesOfferings | null> {
    await this.init();
    try {
        return await Purchases.getOfferings();
    } catch (err) {
        console.error('[RevenueCat] Failed to fetch offerings:', err);
        return null; // instead of throwing
    }
    }

  // Small helper for "Manage Subscription" URL
  getManageSubscriptionUrl(): string {
    const platform = Capacitor.getPlatform();
    return platform === 'android'
      ? 'https://play.google.com/store/account/subscriptions'
      : 'https://apps.apple.com/account/subscriptions';
  }
  async hasActiveSubscription(): Promise<'active' | 'failed' | 'inactive' | 'offline' | 'no_store'> {
    const isOnline = navigator.onLine;

    if (!isOnline) {
      const cached = localStorage.getItem(this.CACHE_KEY) as 'active' | 'failed' | 'inactive' | null;
      if (cached === 'active') {
        localStorage.setItem('membershipStatus', 'active');
        return 'active';
      }
      localStorage.setItem('membershipStatus', 'inactive');
      return 'offline';
    }

    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) {
        localStorage.setItem('membershipStatus', 'inactive');
        return 'no_store';
      }

      const isSubscribed = customerInfo.entitlements.active['premium_access'] !== undefined;
      if (isSubscribed) {
        localStorage.setItem('membershipStatus', 'active');
        localStorage.setItem(this.CACHE_KEY, 'active'); // cache normalized
        return 'active';
      }

      if (customerInfo.allExpirationDates && Object.keys(customerInfo.allExpirationDates).length > 0) {
        localStorage.setItem('membershipStatus', 'failed');
        return 'failed';
      }

      localStorage.setItem('membershipStatus', 'inactive');
      return 'inactive';
    } catch (err) {
      console.error('Error checking subscription status:', err);
      localStorage.setItem('membershipStatus', 'inactive');
      return isOnline ? 'no_store' : 'offline';
    }
  }

}
