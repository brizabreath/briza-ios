import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CoreModule } from '../core.module';
import { Router, RouterModule } from '@angular/router'; // Import RouterModule
import { GlobalService } from '../services/global.service';
import { ShepherdService } from 'angular-shepherd';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, CoreModule, RouterModule],
})
export class HomePage {
  constructor(
    private globalService: GlobalService,
    private shepherd: ShepherdService,
    private router: Router
  ) {}
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  }

  ionViewDidEnter() {
  const shouldStart = localStorage.getItem('startHomeTour') === 'true';
  if (shouldStart) {
    localStorage.removeItem('startHomeTour');
  }else{
    return;
  }
  const isPT = localStorage.getItem('isPortuguese') === 'true';
  const t = (en: string, pt: string) => (isPT ? pt : en);
  const sel = (enSel: string, ptSel: string) => (isPT ? ptSel : enSel);

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
    this.shepherd.addSteps([
      {
        id: 'hp-program2',
        text: `<h3>${t('Briza Program','Programa Briza')}</h3>
               <p>${t('Daily exercises to improve breathing efficiency and quality',
                      'Exercícios diários para melhorar a eficiência e a qualidade respiratória')}</p>`,
        attachTo: { element: sel('#hp-program2', '#hp-programPT2'), on: 'bottom' },
        buttons: [
          { text: t('Next','Próximo'), action: () => this.shepherd.next() },
        ]
      },
      {
        id: 'hp-prana',
        text: `<h3>${t('Traditional breathwork','Respirações tradicionais')}</h3>
               <p>${t('Breathing techniques to calm and balance your body',
                      'Técnicas de respiração para acalmar e equilibrar o corpo')}</p>`,
        attachTo: { element: sel('#hp-prana', '#hp-pranaPT'), on: 'bottom' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
        id: 'hp-bh',
        text: `<h3>${t('Breath Holding','Apneia')}</h3>
               <p>${t('Improve CO₂ tolerance and mental resilience',
                      'Melhore a tolerância ao CO₂ e a resiliência mental')}</p>`,
        attachTo: { element: sel('#hp-bh', '#hp-bhPT'), on: 'bottom' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
        id: 'hp-lungs',
        text: `<h3>${t('Lungs Expansion & Mobility','Expansão Pulmonar e Mobilidade')}</h3>
               <p>${t('Exercises to increase lungs capacity and move freely',
                      'Exercícios para aumentar a capacidade pulmonar e mobilidade')}</p>`,
        attachTo: { element: sel('#hp-lungs', '#hp-lungsPT'), on: 'bottom' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
        id: 'hp-cust',
        text: `<h3>${t('Custom Session','Sessão Personalizada')}</h3>
               <p>${t('Create a breathing session adapted to your needs',
                      'Crie uma sessão de respiração adaptada às suas necessidades')}</p>`,
        attachTo: { element: sel('#hp-cust', '#hp-custPT'), on: 'bottom' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
          id: 'brt-finish3',
          text: `
            <div class="briza-tour-finish">
            <h2>${t('Get Started','Comece agora')}</h2>
            <p>${t(
              'Start the Briza Program and discover how far you can go',
              'Inicie pelo Programa Briza e descubra até onde você pode chegar'
            )}</p>
          </div>
        `,
        buttons: [
          { 
            text: t('Start Program','Iniciar Programa'), 
            action: () => {
              this.shepherd.complete();
              localStorage.setItem('startProgTour','true');
              this.router.navigateByUrl('/program');
            },
            classes: 'briza-finish-btn' 
          }
        ]
        }
      ]);

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
  ionViewDidLeave() {
    this.unlockUIForTour();
  }
  private lockUIForTour = () => {
    document.documentElement.classList.add('tour-active');
    document.body.style.overflow = 'hidden'; // stop background scroll
  };

  private unlockUIForTour = () => {
    document.documentElement.classList.remove('tour-active');
    document.body.style.overflow = '';
  };
}
