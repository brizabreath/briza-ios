import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { RevenuecatService } from '../services/revenuecat.service';
import { GlobalService } from '../services/global.service';

@Injectable({ providedIn: 'root' })
export class MembershipGuard implements CanActivate {
  constructor(
    private revenuecat: RevenuecatService,
    private globalService: GlobalService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    const status = await this.revenuecat.hasActiveSubscription();

    if (status === 'active') {
      return true;
    }

    if (status === 'offline') {
      this.globalService.showMembershipMessage('offline');
      return false;
    }

    if (status === 'no_store') {
      this.globalService.showMembershipMessage('no_store');
      return false;
    }

    if (status === 'failed') {
      this.globalService.showMembershipMessage('failed');
      this.globalService.openModal2();
      return false;
    }

    if (status === 'inactive') {
      this.globalService.showMembershipMessage('inactive');
      this.globalService.openModal2();
      return false;
    }

    return false;
  }
}
