import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brizabreath.app',
  appName: 'brizabreath',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, 
    },
},
};

export default config;
