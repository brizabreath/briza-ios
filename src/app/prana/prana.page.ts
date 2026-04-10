import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ShepherdService } from 'angular-shepherd';

@Component({
  selector: 'app-prana',
  templateUrl: './prana.page.html',
  styleUrls: ['./prana.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class PranaPage implements OnInit, AfterViewInit {
  @ViewChild('questionPrana') questionPrana!: ElementRef<HTMLAnchorElement>;

  selectedSegment: 'traditional' | 'regulation' = 'traditional';
  isPortuguese = false;
  isMember = false;

  constructor(
    private navCtrl: NavController,
    public globalService: GlobalService,
    private shepherd: ShepherdService
  ) {}

  async ngOnInit() {
    this.isMember = localStorage.getItem('membershipStatus') === 'active';
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') this.isPortuguese = e.newValue === 'true';
      if (e.key === 'membershipStatus') this.isMember = e.newValue === 'active';
    });
  }

  ngAfterViewInit() {}

  ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  }

  ionViewDidEnter() {
    if (!localStorage.getItem('prana_guide_seen')) {
      localStorage.setItem('prana_guide_seen', 'true');
      this.startGuide();
    }
  }

  ionViewWillLeave() {
    this.shepherd.cancel();
  }

  private lockUIForTour = () => {
    document.documentElement.classList.add('tour-active');
    document.body.style.overflow = 'hidden';
  };

  private unlockUIForTour = () => {
    document.documentElement.classList.remove('tour-active');
    document.body.style.overflow = '';
  };

  startGuide() {
    const isPT = localStorage.getItem('isPortuguese') === 'true';
    const t = (en: string, pt: string) => (isPT ? pt : en);

    this.shepherd.cancel();

    this.shepherd.defaultStepOptions = {
      cancelIcon: { enabled: true },
      scrollTo: true,
      canClickTarget: false,
      modalOverlayOpeningPadding: 4,
      modalOverlayOpeningRadius: 10,
      classes: 'briza-tour',
    };
    this.shepherd.modal = true;

    setTimeout(() => {
      const steps: any[] = [];

      steps.push({
        id: 'prana-intro',
        text: `<h3>${t('Pranayama', 'Pranayama')}</h3>
               <p>${t(
                 'Pranayama is the practice of breath control in yoga. These techniques range from traditional yogic patterns that build focus and energy, to regulation techniques that calm the nervous system and balance the body and mind.',
                 'Pranayama é a prática do controle da respiração no yoga. Essas técnicas variam de padrões yogi tradicionais que constroem foco e energia, a técnicas de regulação que acalmam o sistema nervoso e equilibram o corpo e a mente.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      steps.push({
        id: 'prana-traditional-segment',
        text: `<h3>${t('Traditional', 'Tradicional')}</h3>
               <p>${t(
                 'The Traditional tab contains classical yogic breathing techniques — Ujjayi, Sama Vritti (Box), Dirga, Nadi Shodhana, Kapalabhati, and Bhramari. These build breath control, increase energy, and support focused practice.',
                 'A aba Tradicional contém técnicas clássicas de respiração yogi — Ujjayi, Sama Vritti (Caixa), Dirga, Nadi Shodhana, Kapalabhati e Bhramari. Elas constroem o controle da respiração, aumentam a energia e apoiam a prática focada.'
               )}</p>`,
        attachTo: { element: '#prana-traditional-segment', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      steps.push({
        id: 'prana-regulation-segment',
        text: `<h3>${t('Regulation', 'Regulação')}</h3>
               <p>${t(
                 'The Regulation tab contains techniques designed to calm and regulate the nervous system — 4-7-8, Coherent Breathing, Briza Breathing, and Reset Breathing. These are ideal for stress relief, sleep preparation, and recovery.',
                 'A aba Regulação contém técnicas projetadas para acalmar e regular o sistema nervoso — 4-7-8, Respiração Coerente, Respiração Briza e Respiração Reset. São ideais para alívio do estresse, preparação para o sono e recuperação.'
               )}</p>`,
        attachTo: { element: '#prana-regulation-segment', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Finish', 'Fechar'), action: () => this.shepherd.complete() }
        ]
      });

      this.shepherd.addSteps(steps);

      const tour: any = (this.shepherd as any).tourObject || (this.shepherd as any).tour;
      if (tour?.on) {
        tour.off?.('start', this.lockUIForTour);
        tour.off?.('complete', this.unlockUIForTour);
        tour.off?.('cancel', this.unlockUIForTour);
        tour.off?.('inactive', this.unlockUIForTour);

        tour.on('start', this.lockUIForTour);
        tour.on('complete', this.unlockUIForTour);
        tour.on('cancel', this.unlockUIForTour);
        tour.on('inactive', this.unlockUIForTour);
      }

      this.shepherd.start();
    }, 0);
  }

  selectSegment(segment: 'traditional' | 'regulation') {
    this.selectedSegment = segment;
  }

  goBack(): void {
    this.navCtrl.back();
  }
}