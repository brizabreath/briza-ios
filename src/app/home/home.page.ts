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

  ionViewWillEnter() {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    if (isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
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
        id: 'hp-program',
        text: `<h3>${t('Briza Program','Programa Briza')}</h3>
               <p>${t('Daily exercises to improve breathing efficiency and quality',
                      'Exercícios diários para melhorar a eficiência e a qualidade respiratória')}</p>`,
        attachTo: { element: sel('#hp-program', '#hp-programPT'), on: 'bottom' },
        buttons: [
          { text: t('Next','Próximo'), action: () => this.shepherd.next() },
        ]
      },
      {
        id: 'hp-prana',
        text: `<h3>Pranayama</h3>
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
        text: `<h3>${t('Lungs Expansion','Expansão Pulmonar')}</h3>
               <p>${t('Exercises to increase lungs capacity',
                      'Exercícios para aumentar a capacidade pulmonar')}</p>`,
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
        id: 'hp-yoga',
        text: `<h3>Yoga</h3>
               <p>${t('Explore guided yoga classes, organized into three categories: Move, Slow Down, and Meditate',
                'Explore aulas de yoga guiadas, organizadas em três categorias: Mexa-se, Acalme-se e Medite')}</p>`,
        attachTo: { element: sel('#hp-yoga', '#hp-yogaPT'), on: 'top' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
        id: 'hp-bpr',
        text: `<h3>${t('Results','Resultados')}</h3>
               <p>${t('Check your results and progress here',
                      'Veja seus resultados e seu progresso aqui')}</p>`,
        attachTo: { element: sel('#hp-bpr', '#hp-bprPT'), on: 'top' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
        id: 'hp-profile',
        text: `<h3>${t('Profile','Perfil')}</h3>
               <p>${t('Manage your account and subscription here',
                      'Gerencie sua conta e assinatura aqui')}</p>`,
        attachTo: { element: sel('#hp-profile', '#hp-profilePT'), on: 'top' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
          id: 'brt-finish',
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
              localStorage.setItem('startBRTModal','true');
              this.router.navigateByUrl('/program');
            },
            classes: 'briza-finish-btn' 
          }
        ]
        }
      ]);

      this.shepherd.start();
    }, 0);
  }
}
