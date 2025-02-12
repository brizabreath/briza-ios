import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-bh',
  templateUrl: './bh.page.html',
  styleUrls: ['./bh.page.scss'],
  standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      IonicModule,
      RouterModule
  ],
})

export class BHPage implements AfterViewInit{
  @ViewChild('myModalBH') modalBH!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalBH') closeModalButtonBH!: ElementRef<HTMLSpanElement>;
  @ViewChild('BHprev') BHprev!: ElementRef<HTMLButtonElement>;
  @ViewChild('BHnext') BHnext!: ElementRef<HTMLButtonElement>;
  @ViewChild('questionBH') questionBH!: ElementRef<HTMLAnchorElement>;

  constructor(private navCtrl: NavController, private globalService: GlobalService) {}
  ngAfterViewInit() {
    //modal events set up
    this.closeModalButtonBH.nativeElement.onclick = () => this.globalService.closeModal(this.modalBH);
    this.questionBH.nativeElement.onclick = () => this.globalService.openModal(this.modalBH);
    this.BHnext.nativeElement.onclick = () => this.globalService.plusSlides(1, 'slides', this.modalBH);
    this.BHprev.nativeElement.onclick = () => this.globalService.plusSlides(-1, 'slides', this.modalBH);
    this.globalService.openModal(this.modalBH);  
  }
  ionViewWillEnter() {
    // Refresh the content every time the page becomes active
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    if (isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    }else{
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
  } 
  // Method to navigate back
  goBack(): void {
    this.navCtrl.back();
  }
}
