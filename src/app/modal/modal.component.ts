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
  isLoading: boolean = false; // New loading state


  constructor() {}

  async ngOnInit() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    await this.initializeRevenueCat();
    this.checkSubscriptionStatus();
    await this.fetchOfferings();
  }

  async initializeRevenueCat() {
    try {
      const apiKey = 'appl_UDDWAlWhfDSufpIcYmsNiqwTSqH';
      await Purchases.configure({ apiKey });
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
    }
  }

  async fetchOfferings() {
    try {
      await Purchases.invalidateCustomerInfoCache(); // Force refresh
      const offerings = await Purchases.getOfferings();
      console.log("Offerings fetched after invalidation:", offerings);
  
      if (offerings.current) {
        this.offerings = offerings.current;
        console.log("✅ Offerings available:", this.offerings);
      } else {
        console.warn("⚠️ No current offering available.");
      }
    } catch (error) {
      console.error("❌ Error fetching offerings:", error);
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
    this.isLoading = true; // Show spinner

    try {
      const purchaseResult = await Purchases.purchasePackage({ aPackage: this.selectedPackage });
  
      if (purchaseResult && purchaseResult.customerInfo) {
        await this.checkSubscriptionStatus();
        alert(this.isPortuguese ? 'Assinatura realizada com sucesso!' : 'Subscription successful!');
        this.closeModal();
        window.location.href = '/home'; // Redirect user
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      alert(
        this.isPortuguese 
          ? 'Erro ao processar a assinatura. Verifique se seu método de pagamento está correto.' 
          : 'Error processing subscription. Please check your payment method.'
      );
    }finally {
      this.isLoading = false; // Hide spinner after process
    }
  }

  closeModal(): void {
    this.isOpen = false;
    this.close.emit();
  }

  async checkSubscriptionStatus(): Promise<void> {
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      this.membershipStatus = localStorage.getItem('membershipStatus') || 'inactive';
      return;
    }

    try {
      await Purchases.restorePurchases(); // Sync purchases with RevenueCat
      const { customerInfo } = await Purchases.getCustomerInfo();
      const isSubscribed = customerInfo?.entitlements?.active?.['premium_access'] !== undefined;
      
      if (isSubscribed) {
        localStorage.setItem('membershipStatus', 'active');
        this.membershipStatus = 'active';
      } else {
        if (customerInfo?.allExpirationDates && Object.keys(customerInfo.allExpirationDates).length > 0) {
          localStorage.setItem('membershipStatus', 'failed');
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
  
  async openManageSubscription() {
      await Browser.open({ url: 'https://apps.apple.com/account/subscriptions' });   
  }
  
  formatTitle(title: string): string {
    return title.replace(/\(.*?\)\)?/g, '').trim();
  }
  
  formatPrice(price: string): string {
    return `Only ${price}`;
  }
  
  formatSubscriptionPeriod(period: string | null): string {
    if (!period) return this.isPortuguese ? 'Período não disponível' : 'Period not available';
  
    if (period.includes('P1Y')) return this.isPortuguese ? '1 Ano' : '1 Year';
    if (period.includes('P1M')) return this.isPortuguese ? '1 Mês' : '1 Month';
    
    return period;
  }  
}
