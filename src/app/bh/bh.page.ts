import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ShepherdService } from 'angular-shepherd';

@Component({
  selector: 'app-bh',
  templateUrl: './bh.page.html',
  styleUrls: ['./bh.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class BHPage implements OnInit, AfterViewInit {
  @ViewChild('questionBH') questionBH!: ElementRef<HTMLAnchorElement>;

  selectedSegment: string = 'endurance';
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
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
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
      }
      if (e.key === 'membershipStatus') {
        this.isMember = e.newValue === 'active';
      }
    });
  }

  ngAfterViewInit() {}

  async ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  }
  async ionViewDidEnter() {
    if (!localStorage.getItem('bh_guide_seen')) {
      localStorage.setItem('bh_guide_seen', 'true');
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

      // 1 - Intro (centered)
      steps.push({
        id: 'bh-intro',
        text: `<h3>${t('Breath-Holding Exercises', 'Exercícios de Retenção de Respiração')}</h3>
               <p>${t(
                 'Breath-holding exercises offer a range of benefits that can significantly enhance performance, particularly for athletes, swimmers, free divers, and individuals seeking to improve their overall health and well-being.',
                 'Exercícios de retenção de respiração oferecem uma série de benefícios que podem melhorar significativamente o desempenho, particularmente para atletas, nadadores, mergulhadores e indivíduos que buscam melhorar sua saúde geral e bem-estar.'
               )}</p>`,
        buttons: [
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 2 - Benefits overview (centered)
      steps.push({
        id: 'bh-benefits',
        text: `<h3>${t('Key benefits', 'Principais benefícios')}</h3>
               <p>${t(
                 'Regular practice increases lung capacity, improves oxygen efficiency, raises CO₂ tolerance to delay fatigue, strengthens the diaphragm, boosts anaerobic capacity, supports cardiovascular health, and builds mental toughness and discipline.',
                 'A prática regular aumenta a capacidade pulmonar, melhora a eficiência do oxigênio, eleva a tolerância ao CO₂ para atrasar a fadiga, fortalece o diafragma, aumenta a capacidade anaeróbica, apoia a saúde cardiovascular e desenvolve resistência mental e disciplina.'
               )}</p>`,
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 3 - Endurance segment
      steps.push({
        id: 'bh-endurance-segment',
        text: `<h3>${t('Endurance', 'Resistência')}</h3>
               <p>${t(
                 'The Endurance tab contains exercises focused on breathing patterns during activity that train your body to use oxygen more efficiently over sustained effort.',
                 'A aba Resistência contém exercícios focados em padrões de respiração durante a atividade que treinam seu corpo a usar o oxigênio com mais eficiência em esforços prolongados.'
               )}</p>`,
        attachTo: { element: '#bh-endurance-segment', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 4 - Max Hold segment
      steps.push({
        id: 'bh-hold-segment',
        text: `<h3>${t('Max Hold', 'Retenção Máxima')}</h3>
               <p>${t(
                 'The Max Hold tab contains exercises designed to extend how long you can hold your breath — including protocols that progressively challenge your breath-hold capacity and CO₂ tolerance.',
                 'A aba Retenção Máxima contém exercícios projetados para aumentar o tempo que você consegue segurar a respiração — incluindo os protocolos que desafiam progressivamente sua capacidade de retenção e tolerância ao CO₂.'
               )}</p>`,
        attachTo: { element: '#bh-hold-segment', on: 'bottom' },
        buttons: [
          { text: t('Back', 'Voltar'), action: () => this.shepherd.back() },
          { text: t('Next', 'Próximo'), action: () => this.shepherd.next() }
        ]
      });

      // 5 - Safety (centered)
      steps.push({
        id: 'bh-safety',
        text: `<h3>${t('Safety first', 'Segurança em primeiro lugar')}</h3>
               <p>${t(
                 'Always be aware of your limits. Never practice breath-holding alone in or near water. If you have any serious health conditions, consult a doctor before starting any of these exercises.',
                 'Esteja sempre ciente dos seus limites. Nunca pratique retenção de respiração sozinho na água ou perto dela. Se você tiver algum problema de saúde grave, consulte um médico antes de iniciar qualquer um desses exercícios.'
               )}</p>`,
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

  selectSegment(segment: 'endurance' | 'hold') {
    this.selectedSegment = segment;
  }

  goBack(): void {
    this.navCtrl.back();
  }
}