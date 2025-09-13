import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-prana',
  templateUrl: './prana.page.html',
  styleUrls: ['./prana.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class PranaPage implements OnInit, AfterViewInit {
  @ViewChild('myModalPrana') modalPrana!: ElementRef<HTMLDivElement>;
  @ViewChild('closeModalPrana') closeModalButtonPrana!: ElementRef<HTMLSpanElement>;
  @ViewChild('Pranadots') Pranadots!: ElementRef<HTMLDivElement>;
  @ViewChild('questionPrana') questionPrana!: ElementRef<HTMLAnchorElement>;

  selectedSegment: 'traditional' | 'regulation' = 'traditional';
  isPortuguese = false;

  constructor(
    private navCtrl: NavController,
    private globalService: GlobalService
  ) {}

  ngOnInit() {
    // Read once before first render to prevent any initial flash
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    // Stay in sync if language toggled elsewhere
    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
      }
    });
  }

  ngAfterViewInit() {
    // Initialize modal slider
    this.globalService.initBulletSlider(this.modalPrana, this.Pranadots, 'slides');

    // Close modal
    this.closeModalButtonPrana.nativeElement.addEventListener('click', () =>
      this.globalService.closeModal(this.modalPrana)
    );

    // Open modal
    this.questionPrana.nativeElement.onclick = () =>
      this.globalService.openModal(this.modalPrana, this.Pranadots, 'slides');
  }

  ionViewWillEnter() {
    // Refresh language when returning to page
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  }

  selectSegment(segment: 'traditional' | 'regulation') {
    this.selectedSegment = segment;
  }

  goBack(): void {
    this.navCtrl.back();
  }
}
