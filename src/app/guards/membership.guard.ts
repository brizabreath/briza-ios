import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { GlobalService } from '../services/global.service';
@Injectable({
  providedIn: 'root',
})
export class MembershipGuard implements CanActivate {
  constructor(private globalService: GlobalService, private router: Router) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    const membershipStatus = localStorage.getItem("membershipStatus");
    if (membershipStatus === "active") {
      return true; // Allow access
    } else {
      this.globalService.openModal2(); // Show subscription options
      return false; // Deny access
    }
  }  
}
