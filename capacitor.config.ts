import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.aldojoss.aegisvault',
  appName: 'Aegis Vault',
  webDir: 'dist',
  loggingBehavior: 'none',
  plugins: { SystemBars: { style: 'DARK' } },
  server: { androidScheme: 'https', cleartext: false },
  android: { backgroundColor: '#191a1c', allowMixedContent: false, webContentsDebuggingEnabled: false },
};
export default config;
