import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-prana',
  templateUrl: './prana.page.html',
  styleUrls: ['./prana.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})

export class PranaPage implements AfterViewInit{
  @ViewChild('myModalPrana') modalPrana!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalPrana') closeModalButtonPrana!: ElementRef<HTMLSpanElement>;
  @ViewChild('Pranaprev') Pranaprev!: ElementRef<HTMLButtonElement>;
  @ViewChild('Prananext') Prananext!: ElementRef<HTMLButtonElement>;
  @ViewChild('questionPrana') questionPrana!: ElementRef<HTMLAnchorElement>;

  constructor(private navCtrl: NavController, private globalService: GlobalService) {}
  ngAfterViewInit() {
    //modal events set up
    this.closeModalButtonPrana.nativeElement.onclick = () => this.globalService.closeModal(this.modalPrana);
    this.questionPrana.nativeElement.onclick = () => this.globalService.openModal(this.modalPrana);
    this.Prananext.nativeElement.onclick = () => this.globalService.plusSlides(1, 'slides', this.modalPrana);
    this.Pranaprev.nativeElement.onclick = () => this.globalService.plusSlides(-1, 'slides', this.modalPrana);
    this.globalService.openModal(this.modalPrana);  
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
