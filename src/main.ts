import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptorsFromDi, withJsonpSupport } from '@angular/common/http'; // ← add this
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { ShepherdService } from 'angular-shepherd';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(                           // ← add this block
      withInterceptorsFromDi(),
      withJsonpSupport()                         // enables this.http.jsonp(...)
    ),
    ShepherdService
  ],
});
