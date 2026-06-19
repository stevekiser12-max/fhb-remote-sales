import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.favoredhomebuyers.leadpilot',
  appName: 'FHB Remote Sales',
  webDir: 'out',
  server: {
    // In production, load from the live URL so we get server-side features
    url: 'https://leads.favoredbuyers.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'FHBRemoteSales',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a0a',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
      scroll: true,
    },
  },
};

export default config;
