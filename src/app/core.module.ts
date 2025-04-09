import { NgModule } from '@angular/core';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

@NgModule({
  providers: [
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
  ],
})
export class CoreModule {}
