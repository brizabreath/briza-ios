import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CoreModule } from '../core.module'; 
import { RouterModule } from '@angular/router'; // Import RouterModule


@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CoreModule,
    RouterModule
  ],
})
export class HomePage implements OnInit {
  @ViewChild('homepagegridBR') homepagegridBR!: ElementRef<HTMLDivElement>;
  @ViewChild('homepagegrid') homepagegrid!: ElementRef<HTMLDivElement>;
  @ViewChild('homeFooter') homeFooter!: ElementRef<HTMLDivElement>;
  @ViewChild('homeFooterBR') homeFooterBR!: ElementRef<HTMLDivElement>;

  constructor() {}

  ngOnInit(): void {}

  ionViewWillEnter() {
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    if (isPortuguese) {
      this.homepagegridBR.nativeElement.style.display = 'block';
      this.homepagegrid.nativeElement.style.display = 'none';
      this.homeFooterBR.nativeElement.style.display = 'block';
      this.homeFooter.nativeElement.style.display = 'none';
    } else {
      this.homepagegrid.nativeElement.style.display = 'block';
      this.homepagegridBR.nativeElement.style.display = 'none';
      this.homeFooter.nativeElement.style.display = 'block';
      this.homeFooterBR.nativeElement.style.display = 'none';
    }
  }
}
