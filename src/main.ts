import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// Initialize RevenueCat
Purchases.configure({
  apiKey: 'goog_pkpJjBXrBipISmYfhOZTJEaoeuD', // Replace with your RevenueCat Public API Key
  appUserID: null // Optional: Set a unique user ID if needed
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
