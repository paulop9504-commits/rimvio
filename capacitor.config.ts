import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.rimvio.app",
  appName: "Rimvio",
  webDir: "public",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
        androidScheme: serverUrl.startsWith("https") ? "https" : "http",
      }
    : undefined,
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 800,
      backgroundColor: "#1c1c1c",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#1c1c1c",
    },
  },
};

export default config;
