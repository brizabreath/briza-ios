import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { GlobalService } from '../services/global.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { RevenuecatService } from '../services/revenuecat.service';

@Injectable({ providedIn: 'root' })
export class MembershipGuard implements CanActivate {
  constructor(
    private globalService: GlobalService,
    private globalAlert: GlobalAlertService,
    private revenuecat: RevenuecatService
  ) {}

  async canActivate(): Promise<boolean> {
    const snapshot = await this.revenuecat.getSnapshot();
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    const t = (en: string, pt: string) => (isPortuguese ? pt : en);

    // Always update cache
    localStorage.setItem('membershipStatus', snapshot.status);
    localStorage.setItem('membershipSource', snapshot.source);

    // ============================================================
    // OFFLINE LOGIC
    // ============================================================
    if (!snapshot.online) {
      const cachedStatus = localStorage.getItem('membershipStatus');
      if (cachedStatus === 'active') return true;

      this.globalAlert.showalert(
        t('Offline Mode', 'Modo Offline'),
        t(
          'You are offline. Go online and get a subscription to access this content.',
          'Você está offline. Vá online e adquira uma assinatura para acessar este conteúdo.'
        )
      );
      return false;
    }

    // ============================================================
    // ONLINE LOGIC
    // ============================================================
    if (snapshot.source === 'whitelist') return true;
    if (snapshot.source === 'trial') return true;
    if (snapshot.status === 'active') return true;

    // ============================================================
    // MEMBERSHIP REQUIRED (no sub, inactive, expired, or logged out)
    // ============================================================
    this.globalAlert.showalert(
      t('Subscription Required', 'Assinatura Necessária'),
      t(
        `Choose a subscription to have full access of the app`,
        `Escolha uma assinatura para ter acesso total do app`
      )
    );
    this.globalService.openModal2Safe();
    return false;
  }
}
