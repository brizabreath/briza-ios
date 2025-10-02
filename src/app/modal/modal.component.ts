import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Purchases, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Browser } from '@capacitor/browser';
import { RevenuecatService } from '../services/revenuecat.service'; // adjust the relative path if needed


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


  constructor(private rc: RevenuecatService) {}

  async ngOnInit() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    await this.rc.init();
    const status = await this.rc.hasActiveSubscription(); 
    this.membershipStatus = status;    
    await this.fetchOfferings();
  }

  async fetchOfferings() {
    try {
      await Purchases.invalidateCustomerInfoCache();
      const offerings = await this.rc.getOfferings();

      if (offerings && offerings.current) {
        this.offerings = offerings.current;
        console.log("✅ Offerings available:", this.offerings);
      } else {
        this.offerings = null;
        console.warn("⚠️ No offerings available");
      }
    } catch (error) {
      console.error("❌ Error fetching offerings:", error);
      this.offerings = null;
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
        const status = await this.rc.hasActiveSubscription();
        this.membershipStatus = status;        
        alert(this.isPortuguese ? 'Assinatura realizada com sucesso!' : 'Subscription successful!');
        this.closeModal();
        window.location.href = '/breathwork'; // Redirect user
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
  
  async openManageSubscription() {
      await Browser.open({ url: this.rc.getManageSubscriptionUrl() });  
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
