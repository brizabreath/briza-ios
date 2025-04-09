import { Component} from '@angular/core';
import { NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-sources',
  templateUrl: './sources.page.html',
  styleUrls: ['./sources.page.scss'],
  standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      IonicModule,
      RouterModule
  ],
})

export class SourcesPage{
  constructor(private navCtrl: NavController) {}
    // Method to navigate back
  goBack(): void {
    this.navCtrl.back();
  }
}
