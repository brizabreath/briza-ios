import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Purchases, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Browser } from '@capacitor/browser';
import { RevenuecatService } from '../services/revenuecat.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { AuthService } from '../services/auth.service';
import { FirebaseService } from '../services/firebase.service';
import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
type ModalUnlockCtx =
  | { unlockType: 'premium' }
  | { unlockType: 'series'; seriesId: string };


@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class ModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() isPortuguese: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Input() title: string = '';
  @Input() message: string = '';
  codeInput = '';
  isRedeeming = false;
  membershipStatus: string = 'inactive';
  offerings: PurchasesOffering | null = null;
  availablePackages: PurchasesPackage[] = [];
  selectedPackage: PurchasesPackage | null = null;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private rc: RevenuecatService,
    private globalAlert: GlobalAlertService,
    private firebaseService: FirebaseService
  ) {}
  
  private getUnlockCtx(): ModalUnlockCtx {
    try {
      const raw = localStorage.getItem('modalUnlockCtx');
      if (!raw) return { unlockType: 'premium' };
      const parsed = JSON.parse(raw);

      if (parsed?.unlockType === 'series' && typeof parsed?.seriesId === 'string' && parsed.seriesId.trim() !== '') {
        return { unlockType: 'series', seriesId: parsed.seriesId.trim() };
      }

      return { unlockType: 'premium' };
    } catch {
      return { unlockType: 'premium' };
    }
  }
  async redeemCodeRouter() {
    const ctx = this.getUnlockCtx();

    if (ctx.unlockType === 'series') {
      await this.redeemSeriesCode(ctx.seriesId);
      return;
    }

    // default: premium
    await this.redeemCode();
  }
  async redeemSeriesCode(seriesId: string) {
    if (!navigator.onLine) {
      this.globalAlert.showalert(
        'OFFLINE',
        this.isPortuguese
          ? '🌐 Você está offline.\n\nConecte-se à internet para ativar o código'
          : '🌐 You are offline.\n\nConnect to the internet to redeem the code'
      );
      return;
    }

    if (this.isRedeeming) return;
    this.isRedeeming = true;

    try {
      const user = this.authService.getCurrentUser();
      const db = this.firebaseService.firestore;

      if (!user || !db) {
        this.globalAlert.showalert(
          this.isPortuguese ? 'Erro' : 'Error',
          this.isPortuguese
            ? 'Você precisa estar logado para ativar um código.'
            : 'You must be logged in to redeem a code.'
        );
        return;
      }

      const code = (this.codeInput || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!code) {
        this.globalAlert.showalert(
          this.isPortuguese ? 'Código' : 'Code',
          this.isPortuguese ? 'Digite um código.' : 'Enter a code.'
        );
        return;
      }

      // ✅ NEW collection for series codes
      // Firestore doc structure example:
      // seriesAccessCodes/{CODE}:
      // { active:true, expiresAt: Timestamp?, expiresAtMs?:number, lengthDays:number, seriesId:'abc', redeemedBy:{uid:true} }
      const codeRef = doc(db, `seriesAccessCodes/${code}`);
      const userRef = doc(db, `users/${user.uid}`);

      const result = await runTransaction(db, async (tx) => {
        const codeSnap = await tx.get(codeRef);
        if (!codeSnap.exists()) return { ok: false, reason: 'not_found' as const };

        const c: any = codeSnap.data();

        if (c.active === false) return { ok: false, reason: 'inactive' as const };

        // must match series
        const codeSeriesId = String(c.seriesId || '').trim();
        if (!codeSeriesId) return { ok: false, reason: 'misconfigured' as const };
        if (codeSeriesId !== seriesId) return { ok: false, reason: 'wrong_series' as const };

        const nowMs = Date.now();
        const expiresAtMs =
          c.expiresAt?.toMillis?.() ??
          (typeof c.expiresAtMs === 'number' ? c.expiresAtMs : null);

        if (expiresAtMs && nowMs > expiresAtMs) return { ok: false, reason: 'expired' as const };

        const lengthDays = Number(c.lengthDays);
        if (!Number.isFinite(lengthDays) || lengthDays <= 0 || lengthDays > 3650) {
          return { ok: false, reason: 'misconfigured' as const };
        }

        if (c.redeemedBy?.[user.uid]) return { ok: false, reason: 'already_used' as const };

        const endsAtMs = nowMs + lengthDays * 24 * 60 * 60 * 1000;

        // ✅ Store on user doc (so it persists across devices)
        // You can use a map: seriesAccess.{seriesId} = {status, endsAt, code...}
        tx.set(
          userRef,
          {
            seriesAccess: {
              [seriesId]: {
                status: 'active',
                source: 'code',
                code,
                startedAt: Timestamp.fromMillis(nowMs),
                endsAt: Timestamp.fromMillis(endsAtMs),
                updatedAt: serverTimestamp(),
              },
            },
          },
          { merge: true }
        );

        // mark redeemed
        tx.set(
          codeRef,
          {
            redeemedBy: { [user.uid]: true },
            redeemedCount: (c.redeemedCount || 0) + 1,
            lastRedeemedAt: serverTimestamp(),
          },
          { merge: true }
        );

        return { ok: true, lengthDays, endsAtMs };
      });

      if (!result.ok) {
        const msg =
          result.reason === 'not_found'
            ? this.isPortuguese
              ? 'Esse código não existe. Tente novamente.'
              : 'This code does not exist. Try again.'
            : result.reason === 'inactive'
            ? this.isPortuguese
              ? 'Esse código está inativo.'
              : 'That code is inactive.'
            : result.reason === 'expired'
            ? this.isPortuguese
              ? 'Esse código expirou.'
              : 'That code is expired.'
            : result.reason === 'already_used'
            ? this.isPortuguese
              ? 'Você já usou esse código.'
              : 'You already used this code.'
            : result.reason === 'wrong_series'
            ? this.isPortuguese
              ? 'Esse código não é para esta série.'
              : 'This code is not for this series.'
            : this.isPortuguese
            ? 'Código mal configurado.'
            : 'Code misconfigured.';

        this.globalAlert.showalert(this.isPortuguese ? 'Código' : 'Code', msg);
        return;
      }

      // ✅ Update local cache that MovementPage/SeriesPage already read
      try {
        // Update local cache
        const raw = localStorage.getItem('seriesAccessCache');
        const obj = raw ? JSON.parse(raw) : {};
        obj[seriesId] = { endsAtMs: result.endsAtMs };
        localStorage.setItem('seriesAccessCache', JSON.stringify(obj));

        // ✅ Notify current page immediately (same WebView)
        window.dispatchEvent(
          new CustomEvent('briza:seriesAccessUpdated', {
            detail: { seriesId, endsAtMs: result.endsAtMs }
          })
        );
      } catch {}

      this.globalAlert.showalert(
        this.isPortuguese ? 'Série liberada' : 'Series unlocked',
        this.isPortuguese
          ? `Você desbloqueou esta série por ${result.lengthDays} dias.`
          : `You unlocked this series for ${result.lengthDays} days.`
      );

      this.codeInput = '';
      this.closeModal();
    } catch (e: any) {
      const err = e as FirebaseError;

      if (err?.code === 'permission-denied') {
        this.globalAlert.showalert(
          this.isPortuguese ? 'Permissão' : 'Permission',
          this.isPortuguese
            ? 'Sem permissão para validar esse código. Atualize o app ou entre em contato.'
            : 'No permission to validate this code. Update the app or contact support.'
        );
        return;
      }

      this.globalAlert.showalert(
        this.isPortuguese ? 'Erro' : 'Error',
        this.isPortuguese
          ? 'Algo deu errado ao ativar o código. Tente novamente.'
          : 'Something went wrong redeeming the code. Try again.'
      );
      console.error('redeemSeriesCode error:', e);
    } finally {
      this.isRedeeming = false;
    }
  }
  private clearUnlockCtx() {
    localStorage.removeItem('modalUnlockCtx');
  }
  async ngOnInit() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    await this.rc.init();

    this.membershipStatus = 'inactive';;

    await this.fetchOfferings();
  }

  async fetchOfferings() {
    this.isLoading = true;
    this.offerings = null;
    this.availablePackages = [];

    try {
      await Purchases.invalidateCustomerInfoCache();
      const offerings = await this.rc.getOfferings();


      if (offerings && offerings.current) {
        this.offerings = offerings.current;
        this.availablePackages = Object.values(
          offerings.current.availablePackages || {}
        );
      } else {
        console.warn('⚠️ [Modal] No offerings.current returned');
        this.offerings = null;
      }
    } catch (error) {
      console.error('❌ [Modal] Error fetching offerings:', error);
      this.offerings = null;
    } finally {
      this.isLoading = false;
    }
  }

  selectPackage(pkg: PurchasesPackage) {
    this.selectedPackage = pkg;
  }

  async subscribe() {
    if (!this.selectedPackage) {
      this.globalAlert.showalert(
        'Which Plan?',
        this.isPortuguese ? 'Selecione um plano primeiro.' : 'Please select a plan first.'
      );
      return;
    }

    this.isLoading = true;

    try {
      const purchaseResult = await Purchases.purchasePackage({
        aPackage: this.selectedPackage,
      });

      if (purchaseResult && purchaseResult.customerInfo) {
        localStorage.setItem('membershipStatus', 'active');
        this.globalAlert.showalert(
          'Success',
          this.isPortuguese
            ? 'Assinatura realizada com sucesso!'
            : 'Subscription successful!'
        );
        this.closeModal();
        window.location.href = '/breathwork';
      }
    } catch (error: any) {
      console.error('❌ [Modal] Purchase failed:', error);
      this.globalAlert.showalert(
        'Error',
        this.isPortuguese
          ? 'Erro ao processar a assinatura. Verifique seu método de pagamento.'
          : 'Error processing subscription. Please check your payment method.'
      );
    } finally {
      this.isLoading = false;
    }
  }

  closeModal(): void {
    this.isOpen = false;
    this.clearUnlockCtx();
    this.close.emit();
  }

  async openManageSubscription() {
    await Browser.open({ url: this.rc.getManageSubscriptionUrl() });
  }

  formatTitle(title: string): string {
    return title.replace(/\(.*?\)\)?/g, '').trim();
  }

  formatPrice(price: string): string {
    return this.isPortuguese ? `Apenas ${price}` : `Only ${price}`;
  }

  formatSubscriptionPeriod(period: string | null): string {
    if (!period) return this.isPortuguese ? 'Período não disponível' : 'Period not available';
    if (period.includes('P1Y')) return this.isPortuguese ? '1 Ano' : '1 Year';
    if (period.includes('P1M')) return this.isPortuguese ? '1 Mês' : '1 Month';
    return period;
  }
  async redeemCode() {
    if (!navigator.onLine) {
      this.globalAlert.showalert(
        'OFFLINE',
        this.isPortuguese
          ? '🌐 Você está offline.\n\nConecte-se à internet para ativar o código'
          : '🌐 You are offline.\n\nConnect to the internet to redeem the code'
      );
      return;
    }

    if (this.isRedeeming) return;
    this.isRedeeming = true;

    try {
      const user = this.authService.getCurrentUser();
      const db = this.firebaseService.firestore;

      if (!user || !db) {
        this.globalAlert.showalert(
          this.isPortuguese ? 'Erro' : 'Error',
          this.isPortuguese
            ? 'Você precisa estar logado para ativar um código.'
            : 'You must be logged in to redeem a code.'
        );
        return;
      }

      const code = (this.codeInput || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!code) {
        this.globalAlert.showalert(
          this.isPortuguese ? 'Código' : 'Code',
          this.isPortuguese ? 'Digite um código.' : 'Enter a code.'
        );
        return;
      }

      const codeRef = doc(db, `accessCodes/${code}`);
      const userRef = doc(db, `users/${user.uid}`);

      // Transaction prevents double redeem + lets you mark code used
      const result = await runTransaction(db, async (tx) => {
        const codeSnap = await tx.get(codeRef);
        if (!codeSnap.exists()) return { ok: false, reason: 'not_found' as const };

        const c: any = codeSnap.data();

        // inactive
        if (c.active === false) return { ok: false, reason: 'inactive' as const };

        // expired: expects expiresAt (Timestamp) OR expiresAtMs (number)
        const nowMs = Date.now();
        const expiresAtMs =
          c.expiresAt?.toMillis?.() ??
          (typeof c.expiresAtMs === 'number' ? c.expiresAtMs : null);

        if (expiresAtMs && nowMs > expiresAtMs) {
          return { ok: false, reason: 'expired' as const };
        }

        // lengthDays required
        const lengthDays = Number(c.lengthDays);
        if (!Number.isFinite(lengthDays) || lengthDays <= 0 || lengthDays > 3650) {
          return { ok: false, reason: 'misconfigured' as const };
        }

        // one-time per user: store redeemedBy map or array
        // expects c.redeemedBy.{uid}: true
        if (c.redeemedBy?.[user.uid]) {
          return { ok: false, reason: 'already_used' as const };
        }

        const endMs = nowMs + lengthDays * 24 * 60 * 60 * 1000;

        // write membership
        tx.set(
          userRef,
          {
            membership: {
              status: 'active',
              source: 'code',
              type: 'code',
              code,
              codeStartedAt: Timestamp.fromMillis(nowMs),
              codeEndsAt: Timestamp.fromMillis(endMs),
              updatedAt: serverTimestamp(),
            },
          },
          { merge: true }
        );

        // mark redeemed in code doc (prevents reuse by same user)
        tx.set(
          codeRef,
          {
            redeemedBy: { [user.uid]: true },
            redeemedCount: (c.redeemedCount || 0) + 1,
            lastRedeemedAt: serverTimestamp(),
          },
          { merge: true }
        );

        return { ok: true, lengthDays };
      });

      if (!result.ok) {
        const msg =
          result.reason === 'not_found'
            ? this.isPortuguese
              ? 'Esse código não existe. Tente novamente.'
              : 'This code does not exist. Try again.'
            : result.reason === 'inactive'
            ? this.isPortuguese
              ? 'Esse código está inativo.'
              : 'That code is inactive.'
            : result.reason === 'expired'
            ? this.isPortuguese
              ? 'Esse código expirou.'
              : 'That code is expired.'
            : result.reason === 'already_used'
            ? this.isPortuguese
              ? 'Você já usou esse código.'
              : 'You already used this code.'
            : this.isPortuguese
            ? 'Código mal configurado.'
            : 'Code misconfigured.';

        this.globalAlert.showalert(this.isPortuguese ? 'Código' : 'Code', msg);
        return;
      }

      // success
      localStorage.setItem('membershipStatus', 'active');
      localStorage.setItem('membershipSource', 'code');

      this.globalAlert.showalert(
        this.isPortuguese ? 'Ativado' : 'Activated',
        this.isPortuguese
          ? `Parabéns. Você ganhou ${result.lengthDays} dias de Premium.`
          : `Congratulations. You've got ${result.lengthDays} days of Premium.`
      );
      this.codeInput = '';
      this.closeModal();
    } catch (e: any) {
      const err = e as FirebaseError;

      if (err?.code === 'permission-denied') {
        this.globalAlert.showalert(
          this.isPortuguese ? 'Permissão' : 'Permission',
          this.isPortuguese
            ? 'Sem permissão para validar esse código. Atualize o app ou entre em contato.'
            : 'No permission to validate this code. Update the app or contact support.'
        );
        return;
      }

      this.globalAlert.showalert(
        this.isPortuguese ? 'Erro' : 'Error',
        this.isPortuguese
          ? 'Algo deu errado ao ativar o código. Tente novamente.'
          : 'Something went wrong redeeming the code. Try again.'
      );
      console.error('redeemCode error:', e);
    } finally {
      this.isRedeeming = false;
    }
  }
   onCodeInput(ev: any) {
    const v = (ev?.target?.value ?? '').toString();
    const cleaned = v.toUpperCase().replace(/\s+/g, '');
    this.codeInput = cleaned;
    if (ev?.target) ev.target.value = cleaned; // keeps cursor stable most of the time
  }
}
