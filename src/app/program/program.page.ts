import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule


@Component({
  selector: 'app-program',
  templateUrl: './program.page.html',
  styleUrls: ['./program.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class ProgramPage implements AfterViewInit {
  @ViewChild('personalizedBriza') personalizedBriza!: ElementRef<HTMLDivElement>;
  @ViewChild('myModalP') modalP!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalP') closeModalButtonP!: ElementRef<HTMLSpanElement>;
  @ViewChild('Pprev') Pprev!: ElementRef<HTMLButtonElement>;
  @ViewChild('Pnext') Pnext!: ElementRef<HTMLButtonElement>;
  @ViewChild('questionP') questionP!: ElementRef<HTMLAnchorElement>;
  @ViewChild('noBrtResults') noBrtResults!: ElementRef<HTMLDivElement>;
  @ViewChild('noBrtResultsBR') noBrtResultsBR!: ElementRef<HTMLDivElement>;
  @ViewChild('brtResultMinus15') brtResultMinus15!: ElementRef<HTMLDivElement>;
  @ViewChild('brtResultMinus25') brtResultMinus25!: ElementRef<HTMLDivElement>;
  @ViewChild('brtResultMinus35') brtResultMinus35!: ElementRef<HTMLDivElement>;
  @ViewChild('brtResultPlus35') brtResultPlus35!: ElementRef<HTMLDivElement>;
  @ViewChild('brtResultMinus15BR') brtResultMinus15BR!: ElementRef<HTMLDivElement>;
  @ViewChild('brtResultMinus25BR') brtResultMinus25BR!: ElementRef<HTMLDivElement>;
  @ViewChild('brtResultMinus35BR') brtResultMinus35BR!: ElementRef<HTMLDivElement>;
  @ViewChild('brtResultPlus35BR') brtResultPlus35BR!: ElementRef<HTMLDivElement>;

  latestBRTResultInSeconds = 0;

  constructor(private navCtrl: NavController, private globalService: GlobalService) {}

  ngAfterViewInit() {
    //modal events set up
    this.closeModalButtonP.nativeElement.onclick = () => this.globalService.closeModal(this.modalP);
    this.questionP.nativeElement.onclick = () => this.globalService.openModal(this.modalP);
    this.Pnext.nativeElement.onclick = () => this.globalService.plusSlides(1, 'slides', this.modalP);
    this.Pprev.nativeElement.onclick = () => this.globalService.plusSlides(-1, 'slides', this.modalP);
    this.globalService.openModal(this.modalP);  
  }
  ionViewWillEnter() {
    // Refresh the content every time the page becomes active
    this.populateProgramContent();
  }

  // Method to populate program content based on BRT results
  populateProgramContent(): void {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    if (isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    }else{
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
    
    // Retrieve the array of brtResults from local storage
    const storedResults = localStorage.getItem('brtResults');
    const brtResults = storedResults ? JSON.parse(storedResults) : [];

    // Set BRTnumberOfTests as the length of the results array
    const BRTnumberOfTests = brtResults.length;

    // Set BRTlatestResult as the last entry's value if the array is not empty
    const BRTlatestResult = brtResults.length > 0 ? brtResults[brtResults.length - 1].result : 0;

    function timeStringToSeconds(time: string): number {
      const [minutes, seconds] = time.split(':').map(Number);
      return minutes * 60 + seconds;
    }
    // Reset all sections to display none
    this.resetAllSections();
    if (BRTnumberOfTests === 0) {
      if (isPortuguese) {
        this.noBrtResultsBR.nativeElement.style.display = 'block';
      }else{
        this.noBrtResults.nativeElement.style.display = 'block';
      }
    } else if (BRTnumberOfTests > 0) {
      this.latestBRTResultInSeconds = timeStringToSeconds(BRTlatestResult); // Convert to seconds
      if (isPortuguese) {
        if (timeStringToSeconds(BRTlatestResult) <= 15) {
          this.brtResultMinus15BR.nativeElement.style.display = 'block';
        } else if (timeStringToSeconds(BRTlatestResult) > 15 && timeStringToSeconds(BRTlatestResult) <= 25) {
          this.brtResultMinus25BR.nativeElement.style.display = 'block';
        } else if (timeStringToSeconds(BRTlatestResult) > 25 && timeStringToSeconds(BRTlatestResult) <= 35) {
          this.brtResultMinus35BR.nativeElement.style.display = 'block';
        } else if (timeStringToSeconds(BRTlatestResult) > 35) {
          this.brtResultPlus35BR.nativeElement.style.display = 'block';
        }
      } else {
        if (timeStringToSeconds(BRTlatestResult) <= 15) {
          this.brtResultMinus15.nativeElement.style.display = 'block';
        }
        else if (timeStringToSeconds(BRTlatestResult) > 15 && timeStringToSeconds(BRTlatestResult) <= 25) {
          this.brtResultMinus25.nativeElement.style.display = 'block';
        } else if (timeStringToSeconds(BRTlatestResult) > 25 && timeStringToSeconds(BRTlatestResult) <= 35) {
          this.brtResultMinus35.nativeElement.style.display = 'block';
        } else if (timeStringToSeconds(BRTlatestResult) > 35) {
          this.brtResultPlus35.nativeElement.style.display = 'block';
        }
      }
    }
  }
  // Method to reset all content sections to display none
  resetAllSections(): void {
    this.noBrtResults.nativeElement.style.display = 'none';
    this.noBrtResultsBR.nativeElement.style.display = 'none';
    this.brtResultMinus15.nativeElement.style.display = 'none';
    this.brtResultMinus25.nativeElement.style.display = 'none';
    this.brtResultMinus35.nativeElement.style.display = 'none';
    this.brtResultPlus35.nativeElement.style.display = 'none';
    this.brtResultMinus15BR.nativeElement.style.display = 'none';
    this.brtResultMinus25BR.nativeElement.style.display = 'none';
    this.brtResultMinus35BR.nativeElement.style.display = 'none';
    this.brtResultPlus35BR.nativeElement.style.display = 'none';
  }
  // Method to navigate back
  goBack(): void {
    this.navCtrl.back();
  }
}
