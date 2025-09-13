import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-bh',
  templateUrl: './bh.page.html',
  styleUrls: ['./bh.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class BHPage implements OnInit, AfterViewInit {
  @ViewChild('myModalBH') modalBH!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalBH') closeModalButtonBH!: ElementRef<HTMLSpanElement>;
  @ViewChild('BHdots') BHdots!: ElementRef<HTMLDivElement>;
  @ViewChild('questionBH') questionBH!: ElementRef<HTMLAnchorElement>;

  selectedSegment: string = 'endurance';
  isPortuguese = false;

  constructor(
    private navCtrl: NavController,
    private globalService: GlobalService
  ) {}

  ngOnInit() {
    // Read once before first render (prevents initial flash)
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    // Keep in sync if another page toggles language
    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
      }
    });
  }

  ngAfterViewInit() {
    // Modal slider init
    this.globalService.initBulletSlider(this.modalBH, this.BHdots, 'slides');

    // Modal close
    this.closeModalButtonBH.nativeElement.addEventListener('click', () =>
      this.globalService.closeModal(this.modalBH)
    );

    // Open modal from the question icon
    this.questionBH.nativeElement.onclick = () =>
      this.globalService.openModal(this.modalBH, this.BHdots, 'slides');
  }

  ionViewWillEnter() {
    // Refresh language when returning to the page
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  }

  selectSegment(segment: 'endurance' | 'hold') {
    this.selectedSegment = segment;
  }

  goBack(): void {
    this.navCtrl.back();
  }
}
