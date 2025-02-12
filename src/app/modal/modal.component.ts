import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Purchases, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
  ],
})
export class ModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() isPortuguese: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Input() title: string = '';
  @Input() message: string = '';
  
  membershipStatus: string = localStorage.getItem('membershipStatus') || 'inactive';
  offerings: PurchasesOffering | null = null;
  selectedPackage: PurchasesPackage | null = null;

  constructor() {}

  async ngOnInit() {
    this.checkSubscriptionStatus();
    await this.fetchOfferings();
  }

  async fetchOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        this.offerings = offerings.current;
      } else {
        console.warn('No current offering available');
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
    }
  }

  selectPackage(pkg: PurchasesPackage) {
    this.selectedPackage = pkg;
  }

  async subscribe() {
    if (!this.selectedPackage) {
      alert(this.isPortuguese ? 'Selecione um plano primeiro.' : 'Please select a plan first.');
      return;
    }
  
    try {
      await Purchases.purchasePackage({ aPackage: this.selectedPackage });
  
      // Refresh customer info
      await this.checkSubscriptionStatus();
  
      alert(this.isPortuguese ? 'Assinatura realizada com sucesso!' : 'Subscription successful!');
      this.closeModal();
      window.location.href = '/home'; // Redirect user
  
    } catch (error) {
      console.error('Purchase failed:', error);
      alert(this.isPortuguese ? 'Erro ao processar a assinatura.' : 'Error processing subscription.');
    }
  }

  closeModal(): void {
    this.isOpen = false;
    this.close.emit();
  }

  async checkSubscriptionStatus(): Promise<void> {
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      if (this.membershipStatus === "active") {
        this.membershipStatus == "active";
      } else if (this.membershipStatus === "failed") {
        this.membershipStatus == "failed";
      } else {
        this.membershipStatus == "inactive";
      }
    }else{
      try {
        // 🔹 Check RevenueCat if online
        const { customerInfo } = await Purchases.getCustomerInfo();
        const isSubscribed = customerInfo?.entitlements?.active?.["premium_access"] !== undefined;
        
        if (isSubscribed) {
          localStorage.setItem('membershipStatus', 'active');
          this.membershipStatus = 'active';
        } else {
          if (customerInfo?.allExpirationDates && Object.keys(customerInfo.allExpirationDates).length > 0) {
            localStorage.setItem('membershipStatus', 'failed'); // Payment failed or expired
            this.membershipStatus = 'failed';
          } else {
            localStorage.setItem('membershipStatus', 'inactive');
            this.membershipStatus = 'inactive';
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
  }
  
  async openManageSubscription() {
    const isAndroid = /android/i.test(navigator.userAgent);
    
    if (isAndroid) {
      await Browser.open({ url: "https://play.google.com/store/account/subscriptions" });
    } else {
      await Browser.open({ url: "https://apps.apple.com/account/subscriptions" });
    }
  }
  formatTitle(title: string): string {
    return title.replace(/\(.*?\)\)?/g, '').trim(); // Removes parentheses and any trailing `)`
  }

  
  
  formatPrice(price: string): string {
    // Example: Convert "$4.99" to "Only 4.99 USD"
    return `Only ${price}`;
  }
  
  formatSubscriptionPeriod(period: string | null): string {
    if (!period) return this.isPortuguese ? "Período não disponível" : "Period not available";
  
    // Custom formatting logic
    if (period.includes("P1Y")) return this.isPortuguese ? "1 Ano" : "1 Year";
    if (period.includes("P1M")) return this.isPortuguese ? "1 Mês" : "1 Month";
    
    return period; // Fallback for unexpected values
  }  
  
}
