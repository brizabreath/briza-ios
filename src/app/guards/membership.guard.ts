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
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    const t = (en: string, pt: string) => (isPortuguese ? pt : en);

    // 1) FAST PATH: use cached membership immediately
    const cachedStatus = localStorage.getItem('membershipStatus');
    const cachedSource = localStorage.getItem('membershipSource');

    if (
      cachedStatus === 'active' ||
      cachedSource === 'trial' ||
      cachedSource === 'whitelist'
    ) {
      // refresh in background, but do not block navigation
      this.revenuecat.getSnapshot()
        .then((snapshot) => {
          localStorage.setItem('membershipStatus', snapshot.status);
          localStorage.setItem('membershipSource', snapshot.source);
        })
        .catch((err) => {
          console.warn('RevenueCat background refresh failed:', err);
        });

      return true;
    }

    // 2) No valid cache -> check live snapshot
    try {
      const snapshot = await this.revenuecat.getSnapshot();

      localStorage.setItem('membershipStatus', snapshot.status);
      localStorage.setItem('membershipSource', snapshot.source);

      if (!snapshot.online) {
        this.globalAlert.showalert(
          t('Offline Mode', 'Modo Offline'),
          t(
            'You are offline. Go online and get a subscription to access this content.',
            'Você está offline. Vá online e adquira uma assinatura para acessar este conteúdo.'
          )
        );
        return false;
      }

      if (snapshot.source === 'whitelist') return true;
      if (snapshot.source === 'trial') return true;
      if (snapshot.status === 'active') return true;

      this.globalService.openModal2Safe();
      return false;
    } catch (err) {
      console.warn('MembershipGuard snapshot failed:', err);

      this.globalAlert.showalert(
        t('Connection Error', 'Erro de conexão'),
        t(
          'Could not verify your subscription right now. Please try again.',
          'Não foi possível verificar sua assinatura agora. Tente novamente.'
        )
      );
      return false;
    }
  }
}