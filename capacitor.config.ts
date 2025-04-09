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
      Purchases: {
        apiKey: 'appl_UDDWAlWhfDSufpIcYmsNiqwTSqH' // Use the iOS API Key from RevenueCat
      },
      StatusBar: {
        style: 'light',
        backgroundColor: '#ffffff'
      }
    }
};

export default config;
