import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brizabreath.app',
  appName: 'Briza',
  webDir: 'www',
  ios: {
    backgroundColor: "#FFFFFF",
    webContentsDebuggingEnabled: true,
    overrideUserAgent: "",
    appendUserAgent: "",
  }, 
  plugins: {
    StatusBar: {
      style: 'light',
      backgroundColor: '#ffffff'
    }
  },
  server: {
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
