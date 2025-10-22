import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { ShepherdService } from 'angular-shepherd';

@Component({
  selector: 'app-program',
  templateUrl: './program.page.html',
  styleUrls: ['./program.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class ProgramPage implements AfterViewInit {
  @ViewChild('personalizedBriza') personalizedBriza!: ElementRef<HTMLDivElement>;
  @ViewChild('myModalP') modalP!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalP') closeModalButtonP!: ElementRef<HTMLSpanElement>;
  @ViewChild('Pdots') Pdots!: ElementRef<HTMLDivElement>;
  @ViewChild('questionP') questionP!: ElementRef<HTMLAnchorElement>;

  // Default BRT references
  @ViewChild('noBrtResults') noBrtResults!: ElementRef<HTMLDivElement>;

  // Minus 15
  @ViewChild('brtResultMinus15Monday') brtResultMinus15Monday!: ElementRef;
  @ViewChild('brtResultMinus15Tuesday') brtResultMinus15Tuesday!: ElementRef;
  @ViewChild('brtResultMinus15Wednesday') brtResultMinus15Wednesday!: ElementRef;
  @ViewChild('brtResultMinus15Thursday') brtResultMinus15Thursday!: ElementRef;
  @ViewChild('brtResultMinus15Friday') brtResultMinus15Friday!: ElementRef;
  @ViewChild('brtResultMinus15Saturday') brtResultMinus15Saturday!: ElementRef;
  @ViewChild('brtResultMinus15Sunday') brtResultMinus15Sunday!: ElementRef;

  // Minus 25
  @ViewChild('brtResultMinus25Monday') brtResultMinus25Monday!: ElementRef;
  @ViewChild('brtResultMinus25Tuesday') brtResultMinus25Tuesday!: ElementRef;
  @ViewChild('brtResultMinus25Wednesday') brtResultMinus25Wednesday!: ElementRef;
  @ViewChild('brtResultMinus25Thursday') brtResultMinus25Thursday!: ElementRef;
  @ViewChild('brtResultMinus25Friday') brtResultMinus25Friday!: ElementRef;
  @ViewChild('brtResultMinus25Saturday') brtResultMinus25Saturday!: ElementRef;
  @ViewChild('brtResultMinus25Sunday') brtResultMinus25Sunday!: ElementRef;

  // Minus 35
  @ViewChild('brtResultMinus35Monday') brtResultMinus35Monday!: ElementRef;
  @ViewChild('brtResultMinus35Tuesday') brtResultMinus35Tuesday!: ElementRef;
  @ViewChild('brtResultMinus35Wednesday') brtResultMinus35Wednesday!: ElementRef;
  @ViewChild('brtResultMinus35Thursday') brtResultMinus35Thursday!: ElementRef;
  @ViewChild('brtResultMinus35Friday') brtResultMinus35Friday!: ElementRef;
  @ViewChild('brtResultMinus35Saturday') brtResultMinus35Saturday!: ElementRef;
  @ViewChild('brtResultMinus35Sunday') brtResultMinus35Sunday!: ElementRef;

  // Plus 35
  @ViewChild('brtResultPlus35Monday') brtResultPlus35Monday!: ElementRef;
  @ViewChild('brtResultPlus35Tuesday') brtResultPlus35Tuesday!: ElementRef;
  @ViewChild('brtResultPlus35Wednesday') brtResultPlus35Wednesday!: ElementRef;
  @ViewChild('brtResultPlus35Thursday') brtResultPlus35Thursday!: ElementRef;
  @ViewChild('brtResultPlus35Friday') brtResultPlus35Friday!: ElementRef;
  @ViewChild('brtResultPlus35Saturday') brtResultPlus35Saturday!: ElementRef;
  @ViewChild('brtResultPlus35Sunday') brtResultPlus35Sunday!: ElementRef;

  latestBRTResultInSeconds = 0;
  resultsByDate: { [date: string]: any[] } = {};

  constructor(private navCtrl: NavController, private globalService: GlobalService, private shepherd: ShepherdService, private router: Router) {}
  ionViewWillEnter() {
    this.populateProgramContent();
  }
  ionViewDidEnter() {
    const shouldStart = localStorage.getItem('startProgTour') === 'true';
    if (shouldStart) {
      localStorage.removeItem('startProgTour');
      this.startBreathTourNow();
    }
  }
  ngAfterViewInit() {
   this.globalService.initBulletSlider(this.modalP, this.Pdots, 'slides');
    this.closeModalButtonP.nativeElement.addEventListener('click', () => this.globalService.closeModal(this.modalP));
    this.questionP.nativeElement.onclick = () => this.globalService.openModal(this.modalP, this.Pdots, 'slides');
  }

  private isVisible(el: HTMLElement): boolean {
  if (!el) return false;
  const style = getComputedStyle(el);
  return (
    el.offsetParent !== null &&                  // not display:none and not detached
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    el.getClientRects().length > 0               // has a box
  );
}

  private firstVisible(selector: string): HTMLElement | null {
    return Array.from(document.querySelectorAll<HTMLElement>(selector))
    .find(el => this.isVisible(el)) || null;
  }

  private startBreathTourNow() {
    const isPT = localStorage.getItem('isPortuguese') === 'true';
    const t = (en: string, pt: string) => (isPT ? pt : en);

    (this.shepherd as any).defaultStepOptions = {
      cancelIcon: { enabled: true },
      scrollTo: true,
      canClickTarget: false,
      modalOverlayOpeningPadding: 4,
      modalOverlayOpeningRadius: 10,
      classes: 'briza-tour',
      // if TS complains about popperOptions type, omit it or cast as any:
      // popperOptions: { strategy: 'fixed' } as any
    } as any;
    this.shepherd.modal = true;

    // Prefer the visible brt-link; fall back to logo if none found
    const anchorEl =
      this.firstVisible('.brt-link') ||
      document.querySelector<HTMLElement>('.logoimg');

    this.shepherd.addSteps([
      {
        id: 'brt-step',
        text: `<h3>${t('Briza Retention Test','Teste de Retenção Briza')}</h3>
              <p>${t('Do this test daily to track your breathing and fitness',
                      'Faça este teste diariamente para acompanhar sua respiração e condicionamento')}</p>`,
        // Shepherd accepts an Element ref here
        attachTo: { element: anchorEl, on: 'bottom' },
        buttons: [
          {
            text: t('Continue','Continuar'),
            action: () => {
              this.shepherd.complete();
              localStorage.setItem('startBRTTour','true');
              this.router.navigateByUrl('/brt');
            }
          }
        ]
      }
    ]);
     // Hook events on the raw Shepherd tour (not on the service)
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
    setTimeout(() => this.shepherd.start(), 0);
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
  populateProgramContent(): void {
    this.loadResults();
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    const storedResults = localStorage.getItem('brtResults');
    const brtResults = storedResults ? JSON.parse(storedResults) : [];

    const BRTnumberOfTests = brtResults.length;
    const BRTlatestResult = brtResults.length > 0 ? brtResults[brtResults.length - 1].result : '0:00';
    const result = this.timeStringToSeconds(BRTlatestResult);
    const day = this.getEnglishWeekdayKey();

    this.resetAllSections();

    if (BRTnumberOfTests === 0) {
      this.noBrtResults.nativeElement.style.display = 'block';
    } else {
      this.latestBRTResultInSeconds = result;
      const prefix = this.getRangePrefix(result);
      const key = `${prefix}${day}`  as keyof this;
      this.showSectionByKey(key);
    }
    if (isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    }else{
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
  }
  private getEnglishWeekdayKey(): string {
    const weekdayIndex = new Date().getDay(); // 0 (Sunday) to 6 (Saturday)
    const weekdayKeys = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdayKeys[weekdayIndex];
  }
  
  private getRangePrefix(seconds: number): string {
    if (seconds <= 15) return 'brtResultMinus15';
    if (seconds <= 25) return 'brtResultMinus25';
    if (seconds <= 35) return 'brtResultMinus35';
    return 'brtResultPlus35';

  }

  private showSectionByKey(key: keyof this): void {
    const section = this[key];
    if (section instanceof ElementRef) {
      section.nativeElement.style.display = 'block';
    } else {
      console.warn(`❌ Section '${String(key)}' not found or not an ElementRef`);
    }
  }  

  private timeStringToSeconds(time: string): number {
    const [minutes, seconds] = time.split(':').map(Number);
    return minutes * 60 + seconds;
  }

  resetAllSections(): void {
    const keysToReset = Object.keys(this).filter(k =>
      k.startsWith('brtResultMinus') || k.startsWith('brtResultPlus') || k.startsWith('noBrtResults')
    );
  
    for (const key of keysToReset) {
      const section = this[key as keyof this];
      if (section instanceof ElementRef) {
        try {
          section.nativeElement.style.display = 'none';
        } catch {}
      }
    }
  }
  goBack(): void {
    this.navCtrl.back();
  }
  loadResults(): void {
    const exerciseKeys = [
       'brtResults', 'HATResults', 'HATCResults', 'AHATResults', 
        'WHResults', 'KBResults', 'BBResults', 'YBResults', 'BREResults', 
        'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults', 
        'CBResults', 'RBResults', 'NBResults', 'CUSTResults', 'LungsResults', 
        'YogaResults', 'DBResults', 'HUMResults'
    ];

    this.resultsByDate = {};

    exerciseKeys.forEach((key) => {
        const results = JSON.parse(localStorage.getItem(key) || '[]');
        results.forEach((result: { date: string; result: string; rounds?: number }) => {
            const resultDateUTC = new Date(result.date);
            
            // Convert UTC date to a local date string in yyyy-mm-dd format
            const localDateString = resultDateUTC.toLocaleDateString('en-CA', {
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            if (!this.resultsByDate[localDateString]) {
                this.resultsByDate[localDateString] = [];
            }
            this.resultsByDate[localDateString].push({ ...result, exerciseKey: key });
        });
    });
  }
  isExerciseDoneToday(key: string): boolean {
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    return (
      this.resultsByDate[today] &&
      this.resultsByDate[today].some(result => result.exerciseKey === key)
    );
  }
}
