import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class GlobalAlertService {

  constructor(private alertCtrl: AlertController) {}

  /** Simple OK alert */
  async showalert(header: string, message: string, buttonText: string = 'OK') {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [buttonText]
    });
    await alert.present();
  }

  /** Yes/No confirmation alert */
  async showConfirm(header: string, message: string, yesText: string = 'Yes', noText: string = 'No'): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: noText,
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: yesText,
            handler: () => resolve(true)
          }
        ]
      });
      await alert.present();
    });
  }
}
