import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-lungs',
  templateUrl: './lungs.page.html',
  styleUrls: ['./lungs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})

export class LungsPage {
  isModalOpen = false;
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';

  constructor(private navCtrl: NavController, private globalService: GlobalService) {}
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
