import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { AppComponent } from './app.component';
import { IonicStorageModule } from '@ionic/storage-angular';

@NgModule({
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot()
  ],
  bootstrap: [AppComponent],

})
export class AppModule {}
