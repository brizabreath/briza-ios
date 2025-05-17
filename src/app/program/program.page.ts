import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

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
  @ViewChild('Pprev') Pprev!: ElementRef<HTMLButtonElement>;
  @ViewChild('Pnext') Pnext!: ElementRef<HTMLButtonElement>;
  @ViewChild('questionP') questionP!: ElementRef<HTMLAnchorElement>;

  // Default BRT references
  @ViewChild('noBrtResults') noBrtResults!: ElementRef<HTMLDivElement>;
  @ViewChild('noBrtResultsBR') noBrtResultsBR!: ElementRef<HTMLDivElement>;

  // Minus 15
  @ViewChild('brtResultMinus15Monday') brtResultMinus15Monday!: ElementRef;
  @ViewChild('brtResultMinus15Tuesday') brtResultMinus15Tuesday!: ElementRef;
  @ViewChild('brtResultMinus15Wednesday') brtResultMinus15Wednesday!: ElementRef;
  @ViewChild('brtResultMinus15Thursday') brtResultMinus15Thursday!: ElementRef;
  @ViewChild('brtResultMinus15Friday') brtResultMinus15Friday!: ElementRef;
  @ViewChild('brtResultMinus15Saturday') brtResultMinus15Saturday!: ElementRef;
  @ViewChild('brtResultMinus15Sunday') brtResultMinus15Sunday!: ElementRef;
  @ViewChild('brtResultMinus15MondayBR') brtResultMinus15MondayBR!: ElementRef;
  @ViewChild('brtResultMinus15TuesdayBR') brtResultMinus15TuesdayBR!: ElementRef;
  @ViewChild('brtResultMinus15WednesdayBR') brtResultMinus15WednesdayBR!: ElementRef;
  @ViewChild('brtResultMinus15ThursdayBR') brtResultMinus15ThursdayBR!: ElementRef;
  @ViewChild('brtResultMinus15FridayBR') brtResultMinus15FridayBR!: ElementRef;
  @ViewChild('brtResultMinus15SaturdayBR') brtResultMinus15SaturdayBR!: ElementRef;
  @ViewChild('brtResultMinus15SundayBR') brtResultMinus15SundayBR!: ElementRef;

  // Minus 25
  @ViewChild('brtResultMinus25Monday') brtResultMinus25Monday!: ElementRef;
  @ViewChild('brtResultMinus25Tuesday') brtResultMinus25Tuesday!: ElementRef;
  @ViewChild('brtResultMinus25Wednesday') brtResultMinus25Wednesday!: ElementRef;
  @ViewChild('brtResultMinus25Thursday') brtResultMinus25Thursday!: ElementRef;
  @ViewChild('brtResultMinus25Friday') brtResultMinus25Friday!: ElementRef;
  @ViewChild('brtResultMinus25Saturday') brtResultMinus25Saturday!: ElementRef;
  @ViewChild('brtResultMinus25Sunday') brtResultMinus25Sunday!: ElementRef;
  @ViewChild('brtResultMinus25MondayBR') brtResultMinus25MondayBR!: ElementRef;
  @ViewChild('brtResultMinus25TuesdayBR') brtResultMinus25TuesdayBR!: ElementRef;
  @ViewChild('brtResultMinus25WednesdayBR') brtResultMinus25WednesdayBR!: ElementRef;
  @ViewChild('brtResultMinus25ThursdayBR') brtResultMinus25ThursdayBR!: ElementRef;
  @ViewChild('brtResultMinus25FridayBR') brtResultMinus25FridayBR!: ElementRef;
  @ViewChild('brtResultMinus25SaturdayBR') brtResultMinus25SaturdayBR!: ElementRef;
  @ViewChild('brtResultMinus25SundayBR') brtResultMinus25SundayBR!: ElementRef;

  // Minus 35
  @ViewChild('brtResultMinus35Monday') brtResultMinus35Monday!: ElementRef;
  @ViewChild('brtResultMinus35Tuesday') brtResultMinus35Tuesday!: ElementRef;
  @ViewChild('brtResultMinus35Wednesday') brtResultMinus35Wednesday!: ElementRef;
  @ViewChild('brtResultMinus35Thursday') brtResultMinus35Thursday!: ElementRef;
  @ViewChild('brtResultMinus35Friday') brtResultMinus35Friday!: ElementRef;
  @ViewChild('brtResultMinus35Saturday') brtResultMinus35Saturday!: ElementRef;
  @ViewChild('brtResultMinus35Sunday') brtResultMinus35Sunday!: ElementRef;
  @ViewChild('brtResultMinus35MondayBR') brtResultMinus35MondayBR!: ElementRef;
  @ViewChild('brtResultMinus35TuesdayBR') brtResultMinus35TuesdayBR!: ElementRef;
  @ViewChild('brtResultMinus35WednesdayBR') brtResultMinus35WednesdayBR!: ElementRef;
  @ViewChild('brtResultMinus35ThursdayBR') brtResultMinus35ThursdayBR!: ElementRef;
  @ViewChild('brtResultMinus35FridayBR') brtResultMinus35FridayBR!: ElementRef;
  @ViewChild('brtResultMinus35SaturdayBR') brtResultMinus35SaturdayBR!: ElementRef;
  @ViewChild('brtResultMinus35SundayBR') brtResultMinus35SundayBR!: ElementRef;

  // Plus 35
  @ViewChild('brtResultPlus35Monday') brtResultPlus35Monday!: ElementRef;
  @ViewChild('brtResultPlus35Tuesday') brtResultPlus35Tuesday!: ElementRef;
  @ViewChild('brtResultPlus35Wednesday') brtResultPlus35Wednesday!: ElementRef;
  @ViewChild('brtResultPlus35Thursday') brtResultPlus35Thursday!: ElementRef;
  @ViewChild('brtResultPlus35Friday') brtResultPlus35Friday!: ElementRef;
  @ViewChild('brtResultPlus35Saturday') brtResultPlus35Saturday!: ElementRef;
  @ViewChild('brtResultPlus35Sunday') brtResultPlus35Sunday!: ElementRef;
  @ViewChild('brtResultPlus35MondayBR') brtResultPlus35MondayBR!: ElementRef;
  @ViewChild('brtResultPlus35TuesdayBR') brtResultPlus35TuesdayBR!: ElementRef;
  @ViewChild('brtResultPlus35WednesdayBR') brtResultPlus35WednesdayBR!: ElementRef;
  @ViewChild('brtResultPlus35ThursdayBR') brtResultPlus35ThursdayBR!: ElementRef;
  @ViewChild('brtResultPlus35FridayBR') brtResultPlus35FridayBR!: ElementRef;
  @ViewChild('brtResultPlus35SaturdayBR') brtResultPlus35SaturdayBR!: ElementRef;
  @ViewChild('brtResultPlus35SundayBR') brtResultPlus35SundayBR!: ElementRef;


  latestBRTResultInSeconds = 0;

  constructor(private navCtrl: NavController, private globalService: GlobalService) {}

  ngAfterViewInit() {
    this.closeModalButtonP.nativeElement.onclick = () => this.globalService.closeModal(this.modalP);
    this.questionP.nativeElement.onclick = () => this.globalService.openModal(this.modalP);
    this.Pnext.nativeElement.onclick = () => this.globalService.plusSlides(1, 'slides', this.modalP);
    this.Pprev.nativeElement.onclick = () => this.globalService.plusSlides(-1, 'slides', this.modalP);
    this.globalService.openModal(this.modalP);
  }

  ionViewWillEnter() {
    this.populateProgramContent();
  }

  populateProgramContent(): void {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    if (isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    }else{
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
    const storedResults = localStorage.getItem('brtResults');
    const brtResults = storedResults ? JSON.parse(storedResults) : [];

    const BRTnumberOfTests = brtResults.length;
    const BRTlatestResult = brtResults.length > 0 ? brtResults[brtResults.length - 1].result : '0:00';
    const result = this.timeStringToSeconds(BRTlatestResult);
    const day = new Date().toLocaleDateString(undefined, { weekday: 'long' });
    const lang = isPortuguese ? 'BR' : '';

    this.resetAllSections();

    if (BRTnumberOfTests === 0) {
      this[isPortuguese ? 'noBrtResultsBR' : 'noBrtResults'].nativeElement.style.display = 'block';
    } else {
      this.latestBRTResultInSeconds = result;
      const prefix = this.getRangePrefix(result);
      const key = `${prefix}${day}${lang}`  as keyof this;
      this.showSectionByKey(key);
    }
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
}
