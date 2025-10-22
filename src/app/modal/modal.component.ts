import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Purchases, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Browser } from '@capacitor/browser';
import { RevenuecatService } from '../services/revenuecat.service';
import { GlobalAlertService } from '../services/global-alert.service';

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

  membershipStatus: string = 'inactive';
  offerings: PurchasesOffering | null = null;
  availablePackages: PurchasesPackage[] = [];
  selectedPackage: PurchasesPackage | null = null;
  isLoading = false;

  constructor(
    private rc: RevenuecatService,
    private globalAlert: GlobalAlertService
  ) {}

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
}
